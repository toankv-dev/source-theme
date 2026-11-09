'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { stem, pickImages, pickVideos, classify, safeName, realExt, plan } = require('../lib/media-pick');

const img = (extra) => Object.assign({ file: '_m/x/a.png', contentType: 'image/png', bytes: 5000, pages: ['product'], area: 'main', rendered: { w: 300, h: 300 } }, extra);

test('stem: every size of one picture has one stem', () => {
  assert.equal(stem('https://x.com/cdn/files/Knee-Pain.jpg?v=1&width=750'), 'knee-pain');
  assert.equal(stem('https://x.com/cdn/files/knee-pain.jpg?width=165'), 'knee-pain');
  assert.equal(stem('https://x.com/files/shorts-1_800x.jpg'), 'shorts-1');
  assert.equal(stem('https://x.com/files/shorts-1_800x600.jpg'), 'shorts-1');
  assert.equal(stem('https://x.com/files/shorts-1_x600@2x.jpg'), 'shorts-1');
  assert.equal(stem('https://x.com/v/abc.HD-1080p-2.5Mbps-94731942.mp4'), 'abc');
  assert.equal(stem('https://x.com/v/abc.SD-480p-0.9Mbps-94731942.mp4'), 'abc');
  assert.equal(stem('/img/My%20Photo.png'), 'my photo');
});

test('pickImages: no flags, no pixels, no videos; the heaviest file of each picture', () => {
  const list = pickImages({
    'https://flagcdn.com/w40/fr.png': img({ bytes: 900 }),
    'https://x.com/assets/flags/de.svg': img({ contentType: 'image/svg+xml', bytes: 900 }),
    'https://px.com/p.gif': img({ contentType: 'image/gif', bytes: 42 }),
    'https://x.com/clip.mp4': img({ contentType: 'video/mp4' }),
    'https://x.com/a.jpg?width=200': img({ file: '_m/small', bytes: 1000 }),
    'https://x.com/a.jpg?width=2000': img({ file: '_m/large', bytes: 9000 }),
    'https://x.com/b.svg': img({ contentType: 'image/svg+xml', bytes: 400 }),
  });
  assert.deepEqual(list.map((i) => i.file).sort(), ['_m/large', '_m/x/a.png']);
});

test('pickImages: one picture across Shopify hosts, two pictures across other folders', () => {
  assert.equal(pickImages({ 'https://shop.com/cdn/shop/files/a.jpg?width=100': img({ bytes: 500 }), 'https://cdn.shopify.com/s/files/1/2/files/a.jpg': img({ bytes: 800 }) }).length, 1);
  assert.equal(pickImages({ 'https://x.com/a/photo.jpg': img({}), 'https://x.com/b/photo.jpg': img({}) }).length, 2);
});

test('pickImages: place and size come from every file of the picture', () => {
  const [a] = pickImages({
    'https://x.com/a.jpg?width=2000': img({ bytes: 9000, rendered: { w: 0, h: 0 }, section: undefined }),
    'https://x.com/a.jpg?width=400': img({ bytes: 800, rendered: { w: 715, h: 715 }, section: 'main', gallery: true }),
    'https://x.com/a.jpg?height=200': img({ bytes: 600, rendered: { w: 40, h: 40 }, section: 'main' }),
  });
  assert.deepEqual(a.rendered, { w: 715, h: 715 });
  assert.equal(a.section, 'main');
  assert.equal(a.gallery, true);
});

test('pickImages: hidden only when every file of the picture is hidden', () => {
  const [seen] = pickImages({ 'https://x.com/a.jpg?1': img({ hidden: true }), 'https://x.com/a.jpg?2': img({ hidden: false }) });
  assert.equal(seen.hidden, false);
  const [gone] = pickImages({ 'https://x.com/b.jpg?1': img({ hidden: true }), 'https://x.com/b.jpg?2': img({ hidden: true }), 'https://x.com/b.jpg?3': img({}) });
  assert.equal(gone.hidden, true);
});

test('classify: reviews, hidden, brand, gallery, icons, sections', () => {
  assert.equal(classify({ url: 'https://review-images.judgeme.com/a.png', hidden: true }), 'reviews');
  assert.equal(classify({ url: 'https://x.com/a.png', hidden: true, gallery: true }), 'hidden');
  assert.equal(classify({ url: 'https://x.com/a.png', area: 'header', rendered: { w: 150, h: 84 } }), 'brand');
  assert.equal(classify({ url: 'https://x.com/a.png', area: 'footer', rendered: { w: 38, h: 24 } }), 'brand');
  assert.equal(classify({ url: 'https://x.com/a.png', area: 'main', gallery: true, rendered: { w: 40, h: 40 } }), 'gallery');
  assert.equal(classify({ url: 'https://x.com/a.png', area: 'main', rendered: { w: 30, h: 30 } }), 'icons');
  assert.equal(classify({ url: 'https://x.com/a.png', area: 'main', rendered: { w: 650, h: 650 } }), 'sections');
  assert.equal(classify({ url: 'https://x.com/a.png', area: 'main', rendered: { w: 0, h: 0 } }), 'sections', 'a hidden slide is still content');
  assert.equal(classify({ url: 'https://x.com/a.png' }), 'sections', 'a CSS background has no place on record');
});

test('safeName and realExt', () => {
  assert.equal(safeName('Tvk 3Steps=1 (copy)'), 'tvk-3steps-1-copy');
  assert.equal(safeName('...'), 'image');
  assert.equal(safeName('a'.repeat(90)).length, 60);
  assert.equal(realExt('image/webp', '_m/x/knee-pain.jpg'), 'webp', 'the name lies: the type wins');
  assert.equal(realExt('image/jpeg; charset=x', 'a'), 'jpg');
  assert.equal(realExt('image/svg+xml', 'a.svg'), 'svg');
  assert.equal(realExt('video/quicktime', 'a'), 'mov');
  assert.equal(realExt('application/octet-stream', '_m/x/a.PNG?v=1'), 'png', 'unknown type: the name');
});

test('pickVideos: real files only, the best rendition, hidden ones too', () => {
  const v = (extra) => Object.assign({ file: '_m/x/v.mp4', contentType: 'video/mp4', bytes: 100, pages: ['home'], area: 'main', rendered: { w: 300, h: 500 } }, extra);
  const list = pickVideos({
    'https://x.com/v/abc.HD-1080p-2.5Mbps-1.mp4': v({ file: '_m/x/1080.mp4', bytes: 900 }),
    'https://x.com/v/abc.SD-480p-0.9Mbps-1.mp4': v({ file: '_m/x/480.mp4', bytes: 200 }),
    'https://x.com/hidden.webm': v({ file: '_m/x/hidden.webm', contentType: 'video/webm', hidden: true }),
    'https://x.com/seg0.ts': v({ file: '_m/x/seg0.ts', contentType: 'video/mp2t', segmentOf: 'master' }),
    'https://x.com/seg1.mp4': v({ file: '_m/x/seg1.mp4', segmentOf: 'master' }),
    'https://x.com/master.m3u8': v({ file: '_m/x/master.m3u8', contentType: 'application/vnd.apple.mpegurl', stream: true }),
    'https://x.com/photo.jpg': v({ contentType: 'image/jpeg' }),
  });
  assert.deepEqual(list.map((i) => i.file).sort(), ['_m/x/1080.mp4', '_m/x/hidden.webm']);
});

test('plan: a group and a unique name for everything', () => {
  const p = plan({
    'https://x.com/a/photo.jpg': img({ file: '_m/a' }),
    'https://y.com/b/photo.jpg': img({ file: '_m/b', hidden: true }),
    'https://z.com/c/photo.jpg': img({ file: '_m/c' }),
    'https://x.com/clip.mp4': img({ file: '_m/clip', contentType: 'video/mp4', bytes: 9000, hidden: true }),
    'https://x.com/clip2.mp4': img({ file: '_m/clip2', contentType: 'video/mp4', bytes: 9000, gallery: true, rendered: { w: 30, h: 30 } }),
    'https://x.com/clip3.mp4': img({ file: '_m/clip3', contentType: 'video/mp4', bytes: 9000, rendered: { w: 30, h: 30 } }),
  });
  assert.deepEqual(p.images.map((i) => i.group + '/' + i.name).sort(), ['hidden/photo', 'sections/photo', 'sections/photo-2']);
  assert.deepEqual(p.videos.map((i) => i.group + '/' + i.name).sort(), ['gallery/clip2', 'hidden/clip', 'sections/clip3']);
});
