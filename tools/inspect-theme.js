#!/usr/bin/env node
/*
 * Inventories an Adlux theme and compares it with base-theme, to decide what the base should absorb.
 *
 *   node tools/inspect-theme.js <theme-dir> [--json <out.json>]
 *
 * Reports:
 *   - manifest (name, schemaVersion, layout), templates, sections (+ block types), snippets
 *   - sections / block types / global settings the base does not have, and in how many OTHER themes
 *     (reference/* and themes/*) each one also appears (2+ themes = candidate for the base)
 *   - platform contract: hooks present / missing, storefront endpoints, pixel events, helpers outside the
 *     engine list, root data fields it reads that the base never reads (e.g. product.bundles, option.badge_text)
 * Matching is by name plus a fuzzy alias table (faq ~ faqs, feature-rows ~ features …), so read the report
 * critically: a "new" section may be a base section under another name.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const dir = path.resolve(args.find((a) => !a.startsWith('--')) || '');
const jsonOut = args.includes('--json') ? args[args.indexOf('--json') + 1] : null;
if (!fs.existsSync(path.join(dir, 'theme.json'))) { console.error('No theme.json in ' + dir); process.exit(1); }

const ENGINE_HELPERS = new Set(['if', 'unless', 'each', 'with', 'lookup', 'log', 'else', 'eq', 'gt', 'limit', 'json', 'money', 'applyTokens',
  'faqItems', 'stars5', 'swatchStyle', 'contains', 'editable', 'editableSetting']);
const ALIASES = [
  ['faq', 'faqs', 'questions', 'accordion-faq'], ['feature-rows', 'features', 'image-with-text-rows', 'alternating'],
  ['image-banner', 'hero', 'banner', 'slideshow'], ['logo-bar', 'press', 'logos', 'as-seen-in'], ['reviews', 'product-reviews'],
  ['testimonials', 'home-reviews', 'reviews-carousel'], ['related', 'related-products', 'recommendations', 'you-may-also-like'],
  ['rich-text', 'text', 'guarantee'], ['icon-columns', 'icons', 'trust-badges', 'benefits', 'usp'], ['image-row', 'video-row', 'reels', 'videos'],
  ['comparison', 'compare', 'vs'], ['marquee', 'scrolling-text', 'ticker'], ['custom-html', 'html', 'custom-liquid'],
];
const canon = (name) => {
  const n = String(name).toLowerCase().replace(/^(tt|lu|w|ms|b)-/, '');
  for (const group of ALIASES) if (group.includes(n)) return group[0];
  return n;
};

function walk(d, out) {
  if (!fs.existsSync(d)) return out;
  for (const f of fs.readdirSync(d)) {
    if (f === 'node_modules' || f.startsWith('.') || f === '_work') continue;
    const full = path.join(d, f);
    if (fs.statSync(full).isDirectory()) walk(full, out); else out.push(full);
  }
  return out;
}
const readJson = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return null; } };

function inventory(themeDir) {
  const files = walk(themeDir, []);
  const rel = (f) => path.relative(themeDir, f).replace(/\\/g, '/');
  const text = (re) => files.filter((f) => re.test(f)).map((f) => fs.readFileSync(f, 'utf8')).join('\n');
  const hbsRaw = text(/\.hbs$/), js = text(/\.js$/) + '\n' + hbsRaw;
  const hbs = hbsRaw.replace(/\{\{!--[\s\S]*?--\}\}/g, '').replace(/\{\{![^}]*\}\}/g, '');
  const sections = {};
  for (const f of files.filter((x) => /sections[\\/][^\\/]+\.hbs$/.test(x))) {
    const name = path.basename(f, '.hbs');
    const schema = readJson(f.replace(/\.hbs$/, '.schema.json')) || {};
    sections[name] = { blocks: (schema.blocks || []).map((b) => b.type), settings: (schema.settings || []).filter((s) => s.id).map((s) => s.id) };
  }
  // v1 themes keep sections inline: count the BEM roots of big blocks in templates too.
  const inlineBlocks = new Set();
  for (const m of hbs.matchAll(/class="([a-z]{1,4}-[a-z0-9]+)(?:[ "])/g)) inlineBlocks.add(m[1]);
  const settingsSchema = readJson(path.join(themeDir, 'config', 'settings_schema.json')) || [];
  const settings = [];
  for (const g of settingsSchema) for (const s of g.settings || []) if (s.id) settings.push(s.id);
  const helpers = new Set();
  // Helper calls from the Handlebars AST (block helpers, sub-expressions, mustaches with arguments).
  const visit = (n) => {
    if (!n || typeof n !== 'object') return;
    const call = n.type === 'SubExpression' || n.type === 'BlockStatement' || (n.type === 'MustacheStatement' && (n.params.length || (n.hash && n.hash.pairs.length)));
    if (call && n.path && n.path.type === 'PathExpression' && !n.path.data && n.path.parts.length === 1) helpers.add(n.path.original);
    for (const k of Object.keys(n)) {
      if (k === 'loc') continue;
      const v = n[k];
      if (Array.isArray(v)) v.forEach(visit); else if (v && typeof v === 'object') visit(v);
    }
  };
  for (const f of files.filter((x) => x.endsWith('.hbs'))) {
    try { visit(Handlebars.parse(fs.readFileSync(f, 'utf8'))); } catch (e) { /* unparsable template: pack.js reports it */ }
  }
  const endpoints = new Set((js.match(/\/api\/storefront\/[a-z0-9\-/]+/gi) || []).map((e) => e.replace(/\/$/, '')));
  const events = new Set();
  for (const m of js.matchAll(/__adluxTrack\(\s*['"]([A-Za-z]+)['"]/g)) events.add(m[1]);
  for (const m of js.matchAll(/\b(?:track|ct|fire)\(\s*['"](ViewContent|AddToCart|InitiateCheckout|Lead|Search|AddPaymentInfo|Purchase|CompleteRegistration)['"]/g)) events.add(m[1]);
  const fields = new Set();
  for (const m of hbs.matchAll(/(?:@root\.|\.\.\/|\b)((?:product|brand|config|page|collection|policyLinks|policies)\.[a-zA-Z_][\w.]*)/g)) fields.add(m[1]);
  for (const m of hbs.matchAll(/\{\{[#^]?(?:if |unless )?\s*([a-z_]+)\s*\}\}/g)) if (/^(badge_text|custom_name|image|color|active|featured_image|available|thumb_url|poster_url|is_video)$/.test(m[1])) fields.add('option.' + m[1]);
  const hooks = {
    trackingHead: /\{\{\{trackingHead\}\}\}/.test(hbs), trackingBody: /\{\{\{trackingBody\}\}\}/.test(hbs),
    'sf-config': /id="sf-config"/.test(hbs), 'sf-variants-data': /id="sf-variants-data"/.test(hbs), addToCart: /id="addToCart"/.test(hbs),
    'testid add-to-cart': /data-testid="add-to-cart"/.test(hbs), 'CartDrawer-Checkout': /id="CartDrawer-Checkout"/.test(hbs),
    'testid checkout-button': /data-testid="checkout-button"/.test(hbs),
  };
  return {
    dir: themeDir, manifest: readJson(path.join(themeDir, 'theme.json')) || {},
    templates: files.filter((f) => /templates[\\/]/.test(f)).map(rel),
    snippets: files.filter((f) => /snippets[\\/][^\\/]+\.hbs$/.test(f)).map((f) => path.basename(f, '.hbs')),
    sections, inlineBlocks: [...inlineBlocks], settings, helpers: [...helpers], endpoints: [...endpoints], events: [...events], fields: [...fields], hooks,
    css: files.filter((f) => f.endsWith('.css')).reduce((s, f) => s + fs.statSync(f).size, 0),
  };
}

const base = inventory(path.join(ROOT, 'base-theme'));
const target = inventory(dir);
const others = [];
for (const parent of ['reference', 'themes']) {
  const p = path.join(ROOT, parent);
  if (!fs.existsSync(p)) continue;
  for (const d of fs.readdirSync(p)) {
    const full = path.join(p, d);
    if (path.resolve(full) === dir || !fs.existsSync(path.join(full, 'theme.json'))) continue;
    others.push(inventory(full));
  }
}
const seenIn = (pred) => others.filter(pred).map((o) => path.basename(o.dir));

const baseSections = new Set(Object.keys(base.sections).map(canon));
const baseBlocks = new Set([].concat(...Object.values(base.sections).map((s) => s.blocks)));
const baseSettings = new Set(base.settings);
const baseFields = new Set(base.fields);
const out = { theme: target.manifest.name, dir: target.dir, schemaVersion: target.manifest.schemaVersion, layout: target.manifest.layout || null };

out.newSections = Object.entries(target.sections).filter(([n]) => !baseSections.has(canon(n))).map(([n, s]) => ({
  name: n, blocks: s.blocks, settings: s.settings,
  alsoIn: seenIn((o) => Object.keys(o.sections).some((x) => canon(x) === canon(n)) || o.inlineBlocks.some((b) => canon(b.replace(/^[a-z]+-/, '')) === canon(n))),
}));
out.newBlockTypes = [...new Set([].concat(...Object.values(target.sections).map((s) => s.blocks)))].filter((b) => !baseBlocks.has(b)).map((b) => ({
  type: b, alsoIn: seenIn((o) => Object.values(o.sections).some((s) => s.blocks.includes(b))),
}));
out.newSettings = target.settings.filter((s) => !baseSettings.has(s)).map((s) => ({ id: s, alsoIn: seenIn((o) => o.settings.includes(s)) }));
out.helpersOutsideEngine = target.helpers.filter((h) => !ENGINE_HELPERS.has(h) && !/^(this|section|settings|product|brand|config|page)$/.test(h));
out.endpointsNotInBase = target.endpoints.filter((e) => !base.endpoints.includes(e));
out.eventsNotInBase = target.events.filter((e) => !base.events.includes(e));
out.fieldsNotReadByBase = target.fields.filter((f) => !baseFields.has(f)).sort();
out.missingHooks = Object.entries(target.hooks).filter(([, v]) => !v).map(([k]) => k);
out.templatesNotInBase = target.templates.filter((t) => !base.templates.includes(t));
out.snippets = target.snippets;
out.cssBytes = target.css;

const line = (s) => console.log(s);
line('# ' + out.theme + '  (' + path.relative(ROOT, dir) + ', schema v' + out.schemaVersion + (out.layout ? ', layout' : ', no layout') + ', CSS ' + Math.round(out.cssBytes / 1024) + ' KB)');
line('\n## Sections not in base (' + out.newSections.length + ')');
out.newSections.forEach((s) => line('- ' + s.name + (s.blocks.length ? '  blocks: ' + s.blocks.join(', ') : '') + '  · also in: ' + (s.alsoIn.join(', ') || '—') + (s.alsoIn.length ? '  ← CANDIDATE' : '')));
line('\n## Block types not in base (' + out.newBlockTypes.length + ')');
out.newBlockTypes.forEach((b) => line('- ' + b.type + '  · also in: ' + (b.alsoIn.join(', ') || '—')));
line('\n## Global settings not in base (' + out.newSettings.length + ')');
line(out.newSettings.map((s) => s.id + (s.alsoIn.length ? ' (' + s.alsoIn.length + ')' : '')).join(', ') || '—');
line('\n## Platform contract');
line('- missing hooks: ' + (out.missingHooks.join(', ') || 'none'));
line('- storefront endpoints the base core does not call: ' + (out.endpointsNotInBase.join(', ') || 'none'));
line('- pixel events the base does not fire: ' + (out.eventsNotInBase.join(', ') || 'none'));
line('- helpers outside the engine list: ' + (out.helpersOutsideEngine.join(', ') || 'none'));
line('- data fields read here but never by the base: ' + (out.fieldsNotReadByBase.join(', ') || 'none'));
line('\n## Templates not in base: ' + (out.templatesNotInBase.join(', ') || 'none'));
line('## Snippets: ' + out.snippets.join(', '));
if (jsonOut) { fs.writeFileSync(jsonOut, JSON.stringify(out, null, 2)); line('\nJSON → ' + jsonOut); }
