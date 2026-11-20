#!/usr/bin/env node
/*
 * Which entries of the theme-edit platform guide (.claude/skills/theme-edit/references/platform-guide.md) rest on shopdy
 * files that changed since they were checked (docs/SPEC-platform-guide.md): re-check only those entries against the
 * code, fix them, then --update. shopdy changes every day; the guide must not lie.
 *
 *   node tools/platform-guide-check.js [--shopdy D:\shopdy-promax] [--update] [--guide <file>]
 *
 * Reads the "Nguồn:" line of each "## " entry (paths inside shopdy-promax, or "<git ref>:<path>" for a branch), hashes
 * those files (git show for a ref; every file of a folder) and compares with platform-guide.sources.json next to the guide.
 * Exit codes: 0 nothing changed (or --update written), 1 a source changed or is missing, 2 usage / no shopdy checkout.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const opt = (k, d) => (args.includes('--' + k) ? args[args.indexOf('--' + k) + 1] : d);
const GUIDE = path.resolve(opt('guide', path.join(ROOT, '.claude', 'skills', 'theme-edit', 'references', 'platform-guide.md')));
const STORE = path.join(path.dirname(GUIDE), path.basename(GUIDE, '.md') + '.sources.json');
const SHOPDY = path.resolve(opt('shopdy', path.join(ROOT, '..', 'shopdy-promax')));
if (!fs.existsSync(GUIDE)) { console.error('no guide: ' + GUIDE); process.exit(2); }
if (!fs.existsSync(SHOPDY)) { console.error('no shopdy checkout: ' + SHOPDY + ' (give --shopdy <dir>)'); process.exit(2); }

const sha1 = (s) => crypto.createHash('sha1').update(s).digest('hex');

/** The guide's entries: { title, sources[] }. */
function entries(text) {
  return text.split(/^## /m).slice(1).map((block) => {
    const title = block.split('\n')[0].trim();
    const m = /^Nguồn:\s*(.+)$/m.exec(block);
    return { title, sources: m ? m[1].split(/,\s*/).map((s) => s.trim()).filter(Boolean) : [] };
  });
}

function walk(dir) {
  const out = [];
  for (const n of fs.readdirSync(dir).sort()) {
    const f = path.join(dir, n);
    if (fs.statSync(f).isDirectory()) out.push(...walk(f)); else out.push(f);
  }
  return out;
}

/** sha1 of one source, or null when it does not exist. */
function hashOf(src) {
  const ref = /^([^:]+):(.+)$/.exec(src);
  if (ref && !/^[A-Za-z]$/.test(ref[1])) {
    const r = spawnSync('git', ['-C', SHOPDY, 'show', `${ref[1]}:${ref[2]}`], { encoding: 'buffer', maxBuffer: 64 * 1048576 });
    return r.status === 0 ? sha1(r.stdout) : null;
  }
  const f = path.join(SHOPDY, src);
  if (!fs.existsSync(f)) return null;
  if (fs.statSync(f).isDirectory()) return sha1(walk(f).map((x) => path.relative(f, x).replace(/\\/g, '/') + '\n' + sha1(fs.readFileSync(x))).join('\n'));
  return sha1(fs.readFileSync(f));
}

const list = entries(fs.readFileSync(GUIDE, 'utf8'));
const now = {};
for (const e of list) for (const s of e.sources) if (!(s in now)) now[s] = hashOf(s);

if (args.includes('--update')) {
  const missing = Object.entries(now).filter(([, h]) => h === null).map(([s]) => s);
  fs.writeFileSync(STORE, JSON.stringify({ version: 1, checked: new Date().toISOString().slice(0, 10), sources: now }, null, 2) + '\n');
  console.log(`platform guide: ${list.length} entries, ${Object.keys(now).length} sources recorded${missing.length ? ` · missing: ${missing.join(', ')}` : ''}`);
  process.exit(0);
}

const before = fs.existsSync(STORE) ? JSON.parse(fs.readFileSync(STORE, 'utf8')).sources || {} : {};
const stale = [];
for (const e of list) {
  const changed = e.sources.filter((s) => now[s] === null || before[s] !== now[s]);
  if (changed.length) stale.push({ title: e.title, changed: changed.map((s) => (now[s] === null ? `${s} (missing)` : s)) });
}
if (!stale.length) {
  console.log(`platform guide: ${list.length} entries, ${Object.keys(now).length} sources, nothing changed since they were checked`);
  process.exit(0);
}
console.log(`platform guide: ${stale.length} of ${list.length} entries to re-check against the code, then --update`);
for (const s of stale) console.log(`  ${s.title}: ${s.changed.join(', ')}`);
process.exit(1);
