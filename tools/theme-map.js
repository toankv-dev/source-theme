#!/usr/bin/env node
/*
 * The design map of a theme (docs/SPEC-theme-map.md): read it instead of the code; open only the lines it points to.
 *
 *   node tools/theme-map.js <theme-dir>                 create the map, or refresh it (the notes stay); prints 1–5 lines
 *   node tools/theme-map.js <theme-dir> --check         write nothing; exit 0 = up to date, 1 = missing, stale or notes to review
 *   node tools/theme-map.js <theme-dir> --part <id>     one part in detail: a section, snippet, template or asset file name,
 *                                                       design, sources (lines of every block, where it is styled …)
 *   node tools/theme-map.js <theme-dir> --ack <id|all>  the notes of that part were checked: clear their REVIEW flag
 *   node tools/theme-map.js --all [--check]             base-theme and every themes/*
 *
 * Writes <theme-dir>/_map/design-map.md (generated part + the notes Claude writes between <!-- notes:<id> --> markers)
 * and _map/design-map.json (sha1 of every file, when each part's notes were checked). _map/ is committed, never packed.
 * After changing a theme: run it, fix the notes it flags (or --ack them), and note what the code does not say.
 * Exit codes: 0 done, 1 usage / error / broken notes markers / --check failed.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const M = require('./lib/theme-map');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const opt = (k) => (args.includes('--' + k) ? args[args.indexOf('--' + k) + 1] : null);
const valued = new Set([opt('part'), opt('ack')].filter(Boolean));
const positional = args.filter((a) => !a.startsWith('--') && !valued.has(a));
const USAGE = 'usage: node tools/theme-map.js <theme-dir> [--check | --part <id> | --ack <id|all>]  ·  node tools/theme-map.js --all [--check]';

const files = (dir) => ({ md: path.join(dir, '_map', 'design-map.md'), json: path.join(dir, '_map', 'design-map.json') });
const readOr = (f, d) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : d);
const rel = (f) => path.relative(ROOT, f).replace(/\\/g, '/');
const cap = (a, n) => (a.length > n ? a.slice(0, n).join(', ') + ` +${a.length - n}` : a.join(', '));

function changedFiles(before, after) {
  const keys = new Set([...Object.keys(before || {}), ...Object.keys(after)]);
  return [...keys].filter((k) => (before || {})[k] !== after[k]).sort();
}

/** Returns the exit code for one theme. */
function one(dir, { check = false, ack = null, prefix = '' } = {}) {
  const say = (s) => console.log(prefix + s);
  if (!fs.existsSync(path.join(dir, 'theme.json'))) { console.error(`no theme.json in ${dir}`); return 1; }
  const f = files(dir);
  const oldMd = readOr(f.md, null);
  const oldStore = JSON.parse(readOr(f.json, 'null'));
  if ((check || ack) && oldMd === null) { say(`no design map: run node tools/theme-map.js ${rel(dir)}`); return 1; }
  const model = M.scan(dir);
  let built;
  try {
    built = M.build(model, oldMd, oldStore, { ack: ack === 'all' ? 'all' : ack ? [ack] : [] });
  } catch (e) {
    console.error(prefix + e.message);
    return 1;
  }
  const json = M.stableJson(built.store);
  const changed = changedFiles(oldStore && oldStore.files, model.files);
  const review = () => built.flagged.forEach((x) => say(`review notes: ${x.id} (${cap(x.files, 3)} changed): read them, fix what is wrong, `
    + `then node tools/theme-map.js ${rel(dir)} --ack ${x.id}`));
  if (check) {
    const stale = built.md !== oldMd || json !== readOr(f.json, '');
    if (stale) say(`design map out of date${changed.length ? ` (changed: ${cap(changed, 5)})` : ''}: run node tools/theme-map.js ${rel(dir)}`);
    else if (!built.flagged.length) say('design map: up to date');
    review();
    return stale || built.flagged.length ? 1 : 0;
  }
  if (ack && !built.store.notes[ack] && ack !== 'all') { console.error(`${prefix}no notes for "${ack}" in the map`); return 1; }
  if (built.md === oldMd && json === readOr(f.json, '')) say('design map: up to date');
  else {
    fs.mkdirSync(path.dirname(f.md), { recursive: true });
    fs.writeFileSync(f.md, built.md);
    fs.writeFileSync(f.json, json);
    if (oldMd === null) say(`design map: created ${rel(f.md)} (${built.md.length.toLocaleString('en-US')} characters)`);
    else say(`design map: refreshed${changed.length ? ` (changed: ${cap(changed, 5)})` : ''}`);
  }
  if (built.removed.length) say(`notes of removed parts kept under "(removed)": ${built.removed.join(', ')}`);
  review();
  return 0;
}

function main() {
  const check = args.includes('--check');
  if (args.includes('--all')) {
    const dirs = [path.join(ROOT, 'base-theme'), ...fs.readdirSync(path.join(ROOT, 'themes')).sort().map((t) => path.join(ROOT, 'themes', t))]
      .filter((d) => fs.existsSync(path.join(d, 'theme.json')));
    let code = 0;
    for (const d of dirs) code = Math.max(code, one(d, { check, prefix: path.basename(d) + ': ' }));
    process.exit(code);
  }
  const dir = positional[0] ? path.resolve(positional[0]) : null;
  if (!dir) { console.error(USAGE); process.exit(1); }
  const partId = opt('part');
  if (args.includes('--part')) {
    if (!partId) { console.error(USAGE); process.exit(1); }
    const model = M.scan(dir);
    const text = M.part(model, partId);
    if (text === null) { console.error(`no part "${partId}". Parts: ${M.partIds(model).join(', ')}`); process.exit(1); }
    console.log(text);
    return;
  }
  if (args.includes('--ack') && !opt('ack')) { console.error(USAGE); process.exit(1); }
  process.exit(one(dir, { check, ack: opt('ack') }));
}

main();
