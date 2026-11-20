#!/usr/bin/env node
/*
 * End-to-end checks of the Triple-Zone bodysuit template on the preview of the comparison copy (compare-copy.js: bodysuit sample,
 * Black / Beige / Brown x "XS (95-110 lbs)" …). 1440 and 390.
 *
 *   node themes/lunara---vesnacharm/_src/sc-e2e.js [http://localhost:8093]
 */
'use strict';
const path = require('path');
const { chromium } = require(path.join(__dirname, '..', '..', '..', 'tools', 'node_modules', 'playwright'));
const BASE = process.argv[2] || 'http://localhost:8093';
const REAL = BASE + '/product?template=triple-zone-bodysuit';  // the template as shipped (no main picker)
const URL = BASE + '/product?template=picker';  // copy-only: the same page with the main Color / Size picker
let fails = 0;
const ok = (cond, msg, extra) => { console.log((cond ? '  ok   ' : '  FAIL ') + msg + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); if (!cond) fails++; };

async function run(browser, width) {
  console.log('== ' + width + ' px');
  const ctx = await browser.newContext({ viewport: { width, height: width < 600 ? 844 : 900 }, isMobile: width < 600, hasTouch: width < 600 });
  // the preview's live reload (fs.watch → location.reload) must not fire mid-check (Windows reports spurious changes)
  await ctx.route('**/events', (r) => r.fulfill({ status: 200, headers: { 'content-type': 'text/event-stream' }, body: ': off\n\n' }));
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(URL, { waitUntil: 'load' });
  await page.evaluate(() => { try { Object.keys(localStorage).filter((k) => /^sf-cart/.test(k)).forEach((k) => localStorage.removeItem(k)); } catch (e) {} });
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(800);
  const events = (name) => page.evaluate((n) => (window.__events || []).filter((e) => e.event === n).length, name);

  ok((await events('ViewContent')) === 1, 'one ViewContent', await events('ViewContent'));
  ok((await page.locator('label.sc-swimg').count()) === 3, 'Color shown as 3 picture tiles');
  ok(await page.locator('.lu-variants').first().isVisible(), 'main Color / Size picker visible next to the packs');

  // main picker → pack rows
  await page.locator('label.sc-swimg').nth(2).click();
  await page.locator('.lu-variants label', { hasText: 'M (125-140 lbs)' }).first().click();
  await page.waitForTimeout(300);
  const rows = () => page.evaluate(() => [...document.querySelectorAll('.kaching-bundles__bar--selected [data-lu-unit]')].map((u) => [...u.querySelectorAll('select')].map((s) => s.value).join(' / ')));
  const r2 = await rows();
  ok(r2.length === 2 && r2.every((v) => v === 'Brown / M (125-140 lbs)'), 'Buy 2 rows follow the main picker', r2);
  await page.locator('.kaching-bundles__bar[data-lu-qty="3"]').click();
  await page.waitForTimeout(300);
  const r3 = await rows();
  ok(r3.length === 3 && r3.every((v) => v === 'Brown / M (125-140 lbs)'), 'Buy 3 has 3 rows with the main choice', r3);
  const packPrice = await page.locator('.kaching-bundles__bar[data-lu-qty="3"] [data-lu-price]').innerText();

  // Add to cart
  await page.locator('#addToCart').click();
  await page.waitForTimeout(800);
  ok((await events('AddToCart')) === 1, 'one AddToCart', await events('AddToCart'));
  const cart = await page.evaluate(() => { const k = Object.keys(localStorage).find((x) => /^sf-cart:/.test(x)) || 'sf-cart'; try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch (e) { return []; } });
  const lines = (Array.isArray(cart) ? cart : cart.items || cart.lines || []).filter((l) => !l.gift);
  const qty = lines.reduce((a, l) => a + (Number(l.qty) || 0), 0);
  ok(qty === 3 && lines.every((l) => l.variantId === 'v-brown-m'), 'cart = 3 x Brown / M', lines.map((l) => l.variantId + ' x' + l.qty + ' ' + JSON.stringify(l.opts)));
  const drawerOpen = await page.evaluate(() => { const d = document.querySelector('cart-drawer'); return !!d && (d.classList.contains('active') || d.hasAttribute('open') || getComputedStyle(d).visibility === 'visible'); });
  ok(drawerOpen, 'cart drawer opened');
  const subtotal = await page.evaluate(() => { const s = document.querySelector('[data-ms-cart-subtotal]'); return s ? s.textContent.trim() : ''; });
  ok(subtotal.replace(/\s/g, '') === packPrice.replace(/\s/g, ''), 'drawer subtotal = Buy 3 price', { subtotal, packPrice });
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(600);

  // size chart + size finder
  await page.locator('.sc-tab summary', { hasText: 'Size Chart' }).click();
  ok((await page.locator('.sc-chart tbody tr').count()) === 7, 'size chart table has 7 sizes');
  // Find my size (shape-curve.com style): weight required, bust / waist / hips optional, in / lbs ⇄ cm / kg, chart, Select
  const dlg = page.locator('.scfit__dlg');
  const sizeTxt = () => page.locator('[data-scfit-size]').innerText().catch(() => '');
  const go = async () => { await page.locator('[data-scfit-go]').click(); await page.waitForTimeout(100); };
  await page.locator('.scfit__open').click();
  ok(await dlg.isVisible(), 'Find my size opens');
  ok((await page.locator('.scfit__f:not([hidden])').count()) === 4, 'Weight + Bust / Waist / Hips fields');
  ok((await page.locator('[data-scfit-t] tbody tr').count()) === 7 && (await page.locator('[data-scfit-t] thead th').count()) === 6, 'complete size chart: 7 sizes x 6 columns');
  await go();
  ok(await page.locator('[data-scfit-err]').isVisible() && (await page.getAttribute('[data-scfit-w]', 'aria-invalid')) === 'true', 'no weight → asks for it');
  await page.fill('[data-scfit-w]', '110'); await go();
  ok((await sizeTxt()).replace(/\s/g, '') === 'XS/S' && (await page.locator('[data-scfit-t] tr.is-hit').count()) === 2, '110 lbs (on the XS / S line) → both, both rows marked', await sizeTxt());
  await page.fill('[data-scfit-w]', '130'); await page.fill('[data-scfit-m="bust"]', '42'); await go();
  ok((await sizeTxt()).trim() === 'L', '130 lbs + bust 42 in → L (fits the largest measurement)', await sizeTxt());
  await page.locator('.scfit__unit[data-u="metric"]').click();
  const kg = await page.inputValue('[data-scfit-w]'), cm = await page.inputValue('[data-scfit-m="bust"]');
  const th = (await page.locator('[data-scfit-t] thead th').allInnerTexts()).join(' ');
  ok(kg === '59' && cm === '107' && /\(kg\)/.test(th) && /\(cm\)/.test(th) && (await sizeTxt()).trim() === 'L', 'cm / kg: 59 kg, 107 cm, chart in kg / cm, still L', { kg, cm, th });
  await page.locator('.scfit__unit[data-u="imperial"]').click();
  await page.fill('[data-scfit-m="bust"]', ''); await go();
  ok((await sizeTxt()).trim() === 'M', '130 lbs → M', await sizeTxt());
  await page.locator('.scfit__pick').first().click();
  await page.waitForTimeout(400);
  ok(await dlg.isHidden(), 'Select closes the pop-up');
  const picked = await page.evaluate(() => { const g = [...document.querySelectorAll('.lu-variants .ms-variant-group')].find((x) => x.getAttribute('data-option-name') === 'Size'); const r = g && g.querySelector('input:checked'); return r ? r.value : ''; });
  ok(picked === 'M (125-140 lbs)', 'Select M → main picker M (125-140 lbs)', picked);
  const rowsM = await rows();
  ok(rowsM.length > 0 && rowsM.every((v) => /M \(125-140 lbs\)$/.test(v)), 'and every row of the picked pack', rowsM);
  await page.locator('.scfit__open').click();
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  ok(await dlg.isHidden(), 'Esc closes');

  // the size option found by its values (copy-only template "fitopt": the block names it "Side")
  await page.goto(BASE + '/product?template=fitopt', { waitUntil: 'load' });
  await page.waitForTimeout(600);
  await page.locator('.scfit__open').click();
  await page.fill('[data-scfit-w]', '150'); await go();
  await page.locator('.scfit__pick').first().click();
  await page.waitForTimeout(400);
  const rowsL = await rows();
  ok(rowsL.length > 0 && rowsL.every((v) => /L \(140-160 lbs\)$/.test(v)), 'option named otherwise: 150 lbs → L set in every pack row', rowsL);
  await page.goto(URL, { waitUntil: 'load' });

  // customer videos in place of the photo testimonials (user 2026-11-19): no file picked → band hidden; copy-only
  // template "reels" (4 sample clips + 2 empty slots) → 4 portrait cards. Playback: _work/../scratchpad reels-check (Chrome).
  const rlEmpty = await page.evaluate(() => { const s = document.querySelector('[data-scv]'); return [!!s && getComputedStyle(s).display, !!document.querySelector('.sct')]; });
  ok(rlEmpty[0] === 'none' && rlEmpty[1] === false, 'customer videos: hidden while no video is picked; photo testimonials off', rlEmpty);
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ok(over <= 0, 'no sideways scroll', over);
  await page.goto(BASE + '/product?template=reels', { waitUntil: 'load' });
  const rl = await page.evaluate(() => {
    const s = document.querySelector('[data-scv]'), v = [...s.querySelectorAll('.scv__card')].filter((c) => getComputedStyle(c).display !== 'none');
    return { n: v.length, ratio: v.every((c) => { const q = c.getBoundingClientRect(); return Math.abs(q.height - q.width * 16 / 9) < 2; }), sound: s.querySelectorAll('.scv__card:not([hidden]) [data-scv-sound]').length, over: document.documentElement.scrollWidth - innerWidth };
  });
  ok(rl.n === 4 && rl.ratio && rl.sound === 4 && rl.over <= 0, 'customer videos: 4 portrait 9:16 cards with Sound, empty slots left out, no sideways scroll', rl);
  await page.goto(URL, { waitUntil: 'load' });

  // Okendo-style reviews (sc-reviews; copy sample: 5 x 5★ with a photo, 2 x 4★, 1 x 3★, 5 per page)
  await page.goto(URL, { waitUntil: 'load' });
  await page.locator('#lu-reviews').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => { const c = document.querySelector('#lu-reviews [data-scr-count="4"]'); return c && c.textContent === '2'; }, null, { timeout: 5000 }).catch(() => null);
  const R = page.locator('#lu-reviews.scr');
  const rvItems = () => R.locator('.scr__item');
  const rvStars = () => R.locator('.scr__item > .scr__main > .scr__stars').evaluateAll((l) => l.map((e) => e.getAttribute('aria-label')));
  ok(await R.count() === 1, 'reviews section is sc-reviews with id lu-reviews');
  // "Write a review" (user 2026-11-19, as tammycharm.com; was off before): the button opens the form; an empty send
  // shows the field messages and posts nothing. The full flow (multipart POST, 201 / 400 / 429): scratchpad write-save-check.
  ok((await R.locator('[data-scr-write]').innerText()).trim() === 'Write a review', '"Write a review" button', await R.locator('[data-scr-write]').count());
  await R.locator('[data-scr-write]').evaluate((e) => e.click());
  await page.waitForTimeout(200);
  await R.locator('[data-scr-wsubmit]').evaluate((e) => e.click());
  await page.waitForTimeout(200);
  const wErr = await R.locator('[data-scr-werr]').evaluateAll((l) => l.filter((e) => e.textContent).map((e) => e.getAttribute('data-scr-werr')));
  ok((await R.locator('[data-scr-wdlg]').evaluate((d) => d.open)) && wErr.join() === 'rating,name,body', 'review form opens; empty send → rating / name / review messages', wErr);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
  ok((await R.locator('[data-scr-avg]').innerText()) === '4.8', 'average 4.8', await R.locator('[data-scr-avg]').innerText());
  const counts = await R.locator('[data-scr-count]').allInnerTexts();
  ok(counts.join() === '5,2,1,0,0', 'star bars 5 / 2 / 1 / 0 / 0', counts);
  ok((await R.locator('[data-scr-rec-pct]').innerText()) === '88%', 'would recommend = 4-5★ share 88 %', await R.locator('[data-scr-rec-pct]').innerText());
  // the copy's Sydney has 2 photos (several photos per review, user 2026-11-19): 5 reviews with photos, 6 photos
  ok((await R.locator('.scr__thumb').count()) === 6, 'photo strip: all 6 customer photos (5 reviews, one with 2)', await R.locator('.scr__thumb').count());
  ok((await rvItems().count()) === 5, '5 reviews at first', await rvItems().count());
  ok(await rvItems().first().locator('.scr__ph').count() >= 1, 'Photos & Videos sort: a review with a photo first');
  const syd = R.locator('.scr__item', { hasText: 'Sydney' });
  ok(await syd.locator('.scr__ph img').count() === 2, 'a review with 2 photos shows both', await syd.locator('.scr__ph img').count());
  ok(/ago|today/.test(await rvItems().first().locator('.scr__date').innerText()), 'relative date', await rvItems().first().locator('.scr__date').innerText());
  ok((await R.locator('.scr__av').allInnerTexts()).includes('EC'), 'two-letter initials (Emma C. → EC)');
  const pgText = () => R.locator('[data-scr-pager] > *').evaluateAll((l) => l.map((e) => (e.getAttribute('aria-current') ? '[' + e.textContent.trim() + ']' : e.textContent.trim() || (e.getAttribute('aria-label') === 'Previous page' ? '<' : '>')) + (e.disabled ? '-' : '')).join(' '));
  ok((await pgText()) === '<- [1] 2 >', 'pages: ‹ [1] 2 › (8 reviews, 5 per page)', await pgText());
  await R.locator('[data-scr-page="2"]').first().evaluate((e) => e.click());
  await page.waitForTimeout(200);
  ok((await rvItems().count()) === 3 && (await pgText()) === '< 1 [2] >-', 'page 2 → the last 3 reviews', [await rvItems().count(), await pgText()]);
  await R.locator('[aria-label="Previous page"]').evaluate((e) => e.click());
  await page.waitForTimeout(200);
  ok((await rvItems().count()) === 5, '‹ → back to page 1');
  await R.locator('[data-scr-star="4"]').evaluate((e) => e.click());
  await page.waitForTimeout(200);
  const s4 = await rvStars();
  ok(s4.length === 2 && s4.every((x) => /^4 /.test(x)) && (await R.locator('[data-scr-shown-total]').innerText()) === '2', 'tap the 4★ bar → the two 4★ reviews', s4);
  ok(await R.locator('[data-scr-pager]').isHidden(), 'one page → no page numbers');
  await R.locator('[data-scr-star="4"]').evaluate((e) => e.click());
  await page.waitForTimeout(200);
  ok((await rvItems().count()) === 5, 'tap it again → filter off');
  await R.locator('[data-scr-filters]').evaluate((e) => e.click());
  ok(await R.locator('[data-scr-panel]').isVisible(), 'Filters opens the panel');
  await R.locator('[data-scr-photo-only]').evaluate((e) => e.click());
  await page.waitForTimeout(200);
  ok((await rvItems().count()) === 5 && (await R.locator('.scr__item:not(.has-photo)').count()) === 0, 'With photos → only reviews with a photo');
  await R.locator('[data-scr-photo-only]').evaluate((e) => e.click());
  await page.locator('#lu-reviews [data-scr-sort]').selectOption('low');
  await page.waitForTimeout(200);
  ok(/^3 /.test((await rvStars())[0] || ''), 'Sort Lowest Rating → 3★ first', (await rvStars())[0]);
  await page.locator('#lu-reviews [data-scr-sort]').selectOption('photos');
  await page.waitForTimeout(200);
  const rm = R.locator('.scr__rm').first();
  const before = (await R.locator('.scr__c').first().innerText()).length;
  await rm.evaluate((e) => e.click());
  ok((await R.locator('.scr__c').first().innerText()).length > before + 100 && /Read Less/.test(await rm.innerText()), 'Read More opens the full text');
  await R.locator('.scr__thumb').first().evaluate((e) => e.click());
  ok(await page.locator('#lu-reviews dialog[open]').count() === 1, 'a customer photo opens the review pop-up');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  ok(await page.locator('#lu-reviews dialog[open]').count() === 0, 'Esc closes it');
  // many pages: one review per page (copy-only template) → the "…"
  await page.goto(BASE + '/product?template=reviewpages', { waitUntil: 'load' });
  await page.locator('#lu-reviews').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelectorAll('#lu-reviews [data-scr-pager] > *').length > 4, null, { timeout: 5000 }).catch(() => null);
  const P = width < 600 ? ['<- [1] 2 3 … 8 >', '< 1 … 6 7 [8] >-', '< 1 … [5] … 8 >'] : ['<- [1] 2 3 4 5 … 8 >', '< 1 … 4 5 6 7 [8] >-', '< 1 … 4 [5] 6 7 8 >'];
  ok((await pgText()) === P[0], 'many pages: first ones, …, last', await pgText());
  await R.locator('[data-scr-page="8"]').first().evaluate((e) => e.click());
  await page.waitForTimeout(200);
  ok((await pgText()) === P[1], 'last page: …, last ones', await pgText());
  for (let k = 0; k < 3; k++) { await R.locator('[aria-label="Previous page"]').evaluate((e) => e.click()); await page.waitForTimeout(100); }
  ok((await pgText()) === P[2] && (await rvItems().count()) === 1, 'page 5: its own review, numbers around it', await pgText());
  await page.goto(BASE + '/product', { waitUntil: 'load' });
  ok(await page.locator('lu-reviews').count() === 1 && await page.locator('.scr').count() === 0, 'default template keeps Lunara reviews');

  // live fixes (user 2026-11-19), on the template as shipped
  await page.goto(REAL, { waitUntil: 'load' });
  await page.waitForTimeout(600);
  ok(!(await page.locator('.lu-variants').first().isVisible()), 'no main Color / Size picker above the packs');
  const lbl = await page.evaluate(() => [...document.querySelectorAll('.product__info-container *')].filter((e) => !e.children.length && !e.closest('table, .scfit') && /^(Side|Size|Color)$/.test(e.textContent.trim()) && e.offsetParent).map((e) => e.textContent.trim()));
  ok(lbl.length === 0, 'no Side / Size / Color label left', lbl);
  await page.locator('.kaching-bundles__bar[data-lu-qty="1"]').click();
  await page.waitForTimeout(300);
  const r1 = await page.evaluate(() => [...document.querySelectorAll('.kaching-bundles__bar--selected [data-lu-unit] select')].length);
  ok(r1 === 2, 'Buy 1 has its own Color + Size pickers', r1);
  await page.locator('.kaching-bundles__bar[data-lu-qty="2"]').click();
  await page.waitForTimeout(300);
  ok(await page.locator('.sc-buynow').count() === 0, 'no express checkout button on the template');
  const atc = await page.evaluate(() => { const b = document.querySelector('#addToCart'), a = getComputedStyle(b, '::after'); return { bg: a.backgroundColor, color: getComputedStyle(b).color, radius: getComputedStyle(b).borderRadius }; });
  ok(atc.bg === 'rgb(121, 2, 54)' && atc.color === 'rgb(255, 255, 255)' && atc.radius === '40px', 'Add to cart: pill, white text on the main colour #790236', atc);
  ok(await page.locator('.kaching-bundles__bar--selected .kaching-bundles__bar-variant-names').evaluateAll((l) => l.every((e) => getComputedStyle(e).display === 'none')), 'no "Size, Color" line in the pack rows');
  const hl = await page.locator('.sc-hlbox--check li').evaluateAll((l) => l.map((e) => [e.querySelector('svg') ? 1 : 0, e.textContent.trim()]));
  ok(hl.length === 3 && hl.every((x) => x[0] === 1 && /^[A-Z]/.test(x[1])), 'highlights: check list, emoji left out', hl);
  // under the Add to cart: Guaranteed safe checkout + delivery estimate / guarantee (as tammycharm.com)
  const tb = await page.evaluate(() => {
    const atc = document.querySelector('#addToCart'), box = document.querySelector('.sc-safe'), eta = document.querySelector('.sc-eta');
    const day = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }); };
    return {
      after: !!(box && atc && (atc.compareDocumentPosition(box) & Node.DOCUMENT_POSITION_FOLLOWING) && box.offsetParent),
      legend: box ? box.querySelector('legend').textContent.replace(/\s+/g, ' ').trim() : '',
      em: box ? getComputedStyle(box.querySelector('legend em')).color : '',
      icons: box ? [...box.querySelectorAll('img')].length : 0,
      eta: eta ? eta.querySelector('[data-sc-eta-text]').textContent.trim() : '',
      want: 'Order today, get it between ' + day(7) + ' and ' + day(15),
      bold: eta ? eta.querySelectorAll('[data-sc-eta-text] strong').length : 0,
      link: eta ? (eta.querySelector('a') || {}).getAttribute('href') : '',
    };
  });
  ok(tb.after && tb.legend === 'Guaranteed safe checkout' && tb.em === 'rgb(121, 2, 54)' && tb.icons === 7, 'Guaranteed safe checkout box under Add to cart, 7 payment icons', tb);
  ok(tb.eta === tb.want && tb.bold === 2, 'delivery estimate: today + 7 / + 15 days, dates in bold', [tb.eta, tb.want]);
  ok(/refund/.test(tb.link || ''), 'guarantee links to the refund policy', tb.link);

  // Express checkout (copy-only template with the second button, fresh page, Buy 1)
  await page.goto(BASE + '/product?template=buynow', { waitUntil: 'load' });
  await page.waitForTimeout(600);
  await page.locator('.kaching-bundles__bar[data-lu-qty="1"]').click();
  await Promise.all([page.waitForURL(/checkout/, { timeout: 8000 }).catch(() => null), page.locator('.sc-buynow').click()]);
  ok(/checkout/.test(page.url()), 'Express checkout → /checkout', page.url());
  const after = await page.evaluate(() => { const k = Object.keys(localStorage).find((x) => /^sf-cart:/.test(x)) || 'sf-cart'; try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch (e) { return []; } });
  const l2 = (Array.isArray(after) ? after : after.items || []).filter((l) => !l.gift);
  ok(l2.reduce((a, l) => a + (Number(l.qty) || 0), 0) === 4, 'cart had 3 + 1 lines before checkout', l2.map((l) => l.variantId + ' x' + l.qty));

  ok(!errors.length, 'no script errors', errors.slice(0, 3));
  await ctx.close();
}

(async () => {
  const browser = await chromium.launch();
  for (const w of [1440, 390]) await run(browser, w);
  await browser.close();
  console.log(fails ? fails + ' FAILED' : 'all passed');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
