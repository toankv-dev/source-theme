#!/usr/bin/env node
/*
 * What a theme-from-link / new-theme run needs to know before it starts, in ≤ 40 lines (docs/SPEC-link-slim.md): the
 * repo, the base, which lines of the skills to read, and — for a theme that exists — its design map, downloads, media
 * library, preview, scripts and last edits, with the next step. Replaces reading CLAUDE.md, README, git log and the
 * specs of earlier themes at the start of a run.
 *
 *   node tools/run-brief.js [themes/<slug>]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const arg = process.argv.slice(2).find((a) => !a.startsWith('--'));
const THEME = arg ? path.resolve(arg) : null;
const rel = (f) => path.relative(ROOT, f).replace(/\\/g, '/');
const json = (f, d = null) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return d; } };
const L = [];

// The repo and the base.
const git = (a) => { const r = spawnSync('git', ['-C', ROOT, ...a], { encoding: 'utf8' }); return r.status === 0 ? r.stdout.trim() : ''; };
const dirty = git(['status', '--short']).split('\n').filter(Boolean);
const base = json(path.join(ROOT, 'base-theme', 'theme.json'), {});
let playwright = false;
try { require.resolve('playwright', { paths: [__dirname] }); playwright = true; } catch (e) { /* not installed */ }
L.push(`repo     branch ${git(['rev-parse', '--abbrev-ref', 'HEAD']) || '?'} · ${dirty.length} uncommitted · base-theme ${base.version || '?'} · tools ${playwright ? 'ready' : 'NOT installed: cd tools && npm install && npx playwright install chromium'}`);

// Which lines of the skills to read (headings found now, so the numbers stay right when a skill grows).
function ranges(file, wanted) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  const heads = lines.map((l, i) => [l, i + 1]).filter(([l]) => /^## /.test(l));
  return wanted.map((w) => {
    const k = heads.findIndex(([l]) => l.slice(3).trim().startsWith(w));
    if (k < 0) return null;
    const end = k + 1 < heads.length ? heads[k + 1][1] - 1 : lines.length;
    return `${w} ${heads[k][1]}-${end}`;
  }).filter(Boolean).join(' · ');
}
const NEW = path.join(ROOT, '.claude', 'skills', 'new-theme', 'SKILL.md');
const LOG = path.join(ROOT, '.claude', 'skills', 'new-theme', 'RUNLOG.md');
if (fs.existsSync(NEW)) L.push(`read     new-theme/SKILL.md lines: ${ranges(NEW, ['Rules', 'Fonts and colours', 'Speed'])} (not the rest)`);
if (fs.existsSync(LOG)) {
  const lines = fs.readFileSync(LOG, 'utf8').split('\n');
  const runs = lines.findIndex((l) => /^## Runs/.test(l));
  L.push(`read     new-theme/RUNLOG.md lines 1-${runs > 0 ? runs : lines.length} (lessons; the runs below them are history)`);
}
L.push('skip     CLAUDE.md is loaded already · no git log, no specs / plans of other themes, no README of tools');

if (!THEME) {
  L.push('theme    none given: a new theme starts with node tools/new-theme.js "<Brand>" --source "<url>"');
  console.log(L.join('\n'));
  process.exit(0);
}
if (!fs.existsSync(path.join(THEME, 'theme.json'))) {
  L.push(`theme    ${rel(THEME)} does not exist: node tools/new-theme.js "<Brand>" --source "<url>"`);
  console.log(L.join('\n'));
  process.exit(0);
}

// The theme.
const theme = json(path.join(THEME, 'theme.json'), {});
const mine = dirty.filter((l) => l.slice(3).replace(/\\/g, '/').startsWith(rel(THEME) + '/') || l.slice(3).replace(/\\/g, '/') === rel(THEME) + '/');
L.push(`theme    ${rel(THEME)} · ${theme.name || '?'} ${theme.version || ''} · ${mine.length ? mine.length + ' uncommitted path(s)' : 'committed'}`);
const mapCheck = spawnSync(process.execPath, [path.join(__dirname, 'theme-map.js'), THEME, '--check'], { encoding: 'utf8' });
L.push(`map      ${(mapCheck.stdout || mapCheck.stderr || '').trim().split('\n')[0]} · read ${rel(path.join(THEME, '_map', 'design-map.md'))} before any code`);

const manifest = json(path.join(THEME, '_work', 'site', 'manifest.json'), null);
const pages = (manifest && manifest.pages) || [];
if (pages.length) {
  for (const p of pages.slice(0, 6)) {
    const o = p.offline || p.check || {};
    const diff = o.desktop && o.desktop.differs !== undefined ? ` · differs ${o.desktop.differs}% / ${o.mobile ? o.mobile.differs : '?'}%` : '';
    L.push(`page     ${p.name} ← ${String(p.url || '').slice(0, 90)}${(p.blocked || []).length ? ' · blocked ' + p.blocked.join(', ') : ''}${diff}`);
  }
} else L.push('page     nothing downloaded yet');

const media = json(path.join(THEME, '_work', 'media-map.json'), null);
if (media) {
  const count = (kind) => media.filter((e) => e.kind === kind).length;
  const prefixes = [...new Set(media.map((e) => (/assets\/(?:images|videos)\/([^/]+)-[a-z]+\//.exec(e.shipped || '') || [])[1]).filter(Boolean))];
  L.push(`media    ${count('image')} pictures, ${count('video')} videos in the library (prefixes ${prefixes.join(', ') || '?'})`);
} else L.push('media    no media library yet (node tools/media-library.js <theme> --prefix <xx> after the last download)');

const pv = json(path.join(THEME, '_work', 'preview.json'), null);
let alive = false;
if (pv) { try { process.kill(pv.pid, 0); alive = true; } catch (e) { alive = false; } }
L.push(`preview  ${alive ? `running on http://127.0.0.1:${pv.port} (edit-check reuses it)` : 'not running (node tools/edit-check.js starts and reuses one)'}`);

const src = fs.existsSync(path.join(THEME, '_src')) ? fs.readdirSync(path.join(THEME, '_src')).filter((n) => /\.(js|py)$/.test(n)) : [];
const loose = fs.existsSync(path.join(THEME, '_work')) ? fs.readdirSync(path.join(THEME, '_work')).filter((n) => /^(build|patch)-.*\.js$/.test(n)) : [];
if (src.length || loose.length) L.push(`scripts  _src: ${src.join(', ') || '—'}${loose.length ? ` · WARNING in _work (not committed): ${loose.join(', ')}` : ''}`);

const log = path.join(THEME, '_map', 'edit-log.md');
if (fs.existsSync(log)) for (const l of fs.readFileSync(log, 'utf8').split('\n').filter((x) => /^\d{4}-\d\d-\d\d/.test(x)).slice(0, 3)) L.push(`edit     ${l.slice(0, 150)}`);

const next = !pages.length ? 'download each link: node tools/download-page.js <url> ' + rel(THEME) + ' [--name product-<x>]'
  : !media ? 'node tools/media-library.js ' + rel(THEME) + ' --prefix <xx>'
    : 'build (new-theme steps 3–8), check parts with node tools/edit-check.js ' + rel(THEME) + ' --selector "<css>" --ref <offline url>';
L.push(`next     ${next}`);
console.log(L.slice(0, 40).join('\n'));
