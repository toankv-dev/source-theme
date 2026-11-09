/*
 * Which files of a downloaded page make up its media library (tools/media-library.js). Pure functions over
 * _work/site/assets.json: no flags, no tracking pixels, one file per picture (the heaviest), a group and a name each.
 * Groups: sections (picture slots on the page) · gallery · icons · brand (header / footer) · reviews · hidden (a section the
 * page does not show).
 */
'use strict';

const FLAG = /flagcdn\.com|\/flags?\//i;
const REVIEW_HOST = /judge\.?me|loox|stamped|okendo|yotpo|rivyo|reviews\.io|alireviews/i;
const PIXEL_BYTES = 200;
const ICON_PX = 100;
const VIDEO_TYPE = /^video\/(mp4|webm|quicktime|ogg)/i;
const EXT = { 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif', 'image/gif': 'gif',
  'image/svg+xml': 'svg', 'image/bmp': 'bmp', 'image/tiff': 'tiff', 'image/x-icon': 'ico', 'image/vnd.microsoft.icon': 'ico',
  'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov', 'video/ogg': 'ogv' };

// "…/Shorts-1_800x.jpg?v=3" → "shorts-1"; "…/abc.HD-1080p-2.5Mbps-9.mp4" → "abc": every size of one picture or video.
function stem(url) {
  let p = String(url);
  try { p = new URL(p, 'http://x').pathname; } catch (e) { p = p.split(/[?#]/)[0]; }
  try { p = decodeURIComponent(p); } catch (e) { /* keep it as it is */ }
  return p.split('/').pop()
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/\.(?:UHD|HD|SD)-\d+p.*$/i, '')
    .replace(/_\d*x\d*(?:@\dx)?$/i, '')
    .toLowerCase();
}

// One picture: the same stem in the same folder. Shopify's files/ folder is one namespace per shop, on the store's host and on
// cdn.shopify.com alike. The same name in another folder may be another picture, so it is kept.
function pictureKey(url) {
  let u;
  try { u = new URL(url, 'http://x'); } catch (e) { return stem(url); }
  const dir = u.pathname.split('/').slice(0, -1).join('/');
  return dir.endsWith('/files') ? stem(url) : u.host + dir + '/' + stem(url);
}

// Keeps the heaviest file of each picture; the place and size on the page come from all of them (the largest srcset file
// is often never shown, while a smaller one is the 715 px picture).
function gather(entries) {
  const best = new Map();
  for (const [url, a] of entries) {
    const k = pictureKey(url);
    const c = best.get(k);
    if (!c) { best.set(k, Object.assign({ url }, a, { rendered: a.rendered && { ...a.rendered } })); continue; }
    const r = c.rendered || { w: 0, h: 0 };
    const n = a.rendered || { w: 0, h: 0 };
    const place = {
      rendered: a.rendered || c.rendered ? { w: Math.max(r.w, n.w), h: Math.max(r.h, n.h) } : undefined,
      area: c.area === 'main' || a.area === 'main' ? 'main' : (c.area || a.area),
      section: c.section || a.section,
      gallery: !!(c.gallery || a.gallery),
      hidden: c.hidden === undefined ? a.hidden : a.hidden === undefined ? c.hidden : !!(c.hidden && a.hidden),
    };
    const heavier = (a.bytes || 0) > (c.bytes || 0);
    best.set(k, Object.assign(heavier ? Object.assign({ url }, a) : c, place));
  }
  return Array.from(best.values());
}

function pickImages(assets) {
  return gather(Object.entries(assets).filter(([url, a]) => /^image\//i.test(a.contentType || '') && !FLAG.test(url) && (a.bytes || 0) >= PIXEL_BYTES));
}

function pickVideos(assets) {
  return gather(Object.entries(assets).filter(([, a]) => VIDEO_TYPE.test(a.contentType || '') && !a.segmentOf && a.stream !== true));
}

function classify(item) {
  let host = '';
  try { host = new URL(item.url, 'http://x').host; } catch (e) { /* no host */ }
  if (REVIEW_HOST.test(host)) return 'reviews';
  if (item.hidden) return 'hidden';
  if (item.area === 'header' || item.area === 'footer') return 'brand';
  if (item.gallery) return 'gallery';
  const r = item.rendered;
  if (r && r.w > 0 && r.h > 0 && r.w <= ICON_PX && r.h <= ICON_PX) return 'icons';
  return 'sections';
}

function classifyVideo(item) {
  if (item.hidden) return 'hidden';
  return item.gallery ? 'gallery' : 'sections';
}

function safeName(s) {
  const n = String(s).toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^[-_]+|[-_]+$/g, '').slice(0, 60).replace(/[-_]+$/, '');
  return n || 'image';
}

// The real extension: download names keep the URL's (".png" that holds WebP).
function realExt(contentType, file) {
  const t = String(contentType || '').split(';')[0].trim().toLowerCase();
  if (EXT[t]) return EXT[t];
  const m = String(file || '').split(/[?#]/)[0].match(/\.([a-z0-9]+)$/i);
  return m ? m[1].toLowerCase() : 'bin';
}

function named(items, groupOf) {
  const used = new Set();
  return items.slice().sort((a, b) => (a.url < b.url ? -1 : 1)).map((item) => {
    const group = groupOf(item);
    const base = safeName(stem(item.url));
    let name = base;
    for (let n = 2; used.has(group + '/' + name); n++) name = base + '-' + n;
    used.add(group + '/' + name);
    return Object.assign({}, item, { group, name, ext: realExt(item.contentType, item.file) });
  });
}

function plan(assets) {
  return { images: named(pickImages(assets), classify), videos: named(pickVideos(assets), classifyVideo) };
}

module.exports = { stem, pickImages, pickVideos, classify, classifyVideo, safeName, realExt, plan };
