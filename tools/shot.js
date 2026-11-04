#!/usr/bin/env node
/*
 * Screenshot one or more URLs (and report console errors / failed requests).
 *
 *   node tools/shot.js <url> <out.png> [--width 1440] [--height 900] [--full] [--wait 800] [--click "<css>"]
 *
 * --click runs before the screenshot (e.g. open the cart drawer: --click "[data-cart-open]").
 */
'use strict';
const { chromium } = require('playwright');

const args = process.argv.slice(2);
const opt = (name, def) => (args.includes('--' + name) ? args[args.indexOf('--' + name) + 1] : def);
const positional = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--') && !['--full'].includes(args[i - 1])));
const [url, out] = positional;
if (!url || !out) {
  console.error('usage: node tools/shot.js <url> <out.png> [--width 1440] [--full] [--click "<css>"]');
  process.exit(1);
}

(async () => {
  const width = Number(opt('width', 1440));
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width, height: Number(opt('height', width < 600 ? 844 : 900)) }, deviceScaleFactor: 1 });
  const problems = [];
  page.on('console', (m) => { if (m.type() === 'error') problems.push('console: ' + m.text()); });
  page.on('pageerror', (e) => problems.push('pageerror: ' + e.message));
  page.on('requestfailed', (r) => { if (!/fonts\.g/.test(r.url())) problems.push('failed: ' + r.url()); });
  await page.goto(url, { waitUntil: 'load', timeout: 45000 });
  // Scroll through the page so lazy images and on-scroll animations settle before the shot.
  await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } window.scrollTo(0, 0); });
  const click = opt('click', null);
  if (click) { await page.click(click); }
  await page.waitForTimeout(Number(opt('wait', 800)));
  await page.screenshot({ path: out, fullPage: args.includes('--full') });
  await browser.close();
  console.log('saved ' + out + (problems.length ? '\n' + problems.join('\n') : ' (no errors)'));
})().catch((e) => { console.error(e.message); process.exit(1); });
