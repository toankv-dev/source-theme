#!/usr/bin/env node
/*
 * Fonts + colours check of a built theme against its captures.
 *
 *   node tools/style-audit.js <preview-url> <theme-dir> [--font "Poppins"] [--pages "/,/product,/collections/all"]
 *                             [--allow ".pf-expert__sign"] [--width 390]
 *   (Git Bash: prefix MSYS_NO_PATHCONV=1 when passing --pages, or "/product" turns into a Windows path)
 *
 * Fonts: lists every text element whose computed font-family does not start with the expected font (default:
 *   the first family in the captures' tokens.json body). The run is done twice, the 2nd time with
 *   `--font: Manrope` forced on :root, like a live store whose saved "font" setting is stale — the theme must
 *   still show its font. Also lists font faces the page wanted but could not load.
 * Colours: reads the computed colour of key elements (text, headings, buttons, top bar, header, footer, prices,
 *   stars, links) and flags those that are not in the captures' colours (tokens.json palette + element colours).
 * Exit code 1 when a font is wrong or a face fails to load; colour flags are warnings to look at.
 * /checkout is never audited (its fonts follow the platform's own checkout, untouched by themes).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const args = process.argv.slice(2);
const opt = (n, d) => (args.includes('--' + n) ? args[args.indexOf('--' + n) + 1] : d);
const [base, themeDir] = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')));
if (!base || !themeDir) { console.error('usage: node tools/style-audit.js <preview-url> <theme-dir> [--font F] [--pages "/,/product"]'); process.exit(1); }

const hex = (c) => {
  const m = String(c || '').match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/);
  if (!m) return /^#[0-9a-f]{6}$/i.test(c) ? c.toLowerCase() : null;
  if (m[4] !== undefined && Number(m[4]) < 0.5) return null;
  return '#' + [m[1], m[2], m[3]].map((v) => Number(v).toString(16).padStart(2, '0')).join('');
};
// Colours of the original, from every capture that is not a bot-check page.
const capDir = path.join(themeDir, '_work', 'capture');
const want = new Set();
const shots = []; // the original's screenshots: a colour filling ≥ 40 px there counts too (exact match only)
const pixels = new Set();
let font = opt('font', '');
const seen = {};
const GENERIC = /^(system-ui|-apple-system|sans-serif|serif|monospace|cursive|Arial|Helvetica|Helvetica Neue|Segoe UI|Roboto|Times New Roman|BlinkMacSystemFont)$/i;
for (const name of fs.existsSync(capDir) ? fs.readdirSync(capDir) : []) {
  const f = path.join(capDir, name, 'tokens.json');
  if (!fs.existsSync(f)) continue;
  const t = JSON.parse(fs.readFileSync(f, 'utf8'));
  for (const v of [t.desktop, t.mobile]) {
    if (!v || /verify|just a moment|attention required/i.test(v.title || '')) continue;
    for (const el of [v.body, v.h1, v.h2, v.h3, v.price]) { const f = el && el.fontFamily && el.fontFamily.split(',').map((x) => x.replace(/["']/g, '').trim()).find((x) => !GENERIC.test(x)); if (f) seen[f] = (seen[f] || 0) + 1; }
    const walk = (o) => { if (!o || typeof o !== 'object') return; for (const [k, x] of Object.entries(o)) { if (typeof x === 'string' && /color|background|palette|text|backgrounds/i.test(k)) { const h = hex(x); if (h) want.add(h); } else if (Array.isArray(x)) x.forEach((y) => (typeof y === 'string' ? hex(y) && want.add(hex(y)) : walk(y))); else walk(x); } };
    walk(v);
  }
  for (const shot of ['mobile.png', 'desktop.png']) { const png = path.join(capDir, name, shot); const v = shot === 'mobile.png' ? t.mobile : t.desktop; if (fs.existsSync(png) && !(v && /verify|just a moment|attention required/i.test(v.title || ''))) shots.push(png); }
}
if (!font) font = Object.entries(seen).sort((a, b) => b[1] - a[1]).map((x) => x[0])[0] || '';
const near = (h) => [...want].some((w) => { const d = [1, 3, 5].reduce((s, i) => s + Math.abs(parseInt(h.substr(i, 2), 16) - parseInt(w.substr(i, 2), 16)), 0); return d <= 12; });
const pages = opt('pages', '/,/product,/collections/all,/search?q=a,/pages/track-your-order,/pages/contact').split(',').filter((p) => !/checkout/.test(p));
const allow = opt('allow', '');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: Number(opt('width', 390)), height: 844 } });
  for (const png of shots) {
    const src = 'data:image/png;base64,' + fs.readFileSync(png).toString('base64');
    const cols = await page.evaluate(async (src) => { const i = new Image(); i.src = src; await i.decode(); const c = document.createElement('canvas'); c.width = i.width; c.height = Math.min(i.height, 16000); const x = c.getContext('2d'); x.drawImage(i, 0, 0); const d = x.getImageData(0, 0, c.width, c.height).data; const m = new Map(); for (let k = 0; k < d.length; k += 4) { const h = (d[k] << 16) | (d[k + 1] << 8) | d[k + 2]; m.set(h, (m.get(h) || 0) + 1); } return [...m].filter(([, n]) => n >= 40).map(([h]) => '#' + h.toString(16).padStart(6, '0')); }, src).catch(() => []);
    cols.forEach((h) => pixels.add(h));
  }
  let bad = 0;
  console.log('expected font: ' + font + ' · ' + want.size + ' token colours, ' + pixels.size + ' screenshot colours');
  for (const p of pages) {
    for (const stale of [false, true]) {
      await page.goto(base.replace(/\/$/, '') + p, { waitUntil: 'load', timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(600);
      const r = await page.evaluate(async ({ font, stale, allow }) => {
        if (stale) document.documentElement.style.setProperty('--font', 'Manrope, sans-serif');
        await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 3000))]);
        const wrong = {};
        for (const e of document.querySelectorAll('body *')) {
          if (allow && e.closest(allow)) continue;
          if (/^(SCRIPT|STYLE|PRE|CODE|svg|path|NOSCRIPT)$/i.test(e.tagName)) continue;
          const text = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) || /^(INPUT|BUTTON|SELECT|TEXTAREA)$/.test(e.tagName);
          if (!text || !e.getClientRects().length) continue;
          const f = getComputedStyle(e).fontFamily;
          if (f.replace(/["']/g, '').trim().toLowerCase().startsWith(font.toLowerCase())) continue;
          const k = f.slice(0, 40); (wrong[k] = wrong[k] || []).length < 3 && wrong[k].push(e.tagName.toLowerCase() + (e.classList[0] ? '.' + e.classList[0] : ''));
        }
        const failed = [...document.fonts].filter((x) => x.status === 'error').map((x) => x.family + ' ' + x.weight);
        if (stale) return { wrong, failed };
        const pick = { text: 'body', h1: 'h1', h2: 'h2', button: '.b-btn, button[type=submit]', topbar: '.b-topbar', header: '.b-header', footer: '.b-footer', price: '[data-price], .b-price, .b-pcard__price', sale: 's, .b-pcard__was', star: '.b-stars', link: 'main a' };
        const cols = {};
        for (const [k, s] of Object.entries(pick)) {
          const e = [...document.querySelectorAll(s)].find((x) => x.getClientRects().length && getComputedStyle(x).visibility !== 'hidden'); if (!e) continue;
          const cs = getComputedStyle(e);
          cols[k] = k === 'star' ? { fill: ((getComputedStyle(e, '::before').backgroundImage.match(/rgba?([^)]*)/) || [cs.color])[0]) } : { color: cs.color, bg: cs.backgroundColor };
        }
        return { wrong, failed, cols };
      }, { font, stale, allow });
      const label = p + (stale ? ' (saved font = Manrope)' : '');
      const w = Object.entries(r.wrong);
      if (w.length || r.failed.length) bad++;
      console.log((w.length || r.failed.length ? 'FAIL ' : 'ok   ') + label + (w.length ? ' — wrong font: ' + w.map(([f, els]) => f + ' on ' + els.join(' ')).join(' | ') : '') + (r.failed.length ? ' — not loaded: ' + r.failed.join(', ') : ''));
      if (r.cols && want.size) {
        const off = [];
        for (const [k, v] of Object.entries(r.cols)) for (const [t, c] of Object.entries(v)) { const h = hex(c); if (h && h !== '#ffffff' && h !== '#000000' && !near(h) && !pixels.has(h)) off.push(k + '.' + t + ' ' + h); }
        if (off.length) console.log('     colours not in the original: ' + off.join(', '));
      }
    }
  }
  await browser.close();
  console.log(bad ? bad + ' page run(s) with font problems' : 'fonts ok on every page');
  process.exit(bad ? 1 : 0);
})();
