#!/usr/bin/env node
/*
 * End-to-end checks of the Shapecurve template on the preview of the comparison copy (compare-copy.js: bodysuit sample,
 * Black / Beige / Brown x "XS (95-110 lbs)" …). 1440 and 390.
 *
 *   node themes/lunara---hushflex/_src/sc-e2e.js [http://localhost:8093]
 */
'use strict';
const path = require('path');
const { chromium } = require(path.join(__dirname, '..', '..', '..', 'tools', 'node_modules', 'playwright'));
const BASE = process.argv[2] || 'http://localhost:8093';
const URL = BASE + '/product?template=shapecurve';
let fails = 0;
const ok = (cond, msg, extra) => { console.log((cond ? '  ok   ' : '  FAIL ') + msg + (extra !== undefined ? '  ' + JSON.stringify(extra) : '')); if (!cond) fails++; };

async function run(browser, width) {
  console.log('== ' + width + ' px');
  const ctx = await browser.newContext({ viewport: { width, height: width < 600 ? 844 : 900 }, isMobile: width < 600, hasTouch: width < 600 });
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
  // Find my size (getionix style): weight → size, boundary → two sizes, Metric, second table, Select
  const dlg = page.locator('.scfit__dlg');
  const sizeBox = () => page.locator('.scfit__size').innerText().catch(() => '');
  await page.locator('.scfit__open').click();
  ok(await dlg.isVisible(), 'Find my size opens');
  ok(await page.locator('[data-scfit-hf]').isHidden(), 'no Height field (the bodysuit chart has no heights)');
  ok((await page.locator('.scfit__t tbody tr').count()) === 7, 'chart: 7 sizes');
  await page.fill('[data-scfit-w]', '110');
  ok((await sizeBox()).replace(/\s/g, '') === 'XS/S', '110 lbs (on the XS / S line) → both', await sizeBox());
  ok((await page.locator('.scfit__t tr.is-match').count()) === 2, 'both rows marked');
  await page.locator('.scfit__unit[data-u="metric"]').click();
  const kg = await page.inputValue('[data-scfit-w]');
  const firstW = await page.locator('.scfit__t tbody tr:first-child td').nth(1).innerText();
  ok(kg === '50' && /43–50 kg/.test(firstW), 'Metric: 110 lbs → 50 kg, chart in kg', { kg, firstW });
  await page.locator('.scfit__unit[data-u="imperial"]').click();
  await page.locator('.scfit__g summary').click();
  ok((await page.locator('.scfit__t2 tbody tr').count()) === 7 && /″/.test(await page.locator('.scfit__t2 tbody td').nth(1).innerText()), 'second table (body measurements, inches)');
  await page.fill('[data-scfit-w]', '130');
  ok((await sizeBox()).trim() === 'M', '130 lbs → M', await sizeBox());
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

  // the same finder with a Height column (getionix chart, copy-only template "fittest")
  await page.goto(BASE + '/product?template=fittest', { waitUntil: 'load' });
  await page.locator('.scfit__open').click();
  ok(await page.locator('[data-scfit-hf]').isVisible(), 'Height field shows with a Height column');
  await page.fill('[data-scfit-w]', '150');
  ok((await sizeBox()).trim() === 'M', '150 lbs → M', await sizeBox());
  await page.fill('[data-scfit-ha]', '5'); await page.fill('[data-scfit-hb]', '9');
  ok((await sizeBox()).replace(/\s/g, '') === 'M/L', '150 lbs + 5′9″ (taller than M) → M / L', await sizeBox());
  await page.locator('.scfit__unit[data-u="metric"]').click();
  ok((await page.inputValue('[data-scfit-ha]')) === '175' && (await sizeBox()).replace(/\s/g, '') === 'M/L', 'Metric keeps it: 175 cm, M / L');
  await page.keyboard.press('Escape');
  await page.goto(URL, { waitUntil: 'load' });

  // testimonials dots, sideways scroll
  ok((await page.locator('.sct__dot').count()) >= 2, 'testimonial dots', await page.locator('.sct__dot').count());
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ok(over <= 0, 'no sideways scroll', over);

  // Express checkout (fresh page, Buy 1)
  await page.goto(URL, { waitUntil: 'load' });
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
