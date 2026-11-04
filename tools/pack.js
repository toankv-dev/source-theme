#!/usr/bin/env node
/*
 * Validates an Adlux theme folder and zips its CONTENTS (not the folder) for upload in the admin.
 *
 *   node tools/pack.js <theme-dir> [--out dist] [--no-zip]
 *
 * Checks (errors stop the zip, warnings do not):
 *   - theme.json fields, every JSON file parses, assets listed in theme.json exist, no assets/css/theme.css
 *   - every .hbs compiles; every {{> partial}} exists; only helpers the platform engine provides are used
 *   - templates/*.json: section types exist, block types are declared in the section schema
 *   - pixel / platform hooks: trackingHead, trackingBody, #sf-config, #sf-variants-data, #addToCart,
 *     data-testid="add-to-cart", #CartDrawer-Checkout, data-testid="checkout-button"
 * Skipped from the zip: dotfiles, folders starting with "_" (e.g. _work), node_modules, *.zip.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');
const archiver = require('archiver');

const args = process.argv.slice(2);
const dir = path.resolve(args.find((a) => !a.startsWith('--')) || 'base-theme');
const outDir = path.resolve(args.includes('--out') ? args[args.indexOf('--out') + 1] : path.join(__dirname, '..', 'dist'));
const errors = [];
const warnings = [];
const rel = (f) => path.relative(dir, f).replace(/\\/g, '/');

const HELPERS = new Set(['if', 'unless', 'each', 'with', 'lookup', 'log', 'eq', 'gt', 'limit', 'json', 'money', 'applyTokens',
  'faqItems', 'stars5', 'swatchStyle', 'contains', 'editable', 'editableSetting']);

function walk(d, out) {
  for (const f of fs.readdirSync(d)) {
    if (f.startsWith('.') || f.startsWith('_') || f === 'node_modules' || f.endsWith('.zip')) continue;
    const full = path.join(d, f);
    if (fs.statSync(full).isDirectory()) walk(full, out); else out.push(full);
  }
  return out;
}

if (!fs.existsSync(path.join(dir, 'theme.json'))) { console.error('No theme.json in ' + dir); process.exit(1); }
const files = walk(dir, []);
const hbsFiles = files.filter((f) => f.endsWith('.hbs'));
const jsonFiles = files.filter((f) => f.endsWith('.json'));
const json = {};

// JSON
for (const f of jsonFiles) {
  try { json[rel(f)] = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { errors.push(rel(f) + ': invalid JSON (' + e.message + ')'); }
}
const theme = json['theme.json'] || {};
for (const k of ['name', 'version', 'engine', 'schemaVersion', 'entry']) if (theme[k] === undefined) errors.push('theme.json: missing "' + k + '"');
if (theme.entry && !fs.existsSync(path.join(dir, theme.entry))) errors.push('theme.json: entry ' + theme.entry + ' not found');
if (theme.layout && !fs.existsSync(path.join(dir, theme.layout))) errors.push('theme.json: layout ' + theme.layout + ' not found');
for (const a of theme.assets || []) if (!fs.existsSync(path.join(dir, a))) errors.push('theme.json: asset ' + a + ' not found');
if (fs.existsSync(path.join(dir, 'assets/css/theme.css'))) warnings.push('assets/css/theme.css exists: the engine treats that name as a legacy inline bundle and does not link it on platform pages');

// Handlebars: compile, partials, helpers
const partials = new Set();
for (const d of ['sections', 'snippets']) {
  const full = path.join(dir, d);
  if (fs.existsSync(full)) for (const f of fs.readdirSync(full)) if (f.endsWith('.hbs')) partials.add(f.slice(0, -4));
}
function visit(node, fn) {
  if (!node || typeof node !== 'object') return;
  fn(node);
  for (const k of Object.keys(node)) {
    if (k === 'loc') continue;
    const v = node[k];
    if (Array.isArray(v)) v.forEach((c) => visit(c, fn)); else if (v && typeof v === 'object') visit(v, fn);
  }
}
const sources = {};
for (const f of hbsFiles) {
  const src = fs.readFileSync(f, 'utf8');
  sources[rel(f)] = src;
  let ast;
  try { ast = Handlebars.parse(src); } catch (e) { errors.push(rel(f) + ': ' + e.message.split('\n')[0]); continue; }
  visit(ast, (n) => {
    if (n.type === 'PartialStatement' || n.type === 'PartialBlockStatement') {
      const name = n.name.original;
      if (!partials.has(name) && !partials.has(String(name).replace(/_/g, '-'))) errors.push(rel(f) + ': partial "' + name + '" not found');
    }
    const isCall = (n.type === 'SubExpression' || n.type === 'BlockStatement') || (n.type === 'MustacheStatement' && (n.params.length || (n.hash && n.hash.pairs.length)));
    if (isCall && n.path && n.path.type === 'PathExpression' && !n.path.data && n.path.parts.length === 1) {
      const h = n.path.original;
      if (!HELPERS.has(h)) errors.push(rel(f) + ': helper "' + h + '" is not provided by the platform engine');
    }
  });
}

// Template JSON documents
for (const [file, doc] of Object.entries(json)) {
  if (!/^templates\/.+\.json$/.test(file)) continue;
  for (const [id, sec] of Object.entries(doc.sections || {})) {
    if (!partials.has(sec.type)) { errors.push(file + ': section "' + id + '" type "' + sec.type + '" has no sections/' + sec.type + '.hbs'); continue; }
    const schema = json['sections/' + sec.type + '.schema.json'];
    if (!schema) { warnings.push(file + ': sections/' + sec.type + '.schema.json missing (no editor settings, no defaults)'); continue; }
    const types = new Set((schema.blocks || []).map((b) => b.type));
    for (const [bid, b] of Object.entries(sec.blocks || {})) if (!types.has(b.type)) errors.push(file + ': block "' + bid + '" type "' + b.type + '" not declared in sections/' + sec.type + '.schema.json');
    for (const bid of sec.blockOrder || []) if (!(sec.blocks || {})[bid]) errors.push(file + ': blockOrder lists unknown block "' + bid + '"');
  }
  for (const id of doc.order || []) if (!(doc.sections || {})[id]) errors.push(file + ': order lists unknown section "' + id + '"');
}

// Platform hooks (searched across all templates, sections and snippets)
const all = Object.values(sources).join('\n');
const hooks = [
  ['{{{trackingHead}}}', /\{\{\{trackingHead\}\}\}/],
  ['{{{trackingBody}}}', /\{\{\{trackingBody\}\}\}/],
  ['#sf-config with configJson', /id="sf-config"[^>]*>\{\{\{configJson\}\}\}/],
  ['#sf-variants-data', /id="sf-variants-data"/],
  ['#addToCart', /id="addToCart"/],
  ['data-testid="add-to-cart"', /data-testid="add-to-cart"/],
  ['#CartDrawer-Checkout', /id="CartDrawer-Checkout"/],
  ['data-testid="checkout-button"', /data-testid="checkout-button"/],
];
for (const [name, re] of hooks) if (!re.test(all)) errors.push('missing platform hook ' + name);
for (const [file, src] of Object.entries(sources)) {
  // The shared platform checkout carries no tracking tags in any Adlux theme: the platform handles its pixels.
  const isPage = /^(templates\/.+|layout\/.+)\.hbs$/.test(file) && file !== 'templates/checkout.hbs' && /<body/i.test(src);
  if (isPage && !src.includes('{{{trackingBody}}}')) errors.push(file + ': page without {{{trackingBody}}} right after <body>');
}

// Report
warnings.forEach((w) => console.log('WARN  ' + w));
errors.forEach((e) => console.log('ERROR ' + e));
console.log(hbsFiles.length + ' templates, ' + jsonFiles.length + ' JSON files checked: ' + errors.length + ' errors, ' + warnings.length + ' warnings');
if (errors.length) process.exit(1);
if (args.includes('--no-zip')) process.exit(0);

// Zip the folder contents
fs.mkdirSync(outDir, { recursive: true });
const slug = String(theme.name || path.basename(dir)).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const zipPath = path.join(outDir, slug + '-' + theme.version + '.zip');
const output = fs.createWriteStream(zipPath);
const zip = archiver('zip', { zlib: { level: 9 } });
zip.pipe(output);
for (const f of files) zip.file(f, { name: rel(f) });
output.on('close', () => console.log('Packed ' + files.length + ' files → ' + zipPath + ' (' + Math.round(zip.pointer() / 1024) + ' KB)'));
zip.finalize();
