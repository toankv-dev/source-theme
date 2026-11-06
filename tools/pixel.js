#!/usr/bin/env node
/*
 * Exact colours from a screenshot (the original's mobile.png / desktop.png / a section shot).
 *
 *   node tools/pixel.js <png> 120,568 40,900 …          → hex at each x,y
 *   node tools/pixel.js <png> --top 8 [--y 540-600] [--x 0-390] [--min 10]
 *                                                       → the most used colours of that band (flat UI colours:
 *                                                         stars, badges, buttons, backgrounds), with pixel counts
 *   node tools/pixel.js <png> --find "#ffbe59"          → where that colour sits (first / last y, count)
 *
 * Use it for every colour tokens.json does not hold; never write a hex from a downscaled look.
 */
'use strict';
const fs = require('fs');
const { chromium } = require('playwright');

const args = process.argv.slice(2);
const opt = (n, d) => (args.includes('--' + n) ? args[args.indexOf('--' + n) + 1] : d);
const png = args[0];
if (!png || !fs.existsSync(png)) { console.error('usage: node tools/pixel.js <png> x,y … | --top 8 [--y a-b] [--x a-b] | --find "#hex"'); process.exit(1); }
const points = args.slice(1).filter((a, i, all) => /^\d+,\d+$/.test(a) && !(all[i - 1] || '').startsWith('--'));
const range = (s, max) => { if (!s) return [0, max]; const [a, b] = s.split('-').map(Number); return [a, Math.min(b, max)]; };

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const src = 'data:image/png;base64,' + fs.readFileSync(png).toString('base64');
  const out = await page.evaluate(async ({ src, points, top, ys, xs, find, min }) => {
    const i = new Image(); i.src = src; await i.decode();
    const c = document.createElement('canvas'); c.width = i.width; c.height = i.height;
    const x = c.getContext('2d'); x.drawImage(i, 0, 0);
    const hex = (d, k) => '#' + [d[k], d[k + 1], d[k + 2]].map((v) => v.toString(16).padStart(2, '0')).join('');
    if (points.length) return points.map((p) => { const [px, py] = p.split(',').map(Number); return p + ' ' + hex(x.getImageData(px, py, 1, 1).data, 0); });
    const [y0, y1] = ys ? ys.split('-').map(Number) : [0, i.height];
    const [x0, x1] = xs ? xs.split('-').map(Number) : [0, i.width];
    const w = Math.min(x1, i.width) - x0, h = Math.min(y1, i.height) - y0;
    const d = x.getImageData(x0, y0, w, h).data;
    if (find) {
      const f = find.toLowerCase(); let first = -1, last = -1, n = 0;
      for (let k = 0; k < d.length; k += 4) if (hex(d, k) === f) { const y = y0 + Math.floor(k / 4 / w); if (first < 0) first = y; last = y; n++; }
      return [find + ': ' + (n ? 'y ' + first + '–' + last + ', ' + n + ' px' : 'not found')];
    }
    const m = new Map();
    for (let k = 0; k < d.length; k += 4) { const s = hex(d, k); m.set(s, (m.get(s) || 0) + 1); }
    return [...m].filter(([, n]) => n >= min).sort((a, b) => b[1] - a[1]).slice(0, top).map(([s, n]) => s + '  ' + n + ' px');
  }, { src, points, top: Number(opt('top', 8)), ys: opt('y', ''), xs: opt('x', ''), find: opt('find', ''), min: Number(opt('min', 10)) });
  console.log(out.join('\n'));
  await browser.close();
})();
