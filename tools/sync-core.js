#!/usr/bin/env node
/*
 * Pushes base-theme's platform core into the themes built from it. Child themes never edit these files, so
 * they can be replaced as they are:
 *   assets/js/core.js, sections/product-scripts.hbs, snippets/head.hbs
 * The checkout and tracking-result templates are NOT copied (each theme has its own skin block there);
 * the report says when their shared parts differ from the base so they can be merged by hand.
 *
 *   node tools/sync-core.js [--dry] [themes/<slug> …]
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BASE = path.join(ROOT, 'base-theme');
const args = process.argv.slice(2);
const dry = args.includes('--dry');
const CORE = ['assets/js/core.js', 'sections/product-scripts.hbs', 'snippets/head.hbs'];
const MERGE = ['templates/checkout.hbs', 'templates/tracking-result.hbs'];

let targets = args.filter((a) => !a.startsWith('--')).map((a) => path.resolve(a));
if (!targets.length) {
  const dir = path.join(ROOT, 'themes');
  targets = fs.existsSync(dir) ? fs.readdirSync(dir).map((d) => path.join(dir, d)).filter((d) => fs.existsSync(path.join(d, 'theme.json'))) : [];
}

// The shared part of a page template = everything outside its skin <style> block.
const shared = (src) => src.replace(/\{\{!--\s*Skin[\s\S]*?--\}\}\s*<style>[\s\S]*?<\/style>/, '').replace(/<style>\s*\/\*[^*]*skin[\s\S]*?<\/style>/i, '');

for (const t of targets) {
  const name = path.relative(ROOT, t);
  const changes = [];
  for (const f of CORE) {
    const src = path.join(BASE, f), dst = path.join(t, f);
    const a = fs.readFileSync(src, 'utf8');
    const b = fs.existsSync(dst) ? fs.readFileSync(dst, 'utf8') : null;
    if (a === b) continue;
    changes.push((b === null ? 'add    ' : 'update ') + f);
    if (!dry) { fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.writeFileSync(dst, a); }
  }
  for (const f of MERGE) {
    const src = path.join(BASE, f), dst = path.join(t, f);
    if (!fs.existsSync(dst)) continue;
    if (shared(fs.readFileSync(src, 'utf8')) !== shared(fs.readFileSync(dst, 'utf8'))) changes.push('MERGE BY HAND ' + f + ' (shared part differs from base; keep the theme skin)');
  }
  console.log(name + ': ' + (changes.length ? '\n  ' + changes.join('\n  ') : 'up to date') + (dry && changes.length ? '\n  (dry run, nothing written)' : ''));
}
