#!/usr/bin/env node
/*
 * Lunara Vesnacharm — "Complete the bundle" offers (shopdy SHOPDY-127): this product + one other product, each at a
 * fixed bundle price, picked in the Kaching block. The backend (shopdy-promax) sends the live offers as
 * product.companion_bundles / config.companionBundles, prices the pair on /cart/price and /cart/place from the offer
 * key the theme puts on both cart lines, and never discounts those lines.
 *
 *   1. copies _src/cb/* into the theme: snippets/lu-companion-bar.hbs, assets/js/lu-companion.js,
 *      assets/css/lu-companion.css (overwritten when they differ — edit them in _src/cb/);
 *   2. anchored edits, as patch-vn.js: skipped when the "done" marker is already there, stops when an anchor moved:
 *      - snippets/lu-kaching.hbs: one bar per offer after the packs, and the CSS + JS when there is one;
 *      - snippets/gs-head.hbs: window.LuCB — the server's pairing (which units of each cart line the offer prices),
 *        so the cart drawer shows what the checkout charges on every page;
 *      - assets/js/theme.js (MSCart): keep `companionBundle` + `bundlePrice` on a cart line, merge lines by it, price
 *        the drawer with LuCB (bundle units at the bundle price, outside the automatic discounts — LuDisc), send the
 *        key to /cart/gifts, and count the bundle price in the drawer's InitiateCheckout value.
 *
 *   node themes/lunara---vesnacharm/_src/patch-cb.js
 */
'use strict';
const fs = require('fs');
const path = require('path');

const THEME = path.resolve(__dirname, '..');

const FILES = [
  ['cb/lu-companion-bar.hbs', 'snippets/lu-companion-bar.hbs'],
  ['cb/lu-companion.js', 'assets/js/lu-companion.js'],
  ['cb/lu-companion.css', 'assets/css/lu-companion.css'],
];

const LUCB = '<script>(function(){\n'
  + '/* "Complete the bundle" (SHOPDY-127): which units of each cart line an offer prices = the server\'s rule\n'
  + '   (shopdy-promax storefront/domain/companion-bundles.ts pairCompanionBundles). A line carries the offer key\n'
  + '   "<mainProductId>:<offerId>" (companionBundle) and its bundle unit price (bundlePrice). Per key, pairs = the smaller of\n'
  + '   the main product\'s units and the companion\'s; each side gives them out in cart order; the rest of a line is a normal\n'
  + '   line (catalog price, automatic discounts). units(lines) -> [bundle units per line]; gross(line, units) -> line price. */\n'
  + 'function units(lines){var t={},side=[];(lines||[]).forEach(function(l,i){var k=l&&!l.gift&&l.companionBundle?String(l.companionBundle):"";if(!k){side[i]=null;return;}'
  + 'var r=String(l.productId||"").toLowerCase()===k.split(":")[0].toLowerCase()?"m":"c";side[i]={k:k,r:r};var x=t[k]||(t[k]={m:0,c:0});x[r]+=Math.max(0,parseInt(l.qty,10)||0);});\n'
  + 'var left={};Object.keys(t).forEach(function(k){var p=Math.min(t[k].m,t[k].c);left[k]={m:p,c:p};});\n'
  + 'return (lines||[]).map(function(l,i){var s=side[i];if(!s)return 0;var q=Math.max(0,parseInt(l.qty,10)||0),take=Math.min(q,left[s.k][s.r]);left[s.k][s.r]-=take;return take;});}\n'
  + 'function gross(l,u){var q=Math.max(0,parseInt(l.qty,10)||0),b=Math.min(u||0,q);return (Number(l.price)||0)*(q-b)+(Number(l.bundlePrice)||0)*b;}\n'
  + 'window.LuCB={units:units,gross:gross};\n'
  + '})();\n</script>';

const EDITS = [
  // ---- the bars: one per live offer, right after the 4 Kaching packs (inside .kaching-bundles__bars)
  {
    file: 'snippets/lu-kaching.hbs', done: '{{> lu-companion-bar}}',
    find: 'p="pack4_"}}',
    replace: 'p="pack4_"}}\n{{#each @root.product.companion_bundles}}{{> lu-companion-bar}}{{/each}}',
  },
  {
    file: 'snippets/lu-kaching.hbs', done: 'js/lu-companion.js',
    find: '<script type="application/json" data-lu-variants-json>',
    replace: '{{#if @root.product.companion_bundles.length}}<link rel="stylesheet" href="{{@root.assets_url}}/css/lu-companion.css">'
      + '<script src="{{@root.assets_url}}/js/lu-companion.js" defer></script>{{/if}}\n'
      + '<script type="application/json" data-lu-variants-json>',
  },
  // ---- the pairing, on every page (the cart drawer is on every page)
  {
    file: 'snippets/gs-head.hbs', done: 'window.LuCB=',
    find: 'window.LuDisc={best:best,tiers:tiers,offers:offers,amountOff:amountOff};\n})();\n</script>',
    replace: 'window.LuDisc={best:best,tiers:tiers,offers:offers,amountOff:amountOff};\n})();\n</script>\n' + LUCB,
  },
  // ---- MSCart (theme.js, minified): read a line's key and bundle price back from localStorage …
  {
    file: 'assets/js/theme.js', done: 'companionBundle:y.companionBundle',
    find: 'bundleImg:y.bundleImg||"",gift:!!y.gift}',
    replace: 'bundleImg:y.bundleImg||"",gift:!!y.gift,companionBundle:y.companionBundle||"",bundlePrice:B(y.bundlePrice)}',
  },
  // … write them (only on a bundle line: every other line stays byte-identical) …
  {
    file: 'assets/js/theme.js', done: 'b.companionBundle=k.companionBundle',
    find: 'bundleImg:k.bundleImg||"",gift:!!k.gift};return k.variantId&&(b.variantId=k.variantId),b',
    replace: 'bundleImg:k.bundleImg||"",gift:!!k.gift};return k.companionBundle&&(b.companionBundle=k.companionBundle,b.bundlePrice=k.bundlePrice||0),k.variantId&&(b.variantId=k.variantId),b',
  },
  // … never merge a bundle line into the same variant bought on its own …
  {
    file: 'assets/js/theme.js', done: '(k.companionBundle||"")===(x.companionBundle||"")',
    find: '(k.bundleKey||"")===(x.bundleKey||"")&&!!k.gift==!!x.gift',
    replace: '(k.bundleKey||"")===(x.bundleKey||"")&&!!k.gift==!!x.gift&&(k.companionBundle||"")===(x.companionBundle||"")',
  },
  // … automatic discounts (LuDisc) see only the units outside a pair; a line wholly in pairs is left out like a gift …
  {
    file: 'assets/js/theme.js', done: 'gift:!!x.gift||nb<=0',
    find: 'r.map(function(x){return{pid:x.productId,vid:x.variantId||"",price:x.price,qty:x.qty,gift:!!x.gift}})',
    replace: '(function(bu){return r.map(function(x,ix){var nb=x.qty-(bu[ix]||0);return{pid:x.productId,vid:x.variantId||"",price:x.price,qty:nb>0?nb:x.qty,gift:!!x.gift||nb<=0}})})(window.LuCB?LuCB.units(r):[])',
  },
  // … the drawer: each line, the subtotal and the savings at the bundle price for the paired units …
  {
    file: 'assets/js/theme.js', done: 'BU=window.LuCB?LuCB.units(r):[]',
    find: 'var S=v();',
    replace: 'var S=v(),BU=window.LuCB?LuCB.units(r):[];',
  },
  {
    file: 'assets/js/theme.js', done: 'Lt=(window.LuCB?LuCB.gross(D,BU[J])',
    find: 'Lt=D.price*D.qty-S.per[J]',
    replace: 'Lt=(window.LuCB?LuCB.gross(D,BU[J]):D.price*D.qty)-S.per[J]',
  },
  {
    file: 'assets/js/theme.js', done: 'C=r.reduce(function(D,J,ut){return D+(window.LuCB',
    find: 'C=r.reduce(function(D,J){return D+J.price*J.qty},0)',
    replace: 'C=r.reduce(function(D,J,ut){return D+(window.LuCB?LuCB.gross(J,BU[ut]):J.price*J.qty)},0)',
  },
  {
    file: 'assets/js/theme.js', done: '*J.qty-((window.LuCB?LuCB.gross(J,BU[ut])',
    find: '(J.compareAt>J.price?J.compareAt:J.price)*J.qty-(J.price*J.qty-S.per[ut])',
    replace: '(J.compareAt>J.price?J.compareAt:J.price)*J.qty-((window.LuCB?LuCB.gross(J,BU[ut]):J.price*J.qty)-S.per[ut])',
  },
  // … the free gifts the drawer asks for count a bundle line at its bundle price (the server pairs it the same way) …
  {
    file: 'assets/js/theme.js', done: 'y.companionBundle&&(W.companionBundle=y.companionBundle)',
    find: 'var W={qty:y.qty};return y.variantId?',
    replace: 'var W={qty:y.qty};y.companionBundle&&(W.companionBundle=y.companionBundle);return y.variantId?',
  },
  // … and the drawer's InitiateCheckout value is what the cart costs.
  {
    file: 'assets/js/theme.js', done: 'value:(function(bu){return r.reduce(',
    find: 'value:r.reduce(function(x,N){return x+N.price*N.qty},0)',
    replace: 'value:(function(bu){return r.reduce(function(x,N,ix){return x+(window.LuCB?LuCB.gross(N,bu[ix]):N.price*N.qty)},0)})(window.LuCB?LuCB.units(r):[])',
  },
];

let copied = 0;
for (const [from, to] of FILES) {
  const src = fs.readFileSync(path.join(__dirname, from), 'utf8');
  const dest = path.join(THEME, to);
  if (fs.existsSync(dest) && fs.readFileSync(dest, 'utf8') === src) { console.log('same     ' + to); continue; }
  fs.writeFileSync(dest, src);
  copied++;
  console.log('copied   ' + to);
}

let applied = 0;
for (const e of EDITS) {
  const f = path.join(THEME, e.file);
  let s = fs.readFileSync(f, 'utf8');
  if (s.includes(e.done)) { console.log('already  ' + e.file + '  ' + e.done); continue; }
  const n = s.split(e.find).length - 1;
  if (n !== 1) { console.error('ANCHOR ' + (n ? 'not unique (' + n + ')' : 'missing') + ' in ' + e.file + ': ' + e.find.slice(0, 80)); process.exit(1); }
  s = s.replace(e.find, () => e.replace);
  if (!s.includes(e.done)) { console.error('DONE marker not produced in ' + e.file + ': ' + e.done); process.exit(1); }
  fs.writeFileSync(f, s);
  applied++;
  console.log('applied  ' + e.file + '  ' + e.done);
}
console.log(copied + ' file(s) copied, ' + applied + ' edit(s) applied');
