'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { tmpDir } = require('./helpers');
const { start } = require('../site-server');

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148';

function mini() {
  const site = path.join(tmpDir('site-server-'), '_work', 'site');
  const put = (rel, body) => { const f = path.join(site, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, body); };
  put('pages/product/index.html', '<p>desktop</p>');
  put('pages/product/mobile.html', '<p>mobile</p>');
  put('pages/home/index.html', '<p>home desktop only</p>');
  put('_m/cdn.x.com/a.css', 'body{}');
  put('_m/cdn.x.com/video/__index', Buffer.alloc(1000, 1));
  put('manifest.json', JSON.stringify({ pages: [{ name: 'product', url: 'https://x.com/products/a' }] }));
  put('assets.json', JSON.stringify({ 'https://cdn.x.com/video': { file: '_m/cdn.x.com/video/__index', contentType: 'video/mp4' } }));
  put('../secret.txt', 'secret');
  return site;
}

test('site-server serves the offline copy only', async (t) => {
  const s = await start({ siteDir: mini(), port: 0, log: false });
  t.after(() => s.close());
  const get = (p, headers) => fetch(s.origin + p, { headers });

  assert.equal(await (await get('/product')).text(), '<p>desktop</p>');
  assert.equal(await (await get('/product', { 'User-Agent': IPHONE })).text(), '<p>mobile</p>');
  assert.equal(await (await get('/product?view=mobile')).text(), '<p>mobile</p>');
  assert.equal(await (await get('/home', { 'User-Agent': IPHONE })).text(), '<p>home desktop only</p>', 'falls back to the other viewport');

  const css = await get('/_m/cdn.x.com/a.css');
  assert.equal(css.headers.get('content-type'), 'text/css');
  const vid = await get('/_m/cdn.x.com/video/__index');
  assert.equal(vid.headers.get('content-type'), 'video/mp4', 'content-type from assets.json for a file without extension');

  const part = await get('/_m/cdn.x.com/video/__index', { Range: 'bytes=0-99' });
  assert.equal(part.status, 206);
  assert.equal((await part.arrayBuffer()).byteLength, 100);
  assert.equal(part.headers.get('content-range'), 'bytes 0-99/1000');

  assert.equal((await get('/_m/../../secret.txt')).status, 404);
  assert.equal((await get('/_m/%2e%2e/%2e%2e/secret.txt')).status, 404);
  assert.equal((await get('/https://x.com/other.js')).status, 404);
  assert.equal((await get('/favicon.ico')).status, 204);
  assert.ok(s.stats.notFound.length >= 3);
  assert.match(await (await get('/')).text(), /href="\/product"/);
});
