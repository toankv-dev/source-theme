#!/usr/bin/env node
/*
 * One line per text style of every top-level section of a page: font family, size / weight, line height, letter
 * spacing, case, colour, left edge, width, height, background / radius / border — plus each section's top, height
 * and painted background. Run it on the offline copy (tools/site-server.js) at 1440 and 390 and write the table
 * into plan.md: the fastest way to measure every block of a long page (theme-from-link / new-theme).
 *
 *   node tools/probe-sections.js <url> [--width 1440]      e.g. http://127.0.0.1:8092/home
 * Sections = .shopify-section, else the children of <main>.
 */
'use strict';
const { chromium } = require('playwright');
const { UA, UA_M, settle } = require('./lib/page');

const args = process.argv.slice(2);
const url = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--width');
const width = Number(args.includes('--width') ? args[args.indexOf('--width') + 1] : 1440);
if (!url) { console.error('usage: node tools/probe-sections.js <url> [--width 1440]'); process.exit(1); }
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width, height: 900 }, userAgent: width < 600 ? UA_M : UA, isMobile: width < 600, hasTouch: width < 600 });
  const p = await ctx.newPage();
  await p.goto(url, { waitUntil: 'load' });
  await settle(p);
  const rows = await p.evaluate(() => {
    const hex = (c) => { const m = String(c).match(/rgba?\(([^)]+)\)/); if (!m) return c; const v = m[1].split(',').map(parseFloat); if (v.length === 4 && v[3] === 0) return 'transp'; return '#' + v.slice(0, 3).map((n) => Math.round(n).toString(16).padStart(2, '0')).join('') + (v.length === 4 && v[3] < 1 ? '/' + v[3] : ''); };
    const st = (e) => { const s = getComputedStyle(e); const r = e.getBoundingClientRect(); return s.fontFamily.split(',')[0].replace(/"/g, '') + ' ' + s.fontSize + '/' + s.fontWeight + ' lh' + s.lineHeight + ' ls' + s.letterSpacing + (s.textTransform !== 'none' ? ' ' + s.textTransform : '') + (s.fontStyle !== 'normal' ? ' ' + s.fontStyle : '') + ' ' + hex(s.color) + ' x' + Math.round(r.left) + ' w' + Math.round(r.width); };
    const out = [];
    let secs = Array.from(document.querySelectorAll('.shopify-section'));
    if (secs.length < 2) secs = Array.from((document.querySelector('main') || document.body).children);
    secs = secs.filter((s) => s.getBoundingClientRect().height > 30);
    for (const sec of secs) {
      const r = sec.getBoundingClientRect();
      // the painted background: the section or its first big child
      let bgEl = sec; let bg = hex(getComputedStyle(sec).backgroundColor);
      for (const c of sec.querySelectorAll('*')) { if (bg !== 'transp') break; const cr = c.getBoundingClientRect(); if (cr.height > r.height * 0.6) { bg = hex(getComputedStyle(c).backgroundColor); bgEl = c; } }
      out.push('## ' + (sec.id || sec.className || sec.tagName).toString().slice(0, 60).replace(/^shopify-section-(template--\d+__|sections--\d+__)?/, '') + '  top ' + Math.round(r.top + scrollY) + ' h' + Math.round(r.height) + ' bg ' + bg);
      const seen = new Set();
      sec.querySelectorAll('h1, h2, h3, h4, p, li, a, button, span, div').forEach((e) => {
        if (out.length > 2000) return;
        const own = Array.from(e.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim().length > 2);
        if (!own) return;
        const rr = e.getBoundingClientRect(); if (!rr.height) return;
        const key = e.tagName + '|' + st(e).replace(/ x\d+ w\d+$/, '');
        if (seen.has(key)) return; seen.add(key);
        const s = getComputedStyle(e);
        const extra = (s.backgroundColor !== 'rgba(0, 0, 0, 0)' ? ' bg' + hex(s.backgroundColor) : '') + (parseFloat(s.borderRadius) ? ' r' + s.borderRadius : '') + (s.borderTopWidth !== '0px' ? ' bd' + s.borderTopWidth + ' ' + hex(s.borderTopColor) : '');
        out.push('  ' + e.tagName.toLowerCase().padEnd(6) + ' "' + e.textContent.trim().replace(/\s+/g, ' ').slice(0, 38) + '"  ' + st(e) + ' h' + Math.round(rr.height) + extra);
      });
    }
    return out;
  });
  console.log(rows.join('\n'));
  await b.close();
})();
