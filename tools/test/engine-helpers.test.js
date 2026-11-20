'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');
const H = require('../lib/engine-helpers');
const { tmpDir, runNode } = require('./helpers');

test('the preview registers exactly the engine helpers (no more: a theme must not preview with a helper the store lacks)', () => {
  const hb = Handlebars.create();
  const before = new Set(Object.keys(hb.helpers));
  H.register(hb);
  const added = Object.keys(hb.helpers).filter((k) => !before.has(k)).sort();
  assert.deepEqual(added, [...H.ENGINE].sort());
});

test('"contains" is not an engine helper (it took a live store down with a 500, 2026-11-20); isColorGroup is', () => {
  assert.equal(H.NAMES.has('contains'), false);
  assert.equal(H.NAMES.has('isColorGroup'), true);
  const hb = Handlebars.create();
  H.register(hb);
  assert.throws(() => hb.compile('{{#if (contains name "olo")}}x{{/if}}')({ name: 'Color' }), /Missing helper: "contains"/);
  assert.equal(hb.compile('{{#if (isColorGroup name)}}c{{else}}s{{/if}}')({ name: 'Colour' }), 'c');
  assert.equal(hb.compile('{{#if (isColorGroup name)}}c{{else}}s{{/if}}')({ name: 'Size' }), 's');
});

test('pack.js: a helper the engine lacks is an error, an engine helper is not', async () => {
  const dir = tmpDir('pack-helpers-');
  const put = (rel, body) => { const f = path.join(dir, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, body); };
  put('theme.json', JSON.stringify({ name: 'Helpers', version: '1', engine: 'handlebars', schemaVersion: 2, entry: 'templates/product.hbs' }));
  put('templates/product.hbs', '<p>product</p>');
  put('snippets/bad.hbs', '{{#each variants}}{{#if (contains name "olo")}}<span>{{name}}</span>{{/if}}{{/each}}');
  put('snippets/good.hbs', '{{#each variants}}{{#if (isColorGroup name)}}<span>{{name}}</span>{{/if}}{{/each}}');
  const r = await runNode([path.join(__dirname, '..', 'pack.js'), dir, '--no-zip']);
  assert.match(r.stdout, /snippets\/bad\.hbs: helper "contains" is not provided by the platform engine/);
  assert.doesNotMatch(r.stdout, /snippets\/good\.hbs: helper/);
});
