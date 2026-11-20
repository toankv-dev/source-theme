'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { tmpDir, runNode, ROOT } = require('./helpers');

const CLI = path.join(ROOT, 'tools', 'platform-guide-check.js');

test('platform-guide-check names the entries whose shopdy sources changed or went missing', async () => {
  const shopdy = tmpDir('shopdy-');
  fs.mkdirSync(path.join(shopdy, 'apps', 'ui'), { recursive: true });
  fs.writeFileSync(path.join(shopdy, 'apps', 'menu.tsx'), 'Discounts');
  fs.writeFileSync(path.join(shopdy, 'apps', 'ui', 'a.tsx'), 'Drag to reorder');
  const dir = tmpDir('guide-');
  const guide = path.join(dir, 'platform-guide.md');
  fs.writeFileSync(guide, '# Guide\n\n## Admin menu\nDiscounts.\nNguồn: apps/menu.tsx\n\n## Theme editor\nDrag.\nNguồn: apps/ui/, apps/menu.tsx\n\n## No source\nText.\n');
  const run = (...a) => runNode([CLI, '--guide', guide, '--shopdy', shopdy, ...a]);

  const up = await run('--update');
  assert.equal(up.code, 0, up.stdout + up.stderr);
  assert.match(up.stdout, /3 entries, 2 sources recorded/);
  assert.ok(fs.existsSync(path.join(dir, 'platform-guide.sources.json')));
  const same = await run();
  assert.equal(same.code, 0);
  assert.match(same.stdout, /nothing changed/);

  fs.writeFileSync(path.join(shopdy, 'apps', 'ui', 'a.tsx'), 'Drag the handle');
  const one = await run();
  assert.equal(one.code, 1);
  assert.match(one.stdout, /1 of 3 entries to re-check/);
  assert.match(one.stdout, /Theme editor: apps\/ui\//);
  assert.doesNotMatch(one.stdout, /Admin menu/);

  fs.rmSync(path.join(shopdy, 'apps', 'menu.tsx'));
  const gone = await run();
  assert.match(gone.stdout, /Admin menu: apps\/menu\.tsx \(missing\)/);
});
