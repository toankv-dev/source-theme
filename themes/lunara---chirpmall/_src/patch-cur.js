#!/usr/bin/env node
/*
 * Lunara Vesnacharm — local currency (shopdy SHOPDY-12; user 2026-11-26, Norway: show and charge NOK).
 * Plan + traps: docs/plan-lunara-local-currency.md. Run AFTER patch-vn.js, patch-cb.js and patch-cart.js (it anchors on
 * their output), BEFORE _src/build-lang.js. Idempotent: a file holding the marker is left alone; a file where any rule
 * does not match exactly as often as expected is left untouched and reported (never half patched).
 *
 * How shopdy prices a shopper's cart (fx-quote.ts): each catalog UNIT price (selling, compare-at, Complete-the-bundle)
 * is converted and rounded up to .99 (`SFMoney.convertUsd`), THEN lines are summed and percent / tiered / Buy X Get Y
 * discounts are worked out on those local prices; a fixed discount uses the exact rate rounded down.
 * The theme does the same, for DISPLAY only:
 *   - window.LuCur (gs-head, before theme.js): u(usd) = shown unit price, f(local) = text, fu(usd), set / mk = a unit
 *     price element carries `data-price-usd` (shopdy's runtime rewrites it when the currency arrives), h(usd) = the
 *     same as HTML, cart(lines) = a converted copy of the cart lines, fx() = a fixed discount value while the lines are
 *     local. Without SFMoney (store switch off, or a USD shopper) every output is what the theme printed before.
 *   - The stored cart stays USD: the drawer render swaps the cart lines for a converted copy inside try / finally and
 *     puts the USD lines back (they are saved to localStorage and read by the checkout).
 *   - Kaching packs convert each unit before the tier / Buy X Get Y maths; the cart drawer, packs and Complete the
 *     bundle redraw on `sfmoney:change` (a first visit learns the currency up to 300 ms after load).
 * Only a build that sets theme.json "supportsLocalCurrency": true lets a store switch it on (build-lang.js:
 * _meta.localCurrency in the language dictionary).
 *
 *   node themes/lunara---vesnacharm/_src/patch-cur.js
 */
'use strict';
const fs = require('fs');
const path = require('path');

const THEME = path.resolve(__dirname, '..');
const MARK = 'lu-cur';

const LUCUR = '<script>/*' + MARK + '*/window.LuCur=window.LuCur||(function(){var C={loc:0};'
  + 'function S(){var s=window.SFMoney;return s&&s.currency&&s.currency!=="USD"&&typeof s.convertUsd=="function"?s:null}'
  + 'function n(x){return typeof x=="number"?x:parseFloat(String(x==null?"":x).replace(/[^0-9.]/g,""))||0}'
  + 'function d(x){return"$"+(Math.round((Number(x)||0)*100)/100).toFixed(2)}'
  + 'C.on=function(){return!!S()};'
  + 'C.u=function(x){var s=S();x=n(x);return s?s.convertUsd(x):x};'
  + 'C.f=function(x){var s=S();return s?s.format(Number(x)||0):d(x)};'
  + 'C.fu=function(x){return C.f(C.u(x))};'
  // the exact rate (convertUsd rounds a million up to .99: 1e-6 off at most)
  + 'C.dn=function(x){var s=S();x=n(x);return s?Math.floor(x*(s.convertUsd(1e6)/1e6)*100+1e-6)/100:x};'
  + 'C.fx=function(x){return C.loc&&S()?C.dn(x):x};'
  + 'C.lbl=function(v){return S()?C.f(C.dn(v)):"$"+v};'
  + 'C.mk=function(e,x){if(!e)return;x==null||x===""?e.removeAttribute("data-price-usd"):e.setAttribute("data-price-usd",String(n(x)))};'
  + 'C.set=function(e,x,p){if(!e)return;p=p||"";if(x==null){e.textContent="";C.mk(e,null);return}e.textContent=p+C.fu(x)+p;C.mk(e,x)};'
  + 'C.h=function(x){return\'<span data-price-usd="\'+n(x)+\'">\'+C.fu(x)+"</span>"};'
  + 'C.cart=function(r){return S()?r.map(function(l){var o={},k;for(k in l)o[k]=l[k];o.price=C.u(l.price);'
  + 'o.compareAt=l.compareAt?C.u(l.compareAt):l.compareAt;o.bundlePrice=l.bundlePrice?C.u(l.bundlePrice):l.bundlePrice;return o}):r};'
  + 'window.addEventListener("sfmoney:change",function(){try{window.LuCartR&&window.LuCartR()}catch(e){}'
  + '[].forEach.call(document.querySelectorAll("[data-lu-kaching]"),function(o){try{o.__luK&&o.__luK(o.__luA,o.__luP)}catch(e){}});'
  + '[].forEach.call(document.querySelectorAll("[data-lu-cb-side]"),function(w){var s=w.querySelector("select");'
  + 'try{s&&s.dispatchEvent(new Event("change",{bubbles:true}))}catch(e){}})});'
  + 'return C})();</script>\n';

const FILES = {
  'snippets/gs-head.hbs': {
    marker: '/*' + MARK + '*/',
    prepend: LUCUR,
    rules: [
      ['bxgy fixed value', ',v=Number(o.value)||0;', ',v=LuCur.fx(Number(o.value)||0);', 1],
      ['amount-off fixed value', 'var v=Number(o.value)||0,x=o.x||[],el=[],q=0,sub=0;', 'var v=LuCur.fx(Number(o.value)||0),x=o.x||[],el=[],q=0,sub=0;', 1],
      ['amount-off minimum subtotal', 'sub<Number(o.minSubtotal)', 'sub<LuCur.fx(Number(o.minSubtotal))', 1],
      ['label " $x off"', '" $"+o.value+" off"', '" "+LuCur.lbl(o.value)+" off"', 1],
      ['label "$x off"', '"$"+o.value+" off"', 'LuCur.lbl(o.value)+" off"', 1],
    ],
  },
  'snippets/sc-pb-price.hbs': {
    marker: 'data-price-usd',
    rules: [
      ['price', '<span class="sc-price__now price-item price-item--sale">{{@root.product.price}}</span>',
        '<span class="sc-price__now price-item price-item--sale"{{#if @root.product.price}} data-price-usd="{{usdAmount @root.product.price}}"{{/if}}>{{@root.product.price}}</span>', 1],
      ['compare', '<s class="sc-price__was">{{@root.product.compare_at_price}}</s>',
        '<s class="sc-price__was"{{#if @root.product.compare_at_price}} data-price-usd="{{usdAmount @root.product.compare_at_price}}"{{/if}}>{{@root.product.compare_at_price}}</s>', 1],
    ],
  },
  'sections/related.hbs': {
    marker: 'LuCur.set(',
    rules: [
      ['regular', "if (r) r.textContent = ' ' + money(sp) + ' ';", "if (r) LuCur.set(r, sp, ' ');", 1],
      ['sale', "if (s) s.textContent = ' ' + money(sp) + ' ';", "if (s) LuCur.set(s, sp, ' ');", 1],
      ['compare', "if (o) o.textContent = on ? ' ' + money(cp) + ' ' : '';", "if (o) LuCur.set(o, on ? cp : null, ' ');", 1],
    ],
  },
  'assets/js/lu-companion.js': {
    marker: 'function LCU(',
    rules: [
      ['money = format only', "function money(n) { return '$' + (Math.round((Number(n) || 0) * 100) / 100).toFixed(2); }",
        "function money(n) { return window.LuCur ? LuCur.f(n) : '$' + (Math.round((Number(n) || 0) * 100) / 100).toFixed(2); }\n"
        + '  /** A USD unit price as the shopper sees it (shopdy local currency, per unit as the checkout). */\n'
        + '  function LCU(x) { return window.LuCur ? LuCur.u(x) : x; }', 1],
      ['row', 'var bp = num(side.bundlePrice), was = struck(v);', 'var bp = LCU(num(side.bundlePrice)), was = LCU(struck(v));', 1],
      ['save base', "? struck(m) + struck(c) : num(m.price) + num(c.price);", '? LCU(struck(m)) + LCU(struck(c)) : LCU(num(m.price)) + LCU(num(c.price));', 1],
      ['total', 'var total = num(o.main.bundlePrice) + num(o.companion.bundlePrice);', 'var total = LCU(num(o.main.bundlePrice)) + LCU(num(o.companion.bundlePrice));', 1],
      ['was', 'var was = struck(m) + struck(c);', 'var was = LCU(struck(m)) + LCU(struck(c));', 1],
    ],
  },
  'assets/js/theme.js': {
    marker: 'window.LuCartR=',
    rules: [
      ['yt format only', 'function yt(e){return"$"+(Math.round((Number(e)||0)*100)/100).toFixed(2)}',
        'function yt(e){return window.LuCur?LuCur.f(e):"$"+(Math.round((Number(e)||0)*100)/100).toFixed(2)}', 1],
      ['M format only', 'function M(S){return"$"+(Math.round((Number(S)||0)*100)/100).toFixed(2)}',
        'function M(S){return window.LuCur?LuCur.f(S):"$"+(Math.round((Number(S)||0)*100)/100).toFixed(2)}', 1],
      ['Pt format only', 'function Pt(A){return"$"+(Math.round((Number(A)||0)*100)/100).toFixed(2)}',
        'function Pt(A){return window.LuCur?LuCur.f(A):"$"+(Math.round((Number(A)||0)*100)/100).toFixed(2)}', 1],
      ['card price', 'yt(n.sellingPrice)', 'LuCur.h(n.sellingPrice)', 2],
      ['card compare', 'yt(n.compareAtPrice)', 'LuCur.h(n.compareAtPrice)', 1],
      ['cart sheet price', 'a&&(a.textContent=yt(pr));w&&(w.hidden=!(m.compare>pr),w.textContent=m.compare>pr?yt(m.compare):"")',
        'a&&LuCur.set(a,pr);w&&(w.hidden=!(m.compare>pr),LuCur.set(w,m.compare>pr?m.compare:null))', 1],
      ['cart render: local copy', 'W.innerHTML="";var S=v(),BU=', 'W.innerHTML="";var LUr=r;r=LuCur.cart(r);LuCur.loc=1;try{var S=v(),BU=', 1],
      ['cart render: USD back', 'var z=t("#CartDrawer-Checkout",i);z&&(z.disabled=N)}}function P(){',
        'var z=t("#CartDrawer-Checkout",i);z&&(z.disabled=N)}finally{r=LUr;LuCur.loc=0}}}function P(){', 1],
      ['cart render: redraw hook', 'var dt=(function(){var e=rt.domain||"",n="sf-cart:"+e,r=o(),i;',
        'var dt=(function(){window.LuCartR=function(){R()};var e=rt.domain||"",n="sf-cart:"+e,r=o(),i;', 1],
      ['card update', 't(".price__regular .price-item--regular",p).textContent=" "+yt(c)+" ",t(".price-item--sale",p).textContent=" "+yt(c)+" ",t("s.price-item--regular",p).textContent=d?" "+yt(a)+" ":""',
        'LuCur.set(t(".price__regular .price-item--regular",p),c," "),LuCur.set(t(".price-item--sale",p),c," "),LuCur.set(t("s.price-item--regular",p),d?a:null," ")', 1],
      ['variant price text', 'V=typeof I.price=="string"&&/[^0-9.]/.test(I.price)?I.price:yt(U),tt=typeof I.compare_at_price=="string"&&/[^0-9.]/.test(I.compare_at_price)?I.compare_at_price:yt(F)',
        'V=LuCur.on()?LuCur.fu(U):typeof I.price=="string"&&/[^0-9.]/.test(I.price)?I.price:yt(U),tt=LuCur.on()?LuCur.fu(F):typeof I.compare_at_price=="string"&&/[^0-9.]/.test(I.compare_at_price)?I.compare_at_price:yt(F)', 1],
      ['variant price mark', 'Mt.textContent=" "+V+" "})', 'Mt.textContent=" "+V+" ",LuCur.mk(Mt,U)})', 1],
      ['variant compare mark', 'Ct&&(Ct.textContent=Lt?" "+tt+" ":"")', 'Ct&&(Ct.textContent=Lt?" "+tt+" ":"",LuCur.mk(Ct,Lt?F:null))', 1],
      ['bar units', 'function _(w,v){E.forEach(function(M){', 'function _(w,v){w=LuCur.u(w),v=LuCur.u(v);E.forEach(function(M){', 1],
      ['pack redraw hook', 'function k(S,C){S=Number(S)||0,C=Number(C)||0,o.__luA=S,', 'function k(S,C){o.__luK=k;S=Number(S)||0,C=Number(C)||0,o.__luA=S,', 1],
      ['pack units', 'vt=et?v(et.compare_at_price||et.compareAtPrice):C;D.push(at)', 'vt=et?v(et.compare_at_price||et.compareAtPrice):C;at=LuCur.u(at),vt=LuCur.u(vt);D.push(at)', 1],
      ['pack discount local on', 'if(window.LuDisc){var m=window.LuDisc.best(D.map(', 'if(window.LuDisc){LuCur.loc=1;var m=window.LuDisc.best(D.map(', 1],
      ['pack discount local off', 'o.getAttribute("data-amountoff")||"");ot=xt-m.total', 'o.getAttribute("data-amountoff")||"");LuCur.loc=0;ot=xt-m.total', 1],
      ['pack gift price', 'M((Number(Q.compareAtPrice)||Number(Q.price))*(Number(Q.qty)||1))', 'M(LuCur.u(Number(Q.compareAtPrice)||Number(Q.price))*(Number(Q.qty)||1))', 1],
      ['upsell price', 'lt&&(lt.textContent=Pt(G.price))', 'lt&&LuCur.set(lt,G.price)', 2],
      ['upsell compare', 'dt&&(dt.textContent=G.compare>G.price?Pt(G.compare):"",', 'dt&&(LuCur.set(dt,G.compare>G.price?G.compare:null),', 2],
      ['filter label', 'W.innerHTML="$"+N.toFixed(2)+" -&nbsp;$"+k.toFixed(2)+" "', 'W.innerHTML=LuCur.fu(N)+" -&nbsp;"+LuCur.fu(k)+" "', 1],
    ],
  },
};

const count = (s, f) => s.split(f).length - 1;
let bad = 0;
for (const [rel, spec] of Object.entries(FILES)) {
  const f = path.join(THEME, rel);
  let s = fs.readFileSync(f, 'utf8');
  if (s.includes(spec.marker)) { console.log('already  ' + rel); continue; }
  const problems = [];
  for (const [id, find, rep, n] of spec.rules) {
    const c = count(s, find);
    if (c !== n) { problems.push(id + ': found ' + c + ', expected ' + n); continue; }
    s = s.split(find).join(rep);
  }
  if (problems.length) { bad++; console.error('UNMATCHED ' + rel + ' (left untouched)\n  ' + problems.join('\n  ')); continue; }
  if (spec.prepend) s = spec.prepend + s;
  fs.writeFileSync(f, s);
  console.log('patched  ' + rel + ' (' + spec.rules.length + ' rules)');
}
process.exit(bad ? 1 : 0);
