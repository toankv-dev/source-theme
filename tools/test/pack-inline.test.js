'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { tmpDir, runNode } = require('./helpers');

// A theme whose sections use {{#*inline "name"}} partials (Handlebars inline partials, file-scoped), like Lunara Black.
function theme() {
  const dir = tmpDir('pack-inline-');
  const put = (rel, body) => { const f = path.join(dir, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, body); };
  put('theme.json', JSON.stringify({ name: 'Inline', version: '1', engine: 'handlebars', schemaVersion: 2, entry: 'templates/product.hbs' }));
  put('templates/product.hbs', '<p>product</p>');
  put('sections/own.hbs', '{{#*inline "lu_part"}}<b>{{title}}</b>{{/inline}}<div>{{> lu_part}}</div>');
  put('sections/other.hbs', '<div>{{> lu_part}}</div>');
  put('sections/missing.hbs', '<div>{{> nowhere}}</div>');
  return dir;
}

test('pack.js: an inline partial declared in the same file counts as present', async () => {
  const r = await runNode([path.join(__dirname, '..', 'pack.js'), theme(), '--no-zip']);
  assert.doesNotMatch(r.stdout, /sections\/own\.hbs: partial "lu_part" not found/);
});

test('pack.js: an inline partial of another file does not count', async () => {
  const r = await runNode([path.join(__dirname, '..', 'pack.js'), theme(), '--no-zip']);
  assert.match(r.stdout, /sections\/other\.hbs: partial "lu_part" not found/);
});

test('pack.js: a partial that exists nowhere is still an error', async () => {
  const r = await runNode([path.join(__dirname, '..', 'pack.js'), theme(), '--no-zip']);
  assert.match(r.stdout, /sections\/missing\.hbs: partial "nowhere" not found/);
});
