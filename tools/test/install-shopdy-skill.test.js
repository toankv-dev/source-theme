'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { tmpDir, runNode, ROOT } = require('./helpers');
const { install, defaultTarget } = require('../install-shopdy-skill');

const put = (file, body) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, body); };
const read = (file) => fs.readFileSync(file, 'utf8');
const skillMd = (version) => `---\nname: demo\nmetadata:\n  version: "${version}"\n---\n# Demo\n`;

// A fake source-theme (shopdy-skills/demo) and a fake shopdy-promax checkout.
function fixture() {
  const root = tmpDir('shopdy-skill-src-');
  put(path.join(root, 'shopdy-skills', 'demo', 'SKILL.md'), skillMd('1.1.0'));
  put(path.join(root, 'shopdy-skills', 'demo', 'scripts', 'run.py'), 'print("v2")\n');
  put(path.join(root, 'shopdy-skills', 'demo', '.gitignore'), '_work/\n.env\n');
  put(path.join(root, 'shopdy-skills', 'not-a-skill', 'notes.md'), 'no SKILL.md here');
  const target = tmpDir('shopdy-promax-');
  put(path.join(target, 'package.json'), JSON.stringify({ name: 'adlux-promax' }));
  return { root, target, dest: path.join(target, '.claude', 'skills', 'demo') };
}

test('install copies the skill and later updates it without touching _work/ or .env', () => {
  const { root, target, dest } = fixture();

  const [first] = install({ root, target });
  assert.equal(first.skill, 'demo');
  assert.deepEqual(first.added.sort(), ['.gitignore', 'SKILL.md', 'scripts/run.py']);
  assert.equal(first.from, null);
  assert.equal(first.to, '1.1.0');
  assert.equal(read(path.join(dest, 'scripts', 'run.py')), 'print("v2")\n');
  assert.ok(!fs.existsSync(path.join(target, '.claude', 'skills', 'not-a-skill')), 'a folder without SKILL.md is not a skill');

  // That machine's own files, plus a file an older version had.
  put(path.join(dest, '_work', 'job1', 'state.json'), '{"pageId":"p1"}');
  put(path.join(dest, '.env'), 'SHOPDY_PASSWORD=secret');
  put(path.join(dest, 'scripts', '__pycache__', 'run.cpython.pyc'), 'x');
  put(path.join(dest, 'references', 'old.md'), 'gone in the new version');
  put(path.join(dest, 'SKILL.md'), skillMd('1.0.0'));

  const [second] = install({ root, target });
  assert.equal(second.from, '1.0.0');
  assert.deepEqual(second.updated, ['SKILL.md']);
  assert.deepEqual(second.removed, ['references/old.md']);
  assert.ok(!fs.existsSync(path.join(dest, 'references')), 'an emptied folder goes too');
  assert.equal(read(path.join(dest, '_work', 'job1', 'state.json')), '{"pageId":"p1"}');
  assert.equal(read(path.join(dest, '.env')), 'SHOPDY_PASSWORD=secret');
  assert.ok(fs.existsSync(path.join(dest, 'scripts', '__pycache__', 'run.cpython.pyc')));

  const [third] = install({ root, target });
  assert.equal(third.added.length + third.updated.length + third.removed.length, 0);
  assert.equal(third.unchanged, 3);
});

test('--dry reports the plan and writes nothing', () => {
  const { root, target, dest } = fixture();
  const [r] = install({ root, target, dry: true });
  assert.equal(r.added.length, 3);
  assert.ok(!fs.existsSync(dest));
});

test('install refuses a folder that is not shopdy-promax and a linked skill folder', () => {
  const { root, target, dest } = fixture();
  const other = tmpDir('not-shopdy-');
  put(path.join(other, 'package.json'), JSON.stringify({ name: 'adlux-theme-tools' }));
  assert.throws(() => install({ root, target: other }), /not a shopdy-promax checkout/);
  assert.throws(() => install({ root, target: tmpDir('empty-') }), /package.json name is missing/);

  const elsewhere = tmpDir('link-target-');
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.symlinkSync(elsewhere, dest, 'junction');
  assert.throws(() => install({ root, target }), /is a link/);
  assert.equal(fs.readdirSync(elsewhere).length, 0, 'nothing written through the link');
});

test('no folder given: $SHOPDY_PROMAX_DIR, else the shopdy-promax folder the command runs in, else ../shopdy-promax', () => {
  const { target } = fixture();
  const elsewhere = tmpDir('cwd-not-shopdy-');
  assert.equal(defaultTarget(elsewhere, { SHOPDY_PROMAX_DIR: target }), path.resolve(target));
  assert.equal(defaultTarget(target, {}), path.resolve(target));
  assert.equal(defaultTarget(elsewhere, {}), path.join(ROOT, '..', 'shopdy-promax'));
});

test('typed inside shopdy-promax with the full path of the script, it installs there', async () => {
  const target = tmpDir('shopdy-promax-cwd-');
  put(path.join(target, 'package.json'), JSON.stringify({ name: 'adlux-promax' }));
  const env = Object.assign({}, process.env);
  delete env.SHOPDY_PROMAX_DIR;
  const res = await runNode([path.join(ROOT, 'tools', 'install-shopdy-skill.js'), '--skill', 'store-page-from-link'], { cwd: target, env });
  assert.equal(res.code, 0, res.stderr);
  assert.ok(fs.existsSync(path.join(target, '.claude', 'skills', 'store-page-from-link', 'SKILL.md')));
});

test('the CLI installs the real store-page-from-link skill of this repo', async () => {
  const target = tmpDir('shopdy-promax-cli-');
  put(path.join(target, 'package.json'), JSON.stringify({ name: 'adlux-promax' }));
  const res = await runNode([path.join(ROOT, 'tools', 'install-shopdy-skill.js'), target, '--skill', 'store-page-from-link']);
  assert.equal(res.code, 0, res.stderr);
  const dest = path.join(target, '.claude', 'skills', 'store-page-from-link');
  for (const f of ['SKILL.md', 'scripts/shopdy.py', 'scripts/fetch_competitor.py', 'scripts/_common.py',
    'references/shopdy-dev-workflow.md', '.env.example', '.gitignore']) {
    assert.ok(fs.existsSync(path.join(dest, f)), `${f} installed`);
  }
  assert.ok(!fs.existsSync(path.join(dest, '.env')), 'no account file ships with the skill');
  assert.match(res.stdout, /store-page-from-link v1\.0\.0 \(new install\)/);
});
