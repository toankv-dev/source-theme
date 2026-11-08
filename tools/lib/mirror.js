/*
 * Pure helpers shared by tools/download-page.js (node) and the page it snapshots (browser).
 * No node modules and no globals besides URL / decodeURIComponent, so download-page.js can inject this
 * file into the page as is (wrapped in a function that provides `module`).
 *
 *   localPath(url)        → "_m/<host>/<path>": where a downloaded file lives under _work/site/
 *   localUrl(url)         → "/_m/…": the same as a URL path for the offline copy
 *   absUrl(u, base)       → absolute http(s) URL, or null for data: / blob: / about: / # / mailto: …
 *   rewriteCss(css, base) → { css, urls }: url() and @import pointed at /_m/…, plus the absolute URLs found
 *   rewriteSrcset(set, base, keep) / parseSrcset / largestCandidate
 *   pageName(url)         → home / product / collection / search / contact / tracking / policy / page
 *   isBlocked({ status, title, text }) → true for bot-check / access-denied pages
 *   looksLikeMedia(value) → true when an attribute value looks like an image / video URL
 */
'use strict';

// FNV-1a, 32-bit, hex: a short stable name for over-long URLs (same result in node and in the page).
function hash(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

const RESERVED = /^(con|prn|aux|nul|com\d|lpt\d)(\.|$)/i;
const EXT = /\.([a-z0-9]{1,5})$/i;

function safeSegment(s) {
  let t = s.replace(/[<>:"|?*\\#%\u0000-\u001f]/g, '_').replace(/[. ]+$/, (m) => m.replace(/[. ]/g, '_'));
  if (RESERVED.test(t)) t = '_' + t;
  return t;
}

// Local path of a downloaded URL. Keeps the host so host checks (fonts.gstatic …) still match; a path without an
// extension becomes <path>/__index so "/a" and "/a/b" never collide; the query goes before the extension;
// Windows-safe; hashed when too long.
function localPath(u) {
  const url = new URL(u);
  let pathname = url.pathname;
  try { pathname = decodeURIComponent(pathname); } catch (e) { /* keep it encoded */ }
  const segs = pathname.split('/').filter(Boolean).map(safeSegment);
  let last = segs.pop() || '';
  let ext = '';
  const m = last.match(EXT);
  if (m && last.length > m[0].length) { ext = m[0].toLowerCase(); last = last.slice(0, -m[0].length); } else { if (last) segs.push(last); last = '__index'; }
  if (url.search) last += '__' + url.search.slice(1).replace(/[^\w.=-]+/g, '_');
  let p = segs.concat(last).join('/');
  if (p.length > 180) p = p.slice(0, 160) + '-' + hash(u);
  return '_m/' + safeSegment(url.host) + '/' + p + ext;
}

function localUrl(u) {
  return encodeURI('/' + localPath(u));
}

function absUrl(u, base) {
  if (u == null) return null;
  const s = String(u).trim();
  if (!s || s.startsWith('#') || /^(data|blob|about|javascript|mailto|tel|sms):/i.test(s)) return null;
  try {
    const a = new URL(s, base);
    return /^https?:$/.test(a.protocol) ? a.href.replace(/#.*$/, '') : null;
  } catch (e) { return null; }
}

// A URL that already points into the offline copy (never rewrite twice).
const isLocal = (s) => /^\/?_m\//.test(String(s).trim());

function rewriteCss(css, base) {
  const urls = [];
  const to = (raw) => {
    if (isLocal(raw)) return null;
    const a = absUrl(raw, base);
    if (!a) return null;
    urls.push(a);
    return localUrl(a);
  };
  let out = String(css).replace(/@import\s+(['"])(.*?)\1/g, (all, q, u) => {
    const l = to(u);
    return l ? '@import ' + q + l + q : all;
  });
  out = out.replace(/url\(\s*(['"]?)(.*?)\1\s*\)/g, (all, q, u) => {
    const l = to(u);
    return l ? 'url(' + q + l + q + ')' : all;
  });
  return { css: out, urls };
}

// srcset → [{ url, desc, size }] (URLs may contain commas, as on Cloudinary).
function parseSrcset(set) {
  const s = String(set || '');
  const out = [];
  let i = 0;
  while (i < s.length) {
    while (i < s.length && /[\s,]/.test(s[i])) i++;
    if (i >= s.length) break;
    let j = i;
    while (j < s.length && !/\s/.test(s[j])) j++;
    let url = s.slice(i, j);
    let desc = '';
    if (url.endsWith(',')) { url = url.replace(/,+$/, ''); i = j; } else {
      let k = j;
      while (k < s.length && s[k] !== ',') k++;
      desc = s.slice(j, k).trim();
      i = k + 1;
    }
    const n = parseFloat(desc) || (desc ? 0 : 1);
    out.push({ url, desc, size: /x$/.test(desc) ? n * 1000 : n });
  }
  return out;
}

function largestCandidate(set, base) {
  const c = parseSrcset(set).filter((x) => absUrl(x.url, base)).sort((a, b) => b.size - a.size)[0];
  return c ? absUrl(c.url, base) : null;
}

// Keeps only the candidates whose absolute URL is in `keep` (when given), pointed at /_m/….
function rewriteSrcset(set, base, keep) {
  const list = parseSrcset(set).map((c) => Object.assign(c, { abs: isLocal(c.url) ? null : absUrl(c.url, base) }));
  const kept = list.filter((c) => c.abs && (!keep || keep.indexOf(c.abs) > -1));
  const use = kept.length ? kept : list.filter((c) => c.abs).slice(0, 1);
  return use.map((c) => localUrl(c.abs) + (c.desc ? ' ' + c.desc : '')).join(', ');
}

function pageName(u) {
  let p = '/';
  try { p = new URL(u).pathname.toLowerCase(); } catch (e) { /* keep "/" */ }
  if (/\/products?\//.test(p)) return 'product';
  if (/track|order-status/.test(p)) return 'tracking';
  if (/^\/(pages\/)?contact/.test(p)) return 'contact';
  if (/^\/search/.test(p)) return 'search';
  if (/^\/collections(\/|$)/.test(p)) return 'collection';
  if (/^\/policies\//.test(p)) return 'policy';
  if (p === '/' || p === '') return 'home';
  return 'page';
}

function isBlocked(o) {
  const status = Number(o && o.status) || 0;
  const title = String((o && o.title) || '');
  const text = String((o && o.text) || '').slice(0, 3000);
  if ([403, 429, 503].indexOf(status) > -1) return true;
  if (/just a moment|attention required|access denied|verify you are human|are you a robot|security check|captcha|ddos-guard/i.test(title)) return true;
  return text.length < 1500 && /checking your browser|enable javascript and cookies to continue|verify you are human/i.test(text);
}

function looksLikeMedia(v) {
  return /^(https?:)?\/\/|^\//.test(String(v || '').trim()) && /\.(jpe?g|png|gif|webp|avif|svg|mp4|webm|mov|m4v|ogv)(\?|#|$)/i.test(String(v));
}

// A video URL that cannot be saved as one file (stream manifests, media-source blobs).
function isStream(u) {
  return /^blob:/i.test(String(u)) || /\.(m3u8|mpd)(\?|#|$)/i.test(String(u));
}

module.exports = { hash, localPath, localUrl, absUrl, isLocal, rewriteCss, parseSrcset, largestCandidate, rewriteSrcset,
  pageName, isBlocked, looksLikeMedia, isStream };
