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
 *   --refresh     download an existing page name again (otherwise a name already in manifest.json is an error); a
 *                 viewport behind a bot check this time keeps its previous files (manifest "kept")
 *   --keep-popups keep newsletter / cookie pop-ups      --no-capture  skip capture.js
 *
 * Writes <theme-dir>/_work/site/ (never packed; untrusted data, only ever opened in the browser):
 *   manifest.json     pages (name, url, title, counts, blocked viewports, offline check) and skipped files
 *   assets.json       original URL → { file, contentType, bytes, pages, area: header|main|footer, rendered: { w, h } };
 *                     videos also: via (page / template / json / script / link / stream), stream (its .m3u8), poster
 * Videos: every <video> / <source>, the ones inside <template> (deferred media), in JSON / inline scripts and behind
 * links; HLS streams (also those a script plays from a blob:) → Shopify's MP4 of the best rendition, else the master +
 * best media playlist + every segment (reference only). Encrypted / byte-range / DASH streams and third-party frames
 * (YouTube, Vimeo) are listed in skipped. The summary prints one line per video.
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
const netStreams = new Set(); // HLS / DASH playlists seen on the network (also those of media-source players)
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
  // via: where a video was found (page / template / json / script / link); posters: video or stream → its poster.
  const out = { urls: [], media: {}, streams: [], via: {}, posters: {} };
  const seen = new Set();
  const headerSel = 'header, [role="banner"], [id*="header" i], [id*="announcement" i]';
  const footerSel = 'footer, [role="contentinfo"], [id*="footer" i]';
  // Roots: the document, every open shadow root (widgets) and every <template>'s content (deferred media: a video
  // that only exists once someone presses play).
  const roots = [document];
  const tplHost = new Map();
  for (let i = 0; i < roots.length; i++) {
    roots[i].querySelectorAll('*').forEach((el) => {
      if (el.shadowRoot) roots.push(el.shadowRoot);
      if (el.tagName === 'TEMPLATE' && el.content) { roots.push(el.content); tplHost.set(el.content, el); }
    });
  }
  const all = (sel) => roots.flatMap((r) => Array.from(r.querySelectorAll(sel)));
  // closest() that climbs out of shadow roots (to their host) and template contents (to their <template>).
  const up = (e) => { if (e.parentElement) return e.parentElement; const r = e.getRootNode && e.getRootNode(); return (r && (r.host || tplHost.get(r))) || null; };
  const closestDeep = (el, sel) => { for (let e = el; e; e = up(e)) if (e.matches && e.matches(sel)) return e; return null; };
  const areaOf = (el) => (closestDeep(el, headerSel) ? 'header' : closestDeep(el, footerSel) ? 'footer' : 'main');
  const inTemplate = (el) => { for (let e = el; e; e = up(e)) { const r = e.getRootNode && e.getRootNode(); if (r && tplHost.has(r)) return true; } return false; };
  const VIDEO = /\.(mp4|webm|mov|m4v|ogv)(\?|#|$)/i;
  const add = (u, el, via) => {
    if (!u || /^blob:/i.test(String(u))) return; // media-source players: their playlist is caught on the network
    const a = Mi.absUrl(u, base);
    if (!a) return;
    const how = via || (el && inTemplate(el) ? 'template' : 'page');
    if (Mi.isStream(a) || VIDEO.test(a)) { if (!out.via[a] || how === 'page') out.via[a] = how; }
    if (Mi.isStream(a)) { if (out.streams.indexOf(a) < 0) out.streams.push(a); } else if (!seen.has(a)) { seen.add(a); out.urls.push(a); }
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
    const video = el.tagName === 'VIDEO' ? el : el.parentElement && el.parentElement.tagName === 'VIDEO' ? el.parentElement : null;
    const poster = video && Mi.absUrl(video.getAttribute('poster'), base);
    const src = Mi.absUrl(el.getAttribute('src'), base);
    if (poster && src) out.posters[src] = poster;
  });
  // Video URLs written in the page's data and scripts, and links to video files (lightboxes).
  all('script').forEach((s) => {
    if (s.src) return;
    const via = /json/i.test(s.getAttribute('type') || '') ? 'json' : 'script';
    Mi.videoUrlsIn(s.textContent, base).forEach((u) => add(u, null, via));
  });
  all('a[href]').forEach((a) => { const h = a.getAttribute('href'); if (VIDEO.test(h) || Mi.isStream(h)) add(h, a, 'link'); });
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
  // The document and every open shadow root under it (app widgets often render into shadow DOM); with templates,
  // also every <template>'s content (deferred media), so the links inside are rewritten too.
  const rootsOf = (start, templates) => {
    const out = [start];
    for (let i = 0; i < out.length; i++) {
      out[i].querySelectorAll('*').forEach((el) => {
        if (el.shadowRoot) out.push(el.shadowRoot);
        if (templates && el.tagName === 'TEMPLATE' && el.content) out.push(el.content);
      });
    }
    return out;
  };
  const shadowsOf = (list) => list.filter((r) => 'mode' in r && r.host);
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
  const roots = rootsOf(doc, true);
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
    ? '<html' + attrs(doc.documentElement) + '>' + doc.documentElement.getHTML({ shadowRoots: shadowsOf(roots) }) + '</html>'
    : doc.documentElement.outerHTML;
  return { html: dt + html, urls: Array.from(new Set(urls)), embeds: Array.from(new Set(embeds)), shadowRoots: shadowsOf(roots).length };
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
      if (req.frame() !== page.mainFrame()) return; // embedded frames are not copied
      // Stream playlists, whatever fetched them (hls.js uses fetch / xhr and plays from a blob: URL).
      if (M.isStream(u)) { if (res.status() < 400) netStreams.add(u); return; }
      if (!['stylesheet', 'script', 'font', 'image', 'media'].includes(req.resourceType())) return;
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

async function fetchText(u) {
  try {
    const res = await fetch(u, { headers: { 'User-Agent': UA, Referer: url, Accept: '*/*' }, signal: AbortSignal.timeout(60000) });
    return res.ok ? { text: await res.text() } : { error: 'HTTP ' + res.status };
  } catch (e) { return { error: String((e && e.message) || e).slice(0, 120) }; }
}

function writeText(u, text, extra) {
  const f = path.join(SITE, M.localPath(u));
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, text);
  return Object.assign(note(u, 'application/vnd.apple.mpegurl', Buffer.byteLength(text)), extra || {});
}

// A playlist with its links pointed at /_m/… (segments, init map, the one variant kept).
function localM3u8(text, base) {
  return String(text).split(/\r?\n/).map((l) => {
    const t = l.trim();
    if (t && !t.startsWith('#')) { const a = M.absUrl(t, base); return a ? M.localUrl(a) : l; }
    return l.replace(/URI="([^"]+)"/g, (all, v) => { const a = M.absUrl(v, base); return a ? 'URI="' + M.localUrl(a) + '"' : all; });
  }).join('\n');
}

// A master playlist reduced to the variant that was downloaded.
function keepVariant(text, base, best) {
  const lines = String(text).split(/\r?\n/);
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (/^#EXT-X-STREAM-INF:/i.test(t)) {
      let j = i + 1;
      while (j < lines.length && (!lines[j].trim() || lines[j].trim().startsWith('#'))) j++;
      if (j < lines.length && M.absUrl(lines[j].trim(), base) === best) out.push(lines[i], M.localUrl(best));
      i = j;
    } else if (!/^#EXT-X-(MEDIA|I-FRAME-STREAM-INF)/i.test(t)) out.push(lines[i]);
  }
  return out.join('\n');
}

// HLS / DASH playlists → files. Shopify serves every HLS rendition as one MP4 too: the best one is downloaded as a
// video (via "stream"). Other HLS streams keep their master + best media playlist (links made local) and every
// segment, for reference only (not one file). Encrypted, byte-range and DASH streams are skipped with a reason.
async function resolveStreams(list) {
  const playlists = new Map();
  for (const u of list) {
    if (/\.mpd(\?|#|$)/i.test(u)) { skip(u, 'DASH stream (not supported)'); continue; }
    const r = await fetchText(u);
    if (r.error) { skip(u, 'stream: ' + r.error); continue; }
    playlists.set(u, r.text);
  }
  const covered = new Set(); // variant playlists a master in the list already stands for (hls.js fetches both)
  for (const [u, text] of playlists) M.hlsVariants(text, u).forEach((v) => covered.add(v.url));
  const done = [];
  for (const [u, text] of playlists) {
    if (covered.has(u)) continue;
    const variants = M.hlsVariants(text, u);
    const best = variants.length ? variants[0].url : u;
    const mp4 = M.shopifyMp4(best);
    if (mp4) {
      if (!savedNow.has(mp4)) await download(mp4);
      const a = savedNow.get(mp4);
      if (a) {
        a.stream = u;
        writeText(u, text, { via: 'stream', mp4 });
        done.push({ stream: u, mp4, a });
        continue;
      }
    }
    const mediaText = best === u ? text : (await fetchText(best)).text;
    if (!mediaText) { skip(u, 'stream: variant playlist not readable'); continue; }
    const media = M.hlsMedia(mediaText, best);
    if (media.encrypted) { skip(u, 'encrypted stream (EXT-X-KEY)'); continue; }
    if (media.byteRange) { skip(u, 'byte-range stream (not supported)'); continue; }
    if (!media.segments.length) { skip(u, 'stream: no segments'); continue; }
    let bytes = 0;
    let saved = 0;
    for (const s of (media.map ? [media.map] : []).concat(media.segments)) {
      if (!savedNow.has(s)) await download(s);
      const a = savedNow.get(s);
      if (a) { a.segmentOf = u; bytes += a.bytes || 0; saved++; }
    }
    if (best !== u) writeText(best, localM3u8(mediaText, best), { segmentOf: u });
    const rec = writeText(u, best === u ? localM3u8(text, u) : keepVariant(text, u, best),
      { via: 'stream', stream: true, segments: saved, segmentBytes: bytes });
    done.push({ stream: u, segments: saved, bytes, a: rec });
  }
  return done;
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
  const c = { images: 0, videos: 0, streams: 0, css: 0, fonts: 0, js: 0, other: 0, bytes: 0 };
  for (const a of savedNow.values()) {
    c.bytes += a.bytes || 0;
    const t = a.contentType || '';
    if (a.segmentOf) continue; // stream segments / variant playlists: counted with their stream
    if (/mpegurl/i.test(t)) { if (a.stream === true) c.streams++; continue; } // a Shopify master is its MP4's record
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
  // --refresh: the previous files wait in OLD_DIR; a viewport that hits a bot check this time keeps its old files.
  const OLD_DIR = PAGE_DIR + '.previous';
  fs.rmSync(OLD_DIR, { recursive: true, force: true });
  if (fs.existsSync(PAGE_DIR)) fs.renameSync(PAGE_DIR, OLD_DIR);
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
      if (fs.existsSync(OLD_DIR)) { fs.renameSync(OLD_DIR, PAGE_DIR); console.error('(the previous download of "' + name + '" is kept)'); }
      console.error('BLOCKED: ' + url + ' shows a bot check on desktop and phone, even after a retry. It cannot be downloaded:' +
        ' send screenshots of the page instead and build the theme with the new-theme skill.');
      process.exitCode = 2;
      return;
    }
    const kept = [];
    for (const vp of VIEWPORTS) {
      if (results[vp.label] || !fs.existsSync(path.join(OLD_DIR, vp.html))) continue;
      for (const f of [vp.html, vp.label + '.png', 'offline-' + vp.label + '.png']) {
        if (fs.existsSync(path.join(OLD_DIR, f))) fs.renameSync(path.join(OLD_DIR, f), path.join(PAGE_DIR, f));
      }
      kept.push(vp.label);
      console.log(vp.label + ': blocked, the previous download of this viewport is kept');
    }
    fs.rmSync(OLD_DIR, { recursive: true, force: true });

    const wanted = new Set(partial);
    const streamList = new Set(netStreams);
    for (const r of Object.values(results)) {
      r.refs.urls.forEach((u) => wanted.add(u));
      r.snap.urls.forEach((u) => wanted.add(u));
      r.refs.streams.forEach((u) => streamList.add(u));
      r.snap.embeds.forEach((u) => skip(u, 'embedded frame (third party, kept as an empty frame)'));
    }
    await complete(wanted);
    const streams = await resolveStreams(Array.from(streamList));
    for (const r of Object.values(results)) {
      for (const [u, m] of Object.entries(r.refs.media)) {
        const a = assets[u];
        if (!a) continue;
        a.area = a.area === 'main' || m.area === 'main' ? 'main' : (a.area || m.area);
        a.rendered = { w: Math.max((a.rendered && a.rendered.w) || 0, m.w), h: Math.max((a.rendered && a.rendered.h) || 0, m.h) };
      }
    }
    // Videos: where each was found, its poster, and for a stream's MP4 the place / size the stream had on the page.
    const viaOf = {};
    const posterOf = {};
    for (const r of Object.values(results)) {
      Object.assign(posterOf, r.refs.posters);
      for (const [u, v] of Object.entries(r.refs.via)) if (!viaOf[u] || v === 'page') viaOf[u] = v;
    }
    for (const [u, a] of savedNow) {
      if (!/^video\//.test(a.contentType) || a.segmentOf) continue;
      a.via = viaOf[u] || (a.stream ? 'stream' : 'page');
      const p = posterOf[u] || (a.stream && posterOf[a.stream]);
      if (p) a.poster = p;
      const s = a.stream && assets[a.stream];
      if (s && !a.area && s.area) { a.area = s.area; a.rendered = s.rendered; }
    }
    // Stream sources in the copy point at what was saved: a Shopify stream's MP4, else the local playlist.
    const streamTo = new Map(streams.map((s) => [s.stream, s.mp4 ? { src: M.localUrl(s.mp4), type: 'video/mp4' } : { src: M.localUrl(s.stream), type: null }]));
    const localStreams = (html, base) => html.replace(/<(source|video)\b[^>]*>/gi, (tag) => {
      const m = tag.match(/\ssrc="([^"]+)"/i);
      const to = m && streamTo.get(M.absUrl(m[1].replace(/&amp;/g, '&'), base));
      if (!to) return tag;
      const t = tag.replace(m[0], ' src="' + to.src + '"');
      return to.type ? t.replace(/\stype="[^"]*"/i, ' type="' + to.type + '"') : t;
    });
    for (const vp of VIEWPORTS) {
      const r = results[vp.label];
      if (r) fs.writeFileSync(path.join(PAGE_DIR, vp.html), withElementStubs(localStreams(r.snap.html, r.finalUrl)));
    }

    const first = results.desktop || results.mobile;
    const entry = { name, url, finalUrl: first.finalUrl, title: first.title, status: first.status, fetchedAt: new Date().toISOString(),
      blocked, kept, counts: counts(), check: null };
    manifest.pages = (manifest.pages || []).filter((p) => p.name !== name).concat(entry);
    manifest.skipped = (manifest.skipped || []).filter((s) => s.page !== name).concat(skipped);
    writeJson(path.join(SITE, 'assets.json'), assets);
    writeJson(path.join(SITE, 'manifest.json'), manifest);

    srv = await siteServer.start({ siteDir: SITE, port: 0, log: false });
    entry.check = await offlineCheck(browser, srv);
    writeJson(path.join(SITE, 'manifest.json'), manifest);

    const c = entry.counts;
    console.log('\n' + name + '  ' + url + '  ' + (blocked.length ? 'partly blocked (' + blocked.join(', ') + ')' : 'ok'));
    console.log('  images ' + c.images + ' · videos ' + c.videos + ' · streams ' + c.streams + ' · css ' + c.css + ' · fonts ' + c.fonts +
      ' · js ' + c.js + ' · other ' + c.other + ' · ' + mb(c.bytes));
    // One line per video, to pick the theme's default videos from (new-theme rules: shown sections only).
    const short = (u) => String(u).replace(/^https?:\/\/[^/]+/, '').slice(-60);
    for (const [, a] of savedNow) {
      if (!/^video\//.test(a.contentType) || a.segmentOf) continue;
      console.log('  video  ' + mb(a.bytes).padStart(8) + '  ' + (a.rendered ? a.rendered.w + 'x' + a.rendered.h : '-').padEnd(9) + ' ' +
        (a.area || '-').padEnd(6) + ' ' + a.via.padEnd(8) + ' ' + a.file + (a.stream ? '  ← ' + short(a.stream) : '') + (a.poster ? '  poster ' + short(a.poster) : ''));
    }
    streams.filter((s) => s.segments != null).forEach((s) => console.log('  stream ' + s.segments + ' segments · ' + mb(s.bytes) + '  ' + s.a.file +
      '  (kept for reference: not one file, a theme cannot use it)'));
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
