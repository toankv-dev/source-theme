'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { startFixture, tmpDir, runNode, ROOT } = require('./helpers');
const G = require('../lib/media-grab');
const { classify, plan } = require('../lib/media-pick');

const CLI = path.join(ROOT, 'tools', 'media-grab.js');
const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'fixtures', 'media-grab', 'grab-tee.json'), 'utf8'));

// ---- pure parts ---------------------------------------------------------------------------------------------------

test('target: the handle, the product data of that one product, the folder name', () => {
  assert.deepEqual(G.target('https://shape-curve.com/products/triple-zone?variant=45'), {
    origin: 'https://shape-curve.com', host: 'shape-curve.com', handle: 'triple-zone',
    productJs: 'https://shape-curve.com/products/triple-zone.js', outName: 'shape-curve.com-triple-zone' });
  assert.equal(G.target('https://x.com/en-gb/products/tee').productJs, 'https://x.com/en-gb/products/tee.js');
  const shopdy = G.target('https://vesnacharm.com/triple-zone-bodysuit?variant=5295');
  assert.deepEqual([shopdy.handle, shopdy.productJs], ['triple-zone-bodysuit', null]);
  assert.equal(G.target('https://x.com/').handle, 'home');
});

test('shopifyOriginal asks Shopify for the original size, other hosts stay as they are', () => {
  assert.equal(G.shopifyOriginal('https://s.com/cdn/shop/files/a_800x.jpg?v=3&width=400'), 'https://s.com/cdn/shop/files/a.jpg?v=3');
  assert.equal(G.shopifyOriginal('https://cdn.shopify.com/s/files/1/2/products/b_1024x1024@2x.png?v=1'), 'https://cdn.shopify.com/s/files/1/2/products/b.png?v=1');
  assert.equal(G.shopifyOriginal('https://x.com/img/a_800x.jpg?width=3'), 'https://x.com/img/a_800x.jpg?width=3');
});

test('productJsMedia and jsonMedia read the product data', () => {
  const p = G.productJsMedia(DATA, 'https://s.com/products/grab-tee');
  assert.deepEqual(p.images.map((i) => path.basename(new URL(i.url).pathname)), ['GGG_-_WP1__72064.webp', 'GGG_-_WP9__39297.webp', 'GGG_-_WP5__22402.webp']);
  assert.deepEqual(p.variantImages.map((v) => v.variant), ['Red', 'Blue']);
  assert.deepEqual(p.videos, [{ url: 'https://s.com/videos/c/vp/abc/abc.m3u8', stream: true, poster: 'https://s.com/img/Flickering_Flame_Lantern_-_WP1__35019.jpg' }]);
  assert.deepEqual(p.external, ['youtube']);
  const ld = G.jsonMedia('{"@context":"https://schema.org","@type":"Product","image":["/a.jpg"],"offers":{"image":"/no.jpg"}}', 'ld', 'https://s.com/p');
  assert.deepEqual(ld, [{ url: 'https://s.com/a.jpg', gallery: true, variant: false }]);
  const v = G.jsonMedia('[{"id":"a1","featured_image":"/img/a.jpg"},{"id":"a2","featured_image":"/img/b.jpg"}]', 'variants', 'https://s.com/p');
  assert.deepEqual(v.map((x) => [x.url, x.variant]), [['https://s.com/img/a.jpg', true], ['https://s.com/img/b.jpg', true]]);
  assert.equal(G.jsonMedia('{"product":' + JSON.stringify(DATA) + '}', 'product', 'https://s.com/').length, 5);
  assert.deepEqual(G.jsonMedia('{not json', 'ld', 'https://s.com/'), []);
});

test('media-pick: the variant / description / review flags pick the group, and survive the deduplication', () => {
  assert.equal(classify({ url: 'https://s.com/a.jpg', variant: true }), 'variants');
  assert.equal(classify({ url: 'https://s.com/a.jpg', variant: true, gallery: true }), 'gallery');
  assert.equal(classify({ url: 'https://s.com/a.jpg', description: true, rendered: { w: 600, h: 300 } }), 'description');
  assert.equal(classify({ url: 'https://s.com/a.jpg', review: true }), 'reviews');
  assert.equal(classify({ url: 'https://s.com/a.jpg', review: true, gallery: true }), 'gallery', 'a product picture also shown in the reviews');
  const p = plan({
    'https://s.com/f/a.jpg?w=1': { file: 'x', contentType: 'image/jpeg', bytes: 900, variant: true },
    'https://s.com/f/a.jpg?w=2': { file: 'y', contentType: 'image/jpeg', bytes: 5000 },
  });
  assert.deepEqual(p.images.map((i) => [i.group, i.bytes]), [['variants', 5000]], 'the heavier copy, with the flag of the lighter one');
});

test('summary fits 30 lines', () => {
  const images = Array.from({ length: 50 }, (_, i) => ({ group: i % 2 ? 'gallery' : 'sections', bytes: 1000 }));
  const lines = G.summary({ url: 'https://s.com/p', out: 'downloads/x', store: 'shopify', productData: { images: 3, videos: 1 }, blocked: [],
    images, videos: [{ group: 'gallery', bytes: 9, via: 'stream' }], skipped: { pixels: 1, duplicates: 4, youtube: 0 },
    notes: Array.from({ length: 40 }, (_, i) => 'note ' + i), list: 'downloads/x/media.json' });
  assert.ok(lines.length <= 30);
  assert.match(lines.join('\n'), /images {6}50 files .* sections 25 · gallery 25/);
  assert.match(lines.join('\n'), /videos {6}1 files .* \(1 ← m3u8\)/);
  assert.match(lines.join('\n'), /skipped {5}pixels 1 · duplicates 4/);
});

// ---- the command, on the fake store -------------------------------------------------------------------------------

const groupsOf = (list) => list.reduce((o, e) => { o[e.group] = (o[e.group] || 0) + 1; return o; }, {});
const pages = (log) => log.filter((l) => /^\/(products\/|shopdy-)/.test(l.path)).map((l) => l.path);

test('a Shopify-like product page: every picture and video, grouped, named in page order, nothing else requested', async (t) => {
  const store = await startFixture();
  t.after(() => store.close());
  const out = path.join(tmpDir('media-grab-'), 'out');
  const r = await runNode([CLI, store.origin + '/products/grab-tee?variant=11', '--out', out]);
  assert.equal(r.code, 0, r.stdout + r.stderr);
  const lines = r.stdout.trim().split('\n');
  assert.ok(lines.length <= 30, r.stdout);
  assert.match(r.stdout, /store {7}shopify · product data: 3 images, 1 videos/);
  assert.match(r.stdout, /pixels 1/);
  assert.match(r.stdout, /youtube \/ vimeo 1/);

  const list = JSON.parse(fs.readFileSync(path.join(out, 'media.json'), 'utf8'));
  const images = list.filter((e) => e.kind === 'image');
  const videos = list.filter((e) => e.kind === 'video');
  assert.deepEqual(groupsOf(images), { gallery: 2, variants: 1, description: 1, sections: 2, icons: 1, reviews: 1, brand: 2 });
  assert.deepEqual(groupsOf(videos), { gallery: 1 });
  const front = images.find((e) => /GGG_-_WP1__72064/.test(e.url));
  assert.equal(front.group, 'gallery');
  assert.doesNotMatch(front.url, /width=/, 'the original size');
  assert.equal(images.find((e) => /GGG_-_WP5/.test(e.url)).variant, 'Red');
  assert.ok(images.some((e) => /Rosewood/.test(e.url)), 'the picture only the phone shows');
  for (const e of list) assert.ok(fs.existsSync(path.join(out, e.file)), e.file);
  assert.match(front.file, /^images\/gallery\/\d{3}-ggg_-_wp1__72064\.webp$/);
  const [video] = videos;
  assert.deepEqual([video.via, path.extname(video.file)], ['stream', '.mp4']);
  assert.ok(video.poster && fs.existsSync(path.join(out, video.poster)), 'the poster sits next to its video');
  assert.ok(!images.some((e) => /Flickering_Flame/.test(e.url)), 'a poster is not counted as a picture');

  // one page: the document (desktop + phone) and the product data of that one handle, nothing else of the store
  assert.deepEqual(store.documents(), ['/products/grab-tee?variant=11', '/products/grab-tee?variant=11']);
  assert.deepEqual([...new Set(pages(store.log))].sort(), ['/products/grab-tee.js', '/products/grab-tee?variant=11']);

  const again = await runNode([CLI, store.origin + '/products/grab-tee', '--out', out]);
  assert.equal(again.code, 1);
  assert.match(again.stderr, /already .*--refresh/);
});

test('--desktop-only, --only and --max-mb', async (t) => {
  const store = await startFixture();
  t.after(() => store.close());
  const out = path.join(tmpDir('media-grab-'), 'out');
  const r = await runNode([CLI, store.origin + '/products/grab-tee', '--out', out, '--desktop-only', '--only', 'gallery,sections', '--max-mb', '0.05']);
  assert.equal(r.code, 0, r.stdout + r.stderr);
  const list = JSON.parse(fs.readFileSync(path.join(out, 'media.json'), 'utf8'));
  assert.ok(list.every((e) => ['gallery', 'sections'].includes(e.group)), JSON.stringify(list.map((e) => e.group)));
  assert.ok(!list.some((e) => /Rosewood/.test(e.url)), 'no phone pass');
  assert.ok(!list.some((e) => e.kind === 'video'), 'the 64 KB video is over 0.05 MB');
  assert.match(r.stdout, /too big \d+/);
  assert.equal(store.documents().length, 1);
  const refresh = await runNode([CLI, store.origin + '/products/grab-tee', '--out', out, '--desktop-only', '--refresh']);
  assert.equal(refresh.code, 0, refresh.stdout + refresh.stderr);
});

test('a shopdy-like page: the gallery of the page, the variants from #sf-variants-data, a section video', async (t) => {
  const store = await startFixture();
  t.after(() => store.close());
  const out = path.join(tmpDir('media-grab-'), 'out');
  const r = await runNode([CLI, store.origin + '/shopdy-dress?variant=a1', '--out', out, '--desktop-only']);
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /store {7}shopdy/);
  const list = JSON.parse(fs.readFileSync(path.join(out, 'media.json'), 'utf8'));
  assert.deepEqual(groupsOf(list.filter((e) => e.kind === 'image')), { gallery: 2, variants: 1, brand: 1 });
  assert.ok(list.find((e) => /rose_tank/.test(e.url)).group === 'variants');
  assert.deepEqual(list.filter((e) => e.kind === 'video').map((e) => [e.group, path.extname(e.file)]), [['sections', '.mp4']]);
  assert.ok(!store.log.some((l) => /\.js(\?|$)/.test(l.path) && /products/.test(l.path)), 'no Shopify product data for a shopdy page');
});

test('a page behind a bot check: exit 2, nothing written', async (t) => {
  const store = await startFixture();
  t.after(() => store.close());
  const out = path.join(tmpDir('media-grab-'), 'out');
  const r = await runNode([CLI, store.origin + '/products/grab-blocked', '--out', out]);
  assert.equal(r.code, 2, r.stdout + r.stderr);
  assert.ok(!fs.existsSync(path.join(out, 'media.json')));
});

test('--to-theme adds the media to a theme and keeps its library; a name taken by another picture is refused', async (t) => {
  const store = await startFixture();
  t.after(() => store.close());
  const theme = path.join(tmpDir('grab-theme-'), 'theme');
  fs.cpSync(path.join(ROOT, 'base-theme'), theme, { recursive: true, filter: (s) => !/[\\/]_map([\\/]|$)/.test(s) });
  const sha = (s) => require('crypto').createHash('sha1').update(s).digest('hex');
  const mapFile = path.join(theme, '_work', 'media-map.json');
  const old = path.join(theme, 'assets', 'images', 'tc-sections', 'old.webp');
  fs.mkdirSync(path.dirname(old), { recursive: true });
  fs.mkdirSync(path.dirname(mapFile), { recursive: true });
  fs.writeFileSync(old, 'old');
  const oldEntry = { url: 'https://old.test/old.jpg', kind: 'image', group: 'sections', name: 'old', shipped: 'assets/images/tc-sections/old.webp', sha1: sha('old'), source: 'x', bytes: 3 };
  fs.writeFileSync(mapFile, JSON.stringify([oldEntry]));

  const out = path.join(theme, '_work', 'grab', 'shopdy');
  const r = await runNode([CLI, store.origin + '/shopdy-dress', '--out', out, '--desktop-only', '--to-theme', theme, '--prefix', 'gr']);
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /media library: 4 images → assets\/images\/gr-\*/);
  assert.ok(fs.readdirSync(path.join(theme, 'assets', 'images', 'gr-gallery')).some((f) => f.endsWith('.webp')));
  assert.ok(fs.readdirSync(path.join(theme, 'assets', 'videos', 'gr-sections')).some((f) => f.endsWith('.mp4')));
  const map = JSON.parse(fs.readFileSync(mapFile, 'utf8'));
  assert.ok(map.some((e) => e.shipped === oldEntry.shipped) && fs.existsSync(old), 'the earlier library stays');
  assert.ok(map.some((e) => /^assets\/images\/gr-variants\//.test(e.shipped)));
  assert.ok(fs.existsSync(path.join(theme, '_work', 'images', 'gr-gallery')), 'its originals under <prefix>-<group>');
  const pack = await runNode([path.join(ROOT, 'tools', 'pack.js'), theme, '--no-zip']);
  assert.match(pack.stdout, /: 0 errors/);

  fs.writeFileSync(mapFile, JSON.stringify([{ ...oldEntry, url: 'https://other.test/wine_red.jpg', group: 'gallery', name: 'wine_red', shipped: 'assets/images/tc-gallery/wine_red.webp' }]));
  const taken = await runNode([path.join(ROOT, 'tools', 'media-library.js'), theme, '--from', out, '--prefix', 'tc', '--no-sheet']);
  assert.equal(taken.code, 1);
  assert.match(taken.stderr, /already taken .*tc-gallery\/wine_red\.webp/);
});
