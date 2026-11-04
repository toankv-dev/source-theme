#!/usr/bin/env node
/*
 * Compares the original page with the rebuilt one, pixel by pixel.
 *
 *   node tools/visual-diff.js <reference.png | reference-url> <candidate-url> [--width 1440] [--out <dir>] [--band 300]
 *
 * The candidate (and a reference URL) is screenshotted full page after scrolling through it. Both images
 * are compared over their common size; the result is overall mismatch % plus mismatch per horizontal band
 * (default 300 px) so you can see WHICH part of the page is off. Writes candidate.png and diff.png
 * (mismatches in red) to --out (default: next to the reference, or the scratch folder).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const pixelmatch = require('pixelmatch');
const { chromium } = require('playwright');

const args = process.argv.slice(2);
const opt = (k, d) => (args.includes('--' + k) ? args[args.indexOf('--' + k) + 1] : d);
const pos = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')));
const [ref, cand] = pos;
if (!ref || !cand) { console.error('usage: node tools/visual-diff.js <reference.png|url> <candidate-url> [--width 1440]'); process.exit(1); }
const width = Number(opt('width', 1440));
const band = Number(opt('band', 300));
const out = path.resolve(opt('out', /^https?:/.test(ref) ? path.join(process.cwd(), '_diff') : path.dirname(ref)));
fs.mkdirSync(out, { recursive: true });
const tag = width < 600 ? 'mobile' : 'desktop';

async function shoot(browser, url, file) {
  const page = await browser.newPage({ viewport: { width, height: width < 600 ? 844 : 900 }, deviceScaleFactor: 1, isMobile: width < 600, hasTouch: width < 600, reducedMotion: 'reduce' });
  await page.goto(url, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(1000);
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 100)); }
    window.scrollTo(0, 0);
  });
  // Freeze motion so marquees / carousels / countdowns do not count as differences.
  await page.addStyleTag({ content: '*,*:before,*:after{animation-play-state:paused!important;transition:none!important;caret-color:transparent!important}' });
  await page.waitForTimeout(800);
  await page.screenshot({ path: file, fullPage: true });
  await page.close();
}

(async () => {
  const browser = await chromium.launch();
  let refFile = ref;
  if (/^https?:/.test(ref)) { refFile = path.join(out, 'reference-' + tag + '.png'); await shoot(browser, ref, refFile); }
  const candFile = path.join(out, 'candidate-' + tag + '.png');
  await shoot(browser, cand, candFile);
  await browser.close();

  const a = PNG.sync.read(fs.readFileSync(refFile));
  const b = PNG.sync.read(fs.readFileSync(candFile));
  const w = Math.min(a.width, b.width), h = Math.min(a.height, b.height);
  const crop = (img) => {
    const o = new PNG({ width: w, height: h });
    for (let y = 0; y < h; y++) img.data.copy(o.data, y * w * 4, y * img.width * 4, y * img.width * 4 + w * 4);
    return o;
  };
  const A = crop(a), B = crop(b), diff = new PNG({ width: w, height: h });
  const total = pixelmatch(A.data, B.data, diff.data, w, h, { threshold: 0.15, includeAA: false });
  fs.writeFileSync(path.join(out, 'diff-' + tag + '.png'), PNG.sync.write(diff));

  // Per band: mismatching pixels / band area.
  const bands = [];
  for (let y0 = 0; y0 < h; y0 += band) {
    let bad = 0;
    const y1 = Math.min(h, y0 + band);
    for (let y = y0; y < y1; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (diff.data[i] === 255 && diff.data[i + 1] < 100 && diff.data[i + 2] < 100) bad++;
    }
    bands.push({ y: y0, pct: +(100 * bad / ((y1 - y0) * w)).toFixed(1) });
  }
  console.log('reference ' + a.width + 'x' + a.height + ' · candidate ' + b.width + 'x' + b.height + (a.height !== b.height ? '  (height differs by ' + (b.height - a.height) + ' px)' : ''));
  console.log('overall mismatch: ' + (100 * total / (w * h)).toFixed(2) + '%');
  console.log('worst bands: ' + bands.slice().sort((x, y) => y.pct - x.pct).slice(0, 6).map((x) => 'y' + x.y + '–' + (x.y + band) + ': ' + x.pct + '%').join(' · '));
  console.log('files: ' + path.join(out, 'diff-' + tag + '.png'));
})().catch((e) => { console.error(e); process.exit(1); });
