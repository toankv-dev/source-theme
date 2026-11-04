/*
 * Base theme — platform core (window.Base).
 *
 * Everything here is the contract with the Adlux platform and must behave the same in every theme:
 *   - cart in localStorage "sf-cart:<domain>" (+ legacy "sf-cart" mirror) — the platform /checkout reads it;
 *   - live automatic discounts priced with the checkout's own formula (discount-engine.ts), corrected by
 *     the server quote POST /api/storefront/cart/price;
 *   - pixel events through window.__adluxTrack (ViewContent, AddToCart, InitiateCheckout, Lead, Search);
 *   - variant matching on #sf-variants-data and the ?variant= URL sync;
 *   - storefront APIs: reviews (GET/POST), contact, order tracking links.
 * A child theme never edits this file; its interface code lives in ui.js and talks to window.Base.
 */
(function () {
  'use strict';

  // ---------------------------------------------------------------------------------------------
  // Basics
  // ---------------------------------------------------------------------------------------------
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function readJson(el, fallback) {
    try { return el ? JSON.parse(el.textContent || '') : fallback; } catch (e) { return fallback; }
  }

  var cfg = readJson($('#sf-config') || $('#sf-chrome-config'), {}) || {};
  var variantsData = readJson($('#sf-variants-data'), []) || [];
  var isLocal = /localhost|127\.0\.0\.1/.test(location.hostname);
  var domain = cfg.domain || location.hostname;
  var CART_KEY = 'sf-cart:' + domain;
  var LEGACY_CART_KEY = 'sf-cart';
  var OFFERS_KEY = 'sf-offers:' + domain;

  function https(url) {
    return url && location.protocol === 'https:' ? String(url).replace(/^http:/, 'https:') : url;
  }
  // Storefront API origin = the origin of config.checkoutUrl (the API host), else this site.
  var apiBase = https(String(cfg.checkoutUrl || '').replace(/\/api\/storefront\/checkout.*$/, ''));

  /** "$1,234.50" → 1234.5 */
  function num(value) {
    var n = parseFloat(String(value == null ? '' : value).replace(/[^0-9.]/g, ''));
    return isNaN(n) ? 0 : n;
  }

  function round2(n) { return Number((Number(n) || 0).toFixed(2)); }

  function money(value) {
    var n = Number(value) || 0;
    var currency = cfg.currency || 'USD';
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency, currencyDisplay: 'narrowSymbol' }).format(n);
    } catch (e) {
      try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(n); } catch (e2) { return '$' + n.toFixed(2); }
    }
  }

  function emit(name, detail) {
    try { document.dispatchEvent(new CustomEvent(name, { detail: detail })); } catch (e) { /* old browsers */ }
  }

  /** Adds ?domain=<store> to a same-site link on localhost (the preview needs it to know the store). */
  function localize(href) {
    if (!isLocal || !cfg.domain || !href || /[?&]domain=/.test(href) || /^https?:/.test(href)) return href;
    return href + (href.indexOf('?') > -1 ? '&' : '?') + 'domain=' + encodeURIComponent(cfg.domain);
  }

  function postJson(path, body) {
    return fetch(apiBase + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body)
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) { return { ok: res.ok, status: res.status, data: data }; });
    });
  }

  // ---------------------------------------------------------------------------------------------
  // Tracking — the platform injects window.__adluxTrack (pixel + server-side CAPI with one event_id);
  // firing the events is the theme's job. Payloads match the other Adlux themes exactly.
  // ---------------------------------------------------------------------------------------------
  function track(event, payload, userData) {
    var tries = 0;
    (function fire() {
      if (window.__adluxTrack) {
        try { window.__adluxTrack(event, payload, userData); } catch (e) { /* never break the page */ }
        return;
      }
      if (tries++ < 20) setTimeout(fire, 150);
    })();
  }

  function contentIds(lines) {
    var ids = [];
    lines.forEach(function (l) {
      var id = l.handle || cfg.handle;
      if (id && ids.indexOf(id) < 0) ids.push(id);
    });
    return ids;
  }

  // ---------------------------------------------------------------------------------------------
  // Discounts — same formula and per-item rounding as the backend discount-engine.ts, and the same
  // choice as the checkout: every automatic discount is computed on its own and the LARGEST wins.
  // Gift lines never count. lines: [{ pid, vid?, price, qty, gift? }] → { total, per: [per-line] }.
  // ---------------------------------------------------------------------------------------------
  function parseTiers(s) {
    if (Array.isArray(s)) return s;
    var out = [];
    String(s || '').split(',').forEach(function (part) {
      var kv = part.trim().split(':');
      var qty = parseInt(kv[0], 10) || 0;
      var percent = parseFloat(kv[1]) || 0;
      if (qty > 0 && percent > 0) out.push({ qty: qty, percent: percent });
    });
    return out.sort(function (a, b) { return a.qty - b.qty; });
  }

  function parseOffers(s) {
    try {
      var a = typeof s === 'string' ? JSON.parse(s || '[]') : s;
      return Array.isArray(a) ? a : [];
    } catch (e) { return []; }
  }

  function zeros(lines) { return lines.map(function () { return 0; }); }

  function tieredDiscount(lines, tiers) {
    if (!tiers.length) return null;
    var units = [];
    lines.forEach(function (l, i) { if (!l.gift) for (var k = 0; k < l.qty; k++) units.push({ i: i, p: l.price }); });
    if (!units.length) return null;
    units.sort(function (a, b) { return b.p - a.p; });
    var per = zeros(lines), total = 0;
    units.forEach(function (u, idx) {
      var pc = 0;
      tiers.forEach(function (t) { if (idx + 1 >= t.qty) pc = t.percent; });
      if (pc <= 0) return;
      var amount = round2(u.p * (pc / 100));
      per[u.i] += amount;
      total += amount;
    });
    return total > 0 ? { total: round2(total), per: per } : null;
  }

  function bxgyDiscount(lines, o) {
    var buyQty = parseInt(o.buy, 10) || 1, getQty = parseInt(o.get, 10) || 1;
    var x = o.x || [], y = o.y || [], value = Number(o.value) || 0, bought = 0;
    lines.forEach(function (l) { if (!l.gift && (o.all || x.indexOf(l.pid) > -1)) bought += l.qty; });
    if (bought < buyQty) return null;
    var max = Math.floor(bought / buyQty) * getQty, units = [];
    lines.forEach(function (l, i) { if (!l.gift && y.indexOf(l.pid) > -1) for (var k = 0; k < l.qty; k++) units.push({ i: i, p: l.price }); });
    if (!units.length) return null;
    units.sort(function (a, b) { return a.p - b.p; });
    var per = zeros(lines), total = 0;
    units.slice(0, max).forEach(function (u) {
      var a = o.type === 'FREE' ? u.p : o.type === 'PERCENTAGE' ? u.p * (value / 100) : o.type === 'FIXED_AMOUNT' ? Math.min(u.p, value) : 0;
      a = round2(a);
      per[u.i] += a;
      total += a;
    });
    return { total: round2(total), per: per };
  }

  // AMOUNT_OFF_PRODUCTS: % (or a fixed amount) off each unit of products x once the minimum quantity /
  // subtotal of those products is met. The checkout rounds per variant line, so units of one variant
  // are grouped (unknown variant → grouped by price).
  function amountOffDiscount(lines, o) {
    var value = Number(o.value) || 0, x = o.x || [], eligible = [], qty = 0, sub = 0;
    lines.forEach(function (l, i) {
      if (!l.gift && (o.all || x.indexOf(l.pid) > -1)) { eligible.push(i); qty += l.qty; sub += l.price * l.qty; }
    });
    if (!eligible.length || value <= 0) return null;
    if ((Number(o.minQty) || 0) > 0 && qty < Number(o.minQty)) return null;
    if ((Number(o.minSubtotal) || 0) > 0 && sub < Number(o.minSubtotal)) return null;
    var groups = {}, keys = [], per = zeros(lines), total = 0;
    eligible.forEach(function (i) {
      var l = lines[i], key = l.pid + '|' + (l.vid || '$' + l.price);
      if (!groups[key]) { groups[key] = { p: l.price, q: 0, ix: [] }; keys.push(key); }
      groups[key].q += l.qty;
      groups[key].ix.push(i);
    });
    keys.forEach(function (key) {
      var g = groups[key];
      var a = round2(o.type === 'FIXED_AMOUNT' ? Math.min(g.p, value) * g.q : g.p * (value / 100) * g.q), left = a;
      total += a;
      g.ix.forEach(function (i, n) {
        var share = n === g.ix.length - 1 ? round2(left) : round2(a * lines[i].qty / g.q);
        per[i] += share;
        left -= share;
      });
    });
    return total > 0 ? { total: round2(total), per: per } : null;
  }

  // Offers printed on this page (#b-offers); product pages cache them so the cart on other pages
  // (home, collection) prices with the same discounts.
  var offers = readJson($('#b-offers'), null);
  (function cacheOffers() {
    try {
      var hasAny = offers && (parseTiers(offers.tiers).length || parseOffers(offers.bxgy).length || parseOffers(offers.amountOff).length);
      if (hasAny) localStorage.setItem(OFFERS_KEY, JSON.stringify(offers));
      else offers = JSON.parse(localStorage.getItem(OFFERS_KEY) || 'null') || offers || {};
    } catch (e) { offers = offers || {}; }
  })();

  function bestDiscount(lines) {
    var best = { total: 0, per: zeros(lines) };
    var t = tieredDiscount(lines, parseTiers(offers.tiers));
    if (t && t.total > best.total) best = t;
    parseOffers(offers.bxgy).forEach(function (o) { var d = bxgyDiscount(lines, o); if (d && d.total > best.total) best = d; });
    parseOffers(offers.amountOff).forEach(function (o) { var d = amountOffDiscount(lines, o); if (d && d.total > best.total) best = d; });
    return best;
  }

  /** Price of `qty` units of one variant of this product after the live discounts. */
  function packPrice(unitPrice, qty, variantId) {
    var gross = round2(unitPrice * qty);
    if (qty < 2) return { total: gross, discount: 0 };
    var d = bestDiscount([{ pid: cfg.productId, vid: variantId, price: unitPrice, qty: qty }]).total;
    return { total: round2(gross - d), discount: d };
  }

  // ---------------------------------------------------------------------------------------------
  // Cart — envelope { v:1, handle, domain, items:[line] }. A line carries at least what the checkout
  // reads: title, variant, price, qty, image, variantId, comparePrice.
  // ---------------------------------------------------------------------------------------------
  function normalizeCart(raw) {
    if (Array.isArray(raw)) raw = { items: raw };
    if (raw && raw._tk && Array.isArray(raw._tk.items)) raw = raw._tk;
    if (!raw || !Array.isArray(raw.items)) return null;
    return { v: 1, handle: raw.handle || cfg.handle || '', domain: domain, items: raw.items.filter(Boolean) };
  }

  function getCart() {
    try {
      var c = normalizeCart(JSON.parse(localStorage.getItem(CART_KEY) || 'null')) ||
        normalizeCart(JSON.parse(localStorage.getItem(LEGACY_CART_KEY) || 'null'));
      if (c) return c;
    } catch (e) { /* corrupt storage */ }
    return { v: 1, handle: cfg.handle || '', domain: domain, items: [] };
  }

  function saveCart(cart, silent) {
    var c = normalizeCart(cart) || { v: 1, handle: '', domain: domain, items: [] };
    try {
      var s = JSON.stringify(c);
      localStorage.setItem(CART_KEY, s);
      localStorage.setItem(LEGACY_CART_KEY, s);
    } catch (e) { /* private mode */ }
    if (!silent) emit('b:cart-change', c);
    return c;
  }

  function sameLine(a, b) {
    if (a.gift || b.gift || a.upsell || b.upsell) return false;
    if ((a.bundleKey || '') !== (b.bundleKey || '')) return false;
    if (a.variantId && b.variantId) return a.variantId === b.variantId;
    return a.title === b.title && (a.variant || '') === (b.variant || '');
  }

  /**
   * Adds lines and fires AddToCart. opts.mode "checkout" goes straight to checkout; otherwise
   * "b:cart-added" lets the interface open the drawer (unless Theme settings say not to).
   */
  function addToCart(lines, opts) {
    opts = opts || {};
    lines = [].concat(lines).filter(function (l) { return l && l.qty > 0; });
    if (!lines.length) return getCart();
    var cart = getCart();
    if (!cart.items.length) cart.handle = cfg.handle || cart.handle;
    lines.forEach(function (line) {
      var l = Object.assign({ title: cfg.title || '', handle: cfg.handle || '', productId: cfg.productId || '', url: location.pathname, image: cfg.image || '' }, line);
      l.qty = Math.min(999, Math.max(1, parseInt(l.qty, 10) || 1));
      var existing = cart.items.filter(function (x) { return sameLine(x, l); })[0];
      if (existing) existing.qty = Math.min(999, existing.qty + l.qty);
      else cart.items.push(l);
    });
    saveCart(cart);
    var qty = lines.reduce(function (s, l) { return s + l.qty; }, 0);
    var value = lines.reduce(function (s, l) { return s + num(l.price) * l.qty; }, 0);
    track('AddToCart', {
      currency: cfg.currency || 'USD',
      value: round2(opts.value != null ? opts.value : value),
      content_ids: contentIds(lines),
      content_type: 'product',
      content_name: lines[0].title || cfg.title || '',
      num_items: qty,
      variant_id: lines[0].variantId || undefined
    });
    if (opts.mode === 'checkout') { goCheckout(); return cart; }
    emit('b:cart-added', { lines: lines });
    return cart;
  }

  function setLineQty(index, qty) {
    var cart = getCart();
    if (!cart.items[index]) return cart;
    if (qty <= 0) cart.items.splice(index, 1);
    else cart.items[index].qty = Math.min(999, qty);
    return saveCart(cart);
  }

  function removeLine(index) { return setLineQty(index, 0); }

  /** Local estimate: { subtotal, discount, total, per } — the server quote then corrects it. */
  function cartTotals(cart) {
    var lines = (cart || getCart()).items.filter(function (l) { return !l.gift; });
    var subtotal = round2(lines.reduce(function (s, l) { return s + num(l.price) * l.qty; }, 0));
    var d = bestDiscount(lines.map(function (l) {
      return { pid: l.productId || (l.handle && l.handle === cfg.handle ? cfg.productId : l.handle), vid: l.variantId, price: num(l.price), qty: l.qty };
    }));
    var discount = Math.min(d.total, subtotal);
    return { subtotal: subtotal, discount: discount, total: round2(subtotal - discount), title: null };
  }

  /** Server quote (the numbers the checkout charges). Updates stored unit prices if they drifted. */
  var quoteSeq = 0;
  function quoteCart(cart) {
    cart = cart || getCart();
    var seq = ++quoteSeq;
    var items = cart.items.filter(function (l) { return !l.gift; }).map(function (l) {
      return { variantId: l.variantId || undefined, variant: l.variant || undefined, qty: l.qty, handle: l.handle || undefined, title: l.title || undefined };
    });
    if (!items.length) return Promise.resolve(null);
    return postJson('/api/storefront/cart/price', { domain: cfg.domain, handle: cart.handle || cfg.handle || undefined, protection: false, items: items })
      .then(function (r) {
        if (seq !== quoteSeq || !r.ok || !r.data || !r.data.data) return null;
        var q = r.data.data, current = getCart(), changed = false;
        current.items.forEach(function (l) {
          var match = (q.lines || []).filter(function (x) { return !x.isGift && x.variantId && x.variantId === l.variantId; })[0];
          if (match && Math.abs(num(l.price) - Number(match.unitPrice)) > 0.004) { l.price = Number(match.unitPrice); changed = true; }
        });
        if (changed) saveCart(current, true);
        return {
          subtotal: Number(q.subtotal) || 0,
          discount: Number(q.discount) || 0,
          total: round2((Number(q.subtotal) || 0) - (Number(q.discount) || 0)),
          title: q.appliedDiscount && q.appliedDiscount.title,
          lines: q.lines || []
        };
      })
      .catch(function () { return null; });
  }

  function checkoutUrl() {
    return https(cfg.checkoutPageUrl) || '/checkout' + (isLocal && cfg.domain ? '?domain=' + encodeURIComponent(cfg.domain) : '');
  }

  function goCheckout() {
    var cart = getCart();
    var lines = cart.items.filter(function (l) { return !l.gift; });
    if (!lines.length) return;
    saveCart(cart, true);
    track('InitiateCheckout', {
      currency: cfg.currency || 'USD',
      value: cartTotals(cart).total,
      content_ids: contentIds(lines),
      content_type: 'product',
      num_items: lines.reduce(function (s, l) { return s + l.qty; }, 0)
    });
    // Give the pixel a moment to leave before the page changes.
    setTimeout(function () { location.href = checkoutUrl(); }, 120);
  }

  // Cart changed in another tab.
  window.addEventListener('storage', function (e) {
    if (e.key === CART_KEY) emit('b:cart-change', getCart());
  });

  // ---------------------------------------------------------------------------------------------
  // Variants — #sf-variants-data = product.variants_list [{ id, title, option_values[], price,
  // compare_at_price, featured_image, available }]. Matching ignores case and option order.
  // ---------------------------------------------------------------------------------------------
  function norm(v) { return String(v == null ? '' : v).trim().toLowerCase(); }

  function variantRecord(v) {
    if (!v) return null;
    var cv = (cfg.variants || []).filter(function (x) { return x.id === v.id; })[0] || {};
    return {
      id: v.id,
      title: v.title || v.display_name || (v.option_values || v.options || []).join(' / '),
      options: v.option_values || v.options || cv.options || [],
      price: v.price != null ? num(v.price) : num(cv.price),
      compare: num(v.compare_at_price),
      image: v.featured_image || '',
      available: v.available !== false
    };
  }

  function allVariants() {
    if (variantsData.length) return variantsData;
    return (cfg.variants || []).map(function (v) { return { id: v.id, option_values: v.options, price: v.price, title: v.display_name }; });
  }

  function findVariant(values) {
    var list = allVariants();
    var want = (values || []).map(norm);
    var exact = list.filter(function (v) {
      var o = (v.option_values || []).map(norm);
      return o.length === want.length && o.every(function (x, i) { return x === want[i]; });
    })[0];
    if (exact) return variantRecord(exact);
    var key = want.slice().sort().join('|');
    var loose = list.filter(function (v) { return (v.option_values || []).map(norm).sort().join('|') === key; })[0];
    if (loose) return variantRecord(loose);
    return list.length === 1 ? variantRecord(list[0]) : null;
  }

  function variantById(id) {
    return variantRecord(allVariants().filter(function (v) { return v.id === id; })[0]);
  }

  function variantFromUrl() {
    var id = new URLSearchParams(location.search).get('variant');
    return id ? variantById(id) : null;
  }

  function setVariantInUrl(id) {
    try {
      var url = new URL(location.href);
      if (id) url.searchParams.set('variant', id); else url.searchParams.delete('variant');
      history.replaceState(history.state, '', url.toString());
    } catch (e) { /* file:// */ }
  }

  // ---------------------------------------------------------------------------------------------
  // Storefront APIs
  // ---------------------------------------------------------------------------------------------
  function reviewsUrl() { return https(cfg.reviewsUrl) || apiBase + '/api/storefront/reviews'; }

  /** GET reviews → { reviews:[{name,rating,title,content,image,verified,date}], has_more, distribution } */
  function fetchReviews(productId, offset, limit) {
    var url = reviewsUrl() + '?productId=' + encodeURIComponent(productId || cfg.productId || '') +
      '&domain=' + encodeURIComponent(cfg.domain || '') + '&offset=' + (offset || 0) + '&limit=' + (limit || 10);
    return fetch(url, { credentials: 'include' }).then(function (r) { return r.json(); }).then(function (d) {
      (d && d.reviews || []).forEach(function (rv) {
        if (rv.content == null && rv.body != null) rv.content = rv.body;
        if (!rv.image && rv.photo) rv.image = rv.photo;
      });
      return d;
    });
  }

  /** POST a shopper review (multipart: domain, productId, rating, name, email, title, body, recommend, photo). */
  function postReview(formData) {
    formData.set('domain', cfg.domain || '');
    if (!formData.get('productId')) formData.set('productId', cfg.productId || '');
    var headers = {};
    var csrf = $('meta[name="csrf-token"]');
    if (csrf) headers['X-CSRF-TOKEN'] = csrf.getAttribute('content');
    return fetch(reviewsUrl(), { method: 'POST', body: formData, headers: headers, credentials: 'include' })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok && d.success !== false, status: r.status, data: d }; }); });
  }

  /** POST /api/storefront/contact → { ok, data }. Fires Lead on success. */
  function sendContact(fields) {
    var message = String(fields.message || '').trim();
    if (fields.phone) message += '\n\nPhone: ' + fields.phone;
    return postJson('/api/storefront/contact', {
      domain: cfg.domain,
      name: fields.name || undefined,
      email: fields.email,
      message: message,
      subject: fields.subject || 'Contact form',
      orderNumber: fields.orderNumber || undefined
    }).then(function (r) {
      if (r.ok) lead('Contact form', fields.email);
      return r;
    });
  }

  function lead(name, email) {
    track('Lead', { content_name: name, content_category: name === 'Newsletter' ? 'newsletter' : 'contact', currency: cfg.currency || 'USD', value: 0 }, email ? { email: email } : undefined);
  }

  function search(query) {
    if (query) track('Search', { search_string: query, content_type: 'product' });
  }

  /** Link to the platform's order lookup result page. */
  function trackingResultUrl(q) {
    var qs = q.trackingNumber ? 'trackingNumber=' + encodeURIComponent(q.trackingNumber)
      : 'order=' + encodeURIComponent(q.order || '') + '&email=' + encodeURIComponent(q.email || '');
    if (cfg.domain) qs += '&domain=' + encodeURIComponent(cfg.domain);
    return '/pages/tracking/result?' + qs;
  }

  // ---------------------------------------------------------------------------------------------
  // ViewContent — product pages only (#sf-variants-data is printed by sections/product-scripts.hbs).
  // ---------------------------------------------------------------------------------------------
  if ($('#sf-variants-data') && (cfg.productId || cfg.handle)) {
    track('ViewContent', {
      currency: cfg.currency || 'USD',
      value: cfg.priceNum || 0,
      content_ids: cfg.handle ? [cfg.handle] : [],
      content_type: 'product',
      content_name: cfg.title || ''
    });
  }

  window.Base = {
    cfg: cfg,
    isLocal: isLocal,
    $: $,
    $$: $$,
    readJson: readJson,
    num: num,
    round2: round2,
    money: money,
    localize: localize,
    postJson: postJson,
    track: track,
    lead: lead,
    search: search,
    discount: { best: bestDiscount, pack: packPrice, tiers: parseTiers, offers: parseOffers },
    cart: {
      key: CART_KEY,
      get: getCart,
      save: saveCart,
      add: addToCart,
      setQty: setLineQty,
      remove: removeLine,
      totals: cartTotals,
      quote: quoteCart,
      checkoutUrl: checkoutUrl,
      checkout: goCheckout
    },
    variants: {
      list: allVariants,
      find: findVariant,
      byId: variantById,
      fromUrl: variantFromUrl,
      setUrl: setVariantInUrl
    },
    reviews: { list: fetchReviews, post: postReview },
    contact: sendContact,
    trackingResultUrl: trackingResultUrl
  };
  emit('b:ready', window.Base);
})();
