#!/usr/bin/env node
/*
 * Lunara Black (owear-tien) — cart drawer like tammycharm-tien (user 2026-11-26). tammycharm-tien's cart is the
 * lunara---vesnacharm cart (2026.11.25.8) rebuilt on the base theme; this theme is a Lunara build, so it takes the
 * vesnacharm cart itself:
 *   compact lines (title / "colour, size ▾" box | qty / price), bottom sheet for colour, size and quantity (split
 *   n < qty units off, merge into the same variant), drawer 100 % wide under 750 px, protection text on one line,
 *   Discounts row above the subtotal, Buy X Get Y free units = "Free gift" / "N Free gifts" chip (no price, no stepper),
 *   line prices = their share of what the checkout charges, protection = only a product NAMED so (window.LuProt),
 *   "Customers also add …" cards only when Theme settings > Cart drawer > "Show the upsell products" is on.
 *
 *   1. assets/js/theme.js: the cart module (`var dt=(function(){…})();window.MSCart=dt;`) is replaced by
 *      _src/cart-module.js = vesnacharm's module, copied as is. Both theme.js files come from the same Lunara source but
 *      were minified apart, so the outer helpers it calls have other names here; the wrapper hands them over:
 *      u→l (querySelectorAll), ct→ut (escape), B→V (number), ae→le (img→video), ne→ue (url + preview query),
 *      gt→bt (is a video), he→Ce (editor mode); t, yt, rt, Pt, Ut are the same. Re-run = module re-inserted.
 *   2. _src/cart-edits.json: vesnacharm's template edits (patch-cart.js + patch-cb.js gs-head: LuCB, LuProt, LuDisc
 *      tiers / Buy X Get Y gifts, cart-drawer CSS + upsell switch), its wine colour swapped for --lu-primary (#000000).
 *   3. EDITS below: the same changes outside the cart module, with this build's names (product form: a pack adds its
 *      Buy X Get Y free units as gift lines; LuProt keeps protection products out of the upsells and product lists).
 *   4. config/settings_schema.json: checkbox cart_upsell_show (default off) before "Upsell products".
 *   5. REMOVED 2026.11.26.4 (user: wrong): "packs follow the quantity" (2026.11.26.2/.3 relabelled a 3 Pack line as
 *      6 / 9 Pack and priced it as the cart's pack). Now a line shows the pack it was added with and its share of the
 *      subtotal (the module's LD.amt: 3 lines of 3 Pack = 43.32 + 43.32 + 43.31 = 129.95). This step only deletes the
 *      leftovers: settings cart_pack_option / cart_pack_values and cart-drawer[data-lu-packs]. Re-run = the module
 *      goes back to _src/cart-module.js as is (step 1), so its old luPk* edits are gone.
 *
 *   node themes/lunara-black---owear-tien/_src/patch-cart.js
 */
'use strict';
const fs = require('fs');
const path = require('path');

const THEME = path.resolve(__dirname, '..');
const JS = path.join(THEME, 'assets/js/theme.js');

// 1. the cart module
const WRAP = 'var dt=(function(u,ct,B,ae,ne,gt,he){return ';
const WRAP_END = '})(l,ut,V,le,ue,bt,Ce);';
{
  let s = fs.readFileSync(JS, 'utf8');
  const end = s.indexOf('window.MSCart=dt;');
  if (end < 0 || s.indexOf('window.MSCart=dt;', end + 1) > -1) { console.error('window.MSCart=dt; missing or not unique'); process.exit(1); }
  const a = Math.max(s.lastIndexOf(WRAP, end), s.lastIndexOf('var dt=(function(){var e=rt.domain', end));
  if (a < 0) { console.error('cart module start not found'); process.exit(1); }
  const mod = fs.readFileSync(path.join(__dirname, 'cart-module.js'), 'utf8').trim();
  const next = WRAP + mod + WRAP_END;
  if (s.slice(a, end) === next) console.log('already  assets/js/theme.js  cart module');
  else { s = s.slice(0, a) + next + s.slice(end); fs.writeFileSync(JS, s); console.log('replaced assets/js/theme.js  cart module'); }
}

// 3. outside the cart module (vesnacharm _src/patch-cart.js edits 6, 7, 8, 10 in this build's names)
const EDITS = [
  // protection = a product named so: the upsell cards drop every other pick of "Protection product" …
  {
    file: 'assets/js/theme.js', done: 'LuProt({title:e.getAttribute("data-title")',
    find: 'function ke(q,Q,G){t=q,l=Q,ut=G;',
    replace: 'function ke(q,Q,G){t=q,l=Q,ut=G;window.LuProt&&bt("[data-lu-up]").forEach(function(e){LuProt({title:e.getAttribute("data-title")||""})||e.parentNode.removeChild(e)});',
  },
  // … and product lists never show it: the page's #ms-products (home grid, reviews, search, collection) …
  {
    file: 'assets/js/theme.js', done: 'e==="#ms-products"&&Array.isArray(v)',
    find: 'function qt(e,n){try{return JSON.parse((t(e)||{}).textContent||"null")||n}catch{return n}}',
    replace: 'function qt(e,n){try{var v=JSON.parse((t(e)||{}).textContent||"null")||n;return e==="#ms-products"&&Array.isArray(v)?v.filter(function(p){return!(window.LuProt&&LuProt(p))}):v}catch{return n}}',
  },
  // … and the list another page fetches from the home page's HTML
  {
    file: 'assets/js/theme.js', done: 'i=(c?JSON.parse(c[1]):[]).filter(',
    find: 'i=c?JSON.parse(c[1]):[];',
    replace: 'i=(c?JSON.parse(c[1]):[]).filter(function(p){return!(window.LuProt&&LuProt(p))});',
  },
  // a pack (Kaching rows) adds the units its Buy X Get Y offer makes free as gift lines (luFree, after the bought
  // ones): BUY 3 GET 2 = 3 bought + 2 gifts, same money. In A(): g = units by variant, N = their keys, V = number.
  {
    file: 'assets/js/theme.js', done: 'var LF=(function(){try{var cd=document.querySelector("cart-drawer")',
    find: 'return N.forEach(function(Ft){var Xt=g[Ft],_t=Xt.v,',
    replace: 'var LF=(function(){try{var cd=document.querySelector("cart-drawer"),bx=cd&&cd.getAttribute("data-bxgy")||"",pid=r.productId||r.handle||"";'
      + 'if(!bx||!window.LuDisc||!N.length)return[];var d=LuDisc.best(N.map(function(k){var gg=g[k],vv=gg.v;'
      + 'return{pid:pid,vid:vv?String(vv.id):"",price:vv&&V(vv.price)>0?V(vv.price):V(r.priceNum)||V(r.price),qty:gg.q}}),"",bx,"");'
      + 'return d&&d.kind==="bxgy"&&d.free||[]}catch(er){return[]}})(),LZ=[];'
      + 'return N.forEach(function(Ft,Mi){var Xt=g[Ft],_t=Xt.v,',
  },
  {
    file: 'assets/js/theme.js', done: 'LZ.forEach(function(Ln){dt.add(Ln)}),Pt("AddToCart"',
    find: 'dt.add({productId:r.productId||r.handle||"",variantId:_t?_t.id:"",title:xt,img:It,imgAlt:r.image||"",url:n.url||window.location.href.split("#")[0],opts:Xt.sel.filter(function(te){return te.value}),price:st,compareAt:At,qty:Xt.q,bundleKey:"",bundleId:"",bundleTitle:"",bundleImg:""}),H+=st*Xt.q,nt+=Xt.q,_t&&z.push(_t.id)}),Pt("AddToCart"',
    replace: '(function(Ln,fq){fq=Math.min(fq,Ln.qty);Ln.qty>fq&&dt.add(Object.assign({},Ln,{qty:Ln.qty-fq}));fq>0&&LZ.push(Object.assign({},Ln,{qty:fq,luFree:!0}))})'
      + '({productId:r.productId||r.handle||"",variantId:_t?_t.id:"",title:xt,img:It,imgAlt:r.image||"",url:n.url||window.location.href.split("#")[0],opts:Xt.sel.filter(function(te){return te.value}),price:st,compareAt:At,qty:Xt.q,bundleKey:"",bundleId:"",bundleTitle:"",bundleImg:""},LF[Mi]||0),'
      + 'H+=st*Xt.q,nt+=Xt.q,_t&&z.push(_t.id)}),LZ.forEach(function(Ln){dt.add(Ln)}),Pt("AddToCart"',
  },
  // 6. a tier discount ("Tiered next item") is shared over ALL its lines, not per product (user 2026-11-26): luAvg
  // spreads a group's discounted total by gross, so 3 different products × 3 Pack = 129.95 / 3 = 43.32 + 43.32 +
  // 43.31 (was 59.95 / 40.00 / 30.00), and the lines add up to the subtotal. Group = the lines LuDisc's tiers count
  // (not a gift, product in LuTierPids; none = all); other discounts keep the per-product groups.
  {
    file: 'assets/js/theme.js', done: 'TQ=S&&S.kind==="tier"?',
    find: 'P={};r.forEach(function(D,J){if(D.gift||(window.LuUp&&LuUp.hide(D))||(BU[J]||0)>0)return;var k=String(D.productId||D.title||J);',
    replace: 'P={},TQ=S&&S.kind==="tier"?(Array.isArray(window.LuTierPids)?LuTierPids.map(function(x){return String(x).toLowerCase()}):!0):!1;'
      + 'r.forEach(function(D,J){if(D.gift||(window.LuUp&&LuUp.hide(D))||(BU[J]||0)>0)return;'
      + 'var k=TQ&&(TQ===!0||TQ.indexOf(String(D.productId||"").toLowerCase())>-1)?"~tier":String(D.productId||D.title||J);',
  },
  // 7. a bigger pack = N × the base pack in the cart (user 2026-11-26): the tier discount counts cart UNITS, so a
  // "6 Pack" / "9 Pack" variant is one unit and takes a 3-pack percent (3 + 6 + 9 Pack = 226.64 live). Every render
  // (luSP, before luFS) turns a line of the k-th value of cart-drawer[data-lu-split] = "Packs|3 Pack, 6 Pack, 9 Pack"
  // into k × the 1st value (same colour / size, available), then merges it with a line of that variant: any way in
  // (Kaching row, variant picker, the line's sheet, an old cart). Only with tiers on (p()) and a product they cover
  // (LuTierPids; none = all), never gifts / bundles / protection. Live: 1 / 3 / 6 units = 59.95 / 129.95 / 259.90.
  {
    file: 'assets/js/theme.js', done: 'function luSP(){',
    find: 'function luShM(s){',
    replace: 'function luSP(){var a=String(i&&i.getAttribute("data-lu-split")||""),k=a.indexOf("|"),L=function(x){return String(x==null?"":x).trim().toLowerCase()};'
      + 'if(k<0||!L(p()))return;var nm=L(a.slice(0,k)),vs=a.slice(k+1).split(",").map(L).filter(Boolean);if(!nm||vs.length<2)return;'
      + 'var sc=window.LuTierPids,ok=Array.isArray(sc)?sc.map(L):null,ch=!1;'
      + 'for(var J=0;J<r.length;J++){var D=r[J];if(D.gift||D.luFree||D.bundleKey||D.companionBundle||(window.LuUp&&LuUp.hide(D)))continue;'
      + 'if(ok&&ok.indexOf(L(D.productId))<0)continue;var pv=luPV(D);if(!pv)continue;var j=pv.names.map(L).indexOf(nm);if(j<0)continue;'
      + 'var me=pv.v.filter(function(v){return v.id===D.variantId})[0];if(!me)continue;var f=vs.indexOf(L(me.vals[j]))+1;if(f<2)continue;'
      + 'var b=pv.v.filter(function(v){return v.ok&&v.vals.every(function(x,q){return q===j?L(x)===vs[0]:String(x)===String(me.vals[q])})})[0];if(!b)continue;'
      + 'D.luPk={vid:me.id,n:String(me.vals[j]),f:f,on:pv.names[j]};'
      + 'D.variantId=b.id;D.opts=pv.names.map(function(n2,q){return{name:n2,value:b.vals[q]}});b.price>0&&(D.price=b.price);D.compareAt=b.compare||0;b.img&&(D.img=b.img);D.qty*=f;ch=!0;'
      + 'for(var q2=0;q2<r.length;q2++){var x=r[q2];if(x!==D&&x.luPk&&x.luPk.vid===D.luPk.vid&&x.variantId===D.variantId&&!x.gift&&!x.luFree&&!x.bundleKey&&!x.companionBundle){x.qty+=D.qty;r.splice(J,1);J--;break}}}'
      + 'ch&&c()}'
      + 'function luShM(s){',
  },
  {
    file: 'assets/js/theme.js', done: 'function R(){luSP(),',
    find: 'function R(){luFS(),',
    replace: 'function R(){luSP(),luFS(),',
  },
  {
    file: 'sections/cart-drawer.hbs', done: 'data-lu-split="',
    find: '{{amountOffOffers}}{{/unless}}">',
    replace: '{{amountOffOffers}}{{/unless}}" data-lu-split="{{@root.settings.cart_split_option}}|{{@root.settings.cart_split_values}}">',
  },
  // 8. the line's sheet: a Type row (Theme settings > Product types: Briefs / Boxer) above Color, Size (user
  // 2026-11-26). cart-drawer [data-lu-cart-types] = name / productId / url / title only (the full product JSON is 46 KB a
  // type); variants: the product page's Kaching type templates ([data-lu-types]), else luPV (page, session, fetch of the
  // url). A type pick keeps the values of the same option names (best available match); Confirm moves the line (or the
  // n units split off) to that product, then luApply sets its variant and merges. Off: Cart drawer › "Type choice …".
  {
    file: 'sections/cart-drawer.hbs', done: 'data-lu-cart-types',
    find: 'data-lu-split="{{@root.settings.cart_split_option}}|{{@root.settings.cart_split_values}}">',
    replace: 'data-lu-split="{{@root.settings.cart_split_option}}|{{@root.settings.cart_split_values}}">'
      + '{{#unless (eq @root.settings.cart_type_switch false)}}<div hidden data-lu-cart-types>'
      + [1, 2, 3, 4].map((n) => `{{#if @root.settings.ptype_${n}_name}}{{#each @root.settings.ptype_${n}_product}}{{#if @first}}`
        + `<i data-name="{{@root.settings.ptype_${n}_name}}" data-pid="{{productId}}" data-url="{{#if url}}{{url}}{{else}}/{{handle}}{{/if}}" data-title="{{title}}"></i>`
        + '{{/if}}{{/each}}{{/if}}').join('')
      + '</div>{{/unless}}',
  },
  {
    file: 'assets/js/theme.js', done: 'function luTys(){',
    find: 'function luShM(s){',
    replace: 'function luTys(){return[].map.call(i?i.querySelectorAll("[data-lu-cart-types] [data-pid]"):[],function(e){return{n:e.getAttribute("data-name")||"",pid:e.getAttribute("data-pid")||"",url:e.getAttribute("data-url")||"",tt:e.getAttribute("data-title")||""}}).filter(function(x){return x.n&&x.pid})}'
      + 'function luTyPV(T){var C=luPV.c||(luPV.c={});if(C[T.pid])return C[T.pid];'
      + 'var tp=[].filter.call(document.querySelectorAll("[data-lu-types] template[data-json]"),function(e){return(e.getAttribute("data-json")||"").indexOf(T.pid)>-1})[0];'
      + 'if(tp)try{var P=JSON.parse(tp.getAttribute("data-json"))[0];if(P&&P.productId===T.pid&&P.options&&P.options.length&&P.variants&&P.variants.length)return C[T.pid]={names:P.options,v:P.variants.map(function(x){return{id:x.id,vals:x.options||[],price:B(x.price),compare:B(x.compareAtPrice),img:x.image||"",ok:x.available!==false}})}}catch(er){}'
      + 'return luPV({productId:T.pid,url:T.url})}'
      + 'function luTyOrd(pv){return pv.names.map(function(nm,j){return j}).sort(function(a,b){return(/colou?r/i.test(pv.names[b])?1:0)-(/colou?r/i.test(pv.names[a])?1:0)})}'
      + 'function luTyOpen(s){s.ty=null;var D=s.D;if(s.free||D.gift||D.bundleKey||D.companionBundle)return;var T=luTys(),k=-1;if(T.length<2)return;'
      + 'T.forEach(function(x,q){k<0&&String(x.pid).toLowerCase()===String(D.productId||"").toLowerCase()&&(k=q)});if(k<0)return;s.ty=T;s.tk=k;s.T=null;T.forEach(luTyPV)}'
      + 'function luTyRow(s){return s.ty?\'<div class="lu-sh__opt lu-sh__ty"><p class="lu-sh__lbl">Type</p><div class="lu-sh__vals">\'+s.ty.map(function(x,q){var on=q===s.tk;return\'<button type="button" class="lu-sh__v\'+(on?" is-on":"")+\'" data-lu-sh-t="\'+q+\'" aria-pressed="\'+on+\'"><span>\'+ct(x.n)+"</span></button>"}).join("")+"</div></div>":""}'
      + 'function luTyPick(s,q){var T=s.ty&&s.ty[q];if(!T||q===s.tk)return;var pv=luTyPV(T);'
      + 'if(!pv){clearTimeout(luTyPick.t);pv!==false&&(luTyPick.n=(luTyPick.n||0)+1)<40&&(luTyPick.t=setTimeout(function(){luSheet.st===s&&luTyPick(s,q)},150));return}luTyPick.n=0;'
      + 'var old={},bm=null,bs=-1;s.pv.names.forEach(function(nm,j){old[String(nm).toLowerCase()]=s.sel[j]});'
      + 'pv.v.forEach(function(y){var sc=y.ok?.5:0;y.vals.forEach(function(z,k){String(z)===old[String(pv.names[k]).toLowerCase()]&&sc++});sc>bs&&(bs=sc,bm=y)});if(!bm)return;'
      + 's.tk=q;s.T=String(T.pid).toLowerCase()===String(s.D.productId||"").toLowerCase()?null:T;s.pv=pv;s.sel=bm.vals.map(String);s.ord=luTyOrd(pv);luShDraw()}'
      // Confirm with another type: the line (or its n units split off, after it) becomes that product; returns its index
      + 'function luTyMove(s,w,n){var D=r[w];if(!s.T||!D)return w;n=Math.max(1,Math.min(99,n|0));var N=D;if(n<D.qty){N=Object.assign({},D,{qty:n});D.qty-=n;r.splice(w+1,0,N);w++}'
      + 'delete N.__open;N.productId=s.T.pid;N.url=s.T.url||N.url;s.T.tt&&(N.title=N.imgAlt=s.T.tt);return w}'
      + 'function luShM(s){',
  },
  {
    file: 'assets/js/theme.js', done: '+luTyRow(s);s.ord.forEach(',
    find: '<div class="lu-sh__body">\';s.ord.forEach(',
    replace: '<div class="lu-sh__body">\'+luTyRow(s);s.ord.forEach(',
  },
  {
    file: 'assets/js/theme.js', done: '"[data-lu-sh-x],[data-lu-sh-v],[data-lu-sh-t],[data-lu-sh-q],[data-lu-sh-ok]"',
    find: '"[data-lu-sh-x],[data-lu-sh-v],[data-lu-sh-q],[data-lu-sh-ok]"',
    replace: '"[data-lu-sh-x],[data-lu-sh-v],[data-lu-sh-t],[data-lu-sh-q],[data-lu-sh-ok]"',
  },
  {
    file: 'assets/js/theme.js', done: 'if(x.hasAttribute("data-lu-sh-t"))return luTyPick(s,+x.getAttribute("data-lu-sh-t"));',
    find: 'var j=+x.getAttribute("data-j"),v=x.getAttribute("data-lu-sh-v"),bm=null,bs=-1;',
    replace: 'if(x.hasAttribute("data-lu-sh-t"))return luTyPick(s,+x.getAttribute("data-lu-sh-t"));var j=+x.getAttribute("data-j"),v=x.getAttribute("data-lu-sh-v"),bm=null,bs=-1;',
  },
  {
    file: 'assets/js/theme.js', done: 'if(w>-1&&m){w=luTyMove(s,w,n);luApply(w,m,n);',
    find: 'if(w>-1&&m){luApply(w,m,n);',
    replace: 'if(w>-1&&m){w=luTyMove(s,w,n);luApply(w,m,n);',
  },
  {
    file: 'assets/js/theme.js', done: 'luTyOpen(luSheet.st);luShDraw();sh.hidden=!1;',
    find: 'luShDraw();sh.hidden=!1;',
    replace: 'luTyOpen(luSheet.st);luShDraw();sh.hidden=!1;',
  },
  // 9. a split big pack still SHOWS as added (user 2026-11-26: "6 Pack" added = 1, not "3 Pack × 2"). luSP stores
  // D.luPk = {vid: the big pack's variant, n: "6 Pack", f: 2, on: option name}; the line keeps 3 Pack × 2 units for the
  // prices and the checkout, but shows "6 Pack", quantity units / f, ± = f units, cart count = packs. Lines merge only
  // with the same luPk (a 3 Pack added later stays its own line). The sheet opens on the big pack (n = packs); Confirm
  // first turns the line back into the big pack (luPkUn) so luApply / luTyMove work in packs, then R() splits it again.
  {
    file: 'assets/js/theme.js', done: 'function luPkUn(D){',
    find: 'function luShM(s){',
    replace: 'function luPkUn(D){if(!D||!D.luPk)return;D.qty=Math.max(1,Math.round(D.qty/D.luPk.f));D.variantId=D.luPk.vid;delete D.luPk}'
      + 'function luPkQ(D){return D&&D.luPk?Math.max(1,Math.round(D.qty/D.luPk.f)):D.qty}'
      + 'function luShM(s){',
  },
  {
    file: 'assets/js/theme.js', done: 'if(w>-1&&m){luPkUn(r[w]);w=luTyMove(s,w,n);luApply(w,m,n);R();',
    find: 'if(w>-1&&m){w=luTyMove(s,w,n);luApply(w,m,n);',
    replace: 'if(w>-1&&m){luPkUn(r[w]);w=luTyMove(s,w,n);luApply(w,m,n);R();',
  },
  {
    file: 'assets/js/theme.js', done: 'me=pv&&pv.v.filter(function(v){return v.id===(D.luPk&&D.luPk.vid||D.variantId)})[0];',
    find: 'function luSheet(W){var D=r[W],pv=D&&luPV(D),me=pv&&pv.v.filter(function(v){return v.id===D.variantId})[0];',
    replace: 'function luSheet(W){var D=r[W],pv=D&&luPV(D),me=pv&&pv.v.filter(function(v){return v.id===(D.luPk&&D.luPk.vid||D.variantId)})[0];',
  },
  {
    file: 'assets/js/theme.js', done: 'sel:me.vals.map(String),n:luPkQ(D),',
    find: 'sel:me.vals.map(String),n:D.qty,',
    replace: 'sel:me.vals.map(String),n:luPkQ(D),',
  },
  {
    file: 'assets/js/theme.js', done: 'U.value=luPkQ(D);',
    find: 'U.value=D.qty;var F=t("[data-action=dec]",et);F&&F.classList.toggle("disabled",D.qty<=1);',
    replace: 'U.value=luPkQ(D);var F=t("[data-action=dec]",et);F&&F.classList.toggle("disabled",luPkQ(D)<=1);',
  },
  {
    file: 'assets/js/theme.js', done: 'S==="inc"&&(_t.qty+=_t.luPk?_t.luPk.f:1)',
    find: 'S==="inc"&&_t.qty++,S==="dec"&&(_t.qty=Math.max(1,_t.qty-1))',
    replace: 'S==="inc"&&(_t.qty+=_t.luPk?_t.luPk.f:1),S==="dec"&&(_t.qty=Math.max(_t.luPk?_t.luPk.f:1,_t.qty-(_t.luPk?_t.luPk.f:1)))',
  },
  {
    file: 'assets/js/theme.js', done: 'LuUp.hide(N)?0:luPkQ(N))',
    find: 'function a(){return r.reduce(function(x,N){return x+(window.LuUp&&LuUp.hide(N)?0:N.qty)}',
    replace: 'function a(){return r.reduce(function(x,N){return x+(window.LuUp&&LuUp.hide(N)?0:luPkQ(N))}',
  },
  {
    file: 'assets/js/theme.js', done: 'v.id===(D.luPk&&D.luPk.vid||D.variantId)})[0];if(mv){var cur=D.luPk?',
    find: 'var mv=PV&&PV.v.filter(function(v){return v.id===D.variantId})[0];if(mv){var cur=PV.names.map(',
    replace: 'var mv=PV&&PV.v.filter(function(v){return v.id===(D.luPk&&D.luPk.vid||D.variantId)})[0];if(mv){var cur=D.luPk?mv.vals.map(String):PV.names.map(',
  },
  {
    file: 'assets/js/theme.js', done: 'ct(D.luPk&&mt.name===D.luPk.on?D.luPk.n:mt.value)',
    find: '\'<span class="lu-vval">\'+ct(mt.value)',
    replace: '\'<span class="lu-vval">\'+ct(D.luPk&&mt.name===D.luPk.on?D.luPk.n:mt.value)',
  },
  // merges: a new add (it) and a sheet change (luApply) never fold into a big-pack line, nor a big pack into a plain one
  {
    file: 'assets/js/theme.js', done: '&&!!k.luPk==!!x.luPk,y=x.variantId&&k.variantId',
    find: '&&(k.companionBundle||"")===(x.companionBundle||""),y=x.variantId&&k.variantId',
    replace: '&&(k.companionBundle||"")===(x.companionBundle||"")&&!!k.luPk==!!x.luPk,y=x.variantId&&k.variantId',
  },
  {
    file: 'assets/js/theme.js', done: 'if(x!==N&&!!x.luPk===!!N.luPk&&x.variantId===N.variantId',
    find: 'if(x!==N&&x.variantId===N.variantId&&!!x.luFree===!!N.luFree',
    replace: 'if(x!==N&&!!x.luPk===!!N.luPk&&x.variantId===N.variantId&&!!x.luFree===!!N.luFree',
  },
  // saved with the cart (and read back), so a reload still shows "6 Pack × 1"
  {
    file: 'assets/js/theme.js', done: 'luPick:!!k.luPick,luPk:k.luPk||null};',
    find: 'luAt:k.luAt||0,luPick:!!k.luPick};',
    replace: 'luAt:k.luAt||0,luPick:!!k.luPick,luPk:k.luPk||null};',
  },
  {
    file: 'assets/js/theme.js', done: 'luPk:y.luPk&&y.luPk.vid&&y.luPk.f>1?y.luPk:null,',
    find: 'luPick:!!y.luPick,companionBundle:y.companionBundle||""',
    replace: 'luPick:!!y.luPick,luPk:y.luPk&&y.luPk.vid&&y.luPk.f>1?y.luPk:null,companionBundle:y.companionBundle||""',
  },
];

let applied = 0;
for (const e of JSON.parse(fs.readFileSync(path.join(__dirname, 'cart-edits.json'), 'utf8')).concat(EDITS)) {
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

// 4. the upsell switch (a new key: a store keeps its saved values when a zip is updated, a new key gets this default)
{
  const f = path.join(THEME, 'config/settings_schema.json');
  const j = JSON.parse(fs.readFileSync(f, 'utf8'));
  const g = j.find((x) => (x.settings || []).some((y) => y.id === 'cart_body_upsells'));
  if (!g) { console.error('settings_schema: cart_body_upsells missing'); process.exit(1); }
  if (g.settings.some((y) => y.id === 'cart_upsell_show')) console.log('already  config/settings_schema.json  cart_upsell_show');
  else {
    g.settings.splice(g.settings.findIndex((y) => y.id === 'cart_body_upsells'), 0, {
      type: 'checkbox', id: 'cart_upsell_show', label: 'Show the upsell products', default: false,
      info: 'The "Customers also add …" cards under the cart items (the products picked below). Off = none.',
    });
    fs.writeFileSync(f, JSON.stringify(j, null, 2) + '\n');
    applied++;
    console.log('applied  config/settings_schema.json  cart_upsell_show');
  }
  // 5. (removed 2026.11.26.4) "Packs in the cart" settings: drop them from the schema and settings_data
  const PK = ['cart_pack_option', 'cart_pack_values'];
  const k = g.settings.findIndex((y) => y.type === 'header' && y.content === 'Packs in the cart');
  if (k > -1 || g.settings.some((y) => PK.includes(y.id))) {
    g.settings = g.settings.filter((y, n) => n !== k && !PK.includes(y.id));
    fs.writeFileSync(f, JSON.stringify(j, null, 2) + '\n');
    applied++;
    console.log('removed  config/settings_schema.json  Packs in the cart');
  }
  const fd = path.join(THEME, 'config/settings_data.json');
  const d = JSON.parse(fs.readFileSync(fd, 'utf8'));
  if (d.current && PK.some((x) => x in d.current)) {
    PK.forEach((x) => delete d.current[x]);
    fs.writeFileSync(fd, JSON.stringify(d, null, 2) + '\n');
    applied++;
    console.log('removed  config/settings_data.json  cart_pack_*');
  }
  // … and the attribute that handed them to the cart module
  const fh = path.join(THEME, 'sections/cart-drawer.hbs');
  const h = fs.readFileSync(fh, 'utf8');
  const ATTR = ' data-lu-packs="{{@root.settings.cart_pack_option}}|{{@root.settings.cart_pack_values}}"';
  if (h.includes(ATTR)) { fs.writeFileSync(fh, h.split(ATTR).join('')); applied++; console.log('removed  sections/cart-drawer.hbs  data-lu-packs'); }
  // 7. "Big packs = N × the base pack" (edit 7): two text settings at the end of the Cart drawer group (new keys: the
  // store gets these defaults when the zip is updated)
  const j2 = JSON.parse(fs.readFileSync(f, 'utf8'));
  const g2 = j2.find((x) => (x.settings || []).some((y) => y.id === 'cart_body_upsells'));
  if (g2.settings.some((y) => y.id === 'cart_split_option')) console.log('already  config/settings_schema.json  cart_split_option');
  else {
    g2.settings.push(
      { type: 'header', content: 'Big packs = N × the base pack' },
      { type: 'text', id: 'cart_split_option', label: 'Pack option name', default: 'Packs',
        info: 'The product option that holds the packs, e.g. "Packs". Empty = off.' },
      { type: 'text', id: 'cart_split_values', label: 'Packs, smallest first', default: '3 Pack, 6 Pack, 9 Pack',
        info: 'In the cart the 2nd value becomes 2 × the 1st (same colour and size), the 3rd 3 × … so the tiered discount counts every base pack: 3 + 6 + 9 Pack = 6 × 3 Pack. Only while "Allow tiered discount" is on, for the products of that discount.' },
    );
    fs.writeFileSync(f, JSON.stringify(j2, null, 2) + '\n');
    applied++;
    console.log('applied  config/settings_schema.json  cart_split_option');
  }
  // 8. the Type row of the line's sheet (edit 8)
  const j3 = JSON.parse(fs.readFileSync(f, 'utf8'));
  const g3 = j3.find((x) => (x.settings || []).some((y) => y.id === 'cart_body_upsells'));
  if (g3.settings.some((y) => y.id === 'cart_type_switch')) console.log('already  config/settings_schema.json  cart_type_switch');
  else {
    g3.settings.push({ type: 'checkbox', id: 'cart_type_switch', label: 'Type choice in the line\'s colour / size sheet', default: true,
      info: 'A "Type" row (Theme settings > Product types, e.g. Briefs / Boxer) above Color and Size when the line is one of those products. Confirm moves the line to the picked type.' });
    fs.writeFileSync(f, JSON.stringify(j3, null, 2) + '\n');
    applied++;
    console.log('applied  config/settings_schema.json  cart_type_switch');
  }
  const d2 = JSON.parse(fs.readFileSync(fd, 'utf8'));
  const add2 = { cart_split_option: 'Packs', cart_split_values: '3 Pack, 6 Pack, 9 Pack', cart_type_switch: true };
  const miss = d2.current ? Object.keys(add2).filter((x) => !(x in d2.current)) : [];
  if (miss.length) {
    miss.forEach((x) => { d2.current[x] = add2[x]; });
    fs.writeFileSync(fd, JSON.stringify(d2, null, 2) + '\n');
    applied++;
    console.log('applied  config/settings_data.json  ' + miss.join(', '));
  } else console.log('already  config/settings_data.json  cart_split_*, cart_type_switch');
}
console.log(applied + ' edit(s) applied');
