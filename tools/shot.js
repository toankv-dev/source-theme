#!/usr/bin/env node
/*
 * Screenshot one or more URLs (and report console errors / failed requests).
 *
 *   node tools/shot.js <url> <out.png> [--width 1440] [--height 900] [--full] [--wait 800] [--click "<css>"]
 *
 *                     [--selector "<css>"] [--eval "<js expression>"]
 *
 * --click runs before the screenshot (e.g. open the cart drawer: --click "[data-cart-open]").
 * --selector shoots only the first matching element (scrolled into view) — one section at 360 / 390 / 1440
 *   instead of a full page to crop. <out.png> may be "-" with --eval to skip the screenshot.
 * --eval prints the JSON value of an expression run in the page after load / click, e.g. measure edges:
 *   --eval "[...document.querySelectorAll('.b-wrap')].map(e => Math.round(e.getBoundingClientRect().left))"
 */
'use strict';
const { chromium } = require('playwright');

const args = process.argv.slice(2);
const opt = (name, def) => (args.includes('--' + name) ? args[args.indexOf('--' + name) + 1] : def);
const positional = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--') && !['--full'].includes(args[i - 1])));
const [url, out] = positional;
if (!url || !out) {
  console.error('usage: node tools/shot.js <url> <out.png> [--width 1440] [--full] [--click "<css>"] [--selector "<css>"] [--eval "<js>"]');
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
  // A page that reloads itself once (hash / redirect script) destroys the context: wait for the new load and retry.
  const scroll = () => page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } window.scrollTo(0, 0); });
  await scroll().catch(async () => { await page.waitForLoadState('load'); await scroll(); });
  const click = opt('click', null);
  if (click) { await page.click(click); }
  await page.waitForTimeout(Number(opt('wait', 800)));
  const sel = opt('selector', null);
  if (sel) {
    const el = page.locator(sel).first();
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    if (out !== '-') await el.screenshot({ path: out });
  } else if (out !== '-') await page.screenshot({ path: out, fullPage: args.includes('--full') });
  const expr = opt('eval', null);
  if (expr) console.log(JSON.stringify(await page.evaluate(expr), null, 1));
  await browser.close();
  console.log((out === '-' ? 'no screenshot' : 'saved ' + out) + (problems.length ? '\n' + problems.join('\n') : ' (no errors)'));
})().catch((e) => { console.error(e.message); process.exit(1); });
