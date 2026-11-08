'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const m = require('../lib/mirror');

test('localPath keeps the host, so host checks still match', () => {
  assert.match(m.localPath('https://fonts.gstatic.com/s/inter/v12/abc.woff2'), /^_m\/fonts\.gstatic\.com\/s\/inter\/v12\/abc\.woff2$/);
  const g = m.localPath('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap');
  assert.match(g, /fonts\.googleapis\.com/);
  assert.match(g, /family=Inter/);
});

test('localPath: no collisions between /a and /a/b, query before the extension', () => {
  const a = m.localPath('https://x.com/a');
  const ab = m.localPath('https://x.com/a/b.css');
  assert.equal(a, '_m/x.com/a/__index');
  assert.equal(ab, '_m/x.com/a/b.css');
  assert.equal(m.localPath('https://x.com/'), '_m/x.com/__index');
  assert.equal(m.localPath('https://cdn.x.com/f/a.jpg?v=12&width=800'), '_m/cdn.x.com/f/a__v=12_width=800.jpg');
});

test('localPath is Windows-safe and short', () => {
  const p = m.localPath('http://127.0.0.1:8080/con/a:b|c*.png?x="1"');
  assert.doesNotMatch(p.replace(/^_m\//, ''), /[<>:"|?*\\]/);
  assert.match(p, /^_m\/127\.0\.0\.1_8080\/_con\//);
  const long = 'https://x.com/' + 'seg/'.repeat(80) + 'img.jpg?' + 'q=1&'.repeat(50);
  const lp = m.localPath(long);
  assert.ok(lp.length <= 200, lp.length);
  assert.equal(lp, m.localPath(long));
  assert.match(lp, /\.jpg$/);
  assert.notEqual(lp, m.localPath(long + 'z'));
});

test('localUrl percent-encodes what the file name keeps', () => {
  assert.equal(m.localUrl('https://x.com/a%20b/c.jpg'), '/_m/x.com/a%20b/c.jpg');
});

test('absUrl ignores data: / blob: / anchors / mailto:', () => {
  assert.equal(m.absUrl('img/a.png', 'https://x.com/p/q.html'), 'https://x.com/p/img/a.png');
  assert.equal(m.absUrl('//cdn.x.com/a.png', 'https://x.com/'), 'https://cdn.x.com/a.png');
  for (const u of ['data:image/png;base64,AA', 'blob:https://x.com/1', '#top', 'mailto:a@b.c', 'javascript:void(0)', '', null]) {
    assert.equal(m.absUrl(u, 'https://x.com/'), null);
  }
});

test('rewriteCss: url() in every quoting, @import, data: kept, URLs listed', () => {
  const css = '@import "extra.css";@import url(more.css);' +
    '.a{background:url(../img/a.png)}.b{background:url(\'b.jpg\')}.c{background:url("https://cdn.x.com/c.webp")}' +
    '.d{background:url(data:image/svg+xml;utf8,<svg></svg>)}.e{filter:url(#f)}' +
    '@font-face{src:url(/fonts/f.woff2) format("woff2")}';
  const r = m.rewriteCss(css, 'https://x.com/css/main.css');
  assert.match(r.css, /@import "\/_m\/x\.com\/css\/extra\.css"/);
  assert.match(r.css, /url\(\/_m\/x\.com\/css\/more\.css\)/);
  assert.match(r.css, /url\(\/_m\/x\.com\/img\/a\.png\)/);
  assert.match(r.css, /url\('\/_m\/x\.com\/css\/b\.jpg'\)/);
  assert.match(r.css, /url\("\/_m\/cdn\.x\.com\/c\.webp"\)/);
  assert.match(r.css, /url\(data:image\/svg\+xml;utf8,<svg><\/svg>\)/);
  assert.match(r.css, /url\(#f\)/);
  assert.deepEqual(r.urls.sort(), ['https://cdn.x.com/c.webp', 'https://x.com/css/b.jpg', 'https://x.com/css/extra.css',
    'https://x.com/css/more.css', 'https://x.com/fonts/f.woff2', 'https://x.com/img/a.png'].sort());
  assert.equal(m.rewriteCss(r.css, 'https://x.com/css/main.css').css, r.css, 'already rewritten URLs stay');
});

test('srcset: parse (commas in URLs), largest, rewrite keeping the given candidates', () => {
  const set = 'https://res.x.com/w_100,h_100/a.jpg 100w, https://res.x.com/w_800,h_800/a.jpg 800w, /b.jpg 400w';
  assert.equal(m.parseSrcset(set).length, 3);
  assert.equal(m.largestCandidate(set, 'https://x.com/'), 'https://res.x.com/w_800,h_800/a.jpg');
  assert.equal(m.largestCandidate('a.jpg 1x, a@2x.jpg 2x', 'https://x.com/'), 'https://x.com/a@2x.jpg');
  const out = m.rewriteSrcset(set, 'https://x.com/', ['https://res.x.com/w_800,h_800/a.jpg', 'https://x.com/b.jpg']);
  assert.equal(out, m.localUrl('https://res.x.com/w_800,h_800/a.jpg') + ' 800w, /_m/x.com/b.jpg 400w');
  assert.equal(m.rewriteSrcset('a.jpg', 'https://x.com/'), '/_m/x.com/a.jpg');
});

test('pageName maps the URL to the theme page', () => {
  const cases = {
    'https://s.com/': 'home', 'https://s.com/products/tee': 'product', 'https://s.com/collections/all/products/tee': 'product',
    'https://s.com/collections/all': 'collection', 'https://s.com/search?q=a': 'search', 'https://s.com/pages/contact': 'contact',
    'https://s.com/pages/track-your-order': 'tracking', 'https://s.com/policies/refund-policy': 'policy',
    'https://s.com/pages/about-us': 'page',
  };
  for (const [u, n] of Object.entries(cases)) assert.equal(m.pageName(u), n, u);
});

test('isBlocked spots bot checks only', () => {
  assert.ok(m.isBlocked({ status: 403 }));
  assert.ok(m.isBlocked({ status: 200, title: 'Just a moment...' }));
  assert.ok(m.isBlocked({ status: 200, title: 'Attention Required! | Cloudflare' }));
  assert.ok(m.isBlocked({ status: 200, title: 'x', text: 'Checking your browser before accessing' }));
  assert.ok(!m.isBlocked({ status: 200, title: 'Tee – Store', text: 'Add to cart' }));
  assert.ok(!m.isBlocked({ status: 404, title: 'Not found' }));
});

test('looksLikeMedia / isStream', () => {
  assert.ok(m.looksLikeMedia('//cdn.x.com/a.jpg?v=1'));
  assert.ok(m.looksLikeMedia('/files/clip.mp4'));
  assert.ok(!m.looksLikeMedia('lazyload'));
  assert.ok(!m.looksLikeMedia('{"a":"/x.jpg"}'));
  assert.ok(m.isStream('https://x.com/v/master.m3u8'));
  assert.ok(m.isStream('blob:https://x.com/abc'));
  assert.ok(!m.isStream('https://x.com/v/a.mp4'));
});

test('the same helpers run in the page with the same results', async () => {
  const { chromium } = require('playwright');
  const src = fs.readFileSync(path.join(__dirname, '..', 'lib', 'mirror.js'), 'utf8');
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.evaluate('(() => { const module = { exports: {} }; ' + src + '\n; window.__mirror = module.exports; })()');
    const urls = ['https://fonts.gstatic.com/s/a.woff2', 'http://127.0.0.1:9/a/b?x=1', 'https://x.com/' + 'y/'.repeat(120) + 'z.png'];
    const inPage = await page.evaluate((list) => list.map((u) => window.__mirror.localPath(u)), urls);
    assert.deepEqual(inPage, urls.map(m.localPath));
  } finally { await browser.close(); }
});
