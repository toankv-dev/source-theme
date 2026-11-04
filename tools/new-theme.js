#!/usr/bin/env node
/*
 * Starts a new theme from base-theme.
 *
 *   node tools/new-theme.js <Name> [--source <url or image path>] [--description "..."] [--force]
 *
 * Creates themes/<slug>/ as a copy of base-theme with its own theme.json (name, today's version,
 * description), an empty skin.css, and a _work/ folder (never packed) holding source.json and, later,
 * the capture of the original page. Build the look in skin.css, settings_data.json and, where the layout
 * differs, the theme's own copies of sections/snippets. Never touch core.js.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const name = args.find((a) => !a.startsWith('--'));
const opt = (k) => (args.includes('--' + k) ? args[args.indexOf('--' + k) + 1] : undefined);
if (!name) { console.error('usage: node tools/new-theme.js <Name> [--source <url|image>] [--description "..."]'); process.exit(1); }

const ROOT = path.resolve(__dirname, '..');
const BASE = path.join(ROOT, 'base-theme');
const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const dest = path.join(ROOT, 'themes', slug);

if (fs.existsSync(dest) && !args.includes('--force')) {
  console.error(dest + ' already exists (use --force to overwrite).');
  process.exit(1);
}

function copy(src, dst) {
  const st = fs.statSync(src);
  if (st.isDirectory()) {
    fs.mkdirSync(dst, { recursive: true });
    for (const f of fs.readdirSync(src)) if (!f.startsWith('_') && f !== 'node_modules') copy(path.join(src, f), path.join(dst, f));
  } else fs.copyFileSync(src, dst);
}
copy(BASE, dest);

const d = new Date();
const pad = (n) => String(n).padStart(2, '0');
const theme = JSON.parse(fs.readFileSync(path.join(dest, 'theme.json'), 'utf8'));
const baseVersion = theme.version;
theme.name = name;
theme.version = d.getFullYear() + '.' + pad(d.getMonth() + 1) + '.' + pad(d.getDate()) + '.1';
theme.description = opt('description') || name + ' storefront theme, built on the Base theme ' + baseVersion + '.';
fs.writeFileSync(path.join(dest, 'theme.json'), JSON.stringify(theme, null, 2) + '\n');

fs.writeFileSync(path.join(dest, 'assets', 'css', 'skin.css'),
  '/* ' + name + ' — skin. Loaded after base.css and sections.css. Restyle here (with the colour / font settings in\n' +
  '   config/settings_data.json); keep every data-* hook in the markup, since ui.js and core.js find elements through them. */\n');

fs.mkdirSync(path.join(dest, '_work'), { recursive: true });
fs.writeFileSync(path.join(dest, '_work', 'source.json'), JSON.stringify({
  name, slug, created: d.toISOString(), base: baseVersion, source: opt('source') || null,
}, null, 2) + '\n');

console.log('Created ' + path.relative(ROOT, dest) + ' from base-theme ' + baseVersion);
console.log('Next: node tools/capture.js <url> themes/' + slug + '   ·   node tools/preview-server.js themes/' + slug);
