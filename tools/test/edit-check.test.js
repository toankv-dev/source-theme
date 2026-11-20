'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { tmpDir, runNode, ROOT } = require('./helpers');

const CLI = path.join(ROOT, 'tools', 'edit-check.js');

function baseCopy() {
  const d = path.join(tmpDir('edit-check-'), 'theme');
  fs.cpSync(path.join(ROOT, 'base-theme'), d, { recursive: true });
  return d;
}
const port = (d) => JSON.parse(fs.readFileSync(path.join(d, '_work', 'preview.json'), 'utf8')).port;

test('edit-check measures a part at desktop and phone widths, reuses its preview and packs', async (t) => {
  const d = baseCopy();
  t.after(() => runNode([CLI, d, '--stop']));
  const r = await runNode([CLI, d, '--selector', '#addToCart']);
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /preview started/);
  assert.match(r.stdout, /^ 1440 {2}#addToCart.* box \d+,\d+ \d+×\d+ · /m);
  assert.match(r.stdout, /^ {2}360 {2}#addToCart/m);
  assert.match(r.stdout, /360: no sideways scroll/);
  assert.match(r.stdout, /^pack {3}0 errors/m);
  assert.ok(r.stdout.split('\n').length <= 25);
  const pid = JSON.parse(fs.readFileSync(path.join(d, '_work', 'preview.json'), 'utf8')).pid;
  const again = await runNode([CLI, d, '--selector', '#addToCart', '--widths', '360', '--eval', 'document.querySelectorAll("#addToCart").length']);
  assert.equal(again.code, 0, again.stdout + again.stderr);
  assert.match(again.stdout, new RegExp(`preview running, pid ${pid}`));
  assert.match(again.stdout, /^eval {3}360: 1$/m);
});

test('an edit shows without a restart; sideways scroll on a phone and a missing part are problems (exit 1)', async (t) => {
  const d = baseCopy();
  t.after(() => runNode([CLI, d, '--stop']));
  assert.equal((await runNode([CLI, d, '--widths', '360'])).code, 0);
  fs.appendFileSync(path.join(d, 'assets', 'css', 'skin.css'), '\nbody { min-width: 800px; }\n');
  const r = await runNode([CLI, d, '--widths', '360', '--selector', '.no-such-part']);
  assert.equal(r.code, 1, r.stdout + r.stderr);
  assert.match(r.stdout, /preview running/);
  assert.match(r.stdout, /\.no-such-part: not found/);
  assert.match(r.stdout, /360: SIDEWAYS SCROLL \d+px/);
});

test('--ref prints only the styles that differ from the original; --shot makes one picture per width', async (t) => {
  const d = baseCopy();
  t.after(() => runNode([CLI, d, '--stop']));
  await runNode([CLI, d, '--widths', '360']);
  const ref = `http://127.0.0.1:${port(d)}/product`;
  const same = await runNode([CLI, d, '--widths', '360', '--selector', '#addToCart', '--ref', ref, '--shot']);
  assert.equal(same.code, 0, same.stdout + same.stderr);
  assert.match(same.stdout, /^ref {4}360: same styles · size \d+×\d+ vs \d+×\d+/m);
  assert.ok(fs.existsSync(path.join(d, '_work', 'check', 'addtocart-vs-ref-360.png')));
  assert.match(same.stdout, /^shot {3}.*addtocart-vs-ref-360\.png/m);
  const other = await runNode([CLI, d, '--widths', '360', '--selector', '#addToCart', '--ref', ref, '--ref-selector', 'body']);
  assert.match(other.stdout, /^ref {4}360: .* vs /m);
  assert.doesNotMatch(other.stdout, /same styles/);
});

test('--stop stops the preview of the theme', async () => {
  const d = baseCopy();
  await runNode([CLI, d, '--widths', '360']);
  const st = JSON.parse(fs.readFileSync(path.join(d, '_work', 'preview.json'), 'utf8'));
  const r = await runNode([CLI, d, '--stop']);
  assert.match(r.stdout, /preview stopped/);
  assert.ok(!fs.existsSync(path.join(d, '_work', 'preview.json')));
  await new Promise((ok) => setTimeout(ok, 500));
  assert.throws(() => process.kill(st.pid, 0), 'the server process is gone');
});
