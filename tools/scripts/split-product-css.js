#!/usr/bin/env node
// node tools/scripts/split-product-css.js <theme-dir> [--prefix pf] [--dry]
// CSS over budget on non-product pages: moves every product-page-only rule (gallery, info column, packs, pickers,
// sticky bar, reviews, story rows, comparison, sliders… + the theme's own product classes "<prefix>-…" listed in
// PF below) out of sections.css and skin.css into assets/css/<prefix>-product.css, and links that file right after
// {{> head}} in layout/theme.hbs and templates/product.hbs. Run css-compact.js on both files first. Check the
// product page afterwards: the moved rules now load after skin.css.
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const args = process.argv.slice(2);
const theme = path.resolve(args.find((a) => !a.startsWith('--')) || '.');
const prefix = args.includes('--prefix') ? args[args.indexOf('--prefix') + 1] : 'pf';
const dry = args.includes('--dry');
const BASE = 'pdp|gallery|info|cards|cards-block|card|units|opt|pill|swatch|sticky|iwt|compare|mslider|reel|reels|feature|features|spec|steps|stats|stat|sizechart|acc|benefit|quote|award|offer|stock|urgency|trust|pfaq|logos|rv|review|reviews|testi|subtitle|block-text|block-image|description|buy|buy-row|divider|price|rating';
const PF = 'quotes|quote|promise|hsa|comment|social|rating|acc-icon'; // extend with the theme's own product classes
const re = '\\.(b-(' + BASE + ')|' + prefix + '-(' + PF + '))(?![a-zA-Z])';
const css = path.join(theme, 'assets', 'css');
const dest = path.join(css, prefix + '-product.css');
if (dry) { console.log(re); process.exit(0); }
if (!fs.existsSync(dest)) fs.writeFileSync(dest, '/* ' + path.basename(theme) + ' — product page only (linked by layout/theme.hbs). Moved by split-product-css.js. */\n');
const split = path.join(__dirname, 'css-split.js');
for (const f of ['sections.css', 'skin.css']) {
  console.log(execFileSync(process.execPath, [split, path.join(css, f), dest, re, '/* from ' + f + ' */']).toString().trim());
}
const link = '<link rel="stylesheet" href="{{assets_url}}/css/' + prefix + '-product.css">';
for (const t of ['layout/theme.hbs', 'templates/product.hbs']) {
  const file = path.join(theme, t);
  if (!fs.existsSync(file)) continue;
  let s = fs.readFileSync(file, 'utf8');
  if (!s.includes(link)) { s = s.replace('{{> head}}\n', () => '{{> head}}\n' + link + '\n'); fs.writeFileSync(file, s); console.log('linked in ' + t); }
}
