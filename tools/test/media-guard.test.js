'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { tmpDir } = require('./helpers');
const { findOriginalMedia, isContent } = require('../lib/media-guard');

const bytes = (seed, n) => Buffer.alloc(n || 8000, seed);

function theme(withSite) {
  const dir = tmpDir('media-guard-');
  const put = (rel, body) => { const f = path.join(dir, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, body); };
  put('theme.json', '{}');
  if (withSite) {
    put('_work/site/_m/cdn.x.com/shorts-1_800x.jpg', bytes(1));
    put('_work/site/_m/cdn.x.com/logo.png', bytes(2));
    put('_work/site/_m/cdn.x.com/badge.png', bytes(3));
    put('_work/site/_m/cdn.x.com/clip.mp4', bytes(4, 20000));
    put('_work/site/_m/cdn.x.com/banner.jpg', bytes(5));
    put('_work/site/assets.json', JSON.stringify({
      'https://cdn.x.com/shorts-1_800x.jpg?v=3': { file: '_m/cdn.x.com/shorts-1_800x.jpg', contentType: 'image/jpeg', bytes: 8000, pages: ['product'], area: 'main', rendered: { w: 600, h: 600 } },
      'https://cdn.x.com/logo.png': { file: '_m/cdn.x.com/logo.png', contentType: 'image/png', bytes: 8000, pages: ['product'], area: 'header', rendered: { w: 160, h: 40 } },
      'https://cdn.x.com/badge.png': { file: '_m/cdn.x.com/badge.png', contentType: 'image/png', bytes: 8000, pages: ['product'], area: 'main', rendered: { w: 32, h: 32 } },
      'https://cdn.x.com/clip.mp4': { file: '_m/cdn.x.com/clip.mp4', contentType: 'video/mp4', bytes: 20000, pages: ['product-bundle'], area: 'main', rendered: { w: 0, h: 0 } },
      'https://cdn.x.com/banner.jpg': { file: '_m/cdn.x.com/banner.jpg', contentType: 'image/jpeg', bytes: 8000, pages: ['home', 'product'], area: 'main', rendered: { w: 1440, h: 500 } },
    }));
  }
  return { dir, put };
}

test('isContent: product-only, main area, not an icon', () => {
  assert.ok(isContent({ file: 'a', contentType: 'image/jpeg', bytes: 9000, pages: ['product'], area: 'main', rendered: { w: 600, h: 600 } }));
  assert.ok(isContent({ file: 'a', contentType: 'image/jpeg', bytes: 9000, pages: ['product'], area: 'main', rendered: { w: 0, h: 0 } }), 'a hidden slide is content');
  assert.ok(isContent({ file: 'a', contentType: 'image/webp', bytes: 9000, pages: ['product'] }), 'a CSS-only background is content');
  assert.ok(!isContent({ file: 'a', contentType: 'image/svg+xml', bytes: 9000, pages: ['product'], area: 'main' }));
  assert.ok(!isContent({ file: 'a', contentType: 'image/png', bytes: 1000, pages: ['product'], area: 'main', rendered: { w: 400, h: 400 } }), 'tiny file');
  assert.ok(!isContent({ file: 'a', contentType: 'image/jpeg', bytes: 9000, pages: [], area: 'main' }));
});

test('a copied product-page image or video is an error; logo, icon, shared banner are not', () => {
  const t = theme(true);
  t.put('assets/images/hero.jpg', bytes(1)); // the product photo, renamed
  t.put('assets/images/logo.png', bytes(2));
  t.put('assets/images/badge.png', bytes(3));
  t.put('assets/images/banner.jpg', bytes(5));
  t.put('sample/clip.mp4', bytes(4, 20000));
  t.put('_work/notes/shorts-1.jpg', bytes(1)); // _work is never packed
  const r = findOriginalMedia(t.dir);
  assert.equal(r.errors.length, 2, r.errors.join('\n'));
  assert.ok(r.errors.some((e) => e.startsWith('assets/images/hero.jpg is a product-page image')));
  assert.ok(r.errors.some((e) => e.startsWith('sample/clip.mp4')));
  assert.deepEqual(r.warnings, []);
});

test('the same name under another format is a warning', () => {
  const t = theme(true);
  t.put('assets/images/shorts-1.webp', bytes(9));
  const r = findOriginalMedia(t.dir);
  assert.deepEqual(r.errors, []);
  assert.equal(r.warnings.length, 1);
  assert.match(r.warnings[0], /^assets\/images\/shorts-1\.webp has the name/);
});

test('a theme without a downloaded original is not checked', () => {
  const t = theme(false);
  t.put('assets/images/anything.jpg', bytes(1));
  assert.deepEqual(findOriginalMedia(t.dir), { errors: [], warnings: [] });
});
