/*
 * Guard for tools/pack.js: product-page media of a downloaded original never ships in a theme.
 *
 * tools/download-page.js keeps every image and video of the original in <theme>/_work/site/ for reference only:
 * the product page's media slots stay empty for the merchant (new-theme rules). findOriginalMedia(themeDir) looks at
 * the theme's shipped files (what pack.js zips) and reports:
 *   error    a file byte-identical to a content image / video of the downloaded product page(s)
 *   warning  a file with the same name as one of them (e.g. converted to WebP): check it is not that picture
 * "Content" = a raster image or a video that appears only on product* pages, outside the header / footer, and is
 * not a small icon (shown at 100×100 px or less, or a file under 3 KB). Without _work/site/assets.json: no report.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MEDIA = /\.(jpe?g|png|gif|webp|avif|bmp|tiff?|mp4|webm|mov|m4v|ogv)$/i;
const isProductPage = (n) => n === 'product' || /^product-/.test(n);

function isContent(a) {
  if (!a || !a.file || !Array.isArray(a.pages) || !a.pages.length || !a.pages.every(isProductPage)) return false;
  const t = String(a.contentType || '');
  if (!(/^image\//.test(t) && !/svg/.test(t)) && !/^video\//.test(t)) return false;
  if (a.area === 'header' || a.area === 'footer') return false;
  const r = a.rendered;
  if (/^image\//.test(t) && r && r.w > 0 && r.h > 0 && r.w <= 100 && r.h <= 100) return false;
  return !(/^image\//.test(t) && (a.bytes || 0) < 3072);
}

const sha1 = (f) => crypto.createHash('sha1').update(fs.readFileSync(f)).digest('hex');
// "Shorts-1_800x.jpg?v=3" → "shorts-1"
const stem = (s) => path.basename(String(s)).replace(/[?#].*$/, '').replace(/\.[a-z0-9]+$/i, '').replace(/_\d+x\d*$/i, '').toLowerCase();

function shipped(dir, out) {
  for (const f of fs.readdirSync(dir)) {
    if (f.startsWith('.') || f.startsWith('_') || f === 'node_modules' || f.endsWith('.zip')) continue;
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) shipped(full, out); else if (MEDIA.test(f)) out.push(full);
  }
  return out;
}

function findOriginalMedia(themeDir) {
  const errors = [];
  const warnings = [];
  const site = path.join(themeDir, '_work', 'site');
  let assets;
  try { assets = JSON.parse(fs.readFileSync(path.join(site, 'assets.json'), 'utf8')); } catch (e) { return { errors, warnings }; }

  const byHash = new Map();
  const byStem = new Map();
  for (const [url, a] of Object.entries(assets)) {
    if (!isContent(a)) continue;
    const f = path.join(site, a.file);
    if (fs.existsSync(f)) byHash.set(sha1(f), url);
    const s = stem(new URL(url).pathname);
    if (s.length > 3) byStem.set(s, url);
  }
  if (!byHash.size && !byStem.size) return { errors, warnings };

  const rel = (f) => path.relative(themeDir, f).replace(/\\/g, '/');
  for (const f of shipped(themeDir, [])) {
    const hit = byHash.get(sha1(f));
    if (hit) { errors.push(rel(f) + ' is a product-page image / video of the original (' + hit + '): leave that media slot empty for the merchant'); continue; }
    const named = byStem.get(stem(f));
    if (named) warnings.push(rel(f) + ' has the name of a product-page image / video of the original (' + named + '): make sure it is not that picture');
  }
  return { errors, warnings };
}

module.exports = { findOriginalMedia, isContent };
