#!/usr/bin/env node
/*
 * Downloads ONE page of a store (the page of the link, never another one) with everything it shows: the desktop and
 * phone DOM after its scripts ran, CSS, JS, fonts and every image and video, plus full-page screenshots of the LIVE
 * page. Then checks the offline copy (no request leaves it, nothing is missing, how close it looks) and runs
 * capture.js on it, so a theme can be rebuilt and compared without touching the live store again.
 *
 *   node tools/download-page.js <url> <theme-dir> [--name product] [--keep-popups] [--no-capture] [--refresh]
 *
 *   --name        page name; default from the URL: home, product, collection, search, contact, tracking, policy, page.
 *                 A second product template: --name product-<x> (→ templates/product.<x>.json)
 *   --refresh     download an existing page name again (otherwise a name already in manifest.json is an error)
 *   --keep-popups keep newsletter / cookie pop-ups      --no-capture  skip capture.js
 *
 * Writes <theme-dir>/_work/site/ (never packed; untrusted data, only ever opened in the browser):
 *   manifest.json     pages (name, url, title, counts, blocked viewports, offline check) and skipped files
 *   assets.json       original URL → { file, contentType, bytes, pages, area: header|main|footer, rendered: { w, h } }
 *   pages/<name>/     index.html (desktop DOM), mobile.html (390, iPhone), desktop.png / mobile.png (the LIVE page)
 *   _m/<host>/<path>  every downloaded file, shared by all pages
 * and <theme-dir>/_work/capture/<name>/ (capture.js on the offline copy; product pages with --no-images).
 * The offline HTML has no page scripts and no on* attributes: only a stub that defines the page's custom elements.
 * Exit codes: 0 done, 1 usage / name taken / error, 2 the page is behind a bot check.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const { pipeline } = require('stream/promises');
const { spawn } = require('child_process');
const { chromium } = require('playwright');
const { PNG } = require('pngjs');
const pixelmatch = require('pixelmatch');
const M = require('./lib/mirror');
const { UA, UA_M, settle, clearPopups, injectMirror } = require('./lib/page');
const siteServer = require('./site-server');

const args = process.argv.slice(2);
const pos = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1] === '--name'));
const [url, themeDir] = pos;
const opt = (k, d) => (args.includes('--' + k) ? args[args.indexOf('--' + k) + 1] : d);
const flag = (k) => args.includes('--' + k);
if (!url || !themeDir || !/^https?:\/\//i.test(url)) {
  console.error('usage: node tools/download-page.js <url> <theme-dir> [--name product] [--keep-popups] [--no-capture] [--refresh]');
  process.exit(1);
}
const name = opt('name', M.pageName(url));
if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) { console.error('--name must be lower-case letters, digits and "-": ' + name); process.exit(1); }

const SITE = path.resolve(themeDir, '_work', 'site');
const PAGE_DIR = path.join(SITE, 'pages', name);
const MAX_DIFF = 5; // % of pixels the offline copy may differ from the live page
const VIEWPORTS = [
  { label: 'desktop', width: 1440, height: 900, ua: UA, mobile: false, html: 'index.html' },
  { label: 'mobile', width: 390, height: 844, ua: UA_M, mobile: true, html: 'mobile.html' },
];

const readJson = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return d; } };
const writeJson = (f, o) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(o, null, 2) + '\n'); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const mb = (n) => (n / 1048576).toFixed(1) + ' MB';

const manifest = readJson(path.join(SITE, 'manifest.json'), { pages: [], skipped: [] });
const assets = readJson(path.join(SITE, 'assets.json'), {});
const taken = (manifest.pages || []).find((p) => p.name === name);
if (taken && !flag('refresh')) {
  console.error('Page "' + name + '" is already downloaded (' + taken.url + '). Use --refresh to download it again, or --name <other>.');
  process.exit(1);
}
for (const a of Object.values(assets)) a.pages = (a.pages || []).filter((p) => p !== name);

// ---------------------------------------------------------------------------------------------------------------
// Files: everything this run saves goes through note(), so assets.json knows its type, size and page.

const savedNow = new Map(); // original URL → assets.json record, for files written by this run
const failed = new Set();
const partial = new Set(); // media the browser only fetched in ranges (206): downloaded whole afterwards
const skipped = [];
const skip = (u, reason) => { if (!skipped.some((s) => s.url === u)) skipped.push({ url: u, page: name, reason }); };

function typeOf(header, file) {
  const t = String(header || '').split(';')[0].trim().toLowerCase();
  if (t && !/octet-stream|binary/.test(t)) return t;
  return siteServer.EXT_TYPES[path.extname(file).toLowerCase()] || t || 'application/octet-stream';
}

function note(u, header, bytes) {
  const file = M.localPath(u);
  const a = Object.assign(assets[u] || {}, { file, contentType: typeOf(header, file), bytes });
  a.pages = Array.from(new Set((a.pages || []).concat(name)));
  assets[u] = a;
  savedNow.set(u, a);
  return a;
}

function writeBuffer(u, buf, header) {
  const f = path.join(SITE, M.localPath(u));
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, buf);
  note(u, header, buf.length);
}

async function download(u) {
  if (M.isStream(u)) { skip(u, 'video stream (not one file)'); return; }
  const f = path.join(SITE, M.localPath(u));
  try {
    const res = await fetch(u, { headers: { 'User-Agent': UA, Referer: url, Accept: '*/*' }, signal: AbortSignal.timeout(15 * 60000) });
    if (!res.ok || !res.body) { failed.add(u); skip(u, 'HTTP ' + res.status); return; }
    fs.mkdirSync(path.dirname(f), { recursive: true });
    await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(f));
    note(u, res.headers.get('content-type'), fs.statSync(f).size);
  } catch (e) {
    failed.add(u);
    fs.rmSync(f, { force: true });
    skip(u, String((e && e.message) || e).slice(0, 120));
  }
}

const isCss = (a) => /css/.test(a.contentType) || /\.css$/i.test(a.file);

// ---------------------------------------------------------------------------------------------------------------
// In the page (window.__mirror = tools/lib/mirror.js).

/** Every image / video / stylesheet / icon the page refers to, with where (header / main / footer) and how big. */
function collectRefs() {
  const Mi = window.__mirror;
  const base = location.href;
  const out = { urls: [], media: {}, streams: [] };
  const seen = new Set();
  const headerSel = 'header, [role="banner"], [id*="header" i], [id*="announcement" i]';
  const footerSel = 'footer, [role="contentinfo"], [id*="footer" i]';
  // closest() that climbs out of shadow roots (widgets) to their host.
  const closestDeep = (el, sel) => { for (let e = el; e; e = e.parentElement || (e.getRootNode && e.getRootNode().host) || null) if (e.matches && e.matches(sel)) return e; return null; };
  const areaOf = (el) => (closestDeep(el, headerSel) ? 'header' : closestDeep(el, footerSel) ? 'footer' : 'main');
  const roots = [document];
  for (let i = 0; i < roots.length; i++) roots[i].querySelectorAll('*').forEach((el) => { if (el.shadowRoot) roots.push(el.shadowRoot); });
  const all = (sel) => roots.flatMap((r) => Array.from(r.querySelectorAll(sel)));
  const add = (u, el) => {
    if (!u) return;
    if (/^blob:/i.test(String(u))) { out.streams.push(String(u)); return; }
    const a = Mi.absUrl(u, base);
    if (!a) return;
    if (Mi.isStream(a)) { out.streams.push(a); return; }
    if (!seen.has(a)) { seen.add(a); out.urls.push(a); }
    if (!el) return;
    const r = el.getBoundingClientRect();
    const area = areaOf(el);
    const m = out.media[a] || (out.media[a] = { area, w: 0, h: 0 });
    if (area === 'main') m.area = 'main';
    m.w = Math.max(m.w, Math.round(r.width));
    m.h = Math.max(m.h, Math.round(r.height));
  };
  all('img, picture source, video source, audio source, video, input[type="image" i]').forEach((el) => {
    const host = el.tagName === 'SOURCE' ? (el.parentElement || el) : el;
    add(el.currentSrc, host);
    for (const at of ['src', 'data-src', 'data-original', 'data-lazy', 'data-lazy-src']) add(el.getAttribute(at), host);
    for (const at of ['srcset', 'data-srcset']) { const s = el.getAttribute(at); if (s) add(Mi.largestCandidate(s, base), host); }
    if (el.tagName === 'VIDEO') add(el.getAttribute('poster'), el);
  });
  all('*').filter((el) => el.closest('head') === null).forEach((el) => {
    for (const at of Array.from(el.attributes)) {
      if (!/^data-/.test(at.name) || at.value.length > 2000) continue;
      if (Mi.looksLikeMedia(at.value)) add(at.value, el);
      else if (/(srcset|bgset)$/.test(at.name)) add(Mi.largestCandidate(at.value, base), el);
    }
    const bg = getComputedStyle(el).backgroundImage;
    if (bg && bg !== 'none') for (const m of bg.matchAll(/url\("?([^")]+)"?\)/g)) add(m[1], el);
    const st = el.getAttribute('style');
    if (st && /url\(/i.test(st)) Mi.rewriteCss(st, base).urls.forEach((u) => add(u, el));
  });
  all('image, use').forEach((el) => {
    const h = el.getAttribute('href') || el.getAttribute('xlink:href');
    if (h && !h.startsWith('#')) add(h.split('#')[0], el);
  });
  all('link[href]').forEach((l) => {
    const rel = (l.getAttribute('rel') || '').toLowerCase();
    if (/(^|\s)(stylesheet|icon|apple-touch-icon|mask-icon)(\s|$)/.test(rel) || (/preload/.test(rel) && /^(style|font|image)$/i.test(l.getAttribute('as') || ''))) add(l.href);
  });
  return out;
}

/** The DOM as it is now, on an inert copy (a document without a window loads nothing), pointed at /_m/…. */
function snapshot() {
  const Mi = window.__mirror;
  const base = location.href;
  const urls = [];
  const embeds = [];
  const loc = (u) => {
    if (u == null || Mi.isLocal(u)) return null;
    const a = Mi.absUrl(u, base);
    if (!a || Mi.isStream(a)) return null;
    urls.push(a);
    return Mi.localUrl(a);
  };
  const css = (text) => { const r = Mi.rewriteCss(text, base); urls.push(...r.urls); return r.css; };
  const rulesOf = (sheet) => { try { return Array.from(sheet.cssRules).map((r) => r.cssText).join('\n'); } catch (e) { return null; } };
  // The document and every open shadow root under it (app widgets often render into shadow DOM).
  const rootsOf = (start) => {
    const out = [start];
    for (let i = 0; i < out.length; i++) out[i].querySelectorAll('*').forEach((el) => { if (el.shadowRoot) out.push(el.shadowRoot); });
    return out;
  };
  const attrs = (el) => Array.from(el.attributes).map((a) => ' ' + a.name + '="' + a.value.replace(/&/g, '&amp;').replace(/"/g, '&quot;') + '"').join('');

  // The live page is thrown away after this, so it may be changed (nothing here loads anything):
  // rules added through the CSSOM (insertRule, CSS-in-JS) and adopted sheets go into the markup, and the candidate
  // the browser picked from each srcset is marked so it stays next to the largest one.
  const liveRoots = rootsOf(document);
  for (const root of liveRoots) {
    root.querySelectorAll('style').forEach((s) => { const t = s.sheet && rulesOf(s.sheet); if (t) s.textContent = t; });
    const adopted = (root.adoptedStyleSheets || []).map(rulesOf).filter(Boolean).join('\n');
    if (adopted) {
      const st = document.createElement('style');
      st.setAttribute('data-mirror-adopted', '');
      st.textContent = adopted;
      (root === document ? document.body || document.documentElement : root).appendChild(st);
    }
    root.querySelectorAll('img').forEach((img) => { if (img.currentSrc) img.setAttribute('data-mirror-current', img.currentSrc); });
  }
  // Scripts can build trees the HTML parser cannot rebuild (a <div> inside a <p>, an <a> inside an <a>): the copy
  // would be re-parsed into another layout. The inner element becomes a <span> with the same attributes and its
  // computed display, so the copy keeps the layout.
  const P_CLOSERS = 'address, article, aside, blockquote, center, details, dialog, dir, div, dl, fieldset, figcaption, figure, footer, ' +
    'form, h1, h2, h3, h4, h5, h6, header, hgroup, hr, listing, main, menu, nav, ol, p, pre, search, section, summary, table, ul, xmp';
  const toSpan = (el) => {
    if (el.shadowRoot || !el.parentNode) return;
    const display = getComputedStyle(el).display;
    const s = document.createElement('span');
    for (const a of Array.from(el.attributes)) s.setAttribute(a.name, a.value);
    s.setAttribute('data-mirror-tag', el.tagName.toLowerCase());
    s.style.setProperty('display', display);
    while (el.firstChild) s.appendChild(el.firstChild);
    el.replaceWith(s);
  };
  for (const root of liveRoots) {
    root.querySelectorAll('p').forEach((p) => p.querySelectorAll(P_CLOSERS).forEach(toSpan));
    root.querySelectorAll('a a, form form').forEach(toSpan);
  }
  // An inert copy (a document without a window loads and runs nothing), shadow roots kept as declarative shadow DOM.
  const deep = typeof document.documentElement.getHTML === 'function' && typeof Document.parseHTMLUnsafe === 'function';
  let doc;
  if (deep) {
    const inner = document.documentElement.getHTML({ shadowRoots: liveRoots.slice(1) });
    doc = Document.parseHTMLUnsafe('<!DOCTYPE html><html' + attrs(document.documentElement) + '>' + inner + '</html>');
  } else {
    doc = document.implementation.createHTMLDocument('');
    doc.replaceChild(doc.importNode(document.documentElement, true), doc.documentElement);
  }
  const roots = deep ? rootsOf(doc) : [doc];
  const qsa = (sel) => roots.flatMap((r) => Array.from(r.querySelectorAll(sel)));

  qsa('style').forEach((s) => { s.textContent = css(s.textContent); });
  qsa('script').forEach((s) => { if (!/json/i.test(s.getAttribute('type') || '')) s.remove(); });
  qsa('noscript, base, meta[http-equiv="refresh" i], meta[http-equiv="content-security-policy" i]').forEach((e) => e.remove());
  qsa('link').forEach((l) => {
    const rel = (l.getAttribute('rel') || '').toLowerCase();
    if (/(^|\s)(modulepreload|prefetch|prerender|preconnect|dns-prefetch|manifest)(\s|$)/.test(rel) ||
      (/preload/.test(rel) && !/^(style|font|image)$/i.test(l.getAttribute('as') || ''))) { l.remove(); return; }
    l.removeAttribute('integrity'); // the rewritten CSS no longer matches the original hash
    const keepLocal = /(^|\s)(stylesheet|icon|apple-touch-icon|mask-icon|preload)(\s|$)/.test(rel);
    const v = l.getAttribute('href');
    if (keepLocal) { const x = loc(v); if (x) l.setAttribute('href', x); } else { const a = Mi.absUrl(v, base); if (a) l.setAttribute('href', a); }
  });
  qsa('*').forEach((el) => { for (const a of Array.from(el.attributes)) if (/^on/i.test(a.name)) el.removeAttribute(a.name); });
  qsa('iframe, frame, embed, object').forEach((f) => {
    const at = f.tagName === 'OBJECT' ? 'data' : 'src';
    const a = Mi.absUrl(f.getAttribute(at), base);
    if (a) { embeds.push(a); f.setAttribute('data-orig-src', a); }
    f.removeAttribute('srcdoc');
    f.setAttribute(at, 'about:blank');
  });
  qsa('img, source, video, audio, track, input[type="image" i]').forEach((el) => {
    for (const at of ['src', 'poster', 'data-src', 'data-original', 'data-lazy', 'data-lazy-src']) {
      const x = loc(el.getAttribute(at));
      if (x) el.setAttribute(at, x);
    }
    const img = el.tagName === 'IMG' ? el : (el.parentElement && el.parentElement.querySelector('img'));
    const current = img ? img.getAttribute('data-mirror-current') : null;
    for (const at of ['srcset', 'data-srcset']) {
      const v = el.getAttribute(at);
      if (!v) continue;
      const keep = [Mi.largestCandidate(v, base), Mi.absUrl(current, base)].filter(Boolean);
      const out = Mi.rewriteSrcset(v, base, keep);
      Mi.parseSrcset(v).map((c) => Mi.absUrl(c.url, base)).filter((u) => u && out.indexOf(Mi.localUrl(u)) > -1).forEach((u) => urls.push(u));
      el.setAttribute(at, out);
    }
  });
  qsa('[data-mirror-current]').forEach((e) => e.removeAttribute('data-mirror-current'));
  qsa('[style]').forEach((el) => el.setAttribute('style', css(el.getAttribute('style'))));
  qsa('image, use').forEach((el) => {
    for (const at of ['href', 'xlink:href']) {
      const v = el.getAttribute(at);
      if (!v || v.startsWith('#')) continue;
      const i = v.indexOf('#');
      const x = loc(i > -1 ? v.slice(0, i) : v);
      if (x) el.setAttribute(at, x + (i > -1 ? v.slice(i) : ''));
    }
  });
  qsa('a[href], area[href], form[action]').forEach((el) => {
    const at = el.tagName === 'FORM' ? 'action' : 'href';
    const a = Mi.absUrl(el.getAttribute(at), base);
    if (a) el.setAttribute(at, a);
  });
  const meta = doc.createElement('meta');
  meta.setAttribute('name', 'mirror-source');
  meta.setAttribute('content', base);
  doc.head.insertBefore(meta, doc.head.firstChild);
  const dt = document.doctype ? new XMLSerializer().serializeToString(document.doctype) + '\n' : '';
  const html = deep
    ? '<html' + attrs(doc.documentElement) + '>' + doc.documentElement.getHTML({ shadowRoots: roots.slice(1) }) + '</html>'
    : doc.documentElement.outerHTML;
  return { html: dt + html, urls: Array.from(new Set(urls)), embeds: Array.from(new Set(embeds)), shadowRoots: roots.length - 1 };
}

// Custom elements stay undefined without the page's scripts, and CSS often hides `x-y:not(:defined)`.
function withElementStubs(html) {
  const names = Array.from(new Set(Array.from(html.matchAll(/<([a-z][a-z0-9]*-[a-z0-9._-]*)[\s>/]/g)).map((m) => m[1])));
  if (!names.length) return html;
  const stub = '<script data-mirror-stub>' + JSON.stringify(names) +
    '.forEach(function (n) { try { if (!customElements.get(n)) customElements.define(n, class extends HTMLElement {}); } catch (e) {} });</script>';
  return html.replace(/<\/head>/i, () => stub + '</head>');
}

// ---------------------------------------------------------------------------------------------------------------
// Passes.

async function livePass(browser, vp) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, userAgent: vp.ua, deviceScaleFactor: 1,
    isMobile: vp.mobile, hasTouch: vp.mobile });
  const page = await ctx.newPage();
  const pending = [];
  page.on('response', (res) => {
    const req = res.request();
    const u = req.url();
    if (!/^https?:/i.test(u)) return;
    try {
      if (!['stylesheet', 'script', 'font', 'image', 'media'].includes(req.resourceType())) return;
      if (req.frame() !== page.mainFrame()) return; // embedded frames are not copied
    } catch (e) { return; }
    if (res.status() === 206) { partial.add(u); return; }
    if (res.status() !== 200 || savedNow.has(u)) return;
    pending.push(res.body().then((buf) => { if (!savedNow.has(u)) writeBuffer(u, buf, res.headers()['content-type']); }).catch(() => partial.add(u)));
  });
  try {
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForLoadState('load', { timeout: 30000 }).catch(() => {});
    const status = resp ? resp.status() : 0;
    const title = await page.title().catch(() => '');
    const text = await page.evaluate(() => (document.body ? document.body.innerText : '').slice(0, 3000)).catch(() => '');
    if (M.isBlocked({ status, title, text })) return { blocked: true, status, title };
    await clearPopups(page, flag('keep-popups'));
    await settle(page);
    await clearPopups(page, flag('keep-popups'));
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    await page.screenshot({ path: path.join(PAGE_DIR, vp.label + '.png'), fullPage: true, animations: 'disabled' });
    await injectMirror(page);
    const refs = await page.evaluate(collectRefs);
    const snap = await page.evaluate(snapshot);
    for (let n = 0; n !== pending.length;) { n = pending.length; await Promise.allSettled(pending.slice()); }
    return { blocked: false, status, title, finalUrl: page.url(), refs, snap };
  } finally {
    await ctx.close();
  }
}

// Downloads what the browser did not load (largest srcset candidates, lazy and hidden images, other breakpoints'
// backgrounds, unused font faces, videos, posters), then rewrites every CSS file and follows its url() / @import.
async function complete(wanted) {
  const queue = Array.from(wanted);
  const cssDone = new Set();
  for (;;) {
    const todo = queue.splice(0).filter((u) => !savedNow.has(u) && !failed.has(u));
    if (todo.length) console.log('downloading ' + todo.length + ' more file(s)…');
    for (const u of todo) if (!savedNow.has(u)) await download(u);
    const css = Array.from(savedNow.entries()).filter(([u, a]) => !cssDone.has(u) && isCss(a));
    if (!css.length && !queue.length) break;
    for (const [u, a] of css) {
      cssDone.add(u);
      const f = path.join(SITE, a.file);
      const r = M.rewriteCss(fs.readFileSync(f, 'utf8'), u);
      fs.writeFileSync(f, r.css);
      a.bytes = Buffer.byteLength(r.css);
      queue.push(...r.urls);
    }
  }
}

function comparePng(bufA, bufB) {
  const A = PNG.sync.read(bufA);
  const B = PNG.sync.read(bufB);
  const w = Math.min(A.width, B.width);
  const h = Math.min(A.height, B.height);
  const crop = (img) => {
    if (img.width === w && img.height === h) return img.data;
    const out = Buffer.alloc(w * h * 4);
    for (let y = 0; y < h; y++) img.data.copy(out, y * w * 4, y * img.width * 4, y * img.width * 4 + w * 4);
    return out;
  };
  const n = pixelmatch(crop(A), crop(B), null, w, h, { threshold: 0.1 });
  const H = Math.max(A.height, B.height);
  // Rows one page has and the other has not count as different.
  return { percent: Math.round(((n + (H - h) * w) / (H * w)) * 10000) / 100, height: { live: A.height, offline: B.height } };
}

async function offlineCheck(browser, srv) {
  const check = {};
  for (const vp of VIEWPORTS) {
    const livePng = path.join(PAGE_DIR, vp.label + '.png');
    if (!fs.existsSync(livePng)) continue;
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, userAgent: vp.ua, deviceScaleFactor: 1,
      isMobile: vp.mobile, hasTouch: vp.mobile });
    const page = await ctx.newPage();
    const external = new Set();
    await page.route('**/*', (route) => {
      const u = route.request().url();
      if (u === srv.origin || u.startsWith(srv.origin + '/')) return route.continue();
      external.add(u);
      return route.abort();
    });
    const before = srv.stats.notFound.length;
    try {
      await page.goto(srv.origin + '/' + name, { waitUntil: 'load', timeout: 60000 });
      await settle(page);
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
      const shot = await page.screenshot({ fullPage: true, animations: 'disabled' });
      fs.writeFileSync(path.join(PAGE_DIR, 'offline-' + vp.label + '.png'), shot);
      const diff = comparePng(fs.readFileSync(livePng), shot);
      check[vp.label] = { external: Array.from(external), notFound: srv.stats.notFound.slice(before), diff: diff.percent, height: diff.height };
    } finally {
      await ctx.close();
    }
  }
  return check;
}

function runCapture(origin) {
  const a = [path.join(__dirname, 'capture.js'), origin + '/' + name, themeDir, '--name', name];
  if (/^product(-|$)/.test(name)) a.push('--no-images'); // the originals are in _work/site already
  if (flag('keep-popups')) a.push('--keep-popups');
  console.log('capture.js on the offline copy…');
  return new Promise((resolve) => { spawn(process.execPath, a, { stdio: 'inherit' }).on('close', resolve); });
}

function counts() {
  const c = { images: 0, videos: 0, css: 0, fonts: 0, js: 0, other: 0, bytes: 0 };
  for (const a of savedNow.values()) {
    c.bytes += a.bytes || 0;
    const t = a.contentType || '';
    if (/^image\//.test(t)) c.images++;
    else if (/^video\/|^audio\//.test(t)) c.videos++;
    else if (/css/.test(t)) c.css++;
    else if (/font|woff|ttf|otf/.test(t) || /\.(woff2?|ttf|otf|eot)$/i.test(a.file)) c.fonts++;
    else if (/javascript|ecmascript/.test(t)) c.js++;
    else c.other++;
  }
  return c;
}

(async () => {
  fs.rmSync(PAGE_DIR, { recursive: true, force: true });
  fs.mkdirSync(PAGE_DIR, { recursive: true });
  const browser = await chromium.launch();
  let srv = null;
  try {
    const results = {};
    const blocked = [];
    for (const vp of VIEWPORTS) {
      console.log(vp.label + ' (' + vp.width + '): ' + url);
      let r = await livePass(browser, vp);
      if (r.blocked) {
        console.log(vp.label + ': bot check (' + r.status + ' "' + r.title + '"), one retry');
        await sleep(3000);
        r = await livePass(browser, vp);
      }
      if (r.blocked) { blocked.push(vp.label); continue; }
      results[vp.label] = r;
    }
    if (!Object.keys(results).length) {
      fs.rmSync(PAGE_DIR, { recursive: true, force: true });
      console.error('BLOCKED: ' + url + ' shows a bot check on desktop and phone, even after a retry. It cannot be downloaded:' +
        ' send screenshots of the page instead and build the theme with the new-theme skill.');
      process.exitCode = 2;
      return;
    }

    const wanted = new Set(partial);
    for (const r of Object.values(results)) {
      r.refs.urls.forEach((u) => wanted.add(u));
      r.snap.urls.forEach((u) => wanted.add(u));
      r.refs.streams.forEach((u) => skip(u, 'video stream (not one file)'));
      r.snap.embeds.forEach((u) => skip(u, 'embedded frame (third party, kept as an empty frame)'));
    }
    await complete(wanted);
    for (const r of Object.values(results)) {
      for (const [u, m] of Object.entries(r.refs.media)) {
        const a = assets[u];
        if (!a) continue;
        a.area = a.area === 'main' || m.area === 'main' ? 'main' : (a.area || m.area);
        a.rendered = { w: Math.max((a.rendered && a.rendered.w) || 0, m.w), h: Math.max((a.rendered && a.rendered.h) || 0, m.h) };
      }
    }
    for (const vp of VIEWPORTS) if (results[vp.label]) fs.writeFileSync(path.join(PAGE_DIR, vp.html), withElementStubs(results[vp.label].snap.html));

    const first = results.desktop || results.mobile;
    const entry = { name, url, finalUrl: first.finalUrl, title: first.title, status: first.status, fetchedAt: new Date().toISOString(),
      blocked, counts: counts(), check: null };
    manifest.pages = (manifest.pages || []).filter((p) => p.name !== name).concat(entry);
    manifest.skipped = (manifest.skipped || []).filter((s) => s.page !== name).concat(skipped);
    writeJson(path.join(SITE, 'assets.json'), assets);
    writeJson(path.join(SITE, 'manifest.json'), manifest);

    srv = await siteServer.start({ siteDir: SITE, port: 0, log: false });
    entry.check = await offlineCheck(browser, srv);
    writeJson(path.join(SITE, 'manifest.json'), manifest);

    const c = entry.counts;
    console.log('\n' + name + '  ' + url + '  ' + (blocked.length ? 'partly blocked (' + blocked.join(', ') + ')' : 'ok'));
    console.log('  images ' + c.images + ' · videos ' + c.videos + ' · css ' + c.css + ' · fonts ' + c.fonts + ' · js ' + c.js +
      ' · other ' + c.other + ' · ' + mb(c.bytes));
    for (const [label, k] of Object.entries(entry.check)) {
      console.log('  offline ' + label + ': external ' + k.external.length + ', 404 ' + k.notFound.length + ', differs ' + k.diff +
        ' % (height live ' + k.height.live + ' / offline ' + k.height.offline + ')');
      if (k.diff > MAX_DIFF) console.log('  WARN ' + label + ' differs more than ' + MAX_DIFF + ' %: compare ' + label + '.png with the offline page');
      k.external.slice(0, 5).forEach((u) => console.log('  WARN external request: ' + u));
      k.notFound.slice(0, 5).forEach((p) => console.log('  WARN missing in the copy: ' + p));
    }
    skipped.forEach((s) => console.log('  skipped ' + s.url + ' (' + s.reason + ')'));
    console.log('  → ' + PAGE_DIR);

    if (!flag('no-capture')) {
      const code = await runCapture(srv.origin);
      if (code !== 0) console.log('  WARN capture.js failed (exit ' + code + '); the download is kept');
    }
  } finally {
    if (srv) await srv.close();
    await browser.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
