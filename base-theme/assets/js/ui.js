/*
 * Base theme — interface (drawers, gallery, pickers, sliders, forms).
 *
 * Talks to the platform only through window.Base (core.js) and finds its elements through data-*
 * attributes, never through class names — so a child theme can restyle or rewrite the markup freely as
 * long as it keeps the data-* hooks. A child theme may extend or replace this file; never core.js.
 */
(function () {
  'use strict';
  var Base = window.Base;
  if (!Base) return;
  var $ = Base.$, $$ = Base.$$, cfg = Base.cfg, money = Base.money, num = Base.num;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function lockScroll(on) { document.body.classList.toggle('b-lock', !!on); }

  function stars(rating, extra) {
    var s = el('span', 'b-stars' + (extra ? ' ' + extra : ''));
    s.style.setProperty('--r', String(rating || 5));
    s.setAttribute('aria-label', (rating || 5) + ' out of 5');
    return s;
  }

  // ---------------------------------------------------------------------------------------------
  // Top bar: rotating messages ("a || b || c") or a per-visitor countdown that restarts every N hours.
  // ---------------------------------------------------------------------------------------------
  function initTopbar() {
    var bar = $('[data-topbar]');
    if (!bar) return;
    var text = $('[data-topbar-text]', bar);
    if (text) {
      var msgs = String(bar.getAttribute('data-topbar') || '').split('||').map(function (s) { return s.trim(); }).filter(Boolean);
      if (!msgs.length) msgs = [text.textContent.trim()];
      var i = 0, timer = null, auto = bar.getAttribute('data-autoplay') !== 'false';
      var show = function (n) { i = (n + msgs.length) % msgs.length; text.textContent = msgs[i]; };
      var play = function () {
        if (!auto || msgs.length < 2) return;
        clearInterval(timer);
        timer = setInterval(function () { show(i + 1); }, 4500);
      };
      show(0);
      $$('[data-topbar-step]', bar).forEach(function (b) {
        b.hidden = msgs.length < 2;
        b.addEventListener('click', function () { show(i + Number(b.getAttribute('data-topbar-step'))); play(); });
      });
      play();
    }
    $$('[data-countdown]').forEach(initCountdown);
  }

  function initCountdown(box) {
    var hours = Math.max(0.1, Number(box.getAttribute('data-hours')) || 2);
    var span = hours * 3600 * 1000, key = 'b-cd:' + hours, end;
    try { end = Number(localStorage.getItem(key)) || 0; } catch (e) { end = 0; }
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    var h = $('[data-cd-h]', box), m = $('[data-cd-m]', box), s = $('[data-cd-s]', box);
    var tick = function () {
      var now = Date.now();
      if (!end || end <= now) {
        end = now + span;
        try { localStorage.setItem(key, String(end)); } catch (e) { /* ignore */ }
      }
      var left = Math.floor((end - now) / 1000);
      if (h) h.textContent = pad(Math.floor(left / 3600));
      if (m) m.textContent = pad(Math.floor((left % 3600) / 60));
      if (s) s.textContent = pad(left % 60);
    };
    tick();
    setInterval(tick, 1000);
  }

  // ---------------------------------------------------------------------------------------------
  // Header: menu drawer, search dialog, current page in the nav, year, local-preview links.
  // ---------------------------------------------------------------------------------------------
  function initHeader() {
    var openBtn = $('[data-menu-open]'), drawer = $('[data-menu-drawer]');
    if (openBtn && drawer) {
      var setMenu = function (on) {
        drawer.hidden = !on;
        openBtn.setAttribute('aria-expanded', on ? 'true' : 'false');
        lockScroll(on);
      };
      openBtn.addEventListener('click', function () { setMenu(true); });
      $$('[data-menu-close]', drawer).forEach(function (b) { b.addEventListener('click', function () { setMenu(false); }); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !drawer.hidden) setMenu(false); });
    }

    var search = $('[data-search]');
    if (search) {
      var setSearch = function (on) {
        search.hidden = !on;
        if (on) { var input = $('[data-search-input]', search); if (input) input.focus(); }
      };
      $$('[data-search-open]').forEach(function (b) { b.addEventListener('click', function () { setSearch(true); }); });
      $$('[data-search-close]', search).forEach(function (b) { b.addEventListener('click', function () { setSearch(false); }); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !search.hidden) setSearch(false); });
    }
    $$('[data-search-form]').forEach(function (f) {
      f.addEventListener('submit', function () { var q = f.querySelector('[name="q"]'); Base.search(q && q.value.trim()); });
    });

    $$('[data-year]').forEach(function (n) { n.textContent = String(new Date().getFullYear()); });

    var p = location.pathname;
    var current = p === '/' ? 'home' : /^\/collections\/[^/]+/.test(p) && p.split('/')[2] !== 'all' && p.split('/')[2] !== 'all-products' && $('[data-nav="collection-' + p.split('/')[2] + '"]')
      ? 'collection-' + p.split('/')[2]
      : /^\/(collections|search)/.test(p) ? 'shop' : /^\/(contact|pages\/contact)/.test(p) ? 'contact' : /^\/pages\/track/.test(p) ? 'track' : '';
    if (current) $$('[data-nav="' + current + '"]').forEach(function (a) { a.classList.add('is-active'); a.setAttribute('aria-current', 'page'); });

    $$('a[data-local-domain]').forEach(function (a) { a.setAttribute('href', Base.localize(a.getAttribute('href') || '')); });
    if (!Base.isLocal) $$('[data-local-only]').forEach(function (n) { n.remove(); });

    var header = $('[data-header]');
    if (header) {
      var onScroll = function () { header.classList.toggle('is-scrolled', window.scrollY > 10); };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }
  }

  // ---------------------------------------------------------------------------------------------
  // Media: an image URL that is really a video becomes a muted looping <video> (and back).
  // ---------------------------------------------------------------------------------------------
  var VIDEO_RE = /\.(mp4|webm|ogg|ogv|mov|m4v)(?:$|[?#])/i;
  function isVideo(url) { return VIDEO_RE.test(String(url || '')); }

  function swapMedia(node, url, hook) {
    if (!node || !url) return node;
    var wantVideo = isVideo(url), isVid = node.tagName === 'VIDEO';
    if (wantVideo === isVid) {
      if (node.getAttribute('src') !== url) node.setAttribute('src', url);
      if (isVid && node.play) node.play().catch(function () {});
      return node;
    }
    var next;
    if (wantVideo) {
      next = document.createElement('video');
      ['muted', 'playsinline', 'autoplay', 'loop', 'disablepictureinpicture'].forEach(function (a) { next.setAttribute(a, ''); });
      next.muted = true;
      next.setAttribute('preload', 'metadata');
    } else {
      next = document.createElement('img');
      next.alt = node.getAttribute('alt') || '';
    }
    next.setAttribute(hook, '');
    if (node.className) next.className = node.className;
    next.setAttribute('src', url);
    node.replaceWith(next);
    if (wantVideo && next.play) next.play().catch(function () {});
    return next;
  }

  function centerInStrip(strip, item) {
    if (!strip || !item) return;
    var a = strip.getBoundingClientRect(), b = item.getBoundingClientRect();
    var dx = b.left - a.left - (strip.clientWidth - b.width) / 2;
    if (Math.abs(dx) >= 1) strip.scrollBy({ left: dx, behavior: 'smooth' });
  }

  function markThumb(strip, url) {
    if (!strip || !url) return;
    var hit = null, bare = String(url).split('?')[0];
    $$('[data-gallery-thumb]', strip).forEach(function (t) {
      var src = t.getAttribute('data-gallery-thumb') || '';
      var on = !hit && (src === url || src.split('?')[0] === bare);
      if (on) hit = t;
      t.classList.toggle('is-active', on);
    });
    if (hit) centerInStrip(strip, hit);
  }

  function initGallery() {
    var thumbs = $$('[data-gallery-thumb]');
    if (!thumbs.length) return;
    var pick = function (t) {
      swapMedia($('[data-gallery-main]'), t.getAttribute('data-gallery-thumb'), 'data-gallery-main');
      thumbs.forEach(function (x) { x.classList.toggle('is-active', x === t); });
      centerInStrip(t.parentElement, t);
    };
    thumbs.forEach(function (t) { t.addEventListener('click', function () { pick(t); }); });
    $$('[data-gallery-step]').forEach(function (b) {
      b.addEventListener('click', function () {
        var i = thumbs.findIndex(function (t) { return t.classList.contains('is-active'); });
        pick(thumbs[(i + Number(b.getAttribute('data-gallery-step')) + thumbs.length) % thumbs.length]);
      });
    });
    // Swipe on the main image (phones).
    var main = $('[data-gallery] .b-gallery__main') || ($('[data-gallery-main]') || {}).parentElement;
    if (main) {
      var x0 = null;
      main.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
      main.addEventListener('touchend', function (e) {
        if (x0 == null) return;
        var dx = e.changedTouches[0].clientX - x0;
        x0 = null;
        if (Math.abs(dx) < 40) return;
        var i = thumbs.findIndex(function (t) { return t.classList.contains('is-active'); });
        pick(thumbs[(i + (dx < 0 ? 1 : -1) + thumbs.length) % thumbs.length]);
      });
    }
  }

  // ---------------------------------------------------------------------------------------------
  // Product form: option pickers ([data-opt]), pack cards ([data-cards-block]), quantity, buy buttons.
  // ---------------------------------------------------------------------------------------------
  var packs = null; // { kind: 'option' | 'qty', el, index?, settings, compact?, block }
  var PACK_NAME = /\b(pack|packs|bundle|bundles|set|sets|kit|qty|quantity|pieces?|pcs)\b/i;

  function optionCount() {
    var n = $$('[data-opt]').length;
    if (packs && packs.kind === 'option') n = Math.max(n, packs.index + 1);
    var v = Base.variants.list()[0];
    return Math.max(n, v ? (v.option_values || []).length : 0);
  }

  function selectedValues() {
    var out = [];
    for (var i = 0; i < optionCount(); i++) {
      if (packs && packs.kind === 'option' && packs.index === i) {
        var card = $('[data-card].is-selected', packs.el);
        out.push(card ? card.getAttribute('data-card') : '');
        continue;
      }
      var group = $('[data-opt="' + i + '"]');
      if (!group) { out.push(''); continue; }
      var select = $('[data-opt-select]', group);
      var active = select ? null : $('[data-opt-value].is-active', group);
      out.push(select ? select.value : active ? active.getAttribute('data-opt-value') : '');
    }
    return out;
  }

  function currentVariant() { return Base.variants.find(selectedValues()); }

  function chosenQty() {
    if (packs && packs.kind === 'qty') {
      var c = $('[data-qcard].is-selected', packs.el);
      if (c) return Math.min(999, Math.max(1, Number(c.getAttribute('data-qty')) || 1));
    }
    var input = $('[data-qty-input]');
    var n = parseInt(input ? input.value : '1', 10);
    return Math.min(999, Math.max(1, isNaN(n) ? 1 : n));
  }

  /** Price of the current selection (quantity pack or quantity stepper) after the live discounts. */
  function selectionPrice(v) {
    var qty = chosenQty();
    var p = Base.discount.pack(v.price, qty, v.id);
    return { total: p.total, compare: Base.round2(Math.max(v.compare, v.price) * qty), qty: qty };
  }

  /** "+ FREE Travel pouch $19.99" lines for the gifts a pack unlocks (product.gift_offers). */
  function paintGifts(box, gifts) {
    box.innerHTML = '';
    gifts.forEach(function (g) {
      var row = el('span', 'b-gift');
      if (g.imageUrl) { var im = el('img', 'b-gift__img'); im.src = g.imageUrl; im.alt = ''; im.loading = 'lazy'; row.appendChild(im); }
      row.appendChild(el('span', 'b-gift__text', '+ FREE ' + ((g.qty || 1) > 1 ? g.qty + ' × ' : '') + (g.title || 'gift')));
      if (num(g.compareAtPrice) > 0) row.appendChild(el('s', 'b-gift__was', money(num(g.compareAtPrice) * (g.qty || 1))));
      box.appendChild(row);
    });
    box.hidden = !gifts.length;
  }

  function updatePackCards() {
    if (!packs) return;
    var values = selectedValues(), s = packs.settings || {};
    var suffix = s.currency_code === false ? '' : ' ' + (cfg.currency || 'USD');
    var fmt = function (n) { return money(n) + suffix; };
    if (packs.compact) {
      var v0 = currentVariant(), box = $('[data-cards-price]', packs.block);
      if (box && v0) {
        var pp = selectionPrice(v0), pe = $('[data-price]', box), ce = $('[data-compare]', box);
        if (pe) pe.textContent = fmt(pp.total);
        if (ce) { ce.textContent = pp.compare > pp.total ? money(pp.compare) : ''; ce.hidden = !(pp.compare > pp.total); }
      }
    }
    $$('[data-card], [data-qcard]', packs.el).forEach(function (card) {
      var priceEl = $('[data-card-price]', card), compareEl = $('[data-card-compare]', card), pos, v;
      if (packs.kind === 'qty') {
        pos = Number(card.getAttribute('data-card-pos'));
        v = Base.variants.find(values);
        var qty = Number(card.getAttribute('data-qty')) || 1;
        var total = v ? Base.discount.pack(v.price, qty, v.id).total : 0;
        var compare = v ? Base.round2(Math.max(v.compare, v.price) * qty) : 0;
        if (priceEl) priceEl.textContent = v ? fmt(total) : '';
        if (compareEl) compareEl.textContent = v && compare > total ? fmt(compare) : '';
        var img = $('[data-qcard-img]', card), qtyMark = $('.b-card__qty', card), src = (v && v.image) || cfg.image || '';
        if (img && src) { img.src = src; img.hidden = false; if (qtyMark) qtyMark.hidden = false; }
      } else {
        pos = Number(card.getAttribute('data-card-pos')) + 1;
        var vals = values.slice();
        vals[packs.index] = card.getAttribute('data-card');
        v = Base.variants.find(vals);
        if (priceEl) priceEl.textContent = v ? fmt(v.price) : '';
        if (compareEl) compareEl.textContent = v && v.compare > v.price ? fmt(v.compare) : '';
        var cimg = $('[data-card-img]', card);
        if (cimg && v && v.image) { cimg.src = v.image; cimg.hidden = false; }
      }
      card.classList.toggle('is-unavailable', !v);
      var giftEl = $('[data-card-gift]', card);
      if (giftEl) {
        var units = packs.kind === 'qty' ? Number(card.getAttribute('data-qty')) || 1 : chosenQty();
        var worth = v ? (packs.kind === 'qty' ? total : v.price * units) : 0;
        paintGifts(giftEl, v && Base.gifts ? Base.gifts.forCart(units, worth) : []);
      }
      var sub = $('[data-card-sub]', card), badge = $('[data-card-badge]', card), inc = $('[data-card-includes]', card);
      if (sub) sub.textContent = s['card_' + pos + '_sub'] || '';
      if (badge) { badge.textContent = s['card_' + pos + '_badge'] || ''; badge.hidden = !badge.textContent; }
      if (inc) {
        var html = s['card_' + pos + '_includes'] || '';
        inc.innerHTML = html;
        inc.hidden = !html || !card.classList.contains('is-selected');
      }
    });
  }

  function refreshProduct() {
    var values = selectedValues(), v = Base.variants.find(values);
    $$('[data-opt]').forEach(function (g) {
      var cur = $('[data-opt-current]', g);
      if (!cur) return;
      // Shown name (custom_name) of the chosen value, else the value itself.
      var sel = $('[data-opt-select]', g), act = sel ? null : $('[data-opt-value].is-active', g);
      cur.textContent = (sel && sel.selectedIndex > -1 ? sel.options[sel.selectedIndex].text : '') ||
        (act && act.getAttribute('data-opt-display')) || values[Number(g.getAttribute('data-opt'))] || '';
    });
    updatePackCards();
    $$('[data-add-to-cart]').forEach(function (b) { b.disabled = !v && Base.variants.list().length > 0; });
    if (!v) return;
    var p = selectionPrice(v);
    var priceEl = $('[data-price-block] [data-price]'), compareEl = $('[data-price-block] [data-compare]');
    var offEl = $('[data-price-block] [data-off]'), sticky = $('[data-sticky-price]');
    if (priceEl) priceEl.textContent = money(p.total);
    if (compareEl) { compareEl.textContent = p.compare > p.total ? money(p.compare) : ''; compareEl.hidden = !(p.compare > p.total); }
    if (offEl) {
      var pct = p.compare > p.total ? Math.round((1 - p.total / p.compare) * 100) : 0;
      offEl.hidden = !pct;
      if (pct) offEl.textContent = offEl.textContent.replace(/\d+%/, pct + '%');
    }
    if (sticky) sticky.textContent = money(p.total);
    if (v.image && $('[data-gallery-main]')) {
      swapMedia($('[data-gallery-main]'), v.image, 'data-gallery-main');
      markThumb($('[data-gallery-thumbs]'), v.image);
    }
    if ($('[data-pdp]')) Base.variants.setUrl(v.id);
  }

  function selectCard(card) {
    $$('[data-card], [data-qcard]', packs.el).forEach(function (c) {
      var on = c === card;
      c.classList.toggle('is-selected', on);
      c.setAttribute('aria-checked', on ? 'true' : 'false');
    });
    refreshProduct();
  }

  function resolvePacks(block) {
    var mode = block.getAttribute('data-mode') || 'auto';
    var groups = $$('[data-cards]', block);
    var settings = Base.readJson($('[data-cards-settings]', block), {}) || {};
    var byIndex = function (i) { return groups.filter(function (g) { return Number(g.getAttribute('data-cards')) === i; })[0]; };
    var wanted = Number(block.getAttribute('data-option-index')) || 0, group = null;
    if (mode === 'option') group = byIndex(wanted) || groups[0] || null;
    if (mode === 'auto') group = groups.filter(function (g) { return PACK_NAME.test(g.getAttribute('data-cards-name') || ''); })[0] || null;
    if (group) {
      var layout = block.getAttribute('data-layout') || 'auto';
      var isPack = PACK_NAME.test(group.getAttribute('data-cards-name') || '');
      return { kind: 'option', index: Number(group.getAttribute('data-cards')), el: group, settings: settings, compact: layout === 'tiles' || (layout === 'auto' && !isPack), block: block };
    }
    // auto without a Pack/Bundle option, or "quantity": quantity packs of the chosen variant.
    var q = $('[data-qcards]', block);
    if (!q || !$('[data-qcard]', q)) return null;
    if (!$('[data-qcard].is-selected', q)) $('[data-qcard]', q).classList.add('is-selected');
    return { kind: 'qty', el: q, settings: settings, block: block };
  }

  function initProductForm() {
    var block = $('[data-cards-block]');
    if (block) packs = resolvePacks(block);
    if (packs) {
      packs.el.hidden = false;
      if (packs.kind === 'option') {
        var g = $('[data-opt="' + packs.index + '"]');
        if (g) g.hidden = true;
        if (packs.compact) {
          packs.el.classList.add('is-compact');
          var box = $('[data-cards-price]', packs.block);
          if (box) box.hidden = false;
        }
      } else {
        $$('[data-qty]').forEach(function (q) { if (q.closest('.b-buy-row')) q.hidden = true; });
      }
      $$('[data-card], [data-qcard]', packs.el).forEach(function (card) {
        card.addEventListener('click', function () { selectCard(card); });
        card.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectCard(card); } });
      });
    }

    $$('[data-opt]').forEach(function (group) {
      $$('[data-opt-value]', group).forEach(function (btn) {
        btn.addEventListener('click', function () {
          $$('[data-opt-value]', group).forEach(function (b) {
            b.classList.toggle('is-active', b === btn);
            b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
          });
          refreshProduct();
        });
      });
      var sel = $('[data-opt-select]', group);
      if (sel) sel.addEventListener('change', refreshProduct);
    });

    // ?variant= restores the selection; a default selection that is no real variant falls back to the
    // first available one, so prices and the buy button work on first paint.
    var fromUrl = Base.variants.fromUrl();
    if (!fromUrl && !currentVariant()) {
      var list = Base.variants.list();
      var first = list.filter(function (v) { return v.available !== false; })[0] || list[0];
      if (first) fromUrl = Base.variants.byId(first.id);
    }
    if (fromUrl) {
      fromUrl.options.forEach(function (value, i) {
        if (packs && packs.kind === 'option' && packs.index === i) {
          $$('[data-card]', packs.el).forEach(function (c) { c.classList.toggle('is-selected', c.getAttribute('data-card') === value); });
          return;
        }
        var group = $('[data-opt="' + i + '"]');
        if (!group) return;
        var sel = $('[data-opt-select]', group);
        if (sel) { sel.value = value; return; }
        $$('[data-opt-value]', group).forEach(function (b) { b.classList.toggle('is-active', b.getAttribute('data-opt-value') === value); });
      });
    }

    var input = $('[data-qty-input]');
    $$('[data-qty-step]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (input) input.value = String(Math.min(999, Math.max(1, chosenQty() + Number(b.getAttribute('data-qty-step')))));
        refreshProduct();
      });
    });
    if (input) input.addEventListener('input', refreshProduct);

    var mainBtn = $('[data-main-atc]');
    $$('[data-add-to-cart]').forEach(function (b) {
      b.addEventListener('click', function () {
        addSelection(b.getAttribute('data-mode') || (mainBtn && mainBtn.getAttribute('data-mode')) || 'cart');
      });
    });

    if ($('[data-pdp]')) refreshProduct();
  }

  function addSelection(mode) {
    var v = currentVariant();
    if (!v) return;
    var qty = chosenQty();
    var p = selectionPrice(v);
    var optionName = function (i) {
      var cards = $('[data-cards="' + i + '"]'), legend = $('[data-opt="' + i + '"] legend');
      if (cards) return cards.getAttribute('data-cards-name');
      return legend && legend.firstChild ? legend.firstChild.textContent.replace(/:\s*$/, '').trim() : 'Option ' + (i + 1);
    };
    Base.cart.add({
      variantId: v.id,
      variant: v.options.join(' / '),
      opts: v.options.map(function (value, i) { return { name: optionName(i), value: value }; }),
      qty: qty,
      price: v.price,
      comparePrice: v.compare || undefined,
      image: v.image || cfg.image || ''
    }, { mode: mode, value: p.total });
  }

  function initSticky() {
    var bar = $('[data-sticky]'), main = $('[data-main-atc]');
    if (!bar || !main || !('IntersectionObserver' in window)) return;
    new IntersectionObserver(function (entries) {
      var e = entries[0];
      bar.hidden = e.isIntersecting || e.boundingClientRect.top > 0;
    }).observe(main);
  }

  function initUrgency() {
    $$('[data-urgency]').forEach(function (n) {
      var min = Number(n.getAttribute('data-min')) || 10, max = Math.max(min, Number(n.getAttribute('data-max')) || 40);
      var tpl = n.getAttribute('data-text') || '';
      var val = min + Math.floor(Math.random() * (max - min + 1));
      var render = function () { n.textContent = tpl.replace('{n}', String(val)); };
      render();
      if (tpl.indexOf('{n}') > -1) setInterval(function () { val = Math.min(max, Math.max(min, val + (Math.random() < 0.5 ? -1 : 1))); render(); }, 5000);
    });
  }

  // ---------------------------------------------------------------------------------------------
  // Cart drawer
  // ---------------------------------------------------------------------------------------------
  var lastFocus = null, closeTimer = null;

  function openCart() {
    var d = $('[data-cart-drawer]');
    if (!d) return;
    clearTimeout(closeTimer);
    lastFocus = document.activeElement;
    d.hidden = false;
    lockScroll(true);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        d.classList.add('is-open');
        var c = $('.b-drawer__head [data-cart-close]', d);
        if (c) c.focus({ preventScroll: true });
      });
    });
  }

  function closeCart() {
    var d = $('[data-cart-drawer]');
    if (!d || d.hidden) return;
    d.classList.remove('is-open');
    lockScroll(false);
    closeTimer = setTimeout(function () { if (!d.classList.contains('is-open')) d.hidden = true; }, reduceMotion ? 0 : 320);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  // Shipping protection / add-ons: real cart lines, switched on by default, remembered per product.
  var upState = {}, upSeen = {};
  function upsellsAsLines() { var u = $('[data-b-ups]'); return !!(u && u.getAttribute('data-as-line') === '1'); }
  function upOn(pid) {
    if (pid in upState) return upState[pid];
    try { return localStorage.getItem('b-up:' + pid) !== '0'; } catch (e) { return true; }
  }
  function setUpOn(pid, on) {
    upState[pid] = on;
    try { localStorage.setItem('b-up:' + pid, on ? '1' : '0'); } catch (e) { /* ignore */ }
  }
  function upChoice(row) {
    var input = $('[data-b-up-var]', row);
    if (!input) return null;
    var o = input.tagName === 'SELECT' ? input.options[input.selectedIndex] : input;
    return o ? { id: o.value, price: Number(o.getAttribute('data-price')) || 0, compare: Number(o.getAttribute('data-compare')) || 0, image: o.getAttribute('data-image') || '', title: o.getAttribute('data-title') || '' } : null;
  }
  function upIds(row) {
    var input = $('[data-b-up-var]', row);
    if (!input) return [];
    return input.tagName === 'SELECT' ? [].map.call(input.options, function (o) { return o.value; }) : [input.value];
  }
  function upIndex(items, row) {
    var pid = row.getAttribute('data-pid'), ids = upIds(row);
    for (var i = 0; i < items.length; i++) {
      var l = items[i];
      if (l && !l.gift && (l.upsell === pid || ids.indexOf(l.variantId) > -1)) { l.upsell = pid; return i; }
    }
    return -1;
  }
  function upLine(row, c) {
    return { variantId: c.id, variant: $('select[data-b-up-var]', row) ? c.title : '', qty: 1, title: row.getAttribute('data-title') || '',
      handle: row.getAttribute('data-handle') || '', productId: row.getAttribute('data-pid') || '', image: c.image || row.getAttribute('data-image') || '', price: c.price, upsell: row.getAttribute('data-pid') };
  }
  function paintUp(row, on) {
    var c = upChoice(row);
    if (!c) return;
    var amt = $('[data-b-up-amt]', row), was = $('[data-b-up-was]', row), img = $('[data-b-up-img]', row), sw = $('[data-b-up-sw]', row);
    if (amt) amt.textContent = money(c.price);
    if (was) { was.textContent = c.compare > c.price ? money(c.compare) : ''; was.hidden = !(c.compare > c.price); }
    if (img && c.image) img.src = c.image;
    if (sw) sw.setAttribute('aria-checked', on ? 'true' : 'false');
    row.classList.toggle('is-off', !on);
  }
  /** Brings the cart's add-on lines in line with the switches. Returns true when the cart changed. */
  function syncUpsells(cart) {
    var rows = $$('[data-b-up]'), box = $('[data-b-ups]'), changed = false;
    if (!rows.length) return false;
    var isUp = function (l) { return l.upsell || rows.some(function (r) { return upIds(r).indexOf(l.variantId) > -1; }); };
    if (!cart.items.filter(function (l) { return l && !l.gift && !isUp(l); }).length) {
      for (var i = cart.items.length - 1; i >= 0; i--) if (cart.items[i] && isUp(cart.items[i])) { cart.items.splice(i, 1); changed = true; }
      upSeen = {};
      if (box) box.hidden = true;
      return changed;
    }
    if (box) box.hidden = false;
    rows.forEach(function (row) {
      var pid = row.getAttribute('data-pid'), idx = upIndex(cart.items, row);
      if (upSeen[pid] && idx < 0 && upOn(pid)) setUpOn(pid, false); // removed from the cart by hand
      var on = upOn(pid);
      if (idx > -1) {
        var sel = $('select[data-b-up-var]', row);
        if (sel && [].some.call(sel.options, function (o) { return o.value === cart.items[idx].variantId; })) sel.value = cart.items[idx].variantId;
      }
      var c = upChoice(row);
      if (on && c && idx < 0) { cart.items.push(upLine(row, c)); changed = true; }
      if (!on && idx > -1) { cart.items.splice(idx, 1); changed = true; }
      upSeen[pid] = on;
      paintUp(row, on);
    });
    return changed;
  }

  function paintTotals(t) {
    var sub = $('[data-cart-subtotal]'), was = $('[data-cart-subtotal-was]'), row = $('[data-cart-discount-row]');
    var amt = $('[data-cart-discount]'), title = $('[data-cart-discount-title]');
    var d = t.discount > 0 ? Base.round2(Math.min(t.discount, t.subtotal)) : 0;
    if (sub) sub.textContent = money(Base.round2(t.subtotal - d));
    if (was) { was.textContent = d ? money(t.subtotal) : ''; was.hidden = !d; }
    if (row) row.hidden = !d;
    if (amt) amt.textContent = '−' + money(d);
    if (title) title.textContent = t.title ? 'Discount (' + t.title + ')' : 'Discount';
  }

  var quoteTimer = null;
  function renderCart() {
    var cart = Base.cart.get();
    if (syncUpsells(cart)) Base.cart.save(cart, true);
    var showUps = upsellsAsLines();
    var count = cart.items.reduce(function (s, l) { return s + (l.gift || (l.upsell && !showUps) ? 0 : l.qty); }, 0);
    $$('[data-cart-count]').forEach(function (n) { n.textContent = String(count); n.hidden = count === 0; });
    $$('[data-cart-count-text]').forEach(function (n) { n.textContent = count ? '(' + count + ')' : ''; });
    var list = $('[data-cart-lines]');
    if (!list) return;
    list.innerHTML = '';
    cart.items.forEach(function (l, i) {
      if (l.upsell && !showUps) return;
      var row = el('div', 'b-line');
      row.setAttribute('data-line-variant', l.variantId || '');
      var img = el('img');
      img.src = l.image || '';
      img.alt = '';
      img.loading = 'lazy';
      var meta = el('div', 'b-line__meta');
      meta.appendChild(el('p', 'b-line__title', l.title || ''));
      if (l.variant) meta.appendChild(el('p', 'b-line__variant', l.variant));
      var price = el('p', 'b-line__price');
      if (l.gift) price.textContent = 'Free';
      else {
        var cmp = num(l.comparePrice);
        if (cmp > num(l.price)) price.appendChild(el('s', 'b-line__was', money(cmp * l.qty)));
        price.appendChild(el('span', 'b-line__now', money(num(l.price) * l.qty)));
      }
      meta.appendChild(price);
      if (!l.gift) {
        var q = el('div', 'b-qty b-qty--sm'), minus = el('button', '', '−'), plus = el('button', '', '+');
        minus.type = plus.type = 'button';
        minus.setAttribute('aria-label', 'Decrease');
        plus.setAttribute('aria-label', 'Increase');
        minus.addEventListener('click', function () { Base.cart.setQty(i, l.qty - 1); });
        plus.addEventListener('click', function () { Base.cart.setQty(i, l.qty + 1); });
        q.appendChild(minus);
        q.appendChild(el('span', '', String(l.qty)));
        q.appendChild(plus);
        meta.appendChild(q);
      }
      row.appendChild(img);
      row.appendChild(meta);
      if (!l.gift) {
        var rm = el('button', 'b-line__remove');
        rm.type = 'button';
        rm.setAttribute('aria-label', 'Remove ' + (l.title || 'item'));
        rm.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 7h16M9 7V4.5h6V7m-8.5 0 .8 12.2a1.5 1.5 0 0 0 1.5 1.3h6.4a1.5 1.5 0 0 0 1.5-1.3L17.5 7M10 11v6m4-6v6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        rm.addEventListener('click', function () { Base.cart.remove(i); });
        row.appendChild(rm);
      }
      list.appendChild(row);
    });
    var paid = cart.items.filter(function (l) { return !l.gift; });
    paintTotals(Base.cart.totals(cart));
    var empty = $('[data-cart-empty]'), foot = $('[data-cart-foot]');
    if (empty) empty.hidden = cart.items.length > 0;
    if (foot) foot.hidden = cart.items.length === 0;
    if (paid.length) {
      clearTimeout(quoteTimer);
      quoteTimer = setTimeout(function () {
        Base.cart.quote().then(function (q) {
          if (!q) return;
          q.lines.forEach(function (ql) {
            if (ql.isGift) return;
            var r = $('[data-cart-lines] [data-line-variant="' + String(ql.variantId).replace(/"/g, '') + '"] .b-line__now');
            if (r) r.textContent = money(ql.lineTotal);
          });
          paintTotals(q);
        });
      }, 150);
    }
  }

  function initCart() {
    $$('[data-cart-open]').forEach(function (b) { b.addEventListener('click', openCart); });
    $$('[data-cart-close]').forEach(function (b) { b.addEventListener('click', closeCart); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeCart(); });
    $$('[data-cart-checkout]').forEach(function (b) { b.addEventListener('click', function () { Base.cart.checkout(); }); });
    document.addEventListener('click', function (e) {
      var sw = e.target.closest && e.target.closest('[data-b-up-sw]');
      if (!sw) return;
      e.preventDefault();
      var pid = sw.closest('[data-b-up]').getAttribute('data-pid');
      setUpOn(pid, !upOn(pid));
      renderCart();
    });
    document.addEventListener('change', function (e) {
      var sel = e.target.closest && e.target.closest('select[data-b-up-var]');
      if (!sel) return;
      var row = sel.closest('[data-b-up]'), c = upChoice(row), cart = Base.cart.get(), idx = upIndex(cart.items, row);
      if (c && idx > -1) { var q = cart.items[idx].qty; cart.items[idx] = upLine(row, c); cart.items[idx].qty = q; Base.cart.save(cart); }
      else paintUp(row, upOn(row.getAttribute('data-pid')));
    });
    document.addEventListener('b:cart-change', renderCart);
    document.addEventListener('b:cart-added', function () { if (!window.__bCart || window.__bCart.open !== false) openCart(); });
    window.addEventListener('open-cart-drawer', openCart);
    renderCart();
  }

  // ---------------------------------------------------------------------------------------------
  // Reviews: list (filters, sort, show more), photo grid + lightbox, write-a-review form.
  // ---------------------------------------------------------------------------------------------
  function reviewCard(r) {
    var a = el('article', 'b-review');
    a.appendChild(stars(r.rating, 'b-stars--outline'));
    var who = el('p', 'b-review__who', r.name || '');
    if (r.verified) { who.appendChild(document.createTextNode(' ')); who.appendChild(el('span', 'b-pill-verified', 'Verified')); }
    a.appendChild(who);
    if (r.title) a.appendChild(el('p', 'b-review__title', r.title));
    var t = el('p', 'b-review__text', r.content || '');
    t.setAttribute('data-clamp', '');
    a.appendChild(t);
    if (r.image) {
      var img = el('img', 'b-review__thumb');
      img.src = r.image;
      img.alt = 'Photo from ' + (r.name || 'a customer');
      img.loading = 'lazy';
      img.setAttribute('data-review-photo-src', r.image);
      a.appendChild(img);
    }
    return a;
  }

  function clamp(root) {
    $$('[data-clamp]', root).forEach(function (t) {
      if (t.getAttribute('data-clamp') === 'done') return;
      t.setAttribute('data-clamp', 'done');
      if (t.scrollHeight <= t.clientHeight + 2) return;
      var more = el('button', 'b-more', 'More');
      more.type = 'button';
      more.addEventListener('click', function () { more.textContent = t.classList.toggle('is-open') ? 'Less' : 'More'; });
      t.parentNode.insertBefore(more, t.nextSibling);
    });
  }

  var firstPage = null;
  function productReviews() {
    if (!firstPage) firstPage = cfg.productId ? Base.reviews.list(cfg.productId, 0, 30).catch(function () { return null; }) : Promise.resolve(null);
    return firstPage;
  }

  function initReviews() {
    var root = $('[data-reviews]');
    if (!root || !cfg.productId) return;
    var list = $('[data-reviews-list]', root), more = $('[data-reviews-more]', root), dist = $('[data-reviews-dist]', root);
    var photos = $('[data-reviews-photos]', root), empty = $('[data-reviews-empty]', root), sort = $('[data-review-sort]', root), filter = $('[data-review-filter]', root);
    if (!list) return;
    clamp(root);
    var pageSize = Number(root.getAttribute('data-page-size')) || 9, BATCH = 50, CAP = 300;
    var all = [], hasMore = true, loading = null, shown = pageSize;

    var load = function () {
      if (!hasMore) return Promise.resolve();
      if (loading) return loading;
      loading = Base.reviews.list(cfg.productId, all.length, BATCH).then(function (d) {
        all = all.concat((d && d.reviews) || []);
        hasMore = !!(d && d.has_more) && all.length < CAP;
        if (dist && !dist.children.length && d && d.distribution) paintDist(d.distribution);
        loading = null;
      }).catch(function () { hasMore = false; loading = null; });
      return loading;
    };
    var paintDist = function (rows) {
      rows.forEach(function (r) {
        var li = el('li', 'b-dist');
        var star = el('span', 'b-dist__star', r.star + ' ');
        star.appendChild(el('span', 'b-dist__icon', '★'));
        li.appendChild(star);
        var bar = el('span', 'b-dist__bar'), fill = el('span');
        fill.style.width = (r.percent || 0) + '%';
        bar.appendChild(fill);
        li.appendChild(bar);
        li.appendChild(el('span', 'b-dist__n', String(r.count)));
        dist.appendChild(li);
      });
    };
    var ratings = function () { return $$('[data-filter-rating]:checked', root).map(function (c) { return Number(c.value); }); };
    var photosOnly = function () { var c = $('[data-filter-photos]', root); return !!(c && c.checked); };
    var filtering = function () { return ratings().length > 0 || photosOnly(); };
    var visible = function () {
      var rs = ratings(), po = photosOnly();
      var out = all.filter(function (r) { return (!rs.length || rs.indexOf(Number(r.rating)) > -1) && (!po || r.image); });
      var by = sort ? sort.value : 'recent';
      if (by === 'high') out.sort(function (a, b) { return b.rating - a.rating; });
      if (by === 'low') out.sort(function (a, b) { return a.rating - b.rating; });
      if (by === 'photos') out.sort(function (a, b) { return (b.image ? 1 : 0) - (a.image ? 1 : 0); });
      return out;
    };
    var paint = function () {
      var v = visible();
      list.innerHTML = '';
      v.slice(0, shown).forEach(function (r) { list.appendChild(reviewCard(r)); });
      clamp(list);
      if (empty) empty.hidden = v.length > 0;
      if (more) more.hidden = !(v.length > shown || (hasMore && !filtering()));
    };
    var paintPhotos = function () {
      if (!photos) return;
      var withPhoto = all.filter(function (r) { return r.image; }).slice(0, 12);
      photos.innerHTML = '';
      withPhoto.forEach(function (r) {
        var b = el('button', 'b-reviews__photo');
        b.type = 'button';
        b.setAttribute('aria-label', 'Open photo from ' + (r.name || 'a customer'));
        b.setAttribute('data-review-photo-src', r.image);
        var img = el('img');
        img.src = r.image;
        img.alt = '';
        img.loading = 'lazy';
        b.appendChild(img);
        photos.appendChild(b);
      });
      photos.hidden = withPhoto.length === 0;
    };
    var refilter = function () {
      shown = pageSize;
      var step = function () { if (filtering() && hasMore) return load().then(step); paint(); };
      step();
    };
    load().then(function () { paintPhotos(); paint(); });
    if (sort) sort.addEventListener('change', refilter);
    $$('[data-filter-rating], [data-filter-photos]', root).forEach(function (c) { c.addEventListener('change', refilter); });
    var reset = $('[data-filter-reset]', root);
    if (reset) reset.addEventListener('click', function () { $$('[data-filter-rating], [data-filter-photos]', root).forEach(function (c) { c.checked = false; }); refilter(); });
    if (filter) document.addEventListener('click', function (e) { if (filter.open && !filter.contains(e.target)) filter.open = false; });
    if (more) more.addEventListener('click', function () {
      more.disabled = true;
      var target = shown + pageSize;
      var step = function () { if (visible().length < target && hasMore) return load().then(step); shown = target; more.disabled = false; paint(); };
      step();
    });

    // Lightbox
    var box = $('[data-lightbox]', root), boxImg = $('[data-lightbox-img]', root), info = $('[data-lightbox-info]', root), pics = [], at = 0;
    var showPic = function (n) {
      at = (n + pics.length) % pics.length;
      var r = pics[at];
      boxImg.src = r.image;
      boxImg.alt = 'Photo from ' + (r.name || 'a customer');
      info.innerHTML = '';
      info.appendChild(stars(r.rating, 'b-stars--outline'));
      info.appendChild(el('p', 'b-review__who', r.name || ''));
      if (r.title) info.appendChild(el('p', 'b-review__title', r.title));
      info.appendChild(el('p', 'b-lightbox__text', r.content || ''));
    };
    var openBox = function (src) {
      pics = all.filter(function (r) { return r.image; });
      var i = pics.findIndex(function (r) { return r.image === src; });
      if (!box || i < 0) return;
      box.hidden = false;
      lockScroll(true);
      showPic(i);
      var c = $('.b-lightbox__close', box);
      if (c) c.focus({ preventScroll: true });
    };
    var closeBox = function () { if (box) { box.hidden = true; lockScroll(false); } };
    root.addEventListener('click', function (e) {
      var t = e.target.closest && e.target.closest('[data-review-photo-src]');
      if (t) openBox(t.getAttribute('data-review-photo-src'));
    });
    $$('[data-lightbox-close]', root).forEach(function (b) { b.addEventListener('click', closeBox); });
    $$('[data-lightbox-step]', root).forEach(function (b) { b.addEventListener('click', function () { showPic(at + Number(b.getAttribute('data-lightbox-step'))); }); });
    document.addEventListener('keydown', function (e) {
      if (!box || box.hidden) return;
      if (e.key === 'Escape') closeBox();
      if (e.key === 'ArrowRight') showPic(at + 1);
      if (e.key === 'ArrowLeft') showPic(at - 1);
    });
  }

  function initReviewForm() {
    var modal = $('[data-review-modal]'), form = $('[data-review-form]');
    if (!modal || !form) return;
    var msg = $('[data-review-msg]', form);
    var setOpen = function (on) { modal.hidden = !on; lockScroll(on); if (on) { var f = form.querySelector('input[name="name"]'); if (f) f.focus(); } };
    $$('[data-review-write]').forEach(function (b) { b.addEventListener('click', function () { setOpen(true); }); });
    $$('[data-review-close]', modal).forEach(function (b) { b.addEventListener('click', function () { setOpen(false); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !modal.hidden) setOpen(false); });
    var starsBox = $('[data-review-stars]', form);
    if (starsBox) starsBox.addEventListener('change', function () {
      var v = Number((form.querySelector('input[name="rating"]:checked') || {}).value) || 0;
      $$('label', starsBox).forEach(function (l, i) { l.classList.toggle('is-on', i < v); });
    });
    var showErrors = function (errors) {
      $$('[data-err]', form).forEach(function (p) { p.textContent = ''; });
      Object.keys(errors || {}).forEach(function (k) {
        var p = $('[data-err="' + k + '"]', form);
        var text = [].concat(errors[k]).join(' ');
        if (p) p.textContent = text; else if (msg) msg.textContent = text;
      });
    };
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var fd = new FormData(form), errors = {};
      if (!fd.get('rating')) errors.rating = 'Please choose a rating.';
      if (!String(fd.get('name') || '').trim()) errors.name = 'Please add your name.';
      if (String(fd.get('body') || '').trim().length < 10) errors.body = 'Please write at least 10 characters.';
      var photo = fd.get('photo');
      if (photo && !photo.size) fd.delete('photo');
      if (!fd.get('recommend')) fd.set('recommend', '0');
      showErrors(errors);
      if (Object.keys(errors).length) return;
      var btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      if (msg) msg.textContent = 'Sending…';
      Base.reviews.post(fd).then(function (r) {
        btn.disabled = false;
        if (r.ok) {
          form.reset();
          $$('label', starsBox).forEach(function (l) { l.classList.remove('is-on'); });
          if (msg) msg.textContent = 'Thank you! Your review will appear once it is approved.';
          return;
        }
        if (r.data && r.data.errors) showErrors(r.data.errors);
        if (msg) msg.textContent = (r.data && r.data.error && (r.data.error.message || r.data.error)) || (r.data && r.data.message) || 'Please check the form and try again.';
      }).catch(function () { btn.disabled = false; if (msg) msg.textContent = 'Network error. Please try again.'; });
    });
  }

  function initTestimonials() {
    var root = $('[data-testimonials]');
    if (!root || !cfg.productId) return;
    var count = Number(root.getAttribute('data-testimonials')) || 3, grid = $('[data-testi-grid]', root);
    productReviews().then(function (d) {
      var rs = (d && d.reviews) || [], withPhoto = rs.filter(function (r) { return r.image; });
      if (!withPhoto.length) return;
      grid.innerHTML = '';
      withPhoto.concat(rs.filter(function (r) { return !r.image; })).slice(0, count).forEach(function (r) {
        var card = el('article', 'b-testi__card');
        if (r.image) { var img = el('img', 'b-testi__img'); img.src = r.image; img.alt = ''; img.loading = 'lazy'; card.appendChild(img); }
        card.appendChild(stars(r.rating));
        if (r.title) card.appendChild(el('p', 'b-testi__title', r.title));
        card.appendChild(el('p', 'b-testi__text', r.content || ''));
        card.appendChild(el('p', 'b-testi__who', '– ' + (r.name || '')));
        grid.appendChild(card);
      });
    });
  }

  // Home: reviews of the store's products, interleaved across products, in a draggable carousel.
  function initHomeReviews() {
    var root = $('[data-home-reviews]');
    if (!root) return;
    var ids = Base.readJson($('[data-home-product-ids]', root), []) || [];
    if (!ids.length || !cfg.domain) return;
    var track = $('[data-carousel-track]', root), perProduct = [], next = 0, MAX = 60;
    var batch = function () {
      if (next >= ids.length) return Promise.resolve();
      var chunk = ids.slice(next, next + 6);
      next += 6;
      return Promise.all(chunk.map(function (id) {
        return Base.reviews.list(id, 0, 50).then(function (d) { return (d && d.reviews) || []; }).catch(function () { return []; });
      })).then(function (lists) {
        lists.forEach(function (l) { if (l.length) perProduct.push(l.slice().sort(function (a, b) { return (b.image ? 1 : 0) - (a.image ? 1 : 0); })); });
        return batch();
      });
    };
    batch().then(function () {
      var seen = {}, out = [];
      for (var round = 0; out.length < MAX; round++) {
        var any = false;
        for (var p = 0; p < perProduct.length && out.length < MAX; p++) {
          var r = perProduct[p][round];
          if (!r) continue;
          any = true;
          var key = (r.name || '') + '|' + (r.content || '');
          if (!seen[key]) { seen[key] = 1; out.push(r); }
        }
        if (!any) break;
      }
      if (!out.length) return;
      out.forEach(function (r) {
        var card = el('article', 'b-hrev');
        card.appendChild(stars(r.rating));
        if (r.title) card.appendChild(el('p', 'b-hrev__title', r.title));
        card.appendChild(el('p', 'b-hrev__text', r.content || ''));
        var foot = el('div', 'b-hrev__foot');
        if (r.image) { var img = el('img', 'b-hrev__avatar'); img.src = r.image; img.alt = ''; img.loading = 'lazy'; foot.appendChild(img); }
        foot.appendChild(el('span', 'b-hrev__name', '- ' + (r.name || '')));
        if (r.verified) { var tick = el('span', 'b-hrev__tick', '✓'); tick.setAttribute('aria-label', 'Verified buyer'); foot.appendChild(tick); }
        card.appendChild(foot);
        track.appendChild(card);
      });
      root.hidden = false;
      carouselDots(root, track);
    });
  }

  function carouselDots(root, track) {
    var dots = $('[data-carousel-dots]', root);
    if (!dots) return;
    var cards = Array.prototype.slice.call(track.children), GAP = 16, pages = 0;
    var perView = function () { var w = cards[0].getBoundingClientRect().width; return Math.max(1, Math.round((track.clientWidth + GAP) / (w + GAP))); };
    var page = function () { var w = cards[0].getBoundingClientRect().width + GAP; return Math.round(track.scrollLeft / (w * perView())); };
    var build = function () {
      dots.innerHTML = '';
      pages = Math.ceil(cards.length / perView());
      dots.classList.toggle('is-counter', pages > 15);
      if (pages < 2) return;
      if (pages > 15) { dots.textContent = page() + 1 + ' / ' + pages; return; }
      for (var i = 0; i < pages; i++) (function (n) {
        var d = el('button', 'b-dot' + (n === page() ? ' is-active' : ''));
        d.type = 'button';
        d.setAttribute('aria-label', 'Show page ' + (n + 1) + ' of ' + pages);
        d.addEventListener('click', function () {
          var c = cards[Math.min(cards.length - 1, n * perView())];
          track.scrollTo({ left: c.offsetLeft - track.offsetLeft, behavior: 'smooth' });
        });
        dots.appendChild(d);
      })(i);
    };
    build();
    track.addEventListener('scroll', function () {
      var p = page();
      if (dots.classList.contains('is-counter')) { dots.textContent = Math.min(p + 1, pages) + ' / ' + pages; return; }
      $$('.b-dot', dots).forEach(function (d, i) { d.classList.toggle('is-active', i === p); });
    }, { passive: true });
    var t = null;
    window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(build, 200); });
  }

  // Mouse drag for horizontal carousels (touch scrolls natively).
  function initDragScroll() {
    $$('[data-carousel-track]').forEach(function (track) {
      var x0 = 0, left0 = 0, dx = 0, down = false, dragging = false, t = null;
      var snap = function () {
        var cards = Array.prototype.slice.call(track.children);
        if (!cards.length) return;
        var base = cards[0].offsetLeft, best = 0, dist = Infinity;
        cards.forEach(function (c, i) { var d = Math.abs(c.offsetLeft - base - track.scrollLeft); if (d < dist) { dist = d; best = i; } });
        var pos = cards[best].offsetLeft - base;
        if (dx < -40 && pos < track.scrollLeft && best < cards.length - 1) best++;
        else if (dx > 40 && pos > track.scrollLeft && best > 0) best--;
        track.scrollTo({ left: cards[best].offsetLeft - base, behavior: 'smooth' });
        clearTimeout(t);
        t = setTimeout(function () { track.classList.remove('is-dragging'); }, 450);
      };
      track.addEventListener('pointerdown', function (e) {
        if (e.pointerType !== 'mouse' || e.button !== 0) return;
        down = true; dragging = false; dx = 0; x0 = e.clientX; left0 = track.scrollLeft;
      });
      window.addEventListener('pointermove', function (e) {
        if (!down) return;
        dx = e.clientX - x0;
        if (!dragging && Math.abs(dx) > 5) { dragging = true; clearTimeout(t); track.classList.add('is-dragging'); }
        if (dragging) { track.scrollLeft = left0 - dx; e.preventDefault(); }
      });
      window.addEventListener('pointerup', function () { if (down) { down = false; if (dragging) snap(); } });
      track.addEventListener('click', function (e) { if (dragging) { e.preventDefault(); e.stopPropagation(); dragging = false; } }, true);
      track.addEventListener('dragstart', function (e) { e.preventDefault(); });
    });
  }

  // ---------------------------------------------------------------------------------------------
  // Forms: contact, newsletter, order tracking.
  // ---------------------------------------------------------------------------------------------
  function initForms() {
    $$('[data-contact-form]').forEach(function (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var msg = $('[data-contact-msg]', form), fd = new FormData(form), btn = form.querySelector('button[type="submit"]');
        var email = String(fd.get('email') || '').trim(), message = String(fd.get('message') || '').trim();
        if (!email || !message) { msg.textContent = 'Please add your email and a message.'; return; }
        btn.disabled = true;
        Base.contact({ name: String(fd.get('name') || '').trim(), email: email, phone: String(fd.get('phone') || '').trim(), message: message, orderNumber: String(fd.get('orderNumber') || '').trim() })
          .then(function (r) {
            btn.disabled = false;
            if (r.ok) { form.reset(); msg.textContent = "Thanks for contacting us. We'll get back to you as soon as possible."; return; }
            var err = r.data && r.data.error;
            msg.textContent = (err && (err.message || err)) || 'Something went wrong. Please try again.';
          })
          .catch(function () { btn.disabled = false; msg.textContent = 'Network error. Please try again.'; });
      });
    });

    $$('[data-newsletter]').forEach(function (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var input = form.querySelector('input[name="email"]'), msg = $('[data-newsletter-msg]', form);
        var email = (input.value || '').trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { msg.textContent = 'Please enter a valid email.'; return; }
        Base.lead('Newsletter', email);
        form.reset();
        msg.textContent = 'Thanks for subscribing!';
      });
    });

    var track = $('[data-track]');
    if (track) {
      $$('[data-track-tab]', track).forEach(function (tab) {
        tab.addEventListener('click', function () {
          var which = tab.getAttribute('data-track-tab');
          $$('[data-track-tab]', track).forEach(function (t) { var on = t === tab; t.classList.toggle('is-active', on); t.setAttribute('aria-selected', on ? 'true' : 'false'); });
          $$('[data-track-form]', track).forEach(function (f) { f.hidden = f.getAttribute('data-track-form') !== which; });
        });
      });
      $$('[data-track-form]', track).forEach(function (form) {
        form.addEventListener('submit', function (e) {
          e.preventDefault();
          var fd = new FormData(form), msg = $('[data-track-msg]', form);
          var q = { order: String(fd.get('order') || '').trim(), email: String(fd.get('email') || '').trim(), trackingNumber: String(fd.get('trackingNumber') || '').trim() };
          if (form.getAttribute('data-track-form') === 'tracking' ? !q.trackingNumber : !q.order || !q.email) { msg.textContent = 'Please fill in every field.'; return; }
          location.href = Base.trackingResultUrl(q);
        });
      });
    }
  }

  // ---------------------------------------------------------------------------------------------
  // Collection (client-side price filter + sort) and search page.
  // ---------------------------------------------------------------------------------------------
  function initCollection() {
    var root = $('[data-collection]'), grid = root && $('[data-grid]', root);
    if (!grid) return;
    var cards = $$('.b-pcard', grid), counts = $$('[data-count]', root);
    var price = function (c) { return num(c.dataset.cardPriceNum); };
    var from = $('[data-price-from]', root), to = $('[data-price-to]', root), inStock = $('[data-avail-in]', root), sort = $('[data-sort]', root), empty = $('[data-empty]', root);
    var max = cards.reduce(function (m, c) { return Math.max(m, price(c)); }, 0);
    var maxEl = $('[data-price-max]', root);
    if (maxEl) maxEl.textContent = money(max) + ' ' + (cfg.currency || 'USD');
    if (to) to.max = String(Math.ceil(max));
    var availCount = $('[data-avail-count]', root);
    if (availCount) availCount.textContent = String(cards.length);
    var apply = function () {
      var lo = from && from.value !== '' ? Number(from.value) : 0, hi = to && to.value !== '' ? Number(to.value) : Infinity, n = 0;
      cards.forEach(function (c) { var ok = price(c) >= lo && price(c) <= hi; c.hidden = !ok; if (ok) n++; });
      var by = sort ? sort.value : '', ordered = cards.slice();
      var byTitle = function (a, b) { return String(a.dataset.cardTitle || '').localeCompare(String(b.dataset.cardTitle || '')); };
      if (by === 'title-asc') ordered.sort(byTitle);
      if (by === 'title-desc') ordered.sort(function (a, b) { return byTitle(b, a); });
      if (by === 'price-asc') ordered.sort(function (a, b) { return price(a) - price(b); });
      if (by === 'price-desc') ordered.sort(function (a, b) { return price(b) - price(a); });
      ordered.forEach(function (c) { grid.appendChild(c); });
      counts.forEach(function (c) { c.textContent = n + (n === 1 ? ' product' : ' products'); });
      if (empty) empty.hidden = n > 0;
      var sel = $('[data-avail-selected]', root);
      if (sel) sel.textContent = (inStock && inStock.checked ? 1 : 0) + ' selected';
    };
    [from, to].forEach(function (i) { if (i) i.addEventListener('input', apply); });
    if (inStock) inStock.addEventListener('change', apply);
    if (sort) sort.addEventListener('change', apply);
    var clear = function (which) {
      if (which !== 'avail') { if (from) from.value = ''; if (to) to.value = ''; }
      if (which !== 'price' && inStock) inStock.checked = false;
      apply();
    };
    [['[data-price-reset]', 'price'], ['[data-avail-reset]', 'avail'], ['[data-clear-all]', 'all'], ['[data-clear-all-drawer]', 'all']].forEach(function (pair) {
      var b = $(pair[0], root);
      if (b) b.addEventListener('click', function () { clear(pair[1]); });
    });
    var drawer = $('[data-facets-drawer]', root), opener = $('[data-facets-open]', root), t = null;
    var setDrawer = function (on) {
      if (!drawer) return;
      clearTimeout(t);
      if (opener) opener.setAttribute('aria-expanded', on ? 'true' : 'false');
      lockScroll(on);
      if (on) {
        drawer.setAttribute('role', 'dialog');
        drawer.setAttribute('aria-modal', 'true');
        drawer.classList.add('is-mounted');
        requestAnimationFrame(function () { requestAnimationFrame(function () { drawer.classList.add('is-open'); }); });
      } else {
        drawer.removeAttribute('role');
        drawer.removeAttribute('aria-modal');
        drawer.classList.remove('is-open');
        t = setTimeout(function () { drawer.classList.remove('is-mounted'); }, 320);
        if (opener) opener.focus({ preventScroll: true });
      }
    };
    if (opener) opener.addEventListener('click', function () { setDrawer(true); });
    $$('[data-facets-close]', root).forEach(function (b) { b.addEventListener('click', function () { setDrawer(false); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && drawer && drawer.classList.contains('is-open')) setDrawer(false); });
    window.addEventListener('resize', function () { if (window.innerWidth >= 750 && drawer && drawer.classList.contains('is-open')) setDrawer(false); });
    var facets = $$('[data-facet]', root);
    facets.forEach(function (f) { f.addEventListener('toggle', function () { if (f.open) facets.forEach(function (o) { if (o !== f) o.open = false; }); }); });
    document.addEventListener('click', function (e) { facets.forEach(function (f) { if (f.open && !f.contains(e.target)) f.open = false; }); });
    apply();
  }

  function initSearchPage() {
    var root = $('[data-search-page]');
    if (!root) return;
    var q = (new URLSearchParams(location.search).get('q') || '').trim(), input = $('[data-search-page-input]', root);
    if (input) input.value = q;
    var words = q.toLowerCase().split(/\s+/).filter(Boolean), n = 0;
    $$('[data-search-text]', root).forEach(function (hit) {
      var text = String(hit.getAttribute('data-search-text') || '').toLowerCase();
      var ok = words.every(function (w) { return text.indexOf(w) > -1; });
      hit.hidden = !ok;
      if (ok) n++;
    });
    var count = $('[data-count]', root), empty = $('[data-search-empty]', root);
    if (count) count.textContent = q ? n + ' result' + (n === 1 ? '' : 's') + ' for "' + q + '"' : '';
    if (empty) empty.hidden = n > 0;
    if (q) Base.search(q);
  }

  // ---------------------------------------------------------------------------------------------
  // Home: featured product (loads its product page for gallery + variants), comparison rows.
  // ---------------------------------------------------------------------------------------------
  function initFeatured() {
    var root = $('[data-featured]');
    if (!root) return;
    var url = root.getAttribute('data-featured'), thumbs = $('[data-featured-thumbs]', root), strip = $('[data-featured-strip]', root);
    var select = $('[data-featured-select]', root), atc = $('[data-featured-atc]', root), qty = $('[data-featured-qty-input]', root);
    var pcfg = null, pvars = [];
    $$('[data-featured-qty-step]', root).forEach(function (b) {
      b.addEventListener('click', function () { qty.value = String(Math.min(999, Math.max(1, (parseInt(qty.value, 10) || 1) + Number(b.getAttribute('data-featured-qty-step'))))); });
    });
    var chosen = function () {
      var list = (pcfg && pcfg.variants) || [];
      return list.filter(function (v) { return v.id === (select && select.value); })[0] || list[0] || null;
    };
    var full = function (v) { return pvars.filter(function (x) { return x.id === v.id; })[0] || {}; };
    var paint = function () {
      var v = chosen();
      if (!v) return;
      var f = full(v), priceEl = $('[data-featured-price]', root), cmpEl = $('[data-featured-compare]', root), cmp = num(f.compare_at_price);
      if (priceEl) priceEl.textContent = money(v.price);
      if (cmpEl) cmpEl.textContent = cmp > v.price ? money(cmp) : '';
      if (f.featured_image && $('[data-featured-main]', root)) { swapMedia($('[data-featured-main]', root), f.featured_image, 'data-featured-main'); markThumb(thumbs, f.featured_image); }
    };
    fetch(url, { credentials: 'include' }).then(function (r) { return r.text(); }).then(function (html) {
      var doc = new DOMParser().parseFromString(html, 'text/html');
      pcfg = Base.readJson(doc.getElementById('sf-config'), null);
      pvars = Base.readJson(doc.getElementById('sf-variants-data'), []) || [];
      if (!pcfg || !(pcfg.variants || []).length) return;
      var media = $$('[data-gallery-thumb]', doc).map(function (t) {
        var img = t.querySelector('img');
        return { src: t.getAttribute('data-gallery-thumb'), preview: img ? img.getAttribute('src') : '' };
      });
      if (media.length > 1 && thumbs) {
        media.forEach(function (m, i) {
          var b = el('button', 'b-thumb' + (i === 0 ? ' is-active' : ''));
          b.type = 'button';
          b.setAttribute('aria-label', 'Show image ' + (i + 1));
          b.setAttribute('data-gallery-thumb', m.src);
          var img = el('img');
          img.src = m.preview || m.src;
          img.alt = '';
          img.loading = 'lazy';
          b.appendChild(img);
          b.addEventListener('click', function () {
            swapMedia($('[data-featured-main]', root), m.src, 'data-featured-main');
            $$('.b-thumb', thumbs).forEach(function (x) { x.classList.toggle('is-active', x === b); });
            centerInStrip(thumbs, b);
          });
          thumbs.appendChild(b);
        });
        strip.hidden = false;
        $$('[data-featured-step]', root).forEach(function (s) {
          s.addEventListener('click', function () {
            var all = $$('.b-thumb', thumbs), i = all.findIndex(function (x) { return x.classList.contains('is-active'); });
            all[(i + Number(s.getAttribute('data-featured-step')) + all.length) % all.length].click();
          });
        });
      }
      if (pcfg.variants.length > 1 && select) {
        pcfg.variants.forEach(function (v) {
          var o = el('option', '', (v.display_name || (v.options || []).join(' / ')) + ' — ' + money(v.price));
          o.value = v.id;
          select.appendChild(o);
        });
        select.addEventListener('change', paint);
        $('[data-featured-variant]', root).hidden = false;
      }
      paint();
      atc.disabled = false;
    }).catch(function () {});
    if (atc) atc.addEventListener('click', function () {
      var v = chosen();
      if (!v || !pcfg) return;
      var f = full(v);
      Base.cart.add({
        variantId: v.id, variant: (v.options || []).join(' / '), qty: Math.min(999, Math.max(1, parseInt(qty.value, 10) || 1)),
        title: pcfg.title || '', handle: pcfg.handle || '', productId: pcfg.productId || '', url: url,
        image: f.featured_image || pcfg.image || '', price: v.price, comparePrice: num(f.compare_at_price) || undefined
      });
    });
  }

  function initHomeCompare() {
    var root = $('[data-home-compare]');
    if (!root) return;
    var table = $('[data-compare-table]', root);
    var rows = String(root.getAttribute('data-home-compare') || '').split(/\r?\n/).map(function (l) { return l.split('|'); }).filter(function (r) { return r[0] && r[0].trim(); });
    if (!rows.length) { root.hidden = true; return; }
    var mark = function (v) {
      var yes = /^(y|yes|true|1|x|✓)$/i.test(String(v || '').trim());
      var s = el('span', yes ? 'b-yes' : 'b-no', yes ? '✓' : '✕');
      s.setAttribute('aria-label', yes ? 'Yes' : 'No');
      return s;
    };
    var head = el('div', 'b-compare__head');
    head.setAttribute('role', 'row');
    [[root.getAttribute('data-ours'), 'side'], ['', 'mid'], [root.getAttribute('data-theirs'), 'side']].forEach(function (c) {
      var cell = el('div', 'b-compare__' + c[1]);
      cell.setAttribute('role', 'columnheader');
      if (c[0]) cell.appendChild(el('span', '', c[0]));
      head.appendChild(cell);
    });
    table.appendChild(head);
    rows.forEach(function (r) {
      var row = el('div', 'b-compare__row'), ours = el('div', 'b-compare__side'), mid = el('div', 'b-compare__mid', r[0].trim()), theirs = el('div', 'b-compare__side');
      row.setAttribute('role', 'row');
      [ours, mid, theirs].forEach(function (c) { c.setAttribute('role', 'cell'); });
      ours.appendChild(mark(r[1]));
      theirs.appendChild(mark(r[2]));
      row.appendChild(ours);
      row.appendChild(mid);
      row.appendChild(theirs);
      table.appendChild(row);
    });
  }

  // ---------------------------------------------------------------------------------------------
  // Decoration: marquee loop, accordions, video reels, card entrance, numbered features.
  // ---------------------------------------------------------------------------------------------
  function initMarquee() {
    $$('[data-split-marquee]').forEach(function (m) {
      var track = $('.b-marquee__track', m);
      String(m.getAttribute('data-split-marquee') || '').split('||').map(function (s) { return s.trim(); }).filter(Boolean).forEach(function (t) {
        var item = el('span', 'b-marquee__item');
        item.appendChild(el('span', 'b-check', '✓'));
        item.firstChild.setAttribute('aria-hidden', 'true');
        item.appendChild(document.createTextNode(t));
        track.appendChild(item);
      });
    });
    var strips = $$('.b-marquee');
    if (!strips.length) return;
    var SPEED = 70; // px per second
    var fill = function () {
      strips.forEach(function (m) {
        var track = $('.b-marquee__track', m);
        if (!track) return;
        var originals = track.__originals || $$('.b-marquee__item:not([aria-hidden])', track).map(function (n) { return n.cloneNode(true); });
        track.__originals = originals;
        if (!originals.length) return;
        track.innerHTML = '';
        var add = function (hidden) {
          originals.forEach(function (n) {
            var c = n.cloneNode(true);
            if (hidden) { c.setAttribute('aria-hidden', 'true'); c.removeAttribute('data-block-id'); c.removeAttribute('data-block-type'); }
            track.appendChild(c);
          });
        };
        add(false);
        for (var i = 0; track.scrollWidth < m.clientWidth + 1 && i++ < 40;) add(true);
        var width = track.scrollWidth;
        Array.prototype.slice.call(track.children).forEach(function (c) { track.appendChild(c.cloneNode(true)).setAttribute('aria-hidden', 'true'); });
        track.style.setProperty('--b-marquee-dur', Math.max(8, width / SPEED).toFixed(2) + 's');
        track.style.animation = 'none';
        void track.offsetWidth;
        track.style.animation = '';
      });
    };
    fill();
    var t = null, w = window.innerWidth;
    window.addEventListener('resize', function () {
      if (Math.abs(window.innerWidth - w) < 40) return;
      w = window.innerWidth;
      clearTimeout(t);
      t = setTimeout(fill, 200);
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fill);
  }

  function initAccordions() {
    var SEL = 'details.b-faq__item, details.b-acc';
    var body = function (d) { return d.querySelector(':scope > :not(summary)'); };
    var open = function (b) { var s = getComputedStyle(b); return { height: b.offsetHeight + 'px', paddingTop: s.paddingTop, paddingBottom: s.paddingBottom, opacity: 1 }; };
    var shut = { height: '0px', paddingTop: '0px', paddingBottom: '0px', opacity: 0 };
    var animate = function (d, b, from, to, ms, done) {
      d.classList.add('is-animating');
      b.style.overflow = 'hidden';
      var a = b.animate([from, to], { duration: ms, easing: 'cubic-bezier(.33, 1, .68, 1)' });
      a.onfinish = function () { done(); b.style.overflow = ''; d.classList.remove('is-animating'); };
    };
    document.addEventListener('click', function (e) {
      var summary = e.target.closest && e.target.closest('summary');
      var d = summary && summary.parentElement;
      if (!d || !d.matches(SEL)) return;
      e.preventDefault();
      if (d.classList.contains('is-animating')) return;
      var b = body(d);
      if (d.open) {
        if (reduceMotion || !b || !b.animate) { d.open = false; return; }
        animate(d, b, open(b), shut, 240, function () { d.open = false; });
      } else {
        d.open = true;
        if (!reduceMotion && b && b.animate) animate(d, b, shut, open(b), 300, function () {});
      }
    });
  }

  // Video row section and Image / video slider block: muted videos play while on screen, a tap pauses /
  // resumes, arrows step one slide. An <img> whose file is a video (not yet swapped by the server) becomes one.
  function initReels() {
    $$('[data-reels]').forEach(function (root) {
      var track = $('[data-reels-track]', root), nav = $('[data-reels-nav]', root);
      $$('img[data-reel-video]', root).forEach(function (img) {
        if (isVideo(img.getAttribute('src'))) swapMedia(img, img.getAttribute('src'), 'data-reel-video');
      });
      var media = $$('[data-reel-video]', root);
      media.forEach(function (v) {
        var fig = v.closest('[data-reel], .b-reel');
        v.addEventListener('error', function () { if (fig) fig.hidden = true; });
      });
      var videos = media.filter(function (v) { return v.tagName === 'VIDEO'; });
      videos.forEach(function (v) {
        var fig = v.closest('[data-reel], .b-reel');
        v.addEventListener('click', function () {
          if (!fig) return;
          if (v.paused) { v.play().catch(function () {}); fig.classList.remove('is-paused'); v.__userPaused = false; }
          else { v.pause(); fig.classList.add('is-paused'); v.__userPaused = true; }
        });
      });
      if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (e) {
            var v = e.target;
            if (!v.play) return;
            if (e.intersectionRatio >= 0.6 && !v.__userPaused) v.play().catch(function () {}); else v.pause();
          });
        }, { threshold: [0, 0.6, 1] });
        videos.forEach(function (v) { io.observe(v); });
      }
      if (track && nav) {
        var fit = function () { nav.hidden = track.scrollWidth <= track.clientWidth + 2; };
        fit();
        window.addEventListener('resize', fit);
        $$('[data-reels-step]', nav).forEach(function (b) {
          b.addEventListener('click', function () {
            var r = track.firstElementChild, gap = parseFloat(getComputedStyle(track).columnGap) || 16;
            var w = r ? r.getBoundingClientRect().width + gap : track.clientWidth;
            track.scrollBy({ left: w * Number(b.getAttribute('data-reels-step')), behavior: 'smooth' });
          });
        });
      }
    });
  }

  // Popups: a [data-modal-open] button opens the [data-modal] next to it (same parent); [data-modal-close], Esc
  // or the overlay closes it. The popup moves under <body> so a sticky / transformed column cannot clip it.
  function initModals() {
    $$('[data-modal-open]').forEach(function (btn) {
      var modal = $('[data-modal]', btn.parentElement);
      if (!modal) return;
      document.body.appendChild(modal);
      var setOpen = function (on) {
        modal.hidden = !on;
        lockScroll(on);
        if (on) { var c = $('[data-modal-close].b-modal__close', modal) || $('[data-modal-close]', modal); if (c) c.focus(); } else btn.focus();
      };
      btn.addEventListener('click', function () { setOpen(true); });
      $$('[data-modal-close]', modal).forEach(function (c) { c.addEventListener('click', function () { setOpen(false); }); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !modal.hidden) setOpen(false); });
    });
  }

  // Size chart block: with an option name set, only products that have that option keep it.
  function initSizeChart() {
    $$('[data-size-chart]').forEach(function (box) {
      var want = String(box.getAttribute('data-option') || '').trim().toLowerCase();
      if (!want) return;
      var names = String(box.getAttribute('data-options') || '').toLowerCase().split('|').map(function (n) { return n.trim(); });
      box.hidden = names.indexOf(want) === -1;
    });
  }

  function initCardEntrance() {
    var cards = $$('[data-grid] .b-pcard, .b-grid .b-pcard');
    if (!cards.length || reduceMotion || !('IntersectionObserver' in window)) return;
    var n = 0, t = null;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var c = e.target;
        io.unobserve(c);
        c.style.setProperty('--i', String(Math.min(n++, 8)));
        c.classList.add('is-entering');
        c.addEventListener('animationend', function done() {
          c.classList.remove('is-pending', 'is-entering');
          c.style.removeProperty('--i');
          c.removeEventListener('animationend', done);
        });
      });
      clearTimeout(t);
      t = setTimeout(function () { n = 0; }, 120);
    }, { rootMargin: '0px 0px -40px 0px', threshold: 0.05 });
    // Only cards below the fold animate; a fast scroll can skip the observer, so nothing stays hidden.
    cards.forEach(function (c) {
      if (c.getBoundingClientRect().top < window.innerHeight) return;
      c.classList.add('is-pending');
      io.observe(c);
    });
    var reveal = function () { cards.forEach(function (c) { if (c.getBoundingClientRect().top < window.innerHeight) c.classList.remove('is-pending'); }); };
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () { ticking = false; reveal(); });
    }, { passive: true });
  }

  function initFeatureNumbers() {
    $$('[data-feature-num]').forEach(function (n, i) { n.textContent = (i < 9 ? '0' : '') + (i + 1); });
  }

  function start() {
    [initTopbar, initHeader, initGallery, initProductForm, initSticky, initUrgency, initCart, initReviews, initReviewForm,
      initTestimonials, initHomeReviews, initDragScroll, initForms, initCollection, initSearchPage, initFeatured, initHomeCompare,
      initMarquee, initAccordions, initReels, initSizeChart, initModals, initCardEntrance, initFeatureNumbers].forEach(function (fn) {
      try { fn(); } catch (e) { if (window.console) console.error(e); }
    });
  }

  window.BaseUI = { openCart: openCart, closeCart: closeCart, refreshProduct: refreshProduct, renderCart: renderCart, swapMedia: swapMedia };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
