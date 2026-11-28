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
 *   6. Buy X Get Y gifts (user 2026-11-23, "2 in the cart = Buy 2 Get 1: show the free one"): when one more unit would
 *      not raise what the checkout charges (same LuDisc formula), the drawer adds it as a gift line (`luFree`, same
 *      colour / size as the last item of a product in a FREE offer's Y list), 2 at most. Fewer real items than before =
 *      the gifts that would now cost money go; a gift the buyer removes is not added back until the real count changes.
 *      When a Buy X Get Y offer is the best discount, its free units show as FREE GIFT (whole line) or "N FREE" (part of
 *      a line) at full price beside them (no spread); bxgy() frees gift lines first, then the last lines. Totals unchanged.
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

// 6. Buy X Get Y gifts in the drawer. Runs first in R() (the drawer render, after every change of the cart `r`).
//    Gifts go ON TOP of what the buyer adds (user 2026-11-25: "buy 4 = 2 free", "3 or more = 2 free"): up to 2 gift
//    units while the discount pays for all of them (cv); the buyer's own units stay paid. Was "while one more unit
//    costs nothing" = 3 bought paid 2 (no gift), 4 bought got 1. A pack's free units arrive as gift lines (item 10).
//    State per store in localStorage "lu-free:<domain>": last = real units at the last run, off = real units when
//    the buyer removed a gift (no new gift until that count changes), v = 2 once an older cart was converted.
const FREE_SYNC = 'function luFS(m){var K="lu-free:"+e,st={};try{st=JSON.parse(localStorage.getItem(K)||"{}")||{}}catch(er){st={}}'
  + 'var re=function(x){return!x.gift&&!x.luFree&&!x.companionBundle&&!(window.LuUp&&LuUp.hide(x))},'
  + 'P=r.reduce(function(s,x){return s+(re(x)?x.qty:0)},0),sv=function(){try{localStorage.setItem(K,JSON.stringify(st))}catch(er){}};'
  + 'if(m==="off"){st.off=P;sv();return}if(!window.LuDisc)return;'
  + 'var D0=function(L){var bu=window.LuCB?LuCB.units(L):[];return LuDisc.best(L.map(function(x,ix){var nb=x.qty-(bu[ix]||0);'
  + 'return{pid:x.productId,vid:x.variantId||"",price:x.price,qty:nb>0?nb:x.qty,gift:!!x.gift||nb<=0,luFree:!!x.luFree}}),p(),_(),w()).total},'
  // cv(L) = the discount of L pays for every gift line of L (the buyer's own units stay paid)
  + 'cv=function(L){var a=0;L.forEach(function(x){x.luFree&&(a+=x.price*x.qty)});return D0(L)>=a-.005},ch=0,i2,k;'
  + 'if(m!=="add"){'
  + 'if(!P){for(i2=r.length-1;i2>=0;i2--)if(r[i2].luFree){r.splice(i2,1);ch=1}}'
  // once (st.v 2, 2026.11.25.6): a cart saved before had its free units inside the bought lines (a pack of 5 = 5
  // bought lines): those units become gift lines, same money, so the rule below does not add 2 more gifts to it
  + 'else if(st.v!==2){var Bm=LuDisc.best(r.map(function(x){return{pid:x.productId,vid:x.variantId||"",price:x.price,qty:x.qty,gift:!re(x)&&!x.luFree,luFree:!!x.luFree}}),"",_(),""),fm=Bm&&Bm.kind==="bxgy"&&Bm.free||[];'
  + 'for(i2=r.length-1;i2>=0;i2--){var fq=Math.min(fm[i2]||0,r[i2].qty);if(fq>0&&re(r[i2])){fq>=r[i2].qty?(r[i2].luFree=!0):(r[i2].qty-=fq,r.splice(i2+1,0,Object.assign({},r[i2],{qty:fq,luFree:!0,luPick:!1})));ch=1}}}'
  + 'st.v=2;'
  // a gift shows $0: the discount must cover the gift lines, else the dearest gift goes (a cheaper item added later
  // took the free unit; the add step below may then pick another gift)
  + 'for(k=0;k<9;k++){var ag=0,hi=-1;r.forEach(function(x,ix){if(x.luFree){ag+=x.price*x.qty;!x.luPick&&(hi<0||x.price>r[hi].price)&&(hi=ix)}});'
  + 'if(hi<0||D0(r)>=ag-.005)break;r[hi].qty>1?r[hi].qty--:r.splice(hi,1);ch=1}'
  + 'if(st.off!=null&&st.off!==P)delete st.off;'
  // a pack adds its units one by one in one go: decide on gifts once the cart is still
  + 'st.last=P;sv();ch&&c();clearTimeout(luFS.t);luFS.t=setTimeout(function(){luFS("add")},250);return}'
  + 'var ys=[];try{(JSON.parse(_()||"[]")||[]).forEach(function(o){o&&o.type==="FREE"&&(o.y||[]).forEach(function(q){ys.push(String(q).toLowerCase())})})}catch(er){}'
  + 'var A=function(){return r.reduce(function(s,x){return s+(x.luFree?x.qty:0)},0)};'
  // the gift = the colour / size the buyer added last (luAt, set by the add), else the one before that is free
  + 'for(k=0;k<2&&P>0&&st.off==null&&A()<2;k++){var cs=r.map(function(x,ix){return{x:x,ix:ix}}).filter(function(o){return re(o.x)&&ys.indexOf(String(o.x.productId||"").toLowerCase())>-1})'
  + '.sort(function(a,b){return(b.x.luAt||0)-(a.x.luAt||0)||b.ix-a.ix}),nw=null;'
  + 'for(var ci=0;ci<cs.length&&!nw;ci++){var cn=Object.assign({},cs[ci].x,{qty:1,luFree:!0,gift:!1,companionBundle:"",bundlePrice:0});cv(r.concat([cn]))&&(nw=cn)}if(!nw)break;'
  + 'var ex=null;r.forEach(function(x){x.luFree&&(x.variantId?x.variantId===nw.variantId:x.title===nw.title&&JSON.stringify(x.opts)===JSON.stringify(nw.opts))&&(ex=x)});'
  + 'ex?ex.qty++:r.push(nw);ch=1}'
  + 'ch&&(c(),R())}';

// … what each line shows (LD, after PA; totals unchanged), user 2026-11-23 "a gift shows price 0":
//    · the best offer is Buy X Get Y with 1-2 free units, gift lines all free in it → its free units: gift lines $0.00,
//      "N FREE" on a bought line, the rest at full price (no spread);
//    · else (user 2026-11-25 "more than 3 bought = still 2 free"): gift lines + the units a Buy X Get Y offer frees on
//      this cart (bxgy-only best, the last lines), 2 at most in all, shown free while the best discount (40 % off from
//      6 units, Buy 5 Get 2 at 10 …) pays for them; the other units share what is paid by price (cents add up);
//    · a gift the buyer switched to a dearer variant (discount < gift lines) → gifts take the discount, the rest full;
//    · else (no Buy X Get Y offer, or the discount does not cover a unit) → PA, no FREE labels.
const FREE_DISP = 'LD=(function luDisp(r,S,BU,PA){var g=r.map(function(D,J){return window.LuCB?LuCB.gross(D,BU[J]):D.price*D.qty}),'
  + 'ok=function(D,J){return!D.gift&&!(window.LuUp&&LuUp.hide(D))&&!((BU[J]||0)>0)},fr=S.free||[],'
  + 'FS=fr.reduce(function(a,b){return a+(b||0)},0),AG=0,amt=PA.slice(),fu=r.map(function(){return 0});'
  + 'r.forEach(function(D,J){D.luFree&&ok(D,J)&&(AG+=g[J])});'
  + 'var uf=FS>0&&FS<=2&&r.every(function(D,J){return!D.luFree||(fr[J]||0)>=D.qty});'
  + 'if(uf)r.forEach(function(D,J){ok(D,J)&&(amt[J]=g[J]-(S.per[J]||0),fu[J]=fr[J]||0)});'
  + 'else{var ls=r.map(function(x,ix){var nb=x.qty-(BU[ix]||0);return{pid:x.productId,vid:x.variantId||"",price:x.price,qty:nb>0?nb:x.qty,gift:!!x.gift||nb<=0,luFree:!!x.luFree}}),'
  + 'B=S.kind==="bxgy"?S:window.LuDisc?LuDisc.best(ls,"",_(),""):null,bf=B&&B.free||[],fz=r.map(function(){return 0}),V=0,Tp=0,De=0,lf=2;'
  + 'r.forEach(function(D,J){if(!ok(D,J))return;Tp+=g[J]-(S.per[J]||0);De+=S.per[J]||0;D.luFree&&(fz[J]=D.qty,V+=g[J],lf-=D.qty)});'
  + 'if(De>=V-.005)for(var J=r.length-1;J>=0&&lf>0;J--){var D=r[J];if(!ok(D,J)||D.luFree)continue;var up=g[J]/D.qty;'
  + 'for(var n=Math.min(bf[J]||0,D.qty);n>0&&lf>0&&De>=V+up-.005;n--){fz[J]++;V+=up;lf--}}'
  + 'if(V>0&&De>=V-.005){var R=[],G=0,wt=[];r.forEach(function(D,J){if(!ok(D,J))return;fu[J]=fz[J];var w2=g[J]-fz[J]*g[J]/D.qty;w2>.004?(R.push(J),G+=w2,wt[J]=w2):(amt[J]=0)});'
  + 'var c=Math.round(Tp*100),a=0,s=0;G>0&&R.forEach(function(J,i){s+=wt[J];var u=i===R.length-1?c:Math.round(c*s/G);amt[J]=(u-a)/100;a=u})}'
  // a gift the buyer switched to a dearer colour / size (luPick): the discount goes to the gifts, they show the rest
  + 'else if(AG>0){var R=[],A2=[];r.forEach(function(D,J){ok(D,J)&&(D.luFree?A2.push(J):R.push(J))});R.forEach(function(J){amt[J]=g[J]});var dc=Math.round(De*100),a2=0,s2=0;'
  + 'A2.forEach(function(J,i){s2+=g[J];var u=i===A2.length-1?dc:Math.round(dc*s2/AG);amt[J]=g[J]-(u-a2)/100;a2=u})}}'
  + 'return{amt:amt,fu:fu}})(r,S,BU,PA)';

// No "FREE GIFT" word (user 2026-11-24): a whole free line = $0.00 + compare-at; part of a line = "N FREE".
// Colour / size selects on every line of a product the drawer knows (luPV), colour first (as the Kaching rows).
const FREE_LINE = 'var FU=D.gift?0:LD.fu[J]||0;Lt=LD.amt[J];'
  // part of a line free = the same chip as a whole free line, with the count (user 2026-11-25: not "1 FREE" + "Free gift")
  + 'if(FU>0){FU>=D.qty&&et.classList.add("cart-item--gift");if(FU<D.qty){var LG=document.createElement("span");LG.className="lu-gift-badge",'
  + 'LG.textContent=FU+" Free gift"+(FU>1?"s":""),vt.appendChild(LG)}}'
  + 'if(D.luFree){var LQ=t(".cart-item__quantity-wrapper",et)||t(".quantity",et);LQ&&(LQ.style.display="none")}'
  + `var PV=!D.gift&&!(window.LuUp&&LuUp.hide(D))&&!((BU[J]||0)>0)&&!D.companionBundle&&xt.parentNode?luPV(D):null;`
  + `var mv=PV&&PV.v.filter(function(v){return v.id===D.variantId})[0];if(mv){var cur=PV.names.map(function(nm,j){var o=(D.opts||[]).filter(function(q){return q.name===nm})[0];return o?o.value:mv.vals[j]}),`
  // the store's size option is named "Side" = read "Size" (aria-label only; data untouched)
  + `LN=function(n){return/^side$/i.test(n)?"Size":n},`
  + `hs=PV.names.map(function(nm,j){return{c:/colou?r/i.test(nm),n:LN(nm),v:String(cur[j])}});`
  + `hs.sort(function(a,b){return(b.c?1:0)-(a.c?1:0)});`
  // user 2026-11-25 (Shopee layout): one small box "White, M ▾" left of the quantity; a tap opens the bottom sheet
  // (luSheet: colour, size, quantity, Confirm), which replaced the selects under the line (and their per-unit rows)
  + `var luVv=hs.map(function(o){return o.v}).join(", ");`
  + `xt.innerHTML='<button type="button" class="lu-vchg" data-lu-vchg aria-haspopup="dialog" aria-label="'+ct("Change "+hs.map(function(o){return o.n}).join(" / ")+": "+luVv)+'">'`
  + `+'<span class="lu-vchg__t">'+ct(luVv)+'</span><svg viewBox="0 0 10 6" width="10" height="6" aria-hidden="true"><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.6"/></svg></button>';xt.classList.add("lu-vbox")}`;

// 9. Bottom sheet (user 2026-11-25, Shopee's "change variant" sheet): the line's picture + price, a button per colour
//    (with its picture) and per size, the quantity, Confirm; X / backdrop / Esc / the drawer closing shut it.
//    Confirm = luApply: same variant → the line's quantity; another variant → the chosen quantity of the line's units
//    takes it (all of them = the whole line changes; fewer = they split off below, the rest stay; a line of that variant
//    already there = merged). A gift line (luFree) keeps its count. A sold-out choice = Confirm disabled ("Sold out").
const SHEET_FNS = `function luShM(s){return s.pv.v.filter(function(v){return v.vals.every(function(x,k){return String(x)===String(s.sel[k])})})[0]||null}`
  // built once per opening (luShDraw); a pick / quantity only updates it in place (luShUpd): no picture reloads, the
  // tapped button keeps focus (user 2026-11-25: a size tap made the sheet jump)
  + `function luShDraw(){var s=luSheet.st;if(!s)return;var pv=s.pv,LN=function(n){return/^side$/i.test(n)?"Size":n};`
  + `var h='<div class="lu-sh__top"><img class="lu-sh__img" data-lu-sh-img alt="" hidden><span class="lu-sh__img" data-lu-sh-noimg></span><div class="lu-sh__pr">'`
  + `+(s.free?'<span class="lu-gift-badge">Free gift</span>':'<b data-lu-sh-amt></b> <s data-lu-sh-was hidden></s>')+'<p class="lu-sh__cur" data-lu-sh-cur></p></div></div><div class="lu-sh__body">';`
  + `s.ord.forEach(function(j){var nm=pv.names[j],isC=/colou?r/i.test(nm),sn={},vs=[];pv.v.forEach(function(v){var x=v.vals[j];x!=null&&!sn[x]&&(sn[x]=1,vs.push(String(x)))});`
  + `h+='<div class="lu-sh__opt"><p class="lu-sh__lbl">'+ct(LN(nm))+'</p><div class="lu-sh__vals">'+vs.map(function(x){`
  + `var th=isC?(pv.v.filter(function(v){return String(v.vals[j])===x&&v.img&&!gt(v.img)})[0]||{}).img:"";`
  + `return'<button type="button" class="lu-sh__v" data-lu-sh-v="'+ct(x)+'" data-j="'+j+'" aria-pressed="false">'`
  + `+(th?'<img src="'+ct(th)+'" alt="" width="28" height="28">':"")+"<span>"+ct(x)+"</span></button>"}).join("")+"</div></div>"});`
  + `s.free||(h+='<div class="lu-sh__opt lu-sh__qty"><p class="lu-sh__lbl">Quantity</p><div class="lu-sh__step"><button type="button" data-lu-sh-q="-1" aria-label="Decrease quantity">`
  + `<svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M1 6h10" stroke="currentColor" stroke-width="1.6"/></svg></button><span aria-live="polite" data-lu-sh-n></span><button type="button" data-lu-sh-q="1" aria-label="Increase quantity">`
  + `<svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M1 6h10M6 1v10" stroke="currentColor" stroke-width="1.6"/></svg></button></div></div>');`
  + `t("[data-lu-sh-in]",luSheet.el).innerHTML=h+"</div>";luShUpd()}`
  + `function luShUpd(){var s=luSheet.st,sh=luSheet.el;if(!s)return;var pv=s.pv,D=s.D,m=luShM(s)||{},im=m.img||D.img||"",g=t("[data-lu-sh-img]",sh),pr=m.price||D.price,a=t("[data-lu-sh-amt]",sh),w=t("[data-lu-sh-was]",sh),n=t("[data-lu-sh-n]",sh),ok=t("[data-lu-sh-ok]",sh);`
  + `im=im&&!gt(im)?im:"";g.hidden=!im;t("[data-lu-sh-noimg]",sh).hidden=!!im;im&&g.getAttribute("src")!==im&&g.setAttribute("src",im);`
  + `a&&(a.textContent=yt(pr));w&&(w.hidden=!(m.compare>pr),w.textContent=m.compare>pr?yt(m.compare):"");t("[data-lu-sh-cur]",sh).textContent=s.ord.map(function(j){return s.sel[j]}).join(", ");`
  + `[].forEach.call(sh.querySelectorAll("[data-lu-sh-v]"),function(b){var j=+b.getAttribute("data-j"),x=b.getAttribute("data-lu-sh-v"),on=x===s.sel[j],`
  + `av=pv.v.some(function(v){return v.ok&&v.vals.every(function(y,k){return String(y)===(k===j?x:s.sel[k])})});b.classList.toggle("is-on",on);b.classList.toggle("is-out",!av);b.setAttribute("aria-pressed",on?"true":"false")});`
  + `n&&(n.textContent=s.n,t('[data-lu-sh-q="-1"]',sh).disabled=s.n<=1,t('[data-lu-sh-q="1"]',sh).disabled=s.n>=99);ok.disabled=!(m.id&&m.ok);ok.textContent=m.id&&!m.ok?"Sold out":"Confirm"}`
  + `function luShClose(){var sh=luSheet.el,s=luSheet.st;if(!sh||!s)return;luSheet.st=null;sh.classList.remove("is-open");`
  + `setTimeout(function(){luSheet.st||(sh.hidden=!0)},260);s.op&&s.op.isConnected&&i.classList.contains("active")&&s.op.focus({preventScroll:!0})}`
  + `function luApply(W,m,n){var D=r[W],pv=D&&luPV(D);if(!pv||!m)return;n=D.luFree?D.qty:Math.max(1,Math.min(99,n|0));`
  + `if(m.id===D.variantId){n!==D.qty&&(D.qty=n,c(),R());return}`
  + `var part=n<D.qty,N=D;part?(N=Object.assign({},D,{qty:n}),D.qty-=n):(D.qty=n);delete N.__open;`
  + `N.variantId=m.id;N.opts=pv.names.map(function(nm,j){return{name:nm,value:m.vals[j]}});m.price>0&&(N.price=m.price);N.compareAt=m.compare||0;m.img&&(N.img=m.img);`
  + `var cj=-1,sj=-1;pv.names.forEach(function(nm,j){/colou?r/i.test(nm)&&cj<0&&(cj=j)});pv.names.forEach(function(nm,j){j!==cj&&sj<0&&(sj=j)});cj>-1&&(N.color=m.vals[cj]);sj>-1&&(N.size=m.vals[sj]);`
  + `N.luFree?(N.luPick=!0):(N.luAt=Date.now());`
  + `for(var j=0;j<r.length;j++){var x=r[j];if(x!==N&&x.variantId===N.variantId&&!!x.luFree===!!N.luFree&&!x.gift&&(x.bundleKey||"")===(N.bundleKey||"")&&(x.companionBundle||"")===(N.companionBundle||"")){`
  + `x.qty+=N.qty;N.luPick&&(x.luPick=!0);N.luAt&&(x.luAt=N.luAt);part||r.splice(W,1);N=null;break}}part&&N&&r.splice(W+1,0,N);c();R()}`
  + `function luSheet(W){var D=r[W],pv=D&&luPV(D),me=pv&&pv.v.filter(function(v){return v.id===D.variantId})[0];if(!me)return;var sh=luSheet.el;`
  + `if(!sh){sh=luSheet.el=document.createElement("div");sh.className="lu-sh";sh.hidden=!0;`
  + `sh.innerHTML='<div class="lu-sh__bg" data-lu-sh-x></div><div class="lu-sh__p" role="dialog" aria-modal="true" aria-label="Choose colour, size and quantity" tabindex="-1">'`
  + `+'<button type="button" class="lu-sh__x" data-lu-sh-x aria-label="Close"><svg viewBox="0 0 18 18" width="18" height="18" aria-hidden="true"><path d="M2 2l14 14M16 2L2 16" stroke="currentColor" stroke-width="1.5"/></svg></button>'`
  + `+'<div class="lu-sh__in" data-lu-sh-in></div><div class="lu-sh__ft"><button type="button" class="lu-sh__ok" data-lu-sh-ok>Confirm</button></div></div>';`
  + `(t(".drawer__inner",i)||i).appendChild(sh);`
  + `sh.addEventListener("click",function(k){var x=k.target.closest&&k.target.closest("[data-lu-sh-x],[data-lu-sh-v],[data-lu-sh-q],[data-lu-sh-ok]"),s=luSheet.st;if(!x||!s)return;k.preventDefault();`
  + `if(x.hasAttribute("data-lu-sh-x"))return luShClose();`
  + `if(x.hasAttribute("data-lu-sh-ok")){var w=r.indexOf(s.D),m=luShM(s),n=s.n;luShClose();if(w>-1&&m){luApply(w,m,n);var b=t('li[data-index="'+Math.min(w,r.length-1)+'"] [data-lu-vchg]',i);b&&b.focus({preventScroll:!0})}return}`
  + `if(x.hasAttribute("data-lu-sh-q")){s.n=Math.max(1,Math.min(99,s.n+ +x.getAttribute("data-lu-sh-q")));luShUpd();x.disabled&&(k.detail?t(".lu-sh__p",sh):t(".lu-sh__ok",sh)).focus({preventScroll:!0});return}`
  // a value picked: the variant with it and most of the other choices (available first) sets every choice
  + `var j=+x.getAttribute("data-j"),v=x.getAttribute("data-lu-sh-v"),bm=null,bs=-1;s.pv.v.forEach(function(y){if(String(y.vals[j])!==v)return;var sc=y.ok?.5:0;y.vals.forEach(function(z,k){String(z)===s.sel[k]&&sc++});sc>bs&&(bs=sc,bm=y)});`
  + `bm?(s.sel=bm.vals.map(String)):(s.sel[j]=v);luShUpd()});`
  + `sh.addEventListener("keydown",function(k){if(k.key==="Escape"){k.stopPropagation();k.preventDefault();luShClose();return}`
  + `if(k.key==="Tab"){var f=[].filter.call(sh.querySelectorAll("button:not([disabled])"),function(b){return b.offsetParent!==null}),a=f[0],z=f[f.length-1];`
  + `if(!a)return;k.shiftKey&&document.activeElement===a?(k.preventDefault(),z.focus({preventScroll:!0})):!k.shiftKey&&document.activeElement===z&&(k.preventDefault(),a.focus({preventScroll:!0}))}});`
  + `sh.addEventListener("keyup",function(k){k.key==="Escape"&&k.stopPropagation()});`
  + `window.MutationObserver&&new MutationObserver(function(){i.classList.contains("active")||luShClose()}).observe(i,{attributes:!0,attributeFilter:["class"]})}`
  + `var ord=pv.names.map(function(nm,j){return j}).sort(function(a,b){return(/colou?r/i.test(pv.names[b])?1:0)-(/colou?r/i.test(pv.names[a])?1:0)});`
  + `luSheet.st={D:D,pv:pv,ord:ord,sel:me.vals.map(String),n:D.qty,free:!!D.luFree,op:t('li[data-index="'+W+'"] [data-lu-vchg]',i)};`
  + `luShDraw();sh.hidden=!1;sh.offsetWidth;sh.classList.add("is-open");t(".lu-sh__x",sh).focus({preventScroll:!0})}/*/luSheet*/`;

// 7. Colour / size in the drawer (user 2026-11-24). luPV(line) = the product's variants: this page's #sf-variants-data +
//    [data-lu-options-json] when it is the product shown, else its page (line.url) fetched once (sessionStorage
//    "lu-pv:<id>"); option names from the options JSON, else matched from the line's own opts. luVC = a select changed:
//    the variant with that value and most of the others, its price / compare-at / picture; a gift switched by the
//    buyer is kept (luPick) even when it costs a difference; the same variant on another line = one line.
const VARIANT_FNS = `function luPV(D){var C=luPV.c||(luPV.c={}),k=String(D.productId||"");if(!k)return null;if(k in C)return C[k];`
  + `var mk=function(vt,gt){try{var v=JSON.parse(vt||"[]"),g=JSON.parse(gt||"[]"),nm=g.map(function(x){return x&&x.name}).filter(Boolean);if(!v.length)return false;`
  + `if(!nm.length){var me=v.filter(function(x){return x.id===D.variantId})[0];if(!me)return false;nm=(me.option_values||[]).map(function(val){var o=(D.opts||[]).filter(function(q){return String(q.value)===String(val)})[0];return o?o.name:""})}`
  + `if(!nm.length||nm.indexOf("")>-1||nm.length!==(v[0].option_values||[]).length)return false;`
  + `return{names:nm,v:v.map(function(x){return{id:x.id,vals:x.option_values||[],price:B(x.price),compare:B(x.compare_at_price),img:x.featured_image||"",ok:x.available!==false}})}}catch(er){return false}},`
  + `cut=function(h,a){var s=h.indexOf(a);if(s<0)return"";s+=a.length;var e2=h.indexOf("</script>",s);return e2<0?"":h.slice(s,e2)},cf={};`
  + `try{cf=JSON.parse((document.getElementById("sf-config")||{}).textContent||"{}")||{}}catch(er){}`
  + `var hv=document.getElementById("sf-variants-data"),hg=document.querySelector("[data-lu-options-json]");`
  + `if(hv&&String(cf.productId||"")===k)return C[k]=mk(hv.textContent,hg?hg.textContent:"[]");`
  + `try{var ss=sessionStorage.getItem("lu-pv:"+k);if(ss)return C[k]=JSON.parse(ss)}catch(er){}`
  + `if(!D.url||typeof fetch!="function")return C[k]=false;C[k]=null;`
  + `fetch(D.url,{credentials:"same-origin"}).then(function(x){return x.ok?x.text():""}).then(function(h){var q=h?mk(cut(h,'id="sf-variants-data">'),cut(h,"data-lu-options-json>")):false;`
  + `C[k]=q;try{q&&sessionStorage.setItem("lu-pv:"+k,JSON.stringify(q))}catch(er){}q&&R()}).catch(function(){C[k]=false});return null}`
  + `function luVC(W,li,ci){var D=r[W],pv=D&&luPV(D);if(!pv)return;var want=[];`
  + `[].forEach.call(li.querySelectorAll("select[data-lu-vopt]"),function(s){want[+s.getAttribute("data-lu-vopt")]=s.value});`
  + `var m=null,bs=-1;pv.v.forEach(function(v){if(String(v.vals[ci])!==String(want[ci]))return;var sc=v.ok?.5:0;v.vals.forEach(function(x,j){String(x)===String(want[j])&&sc++});sc>bs&&(bs=sc,m=v)});`
  + `if(!m||m.id===D.variantId)return;`
  // user 2026-11-25: a row of a line of N units (li = [data-lu-vrow]) = that one unit: it leaves the line (N-1 stay) for
  // a line of its own right under it, open, so its other option can be set at once; same variant elsewhere = merged there
  + `var luOne=D.qty>1&&li.hasAttribute("data-lu-vrow"),luN=D;if(luOne){luN=Object.assign({},D,{qty:1,__open:!0});D.qty-=1}`
  + `luN.variantId=m.id;luN.opts=pv.names.map(function(nm,j){return{name:nm,value:m.vals[j]}});`
  + `m.price>0&&(luN.price=m.price);luN.compareAt=m.compare||0;m.img&&(luN.img=m.img);`
  + `var cj=-1,sj=-1;pv.names.forEach(function(nm,j){/colou?r/i.test(nm)&&cj<0&&(cj=j)});pv.names.forEach(function(nm,j){j!==cj&&sj<0&&(sj=j)});cj>-1&&(luN.color=m.vals[cj]);sj>-1&&(luN.size=m.vals[sj]);`
  + `luN.luFree?(luN.luPick=!0):(luN.luAt=Date.now());`
  + `for(var j=0;j<r.length;j++){var x=r[j];if(x!==luN&&x.variantId===luN.variantId&&!!x.luFree===!!luN.luFree&&!x.gift&&(x.bundleKey||"")===(luN.bundleKey||"")&&(x.companionBundle||"")===(luN.companionBundle||"")){`
  + `x.qty+=luN.qty;luN.luPick&&(x.luPick=!0);luN.luAt&&(x.luAt=luN.luAt);luN.__open&&(x.__open=!0);luOne||r.splice(W,1);luN=null;break}}luOne&&luN&&r.splice(W+1,0,luN);c();R()}`;

// … "Discounts" row above the subtotal (as Tammycharm): the best offer's name, made from the offer (LuDisc.label) …
const DISC_ROW = '<p class="lu-disc-row" data-lu-disc-row hidden><span class="lu-disc-row__l">Discounts</span>'
  + '<span class="lu-disc-row__tag" data-lu-disc-tag hidden><svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="7.5" cy="7.5" r="1.5" fill="currentColor"/></svg><span data-lu-disc-tag-t></span></span>'
  + '<span class="lu-disc-row__amt">-<span data-lu-disc-amt>$0.00</span></span></p>'
  // a long offer name (40% OFF · 5+ ITEMS) + amount over 360 px: the row wraps, the amount keeps its line (user 2026-11-25)
  + '<style>#CartDrawer .lu-disc-row{display:flex;flex-wrap:wrap;align-items:center;gap:4px 8px;margin:6px 0 2px;font-size:13px;line-height:1.3}#CartDrawer .lu-disc-row[hidden],#CartDrawer .lu-disc-row__tag[hidden]{display:none}'
  + '#CartDrawer .lu-disc-row__l{color:var(--lu-primary,#790236);font-weight:700}'
  + '#CartDrawer .lu-disc-row__tag{display:inline-flex;align-items:center;gap:4px;background:#ececec;color:#555;border-radius:4px;padding:2px 7px;font-size:12px;font-weight:700;letter-spacing:.02em;text-transform:uppercase;line-height:1.2;white-space:nowrap}'
  + '#CartDrawer .lu-disc-row__amt{flex:none;margin-left:auto;font-weight:700;white-space:nowrap}'
  // Compact cart (user 2026-11-25, Shopee's cart as the layout): every text 1-2 sizes down, the line under "Your cart"
  // close to it, a line = title / [colour, size box | − qty +] / price. #CartDrawer ids beat custom.css's !important.
  + '#CartDrawer .drawer__header{padding:8px 0 6px}#CartDrawer .drawer__heading{font-size:2.2rem!important;line-height:1.2}'
  + '#CartDrawer .drawer__header .drawer__close{--btn-size:4.4rem!important}#CartDrawer .gs-cart-notice{padding:6px 16px;font-size:12px}'
  + '#CartDrawer .cart-drawer-item.lu-ci{grid-template-columns:8rem 1fr;gap:0 1.2rem!important;padding:1.2rem 0!important}'
  + '#CartDrawer .lu-ci .cart-item__media{width:8rem!important}#CartDrawer .lu-ci .cart-item__media .cart-item__image{width:8rem!important;height:8rem!important}'
  + '#CartDrawer .lu-ci .lu-ci__rm{top:.4rem}'
  // one grid for the line's info: the wrappers (details, the colour / size box, the bottom row) hand it their children
  + '#CartDrawer .lu-ci .lu-ci__info{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:6px 8px}'
  + '#CartDrawer .lu-ci .cart-item__details,#CartDrawer .lu-ci .lu-ci__bottom,#CartDrawer .lu-ci .lu-vbox{display:contents!important}'
  + '#CartDrawer .lu-ci .cart-item__details>*,#CartDrawer .lu-ci .lu-ci__bottom>*{grid-column:1/-1}'
  + '#CartDrawer .lu-ci .cart-item__name{grid-row:1;margin:0;padding-right:3.6rem;font-size:13px!important;line-height:1.35}'
  + '#CartDrawer .lu-ci .product-option{grid-column:1;grid-row:2;min-width:0;overflow:hidden;font-size:12px;line-height:1.3;color:#6f6f6f;white-space:nowrap;text-overflow:ellipsis}'
  + '#CartDrawer .lu-ci .lu-vval{display:inline}#CartDrawer .lu-ci .lu-vval+.lu-vval:before{content:", "}'
  + '#CartDrawer .lu-ci .lu-vchg{grid-column:1;grid-row:2;justify-self:start;position:relative;display:inline-flex;align-items:center;gap:6px;max-width:100%;min-width:0;height:28px;margin:0;padding:0 8px;'
  + 'background:#f2f2f2;border:0;border-radius:4px;color:#444;font:inherit;font-size:12px;font-weight:400;line-height:1;text-decoration:none;cursor:pointer}'
  + '#CartDrawer .lu-ci .lu-vchg:after{content:"";position:absolute;top:-8px;bottom:-8px;left:0;right:0}#CartDrawer .lu-ci .lu-vchg:hover{background:#e9e9e9}'
  + '#CartDrawer .lu-vchg__t{min-width:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}#CartDrawer .lu-vchg svg{flex:none;transition:transform .2s}#CartDrawer .lu-vchg[aria-expanded=true] svg{transform:rotate(180deg)}'
  // quantity small (28 px high, the user's choice); each ± keeps a 44 px high tap area
  + '#CartDrawer .lu-ci quantity-input.quantity{grid-column:2;grid-row:2;width:8.4rem!important;height:2.8rem!important;border-color:rgba(var(--color-foreground),.25);border-radius:4px}'
  + '#CartDrawer .lu-ci .quantity__button{position:relative;flex:0 0 2.8rem!important;width:2.8rem!important}#CartDrawer .lu-ci .quantity__button:after{content:"";position:absolute;top:-8px;bottom:-8px;left:0;right:0}'
  + '#CartDrawer .lu-ci .quantity__button svg{width:1rem;height:1rem}#CartDrawer .lu-ci .quantity__input{font-size:13px}'
  + '#CartDrawer .lu-ci .cart-item__totals{grid-column:1/-1;grid-row:3;display:block;text-align:left}#CartDrawer .lu-ci .cart-item__price-wrapper{display:block;text-align:left}'
  + '#CartDrawer .lu-ci .cart-item__discounted-prices{flex-direction:row!important;align-items:baseline!important;justify-content:flex-start!important;gap:6px!important;flex-wrap:wrap!important}'
  + '#CartDrawer .lu-ci .regular-price{font-size:14px!important;line-height:1.2}#CartDrawer .lu-ci .cart-item__old-price{font-size:12px}'
  // phones: the drawer takes the whole width (user 2026-11-25; custom.css left a 35 px strip of the page on the left)
  + '@media screen and (max-width:749px){#CartDrawer .drawer__inner{width:100%!important;max-width:100%!important;margin-left:0!important;border-left:0}}'
  // bottom sheet (luSheet, theme.js): over the drawer, slides up; backdrop + X close it
  + '#CartDrawer .lu-sh{position:absolute;inset:0;z-index:30;display:flex;flex-direction:column;justify-content:flex-end}#CartDrawer .lu-sh[hidden]{display:none}'
  + '#CartDrawer .lu-sh__bg{position:absolute;inset:0;display:block;background:rgba(0,0,0,.45);opacity:0;transition:opacity .25s}#CartDrawer .lu-sh__p:focus{outline:none}'
  + '#CartDrawer .lu-sh__p{position:relative;display:flex;flex-direction:column;max-height:88%;background:#fff;border-radius:12px 12px 0 0;box-shadow:0 -4px 20px rgba(0,0,0,.12);transform:translateY(100%);transition:transform .25s ease}'
  + '#CartDrawer .lu-sh.is-open .lu-sh__bg{opacity:1}#CartDrawer .lu-sh.is-open .lu-sh__p{transform:none}'
  + '@media (prefers-reduced-motion:reduce){#CartDrawer .lu-sh__bg,#CartDrawer .lu-sh__p{transition:none}}'
  + '#CartDrawer .lu-sh__x{position:absolute;top:4px;right:4px;z-index:1;display:flex;align-items:center;justify-content:center;width:44px;height:44px;min-width:0;min-height:0;margin:0;padding:0;border:0;background:none;box-shadow:none;color:#555;cursor:pointer}'
  + '#CartDrawer .lu-sh__in{flex:1 1 auto;min-height:0;overflow-y:auto;overscroll-behavior:contain}'
  + '#CartDrawer .lu-sh__top{display:flex;align-items:flex-end;gap:12px;padding:16px 52px 14px 16px;border-bottom:1px solid #eee}'
  + '#CartDrawer .lu-sh__img{flex:none;display:block;width:96px;height:96px;border-radius:6px;object-fit:cover;object-position:top;background:#f3f3f3}#CartDrawer .lu-sh__img[hidden]{display:none}'
  + '#CartDrawer .lu-sh__pr{min-width:0;line-height:1.3}#CartDrawer .lu-sh__pr b{font-size:18px;font-weight:700;color:var(--vn-hl,#790236)}#CartDrawer .lu-sh__pr s{font-size:13px;color:#9a9a9a}'
  + '#CartDrawer .lu-sh__cur{margin:4px 0 0;font-size:13px;color:#6f6f6f}'
  + '#CartDrawer .lu-sh__opt{padding:12px 16px;border-bottom:1px solid #eee}#CartDrawer .lu-sh__lbl{margin:0 0 8px;font-size:14px;font-weight:600;color:#121212}'
  + '#CartDrawer .lu-sh__vals{display:flex;flex-wrap:wrap;gap:8px}'
  + '#CartDrawer .lu-sh__v{display:inline-flex;align-items:center;gap:6px;min-width:44px;min-height:44px;margin:0;padding:4px 12px;border:1px solid transparent;border-radius:4px;background:#f5f5f5;box-shadow:none;'
  + 'color:#121212;font:inherit;font-size:13px;line-height:1.2;cursor:pointer}#CartDrawer .lu-sh__v img{flex:none;width:28px;height:28px;border-radius:2px;object-fit:cover;object-position:top}'
  + '#CartDrawer .lu-sh__v.is-on{border-color:var(--vn-hl,#790236);background:#fff;color:var(--vn-hl,#790236)}#CartDrawer .lu-sh__v.is-out:not(.is-on){color:#aaa}#CartDrawer .lu-sh__v.is-out img{opacity:.5}'
  + '#CartDrawer .lu-sh__qty{display:flex;align-items:center;justify-content:space-between;border-bottom:0}#CartDrawer .lu-sh__qty .lu-sh__lbl{margin:0}'
  + '#CartDrawer .lu-sh__step{display:flex;align-items:center;border:1px solid #ddd;border-radius:4px}#CartDrawer .lu-sh__step span{min-width:40px;text-align:center;font-size:14px}'
  + '#CartDrawer .lu-sh__step button{display:flex;align-items:center;justify-content:center;width:40px;height:36px;min-width:0;min-height:0;margin:0;padding:0;border:0;background:none;box-shadow:none;color:#121212;cursor:pointer;position:relative}'
  + '#CartDrawer .lu-sh__step button:after{content:"";position:absolute;top:-4px;bottom:-4px;left:0;right:0}#CartDrawer .lu-sh__step button:disabled{color:#ccc;cursor:default}'
  + '#CartDrawer .lu-sh__ft{flex:none;padding:10px 16px max(12px,env(safe-area-inset-bottom));border-top:1px solid #eee}'
  + '#CartDrawer .lu-sh__ok{display:block;width:100%;min-height:48px;margin:0;padding:0 20px;border:0;border-radius:40px;background:var(--vn-hl,#790236);box-shadow:none;color:#fff;font:inherit;font-size:16px;font-weight:700;cursor:pointer}'
  + '#CartDrawer .lu-sh__ok:disabled{opacity:.5;cursor:default}#CartDrawer .lu-sh button:focus-visible{outline:2px solid var(--vn-hl,#790236);outline-offset:2px}'
  + '#CartDrawer .lu-gift-badge{display:inline-block;vertical-align:1px;margin-left:6px;padding:1px 6px;border:1px solid #e4c0d0;border:1px solid color-mix(in srgb,var(--vn-hl,#790236) 25%,#fff);border-radius:4px;background:#f6e8ee;background:color-mix(in srgb,var(--vn-hl,#790236) 8%,#fff);color:var(--vn-hl,#790236);font-size:12px;font-weight:700;line-height:1.3;letter-spacing:.02em;text-transform:none;white-space:nowrap}'
  // footer: subtotal + checkout button one size down
  + '#CartDrawer .cart-drawer__totals__row{font-size:1.5rem!important}#CartDrawer .lu-subtotal__lbl,#CartDrawer .lu-subtotal__was{font-size:1.4rem}#CartDrawer .lu-subtotal__amt{font-size:1.7rem}'
  + '#CartDrawer #CartDrawer-Checkout{min-height:4.8rem!important;padding:1.2rem 2rem!important;font-size:1.6rem}'
  // shipping protection: the description on one line ending "…", a tap on it shows it all (theme.js sets .is-more)
  + '#CartDrawer .lu-ups .lu-up__txt strong{font-size:13px;-webkit-line-clamp:2}#CartDrawer .lu-ups .lu-up__price b{font-size:13px}'
  + '#CartDrawer .lu-ups .lu-up__desc{font-size:12px;-webkit-line-clamp:1}#CartDrawer .lu-ups .lu-up__desc.is-more{cursor:pointer}'
  + '#CartDrawer .lu-ups .lu-up__desc.is-open{display:block;overflow:visible}#CartDrawer .lu-ups .lu-up__desc:focus-visible{outline:2px solid var(--lu-up-accent);outline-offset:2px}</style>';

const DISC_LABEL = 'function label(S){if(!S||!S.kind)return"";var o=S.o||{};'
  + 'if(S.kind==="bxgy"){var b=+o.buy||1,g=+o.get||1,same=!!o.all||(o.y||[]).some(function(p){return(o.x||[]).indexOf(p)>-1;});'
  + 'return "Buy "+(same&&b>g?b-g:b)+", Get "+g+(o.type==="FREE"?" Free":o.type==="PERCENTAGE"?" "+o.value+"% off":" $"+o.value+" off");}'
  + 'if(S.kind==="off")return(o.type==="PERCENTAGE"?o.value+"% off":"$"+o.value+" off")+(+o.minQty>1?" · "+o.minQty+"+ items":"");'
  + 'return "Volume discount";}\n';

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
  // 6. Buy X Get Y gifts: bxgy() frees gift lines first, then the last lines (same money, ties only) and says how many
  //    units of each line are free …
  {
    file: 'snippets/gs-head.hbs', done: 'var fr=lines.map(',
    find: 'u.sort(function(a,b){return a.p-b.p;});',
    replace: 'u.sort(function(a,b){return a.p-b.p||(lines[b.i].luFree?1:0)-(lines[a.i].luFree?1:0)||b.i-a.i;});var fr=lines.map(function(){return 0;});',
  },
  {
    file: 'snippets/gs-head.hbs', done: 'return {total:r2(tot),per:per,free:fr};',
    find: 'a=r2(a);per[x.i]+=a;tot+=a;});\n  return {total:r2(tot),per:per};',
    replace: 'a=r2(a);per[x.i]+=a;tot+=a;if(x.p>0&&a>=x.p-.005)fr[x.i]++;});\n  return {total:r2(tot),per:per,free:fr};',
  },
  // … the cart lines carry `luFree` to the discount, to storage and back, and never merge with a bought line …
  {
    file: 'assets/js/theme.js', done: 'gift:!!x.gift||nb<=0,luFree:!!x.luFree}',
    find: 'gift:!!x.gift||nb<=0}',
    replace: 'gift:!!x.gift||nb<=0,luFree:!!x.luFree}',
  },
  {
    file: 'assets/js/theme.js', done: ',gift:!!k.gift,luFree:!!k.luFree,luAt:k.luAt||0,luPick:!!k.luPick};',
    find: ',gift:!!k.gift};',
    replace: ',gift:!!k.gift,luFree:!!k.luFree,luAt:k.luAt||0,luPick:!!k.luPick};',
  },
  {
    file: 'assets/js/theme.js', done: 'gift:!!y.gift,luFree:!!y.luFree,luAt:+y.luAt||0,luPick:!!y.luPick,',
    find: 'gift:!!y.gift,',
    replace: 'gift:!!y.gift,luFree:!!y.luFree,luAt:+y.luAt||0,luPick:!!y.luPick,',
  },
  {
    file: 'assets/js/theme.js', done: '!!k.gift==!!x.gift&&!!k.luFree==!!x.luFree&&',
    find: '!!k.gift==!!x.gift&&',
    replace: '!!k.gift==!!x.gift&&!!k.luFree==!!x.luFree&&',
  },
  {
    file: 'assets/js/theme.js', done: 'x.luAt=Date.now(),N?(N.qty+=x.qty,N.luAt=x.luAt)',
    find: 'N?N.qty+=x.qty:r.push(x),c(),R()}',
    replace: 'x.luAt=Date.now(),N?(N.qty+=x.qty,N.luAt=x.luAt):r.push(x),c(),R()}',
  },
  {
    file: 'assets/js/theme.js', done: 'B=S.kind==="bxgy"?S:',
    find: 'return o})(r,S,BU);',
    replace: 'return o})(r,S,BU),' + FREE_DISP + ';',
    upgrade: { from: 'LD=(function luDisp(', to: 'return{amt:amt,fu:fu}})(r,S,BU,PA)', text: FREE_DISP },
  },
  // … every gift line of the drawer shows $0.00 (user 2026-11-23), the store's gift offers too …
  {
    file: 'assets/js/theme.js', done: 'D.gift?(tt.textContent=" "+yt(0)+" ",',
    find: 'D.gift?(tt.textContent=" FREE ",',
    replace: 'D.gift?(tt.textContent=" "+yt(0)+" ",',
  },
  // … the drawer adds / drops gifts before it draws, a gift the buyer removes stays removed …
  {
    file: 'assets/js/theme.js', done: 'li.hasAttribute("data-lu-vrow")',
    find: 'function R(){O(),window.LuUp&&LuUp.sync(r,R,c);',
    replace: FREE_SYNC + VARIANT_FNS + 'function R(){luFS(),O(),window.LuUp&&LuUp.sync(r,R,c);',
    upgrade: { from: 'function luPV(D){', to: 'r.splice(W,1);break}}c();R()}', text: VARIANT_FNS },
  },
  // … gifts on top of the units bought (2026.11.25.6): re-applies FREE_SYNC over the older luFS
  {
    file: 'assets/js/theme.js', done: 'cv=function(L){var a=0;',
    upgrade: { from: 'function luFS(m){', to: 'ch&&(c(),R())}', text: FREE_SYNC },
    find: 'function luFS(m){',
  },
  {
    file: 'assets/js/theme.js', done: '_t.luFree&&S==="rm"&&luFS("off");',
    find: 'if(_t){var S=b.getAttribute("data-action");',
    replace: 'if(_t){var S=b.getAttribute("data-action");_t.luFree&&S==="rm"&&luFS("off");',
  },
  // … and draws the free units
  {
    file: 'assets/js/theme.js', done: 'data-lu-vchg aria-haspopup="dialog"',
    find: 'Ct=(D.compareAt>D.price?D.compareAt:D.price)*D.qty;',
    replace: 'Ct=(D.compareAt>D.price?D.compareAt:D.price)*D.qty;' + FREE_LINE,
    upgrade: { from: 'var FU=D.gift?0:LD.fu[J]||0;', to: 'xt.classList.add("lu-vbox")}', text: FREE_LINE },
  },
  {
    file: 'assets/js/theme.js', done: '{className:"lu-gift-badge",textContent:D.qty>1?D.qty+" Free gifts":"Free gift"}',
    // the count on a gift line of 2+ units (user 2026-11-25: its quantity is hidden, "Free gift" read as 1 gift)
    upgrade: { from: '{className:"lu-gift-badge",textContent:"Free gift"}', text: '{className:"lu-gift-badge",textContent:D.qty>1?D.qty+" Free gifts":"Free gift"}' },
    find: 'st&&st.parentNode.removeChild(st);W.appendChild(ut)',
    // a gift line (whole line free, or the store's gift offer): a small "Free gift" chip at the end of the title, no price
    replace: 'st&&st.parentNode.removeChild(st);(D.gift||FU>0&&FU>=D.qty)&&(vt.appendChild(Object.assign(document.createElement("span"),{className:"lu-gift-badge",textContent:D.qty>1?D.qty+" Free gifts":"Free gift"})),tt.textContent="",tt.removeAttribute("style"),tt.style.display="none",'
      + 'V.parentNode&&(V.previousElementSibling&&V.parentNode.removeChild(V.previousElementSibling),V.parentNode.removeChild(V)),st&&st.parentNode&&st.parentNode.removeChild(st));W.appendChild(ut)',
  },
  // 7. no "FREE GIFT" on the store's gift lines either …
  {
    file: 'assets/js/theme.js', done: 'et.classList.add("cart-item--gift");var m=t(',
    find: 'var It=document.createElement("span");It.className="cart-item__gift-tag",It.textContent="FREE GIFT",vt.appendChild(It);',
    replace: '',
  },
  // … colour / size selects: a change re-prices the line …
  {
    file: 'assets/js/theme.js', done: 's.closest("[data-lu-vrow]")||y,',
    upgrade: { from: 'y&&luVC(parseInt(y.getAttribute("data-index"),10),y,', text: 'y&&luVC(parseInt(y.getAttribute("data-index"),10),s.closest("[data-lu-vrow]")||y,' },
    find: 'var N=t("#CartDrawer-Form",i);',
    replace: 't("[data-ms-cart-items]",i).addEventListener("change",function(k){var s=k.target.closest&&k.target.closest("select[data-lu-vopt]");if(!s)return;var y=s.closest("li[data-index]");y&&luVC(parseInt(y.getAttribute("data-index"),10),s.closest("[data-lu-vrow]")||y,+s.getAttribute("data-lu-vopt"))});t("[data-ms-cart-items]",i).addEventListener("click",function(k){var bt=k.target.closest&&k.target.closest("[data-lu-vchg]");if(!bt)return;k.preventDefault();var y=bt.closest("li[data-index]"),D=y&&r[parseInt(y.getAttribute("data-index"),10)];D&&(D.__open=!D.__open,R())});var N=t("#CartDrawer-Form",i);',
  },
  // … a line the drawer has no selects for shows its values only, "White, M" (user 2026-11-25: no "Color:" / "Size:"
  //   text; was "Side" → "Size" on every line) …
  {
    file: 'assets/js/theme.js', done: '\'<span class="lu-vval">\'+ct(mt.value)',
    upgrade: { from: '\'<span style="display:block">\'+ct(mt.name?(/^side$/i.test(mt.name)?"Size":mt.name)+": "+mt.value:mt.value)', text: '\'<span class="lu-vval">\'+ct(mt.value)' },
    find: '\'<span style="display:block">\'+ct(mt.name?mt.name+": "+mt.value:mt.value)',
    replace: '\'<span class="lu-vval">\'+ct(mt.value)',
  },
  // … the best discount says what it is (kind + offer) and LuDisc.label names it …
  {
    file: 'snippets/gs-head.hbs', done: 'd.kind="bxgy";d.o=o;',
    find: '  if(c&&c.total>r.total)r=c;\n'
      + '  offers(offerStr).forEach(function(o){var d=bxgy(lines,o);if(d&&d.total>r.total)r=d;});\n'
      + '  offers(offStr).forEach(function(o){var d=amountOff(lines,o);if(d&&d.total>r.total)r=d;});',
    replace: '  if(c&&c.total>r.total){c.kind="tier";r=c;}\n'
      + '  offers(offerStr).forEach(function(o){var d=bxgy(lines,o);if(d&&d.total>r.total){d.kind="bxgy";d.o=o;r=d;}});\n'
      + '  offers(offStr).forEach(function(o){var d=amountOff(lines,o);if(d&&d.total>r.total){d.kind="off";d.o=o;r=d;}});',
  },
  // … two Buy X Get Y offers worth the same (6 units: Buy 3 Get 1 ×2 = Buy 5 Get 2) → the one giving more free units
  //   names the row ("Buy 3, Get 2 Free", user 2026-11-25); same units free, same money
  {
    file: 'snippets/gs-head.hbs', done: '(+o.get||1)>(+r.o.get||1)',
    find: 'if(d&&d.total>r.total){d.kind="bxgy";d.o=o;r=d;}',
    replace: 'if(d&&(d.total>r.total||r.kind==="bxgy"&&d.total>=r.total-.005&&(+o.get||1)>(+r.o.get||1))){d.kind="bxgy";d.o=o;r=d;}',
  },
  {
    file: 'snippets/gs-head.hbs', done: 'amountOff:amountOff,label:label};',
    find: 'window.LuDisc={best:best,tiers:tiers,offers:offers,amountOff:amountOff};',
    replace: DISC_LABEL + 'window.LuDisc={best:best,tiers:tiers,offers:offers,amountOff:amountOff,label:label};',
  },
  // … and the "Discounts" row above the subtotal shows it with the amount
  {
    file: 'sections/cart-drawer.hbs', done: '#CartDrawer .lu-sh__img[hidden]{display:none}',
    upgrade: { from: '<p class="lu-disc-row"', to: '</style>', text: DISC_ROW },
    find: '<p class="cart-drawer__totals__row cart-drawer__totals__row--spaced text-color-text lu-subtotal">',
    replace: DISC_ROW + '<p class="cart-drawer__totals__row cart-drawer__totals__row--spaced text-color-text lu-subtotal">',
  },
  {
    file: 'assets/js/theme.js', done: 'var LR=t("[data-lu-disc-row]",i);',
    find: 't("[data-ms-cart-subtotal]",i).textContent=yt(C-S.total);',
    replace: 't("[data-ms-cart-subtotal]",i).textContent=yt(C-S.total);var LR=t("[data-lu-disc-row]",i);if(LR){var LL=window.LuDisc&&LuDisc.label?LuDisc.label(S):"";LR.hidden=!(S.total>.004);t("[data-lu-disc-amt]",LR).textContent=yt(S.total);t("[data-lu-disc-tag]",LR).hidden=!LL;t("[data-lu-disc-tag-t]",LR).textContent=LL}',
  },
  // 9. the bottom sheet (luSheet …) next to the drawer's render, and the colour / size box opens it (was: toggle the
  //    selects under the line)
  {
    file: 'assets/js/theme.js', done: 'function luShUpd(){',
    upgrade: { from: 'function luShM(s){', to: ['/*/luSheet*/', 'sh.classList.add("is-open");t(".lu-sh__x",sh).focus()}'], text: SHEET_FNS },
    find: 'function R(){luFS(),O(),',
    replace: SHEET_FNS + 'function R(){luFS(),O(),',
  },
  {
    file: 'assets/js/theme.js', done: 'D&&luSheet(parseInt(y.getAttribute("data-index"),10))',
    find: 'D&&(D.__open=!D.__open,R())',
    replace: 'D&&luSheet(parseInt(y.getAttribute("data-index"),10))',
  },
  // 8. shipping protection description (user 2026-11-25): one line ending "…" (CSS); after every draw (LuUp.sync has
  //    shown the block by then) a description cut short gets .is-more + button role, a tap / Enter on it shows it all
  {
    file: 'assets/js/theme.js', done: 'querySelectorAll(".lu-up__desc"),function(d){if(d.classList.contains("is-open"))',
    find: 't("[data-ms-cart-subtotal]",i).textContent=yt(C-S.total);',
    replace: 't("[data-ms-cart-subtotal]",i).textContent=yt(C-S.total);[].forEach.call(i.querySelectorAll(".lu-up__desc"),function(d){if(d.classList.contains("is-open"))return;'
      + 'var o=d.scrollHeight>d.clientHeight+1;d.classList.toggle("is-more",o);o?(d.setAttribute("role","button"),d.setAttribute("tabindex","0"),d.setAttribute("aria-expanded","false"))'
      + ':(d.removeAttribute("role"),d.removeAttribute("tabindex"),d.removeAttribute("aria-expanded"))});',
  },
  {
    file: 'assets/js/theme.js', done: 'var luMo=function(k){',
    find: 'var N=t("#CartDrawer-Form",i);',
    replace: 'var luMo=function(k){var d=k.target.closest&&k.target.closest(".lu-up__desc");if(!d||k.type==="keydown"&&k.key!=="Enter"&&k.key!==" ")return;'
      + 'var op=d.classList.contains("is-open");if(!op&&!(d.scrollHeight>d.clientHeight+1))return;k.preventDefault();d.classList.toggle("is-open",!op);d.setAttribute("aria-expanded",op?"false":"true")};'
      + 'i.addEventListener("click",luMo);i.addEventListener("keydown",luMo);var N=t("#CartDrawer-Form",i);',
  },
  // 10. a pack (Kaching rows, J() in the product form) adds the units its Buy X Get Y offer makes free as gift lines
  //     (`luFree`, after the bought ones): BUY 3 GET 2 = 3 bought + 2 gifts, same money, so luFS's "gifts on top"
  //     adds nothing more. Which units: bxgy() on the pack alone (the cheapest, ties = the last rows' variants).
  {
    file: 'assets/js/theme.js', done: 'var LF=(function(){try{var cd=document.querySelector("cart-drawer")',
    find: 'return U.forEach(function(Mt){var Jt=I[Mt],wt=Jt.v,',
    replace: 'var LF=(function(){try{var cd=document.querySelector("cart-drawer"),bx=cd&&cd.getAttribute("data-bxgy")||"",pid=r.productId||r.handle||"";'
      + 'if(!bx||!window.LuDisc||!U.length)return[];var d=LuDisc.best(U.map(function(k){var g=I[k],v=g.v;'
      + 'return{pid:pid,vid:v?String(v.id):"",price:v&&B(v.price)>0?B(v.price):B(r.priceNum)||B(r.price),qty:g.q}}),"",bx,"");'
      + 'return d&&d.kind==="bxgy"&&d.free||[]}catch(er){return[]}})(),LZ=[];'
      + 'return U.forEach(function(Mt,Mi){var Jt=I[Mt],wt=Jt.v,',
  },
  {
    file: 'assets/js/theme.js', done: 'LZ.forEach(function(Ln){dt.add(Ln)}),Pt("AddToCart"',
    find: 'dt.add({productId:r.productId||r.handle||"",variantId:wt?wt.id:"",title:qt,img:Yt,imgAlt:r.image||"",url:n.url||window.location.href.split("#")[0],opts:Jt.sel.filter(function(de){return de.value}),price:Ht,compareAt:ce,qty:Jt.q,bundleKey:"",bundleId:"",bundleTitle:"",bundleImg:""}),F+=Ht*Jt.q,V+=Jt.q,wt&&tt.push(wt.id)}),Pt("AddToCart"',
    replace: '(function(Ln,f){f=Math.min(f,Ln.qty);Ln.qty>f&&dt.add(Object.assign({},Ln,{qty:Ln.qty-f}));f>0&&LZ.push(Object.assign({},Ln,{qty:f,luFree:!0}))})'
      + '({productId:r.productId||r.handle||"",variantId:wt?wt.id:"",title:qt,img:Yt,imgAlt:r.image||"",url:n.url||window.location.href.split("#")[0],opts:Jt.sel.filter(function(de){return de.value}),price:Ht,compareAt:ce,qty:Jt.q,bundleKey:"",bundleId:"",bundleTitle:"",bundleImg:""},LF[Mi]||0),'
      + 'F+=Ht*Jt.q,V+=Jt.q,wt&&tt.push(wt.id)}),LZ.forEach(function(Ln){dt.add(Ln)}),Pt("AddToCart"',
  },
];

let applied = 0;
for (const e of EDITS) {
  const f = path.join(THEME, e.file);
  let s = fs.readFileSync(f, 'utf8');
  if (s.includes(e.done)) { console.log('already  ' + e.file + '  ' + e.done.slice(0, 60)); continue; }
  // upgrade = an older output of this edit is in the file (its `done` changed): replace the span from..to (inclusive;
  // `to` = the first one after `from`, a list = the first ending found; no `to` = `from` alone) with `text`. A fresh build has no `from` and uses find.
  const u = e.upgrade, ua = u ? s.indexOf(u.from) : -1;
  if (ua > -1) {
    if (s.indexOf(u.from, ua + 1) > -1) { console.error('UPGRADE start not unique in ' + e.file + ': ' + u.from.slice(0, 80)); process.exit(1); }
    const tos = u.to ? [].concat(u.to) : [];
    const end = tos.map((x) => [s.indexOf(x, ua), x]).find(([k]) => k > -1);
    if (tos.length && !end) { console.error('UPGRADE end missing in ' + e.file + ': ' + tos.join(' | ').slice(0, 80)); process.exit(1); }
    s = s.slice(0, ua) + u.text + s.slice(end ? end[0] + end[1].length : ua + u.from.length);
    if (!s.includes(e.done)) { console.error('DONE marker not produced (upgrade) in ' + e.file + ': ' + e.done); process.exit(1); }
    fs.writeFileSync(f, s);
    applied++;
    console.log('upgraded ' + e.file + '  ' + e.done.slice(0, 60));
    continue;
  }
  const n = s.split(e.find).length - 1;
  if (n !== 1) { console.error('ANCHOR ' + (n ? 'not unique (' + n + ')' : 'missing') + ' in ' + e.file + ': ' + e.find.slice(0, 80)); process.exit(1); }
  s = s.replace(e.find, () => e.replace);
  if (!s.includes(e.done)) { console.error('DONE marker not produced in ' + e.file + ': ' + e.done); process.exit(1); }
  fs.writeFileSync(f, s);
  applied++;
  console.log('applied  ' + e.file + '  ' + e.done.slice(0, 60));
}
console.log(applied + ' edit(s) applied');
