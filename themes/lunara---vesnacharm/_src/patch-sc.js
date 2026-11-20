#!/usr/bin/env node
/*
 * Small, idempotent edits of Lunara files for the Shapecurve template (the Lunara build script is not in this repo).
 * Every insert is behind a setting whose default keeps the old output, so the other templates render the same bytes:
 *   sections/product.hbs      skin "shapecurve" (class + CSS / JS link), second button (buy_now_label), 4 new block types
 *   sections/reviews.hbs      show_write = false hides the "Write a review" button
 *   snippets/lu-size-finder.hbs  a size value "XS (95-110 lbs)" counts as XS (the part in brackets is ignored)
 * Each anchor must be found exactly once (or the edit / its marker is already there), else the script stops.
 *
 *   node themes/lunara---vesnacharm/_src/patch-sc.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const THEME = path.resolve(__dirname, '..');

function patch(file, edits) {
  const f = path.join(THEME, file);
  let s = fs.readFileSync(f, 'utf8');
  for (const [name, from, to, marker] of edits) {
    if (s.includes(marker || to)) { console.log(file + ': ' + name + ' already there'); continue; }
    const n = s.split(from).length - 1;
    if (n !== 1) { console.error(file + ': ' + name + ': anchor found ' + n + ' times'); process.exit(1); }
    s = s.replace(from, () => to);
    console.log(file + ': ' + name);
  }
  fs.writeFileSync(f, s);
}

const SC = '(eq section.settings.skin "shapecurve")';
patch('sections/product.hbs', [
  ['skin',
    '<section id="shopify-section-template--28236351668559__main" class="shopify-section section">',
    '<section id="shopify-section-template--28236351668559__main" class="shopify-section section{{#if ' + SC + '}} sc-skin{{/if}}"{{#if ' + SC + '}} style="--sc-hl:{{#if section.settings.skin_highlight}}{{section.settings.skin_highlight}}{{else}}#790236{{/if}}"{{/if}}>{{#if ' + SC + '}}<link rel="stylesheet" href="{{@root.assets_url}}/css/sc-product.css"><script src="{{@root.assets_url}}/js/sc-product.js" defer></script>{{/if}}'],
  ['buy now',
    '</svg></div></button></div></div></form></product-form>{{/inline}}',
    '</svg></div></button></div>{{#if section.settings.buy_now_label}}<button type="button" class="button button--full-width sc-buynow" data-ms-buy-now>{{section.settings.buy_now_label}}</button>{{/if}}</div></form></product-form>{{/inline}}'],
  ['rating text',
    '<span class="trustpilot-rating-text">{{#if section.settings.rating_label}}{{section.settings.rating_label}}{{else}}Excellent{{/if}} {{product.reviews.summary.average_rating}} | {{product.reviews.summary.total_count}} reviews</span>',
    '<span class="trustpilot-rating-text">{{#if ' + SC + '}}{{product.reviews.summary.total_count}} Reviews{{else}}{{#if section.settings.rating_label}}{{section.settings.rating_label}}{{else}}Excellent{{/if}} {{product.reviews.summary.average_rating}} | {{product.reviews.summary.total_count}} reviews{{/if}}</span>'],
  ['blocks',
    '{{#if (eq type "faq")}}{{> lu-pi-faq this}}{{/if}}</div>{{/each}}{{/inline}}',
    '{{#if (eq type "faq")}}{{> lu-pi-faq this}}{{/if}}{{#if (eq type "sc_price")}}{{> sc-pb-price this}}{{/if}}{{#if (eq type "sc_highlights")}}{{> sc-pb-highlights this}}{{/if}}{{#if (eq type "sc_ship")}}{{> sc-pb-ship this}}{{/if}}{{#if (eq type "sc_tabs")}}{{> sc-pb-tabs this}}{{/if}}</div>{{/each}}{{/inline}}', '{{#if (eq type "sc_price")}}'],
  ['block sc_fit',
    '{{#if (eq type "sc_tabs")}}{{> sc-pb-tabs this}}{{/if}}</div>{{/each}}{{/inline}}',
    '{{#if (eq type "sc_tabs")}}{{> sc-pb-tabs this}}{{/if}}{{#if (eq type "sc_fit")}}{{> sc-fit this}}{{/if}}</div>{{/each}}{{/inline}}'],
]);

patch('sections/reviews.hbs', [
  ['show_write',
    '<button class="write" type="button"><span class="writeIcon">',
    '{{#unless (eq section.settings.show_write false)}}<button class="write" type="button"><span class="writeIcon">'],
  ['show_write end',
    '<span>Write a review</span></button>',
    '<span>Write a review</span></button>{{/unless}}'],
]);

patch('snippets/lu-size-finder.hbs', [
  ['letter in brackets',
    "function letter(v){\n    var n=norm(v)",
    "function letter(v){\n    var n=norm(String(v==null?'':v).replace(/\\s*\\([^)]*\\)\\s*$/,''))"],
]);
