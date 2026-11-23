#!/usr/bin/env node
/*
 * Lunara Vesnacharm — cart drawer (user 2026-11-23). Run AFTER patch-vn.js and patch-cb.js: the theme.js anchors are
 * text patch-cb.js writes, and every replacement keeps patch-cb's own "done" markers, so both stay re-runnable.
 *
 *   1. "Customers also add …" (cart body upsells) only when Theme settings > Cart drawer > "Show the upsell products"
 *      is on (vn_cart_upsell_show, default off, from _src/build-vn-settings.js). A NEW setting is used because shopdy
 *      keeps every value a store already saved when a zip is updated (merge-theme-settings.ts): emptying the picks in
 *      settings_data.json would not reach a live store, a new key arrives with the zip's default.
 *   2. Each cart line shows its share of what the checkout charges, the discount spread evenly over the lines of the
 *      same product (as a Kaching pack is priced): Buy 2 at $62.99 = two lines of $31.50 + $31.49 (cents add up to the
 *      subtotal exactly), not $35.99 + $27.00 as TIERED_NEXT_ITEM puts it on the 2nd unit. Spread by line price, so a
 *      dearer variant pays more. Gifts, hidden protection lines and "Complete the bundle" lines keep their own amount.
 *      The subtotal, savings row and checkout are unchanged (same discount engine: LuDisc / the theme's tiers).
 *   3. "(You save …)" on a line = percent off its compare-at price (SAVE 74 % as the packs), not dollars.
 *   4. Shipping protection = only a product NAMED so (window.LuProt, gs-head): the drawer ignores any other pick of
 *      "Protection product" (a product you sell picked there was taken for protection and Add to cart emptied the
 *      cart), and the home grid / search / collection lists never show a protection product.
 *   5. The volume tiers (LuDisc.tiered) count only the products the store's tier discount covers (nextItemTierProducts),
 *      as the checkout does: with the discount limited to the products sold, the protection switch adds its full price.
 *
 *   node themes/lunara---vesnacharm/_src/patch-cart.js
 */
'use strict';
const fs = require('fs');
const path = require('path');

const THEME = path.resolve(__dirname, '..');

// Per-line paid amount: per product, the pool's paid total in cents shared by cumulative line price (the last line
// takes the remainder), so the lines always add up to what the subtotal shows.
const SPREAD = 'PA=(function luAvg(r,S,BU){'
  + 'var g=r.map(function(D,J){return window.LuCB?LuCB.gross(D,BU[J]):D.price*D.qty}),'
  + 'o=g.map(function(x,J){return x-(S.per[J]||0)}),P={};'
  + 'r.forEach(function(D,J){if(D.gift||(window.LuUp&&LuUp.hide(D))||(BU[J]||0)>0)return;'
  + 'var k=String(D.productId||D.title||J);(P[k]=P[k]||[]).push(J)});'
  + 'Object.keys(P).forEach(function(k){var L=P[k],G=0,T=0;'
  + 'L.forEach(function(J){G+=g[J];T+=o[J]});if(!(G>0)||L.length<2)return;'
  + 'var c=Math.round(T*100),a=0,s=0;'
  + 'L.forEach(function(J,i){s+=g[J];var u=i===L.length-1?c:Math.round(c*s/G);o[J]=(u-a)/100;a=u})});'
  + 'return o})(r,S,BU)';

// Shipping protection (user 2026-11-23, live: the products sold were picked as "Protection product", Add to cart
// emptied the cart; the "Shipping Protected" product showed in the home grid). A product is protection when its name
// (title / handle / url) says so: Shipping / Package / Parcel / Order / Delivery + Protect… / Insur…
const PROT = '<script>window.LuProt=function(p){var s=typeof p==="string"?p:p?(p.title||"")+" "+(p.handle||"")+" "+(p.url||""):"";'
  + 'return /(shipping|package|parcel|order|delivery)[\\s_-]*(protect|insur)/i.test(s)};</script>';

const EDITS = [
  // 1. upsell cards behind the switch: open + close around the whole block
  {
    file: 'sections/cart-drawer.hbs', done: '{{#if settings.vn_cart_upsell_show}}{{#if settings.cart_body_upsells.length}}',
    find: '{{#if settings.cart_body_upsells.length}}',
    replace: '{{#if settings.vn_cart_upsell_show}}{{#if settings.cart_body_upsells.length}}',
  },
  {
    file: 'sections/cart-drawer.hbs', done: '{{/each}}</div></div>{{/if}}{{/if}}{{> lu_chtml pos="body_end"}}',
    find: '{{/each}}</div></div>{{/if}}{{> lu_chtml pos="body_end"}}',
    replace: '{{/each}}</div></div>{{/if}}{{/if}}{{> lu_chtml pos="body_end"}}',
  },
  // 2. the drawer (theme.js MSCart render): paid amount per line, spread per product …
  {
    file: 'assets/js/theme.js', done: 'PA=(function luAvg(',
    find: 'var S=v(),BU=window.LuCB?LuCB.units(r):[];',
    replace: 'var S=v(),BU=window.LuCB?LuCB.units(r):[],' + SPREAD + ';',
  },
  // … used as the line's price (patch-cb's Lt stays in place, then is replaced: var may repeat a name) …
  {
    file: 'assets/js/theme.js', done: '-S.per[J],Lt=PA[J],Ct=',
    find: 'Lt=(window.LuCB?LuCB.gross(D,BU[J]):D.price*D.qty)-S.per[J],Ct=',
    replace: 'Lt=(window.LuCB?LuCB.gross(D,BU[J]):D.price*D.qty)-S.per[J],Lt=PA[J],Ct=',
  },
  // 3. … and "(You save 74%)" off the line's compare-at total
  {
    file: 'assets/js/theme.js', done: 'textContent=Math.max(1,Math.round(Q/Ct*100))+"%"',
    find: 't("[data-ms-save]",et).textContent="$"+(Math.round(Q*100)%100?Q.toFixed(2):Math.round(Q))',
    replace: 't("[data-ms-save]",et).textContent=Math.max(1,Math.round(Q/Ct*100))+"%"',
  },
  // 4. the shipping protection product = a product NAMED so (every page: gs-head, after patch-cb's LuCB) …
  {
    file: 'snippets/gs-head.hbs', done: 'window.LuProt=',
    find: 'window.LuCB={units:units,gross:gross};\n})();\n</script>',
    replace: 'window.LuCB={units:units,gross:gross};\n})();\n</script>\n' + PROT,
  },
  // … the cart drawer drops every other pick of "Protection product" before it syncs (LuUp.sync) …
  {
    file: 'assets/js/theme.js', done: 'LuProt({title:e.getAttribute("data-title")',
    find: 'function ve(A,K,G){t=A,u=K,ct=G;',
    replace: 'function ve(A,K,G){t=A,u=K,ct=G;window.LuProt&&gt("[data-lu-up]").forEach(function(e){LuProt({title:e.getAttribute("data-title")||""})||e.parentNode.removeChild(e)});',
  },
  // … and product lists never show it: the page's #ms-products (home grid, home reviews, search, collection) …
  {
    file: 'assets/js/theme.js', done: 'e==="#ms-products"&&Array.isArray(v)',
    find: 'function Dt(e,n){try{return JSON.parse((t(e)||{}).textContent||"null")||n}catch{return n}}',
    replace: 'function Dt(e,n){try{var v=JSON.parse((t(e)||{}).textContent||"null")||n;return e==="#ms-products"&&Array.isArray(v)?v.filter(function(p){return!(window.LuProt&&LuProt(p))}):v}catch{return n}}',
  },
  // … and the list another page fetches from the home page's HTML
  {
    file: 'assets/js/theme.js', done: 'o=(i?JSON.parse(i[1]):[]).filter(',
    find: 'o=i?JSON.parse(i[1]):[];',
    replace: 'o=(i?JSON.parse(i[1]):[]).filter(function(p){return!(window.LuProt&&LuProt(p))});',
  },
  // 5. the volume tiers only count the products the store's TIERED_NEXT_ITEM discount covers (user 2026-11-23: the
  //    "Shipping Protected" switch must add its full price). The engine gives `nextItemTierProducts` (ids, null = every
  //    product) = the checkout's isProductBelongsToX (shopdy discount-engine.ts): units of other products take no
  //    position and no percent. Not set (preview, older engine) = every product, as before.
  {
    file: 'snippets/gs-head.hbs', done: 'window.LuTierPids=',
    find: 'window.LuDisc={best:best,tiers:tiers,offers:offers,amountOff:amountOff};\n})();\n</script>',
    replace: 'window.LuDisc={best:best,tiers:tiers,offers:offers,amountOff:amountOff};\n})();\n</script>\n'
      + '<script>window.LuTierPids={{json @root.nextItemTierProducts}};</script>',
  },
  {
    file: 'snippets/gs-head.hbs', done: 'var sc=window.LuTierPids,',
    find: '  lines.forEach(function(l,i){if(l.gift)return;for(var k=0;k<l.qty;k++)u.push({i:i,p:l.price});});',
    replace: '  var sc=window.LuTierPids,ok=Array.isArray(sc)?sc.map(function(x){return String(x).toLowerCase();}):null;\n'
      + '  lines.forEach(function(l,i){if(l.gift||(ok&&ok.indexOf(String(l.pid||"").toLowerCase())<0))return;for(var k=0;k<l.qty;k++)u.push({i:i,p:l.price});});',
  },
];

let applied = 0;
for (const e of EDITS) {
  const f = path.join(THEME, e.file);
  let s = fs.readFileSync(f, 'utf8');
  if (s.includes(e.done)) { console.log('already  ' + e.file + '  ' + e.done.slice(0, 60)); continue; }
  const n = s.split(e.find).length - 1;
  if (n !== 1) { console.error('ANCHOR ' + (n ? 'not unique (' + n + ')' : 'missing') + ' in ' + e.file + ': ' + e.find.slice(0, 80)); process.exit(1); }
  s = s.replace(e.find, () => e.replace);
  if (!s.includes(e.done)) { console.error('DONE marker not produced in ' + e.file + ': ' + e.done); process.exit(1); }
  fs.writeFileSync(f, s);
  applied++;
  console.log('applied  ' + e.file + '  ' + e.done.slice(0, 60));
}
console.log(applied + ' edit(s) applied');
