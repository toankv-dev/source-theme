#!/usr/bin/env node
/*
 * Installs the Claude skills kept in shopdy-skills/ (made for the shopdy-promax repo, not used here) into a
 * shopdy-promax checkout: shopdy-skills/<name>/ → <shopdy-promax>/.claude/skills/<name>/.
 *
 *   node tools/install-shopdy-skill.js [<shopdy-promax folder>] [--skill <name>] [--dry]      (inside source-theme)
 *   node D:\source-theme\tools\install-shopdy-skill.js                                         (inside shopdy-promax)
 *
 * Folder: the argument, else $SHOPDY_PROMAX_DIR, else the current folder if it is shopdy-promax, else
 * ../shopdy-promax next to this repo. Every file of the skill is
 * replaced and files the source no longer has are removed, EXCEPT what belongs to that machine, at the skill's root:
 * `_work/` (jobs, browser login), `catalog/` (the block catalog the skill builds and keeps up to date there), `.env`
 * (account); and `__pycache__/` at any depth. The source's `tests/` stay here. Refuses a folder that is not
 * shopdy-promax and a skill folder that is a link (it would write into the repo the link points at). shopdy-promax
 * git-ignores `.claude`, so the install never shows up in its `git status`.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const KEEP_ROOT = new Set(['_work', 'catalog', '.env']); // that machine's own files, at the skill's root only
const SKIP_ANY = new Set(['__pycache__']);
const SOURCE_ONLY = new Set(['tests']); // never installed

// Every file under dir, as forward-slash paths relative to it. Skips SKIP_ANY at any depth and `skipRoot` names at
// the root only.
function listFiles(dir, rel = '', skipRoot = KEEP_ROOT) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(path.join(dir, rel), { withFileTypes: true })) {
    if (SKIP_ANY.has(entry.name) || (!rel && skipRoot.has(entry.name))) continue;
    const r = rel ? `${rel}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...listFiles(dir, r, skipRoot));
    else if (entry.isFile()) out.push(r);
  }
  return out;
}

function versionOf(skillMd) {
  if (!fs.existsSync(skillMd)) return null;
  const m = /^\s+version:\s*"?([^"\n]+)"?/m.exec(fs.readFileSync(skillMd, 'utf8').split(/^---\s*$/m)[1] || '');
  return m ? m[1].trim() : null;
}

function packageName(dir) {
  try { return JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')).name; } catch { return null; }
}

// Where to install when no folder is given: $SHOPDY_PROMAX_DIR, else the current folder when it is a shopdy-promax
// checkout (the command was typed inside it), else ../shopdy-promax next to this repo.
function defaultTarget(cwd = process.cwd(), env = process.env) {
  if (env.SHOPDY_PROMAX_DIR) return path.resolve(env.SHOPDY_PROMAX_DIR);
  if (packageName(cwd) === 'adlux-promax') return path.resolve(cwd);
  return path.join(ROOT, '..', 'shopdy-promax');
}

function assertShopdyPromax(target) {
  const name = packageName(target);
  if (name !== 'adlux-promax') {
    throw new Error(`${target} is not a shopdy-promax checkout (package.json name is ${name ? `"${name}"` : 'missing'}, expected "adlux-promax")`);
  }
}

function removeEmptyDirs(dir, isRoot = true) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory() || SKIP_ANY.has(entry.name) || (isRoot && KEEP_ROOT.has(entry.name))) continue;
    const sub = path.join(dir, entry.name);
    removeEmptyDirs(sub, false);
    if (!fs.readdirSync(sub).length) fs.rmdirSync(sub);
  }
}

/** Installs the skills; returns one report per skill. `root` = this repo (tests pass a fixture). */
function install({ target, root = ROOT, only = null, dry = false }) {
  assertShopdyPromax(target);
  const srcRoot = path.join(root, 'shopdy-skills');
  const names = (fs.existsSync(srcRoot) ? fs.readdirSync(srcRoot) : [])
    .filter((n) => fs.existsSync(path.join(srcRoot, n, 'SKILL.md')))
    .filter((n) => !only || n === only);
  if (!names.length) throw new Error(only ? `no skill "${only}" in ${srcRoot}` : `no skill in ${srcRoot}`);

  return names.map((name) => {
    const src = path.join(srcRoot, name);
    const dest = path.join(target, '.claude', 'skills', name);
    if (fs.existsSync(dest) && fs.lstatSync(dest).isSymbolicLink()) {
      throw new Error(`${dest} is a link; remove it first (the install would write into the folder it points at)`);
    }
    const report = { skill: name, dest, existed: fs.existsSync(path.join(dest, 'SKILL.md')),
      from: versionOf(path.join(dest, 'SKILL.md')), to: versionOf(path.join(src, 'SKILL.md')),
      added: [], updated: [], removed: [], unchanged: 0 };
    const srcFiles = listFiles(src, '', new Set([...KEEP_ROOT, ...SOURCE_ONLY]));
    const srcSet = new Set(srcFiles);
    for (const rel of srcFiles) {
      const from = path.join(src, rel);
      const to = path.join(dest, rel);
      if (!fs.existsSync(to)) report.added.push(rel);
      else if (!fs.readFileSync(from).equals(fs.readFileSync(to))) report.updated.push(rel);
      else { report.unchanged++; continue; }
      if (!dry) {
        fs.mkdirSync(path.dirname(to), { recursive: true });
        fs.copyFileSync(from, to);
      }
    }
    for (const rel of listFiles(dest)) {
      if (srcSet.has(rel)) continue;
      report.removed.push(rel);
      if (!dry) fs.rmSync(path.join(dest, rel));
    }
    if (!dry && fs.existsSync(dest)) removeEmptyDirs(dest);
    return report;
  });
}

function main() {
  const args = process.argv.slice(2);
  const dry = args.includes('--dry');
  const si = args.indexOf('--skill');
  const only = si >= 0 ? args[si + 1] : null;
  const positional = args.filter((a, i) => !a.startsWith('--') && !(si >= 0 && i === si + 1));
  const target = positional[0] ? path.resolve(positional[0]) : defaultTarget();
  let reports;
  try {
    reports = install({ target, only, dry });
  } catch (err) {
    console.error(`install-shopdy-skill: ${err.message}`);
    console.error(`usage: node ${path.join(ROOT, 'tools', 'install-shopdy-skill.js')} [<shopdy-promax folder>] [--skill <name>] [--dry]`);
    process.exit(1);
  }
  for (const r of reports) {
    const v = !r.existed ? `v${r.to || '?'} (new install)`
      : r.from === r.to ? `v${r.to || '?'}` : `v${r.from || '?'} → v${r.to || '?'}`;
    console.log(`${dry ? '[dry] ' : ''}${r.skill} ${v} → ${r.dest}`);
    console.log(`  added ${r.added.length} · updated ${r.updated.length} · removed ${r.removed.length} · unchanged ${r.unchanged}`);
    for (const f of r.added) console.log(`  + ${f}`);
    for (const f of r.updated) console.log(`  ~ ${f}`);
    for (const f of r.removed) console.log(`  - ${f}`);
  }
  console.log(dry ? 'Nothing written (--dry).' : 'Kept on that machine: _work/, catalog/, .env. Open Claude Code in the shopdy-promax folder to use it.');
}

if (require.main === module) main();
module.exports = { install, listFiles, versionOf, defaultTarget };
