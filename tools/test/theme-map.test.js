'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { tmpDir, runNode, ROOT } = require('./helpers');
const M = require('../lib/theme-map');

const FIXTURE = path.join(ROOT, 'tools', 'fixtures', 'theme-map');
const CLI = path.join(ROOT, 'tools', 'theme-map.js');

function copyTheme() {
  const d = path.join(tmpDir('theme-map-'), 'fx');
  fs.cpSync(FIXTURE, d, { recursive: true });
  return d;
}
const mapOf = (d) => path.join(d, '_map', 'design-map.md');
const read = (f) => fs.readFileSync(f, 'utf8');
const write = (f, s) => fs.writeFileSync(f, s);
const run = (...a) => runNode([CLI, ...a]);
const addNotes = (d, id, text) => fs.appendFileSync(mapOf(d), `### ${id}\n<!-- notes:${id} -->\n${text}\n<!-- /notes -->\n`);

test('scan reads the parts of a theme from its files (and never _work/site)', () => {
  const m = M.scan(FIXTURE);
  const bundle = m.templates.find((t) => t.id === 'product.bundle.json');
  assert.deepEqual(bundle.sections.map((s) => [s.id, s.type, s.skin]), [['main', 'product', 'bundle'], ['banner', 'banner', null]]);
  assert.equal(bundle.media, 2, 'two default_* pictures');
  assert.deepEqual(m.templates.find((t) => t.id === 'index.hbs').partials, ['header', 'banner', 'footer']);

  const p = m.sections.find((s) => s.id === 'product');
  assert.deepEqual(p.marks.map((b) => [b.type, b.from, b.to]), [['title', 5, 7], ['price', 8, 10], ['pack', 11, 13]]);
  assert.deepEqual(p.partials, ['stars']);
  assert.deepEqual(p.links, ['assets/css/bundle.css']);
  assert.equal(p.classes[0].name, 'pm');
  assert.deepEqual(p.usedBy, ['product.bundle.json', 'product.json']);
  assert.ok(p.style.bytes > 0);
  assert.deepEqual(p.styledIn.map((c) => [c.id, c.hits, c.from, c.to]), [['bundle.css', 20, null, null], ['base.css', 3, 7, 11]],
    'most hits first; no lines in a minified file');
  assert.deepEqual(p.editedBy, [{ script: '_work/patch-x.js', kind: 'patches', files: ['sections/product.hbs'], at: { 'sections/product.hbs': [6, 6] } }],
    'and the lines of the script that write it');
  assert.deepEqual(m.sections.find((s) => s.id === 'banner').editedBy,
    [{ script: '_work/build-x.js', kind: 'generates', files: ['sections/banner.hbs'], at: { 'sections/banner.hbs': [6, 6] } }]);
  assert.deepEqual(m.snippets.find((s) => s.id === 'stars').usedBy, ['footer', 'product', 'reviews']);

  const css = Object.fromEntries(m.css.map((c) => [c.id, c]));
  assert.deepEqual([css['base.css'].minified, css['bundle.css'].minified], [false, true]);
  assert.deepEqual(css['base.css'].linkedBy, ['theme.hbs', 'theme.json']);
  assert.deepEqual(css['bundle.css'].linkedBy, ['product']);
  assert.deepEqual(m.js.find((j) => j.id === 'theme.js').hooks, ['data-pack']);
  assert.equal(m.js.find((j) => j.id === 'core.js').core, true);

  const tokens = Object.fromEntries(m.design.tokens.map((t) => [t.id, t]));
  assert.deepEqual(Object.keys(tokens), ['primary', 'footer_bg', 'font', 'radius']);
  assert.deepEqual([tokens.primary.value, tokens.primary.where, tokens.primary.readBy], ['#790236', 'Colors › Primary', ['product.hbs']]);
  assert.deepEqual([tokens.footer_bg.value, tokens.footer_bg.readBy], ['#222222', ['footer.hbs']]);
  assert.deepEqual(m.design.vars, ['--radius: 8px', '--gap: 16px']);
  assert.deepEqual(m.design.fonts, ['Poppins 400 700']);
  assert.deepEqual(m.design.breakpoints, [{ px: 749, n: 1 }]);

  assert.deepEqual(m.sources.map((s) => [s.file, s.kind, s.targets, s.committed]), [
    ['_work/build-x.js', 'generates', ['sections/banner.hbs', 'templates/product.bundle.json'], false],
    ['_work/check-x.js', 'reads', ['sections/reviews.hbs'], false],
    ['_work/patch-x.js', 'patches', ['sections/product.hbs'], false]]);
  assert.deepEqual(m.hooks.find((h) => h.name === '#addToCart'), { name: '#addToCart', file: 'sections/product.hbs', line: 15 });
  assert.equal(m.hooks.find((h) => h.name === '#CartDrawer-Checkout').file, null);
  assert.deepEqual(m.readme, [{ title: 'Editor', line: 3 }, { title: 'Pages', line: 6 }]);
  assert.ok(m.files['_work/build-x.js'] && !Object.keys(m.files).some((f) => f.startsWith('_work/site/')));
  assert.doesNotMatch(M.renderIndex(m), /secret/);
});

test('the CLI creates the map, then finds it up to date and changes no byte', async () => {
  const d = copyTheme();
  const r = await run(d);
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.stdout, /design map: created/);
  const md = read(mapOf(d));
  const json = read(path.join(d, '_map', 'design-map.json'));
  assert.match(md, /^# Design map: fx\n/);
  assert.match(md, /\| product\.bundle\.json "Bundle" \| main:product\[skin=bundle\] \(3 blocks\) · banner/);
  assert.match(md, /_work\/patch-x\.js patches sections\/product\.hbs/);
  assert.match(md, /WARNING.*not committed/);
  assert.match(md, /#addToCart product\.hbs:15/);
  assert.match(md, /<!-- notes:theme -->\n<!-- \/notes -->/);
  assert.ok(md.length <= 16000);
  const again = await run(d);
  assert.match(again.stdout, /design map: up to date/);
  assert.equal(read(mapOf(d)), md);
  assert.equal(read(path.join(d, '_map', 'design-map.json')), json);
  assert.equal((await run(d, '--check')).code, 0);
});

test('notes survive a refresh; the notes of a removed part move under "(removed)"', async () => {
  const d = copyTheme();
  await run(d);
  write(mapOf(d), read(mapOf(d)).replace('<!-- notes:theme -->\n', '<!-- notes:theme -->\n- Fixture rule.\n'));
  addNotes(d, 'banner', '- Banner note.');
  assert.equal((await run(d)).code, 0);
  assert.match(read(mapOf(d)), /- Fixture rule\.[\s\S]*### banner\n<!-- notes:banner -->\n- Banner note\./);
  fs.rmSync(path.join(d, 'sections', 'banner.hbs'));
  write(path.join(d, 'templates', 'index.hbs'), '{{> header}}\n{{> footer}}\n');
  const tpl = JSON.parse(read(path.join(d, 'templates', 'product.bundle.json')));
  delete tpl.sections.banner;
  tpl.order = ['main'];
  write(path.join(d, 'templates', 'product.bundle.json'), JSON.stringify(tpl, null, 2));
  const r = await run(d);
  assert.match(r.stdout, /refreshed/);
  const md = read(mapOf(d));
  assert.match(md, /### \(removed\) banner\n<!-- notes:banner -->\n- Banner note\./);
  assert.match(md, /- Fixture rule\./);
});

test('a changed file flags the notes of its part; --ack clears the flag; changed notes count as checked', async () => {
  const d = copyTheme();
  await run(d);
  addNotes(d, 'product', '- Pack rows are styled in bundle.css.');
  await run(d);
  fs.appendFileSync(path.join(d, 'sections', 'product.hbs'), '{{!-- changed --}}\n');
  const r = await run(d);
  assert.match(r.stdout, /review notes: product \(sections\/product\.hbs changed\)/);
  assert.match(read(mapOf(d)), /### product · REVIEW: sections\/product\.hbs changed \d{4}-\d\d-\d\d/);
  assert.equal((await run(d, '--check')).code, 1);
  assert.equal((await run(d, '--ack', 'product')).code, 0);
  assert.match(read(mapOf(d)), /### product\n<!-- notes:product -->/);
  assert.equal((await run(d, '--check')).code, 0);
  // the code and its notes changed together: nothing to review
  fs.appendFileSync(path.join(d, 'sections', 'product.hbs'), '{{!-- again --}}\n');
  write(mapOf(d), read(mapOf(d)).replace('- Pack rows', '- Pack rows (and the badge)'));
  const r2 = await run(d);
  assert.doesNotMatch(r2.stdout, /review notes/);
  assert.equal((await run(d, '--check')).code, 0);
});

test('--part prints one part with the lines to open', async () => {
  const r = await run(FIXTURE, '--part', 'product');
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.stdout, /blocks in the markup: title 5-7 · price 8-10 · pack 11-13/);
  assert.match(r.stdout, /bundle\.css \(minified: grep -o/);
  assert.match(r.stdout, /edited by: _work\/patch-x\.js patches sections\/product\.hbs \(script lines 6-6\)/);
  assert.ok(r.stdout.length <= 4000);
  assert.match((await run(FIXTURE, '--part', 'design')).stdout, /primary\s+#790236/);
  assert.match((await run(FIXTURE, '--part', 'product.bundle.json')).stdout, /k: pack · default_image images\/fx-sections\/pack\.webp/);
  const nope = await run(FIXTURE, '--part', 'nope');
  assert.equal(nope.code, 1);
  assert.match(nope.stderr, /no part "nope"/);
  assert.ok(!fs.existsSync(mapOf(FIXTURE)), '--part writes nothing');
});

test('broken notes markers stop the tool, which writes nothing', async () => {
  const d = copyTheme();
  await run(d);
  fs.appendFileSync(mapOf(d), '<!-- notes:x -->\n- never closed\n');
  const before = read(mapOf(d));
  fs.appendFileSync(path.join(d, 'sections', 'product.hbs'), '{{!-- changed --}}\n');
  const r = await run(d);
  assert.equal(r.code, 1);
  assert.match(r.stderr, /notes markers/);
  assert.equal(read(mapOf(d)), before);
});

test('--check: no map is a failure', async () => {
  const r = await run(copyTheme(), '--check');
  assert.equal(r.code, 1);
  assert.match(r.stdout + r.stderr, /no design map/);
});

test('the design map of every real theme fits its budget', () => {
  const dirs = [path.join(ROOT, 'base-theme'), ...fs.readdirSync(path.join(ROOT, 'themes')).map((t) => path.join(ROOT, 'themes', t))]
    .filter((d) => fs.existsSync(path.join(d, 'theme.json')));
  for (const d of dirs) {
    const t0 = Date.now();
    const m = M.scan(d);
    const md = M.renderIndex(m);
    const ms = Date.now() - t0;
    const name = path.basename(d);
    assert.ok(md.length <= 16000, `${name}: ${md.length} characters`);
    assert.ok(ms <= 5000, `${name}: ${ms} ms`);
    for (const s of m.sections) assert.ok(M.part(m, s.id).length <= 4000, `${name} --part ${s.id}: ${M.part(m, s.id).length}`);
  }
});

test('pack warns when the design map is missing or stale, and never packs _map/', async () => {
  const PACK = path.join(ROOT, 'tools', 'pack.js');
  const d = path.join(tmpDir('pack-map-'), 'base');
  fs.cpSync(path.join(ROOT, 'base-theme'), d, { recursive: true, filter: (s) => !/[\\/]_map([\\/]|$)/.test(s) });
  let r = await runNode([PACK, d, '--no-zip']);
  assert.match(r.stdout, /WARN {2}no design map/);
  await run(d);
  r = await runNode([PACK, d, '--no-zip']);
  assert.doesNotMatch(r.stdout, /design map/);
  fs.appendFileSync(path.join(d, 'sections', 'faq.hbs'), '\n{{!-- changed --}}\n');
  r = await runNode([PACK, d, '--no-zip']);
  assert.match(r.stdout, /WARN {2}the design map is out of date/);
  await run(d);
  const out = tmpDir('pack-out-');
  r = await runNode([PACK, d, '--out', out]);
  assert.equal(r.code, 0, r.stdout);
  await new Promise((ok) => setTimeout(ok, 300));
  const zip = fs.readdirSync(out).find((f) => f.endsWith('.zip'));
  assert.ok(zip && !fs.readFileSync(path.join(out, zip)).includes('_map/'), 'no _map/ in the zip');
});

test('a loose source file in _src/ is listed with the scripts that read it, and hashed', () => {
  const d = copyTheme();
  fs.mkdirSync(path.join(d, '_src'));
  write(path.join(d, '_src', 'patch-y.js'), "const s = require('fs').readFileSync(__dirname + '/block-y.hbs', 'utf8'); // sections/banner.hbs\n");
  write(path.join(d, '_src', 'block-y.hbs'), '<div class="y"></div>\n');
  write(path.join(d, '_src', 'notes.txt'), 'nobody reads me\n');
  const m = M.scan(d);
  assert.deepEqual(m.srcFiles, [
    { file: '_src/block-y.hbs', readBy: ['_src/patch-y.js'] },
    { file: '_src/notes.txt', readBy: [] },
  ]);
  assert.ok(m.files['_src/block-y.hbs'], 'hashed, so a change to it is seen');
  const md = M.renderIndex(m);
  assert.match(md, /- _src\/block-y\.hbs: source read by _src\/patch-y\.js → edit it, then run that script/);
  assert.match(md, /- _src\/notes\.txt: not read by any script/);
});

test('a path named only in a script comment is not a target of that script (a URL is not a comment)', () => {
  const d = copyTheme();
  fs.mkdirSync(path.join(d, '_src'));
  write(path.join(d, '_src', 'build-z.js'), [
    '// renders sections/footer.hbs from the settings (a comment: not a target)',
    '/* block comment: sections/product.hbs */',
    "const url = 'https://example.com/x'; fs.writeFileSync('sections/banner.hbs', url); // and sections/footer.hbs",
    '',
  ].join('\n'));
  const s = M.scan(d).sources.find((x) => x.file === '_src/build-z.js');
  assert.deepEqual(s.targets, ['sections/banner.hbs']);
});

test('a path inside a sentence of a string (an info text) is not a target; one that starts a string is', () => {
  const d = copyTheme();
  fs.mkdirSync(path.join(d, '_src'));
  write(path.join(d, '_src', 'build-w.js'), [
    "const info = 'This look loads sections/footer.hbs for this section only.';",
    "write('sections/banner.hbs', info);",
    'fs.writeFileSync(`${T}/sections/product.hbs`, info);',
    '',
  ].join('\n'));
  const s = M.scan(d).sources.find((x) => x.file === '_src/build-w.js');
  assert.deepEqual(s.targets, ['sections/banner.hbs', 'sections/product.hbs']);
});
