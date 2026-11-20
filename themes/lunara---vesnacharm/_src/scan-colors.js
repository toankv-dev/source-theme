#!/usr/bin/env node
/*
 * Colour sweep (docs/SPEC-lunara-vesnacharm.md; user 2026-11-19 "the whole theme in the #790236 tone, button borders in it,
 * no black borders"). Opens the pages of the comparison copy (+ open states: cart drawer, Find my size, review filters,
 * phone menu) at 1440 and 390 and lists:
 *   - controls (buttons, button links, pills, selects, chips, pages) with a neutral dark background (black / grey) or a
 *     neutral border (black / grey), and
 *   - anything still in Lunara's blue #124F9F.
 * Exit 1 when something is listed.
 *
 *   node themes/lunara---vesnacharm/_src/scan-colors.js [http://localhost:8097]
 */
'use strict';
const path = require('path');
const { chromium } = require(path.join(__dirname, '..', '..', '..', 'tools', 'node_modules', 'playwright'));
const BASE = process.argv[2] || 'http://localhost:8097';
const PAGES = [
  ['bodysuit', '/product?template=triple-zone-bodysuit'],
  ['bodysuit+picker', '/product?template=picker'],
  ['bodysuit+videos', '/product?template=reels'],
  ['product', '/product'],
  ['bundle', '/product?template=bundle'],
  ['sizes', '/product?template=sizes'],
  ['tiles', '/product?template=tiles'],
  ['home', '/'],
  ['catalog', '/collections/all'],
  ['about', '/pages/about-us'],
  ['tracking', '/pages/track-your-order'],
  ['checkout', '/checkout'],
];

async function scan(page) {
  return page.evaluate(() => {
    const rgb = (s) => { const m = String(s).match(/rgba?\(([^)]+)\)/); if (!m) return null; const v = m[1].split(',').map((x) => parseFloat(x)); return { r: v[0], g: v[1], b: v[2], a: v.length > 3 ? v[3] : 1 }; };
    const hex = (c) => '#' + [c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
    const neutral = (c) => c && c.a > 0.15 && Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b) < 24;
    const darkNeutral = (c) => neutral(c) && Math.max(c.r, c.g, c.b) < 0x70;
    const greyBorder = (c) => neutral(c) && Math.max(c.r, c.g, c.b) < 0xd8;
    const blue = (c) => c && c.a > 0.15 && Math.abs(c.r - 18) < 14 && Math.abs(c.g - 79) < 14 && Math.abs(c.b - 159) < 14;
    const vis = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 2 && r.height > 2 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0.05; };
    const name = (e) => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/).slice(0, 3).join('.') : '');
    const out = new Map();
    const add = (e, why) => { const k = name(e) + ' | ' + why; if (!out.has(k)) out.set(k, (e.textContent || e.value || '').trim().replace(/\s+/g, ' ').slice(0, 24)); };
    const CONTROLS = 'button, a.button, .button, [role=button], select, input[type=submit], input[type=button], .scr__chip, .scr__pg, .ms-variant-group label, .lu-variants label, .kaching-bundles__bar select, .scfit__open, .scfit__pick, .scfit__unit, summary.button';
    document.querySelectorAll(CONTROLS).forEach((e) => {
      if (!vis(e) || e.closest('.scr__dlg:not([open]), dialog:not([open]), .visually-hidden') || e.matches('.visually-hidden, .co-input')) return;
      const s = getComputedStyle(e), a = getComputedStyle(e, '::after');
      [['bg', rgb(s.backgroundColor)], ['bg::after', a.content !== 'none' ? rgb(a.backgroundColor) : null]].forEach(([w, c]) => { if (darkNeutral(c)) add(e, w + ' ' + hex(c)); });
      ['Top', 'Right', 'Bottom', 'Left'].forEach((side) => {
        const wpx = parseFloat(s['border' + side + 'Width']); const c = rgb(s['border' + side + 'Color']);
        if (wpx > 0 && greyBorder(c) && s['border' + side + 'Style'] !== 'none') add(e, 'border ' + hex(c));
      });
    });
    document.querySelectorAll('body *').forEach((e) => {
      if (!vis(e)) return;
      const s = getComputedStyle(e);
      [['color', s.color], ['bg', s.backgroundColor], ['border', s.borderTopColor], ['fill', s.fill]].forEach(([w, v]) => { const c = rgb(v); if (blue(c) && !(w === 'border' && !parseFloat(s.borderTopWidth))) add(e, 'BLUE ' + w + ' ' + hex(c)); });
    });
    return [...out.entries()].map(([k, t]) => k + (t ? '  "' + t + '"' : ''));
  });
}

(async () => {
  const browser = await chromium.launch();
  let total = 0;
  for (const width of [1440, 390]) {
    const ctx = await browser.newContext({ viewport: { width, height: width < 600 ? 844 : 900 }, isMobile: width < 600, hasTouch: width < 600 });
    // the preview's live reload (fs.watch → location.reload) must not fire mid-scan (Windows reports spurious changes)
    await ctx.route('**/events', (r) => r.fulfill({ status: 200, headers: { 'content-type': 'text/event-stream' }, body: ': off\n\n' }));
    const page = await ctx.newPage();
    const report = async (label) => { const l = await scan(page); total += l.length; if (l.length) console.log('== ' + width + ' ' + label + '\n  ' + l.join('\n  ')); };
    for (const [label, url] of PAGES) {
      await page.goto(BASE + url, { waitUntil: 'load' });
      await page.waitForTimeout(700);
      await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); } window.scrollTo(0, 0); });
      await page.waitForTimeout(500);
      await report(label);
      if (label === 'bodysuit') {
        const R = page.locator('#lu-reviews [data-scr-filters]');
        if (await R.count()) { await R.evaluate((e) => e.click()); await page.waitForTimeout(200); await report('bodysuit: review filters open'); }
        const fit = page.locator('.scfit__open');
        if (await fit.count()) { await fit.click(); await page.fill('[data-scfit-w]', '130'); await page.waitForTimeout(300); await report('bodysuit: Find my size open'); await page.keyboard.press('Escape'); }
        await page.locator('#addToCart').click();
        await page.waitForTimeout(1400);
        await report('bodysuit: cart drawer open');
      }
      if (label === 'home' && width < 600) {
        const m = page.locator('header-drawer summary').first();
        if (await m.count()) { await m.click(); await page.waitForTimeout(500); await report('home: phone menu open'); }
      }
    }
    await ctx.close();
  }
  await browser.close();
  console.log(total ? total + ' finding(s)' : 'clean');
  process.exit(total ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
