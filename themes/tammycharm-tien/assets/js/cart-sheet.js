/* Cart drawer: colour / size / quantity sheet (as lunara---vesnacharm 2026.11.25.4-.5, Shopee's variant sheet).
   Loaded before ui.js (snippets/scripts.hbs). ui.js zt() draws a line's colour + size as BCartSheet.box(line, index):
   one small box "White, M ▾" left of the quantity. A tap opens a bottom sheet over the drawer: picture + price of the
   chosen variant, a button per value (colour ones with that colour's picture), quantity, Confirm.
   Confirm: same variant → the line's quantity; another variant → n units of the line take it (n = all → the whole
   line changes; n < qty → those units split off right below, the rest stay); a line of that variant already there →
   merged into it. Sold-out choice → Confirm disabled ("Sold out"). X / backdrop / Esc / the drawer closing shut it.
   Variants: this page's #sf-variants-data + #sf-options-data (product-scripts.hbs) when the line is the product shown,
   else the line's page (line.url) fetched once (sessionStorage "b-pv:<productId>"). No data → the box is plain text. */
(function () {
  "use strict";
  var C = {}, st = null, el = null;
  var isC = function (n) { return /colou?r|m[àa]u|shade/i.test(n || ""); };
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function num(v) { var n = window.Base && Base.num ? Base.num(v) : parseFloat(v); return isFinite(n) ? Number(n) : 0; }
  function money(n) { return window.Base && Base.money ? Base.money(n) : "$" + Number(n).toFixed(2); }
  function $(s, r) { return (r || document).querySelector(s); }
  function drawer() { return $("[data-cart-drawer]"); }
  function cut(h, a) { var s = h.indexOf(a); if (s < 0) return ""; s += a.length; var e = h.indexOf("</script>", s); return e < 0 ? "" : h.slice(s, e); }

  // variants + option names of a product: {names, disp: [{value: {t: shown text, img: swatch}}], v: [{id, vals, price, compare, img, ok}]}
  function build(vt, ot) {
    try {
      var v = JSON.parse(vt || "[]"), o = JSON.parse(ot || "[]") || [];
      if (!Array.isArray(v) || !v.length) return false;
      var len = (v[0].option_values || []).length;
      if (!len) return false;
      var vs = v.map(function (x) { return { id: String(x.id), vals: (x.option_values || []).map(String), price: num(x.price), compare: num(x.compare_at_price), img: x.featured_image || "", ok: x.available !== false }; });
      var names = [], disp = [];
      for (var j = 0; j < len; j++) {
        var g = o[j] || {}, dm = {};
        (g.options || []).forEach(function (x) { if (x && x.label != null) dm[String(x.label)] = { t: x.custom_name || "", img: x.image || "" }; });
        names.push(g.name || ""); disp.push(dm);
      }
      if (names.indexOf("") > -1) {
        // no names: the option whose values change the picture = Color, the others Size / Option n
        var best = -1, bn = 1;
        for (j = 0; j < len; j++) {
          var im = {};
          vs.forEach(function (x) { x.img && (im[x.vals[j]] = im[x.vals[j]] || x.img); });
          var dist = {}; Object.keys(im).forEach(function (k) { dist[im[k]] = 1; });
          var c = Object.keys(dist).length;
          if (c > bn) { bn = c; best = j; }
        }
        names = names.map(function (n, k) { return n || (k === best ? "Color" : len - (best > -1 ? 1 : 0) === 1 ? "Size" : "Option " + (k + 1)); });
      }
      return { names: names, disp: disp, v: vs };
    } catch (e) { return false; }
  }

  function pv(line) {
    var k = String(line.productId || line.handle || "");
    if (!k) return Promise.resolve(false);
    if (C[k] && C[k].then) return C[k];
    if (k in C) return Promise.resolve(C[k]);
    var cfg = (window.Base && Base.cfg) || {}, hv = document.getElementById("sf-variants-data"), ho = document.getElementById("sf-options-data");
    if (hv && ((line.productId && String(cfg.productId || "") === String(line.productId)) || (line.handle && cfg.handle === line.handle))) {
      return Promise.resolve(C[k] = build(hv.textContent, ho ? ho.textContent : "[]"));
    }
    try { var ss = sessionStorage.getItem("b-pv:" + k); if (ss) return Promise.resolve(C[k] = JSON.parse(ss)); } catch (e) {}
    if (!line.url || typeof fetch != "function") return Promise.resolve(C[k] = false);
    return C[k] = fetch(line.url, { credentials: "same-origin" }).then(function (r) { return r.ok ? r.text() : ""; }).then(function (h) {
      var q = h ? build(cut(h, 'id="sf-variants-data">'), cut(h, 'id="sf-options-data">')) : false;
      C[k] = q;
      try { q && sessionStorage.setItem("b-pv:" + k, JSON.stringify(q)); } catch (e) {}
      return q;
    }).catch(function () { return C[k] = false; });
  }

  // the box ui.js puts on a line (index = its place in cart.items)
  function box(line, i) {
    var t = String(line.variant || "").split(" / ").join(", "), b = document.createElement("button");
    b.type = "button"; b.className = "b-vchg"; b.setAttribute("data-b-vchg", String(i));
    b.setAttribute("aria-haspopup", "dialog"); b.setAttribute("aria-label", "Change colour, size or quantity: " + t);
    b.innerHTML = '<span class="b-vchg__t">' + esc(t) + '</span><svg viewBox="0 0 10 6" width="10" height="6" aria-hidden="true"><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
    return b;
  }

  function match(s) { return s.pv.v.filter(function (v) { return v.vals.every(function (x, k) { return x === s.sel[k]; }); })[0] || null; }
  function shown(s, j, x) { var d = s.pv.disp[j] && s.pv.disp[j][x]; return d && d.t ? d.t : x; }

  // built once per opening; a pick / quantity only updates it in place (upd): no picture reloads, focus stays
  function draw() {
    var s = st, p = s.pv, h = '<div class="b-sh__top"><img class="b-sh__img" data-b-sh-img alt="" hidden><span class="b-sh__img" data-b-sh-noimg></span><div class="b-sh__pr">'
      + '<b data-b-sh-amt></b> <s data-b-sh-was hidden></s><p class="b-sh__cur" data-b-sh-cur></p></div></div><div class="b-sh__body">';
    s.ord.forEach(function (j) {
      var seen = {}, vals = [], c = isC(p.names[j]);
      p.v.forEach(function (v) { var x = v.vals[j]; x != null && !seen[x] && (seen[x] = 1, vals.push(x)); });
      h += '<div class="b-sh__opt"><p class="b-sh__lbl">' + esc(p.names[j]) + '</p><div class="b-sh__vals">' + vals.map(function (x) {
        var th = c ? ((p.v.filter(function (v) { return v.vals[j] === x && v.img; })[0] || {}).img || (p.disp[j][x] || {}).img || "") : "";
        return '<button type="button" class="b-sh__v" data-b-sh-v="' + esc(x) + '" data-j="' + j + '" aria-pressed="false">'
          + (th ? '<img src="' + esc(th) + '" alt="" width="28" height="28" loading="lazy">' : "") + "<span>" + esc(shown(s, j, x)) + "</span></button>";
      }).join("") + "</div></div>";
    });
    h += '<div class="b-sh__opt b-sh__qty"><p class="b-sh__lbl">Quantity</p><div class="b-sh__step"><button type="button" data-b-sh-q="-1" aria-label="Decrease quantity">'
      + '<svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M1 6h10" stroke="currentColor" stroke-width="1.6"/></svg></button><span aria-live="polite" data-b-sh-n></span>'
      + '<button type="button" data-b-sh-q="1" aria-label="Increase quantity"><svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M1 6h10M6 1v10" stroke="currentColor" stroke-width="1.6"/></svg></button></div></div>';
    $("[data-b-sh-in]", el).innerHTML = h + "</div>";
    upd();
  }

  function upd() {
    var s = st; if (!s) return;
    var m = match(s) || {}, im = m.img || s.img || "", g = $("[data-b-sh-img]", el), pr = m.price || s.price, w = $("[data-b-sh-was]", el), ok = $("[data-b-sh-ok]", el);
    g.hidden = !im; $("[data-b-sh-noimg]", el).hidden = !!im; im && g.getAttribute("src") !== im && g.setAttribute("src", im);
    $("[data-b-sh-amt]", el).textContent = money(pr);
    w.hidden = !(m.compare > pr); w.textContent = m.compare > pr ? money(m.compare) : "";
    $("[data-b-sh-cur]", el).textContent = s.ord.map(function (j) { return shown(s, j, s.sel[j]); }).join(", ");
    [].forEach.call(el.querySelectorAll("[data-b-sh-v]"), function (b) {
      var j = +b.getAttribute("data-j"), x = b.getAttribute("data-b-sh-v"), on = x === s.sel[j],
        av = s.pv.v.some(function (v) { return v.ok && v.vals.every(function (y, k) { return y === (k === j ? x : s.sel[k]); }); });
      b.classList.toggle("is-on", on); b.classList.toggle("is-out", !av); b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    $("[data-b-sh-n]", el).textContent = s.n;
    $('[data-b-sh-q="-1"]', el).disabled = s.n <= 1; $('[data-b-sh-q="1"]', el).disabled = s.n >= 999;
    ok.disabled = !(m.id && m.ok); ok.textContent = m.id && !m.ok ? "Sold out" : "Confirm";
  }

  function close() {
    var s = st; if (!el || !s) return;
    st = null; el.classList.remove("is-open");
    setTimeout(function () { st || (el.hidden = true); }, 260);
    var d = drawer();
    s.op && s.op.isConnected && d && d.classList.contains("is-open") && s.op.focus({ preventScroll: true });
  }

  // the line of the sheet, found again (the cart may have changed while it was open)
  function find(items, s) {
    var x = items[s.i];
    if (x && String(x.variantId) === s.vid && !x.gift && !x.upsell) return s.i;
    for (var j = 0; j < items.length; j++) if (String(items[j].variantId) === s.vid && !items[j].gift && !items[j].upsell) return j;
    return -1;
  }

  function apply(s, m, n) {
    var cart = Base.cart.get(), it = cart.items, W = find(it, s);
    if (W < 0 || !m) return -1;
    var D = it[W]; n = Math.max(1, Math.min(999, n | 0));
    if (m.id === String(D.variantId)) { n !== D.qty && (D.qty = n, Base.cart.save(cart)); return W; }
    var part = n < D.qty, N = D;
    part ? (N = Object.assign({}, D, { qty: n }), D.qty -= n) : (D.qty = n);
    N.variantId = m.id; N.variant = m.vals.join(" / ");
    m.price > 0 && (N.price = m.price);
    m.compare > m.price ? (N.comparePrice = m.compare) : delete N.comparePrice;
    m.img && (N.image = m.img);
    var at = part ? W + 1 : W;
    for (var j = 0; j < it.length; j++) {
      var x = it[j];
      if (x !== N && !x.gift && !x.upsell && (x.bundleKey || "") === (N.bundleKey || "") && String(x.variantId) === N.variantId) {
        x.qty = Math.min(999, x.qty + N.qty); part || it.splice(W, 1); N = null;
        at = part || j < W ? j : j - 1; break;
      }
    }
    part && N && it.splice(W + 1, 0, N);
    Base.cart.save(cart);
    return at;
  }

  // after Confirm the lines are drawn again (now, then once more when /cart/price answers): the changed line's box
  // gets the focus back each time, for 3 s
  var rf = { at: -1, until: 0, mo: null };
  function refocus(at) {
    var lines = $("#CartDrawer [data-cart-lines]");
    if (at < 0 || !lines) return;
    var go = function () { var b = Date.now() < rf.until && $('[data-b-vchg="' + rf.at + '"]', lines); b && document.activeElement !== b && b.focus({ preventScroll: true }); };
    rf.at = at; rf.until = Date.now() + 3000; go();
    rf.mo || !window.MutationObserver || (rf.mo = new MutationObserver(go)).observe(lines, { childList: true });
  }

  function make(panel) {
    el = document.createElement("div"); el.className = "b-sh"; el.hidden = true;
    el.innerHTML = '<div class="b-sh__bg" data-b-sh-x></div><div class="b-sh__p" role="dialog" aria-modal="true" aria-label="Choose colour, size and quantity" tabindex="-1">'
      + '<button type="button" class="b-sh__x" data-b-sh-x aria-label="Close"><svg viewBox="0 0 18 18" width="18" height="18" aria-hidden="true"><path d="M2 2l14 14M16 2L2 16" stroke="currentColor" stroke-width="1.5"/></svg></button>'
      + '<div class="b-sh__in" data-b-sh-in></div><div class="b-sh__ft"><button type="button" class="b-sh__ok" data-b-sh-ok>Confirm</button></div></div>';
    panel.appendChild(el);
    el.addEventListener("click", function (e) {
      var x = e.target.closest && e.target.closest("[data-b-sh-x],[data-b-sh-v],[data-b-sh-q],[data-b-sh-ok]"), s = st;
      if (!x || !s) return;
      e.preventDefault();
      if (x.hasAttribute("data-b-sh-x")) return close();
      if (x.hasAttribute("data-b-sh-ok")) {
        var m = match(s), n = s.n; close();
        refocus(apply(s, m, n));
        return;
      }
      if (x.hasAttribute("data-b-sh-q")) {
        s.n = Math.max(1, Math.min(999, s.n + +x.getAttribute("data-b-sh-q"))); upd();
        x.disabled && $(".b-sh__ok", el).focus({ preventScroll: true });
        return;
      }
      // a value picked: the variant with it and most of the other choices (available first) sets every choice
      var j = +x.getAttribute("data-j"), v = x.getAttribute("data-b-sh-v"), bm = null, bs = -1;
      s.pv.v.forEach(function (y) {
        if (y.vals[j] !== v) return;
        var sc = y.ok ? .5 : 0; y.vals.forEach(function (z, k) { z === s.sel[k] && sc++; });
        sc > bs && (bs = sc, bm = y);
      });
      bm ? (s.sel = bm.vals.slice()) : (s.sel[j] = v); upd();
    });
    // Esc closes the sheet only (ui.js closes the drawer on a document keydown); Tab stays inside
    el.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { e.stopPropagation(); e.preventDefault(); close(); return; }
      if (e.key === "Tab") {
        var f = [].filter.call(el.querySelectorAll("button:not([disabled])"), function (b) { return b.offsetParent !== null; }), a = f[0], z = f[f.length - 1];
        if (!a) return;
        e.shiftKey && document.activeElement === a ? (e.preventDefault(), z.focus({ preventScroll: true }))
          : !e.shiftKey && document.activeElement === z && (e.preventDefault(), a.focus({ preventScroll: true }));
        e.stopPropagation();
      }
    });
    var d = drawer();
    d && window.MutationObserver && new MutationObserver(function () { d.classList.contains("is-open") || close(); }).observe(d, { attributes: true, attributeFilter: ["class"] });
  }

  function open(i, btn) {
    var cart = window.Base && Base.cart.get(), D = cart && cart.items[i], d = drawer(), panel = d && $(".b-drawer__panel", d);
    if (!D || !panel || btn.getAttribute("aria-busy")) return;
    btn.setAttribute("aria-busy", "true");
    pv(D).then(function (p) {
      btn.removeAttribute("aria-busy");
      var me = p && p.v.filter(function (v) { return v.id === String(D.variantId); })[0];
      if (!me) { btn.classList.add("is-static"); btn.setAttribute("aria-disabled", "true"); return; }
      el || make(panel);
      var ord = p.names.map(function (n, j) { return j; }).sort(function (a, b) { return (isC(p.names[b]) ? 1 : 0) - (isC(p.names[a]) ? 1 : 0); });
      st = { i: i, vid: String(D.variantId), pv: p, ord: ord, sel: me.vals.slice(), n: D.qty, img: D.image || "", price: num(D.price), op: btn };
      draw(); el.hidden = false; el.offsetWidth; el.classList.add("is-open");
      $(".b-sh__x", el).focus({ preventScroll: true });
    });
  }

  // shipping protection description: one line ending "…"; a tap (or Enter) on a cut one shows it all
  function descs() {
    [].forEach.call(document.querySelectorAll("#CartDrawer .b-up__desc"), function (x) {
      if (x.classList.contains("is-open")) return;
      var more = x.scrollWidth > x.clientWidth + 1;
      x.classList.toggle("is-more", more);
      more ? (x.setAttribute("role", "button"), x.setAttribute("tabindex", "0"), x.setAttribute("aria-expanded", "false")) : (x.removeAttribute("role"), x.removeAttribute("tabindex"));
    });
  }

  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("#CartDrawer [data-b-vchg]");
    if (b) { e.preventDefault(); b.classList.contains("is-static") || open(+b.getAttribute("data-b-vchg"), b); return; }
    var x = e.target.closest && e.target.closest("#CartDrawer .b-up__desc.is-more");
    x && (x.classList.toggle("is-open"), x.setAttribute("aria-expanded", x.classList.contains("is-open") ? "true" : "false"));
  });
  document.addEventListener("keydown", function (e) {
    var x = (e.key === "Enter" || e.key === " ") && e.target.closest && e.target.closest("#CartDrawer .b-up__desc.is-more");
    x && (e.preventDefault(), x.click());
  });
  document.addEventListener("b:cart-change", function () { setTimeout(descs, 0); });
  document.addEventListener("DOMContentLoaded", function () {
    var d = drawer();
    d && window.MutationObserver && new MutationObserver(function () { d.classList.contains("is-open") && setTimeout(descs, 350); }).observe(d, { attributes: true, attributeFilter: ["class"] });
  });

  // Rows of the drawer, for ui.js zt(): [{i, qty, was, now, off, free, nobox}] in order (i = index in cart.items).
  // off[i] = the discount of line i (ui.js Bt: the theme's split, or the server's /cart/price discount spread by value).
  // When the offer is a Buy X Get Y ("Buy 2, Get 2 Free", "Buy 1, get 1 free": title from /cart/price) up to 2 units
  // show as "Free gift" at $0 (user 2026-11-25: "more than 2 items = always 2 free gifts", as lunara), taken from the
  // last lines, each only while the discount pays for it in full; the paid units share what is left of the discount
  // by value, so the lines still add up to the server's total. tammycharm's "Buy 2, Get 2 Free" is ~55 % off every
  // unit on the server (4 × 27.43), which never gave a whole free unit: that is why no line showed as a gift.
  // Other offers: a line is split into paid + free rows only when its discount is exactly whole units (the old rule).
  function rows(cart, showUp, off, title) {
    var it = cart.items, out = [], fr = {}, r2 = function (x) { return Math.round(x * 100) / 100; };
    shown_ = { sig: sig(it), free: fr };
    var bx = /free|get\s*\d|gift|bogo/i.test(title || ""), idx = [], units = 0, D = 0;
    it.forEach(function (n, i) { if (n.gift) return; D += off[i] || 0; if (!n.upsell) { idx.push(i); units += n.qty; } });
    D = r2(D);
    var free = {}, k = 0;
    if (bx && D > 0) {
      var left = D;
      for (var j = idx.length - 1; j >= 0 && k < 2; j--) {
        var n = it[idx[j]], pr = num(n.price);
        while (pr > 0 && k < 2 && units - k > 1 && (free[idx[j]] || 0) < n.qty && left + 0.011 >= pr) { free[idx[j]] = (free[idx[j]] || 0) + 1; k++; left = r2(left - pr); }
      }
      var pv = 0, last = -1;
      idx.forEach(function (i) { var q = it[i].qty - (free[i] || 0); q > 0 && (pv += num(it[i].price) * q, last = i); });
      var rest = left;
    }
    it.forEach(function (n, i) {
      if (n.upsell && !showUp) return;
      if (n.gift) { out.push({ i: i }); return; }
      var r = num(n.price), d = Math.max(num(n.comparePrice), r), s = off[i] || 0;
      if (bx && k > 0 && !n.upsell) {
        var fq = free[i] || 0, q = n.qty - fq;
        if (q > 0) {
          var sh = i === last ? rest : r2(left * r * q / (pv || 1));
          rest = r2(rest - sh);
          out.push({ i: i, qty: q, was: r2(d * q), now: r2(r * q - sh), off: sh });
        }
        fq > 0 && (fr[i] = fq, out.push({ i: i, free: true, qty: fq, was: r2(d * fq), now: 0, nobox: q > 0 }));
        return;
      }
      if (bx && k > 0) { out.push({ i: i, qty: n.qty, was: r2(d * n.qty), now: r2(r * n.qty), off: 0 }); return; }
      var f = r > 0 ? Math.round(s / r) : 0;
      if (!n.upsell && f >= 1 && f <= n.qty && Math.abs(s - f * r) < .011) {
        var l = n.qty - f;
        l > 0 && out.push({ i: i, qty: l, was: r2(d * l), now: r2(r * l), off: s });
        fr[i] = f; out.push({ i: i, free: true, qty: f, was: r2(d * f), now: 0, nobox: l > 0 });
      } else out.push({ i: i, qty: n.qty, was: r2(d * n.qty), now: r2(r * n.qty - s), off: s });
    });
    return out;
  }

  // The customer lowers line i to q units (− on its paid row: q = qty − 1; the bin on a paid row: q = 0). When what
  // they pay for falls from 2+ to exactly 1, the free units shown go with it (user 2026-11-25: "bundle 3 lowered to 1
  // must leave no gift"; the server's "Buy 1, get 1 free" would otherwise keep the last free unit). Free units = the
  // ones rows() drew last (shown_), only while the cart is still the one drawn; anything else = plain setQty.
  // Lowered to 0 paid (the last paid line binned) keeps the other units: they were picked by the customer.
  var shown_ = { sig: "", free: {} };
  function sig(it) { return it.map(function (x) { return x.variantId + ":" + x.qty + (x.gift ? "g" : "") + (x.upsell ? "u" : ""); }).join("|"); }
  function lower(i, q) {
    var cart = Base.cart.get(), it = cart.items, n = it[i], F = shown_.sig === sig(it) ? shown_.free : {};
    if (!n) return;
    q = Math.max(0, q | 0);
    var paid = 0, frees = 0;
    it.forEach(function (x, j) { x.gift || x.upsell || (paid += x.qty - (F[j] || 0), frees += F[j] || 0); });
    var mine = n.qty - (F[i] || 0), cut = Math.min(n.qty - q, mine);
    if (n.gift || n.upsell || !frees || paid < 2 || paid - cut !== 1) return Base.cart.setQty(i, q);
    it.forEach(function (x, j) { F[j] && (x.qty -= F[j]); });
    n.qty = mine - cut;
    cart.items = it.filter(function (x) { return x.gift || x.qty > 0; });
    Base.cart.save(cart);
  }

  window.BCartSheet = { box: box, open: open, variants: pv, rows: rows, lower: lower };
})();
