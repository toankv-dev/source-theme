'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { tmpDir, runNode, SAMPLE, SITE } = require('./helpers');

const JPG = path.join(SAMPLE, 'EEOB_-_WP1__96291.jpg');
const WEBP = path.join(SAMPLE, 'GGG_-_WP1__72064.webp');
const SVG = path.join(SITE, 'icons', 'pay.svg');
const VIDEO = Buffer.alloc(64 * 1024, 7);
const isWebp = (f) => { const b = fs.readFileSync(f); return b.slice(0, 4).toString() === 'RIFF' && b.slice(8, 12).toString() === 'WEBP'; };

function download() {
  const dir = tmpDir('media-library-');
  const site = path.join(dir, '_work', 'site');
  const put = (rel, from) => { const f = path.join(site, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); if (Buffer.isBuffer(from)) fs.writeFileSync(f, from); else fs.copyFileSync(from, f); };
  put('_m/x/knee-pain.jpg', JPG);
  put('_m/x/knee-pain-small.jpg', Buffer.alloc(300, 1));
  put('_m/x/photo.png', WEBP); // a ".png" name holding WebP, as Shopify serves
  put('_m/x/same.jpg', JPG); // same bytes under another name
  put('_m/x/fr.png', Buffer.alloc(500, 2));
  put('_m/x/pixel.gif', Buffer.alloc(42, 3));
  put('_m/x/pay.svg', SVG);
  put('_m/x/review.jpg', path.join(SAMPLE, 'GGG_-_WP5__22402.webp'));
  put('_m/x/clip.mp4', VIDEO);
  const img = (file, extra) => Object.assign({ file, contentType: 'image/jpeg', bytes: fs.statSync(path.join(site, file)).size, pages: ['product'], area: 'main', rendered: { w: 650, h: 650 }, section: 'iwt', hidden: false }, extra);
  fs.writeFileSync(path.join(site, 'assets.json'), JSON.stringify({
    'https://shop.com/cdn/files/Knee-Pain.jpg?width=2000': img('_m/x/knee-pain.jpg'),
    'https://shop.com/cdn/files/Knee-Pain.jpg?width=100': img('_m/x/knee-pain-small.jpg', { rendered: { w: 40, h: 40 } }),
    'https://shop.com/cdn/files/slide.png': img('_m/x/photo.png', { contentType: 'image/webp', gallery: true, rendered: { w: 0, h: 0 } }),
    'https://shop.com/cdn/files/copy.jpg': img('_m/x/same.jpg'),
    'https://flagcdn.com/w40/fr.png': img('_m/x/fr.png', { contentType: 'image/png', area: 'header' }),
    'https://px.com/p.gif': img('_m/x/pixel.gif', { contentType: 'image/gif' }),
    'https://shop.com/pay.svg': img('_m/x/pay.svg', { contentType: 'image/svg+xml', area: 'footer', rendered: { w: 38, h: 24 } }),
    'https://review-images.judgeme.com/u/face.jpg': img('_m/x/review.jpg', { contentType: 'image/webp', rendered: { w: 160, h: 160 } }),
    'https://shop.com/clip.mp4': { file: '_m/x/clip.mp4', contentType: 'video/mp4', bytes: VIDEO.length, pages: ['product'], area: 'main', rendered: { w: 0, h: 0 }, section: 'secret', hidden: true },
  }));
  return dir;
}
const library = (dir, more) => runNode(['tools/media-library.js', dir, '--prefix', 'tt', '--no-sheet'].concat(more || []));
const shippedIn = (dir) => { const out = []; const walk = (d) => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else out.push(path.relative(dir, p).replace(/\\/g, '/')); } }; for (const a of ['assets']) if (fs.existsSync(path.join(dir, a))) walk(path.join(dir, a)); return out.sort(); };

test('no download: a clear error', async () => {
  const r = await library(tmpDir('media-library-'));
  assert.equal(r.code, 1);
  assert.match(r.stderr, /no download/);
});

test('WebP in assets, original bytes in _work/images, videos unchanged, a map', async () => {
  const dir = download();
  const r = await library(dir);
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.deepEqual(shippedIn(dir), [
    'assets/images/tt-brand/pay.svg',
    'assets/images/tt-gallery/slide.webp',
    'assets/images/tt-reviews/face.webp',
    'assets/images/tt-sections/knee-pain.webp',
    'assets/videos/tt-hidden/clip.mp4',
  ]);
  assert.ok(isWebp(path.join(dir, 'assets/images/tt-sections/knee-pain.webp')), 'a JPEG source ships as WebP');
  assert.ok(isWebp(path.join(dir, '_work/sample/thumbs/slide.webp')), 'a thumb of each gallery picture for the sample product, not packed');
  assert.ok(!fs.existsSync(path.join(dir, '_work/sample/thumbs/knee-pain.webp')), 'only the gallery has thumbs');
  assert.deepEqual(fs.readFileSync(path.join(dir, '_work/images/sections/knee-pain.jpg')), fs.readFileSync(JPG), 'the original is byte for byte');
  assert.ok(fs.existsSync(path.join(dir, '_work/images/gallery/slide.webp')), 'the real extension, not the .png of the URL');
  assert.deepEqual(fs.readFileSync(path.join(dir, 'assets/videos/tt-hidden/clip.mp4')), VIDEO);
  assert.deepEqual(fs.readFileSync(path.join(dir, 'assets/images/tt-brand/pay.svg')), fs.readFileSync(SVG), 'SVG unchanged');
  const map = JSON.parse(fs.readFileSync(path.join(dir, '_work/media-map.json'), 'utf8'));
  assert.equal(map.length, 5);
  const knee = map.find((e) => e.name === 'knee-pain');
  assert.equal(knee.section, 'iwt');
  assert.deepEqual(knee.rendered, { w: 650, h: 650 });
  assert.equal(knee.kind, 'image');
  assert.equal(knee.url, 'https://shop.com/cdn/files/Knee-Pain.jpg?width=2000');
  assert.equal(knee.max, 1600);
  assert.equal(map.find((e) => e.name === 'slide').max, 1200, 'the real gallery comes from the product data: a smaller copy is enough');
  assert.match(r.stdout, /same bytes as another picture, skipped: 1/);
  assert.match(r.stdout, /images\/tt-sections\/knee-pain\.webp\s+650x650\s+iwt/, 'the slot list names the path for default_image');
});

test('a WebP source that would not get smaller stays as it is', async () => {
  const dir = download();
  await library(dir);
  const shipped = fs.statSync(path.join(dir, 'assets/images/tt-gallery/slide.webp')).size;
  assert.ok(shipped <= fs.statSync(WEBP).size);
});

test('run again: a file you replaced stays, the others are left alone', async () => {
  const dir = download();
  await library(dir);
  const mine = path.join(dir, 'assets/images/tt-sections/knee-pain.webp');
  fs.writeFileSync(mine, 'my own picture');
  const otherFile = path.join(dir, 'assets/images/tt-gallery/slide.webp');
  const stamp = fs.statSync(otherFile).mtimeMs;
  const r = await library(dir);
  assert.equal(r.code, 0, r.stderr);
  assert.equal(fs.readFileSync(mine, 'utf8'), 'my own picture');
  assert.match(r.stdout, /kept \(you changed them\): assets\/images\/tt-sections\/knee-pain\.webp/);
  assert.equal(fs.statSync(otherFile).mtimeMs, stamp, 'nothing to redo for an unchanged source');
  // pack.js counts by sha1 in the map: the replaced file must not match it.
  const { originalsStillShipped } = require('../lib/media-guard');
  const left = originalsStillShipped(dir);
  assert.ok(!left.items.some((i) => i.shipped.endsWith('knee-pain.webp')));
  assert.equal(left.images, 3);
  assert.equal(left.videos, 1);
});

test('a picture that moved to another group leaves no stale file behind', async () => {
  const dir = download();
  await library(dir);
  const file = path.join(dir, '_work/site/assets.json');
  const a = JSON.parse(fs.readFileSync(file, 'utf8'));
  a['https://shop.com/cdn/files/slide.png'].gallery = false;
  fs.writeFileSync(file, JSON.stringify(a));
  const r = await library(dir);
  assert.equal(r.code, 0, r.stderr);
  assert.ok(!fs.existsSync(path.join(dir, 'assets/images/tt-gallery/slide.webp')));
  assert.ok(fs.existsSync(path.join(dir, 'assets/images/tt-sections/slide.webp')));
});
