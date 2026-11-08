#!/usr/bin/env node
/*
 * Captures an original store page so a theme can be rebuilt to match it.
 *
 *   node tools/capture.js <url> <theme-dir> [--name product] [--no-images] [--keep-popups]
 *
 * Writes <theme-dir>/_work/capture/<name>/ (never packed):
 *   desktop.png, mobile.png      full-page screenshots at 1440 and 390 wide
 *   page.html                    the rendered DOM
 *   tokens.json                  measured styles: fonts, body / headings / buttons / header / topbar / footer,
 *                                colour palette weighted by area, Google Fonts links
 *   sections.json                the page cut into top-level sections (position, size, headings, text, images)
 *   sections/NN-desktop.png      one crop per section (and NN-mobile.png)
 *   images/                      the page's images (with images.json mapping original URL → file)
 *   text.txt                     every text of the phone page per section, with structure (headings, list items,
 *                                bold, links, hidden accordion / tab answers): copy the original's texts from here
 *   fonts.json, fonts/           the self-hosted @font-face files the page really loads (family, weight, style, url)
 *                                and the files themselves, ready to copy into assets/fonts/
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const args = process.argv.slice(2);
const pos = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && ['--name'].includes(args[i - 1])));
const [url, themeDir] = pos;
const opt = (k, d) => (args.includes('--' + k) ? args[args.indexOf('--' + k) + 1] : d);
if (!url || !themeDir) { console.error('usage: node tools/capture.js <url> <theme-dir> [--name product]'); process.exit(1); }
const OUT = path.resolve(themeDir, '_work', 'capture', opt('name', 'page'));
fs.mkdirSync(path.join(OUT, 'sections'), { recursive: true });

const lib = require('./lib/page');
const { UA, UA_M, settle } = lib;
const clearPopups = (page) => lib.clearPopups(page, args.includes('--keep-popups'));

function measure() {
  const rgbToHex = (c) => {
    const m = String(c).match(/rgba?\(([^)]+)\)/);
    if (!m) return c;
    const p = m[1].split(',').map((x) => parseFloat(x));
    if (p.length === 4 && p[3] === 0) return 'transparent';
    return '#' + p.slice(0, 3).map((n) => Math.round(n).toString(16).padStart(2, '0')).join('');
  };
  const style = (el, extra) => {
    if (!el) return null;
    const s = getComputedStyle(el), r = el.getBoundingClientRect();
    const o = { tag: el.tagName.toLowerCase(), cls: String(el.className || '').slice(0, 80), text: (typeof el.innerText === 'string' ? el.innerText : '').trim().slice(0, 60),
      fontFamily: s.fontFamily, fontSize: s.fontSize, fontWeight: s.fontWeight, lineHeight: s.lineHeight, letterSpacing: s.letterSpacing,
      textTransform: s.textTransform, color: rgbToHex(s.color), background: rgbToHex(s.backgroundColor), width: Math.round(r.width), height: Math.round(r.height) };
    (extra || []).forEach((k) => { o[k] = /color/i.test(k) ? rgbToHex(s[k]) : s[k]; });
    return o;
  };
  const visible = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
  const first = (sel, test) => Array.from(document.querySelectorAll(sel)).filter(visible).find(test || (() => true));

  const header = first('header, [role="banner"], [class*="header" i]', (el) => el.getBoundingClientRect().top < 250 && el.getBoundingClientRect().width > innerWidth * 0.8);
  const headerTop = header ? header.getBoundingClientRect().top : 0;
  const topbar = first('[class*="announcement" i], [class*="topbar" i], [class*="top-bar" i], [id*="announcement" i]', (el) => el.getBoundingClientRect().top <= headerTop + 5 && el.getBoundingClientRect().height < 90);
  const btnRe = /add to (cart|bag)|buy (it )?now|shop now|check ?out|order now|get (yours|it)/i;
  const buttons = Array.from(document.querySelectorAll('button, a, input[type="submit"]')).filter(visible).filter((b) => btnRe.test(b.innerText || b.value || '')).slice(0, 4);
  const footer = first('footer, [class*="footer" i]', (el) => el.getBoundingClientRect().top > innerHeight * 0.5);

  // Colour palette weighted by painted area.
  const bg = {}, fg = {};
  Array.from(document.querySelectorAll('body *')).forEach((el) => {
    if (!visible(el)) return;
    const s = getComputedStyle(el), r = el.getBoundingClientRect(), area = Math.min(r.width * r.height, innerWidth * 1200);
    const b = rgbToHex(s.backgroundColor);
    if (b !== 'transparent') bg[b] = (bg[b] || 0) + area;
    const txt = typeof el.innerText === 'string' ? el.innerText.trim() : '';
    if (el.childNodes[0] && el.childNodes[0].nodeType === 3 && txt) { const c = rgbToHex(s.color); fg[c] = (fg[c] || 0) + txt.length; }
  });
  const top = (o, n) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n).map((e) => e[0]);

  const fonts = new Set();
  Array.from(document.querySelectorAll('body *')).slice(0, 4000).forEach((el) => fonts.add(getComputedStyle(el).fontFamily));
  const googleFonts = Array.from(document.querySelectorAll('link[href*="fonts.googleapis"]')).map((l) => l.href);
  const fontFaces = [];
  for (const sheet of Array.from(document.styleSheets)) {
    try { for (const r of Array.from(sheet.cssRules)) if (r.type === 5) fontFaces.push(r.style.getPropertyValue('font-family') + ' ' + r.style.getPropertyValue('font-weight') + ' ' + (r.style.getPropertyValue('src').match(/url\(([^)]+)\)/) || [])[1]); } catch (e) { /* cross-origin */ }
  }

  return {
    url: location.href,
    title: document.title,
    viewport: { width: innerWidth, height: innerHeight },
    pageHeight: document.body.scrollHeight,
    body: style(document.body),
    h1: style(first('h1')),
    h2: style(first('h2')),
    h3: style(first('h3')),
    price: style(first('[class*="price" i]', (el) => /\d/.test(typeof el.innerText === 'string' ? el.innerText : '') && el.children.length < 4)),
    buttons: buttons.map((b) => style(b, ['borderRadius', 'padding', 'borderColor', 'borderWidth', 'boxShadow'])),
    topbar: style(topbar),
    header: style(header, ['position', 'borderBottom', 'boxShadow']),
    footer: style(footer),
    links: style(first('main a, a')),
    inputs: style(first('input[type="email"], input[type="text"], select'), ['borderRadius', 'borderColor', 'padding']),
    palette: { backgrounds: top(bg, 10), text: top(fg, 8) },
    fonts: Array.from(fonts).slice(0, 15),
    googleFonts,
    fontFaces: Array.from(new Set(fontFaces)).slice(0, 30),
  };
}

/** Structured text of the page, per section (Shopify sections or the top-level blocks), hidden parts included. */
function textOf() {
  let secs = Array.from(document.querySelectorAll('.shopify-section'));
  if (secs.length < 2) secs = Array.from((document.querySelector('main') || document.body).children);
  const walk = (n) => {
    let r = '';
    n.childNodes.forEach((k) => {
      if (k.nodeType === 3) { const t = k.textContent.replace(/\s+/g, ' '); if (t.trim()) r += t; return; }
      if (k.nodeType !== 1) return;
      const tag = k.tagName.toLowerCase();
      const inner = walk(k);
      if (!inner.trim() && tag !== 'br') return;
      if (/^h[1-6]$/.test(tag)) r += '\n<' + tag + '>' + inner.trim() + '</' + tag + '>\n';
      else if (tag === 'li') r += '\n- ' + inner.trim();
      else if (/^(p|div|summary|details|section|article|header|footer|tr)$/.test(tag)) r += '\n' + inner.trim() + '\n';
      else if (tag === 'strong' || tag === 'b') r += '**' + inner + '**';
      else if (tag === 'em' || tag === 'i') r += '_' + inner + '_';
      else if (tag === 'a') r += '[' + inner.trim() + '](' + (k.getAttribute('href') || '') + ')';
      else if (tag === 'br') r += '\n';
      else r += inner;
    });
    return r;
  };
  return secs.map((sec) => {
    const c = sec.cloneNode(true);
    c.querySelectorAll('script, style, svg, noscript, template, link, iframe').forEach((e) => e.remove());
    return '######## ' + String(sec.id || sec.className || sec.tagName).slice(0, 80) + '\n' + walk(c).replace(/\n\s*\n+/g, '\n').trim();
  }).join('\n\n') + '\n';
}

/** Self-hosted @font-face rules, marked used when the browser actually loaded that family / weight / style. */
function fontsOf() {
  const loaded = new Set(Array.from(document.fonts).filter((f) => f.status === 'loaded')
    .map((f) => (f.family.replace(/["']/g, '') + '|' + f.weight + '|' + f.style).toLowerCase()));
  const out = [];
  for (const sheet of Array.from(document.styleSheets)) {
    let rules;
    try { rules = Array.from(sheet.cssRules); } catch (e) { continue; }
    for (const r of rules) {
      if (r.type !== 5) continue;
      const family = r.style.getPropertyValue('font-family').replace(/["']/g, '').trim();
      const weight = (r.style.getPropertyValue('font-weight') || '400').trim().replace('normal', '400').replace('bold', '700');
      const style = (r.style.getPropertyValue('font-style') || 'normal').trim();
      const urls = Array.from(r.style.getPropertyValue('src').matchAll(/url\(["']?([^"')]+)["']?\)/g)).map((m) => new URL(m[1], sheet.href || location.href).href);
      const url = urls.find((u) => /\.woff2(\?|$)/.test(u)) || urls.find((u) => /\.woff(\?|$)/.test(u)) || urls[0];
      if (!url || /fonts\.gstatic/.test(url)) continue;
      out.push({ family, weight, style, url, used: weight.split(' ').some((w) => loaded.has((family + '|' + w + '|' + style).toLowerCase())) });
    }
  }
  const seen = new Set();
  return out.filter((f) => !seen.has(f.url) && seen.add(f.url));
}

function sectionsOf() {
  const vw = innerWidth;
  const visible = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.height > 40 && r.width > vw * 0.6 && s.display !== 'none' && s.visibility !== 'hidden'; };
  // Walk down from <body> while a single child holds (almost) all the content, then take the children.
  let root = document.body;
  for (let i = 0; i < 6; i++) {
    const kids = Array.from(root.children).filter(visible);
    const big = kids.filter((k) => k.getBoundingClientRect().height > document.body.scrollHeight * 0.7);
    if (kids.length === 1 || big.length === 1) root = big[0] || kids[0]; else break;
  }
  let list = [];
  Array.from(root.children).filter(visible).forEach((el) => {
    // A <main> (or a wrapper that is mostly the page) is split one level further.
    const tall = el.getBoundingClientRect().height > innerHeight * 2.5;
    const parts = (el.tagName === 'MAIN' || tall) ? Array.from(el.children).filter(visible) : [];
    if (parts.length > 1) list = list.concat(parts); else list.push(el);
  });
  return list.map((el, i) => {
    const r = el.getBoundingClientRect();
    const heading = el.querySelector('h1, h2, h3, [class*="title" i], [class*="heading" i]');
    return {
      index: i,
      top: Math.round(r.top + scrollY),
      height: Math.round(r.height),
      tag: el.tagName.toLowerCase(),
      id: el.id || '',
      cls: String(el.className || '').slice(0, 120),
      heading: heading ? heading.innerText.trim().slice(0, 120) : '',
      text: (typeof el.innerText === 'string' ? el.innerText : '').replace(/\s+/g, ' ').trim().slice(0, 400),
      images: el.querySelectorAll('img').length,
      buttons: Array.from(el.querySelectorAll('button, a.button, a[class*="btn" i]')).map((b) => b.innerText.trim()).filter(Boolean).slice(0, 5),
    };
  });
}

function imagesOf() {
  const urls = new Set();
  const abs = (u) => { try { return new URL(u, location.href).href; } catch (e) { return null; } };
  const largest = (set) => String(set || '').split(',').map((s) => s.trim().split(/\s+/)).sort((a, b) => (parseInt(b[1], 10) || 0) - (parseInt(a[1], 10) || 0))[0];
  document.querySelectorAll('img, source').forEach((img) => {
    [img.currentSrc, img.getAttribute('src'), img.getAttribute('data-src'), (largest(img.getAttribute('srcset') || img.getAttribute('data-srcset')) || [])[0]]
      .forEach((u) => { if (u && !u.startsWith('data:')) { const a = abs(u); if (a) urls.add(a); } });
  });
  document.querySelectorAll('*').forEach((el) => {
    const m = getComputedStyle(el).backgroundImage.match(/url\("?([^")]+)"?\)/);
    if (m && !m[1].startsWith('data:')) urls.add(m[1]);
  });
  document.querySelectorAll('video source, video[src]').forEach((v) => { if (v.src) urls.add(v.src); });
  return Array.from(urls);
}

async function shoot(browser, width, ua, label) {
  const ctx = await browser.newContext({ viewport: { width, height: width < 600 ? 844 : 900 }, userAgent: ua, deviceScaleFactor: 1, isMobile: width < 600, hasTouch: width < 600 });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForLoadState('load', { timeout: 30000 }).catch(() => {});
  await clearPopups(page);
  await settle(page);
  await clearPopups(page);
  await page.screenshot({ path: path.join(OUT, label + '.png'), fullPage: true });
  const sections = await page.evaluate(sectionsOf);
  for (const s of sections) {
    const file = path.join(OUT, 'sections', String(s.index).padStart(2, '0') + '-' + label + '.png');
    if (s.height > 0) await page.screenshot({ path: file, fullPage: true, clip: { x: 0, y: s.top, width, height: Math.min(s.height, 4000) } }).catch(() => {});
  }
  const data = { tokens: await page.evaluate(measure), sections, images: await page.evaluate(imagesOf) };
  if (label === 'desktop') fs.writeFileSync(path.join(OUT, 'page.html'), await page.content());
  if (label === 'mobile') fs.writeFileSync(path.join(OUT, 'text.txt'), await page.evaluate(textOf));
  data.fonts = await page.evaluate(fontsOf);
  await ctx.close();
  return data;
}

(async () => {
  const browser = await chromium.launch();
  const desktop = await shoot(browser, 1440, UA, 'desktop');
  const mobile = await shoot(browser, 390, UA_M, 'mobile');
  fs.writeFileSync(path.join(OUT, 'tokens.json'), JSON.stringify({ desktop: desktop.tokens, mobile: mobile.tokens }, null, 2));
  fs.writeFileSync(path.join(OUT, 'sections.json'), JSON.stringify({ desktop: desktop.sections, mobile: mobile.sections }, null, 2));

  if (!args.includes('--no-images')) {
    const dir = path.join(OUT, 'images');
    fs.mkdirSync(dir, { recursive: true });
    const map = {};
    let n = 0;
    for (const src of Array.from(new Set(desktop.images.concat(mobile.images))).slice(0, 160)) { // phone-only banners too
      try {
        const res = await fetch(src, { headers: { 'User-Agent': UA } });
        if (!res.ok) continue;
        const type = res.headers.get('content-type') || '';
        const ext = (type.match(/image\/(png|jpe?g|webp|gif|svg|avif)/) || type.match(/video\/(mp4|webm)/) || [])[1] || (path.extname(new URL(src).pathname).slice(1) || 'bin');
        const file = String(++n).padStart(3, '0') + '-' + (path.basename(new URL(src).pathname).replace(/\.[a-z0-9]+$/i, '').replace(/[^a-z0-9_-]+/gi, '-').slice(0, 40) || 'img') + '.' + ext.replace('jpeg', 'jpg').replace('svg+xml', 'svg');
        fs.writeFileSync(path.join(dir, file), Buffer.from(await res.arrayBuffer()));
        map[src] = file;
      } catch (e) { /* skip */ }
    }
    fs.writeFileSync(path.join(OUT, 'images.json'), JSON.stringify(map, null, 2));
    console.log('images: ' + Object.keys(map).length + ' downloaded');
  }
  // Fonts: the self-hosted files the page really loaded (desktop or phone), saved under their original names.
  const fonts = {};
  desktop.fonts.concat(mobile.fonts).forEach((f) => { const o = fonts[f.url]; fonts[f.url] = Object.assign({}, f, { used: f.used || !!(o && o.used) }); });
  const used = Object.values(fonts).filter((f) => f.used);
  if (used.length) fs.mkdirSync(path.join(OUT, 'fonts'), { recursive: true });
  for (const f of used) {
    try {
      const res = await fetch(f.url, { headers: { 'User-Agent': UA } });
      if (!res.ok) continue;
      f.file = path.basename(new URL(f.url).pathname).replace(/[^a-z0-9._-]+/gi, '-'); // the original name: two faces may share a weight
      fs.writeFileSync(path.join(OUT, 'fonts', f.file), Buffer.from(await res.arrayBuffer()));
    } catch (e) { /* skip */ }
  }
  fs.writeFileSync(path.join(OUT, 'fonts.json'), JSON.stringify(Object.values(fonts), null, 2));
  console.log('self-hosted fonts used: ' + (used.map((f) => f.family + ' ' + f.weight + ' ' + (f.file || '(not saved)')).join(' · ') || 'none'));
  await browser.close();
  console.log('Captured ' + url + ' → ' + OUT);
  console.log('sections (desktop): ' + desktop.sections.length + ', mobile: ' + mobile.sections.length);
  console.log('fonts: ' + desktop.tokens.fonts.slice(0, 4).join(' | '));
  console.log('buttons: ' + desktop.tokens.buttons.map((b) => b.text + ' ' + b.background + '/' + b.color + ' r' + b.borderRadius).join(' · '));
})().catch((e) => { console.error(e); process.exit(1); });
