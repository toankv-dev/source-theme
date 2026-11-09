/*
 * tv-bridge.js — joins the "Tredvik – Brixpant bundle" template (tv-core.js = window.Base, tv-ui.js) to Lunara's chrome.
 * Hand-written (not generated). Loaded only by sections/tv-product.hbs, after tv-core.js and tv-ui.js.
 * Spec: docs/SPEC-lunara-brixpant-tredvik-template.md
 *
 *   - Both themes keep the cart in localStorage "sf-cart:<domain>". Lunara's drawer (window.MSCart, theme.js) holds it
 *     in memory and re-reads it only on a "storage" event (another tab). After the Tredvik buy box adds lines, this
 *     dispatches that event in this tab, then opens Lunara's drawer (Theme settings → open the cart on add).
 *   - Lunara shows and keeps option names from line.opts [{name, value}] (it rebuilds `variant` from them when it
 *     saves). tv-ui.js lines carry them; any line without them gets them from its "A / B" variant text.
 *   - tv-ui.js moves popups (size chart) under <body> so a sticky column cannot clip them; that takes them out of the
 *     .tvb scope of tv-bundle.css, so each one gets its own .tvb wrapper.
 * Not touched: tv-core.js (byte copy of the base core), Lunara's theme.js. No prices are set here.
 */
(function () {
  'use strict';
  if (!document.querySelector('[data-tvb-page]') || !window.Base || !Base.cart) return;

  var KEY = Base.cart.key;
  var relaying = false;

  function fillOpts() {
    var cart = Base.cart.get(), changed = false;
    cart.items.forEach(function (l) {
      if (!l || l.gift || Array.isArray(l.opts) || !l.variant) return;
      l.opts = String(l.variant).split(' / ').map(function (v) { return { name: '', value: v }; });
      changed = true;
    });
    if (changed) Base.cart.save(cart, true);
  }

  // tv-core.js also listens to "storage" (it emits b:cart-change); this never listens to b:cart-change, and the flag
  // stops a re-entrant relay, so the two cannot loop.
  function relay() {
    if (relaying) return;
    relaying = true;
    try {
      var ev;
      try {
        ev = new StorageEvent('storage', { key: KEY, newValue: localStorage.getItem(KEY), storageArea: localStorage });
      } catch (e) {
        ev = document.createEvent('Event');
        ev.initEvent('storage', false, false);
        ev.key = KEY;
      }
      window.dispatchEvent(ev);
    } catch (e) { /* storage off: Lunara's drawer shows what it has */ } finally {
      relaying = false;
    }
  }

  document.addEventListener('b:cart-added', function () {
    fillOpts();
    relay();
    if (window.MSCart && typeof MSCart.open === 'function' && window.__gsOpenCart !== false) MSCart.open();
  });

  function adoptPortals() {
    [].forEach.call(document.querySelectorAll('body > [data-modal]'), function (m) {
      var w = document.createElement('div');
      w.className = 'tvb tvb-portal';
      m.parentNode.insertBefore(w, m);
      w.appendChild(m);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', adoptPortals); else adoptPortals();
})();
