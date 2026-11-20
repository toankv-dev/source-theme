'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { startFixture, tmpDir, runNode, ROOT } = require('./helpers');

const CLI = path.join(ROOT, 'tools', 'section-grab.js');

test('section-grab: one part of a page by its heading: summary, pictures, outline and its own media only', async (t) => {
  const store = await startFixture();
  t.after(() => store.close());
  const out = path.join(tmpDir('section-grab-'), 'out');
  const r = await runNode([CLI, store.origin + '/products/section-tee', '--heading', 'see them in MOTION', '--out', out]);
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.ok(r.stdout.trim().split('\n').length <= 8, r.stdout);
  assert.match(r.stdout, /media 3 videos, 0 pictures/);
  assert.match(r.stdout, /interactions: .*horizontal scroll with snap/);
  for (const f of ['section.md', 'section.json', 'outline.html', 'desktop.png', 'mobile.png', 'media.json', 'assets.json']) {
    assert.ok(fs.existsSync(path.join(out, f)), f);
  }
  const md = fs.readFileSync(path.join(out, 'section.md'), 'utf8');
  assert.match(md, /- h2 "See them in motion" · Arial 32px\/700 · line 40px · #222222 · center/);
  assert.match(md, /- "Shop now" · .* #ffffff on #790236 · radius 30px/);
  assert.match(md, /3 items, 3 per row/);
  assert.match(md, /## Media \(3 videos, 0 pictures\)/);
  assert.match(md, /autoplay loop muted playsinline · poster media\/001-clip1-poster\.jpg/);
  const media = JSON.parse(fs.readFileSync(path.join(out, 'media.json'), 'utf8'));
  assert.deepEqual(media.map((m) => m.file), ['media/001-clip1.mp4', 'media/002-clip2.mp4', 'media/003-clip3.mp4']);
  assert.ok(!JSON.stringify(media).includes('rose_tank'), 'nothing from another part of the page');
  assert.match(fs.readFileSync(path.join(out, 'outline.html'), 'utf8'), /<div class="track">/);
  assert.deepEqual([...new Set(store.documents())], ['/products/section-tee'], 'that one page only');
});

test('section-grab: a heading that is not on the page → exit 3 with the headings it has', async (t) => {
  const store = await startFixture();
  t.after(() => store.close());
  const out = path.join(tmpDir('section-grab-'), 'out');
  const r = await runNode([CLI, store.origin + '/products/section-tee', '--heading', 'Nope nope', '--out', out, '--desktop-only']);
  assert.equal(r.code, 3, r.stdout + r.stderr);
  assert.match(r.stderr, /Its headings: section tee · see them in motion · questions\?/);
  assert.ok(!fs.existsSync(path.join(out, 'section.json')));
});
