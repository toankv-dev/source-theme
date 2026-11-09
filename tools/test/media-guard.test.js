'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { tmpDir } = require('./helpers');
const { originalsStillShipped, writeReplaceList, videoBytes } = require('../lib/media-guard');

const bytes = (seed, n) => Buffer.alloc(n || 8000, seed);
const sha = (b) => crypto.createHash('sha1').update(b).digest('hex');

function theme(withMap) {
  const dir = tmpDir('media-guard-');
  const put = (rel, body) => { const f = path.join(dir, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, body); };
  put('theme.json', '{}');
  if (withMap) {
    put('assets/images/tt-sections/knee.webp', bytes(1));
    put('assets/images/tt-gallery/main.webp', bytes(2));
    put('assets/videos/tt-hidden/clip.mp4', bytes(3, 20000));
    put('templates/product.json', JSON.stringify({ sections: { a: { type: 'image-with-text', settings: { default_image: 'images/tt-sections/knee.webp' } } } }));
    put('sample/product.json', JSON.stringify({ media: { main_image: '/assets/images/tt-gallery/main.webp' } }));
    put('_work/media-map.json', JSON.stringify([
      { url: 'https://x.com/knee.jpg', kind: 'image', group: 'sections', shipped: 'assets/images/tt-sections/knee.webp', sha1: sha(bytes(1)) },
      { url: 'https://x.com/main.jpg', kind: 'image', group: 'gallery', shipped: 'assets/images/tt-gallery/main.webp', sha1: sha(bytes(2)) },
      { url: 'https://x.com/clip.mp4', kind: 'video', group: 'hidden', shipped: 'assets/videos/tt-hidden/clip.mp4', sha1: sha(bytes(3, 20000)) },
    ]));
  }
  return { dir, put };
}

test('a theme without a media map is not reported', () => {
  const t = theme(false);
  t.put('assets/images/anything.jpg', bytes(1));
  assert.equal(originalsStillShipped(t.dir), null);
});

test('counts what is still the sample store\'s and where it is used', () => {
  const r = originalsStillShipped(theme(true).dir);
  assert.equal(r.images, 2);
  assert.equal(r.videos, 1);
  assert.equal(r.bytes, 36000);
  const knee = r.items.find((i) => i.shipped.endsWith('knee.webp'));
  assert.deepEqual(knee.usedIn, ['templates/product.json']);
  assert.deepEqual(r.items.find((i) => i.shipped.endsWith('main.webp')).usedIn, [], 'the sample product is not a use');
});

test('a replaced or removed file no longer counts', () => {
  const t = theme(true);
  t.put('assets/images/tt-sections/knee.webp', bytes(9));
  fs.unlinkSync(path.join(t.dir, 'assets/videos/tt-hidden/clip.mp4'));
  const r = originalsStillShipped(t.dir);
  assert.equal(r.images, 1);
  assert.equal(r.videos, 0);
  assert.ok(r.items[0].shipped.endsWith('main.webp'));
});

test('writeReplaceList lists every file with its use and original', () => {
  const t = theme(true);
  const out = writeReplaceList(t.dir, originalsStillShipped(t.dir));
  assert.equal(path.relative(t.dir, out).replace(/\\/g, '/'), '_work/media-to-replace.md');
  const md = fs.readFileSync(out, 'utf8');
  assert.match(md, /2 images, 1 videos/);
  assert.match(md, /assets\/images\/tt-sections\/knee\.webp \| sections \| 8 KB \| templates\/product\.json \| https:\/\/x\.com\/knee\.jpg/);
  assert.match(md, /main\.webp \| gallery \| 8 KB \| not in a slot/);
});

test('videoBytes: shipped videos only (not _work)', () => {
  const t = theme(false);
  t.put('assets/videos/mt/a.mp4', bytes(4, 20000));
  t.put('assets/videos/mt/b.webm', bytes(5, 10000));
  t.put('_work/site/_m/x/c.mp4', bytes(6, 50000));
  assert.deepEqual(videoBytes(t.dir), { files: 2, bytes: 30000 });
});
