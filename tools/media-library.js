#!/usr/bin/env node
/*
 * Turns a downloaded page (tools/download-page.js) into the theme's media library: every picture and video of the sample
 * store, ready to reuse (docs/SPEC-theme-from-link-images.md). Run it once per theme, after the last download.
 *
 *   node tools/media-library.js <theme-dir> [--prefix tv] [--max 1600] [--quality 0.82] [--no-sheet]
 *
 * Writes, for each picture (no flags, no tracking pixels, one file per picture; tools/lib/media-pick.js):
 *   assets/images/<prefix>-<group>/<name>.webp   what ships (SVG and GIF unchanged). Groups: sections · gallery · icons · brand ·
 *                                                reviews · hidden. One folder level, like images/pay/: deeper paths are untested on the platform
 *   _work/images/<group>/<name>.<real ext>       the original bytes, for reuse; never packed
 *   _work/images/contact-<group>.png             one look at a group
 *   _work/sample/thumbs/<name>.webp              gallery thumbs for sample/product.json (/assets/sample/thumbs/…); gallery files stop at 1200 px
 * and for each video assets/videos/<prefix>-<group>/<name>.<ext>, the file unchanged.
 *   _work/media-map.json                         URL → original → shipped → sha1 → section → shown size
 * Run it again freely: a shipped file whose sha1 changed since the last run is yours (you replaced it) and stays; files of an
 * older run that nothing needs any more are removed unless you changed them.
 * Exit codes: 0 done, 1 usage / no download.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const { plan } = require('./lib/media-pick');

const args = process.argv.slice(2);
const opt = (k, d) => (args.includes('--' + k) ? args[args.indexOf('--' + k) + 1] : d);
const dir = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--') && args[i - 1] !== '--no-sheet'))[0];
if (!dir) { console.error('usage: node tools/media-library.js <theme-dir> [--prefix tv] [--max 1600] [--quality 0.82] [--no-sheet]'); process.exit(1); }
const THEME = path.resolve(dir);
const SITE = path.join(THEME, '_work', 'site');
const ASSETS = path.join(SITE, 'assets.json');
if (!fs.existsSync(ASSETS)) { console.error('no download in ' + SITE + ': run tools/download-page.js first'); process.exit(1); }
const PREFIX = opt('prefix', path.basename(THEME).replace(/[^a-z0-9]/gi, '').slice(0, 2).toLowerCase());
const MAX = Number(opt('max', 1600));
const QUALITY = Number(opt('quality', 0.82));
const MAP = path.join(THEME, '_work', 'media-map.json');
const TO_WEBP = path.join(__dirname, 'scripts', 'to-webp.js');
const SHEET = path.join(__dirname, 'contact-sheet.js');
const KEEP_FORMAT = new Set(['svg', 'gif', 'ico']); // vector, animated, or nothing a browser re-encodes well
const BATCH = 10;
const GALLERY_MAX = 1200; // the real gallery comes from the product data: this copy only has to look right
const THUMB_MAX = 200;
const maxFor = (group) => (group === 'gallery' ? Math.min(MAX, GALLERY_MAX) : MAX);

const sha1 = (f) => crypto.createHash('sha1').update(fs.readFileSync(f)).digest('hex');
const rel = (f) => path.relative(THEME, f).replace(/\\/g, '/');
const abs = (r) => path.join(THEME, r);
const mkdirFor = (f) => fs.mkdirSync(path.dirname(f), { recursive: true });
const mb = (n) => (n / 1048576).toFixed(1) + ' MB';
const copy = (a, b) => { mkdirFor(b); fs.copyFileSync(a, b); };

const prev = new Map();
if (fs.existsSync(MAP)) for (const e of JSON.parse(fs.readFileSync(MAP, 'utf8'))) prev.set(e.shipped, e);

const { images, videos } = plan(JSON.parse(fs.readFileSync(ASSETS, 'utf8')));
const entries = [];
const kept = [];
const missing = [];
const dupes = [];

const entryOf = (item, kind, shippedRel, sourceSha, original) => {
  const e = { url: item.url, kind, group: item.group, name: item.name, section: item.section || '', rendered: item.rendered || null, pages: item.pages || [],
    original, shipped: shippedRel, source: sourceSha, bytes: item.bytes || 0 };
  entries.push(e);
  return e;
};
// True when the shipped file should be left alone: you changed it, or it is already what this source gives.
const settled = (e, sourceSha) => {
  const before = prev.get(e.shipped);
  if (!before || !fs.existsSync(abs(e.shipped))) return false;
  const now = sha1(abs(e.shipped));
  if (now !== before.sha1) { e.sha1 = before.sha1; e.replaced = true; kept.push(e.shipped); return true; }
  if (before.source !== sourceSha || before.max !== e.max) return false;
  e.sha1 = before.sha1;
  return true;
};

// Pictures: original bytes first, then the shipped file.
const seenBytes = new Map();
const queue = [];
for (const item of images) {
  const src = path.join(SITE, item.file);
  if (!fs.existsSync(src)) { missing.push(item.url); continue; }
  const sourceSha = sha1(src);
  if (seenBytes.has(sourceSha)) { dupes.push(item.url); continue; }
  seenBytes.set(sourceSha, item);
  const original = path.join(THEME, '_work', 'images', item.group, item.name + '.' + item.ext);
  copy(src, original);
  const ext = KEEP_FORMAT.has(item.ext) ? item.ext : 'webp';
  const shipped = path.join(THEME, 'assets', 'images', PREFIX + '-' + item.group, item.name + '.' + ext);
  const e = entryOf(item, 'image', rel(shipped), sourceSha, rel(original));
  e.max = ext === 'webp' ? maxFor(item.group) : 0;
  if (settled(e, sourceSha)) continue;
  if (ext !== 'webp') { copy(src, shipped); e.sha1 = sha1(shipped); continue; }
  queue.push({ e, src, shipped, type: item.ext, max: e.max });
}

const convert = (jobs, max) => {
  jobs.forEach((j) => mkdirFor(j.shipped));
  const pairs = jobs.map((j) => j.src.replace(/\\/g, '/') + '=' + j.shipped.replace(/\\/g, '/'));
  return spawnSync(process.execPath, [TO_WEBP, String(max), String(QUALITY), ...pairs], { stdio: 'pipe', timeout: 300000 }).status === 0;
};
const failed = [];
for (const max of new Set(queue.map((j) => j.max))) {
  const same = queue.filter((j) => j.max === max);
  for (let i = 0; i < same.length; i += BATCH) {
    const lot = same.slice(i, i + BATCH);
    if (convert(lot, max)) continue;
    for (const j of lot) if (!convert([j], max)) failed.push(j);
  }
}
for (const j of queue) {
  if (failed.includes(j)) {
    // Could not be decoded: ship the original bytes rather than lose the picture.
    const out = j.shipped.replace(/\.webp$/, '.' + j.type);
    copy(j.src, out);
    j.e.shipped = rel(out);
    j.e.sha1 = sha1(out);
    continue;
  }
  if (j.type === 'webp' && fs.statSync(j.shipped).size >= fs.statSync(j.src).size) copy(j.src, j.shipped); // no gain: keep the source
  j.e.sha1 = sha1(j.shipped);
}

// Thumbs for the sample product (thumb_url, as the platform gives): the preview serves _work/sample/ under /assets/sample/.
const thumbs = entries.filter((e) => e.kind === 'image' && e.group === 'gallery' && e.max)
  .map((e) => ({ src: abs(e.original), shipped: path.join(THEME, '_work', 'sample', 'thumbs', e.name + '.webp') }))
  .filter((j) => !fs.existsSync(j.shipped));
for (let i = 0; i < thumbs.length; i += BATCH) convert(thumbs.slice(i, i + BATCH), THUMB_MAX);

// Videos: the files unchanged. Their originals stay in _work/site (no second copy of tens of MB).
for (const item of videos) {
  const src = path.join(SITE, item.file);
  if (!fs.existsSync(src)) { missing.push(item.url); continue; }
  const sourceSha = sha1(src);
  const shipped = path.join(THEME, 'assets', 'videos', PREFIX + '-' + item.group, item.name + '.' + item.ext);
  const e = entryOf(item, 'video', rel(shipped), sourceSha, rel(src));
  if (settled(e, sourceSha)) continue;
  copy(src, shipped);
  e.sha1 = sourceSha;
}

// Files of an older run that nothing needs any more; yours (changed sha1) stay.
const nowShipped = new Set(entries.map((e) => e.shipped));
for (const [r, before] of prev) {
  if (nowShipped.has(r) || !fs.existsSync(abs(r))) continue;
  if (sha1(abs(r)) === before.sha1) fs.unlinkSync(abs(r)); else kept.push(r);
}

fs.writeFileSync(MAP, JSON.stringify(entries, null, 2) + '\n');

// One look at each group.
const groups = Array.from(new Set(entries.filter((e) => e.kind === 'image').map((e) => e.group)));
if (!args.includes('--no-sheet')) {
  for (const g of groups) {
    const out = path.join(THEME, '_work', 'images', 'contact-' + g + '.png');
    spawnSync(process.execPath, [SHEET, path.join(THEME, 'assets', 'images', PREFIX + '-' + g), out], { stdio: 'ignore', timeout: 120000 });
  }
}

// Summary
const pics = entries.filter((e) => e.kind === 'image');
const vids = entries.filter((e) => e.kind === 'video');
const sizeOf = (l) => l.reduce((n, e) => n + (fs.existsSync(abs(e.shipped)) ? fs.statSync(abs(e.shipped)).size : 0), 0);
const count = (l, g) => l.filter((e) => e.group === g).length;
console.log('media library: ' + pics.length + ' images → assets/images/' + PREFIX + '-* (' + mb(sizeOf(pics)) + '), originals in _work/images (' + mb(pics.reduce((n, e) => n + e.bytes, 0)) + ')');
console.log('  ' + groups.map((g) => g + ' ' + count(pics, g)).join(' · '));
if (vids.length) console.log('videos: ' + vids.length + ' → assets/videos/' + PREFIX + '-* (' + mb(sizeOf(vids)) + ') · ' + Array.from(new Set(vids.map((e) => e.group))).map((g) => g + ' ' + count(vids, g)).join(' · '));
const line = (e) => '  ' + e.shipped.replace(/^assets\//, '').padEnd(44) + ' ' + (e.rendered ? e.rendered.w + 'x' + e.rendered.h : '-').padEnd(10) + ' ' + e.section;
const slots = pics.filter((e) => e.group === 'sections');
if (slots.length) { console.log('slots (path for default_image):'); slots.forEach((e) => console.log(line(e))); }
if (vids.length) { console.log('videos (path for default_video):'); vids.forEach((e) => console.log(line(e))); }
if (kept.length) console.log('kept (you changed them): ' + kept.join(', '));
if (dupes.length) console.log('same bytes as another picture, skipped: ' + dupes.length);
if (failed.length) console.log('could not convert, shipped as they are: ' + failed.map((j) => j.e.shipped).join(', '));
if (missing.length) console.log('in assets.json but not on disk: ' + missing.join(', '));
