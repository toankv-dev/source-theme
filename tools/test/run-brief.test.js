'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { tmpDir, runNode, ROOT } = require('./helpers');

const CLI = path.join(ROOT, 'tools', 'run-brief.js');

test('run-brief: the lines of the skills to read, then the state of a theme and the next step, in ≤ 40 lines', async () => {
  const none = await runNode([CLI]);
  assert.equal(none.code, 0, none.stderr);
  assert.match(none.stdout, /^read {5}new-theme\/SKILL\.md lines: Rules \d+-\d+ · Fonts and colours \d+-\d+ · Speed \d+-\d+/m);
  assert.match(none.stdout, /^read {5}new-theme\/RUNLOG\.md lines 1-\d+/m);
  assert.match(none.stdout, /none given: a new theme starts with node tools\/new-theme\.js/);

  const theme = path.join(tmpDir('run-brief-'), 'fx');
  fs.cpSync(path.join(ROOT, 'tools', 'fixtures', 'theme-map'), theme, { recursive: true });
  const r = await runNode([CLI, theme]);
  assert.equal(r.code, 0, r.stderr);
  const lines = r.stdout.trim().split('\n');
  assert.ok(lines.length <= 40);
  assert.match(r.stdout, /^map {6}no design map/m);
  assert.match(r.stdout, /^page {5}nothing downloaded yet/m);
  assert.match(r.stdout, /WARNING in _work \(not committed\): build-x\.js, patch-x\.js/);
  assert.match(r.stdout, /^next {5}download each link: node tools\/download-page\.js <url>/m);

  const missing = await runNode([CLI, path.join(theme, '..', 'nope')]);
  assert.match(missing.stdout, /does not exist: node tools\/new-theme\.js/);
});
