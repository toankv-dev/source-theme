#!/usr/bin/env node
/*
 * End-to-end smoke test of the platform behaviour every theme must keep, against a running preview:
 *
 *   node tools/preview-server.js <theme-dir> --port 8090   (in another terminal)
 *   node tools/smoke.js [http://localhost:8090]
 *
 * Checks: pixel hooks, ViewContent / AddToCart / InitiateCheckout / Lead / Search events, ?variant= sync,
 * the sf-cart:<domain> line shape, drawer, checkout reading the cart, quantity packs, free gifts, review form,
 * contact form, newsletter, order tracking.
 */
'use strict';
const { chromium } = require('playwright');

const BASE = (process.argv[2] || 'http://localhost:8090').replace(/\/$/, '');
const results = [];
const check = (name, ok, info) => { results.push({ name, ok: !!ok, info }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (info && !ok ? '  → ' + info : '')); };
const events = (page) => page.evaluate(() => (window.__events || []).map((e) => e.event));
const cart = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('sf-cart:localhost') || 'null'));

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  // ---- Product page --------------------------------------------------------------------------
  await page.goto(BASE + '/product', { waitUntil: 'load' });
  await page.waitForTimeout(600);
  for (const sel of ['#sf-config', '#sf-variants-data', '#addToCart', '[data-testid="add-to-cart"]', '#CartDrawer-Checkout', '[data-testid="checkout-button"]']) {
    check('hook ' + sel, await page.$(sel));
  }
  check('ViewContent fired', (await events(page)).includes('ViewContent'));
  // The option to change: a visible pill / swatch, else an option card (pack cards that ARE variants).
  const choices = (await page.$$('[data-opt-value]:visible')).concat(await page.$$('[data-card]:visible'));
  const priceSel = ['[data-price-block] [data-price]', '[data-cards-price] [data-price]', '[data-card].is-selected [data-card-price]'];
  let priceEl = null;
  for (const s of priceSel) if (!priceEl && (await page.$(s + ':visible'))) priceEl = s;
  if (choices.length > 1) {
    await choices[1].click();
    await page.waitForTimeout(200);
    check('?variant= set after picking an option', /[?&]variant=/.test(page.url()), page.url());
    check('price shown after variant change', priceEl && /\$\d/.test(await page.textContent(priceEl)), priceEl || 'no visible price element');
  }
  check('add to cart enabled', await page.$eval('#addToCart', (b) => !b.disabled));
  await page.click('#addToCart');
  await page.waitForTimeout(500);
  const c1 = await cart(page);
  const line = c1 && c1.items && c1.items[0];
  check('cart saved in sf-cart:<domain>', line, JSON.stringify(c1));
  if (line) {
    for (const f of ['title', 'variant', 'price', 'qty', 'image', 'variantId']) check('cart line has ' + f, line[f] !== undefined && line[f] !== '', JSON.stringify(line));
  }
  check('legacy sf-cart mirror', await page.evaluate(() => !!localStorage.getItem('sf-cart')));
  check('AddToCart fired', (await events(page)).includes('AddToCart'));
  check('cart drawer opened', await page.$eval('[data-cart-drawer]', (d) => !d.hidden));
  check('drawer lists the line', (await page.$$('[data-cart-lines] .b-line, [data-cart-lines] [data-line-variant]')).length > 0);
  const atc = (await page.evaluate(() => window.__events.filter((e) => e.event === 'AddToCart')[0])) || {};
  check('AddToCart payload', atc.payload && atc.payload.currency && atc.payload.content_ids && atc.payload.num_items && atc.payload.variant_id, JSON.stringify(atc.payload));

  await Promise.all([page.waitForURL(/\/checkout/, { timeout: 8000 }).catch(() => null), page.click('#CartDrawer-Checkout')]);
  check('checkout redirect', /\/checkout/.test(page.url()), page.url());
  await page.waitForTimeout(800);
  check('checkout shows the cart item', (await page.content()).includes(line ? line.title : '###'));
  check('checkout keeps #co-checkout-form / #co-pay-btn', (await page.$('#co-checkout-form')) && (await page.$('#co-pay-btn')));

  // InitiateCheckout fires before navigation: check on a fresh page by stubbing navigation.
  await page.goto(BASE + '/product', { waitUntil: 'load' });
  await page.click('[data-cart-open]');
  const init = await page.evaluate(() => new Promise((res) => {
    const orig = window.__adluxTrack;
    window.__adluxTrack = function (e, p) { orig(e, p); if (e === 'InitiateCheckout') res(p); };
    document.querySelector('#CartDrawer-Checkout').click();
    setTimeout(() => res(null), 2000);
  }));
  check('InitiateCheckout fired with value', init && init.value > 0 && init.num_items > 0, JSON.stringify(init));

  // The Checkout click above starts a navigation to /checkout: let it land before navigating again
  // (otherwise goto can fail with ERR_ABORTED depending on timing).
  await page.waitForURL(/\/checkout/, { timeout: 5000 }).catch(() => {});
  await page.waitForLoadState('load').catch(() => {});

  // ---- Quantity packs --------------------------------------------------------------------------
  await page.goto(BASE + '/product?template=bundle', { waitUntil: 'load' });
  await page.evaluate(() => { localStorage.removeItem('sf-cart:localhost'); localStorage.removeItem('sf-cart'); });
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(400);
  const qcards = await page.$$('[data-qcard]');
  if (qcards.length < 3) console.log('SKIP quantity packs (no product.bundle template in this theme)');
  else {
    const priced = await page.$eval('[data-qcard][data-qty="3"] [data-card-price]', (n) => n.textContent.trim());
    check('pack card priced', /\d/.test(priced), priced);
    await qcards[2].click();
    await page.click('#addToCart');
    await page.waitForTimeout(400);
    const c2 = await cart(page);
    check('3-pack adds qty 3', c2 && c2.items[0] && c2.items[0].qty === 3, JSON.stringify(c2 && c2.items));
    const discountShown = await page.$eval('[data-cart-discount-row]', (r) => !r.hidden);
    check('tier discount shown in drawer', discountShown);

    // ---- Free gifts (product.gift_offers + config.cartGiftsUrl; the preview unlocks one at 3 units) ----
    const giftCfg = await page.evaluate(() => ({ data: !!document.getElementById('sf-gifts-data'), url: !!(window.Base && Base.cfg.cartGiftsUrl) }));
    if (!giftCfg.data) console.log('SKIP gift card text (no #sf-gifts-data)');
    else if (!(await page.$('[data-qcard] [data-card-gift]'))) console.log('SKIP gift card text (pack cards without [data-card-gift] in this theme)');
    else {
      const giftText = await page.$eval('[data-qcard][data-qty="3"] [data-card-gift]', (n) => (n.hidden ? '' : n.textContent)).catch(() => '');
      check('3-pack card names its free gift', /FREE/.test(giftText), giftText || 'no [data-card-gift]');
    }
    if (!giftCfg.url) console.log('SKIP cart gifts (no config.cartGiftsUrl)');
    else {
      await page.waitForTimeout(900);
      const c3 = await cart(page);
      const gift = c3 && c3.items.find((l) => l.gift);
      check('cart gets the gift line', gift && gift.price === 0 && gift.variantId, JSON.stringify(c3 && c3.items));
      check('drawer shows the gift as free', /free/i.test(await page.textContent('[data-cart-lines]')));
      await page.evaluate(() => Base.cart.setQty(0, 1));
      await page.waitForTimeout(900);
      const c4 = await cart(page);
      check('gift line removed below the tier', c4 && !c4.items.some((l) => l.gift), JSON.stringify(c4 && c4.items));
    }

    // ---- Volume bundle: one Color / Size row per unit (Pack cards setting unit_pickers) ----
    await page.goto(BASE + '/product?template=bundle', { waitUntil: 'load' });
    await page.evaluate(() => { localStorage.removeItem('sf-cart:localhost'); localStorage.removeItem('sf-cart'); });
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(400);
    await page.click('[data-qcard][data-qty="2"]');
    const rows = await page.$$('[data-qcard].is-selected [data-unit-rows] .b-unit, [data-qcard].is-selected [data-unit-rows] > div');
    if (!rows.length) console.log('SKIP per-unit rows (unit_pickers off in this theme)');
    else {
      check('2-pack shows 2 unit rows', rows.length === 2, rows.length + ' rows');
      const sel = await rows[1].$('select');
      const other = await sel.evaluate((s) => { const o = [...s.options].find((x) => x.value !== s.value); return o && o.value; });
      if (!other) console.log('SKIP mixed 2-pack (the sample product has a single variant)');
      else {
        await sel.selectOption(other);
        await page.click('#addToCart');
        await page.waitForTimeout(400);
        const c5 = await cart(page);
        const lines = c5 ? c5.items.filter((l) => !l.gift) : [];
        check('mixed 2-pack adds one line per variant', lines.length === 2 && lines[0].variantId !== lines[1].variantId && lines.every((l) => l.qty === 1), JSON.stringify(lines));
        const discountMixed = await page.$eval('[data-cart-discount-row]', (r) => !r.hidden);
        check('mixed pack keeps the tier discount', discountMixed);
      }
    }
  }

  // ---- Related rows on a live-like page (no relatedProducts): topped up from the all-products page ----
  if (await page.$('[data-related]')) {
    const rp = await browser.newPage();
    await rp.route((u) => new URL(u).pathname === '/product', async (r) => {
      const res = await r.fetch();
      const h = (await res.text()).replace(/(<div class="b-grid b-grid--related" data-related-grid>)[\s\S]*?(<\/div>\s*<\/div>)/g, '$1$2');
      await r.fulfill({ response: res, body: h, headers: Object.assign({}, res.headers(), { 'content-type': 'text/html' }) });
    });
    await rp.goto(page.url(), { waitUntil: 'load' }); // same template as the page that has the related rows
    await rp.evaluate(() => sessionStorage.clear());
    await rp.reload({ waitUntil: 'load' });
    await rp.waitForTimeout(1200);
    const rel = await rp.evaluate(() => [...document.querySelectorAll('[data-related]')].map((r) => [...r.querySelectorAll('.b-pcard')].map((c) => c.getAttribute('href') + '|' + c.getAttribute('data-card-title'))));
    const all = rel.flat();
    check('related rows filled without relatedProducts', rel.length && rel.every((x) => x.length > 0), JSON.stringify(rel));
    check('related rows never repeat a product', new Set(all).size === all.length, JSON.stringify(rel));
    await rp.close();
  }

  // ---- Review form -----------------------------------------------------------------------------
  await page.goto(BASE + '/product', { waitUntil: 'load' });
  if (await page.$('[data-review-write]')) {
    await page.click('[data-review-write]');
    await page.check('[data-review-form] input[name="rating"][value="5"]', { force: true });
    await page.fill('[data-review-form] input[name="name"]', 'Smoke Tester');
    await page.fill('[data-review-form] input[name="email"]', 'smoke@example.com');
    await page.fill('[data-review-form] input[name="title"]', 'Works');
    await page.fill('[data-review-form] textarea[name="body"]', 'Automated review from the smoke test.');
    const resp = page.waitForResponse((r) => r.url().includes('/reviews') && r.request().method() === 'POST');
    await page.click('[data-review-form] button[type="submit"]');
    const r = await resp.catch(() => null);
    await page.waitForTimeout(300);
    check('review POST accepted', r && r.status() === 200, r && r.status());
    check('review thank-you shown', /Thank you/.test(await page.textContent('[data-review-msg]')));
  } else console.log('SKIP review form (switched off in this theme)');

  // ---- Contact + newsletter --------------------------------------------------------------------
  await page.goto(BASE + '/pages/contact-us', { waitUntil: 'load' });
  await page.fill('[data-contact-form] input[name="email"]', 'buyer@example.com');
  await page.fill('[data-contact-form] textarea[name="message"]', 'Where is my order?');
  await page.click('[data-contact-form] button[type="submit"]');
  await page.waitForTimeout(600);
  check('contact form sent', /Thanks for contacting/.test(await page.textContent('[data-contact-msg]')));
  check('Lead fired (contact)', (await events(page)).includes('Lead'));
  if (await page.$('[data-newsletter]')) {
    await page.fill('[data-newsletter] input[name="email"]', 'news@example.com');
    await page.click('[data-newsletter] button[type="submit"]');
    check('newsletter thanks', /Thanks/.test(await page.textContent('[data-newsletter-msg]')));
  } else console.log('SKIP newsletter (not in this theme)');

  // ---- Order tracking --------------------------------------------------------------------------
  await page.goto(BASE + '/pages/track-your-order', { waitUntil: 'load' });
  await page.fill('[data-track-form="order"] input[name="order"]', '1024');
  await page.fill('[data-track-form="order"] input[name="email"]', 'buyer@example.com');
  await Promise.all([page.waitForURL(/tracking\/result/), page.click('[data-track-form="order"] button[type="submit"]')]);
  await page.waitForTimeout(800);
  check('tracking result shows the order', /Order #1024/.test(await page.textContent('#trk-root')));

  // ---- Search ----------------------------------------------------------------------------------
  await page.goto(BASE + '/search?q=bag', { waitUntil: 'load' });
  await page.waitForTimeout(400);
  check('Search fired', (await events(page)).includes('Search'));
  check('search filters results', /result/.test(await page.textContent('[data-search-page] [data-count]')));

  // ---- Home ------------------------------------------------------------------------------------
  await page.goto(BASE + '/', { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  check('home renders product cards', (await page.$$('.b-pcard, [data-product-card]')).length > 0); // [data-product-card]: a theme's own home product card

  // ---- Header menu + FAQ always animate (phone width) -----------------------------------------
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE + '/product', { waitUntil: 'load' });
  await page.waitForTimeout(300);
  await page.click('[data-menu-open]');
  await page.waitForTimeout(60);
  const menuMid = await page.$eval('[data-menu-drawer] .b-menu-drawer__panel', (p) => getComputedStyle(p).transform);
  await page.waitForTimeout(500);
  check('menu drawer opens with a slide', !(await page.$eval('[data-menu-drawer]', (d) => d.hidden)) && /matrix/.test(menuMid), menuMid);
  await page.click('[data-menu-drawer] .b-menu-drawer__close');
  await page.waitForTimeout(80);
  const menuClosing = await page.$eval('[data-menu-drawer]', (d) => !d.hidden && !d.classList.contains('is-open'));
  await page.waitForTimeout(450);
  check('menu drawer closes with a slide', menuClosing && (await page.$eval('[data-menu-drawer]', (d) => d.hidden)));
  const faqSel = 'details.b-faq__item:not([open]), details.b-acc:not([open]), details[data-accordion]:not([open])';
  if (await page.$(faqSel)) {
    await page.$eval(faqSel, (d) => d.scrollIntoView());
    await page.click(faqSel + ' > summary');
    await page.waitForTimeout(60);
    check('FAQ opens with an animation', await page.$eval('details.is-animating', (d) => d.open).catch(() => false));
  } else console.log('SKIP FAQ animation (no closed FAQ on the product page)');
  await page.setViewportSize({ width: 1280, height: 900 });

  check('no page errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  const failed = results.filter((r) => !r.ok);
  console.log('\n' + (results.length - failed.length) + '/' + results.length + ' passed');
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
