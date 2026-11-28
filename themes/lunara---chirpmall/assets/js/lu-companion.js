/*
 * "Complete the bundle" offers in the Kaching block (SHOPDY-127).
 *
 * The backend sends the live offers in #sf-config (config.companionBundles): per offer a `key`, and for the product
 * on this page (`main`) and the product sold with it (`companion`) the bundle price, the option names and the active
 * variants with their own prices. snippets/lu-companion-bar.hbs prints one Kaching-looking bar per offer.
 *
 * This file:
 *  - draws each bar's two rows (picture, name, one select per option, bundle price + struck price) and its totals:
 *    price = both bundle prices, struck = both variants' own prices (compare-at when higher), "Save $X" = the gap;
 *  - makes the bars and the Kaching packs one radio group (the Kaching script only knows its packs);
 *  - on Add to cart / Express checkout with a bar selected, adds the two chosen variants, each line carrying the offer
 *    `companionBundle` key and its `bundlePrice`, instead of the pack's units. The server prices the pair from the
 *    offer as it is then (it never trusts a client price); the cart drawer shows the same pairing (window.LuCB).
 *
 * Copied from _work/cb/ by _work/patch-cb.js — edit it there.
 */
(function () {
  'use strict';
  if (window.__luCbLoaded) return;
  window.__luCbLoaded = 1;

  function q(s, r) { return (r || document).querySelector(s); }
  function qa(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function num(v) { var n = parseFloat(v); return isFinite(n) ? n : 0; }
  function money(n) { return window.LuCur ? LuCur.f(n) : '$' + (Math.round((Number(n) || 0) * 100) / 100).toFixed(2); }
  /** A USD unit price as the shopper sees it (shopdy local currency, per unit as the checkout). */
  function LCU(x) { return window.LuCur ? LuCur.u(x) : x; }
  function cents(n) { return Math.round((Number(n) || 0) * 100); }
  function low(v) { return String(v == null ? '' : v).toLowerCase().trim(); }

  var CFG = (function () {
    try { return JSON.parse((q('#sf-config') || {}).textContent || '{}') || {}; } catch (e) { return {}; }
  })();
  var OFFERS = {};
  (Array.isArray(CFG.companionBundles) ? CFG.companionBundles : []).forEach(function (o) {
    if (o && o.key && o.main && o.companion) OFFERS[o.key] = o;
  });

  /** The product's main picture: this page's product (#sf-config image) or the companion's. */
  function productImage(offer, role) { return (role === 'companion' ? offer.companion.image : CFG.image) || ''; }

  /** A variant's own unit price as the store shows it struck: its compare-at when higher, else its price. */
  function struck(v) { var p = num(v.price), c = num(v.compareAtPrice); return c > p ? c : p; }

  /** Per option, the values the active variants use, in first-seen order. */
  function optionValues(side) {
    var vals = (side.optionNames || []).map(function () { return []; });
    side.variants.forEach(function (v) {
      (v.options || []).forEach(function (x, i) { if (vals[i] && vals[i].indexOf(x) < 0) vals[i].push(x); });
    });
    return vals;
  }

  /** The variant for the picked values; when none has them all, the first that has the one just changed. */
  function variantFor(side, picked, changed) {
    var i, v;
    for (i = 0; i < side.variants.length; i++) {
      v = side.variants[i];
      if (picked.every(function (x, k) { return (v.options || [])[k] === x; })) return v;
    }
    if (changed != null) {
      for (i = 0; i < side.variants.length; i++) {
        v = side.variants[i];
        if ((v.options || [])[changed] === picked[changed]) return v;
      }
    }
    return side.variants[0];
  }

  function mainTitle() {
    var h = q('.product__title h1') || q('.product__title') || q('h1');
    return String(CFG.title || (h && h.textContent) || document.title || '').trim();
  }

  /**
   * The order the selects are shown in: colour options first, then the rest as the product lists them — the rule the
   * Kaching packs use for their option names (the engine's isColorGroup). `data-i` keeps each option's real position,
   * which is what the variants' `options` are indexed by.
   */
  function shownOrder(names) {
    var idx = (names || []).map(function (_, i) { return i; });
    var colour = function (i) { return /colou?r/i.test(String(names[i])); };
    return idx.filter(colour).concat(idx.filter(function (i) { return !colour(i); }));
  }

  /** One row: picture, name, selects (none for a one-variant product), bundle price and struck price. */
  function rowHtml(side, title, role) {
    var vals = optionValues(side);
    var names = side.optionNames || [];
    var pick = side.variants.length > 1 && names.length > 0;
    var selects = pick
      ? shownOrder(names).map(function (i) {
          var name = names[i];
          return '<select class="kaching-bundles__bar-variant-select lu-cb-select" aria-label="' + esc(name) +
            '" data-name="' + esc(name) + '" data-i="' + i + '">' +
            vals[i].map(function (x) { return '<option value="' + esc(x) + '">' + esc(x) + '</option>'; }).join('') +
            '</select>';
        }).join('')
      : '';
    return '<div class="lu-cb-row" data-lu-cb-side="' + role + '">' +
      '<img class="lu-cb-img" alt="" src="" data-lu-cb-img>' +
      '<div class="lu-cb-info"><div class="lu-cb-name">' + esc(title) + '</div>' +
      (selects ? '<div class="lu-cb-selects">' + selects + '</div>' : '') + '</div>' +
      '<div class="lu-cb-row-price"><span class="lu-cb-now" data-lu-cb-now></span><s class="lu-cb-was" data-lu-cb-rwas></s></div>' +
      '</div>';
  }

  /** The picked values by the option's real position (data-i), whatever order the selects are shown in. */
  function picked(row) {
    var out = [];
    qa('select', row).forEach(function (s) { out[parseInt(s.getAttribute('data-i'), 10)] = s.value; });
    return out;
  }

  /** Resolve the row's variant from its selects (snapping them to a variant that exists) and paint it. */
  function syncRow(bar, role, changed) {
    var offer = bar.__luCb, side = offer[role], row = q('[data-lu-cb-side="' + role + '"]', bar);
    if (!row) return;
    var v = variantFor(side, picked(row), changed);
    qa('select', row).forEach(function (s) {
      var x = (v.options || [])[parseInt(s.getAttribute('data-i'), 10)];
      if (x != null) s.value = x;
    });
    bar['__luCb_' + role] = v;
    var img = q('[data-lu-cb-img]', row);
    if (img) {
      var src = v.image || productImage(offer, role);
      if (src) { img.src = src; img.hidden = false; } else img.hidden = true;
    }
    var bp = LCU(num(side.bundlePrice)), was = LCU(struck(v));
    q('[data-lu-cb-now]', row).textContent = money(bp);
    q('[data-lu-cb-rwas]', row).textContent = cents(was) > cents(bp) ? money(was) : '';
  }

  /**
   * The bar's "Save …", printed the way the Kaching block's SAVE style setting prints a pack's
   * (`data-save-style` on .lu-kaching): compare / compare_pct = against both struck prices, as $ or as % of them;
   * amount / percent = against both variants' own prices. % is rounded as the packs round it (at least 1%).
   * Empty when the bundle saves nothing.
   */
  function saveText(bar, total, m, c) {
    var block = bar.closest('.lu-kaching');
    var style = (block && block.getAttribute('data-save-style')) || 'percent';
    var base = style === 'compare' || style === 'compare_pct' ? LCU(struck(m)) + LCU(struck(c)) : LCU(num(m.price)) + LCU(num(c.price));
    var save = (cents(base) - cents(total)) / 100;
    if (!(save > 0) || !(base > 0)) return '';
    var asPct = style === 'percent' || style === 'compare_pct';
    return 'Save ' + (asPct ? Math.max(1, Math.round((save / base) * 100)) + '%' : money(save));
  }

  /** The bar's totals: both bundle prices, both struck prices, and its "Save …". */
  function paintTotals(bar) {
    var o = bar.__luCb, m = bar.__luCb_main, c = bar.__luCb_companion;
    if (!m || !c) return;
    var total = LCU(num(o.main.bundlePrice)) + LCU(num(o.companion.bundlePrice));
    var was = LCU(struck(m)) + LCU(struck(c));
    q('[data-lu-cb-price]', bar).textContent = money(total);
    q('[data-lu-cb-was]', bar).textContent = cents(was) > cents(total) ? money(was) : '';
    var text = saveText(bar, total, m, c);
    var line = q('[data-lu-cb-save-line]', bar);
    q('[data-lu-cb-save]', bar).textContent = text;
    if (line) line.hidden = !text;
  }

  /**
   * The page's gallery goes to the main product's picked variant, as it does when a colour is picked in a pack
   * (theme.js gives the product element a __showImage(src)). The companion is another product: not in this gallery.
   */
  function showMainImage(bar) {
    var v = bar.__luCb_main, pdp = bar.closest('[data-ms-pdp]');
    if (v && v.image && pdp && typeof pdp.__showImage === 'function') pdp.__showImage(v.image);
  }

  /** Start the main row on what the shopper already picked on the page (the first Kaching unit row), by option name. */
  function preselectMain(block, bar) {
    var unit = q('[data-lu-unit]', block);
    if (!unit) return;
    var byName = {};
    qa('select[data-name]', unit).forEach(function (s) { byName[low(s.getAttribute('data-name'))] = s.value; });
    var row = q('[data-lu-cb-side="main"]', bar);
    qa('select', row).forEach(function (s) {
      var want = byName[low(s.getAttribute('data-name'))];
      if (want == null) return;
      qa('option', s).forEach(function (op) { if (low(op.value) === low(want)) s.value = op.value; });
    });
    syncRow(bar, 'main', null);
  }

  function select(block, bar) {
    qa('[data-lu-bar], [data-lu-cb]', block).forEach(function (b) {
      var on = b === bar;
      b.classList.toggle('kaching-bundles__bar--selected', on);
      if (b.hasAttribute('data-lu-cb')) b.setAttribute('aria-checked', on ? 'true' : 'false');
      var r = q('input[type=radio]', b);
      if (r) r.checked = on;
      var rows = q('[data-lu-cb-rows]', b);
      if (rows) rows.hidden = !on;
    });
    if (bar.hasAttribute('data-lu-cb')) { preselectMain(block, bar); paintTotals(bar); showMainImage(bar); }
  }

  function deselectBars(block) {
    qa('[data-lu-cb]', block).forEach(function (b) {
      b.classList.remove('kaching-bundles__bar--selected');
      b.setAttribute('aria-checked', 'false');
      var r = q('input[type=radio]', b);
      if (r) r.checked = false;
      var rows = q('[data-lu-cb-rows]', b);
      if (rows) rows.hidden = true;
    });
  }

  function initBar(block, bar) {
    if (bar.__luCb) return;
    var offer = OFFERS[bar.getAttribute('data-lu-cb')];
    if (!offer || !offer.main.variants.length || !offer.companion.variants.length) {
      bar.parentNode && bar.parentNode.removeChild(bar);
      return;
    }
    bar.__luCb = offer;
    q('[data-lu-cb-rows]', bar).innerHTML =
      rowHtml(offer.main, mainTitle(), 'main') + rowHtml(offer.companion, offer.companion.title, 'companion');
    syncRow(bar, 'main', null);
    syncRow(bar, 'companion', null);
    paintTotals(bar);

    bar.addEventListener('click', function (e) {
      if (e.target.closest('select, option, [data-lu-cb-rows]')) return;
      if (!bar.classList.contains('kaching-bundles__bar--selected')) select(block, bar);
    });
    bar.addEventListener('keydown', function (e) {
      if ((e.key === 'Enter' || e.key === ' ') && !e.target.closest('select')) { e.preventDefault(); select(block, bar); }
    });
    bar.addEventListener('change', function (e) {
      var s = e.target.closest('select.lu-cb-select');
      if (!s) return;
      e.stopPropagation(); // the Kaching block reprices its packs on every change; this is not one of them
      var side = s.closest('[data-lu-cb-side]').getAttribute('data-lu-cb-side');
      syncRow(bar, side, parseInt(s.getAttribute('data-i'), 10));
      paintTotals(bar);
      if (side === 'main') showMainImage(bar);
    });
  }

  function init() {
    qa('.lu-kaching').forEach(function (block) {
      var bars = qa('[data-lu-cb]', block);
      if (!bars.length) return;
      bars.forEach(function (bar) { initBar(block, bar); });
      if (block.__luCbBound) return;
      block.__luCbBound = 1;
      // A Kaching pack picked (click or keyboard): the bundle bars let go first (capture), then the Kaching script
      // selects the pack as usual — none of the packs carries the selected class while a bundle bar is picked.
      var leave = function (e) {
        var pack = e.target.closest && e.target.closest('[data-lu-bar]');
        if (!pack || e.target.closest('select, option')) return;
        if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
        deselectBars(block);
      };
      block.addEventListener('click', leave, true);
      block.addEventListener('keydown', leave, true);
    });
  }

  function selectedBar() {
    var b = q('[data-lu-cb].kaching-bundles__bar--selected');
    return b && b.__luCb && b.__luCb_main && b.__luCb_companion ? b : null;
  }

  function line(bar, role, title, url) {
    var o = bar.__luCb, side = o[role], v = bar['__luCb_' + role];
    return {
      productId: side.productId,
      variantId: v.id,
      title: title,
      img: v.image || productImage(o, role),
      // not alt text: /checkout swaps a broken thumbnail to this url (the product's main picture), as the theme's own lines
      imgAlt: productImage(o, role),
      url: url,
      opts: (side.optionNames || []).map(function (n, i) { return { name: n, value: (v.options || [])[i] || '' }; })
        .filter(function (x) { return x.value; }),
      price: num(v.price),
      compareAt: num(v.compareAtPrice),
      qty: 1,
      bundleKey: '',
      bundleId: '',
      bundleTitle: '',
      bundleImg: '',
      companionBundle: o.key,
      bundlePrice: num(side.bundlePrice),
    };
  }

  /** Both lines into the theme's cart; false when it cannot (the click then goes on as usual). */
  function addOffer(bar) {
    if (!window.MSCart || typeof window.MSCart.add !== 'function') return false;
    var o = bar.__luCb, here = window.location.href.split('#')[0];
    var a = line(bar, 'main', mainTitle(), here);
    var b = line(bar, 'companion', o.companion.title, o.companion.handle ? '/' + encodeURIComponent(o.companion.handle) : '');
    window.MSCart.add(a);
    window.MSCart.add(b);
    try {
      window.__adluxTrack && window.__adluxTrack('AddToCart', {
        currency: CFG.currency || 'USD',
        value: num(o.main.bundlePrice) + num(o.companion.bundlePrice),
        content_ids: CFG.handle ? [CFG.handle] : [],
        content_type: 'product',
        content_name: a.title,
        num_items: 2,
        variant_id: a.variantId,
      });
    } catch (e) { /* tracking never blocks the cart */ }
    return true;
  }

  // Before the theme's own handlers (capture, on document): with a bundle bar picked, Add to cart and Express
  // checkout add the bundle instead of the selected pack's units.
  document.addEventListener('submit', function (e) {
    var form = e.target;
    if (!form || !form.matches || !form.matches('[data-ms-pdp-form]')) return;
    var bar = selectedBar();
    if (!bar) return;
    e.preventDefault();
    e.stopPropagation();
    if (addOffer(bar) && window.__gsOpenCart !== false && window.MSCart.open) window.MSCart.open();
  }, true);
  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('[data-ms-buy-now]');
    if (!btn) return;
    var bar = selectedBar();
    if (!bar) return;
    e.preventDefault();
    e.stopPropagation();
    if (addOffer(bar) && window.MSCart.checkout) window.MSCart.checkout();
  }, true);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  setTimeout(init, 200);
  setTimeout(init, 800);
})();
