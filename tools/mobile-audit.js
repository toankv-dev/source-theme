#!/usr/bin/env node
/*
 * Mobile audit of a running preview: phone layout + performance budget, page by page.
 *
 *   node tools/mobile-audit.js [http://localhost:8090] [--pages "/,/product"] [--width 360,390] [--shots <dir>] [--json out.json]
 *
 * Per page and phone width (touch, DPR 3):
 *   overflow   element sticking out of the screen sideways (page scrolls horizontally)
 *   tap        visible control smaller than 44 × 44 px (links inside running text are exempt)
 *   text       visible text under 12 px
 *   input      input / select / textarea under 16 px (iOS zooms the page on focus)
 *   cls-img    <img> without width/height or a CSS aspect-ratio (layout shift while loading)
 *   lcp-lazy   the LCP image is loading="lazy" (slow first paint)
 *   heavy-img  image file more than 2.5× wider than it is shown at DPR 3 (wasted bytes)
 *   perf       LCP > 2.5 s, CLS > 0.1, JS > 150 KB, CSS > 120 KB, page weight > 2 MB, render-blocking scripts
 * Also opens the menu, search and cart drawer and checks they fit the screen.
 * Exit code 1 when an "error" is found (overflow, input, perf LCP/CLS); "warn" items are listed only.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const args = process.argv.slice(2);
const opt = (n, d) => (args.includes('--' + n) ? args[args.indexOf('--' + n) + 1] : d);
const BASE = (args.find((a) => /^https?:/.test(a)) || 'http://localhost:8090').replace(/\/$/, '');
const PAGES = opt('pages', '/,/product,/product?template=bundle,/collections/all,/search?q=a,/pages/track-your-order,/pages/contact-us,/pages/about-us,/checkout').split(',');
const WIDTHS = opt('width', '360,390').split(',').map(Number);
const SHOTS = opt('shots', '');
const JSON_OUT = opt('json', '');

const BUDGET = { lcp: 2500, cls: 0.1, js: 150 * 1024, css: 120 * 1024, total: 2 * 1024 * 1024 };

function inPage() {
  const W = window.innerWidth, out = [];
  const vis = (el) => {
    // Content of a closed <details> keeps a layout box in Chromium but is not shown.
    const d = el.closest('details:not([open])');
    if (d && !el.closest('summary') && el !== d) return false;
    const s = getComputedStyle(el);
    if (s.visibility === 'hidden' || s.display === 'none' || +s.opacity === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const name = (el) => {
    let n = el.tagName.toLowerCase();
    if (el.id) n += '#' + el.id;
    const c = (el.getAttribute('class') || '').trim().split(/\s+/).filter(Boolean).slice(0, 2);
    if (c.length) n += '.' + c.join('.');
    const t = (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30);
    return t ? n + ' "' + t + '"' : n;
  };
  // Inside a box that scrolls / clips sideways (carousels, tracks) → not a page overflow.
  const clipped = (el) => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const ox = getComputedStyle(p).overflowX;
      if (ox !== 'visible') return true;
      if (p.closest('[hidden]')) return true;
    }
    return false;
  };
  const all = Array.from(document.querySelectorAll('body *'));
  // overflow
  const docW = document.scrollingElement.scrollWidth;
  if (docW > W + 1) out.push({ type: 'overflow', level: 'error', what: 'page is ' + docW + 'px wide for a ' + W + 'px screen' });
  all.forEach((el) => {
    if (!vis(el) || clipped(el)) return;
    const r = el.getBoundingClientRect();
    if (r.right < -500) return; // parked off-screen on purpose (skip link, screen-reader text)
    if (r.right > W + 1 || r.left < -1) {
      const pos = getComputedStyle(el).position;
      if (pos === 'fixed' && (r.left >= W || r.right <= 0)) return; // off-canvas drawer
      out.push({ type: 'overflow', level: 'error', what: name(el) + ' spans ' + Math.round(r.left) + '…' + Math.round(r.right) });
    }
  });
  // tap targets
  document.querySelectorAll('a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [role=radio], [role=switch], label[for]').forEach((el) => {
    if (!vis(el) || el.closest('[hidden], [aria-hidden=true]') || el.getBoundingClientRect().right < -500) return;
    if (el.tagName === 'A' && el.closest('p, li, .b-rte') && !el.closest('nav, .b-footer ul, .b-drawer')) {
      const parentText = (el.parentElement.textContent || '').trim();
      if (parentText.length > (el.textContent || '').trim().length + 3) return; // link inside a sentence
    }
    if (el.tagName === 'INPUT' && /radio|checkbox/.test(el.type)) {
      const lab = el.id && document.querySelector('label[for="' + el.id + '"]');
      if (lab || el.closest('label')) return; // the label is the target
    }
    const r = el.getBoundingClientRect();
    if (r.width < 44 || r.height < 44) {
      // A smaller visual is fine when an ancestor (card, label, row) is the real target.
      if (el.closest('[data-card], [data-qcard], label') && el.tagName !== 'BUTTON') return;
      // Carousel dots: 24 × 44 meets WCAG 2.5.8 and keeps 15 dots on one phone row.
      if (el.matches('.b-dot') && r.width >= 24 && r.height >= 44) return;
      out.push({ type: 'tap', level: 'warn', what: name(el) + ' ' + Math.round(r.width) + '×' + Math.round(r.height) });
    }
  });
  // text size
  const seen = new Set();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.textContent.trim()) continue;
    const el = n.parentElement;
    if (!el || seen.has(el) || !vis(el) || el.closest('[hidden], script, style, s, del, .b-sr, .visually-hidden')) continue;
    seen.add(el);
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs < 12) out.push({ type: 'text', level: 'warn', what: name(el) + ' ' + fs + 'px' });
  }
  // inputs
  document.querySelectorAll('input:not([type=hidden]):not([type=radio]):not([type=checkbox]):not([type=submit]), select, textarea').forEach((el) => {
    if (!vis(el)) return;
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs < 16) out.push({ type: 'input', level: 'error', what: name(el) + ' ' + fs + 'px' });
  });
  // images
  document.querySelectorAll('img').forEach((img) => {
    if (!vis(img)) return;
    const s = getComputedStyle(img);
    const sized = (img.getAttribute('width') && img.getAttribute('height')) || (s.aspectRatio && s.aspectRatio !== 'auto') ||
      (s.height !== 'auto' && !/%$/.test(img.style.height || '') && img.closest('[style*="aspect-ratio"], .b-card__img, .b-thumb'));
    const parentFixed = (() => { const p = img.parentElement; const ps = p && getComputedStyle(p); return ps && ps.aspectRatio && ps.aspectRatio !== 'auto'; })();
    if (!sized && !parentFixed && !img.complete) out.push({ type: 'cls-img', level: 'warn', what: name(img) + ' ' + (img.currentSrc || img.src).split('/').pop() });
    const shown = img.getBoundingClientRect().width;
    if (img.naturalWidth && shown && img.naturalWidth > shown * 3 * 2.5 && img.naturalWidth > 1200) {
      out.push({ type: 'heavy-img', level: 'warn', what: (img.currentSrc || img.src).split('/').pop() + ' ' + img.naturalWidth + 'px shown at ' + Math.round(shown) + 'px' });
    }
  });
  return out;
}

async function perf(page) {
  return page.evaluate(() => new Promise((res) => {
    let lcp = 0, lcpEl = null, cls = 0;
    try {
      new PerformanceObserver((l) => { const e = l.getEntries().pop(); if (e) { lcp = e.startTime; lcpEl = e.element; } }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver((l) => { l.getEntries().forEach((e) => { if (!e.hadRecentInput) cls += e.value; }); }).observe({ type: 'layout-shift', buffered: true });
    } catch (e) { /* old engine */ }
    setTimeout(() => {
      const r = performance.getEntriesByType('resource');
      const sum = (f) => r.filter(f).reduce((s, x) => s + (x.transferSize || x.encodedBodySize || 0), 0);
      const nav = performance.getEntriesByType('navigation')[0] || {};
      const blocking = Array.from(document.querySelectorAll('head script[src]:not([async]):not([defer]):not([type=module])')).map((s) => s.src.split('/').pop());
      res({
        lcp: Math.round(lcp), cls: +cls.toFixed(3),
        lcpLazy: !!(lcpEl && lcpEl.tagName === 'IMG' && lcpEl.loading === 'lazy'),
        lcpEl: lcpEl ? lcpEl.tagName.toLowerCase() + (lcpEl.className ? '.' + String(lcpEl.className).split(' ')[0] : '') : '',
        js: sum((x) => x.initiatorType === 'script' || /\.js(\?|$)/.test(x.name)),
        css: sum((x) => /\.css(\?|$)/.test(x.name) || x.initiatorType === 'link' && /css/.test(x.name)),
        total: sum(() => true) + (nav.transferSize || nav.encodedBodySize || 0),
        requests: r.length + 1, blocking,
      });
    }, 1500);
  }));
}

(async () => {
  const browser = await chromium.launch();
  const report = [];
  let errors = 0;
  for (const W of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width: W, height: Math.round(W * 2.16) }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
    for (const p of PAGES) {
      const page = await ctx.newPage();
      const jsErrors = [];
      page.on('pageerror', (e) => jsErrors.push(e.message));
      await page.goto(BASE + p, { waitUntil: 'load' });
      const pf = await perf(page);
      // Scroll through once so lazy content and reveal animations settle, then audit the full page.
      await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } window.scrollTo(0, 0); });
      await page.waitForTimeout(400);
      const items = await page.evaluate(inPage);
      // Popovers built on <details> (review filters, facets): open each one and check it fits the screen.
      for (const d of await page.$$('details:not(.b-faq__item):not(.b-acc):visible')) {
        const bad = await d.evaluate((el) => {
          el.open = true;
          const W = window.innerWidth, out = [];
          el.querySelectorAll('*').forEach((c) => {
            const r = c.getBoundingClientRect();
            if (r.width && r.right > -500 && (r.right > W + 1 || r.left < -1)) out.push(c.tagName.toLowerCase() + '.' + String(c.className).split(' ')[0] + ' ' + Math.round(r.left) + '…' + Math.round(r.right));
          });
          el.open = false;
          return out.slice(0, 3);
        });
        bad.forEach((b) => items.push({ type: 'overflow', level: 'error', what: 'open popover: ' + b }));
      }
      if (pf.lcp > BUDGET.lcp) items.push({ type: 'perf', level: 'error', what: 'LCP ' + pf.lcp + 'ms (' + pf.lcpEl + ')' });
      if (pf.cls > BUDGET.cls) items.push({ type: 'perf', level: 'error', what: 'CLS ' + pf.cls });
      if (pf.lcpLazy) items.push({ type: 'lcp-lazy', level: 'warn', what: 'LCP image is lazy-loaded (' + pf.lcpEl + ')' });
      if (pf.js > BUDGET.js) items.push({ type: 'perf', level: 'warn', what: 'JS ' + Math.round(pf.js / 1024) + ' KB' });
      if (pf.css > BUDGET.css) items.push({ type: 'perf', level: 'warn', what: 'CSS ' + Math.round(pf.css / 1024) + ' KB' });
      if (pf.total > BUDGET.total) items.push({ type: 'perf', level: 'warn', what: 'page weight ' + Math.round(pf.total / 1024) + ' KB' });
      if (pf.blocking.length) items.push({ type: 'perf', level: 'warn', what: 'render-blocking scripts: ' + pf.blocking.join(', ') });
      jsErrors.forEach((m) => items.push({ type: 'js', level: 'error', what: m }));
      // Drawers / popups must fit the phone screen.
      for (const [open, panel] of [['[data-menu-open]', '[data-menu-drawer]'], ['[data-search-open]', '[data-search]'], ['[data-cart-open]', '[data-cart-drawer] .b-drawer__panel']]) {
        const btn = await page.$(open + ':visible');
        if (!btn) continue;
        await btn.click().catch(() => {});
        await page.waitForTimeout(450);
        const fit = await page.evaluate((sel) => {
          const el = document.querySelector(sel);
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return { w: Math.round(r.width), right: Math.round(r.right), left: Math.round(r.left), sw: document.scrollingElement.scrollWidth };
        }, panel);
        if (fit && (fit.right > W + 1 || fit.left < -1 || fit.sw > W + 1)) items.push({ type: 'overflow', level: 'error', what: panel + ' open: ' + fit.left + '…' + fit.right + ' (page ' + fit.sw + 'px)' });
        await page.keyboard.press('Escape');
        await page.waitForTimeout(350);
      }
      if (SHOTS) {
        fs.mkdirSync(SHOTS, { recursive: true });
        const f = path.join(SHOTS, (p.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'home') + '-' + W + '.png');
        await page.screenshot({ path: f, fullPage: true });
      }
      const dedup = [];
      const keys = new Set();
      items.forEach((i) => { const k = i.type + i.what; if (!keys.has(k)) { keys.add(k); dedup.push(i); } });
      report.push({ page: p, width: W, perf: pf, items: dedup });
      const errs = dedup.filter((i) => i.level === 'error');
      errors += errs.length;
      console.log('\n' + p + ' @' + W + 'px  LCP ' + pf.lcp + 'ms  CLS ' + pf.cls + '  JS ' + Math.round(pf.js / 1024) + 'KB  CSS ' + Math.round(pf.css / 1024) + 'KB  total ' + Math.round(pf.total / 1024) + 'KB  ' + pf.requests + ' req');
      dedup.slice(0, 40).forEach((i) => console.log('  ' + (i.level === 'error' ? 'ERR ' : 'warn') + ' ' + i.type.padEnd(9) + ' ' + i.what));
      if (dedup.length > 40) console.log('  … ' + (dedup.length - 40) + ' more');
      await page.close();
    }
    await ctx.close();
  }
  await browser.close();
  if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify(report, null, 2));
  console.log('\n' + errors + ' error(s), ' + report.reduce((s, r) => s + r.items.filter((i) => i.level === 'warn').length, 0) + ' warning(s)');
  process.exit(errors ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
