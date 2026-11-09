'use strict';
const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { startFixture, tmpDir, runNode } = require('./helpers');

const TOOL = path.join(__dirname, '..', 'download-page.js');
const LONG = { timeout: 300000 };

describe('download-page.js on the fake store', LONG, () => {
  let fx;
  let theme;
  let site;
  let first;
  let logAfterFirst;
  const rel = (u) => u.replace(fx.origin, '');
  const assetsByPath = () => {
    const a = JSON.parse(fs.readFileSync(path.join(site, 'assets.json'), 'utf8'));
    return Object.fromEntries(Object.entries(a).map(([u, r]) => [rel(u), r]));
  };

  before(async () => {
    fx = await startFixture();
    theme = tmpDir('download-page-');
    site = path.join(theme, '_work', 'site');
    first = await runNode([TOOL, fx.origin + '/products/fixture-tee', theme, '--no-capture']);
    logAfterFirst = fx.log.slice();
  });
  after(() => fx.close());

  test('pass 1: only the page of the link is downloaded', () => {
    assert.equal(first.code, 0, first.stdout + first.stderr);
    const docs = logAfterFirst.filter((l) => l.dest === 'document').map((l) => l.path);
    assert.deepEqual(Array.from(new Set(docs)), ['/products/fixture-tee']);
    assert.ok(!logAfterFirst.some((l) => l.path === '/' && ['document', 'fetch'].includes(l.dest)), 'the home page is never fetched');
    for (const f of ['index.html', 'mobile.html', 'desktop.png', 'mobile.png']) assert.ok(fs.existsSync(path.join(site, 'pages', 'product', f)), f);
    assert.ok(!fs.existsSync(path.join(site, 'pages', 'home')));
  });

  test('pass 1: the offline HTML has no page scripts, no on* attributes, empty frames, local links', () => {
    for (const f of ['index.html', 'mobile.html']) {
      const html = fs.readFileSync(path.join(site, 'pages', 'product', f), 'utf8');
      const scripts = Array.from(html.matchAll(/<script\b[^>]*>/g)).map((m) => m[0]);
      assert.deepEqual(scripts, ['<script type="application/ld+json">'], f);
      assert.doesNotMatch(html, /\son[a-z]+=/i, f);
      assert.match(html, /<iframe src="about:blank"[^>]*data-orig-src="http:\/\/localhost:1\/embed\/abc"/);
      assert.doesNotMatch(html, /\s(src|srcset|poster|data-src)="(http|\/img|\/css|\/media|\/icons)/, f + ': every resource points at /_m/');
      assert.doesNotMatch(html, /<link rel="(stylesheet|icon)" href="(?!\/_m\/)/, f + ': stylesheets and icons point at /_m/');
      assert.match(html, /<link rel="canonical" href="http:\/\/127\.0\.0\.1:\d+\/products\/fixture-tee">/, 'other links stay absolute');
      assert.match(html, /<body class="ready"[\s>]/, 'what scripts did to the DOM is kept');
      assert.match(html, /<p class="price">\$29\.00<span class="installments" data-mirror-tag="div" style="display: block;">/,
        'a <div> a script put in a <p> becomes a <span> (the parser would close the <p>)');
    }
    const m = JSON.parse(fs.readFileSync(path.join(site, 'manifest.json'), 'utf8'));
    assert.ok(m.skipped.some((s) => s.url === 'http://localhost:1/embed/abc' && /embedded frame/.test(s.reason)));
  });

  test('pass 2: every image, video, stylesheet and font is in the copy', () => {
    const a = assetsByPath();
    const expected = [
      '/img/wash-bag.jpg', '/img/wash-bag.jpg?badge=1', '/icons/pay.svg',
      '/img/EEOB_-_WP1__96291.jpg?width=1600', // largest srcset candidate
      '/img/Sparkling_Spooky_Ghost_-_WP1__16228.jpg', // data-src in a hidden slide
      '/img/GGGC_-_WP1__70703.jpg', // lazy image in a hidden tab
      '/img/GGLL_-_WP1__34811.jpg', '/img/RRTL_-_WP1__71153.jpg', // <style> and style="" backgrounds
      '/img/EEOB_-_WP1__96291.jpg?hero=desktop', '/img/GGGC_-_WP1__70703.jpg?hero=mobile',
      '/img/Sparkling_Spooky_Ghost_-_WP1__16228.jpg?hero=xl', // a breakpoint neither pass showed
      '/img/RRTL_-_WP1__71153.jpg?poster=1', '/img/GGLL_-_WP1__34811.jpg?lazy=1',
      '/media/clip.webm', '/media/clip.mp4', '/css/main.css', '/css/extra.css', '/fonts/fixture.woff2', '/fonts/fixture-bold.woff2',
    ];
    for (const p of expected) {
      assert.ok(a[p], 'missing ' + p);
      assert.ok(fs.existsSync(path.join(site, a[p].file)), 'file of ' + p);
      assert.deepEqual(a[p].pages, ['product']);
    }
    assert.equal(a['/media/clip.mp4'].bytes, 64 * 1024, 'a video fetched in ranges is saved whole');
    assert.equal(a['/media/clip.webm'].contentType, 'video/webm');
    assert.equal(a['/img/wash-bag.jpg'].area, 'header');
    assert.equal(a['/icons/pay.svg'].area, 'footer');
    assert.equal(a['/img/EEOB_-_WP1__96291.jpg?width=1600'].area, 'main');
    assert.ok(a['/img/EEOB_-_WP1__96291.jpg?width=1600'].rendered.w > 300);
    const css = fs.readFileSync(path.join(site, a['/css/main.css'].file), 'utf8');
    assert.match(css, /@import "\/_m\/127\.0\.0\.1_\d+\/css\/extra\.css"/);
    assert.doesNotMatch(css, /url\(\.\.\//);
  });

  test('pass 3: the offline copy needs no network and looks the same', () => {
    const m = JSON.parse(fs.readFileSync(path.join(site, 'manifest.json'), 'utf8'));
    const page = m.pages.find((p) => p.name === 'product');
    for (const label of ['desktop', 'mobile']) {
      const c = page.check[label];
      assert.deepEqual(c.external, [], label + ' external');
      assert.deepEqual(c.notFound, [], label + ' 404');
      assert.ok(c.diff <= 1, label + ' differs ' + c.diff + ' %');
    }
    assert.match(first.stdout, /offline desktop: external 0, 404 0, differs/);
    assert.ok(page.counts.images >= 13 && page.counts.videos === 2 && page.counts.fonts === 2);
    assert.ok(!fs.existsSync(path.join(theme, '_work', 'capture')), '--no-capture');
  });

  test('a page name already downloaded is refused without --refresh', async () => {
    const r = await runNode([TOOL, fx.origin + '/products/fixture-tee', theme]);
    assert.equal(r.code, 1);
    assert.match(r.stderr, /already downloaded.*--refresh/);
  });

  test('capture.js runs on the offline copy (second product template)', async () => {
    const r = await runNode([TOOL, fx.origin + '/products/fixture-tee', theme, '--name', 'product-alt']);
    assert.equal(r.code, 0, r.stdout + r.stderr);
    const cap = path.join(theme, '_work', 'capture', 'product-alt');
    for (const f of ['tokens.json', 'sections.json', 'text.txt', 'fonts.json', 'fonts/fixture.woff2']) assert.ok(fs.existsSync(path.join(cap, f)), f);
    assert.ok(!fs.existsSync(path.join(cap, 'images')), 'product pages are captured with --no-images');
    const tokens = JSON.parse(fs.readFileSync(path.join(cap, 'tokens.json'), 'utf8'));
    assert.match(tokens.desktop.body.fontFamily, /Fixture Sans/);
    const m = JSON.parse(fs.readFileSync(path.join(site, 'manifest.json'), 'utf8'));
    assert.deepEqual(m.pages.map((p) => p.name).sort(), ['product', 'product-alt']);
    assert.deepEqual(assetsByPath()['/img/wash-bag.jpg'].pages.sort(), ['product', 'product-alt']);
  });

  test('a bot-check page: one retry per viewport, then exit 2 with a hint', async () => {
    const t2 = tmpDir('download-blocked-');
    const before = fx.log.length;
    const r = await runNode([TOOL, fx.origin + '/blocked', t2]);
    assert.equal(r.code, 2, r.stdout + r.stderr);
    assert.match(r.stderr, /new-theme/);
    const hits = fx.log.slice(before).filter((l) => l.path === '/blocked' && l.dest === 'document');
    assert.equal(hits.length, 4, '2 viewports × (1 try + 1 retry)');
    assert.ok(!fs.existsSync(path.join(t2, '_work', 'site', 'pages', 'page')));
  });
});

describe('download-page.js: every video of a page', LONG, () => {
  let fx;
  let site;
  let run;
  const rel = (u) => u.replace(/^http:\/\/127\.0\.0\.1:\d+/, '');
  let assets;

  before(async () => {
    fx = await startFixture();
    const theme = tmpDir('download-video-');
    site = path.join(theme, '_work', 'site');
    run = await runNode([TOOL, fx.origin + '/products/video-tee', theme, '--no-capture']);
    assets = Object.fromEntries(Object.entries(JSON.parse(fs.readFileSync(path.join(site, 'assets.json'), 'utf8'))).map(([u, r]) => [rel(u), r]));
  });
  after(() => fx.close());

  test('videos in a <template>, in JSON and behind a link are downloaded, with where they came from', () => {
    assert.equal(run.code, 0, run.stdout + run.stderr);
    for (const [p, via] of [['/media/tpl.mp4', 'template'], ['/media/json.mp4', 'json'], ['/media/link.mp4', 'link']]) {
      assert.ok(assets[p], 'missing ' + p);
      assert.equal(assets[p].via, via, p);
      assert.ok(fs.existsSync(path.join(site, assets[p].file)), 'file of ' + p);
      assert.equal(assets[p].bytes, 64 * 1024);
    }
    const html = fs.readFileSync(path.join(site, 'pages', 'product', 'index.html'), 'utf8');
    assert.match(html, /<template><video[^>]*><source src="\/_m\/127\.0\.0\.1_\d+\/media\/tpl\.mp4"/, 'links inside <template> point at /_m/');
  });

  test('a Shopify-named HLS stream becomes the MP4 of its best rendition, with its poster', () => {
    const mp4 = assets['/videos/c/vp/abc/abc.HD-720p-1.6Mbps-123.mp4'];
    assert.ok(mp4, 'the best rendition (720p, not 480p) as one MP4');
    assert.equal(mp4.via, 'stream');
    assert.match(mp4.stream, /\/videos\/c\/vp\/abc\/abc\.m3u8$/);
    assert.match(mp4.poster, /RRTL_-_WP1__71153\.jpg\?poster=2$/);
    assert.ok(!assets['/videos/c/vp/abc/abc.SD-480p-0.9Mbps-123.mp4']);
    const html = fs.readFileSync(path.join(site, 'pages', 'product', 'index.html'), 'utf8');
    assert.match(html, /<source src="\/_m\/127\.0\.0\.1_\d+\/videos\/c\/vp\/abc\/abc\.HD-720p-1\.6Mbps-123\.mp4" type="video\/mp4">/, 'the HLS <source> plays the MP4 offline');
  });

  test('a plain HLS stream played from a blob: keeps its playlists (local links) and segments', () => {
    const master = assets['/media/plain/master.m3u8'];
    assert.ok(master, 'caught on the network although the DOM only has a blob:');
    assert.equal(master.stream, true);
    assert.equal(master.segments, 2);
    for (const p of ['/media/plain/seg0.ts', '/media/plain/seg1.ts', '/media/plain/media.m3u8']) assert.ok(assets[p] && assets[p].segmentOf, p);
    const media = fs.readFileSync(path.join(site, assets['/media/plain/media.m3u8'].file), 'utf8');
    assert.match(media, /^\/_m\/127\.0\.0\.1_\d+\/media\/plain\/seg0\.ts$/m);
    const m = JSON.parse(fs.readFileSync(path.join(site, 'manifest.json'), 'utf8'));
    assert.ok(!m.skipped.some((s) => /\.m3u8/.test(s.url)), 'no stream left in skipped');
  });

  test('the summary lists every video; the offline copy still needs no network', () => {
    assert.equal((run.stdout.match(/^ {2}video /gm) || []).length, 4, run.stdout);
    assert.match(run.stdout, /^ {2}stream 2 segments/m);
    const page = JSON.parse(fs.readFileSync(path.join(site, 'manifest.json'), 'utf8')).pages[0];
    assert.equal(page.counts.videos, 4);
    assert.equal(page.counts.streams, 1);
    for (const label of ['desktop', 'mobile']) {
      assert.deepEqual(page.check[label].external, [], label);
      assert.deepEqual(page.check[label].notFound, [], label);
      assert.ok(page.check[label].diff <= 1, label + ' ' + page.check[label].diff);
    }
  });
});

describe('download-page.js --refresh behind a bot check', LONG, () => {
  let fx;
  let theme;
  let pageDir;
  before(async () => {
    fx = await startFixture();
    theme = tmpDir('download-refresh-');
    pageDir = path.join(theme, '_work', 'site', 'pages', 'fickle');
    const r = await runNode([TOOL, fx.origin + '/products/fickle-tee', theme, '--name', 'fickle', '--no-capture']);
    assert.equal(r.code, 0, r.stdout + r.stderr);
  });
  after(() => fx.close());

  test('a viewport blocked this time keeps its previous files', async () => {
    const before = fs.statSync(path.join(pageDir, 'desktop.png')).mtimeMs;
    fx.state.blockDesktop = true;
    const r = await runNode([TOOL, fx.origin + '/products/fickle-tee', theme, '--name', 'fickle', '--refresh', '--no-capture']);
    fx.state.blockDesktop = false;
    assert.equal(r.code, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /desktop: blocked, the previous download of this viewport is kept/);
    for (const f of ['index.html', 'desktop.png', 'mobile.html', 'mobile.png']) assert.ok(fs.existsSync(path.join(pageDir, f)), f);
    assert.equal(fs.statSync(path.join(pageDir, 'desktop.png')).mtimeMs, before, 'the old desktop screenshot');
    const m = JSON.parse(fs.readFileSync(path.join(theme, '_work', 'site', 'manifest.json'), 'utf8'));
    const page = m.pages.find((p) => p.name === 'fickle');
    assert.deepEqual(page.blocked, ['desktop']);
    assert.deepEqual(page.kept, ['desktop']);
    assert.ok(!fs.existsSync(pageDir + '.previous'));
  });

  test('blocked on both viewports: the previous download stays whole', async () => {
    fx.state.blockAll = true;
    const r = await runNode([TOOL, fx.origin + '/products/fickle-tee', theme, '--name', 'fickle', '--refresh', '--no-capture']);
    fx.state.blockAll = false;
    assert.equal(r.code, 2, r.stdout + r.stderr);
    assert.match(r.stderr, /previous download of "fickle" is kept/);
    for (const f of ['index.html', 'desktop.png', 'mobile.html', 'mobile.png']) assert.ok(fs.existsSync(path.join(pageDir, f)), f);
  });
});
