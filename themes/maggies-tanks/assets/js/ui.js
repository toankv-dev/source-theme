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
      // Animated like the cart drawer: shown, then .is-open on the next frames (overlay fades, panel slides in,
      // links rise one after another); closing removes .is-open and hides once the transition is over.
      var menuTimer = null, menuFocus = null;
      var setMenu = function (on) {
        if (on === !drawer.hidden && on === drawer.classList.contains('is-open')) return;
        clearTimeout(menuTimer);
        openBtn.setAttribute('aria-expanded', on ? 'true' : 'false');
        lockScroll(on);
        if (on) {
          menuFocus = document.activeElement;
          drawer.hidden = false;
          requestAnimationFrame(function () {
            requestAnimationFrame(function () {
              drawer.classList.add('is-open');
              var c = $('[data-menu-close]:not(.b-menu-drawer__overlay)', drawer);
              if (c) c.focus({ preventScroll: true });
            });
          });
        } else {
          drawer.classList.remove('is-open');
          menuTimer = setTimeout(function () { if (!drawer.classList.contains('is-open')) drawer.hidden = true; }, reduceMotion ? 0 : 320);
          if (menuFocus && menuFocus.focus) menuFocus.focus({ preventScroll: true });
        }
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

  function fileName(url) { return String(url || '').split(/[?#]/)[0].split('/').pop(); }

  /** The gallery entry (in `strip`) that shows a colour swatch's picture, as its data-gallery-thumb URL, else ''.
   *  A swatch picture chosen among the product's images (Products → Options → the value's image) is the same upload
   *  as its gallery entry, so the file names match; a picture cropped for the swatch is in no gallery. Reads the
   *  style attribute: the landing's swatches come from a parsed copy of the product page. */
  function swatchGalleryUrl(strip, btn) {
    var m = btn && /url\(\s*['"]?([^'")]+)/.exec(btn.getAttribute('style') || '');
    var name = m && fileName(m[1]);
    if (!strip || !name) return '';
    var hit = $$('[data-gallery-thumb]', strip).filter(function (t) { return fileName(t.getAttribute('data-gallery-thumb')) === name; })[0];
    return hit ? hit.getAttribute('data-gallery-thumb') : '';
  }

  /** Product page gallery: the main image shows this picture; its thumbnail is marked and scrolled into view. */
  function showGalleryUrl(src) {
    var main = $('[data-gallery-main]');
    if (!src || !main) return;
    swapMedia(main, src, 'data-gallery-main');
    markThumb($('[data-gallery-thumbs]'), src);
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

  /** A pack card's "SAVE x%" pill (Pack cards block: show_save, save_label, save_color), from its price and crossed-out
   *  price. A template saved before these settings existed has none of them: on, "SAVE {pct}%", the CSS colour. */
  function paintSave(card, s, total, compare) {
    var el = $('[data-card-save]', card);
    if (!el) return;
    var pct = compare > total && total > 0 ? Math.round((1 - total / compare) * 100) : 0;
    el.hidden = s.show_save === false || pct <= 0;
    if (el.hidden) return;
    el.textContent = String(s.save_label || 'SAVE {pct}%').replace('{pct}', String(pct));
    el.style.background = s.save_color || '';
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
        paintSave(card, s, v ? total : 0, v ? compare : 0);
        var img = $('[data-qcard-img]', card), qtyMark = $('.b-card__qty', card), src = (v && v.image) || cfg.image || '';
        if (img && src) { img.src = src; img.hidden = false; if (qtyMark) qtyMark.hidden = false; }
        // "$18.00 / Pair": the pack total per unit (block setting unit_label; empty = hidden, 1-packs hidden).
        var unitEl = $('[data-card-unit]', card);
        if (unitEl) {
          var unitText = v && s.unit_label && qty > 1 && total > 0 ? money(Base.round2(total / qty)) + ' / ' + s.unit_label : '';
          unitEl.textContent = unitText;
          unitEl.hidden = !unitText;
        }
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
        inc.hidden = !html || (!s.includes_all && !card.classList.contains('is-selected'));
      }
    });
  }

  // ---------------------------------------------------------------------------------------------
  // Volume bundle: the chosen quantity pack opens one row per unit (picture + one select per option),
  // so a 2-pack can be Black / M + Green / L. Rows start from the main pickers and reset when those
  // change. Add to cart then sends one line per distinct variant; core.js prices the tiers on the
  // product's total quantity, so mixing keeps the pack discount. Pack cards setting unit_pickers.
  // ---------------------------------------------------------------------------------------------
  var unitVals = [], unitKey = null;

  function unitRowsOn() {
    return !!(packs && packs.kind === 'qty' && (packs.settings || {}).unit_pickers && $$('[data-opt]').length);
  }

  function optionNames() {
    return $$('[data-opt]').map(function (g) {
      var l = $('legend', g);
      return l && l.firstChild ? l.firstChild.textContent.replace(/:\s*$/, '').trim() : '';
    });
  }

  function optionChoices(i) {
    var g = $('[data-opt="' + i + '"]');
    if (!g) return [];
    var sel = $('[data-opt-select]', g);
    if (sel) return [].map.call(sel.options, function (o) { return { value: o.value, label: o.text }; });
    return $$('[data-opt-value]', g).map(function (b) {
      return { value: b.getAttribute('data-opt-value'), label: b.getAttribute('data-opt-display') || b.getAttribute('data-opt-value'), btn: b };
    });
  }

  // Colour names CSS has no word for, so the dots work before anyone fills in the product's swatches.
  var COLOR_NAMES = {
    nude: '#e3bfa3', coffee: '#6f4e37', khaki: '#c3b091', 'red wine': '#722f37', 'blush pink': '#f1c4cc', grey: '#8d8d8d', gray: '#8d8d8d',
    'pastel pink': '#f8c8dc', 'pastel yellow': '#fbf0a6', 'pastel purple': '#cdbbe8', 'pastel blue': '#b7d5ee', 'navy blue': '#1f2a44',
    burgundy: '#7b1e2f', wine: '#722f37', cream: '#f5efdc', mocha: '#7b5b4a', taupe: '#b09f91', sand: '#d9c7a8', mint: '#bfe3d0', rose: '#e8b4b8', blush: '#f1c4cc'
  };

  /** Dot of a colour value, as a CSS background: the swatch's own picture or colour, else what its name says. */
  function dotColor(choice) {
    if (!choice) return '';
    var st = choice.btn && choice.btn.style;
    // The swatch button's style is "background:<colour>" or "background-image:url(…)". The shorthand leaves
    // backgroundImage as "initial", not "none": only a real url() is a picture.
    if (st && /url\(/.test(st.backgroundImage || '')) return st.backgroundImage + ' center / cover';
    if (st && st.backgroundColor) return st.backgroundColor;
    var name = String(choice.value || '').replace(/\(.*?\)/g, '').trim().toLowerCase(); // "White (selling out fast)" = white
    if (COLOR_NAMES[name]) return COLOR_NAMES[name];
    var words = name.split(/[\s&\/-]+/);
    var known = [name.replace(/\s+/g, ''), words[0], words[words.length - 1]].filter(function (w) {
      return w && window.CSS && CSS.supports && CSS.supports('color', w);
    });
    return known[0] || '';
  }

  // The colour field of a unit row: a list that shows each colour's dot, which a native <select> cannot. The <select>
  // stays under it, invisible, as the value: the row's change handler, the cart lines and tools/smoke.js use it as before.
  var openColors = null;
  function closeColors(refocus) {
    if (!openColors) return;
    var o = openColors;
    openColors = null;
    o.list.hidden = true;
    o.wrap.classList.remove('is-open');
    o.btn.setAttribute('aria-expanded', 'false');
    if (refocus) o.btn.focus();
  }
  document.addEventListener('pointerdown', function (e) {
    if (openColors && !openColors.wrap.contains(e.target)) closeColors();
  }, true);

  function colorField(s, choices, wrap) {
    var label = s.getAttribute('aria-label') || '';
    var btn = el('button', 'b-unit__select b-unit__color');
    btn.type = 'button';
    btn.setAttribute('aria-haspopup', 'listbox');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', label);
    var list = el('ul', 'b-colors');
    list.setAttribute('role', 'listbox');
    list.setAttribute('aria-label', label);
    list.hidden = true;
    var items = choices.map(function (c) {
      var li = el('li', 'b-colors__item');
      li.setAttribute('role', 'option');
      li.tabIndex = -1;
      var dot = el('span', 'b-colors__dot');
      dot.setAttribute('aria-hidden', 'true');
      dot.style.background = dotColor(c);
      li.appendChild(dot);
      li.appendChild(el('span', null, c.label));
      list.appendChild(li);
      return li;
    });
    var current = function () { return choices.map(function (c) { return c.value; }).indexOf(s.value); };
    var sync = function () {
      var at = current();
      btn.textContent = at > -1 ? choices[at].label : '';
      items.forEach(function (li, i) { li.setAttribute('aria-selected', i === at ? 'true' : 'false'); });
    };
    var move = function (i) {
      var li = items[Math.max(0, Math.min(items.length - 1, i))];
      if (!li) return;
      li.focus({ preventScroll: true });
      list.scrollTop = Math.max(0, li.offsetTop - (list.clientHeight - li.offsetHeight) / 2);
    };
    var open = function () {
      closeColors();
      var r = btn.getBoundingClientRect();
      wrap.classList.toggle('is-up', r.bottom + 290 > window.innerHeight && r.top > 290);
      wrap.classList.add('is-open');
      list.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
      openColors = { btn: btn, list: list, wrap: wrap };
      move(current());
    };
    var pick = function (i) {
      if (!choices[i]) return;
      s.value = choices[i].value;
      s.dispatchEvent(new Event('change', { bubbles: true }));
      closeColors(true);
    };
    btn.addEventListener('click', function () { if (openColors && openColors.btn === btn) closeColors(); else open(); });
    btn.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); open(); }
    });
    list.addEventListener('click', function (e) {
      var li = e.target.closest ? e.target.closest('.b-colors__item') : null;
      if (li) pick(items.indexOf(li));
    });
    list.addEventListener('keydown', function (e) {
      var at = items.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); move(at + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); move(at - 1); }
      else if (e.key === 'Home') { e.preventDefault(); move(0); }
      else if (e.key === 'End') { e.preventDefault(); move(items.length - 1); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(at); }
      else if (e.key === 'Escape') { e.preventDefault(); closeColors(true); }
      else if (e.key === 'Tab') closeColors();
    });
    s.addEventListener('change', sync);
    s.className = 'b-unit__native';
    s.tabIndex = -1;
    s.setAttribute('aria-hidden', 'true');
    wrap.appendChild(btn);
    wrap.appendChild(list);
    sync();
  }

  function renderUnits() {
    if (!packs || packs.kind !== 'qty') return;
    var on = unitRowsOn(), base = selectedValues(), key = base.join('|');
    if (key !== unitKey) { unitKey = key; unitVals = []; }
    var names = on ? optionNames() : [], choices = names.map(function (n, i) { return optionChoices(i); });
    $$('[data-qcard]', packs.el).forEach(function (card) {
      var box = $('[data-unit-rows]', card);
      if (!box) return;
      var show = on && card.classList.contains('is-selected');
      box.innerHTML = '';
      box.hidden = !show;
      if (!show) return;
      var qty = Math.min(12, Number(card.getAttribute('data-qty')) || 1);
      box.appendChild(el('p', 'b-units__label', names.join(', ')));
      for (var k = 0; k < qty; k++) box.appendChild(unitRow(k, base, names, choices));
    });
  }

  function unitRow(k, base, names, choices) {
    var vals = unitVals[k] = unitVals[k] || base.slice();
    var row = el('div', 'b-unit');
    // Picking inside a row must not re-select (and re-render) the card.
    ['click', 'keydown'].forEach(function (t) { row.addEventListener(t, function (e) { e.stopPropagation(); }); });
    var img = el('img', 'b-unit__img');
    img.alt = '';
    img.width = 36;
    img.height = 44;
    row.appendChild(img);
    var dots = [];
    var paint = function () {
      var v = Base.variants.find(vals);
      var src = (v && v.image) || cfg.image || '';
      if (src && img.getAttribute('src') !== src) img.src = src;
      row.classList.toggle('is-unavailable', !v);
      dots.forEach(function (d) {
        var c = dotColor(choices[d.i].filter(function (x) { return x.value === vals[d.i]; })[0]);
        d.el.style.background = c;
        d.el.hidden = !c;
      });
    };
    names.forEach(function (name, i) {
      var wrap = el('span', 'b-unit__sel');
      if (/colou?r/i.test(name)) {
        var dot = el('span', 'b-unit__dot');
        dot.setAttribute('aria-hidden', 'true');
        wrap.appendChild(dot);
        wrap.classList.add('has-dot');
        dots.push({ i: i, el: dot });
      }
      var s = el('select', 'b-unit__select');
      s.setAttribute('aria-label', name + ' ' + (k + 1));
      s.setAttribute('data-unit-select', String(i));
      choices[i].forEach(function (c) {
        var o = el('option', null, c.label);
        o.value = c.value;
        s.appendChild(o);
      });
      s.value = vals[i];
      s.addEventListener('change', function () {
        vals[i] = s.value;
        paint();
        // The gallery shows this unit: its variant's picture, else the picked colour's picture when the gallery has it.
        var v = Base.variants.find(vals), c = choices[i].filter(function (x) { return x.value === s.value; })[0];
        showGalleryUrl((v && v.image) || swatchGalleryUrl($('[data-gallery-thumbs]'), c && c.btn));
      });
      wrap.appendChild(s);
      if (wrap.classList.contains('has-dot')) colorField(s, choices[i], wrap);
      row.appendChild(wrap);
    });
    paint();
    return row;
  }

  /** Cart lines for the chosen pack's unit rows (one line per distinct variant), or null. */
  function unitLines(fallback) {
    if (!unitRowsOn() || !unitVals.length) return null;
    var qty = chosenQty(), groups = {}, order = [];
    for (var k = 0; k < qty; k++) {
      var v = (unitVals[k] && Base.variants.find(unitVals[k])) || fallback;
      if (!groups[v.id]) { groups[v.id] = { v: v, q: 0 }; order.push(v.id); }
      groups[v.id].q++;
    }
    return order.map(function (id) { return cartLine(groups[id].v, groups[id].q); });
  }

  var shownVariant = null; // id of the variant the gallery and ?variant= follow (refreshProduct)

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
    renderUnits();
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
    var sCompare = $('[data-sticky-compare]'), sOff = $('[data-sticky-off]'), sSel = $('[data-sticky-variant]');
    if (sCompare) { sCompare.textContent = p.compare > p.total ? money(p.compare) : ''; sCompare.hidden = !(p.compare > p.total); }
    if (sOff) {
      var sPct = p.compare > p.total ? Math.round((1 - p.total / p.compare) * 100) : 0;
      sOff.hidden = !sPct;
      if (sPct) sOff.textContent = sOff.textContent.replace(/\d+%/, sPct + '%');
    }
    if (sSel && sSel.value !== String(v.id)) sSel.value = String(v.id);
    // Only a change of variant moves the gallery to its picture and writes ?variant= (a pack card, the quantity or a
    // repaint leaves both). Page load without ?variant=: initProductForm marks the default one as shown, so the
    // address stays clean and the product's main image stays until the shopper picks another variant.
    if (String(v.id) !== shownVariant) {
      shownVariant = String(v.id);
      if (v.image) showGalleryUrl(v.image);
      if ($('[data-pdp]')) Base.variants.setUrl(v.id);
    }
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

    // Buy buttons → hide_options ("bundles only"): the pickers stay in the page because the pack unit rows read
    // their names / values. Without unit rows nothing else would pick the variant, so they show again; with them
    // the sticky bar's variant select goes too (the rows pick every unit).
    var hiddenPickers = $$('[data-options-hidden]');
    if (hiddenPickers.length) {
      if (!unitRowsOn()) hiddenPickers.forEach(function (o) { o.hidden = false; });
      else $$('[data-sticky-variant]').forEach(function (s) { (s.closest('.b-sticky__variant') || s).hidden = true; });
    }

    $$('[data-opt]').forEach(function (group) {
      $$('[data-opt-value]', group).forEach(function (btn) {
        btn.addEventListener('click', function () {
          $$('[data-opt-value]', group).forEach(function (b) {
            b.classList.toggle('is-active', b === btn);
            b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
          });
          refreshProduct();
          // A variant without a picture of its own: the gallery goes to the picked colour's picture, when it has it.
          var v = currentVariant();
          if (!(v && v.image)) showGalleryUrl(swatchGalleryUrl($('[data-gallery-thumbs]'), btn));
        });
      });
      var sel = $('[data-opt-select]', group);
      if (sel) sel.addEventListener('change', refreshProduct);
    });

    // ?variant= restores the selection; a default selection that is no real variant falls back to the
    // first available one, so prices and the buy button work on first paint.
    var fromUrl = Base.variants.fromUrl(), inUrl = !!fromUrl;
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

    // Opened without ?variant=: the default selection is no pick of the shopper. No ?variant= is added and the main
    // image stays the product's. With ?variant= (a shared link) that variant's picture shows, as before.
    if (!inUrl) { var dv = currentVariant(); shownVariant = dv ? String(dv.id) : null; }
    if ($('[data-pdp]')) refreshProduct();
  }

  function optionName(i) {
    var cards = $('[data-cards="' + i + '"]'), legend = $('[data-opt="' + i + '"] legend');
    if (cards) return cards.getAttribute('data-cards-name');
    return legend && legend.firstChild ? legend.firstChild.textContent.replace(/:\s*$/, '').trim() : 'Option ' + (i + 1);
  }

  function cartLine(v, qty) {
    return {
      variantId: v.id,
      variant: v.options.join(' / '),
      opts: v.options.map(function (value, i) { return { name: optionName(i), value: value }; }),
      qty: qty,
      price: v.price,
      comparePrice: v.compare || undefined,
      image: v.image || cfg.image || ''
    };
  }

  function addSelection(mode) {
    var v = currentVariant();
    if (!v) return;
    var p = selectionPrice(v);
    Base.cart.add(unitLines(v) || cartLine(v, chosenQty()), { mode: mode, value: p.total });
  }

  /** Sets the option pickers (or the option pack card that replaces one) to a variant's values. */
  function applyVariantValues(values) {
    values.forEach(function (value, i) {
      if (packs && packs.kind === 'option' && packs.index === i) {
        var card = $$('[data-card]', packs.el).filter(function (c) { return c.getAttribute('data-card') === value; })[0];
        if (card) {
          $$('[data-card]', packs.el).forEach(function (c) {
            c.classList.toggle('is-selected', c === card);
            c.setAttribute('aria-checked', c === card ? 'true' : 'false');
          });
        }
        return;
      }
      var g = $('[data-opt="' + i + '"]');
      if (!g) return;
      var sel = $('[data-opt-select]', g);
      if (sel) { sel.value = value; return; }
      $$('[data-opt-value]', g).forEach(function (b) {
        var on = b.getAttribute('data-opt-value') === value;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    });
    refreshProduct();
  }

  function initSticky() {
    var stickySel = $('[data-sticky-variant]');
    if (stickySel) {
      stickySel.addEventListener('change', function () {
        var v = Base.variants.byId(stickySel.value);
        if (v) applyVariantValues(v.options);
      });
    }
    // Shown once the buy button has scrolled away. A buy box further down the page (#mt-product on a landing) also
    // shows it from the first scroll on, until the box reaches the screen: the bar's button goes there.
    var bar = $('[data-sticky]'), main = $('[data-main-atc]') || $('[data-featured-atc]'), box = $('#mt-product');
    if (!bar || !main) return;
    var raf = 0;
    var update = function () {
      raf = 0;
      var passed = main.getBoundingClientRect().bottom < 0;
      var ahead = !!box && box.getBoundingClientRect().top > window.innerHeight && window.pageYOffset > 200;
      bar.hidden = !(passed || ahead);
    };
    var schedule = function () { if (!raf) raf = requestAnimationFrame(update); };
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    update();
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
  // asList: layout "list" — initial avatar, name + Verified, date under the name.
  function reviewCard(r, asList) {
    var a = el('article', 'b-review');
    a.appendChild(stars(r.rating, 'b-stars--outline'));
    var who = el('p', 'b-review__who', r.name || '');
    if (r.verified) { who.appendChild(document.createTextNode(' ')); who.appendChild(el('span', 'b-pill-verified', 'Verified')); }
    if (asList) {
      var by = el('div', 'b-review__by');
      by.appendChild(el('span', 'b-review__avatar', String(r.name || '?').trim().charAt(0).toUpperCase() || '?'));
      var col = el('div');
      col.appendChild(who);
      if (r.date) col.appendChild(el('p', 'b-review__date', r.date));
      by.appendChild(col);
      a.appendChild(by);
    } else a.appendChild(who);
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
    // layout "list": numbered pages instead of Show more.
    var asList = root.getAttribute('data-layout') === 'list', pager = $('[data-reviews-pager]', root), page = 1;
    var total = Number(root.getAttribute('data-total')) || 0;

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
    var pageCount = function (v) {
      var n = (filtering() || !hasMore) ? v.length : Math.max(v.length, Math.min(total, CAP));
      return Math.max(1, Math.ceil(n / pageSize));
    };
    var goTo = function (p) {
      var step = function () { if (visible().length < p * pageSize && hasMore) return load().then(step); page = p; paint(); root.scrollIntoView({ block: 'start', behavior: 'smooth' }); };
      step();
    };
    var paintPager = function (v) {
      if (!pager) return;
      var last = pageCount(v), keep = {}, nums = [];
      [1, last, page - 1, page, page + 1].forEach(function (n) { keep[n] = 1; });
      if (page <= 3) [2, 3, 4].forEach(function (n) { keep[n] = 1; });
      if (page >= last - 2) [last - 3, last - 2, last - 1].forEach(function (n) { keep[n] = 1; });
      for (var n = 1; n <= last; n++) if (keep[n]) nums.push(n);
      pager.innerHTML = '';
      pager.hidden = last < 2;
      var btn = function (label, p, cls, aria) {
        var b = el('button', 'b-pager__btn' + (cls ? ' ' + cls : ''));
        b.type = 'button';
        b.appendChild(el('span', '', label));
        if (aria) b.setAttribute('aria-label', aria);
        if (p === page && !cls) { b.classList.add('is-current'); b.setAttribute('aria-current', 'page'); }
        if (p < 1 || p > last) b.disabled = true;
        else b.addEventListener('click', function () { if (p !== page) goTo(p); });
        pager.appendChild(b);
      };
      btn('‹', page - 1, 'b-pager__step', 'Previous page');
      nums.forEach(function (n, i) {
        if (i && n - nums[i - 1] > 1) pager.appendChild(el('span', 'b-pager__gap', '…'));
        btn(String(n), n, '', 'Page ' + n);
      });
      btn('›', page + 1, 'b-pager__step', 'Next page');
    };
    var paint = function () {
      var v = visible();
      list.innerHTML = '';
      if (asList) {
        page = Math.min(page, pageCount(v));
        v.slice((page - 1) * pageSize, page * pageSize).forEach(function (r) { list.appendChild(reviewCard(r, true)); });
        clamp(list);
        if (empty) empty.hidden = v.length > 0;
        if (more) more.hidden = true;
        paintPager(v);
        return;
      }
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
      page = 1;
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
  // The block also takes that product page's quantity pack cards (Buy 1 / Buy 2 Get 1…, settings from its
  // product template; one Size / Color row per unit when unit_pickers is on), else one select per option;
  // the combined select stays the last fallback. core.js only knows the page it runs on (no variants, no
  // offers on the home page), so the variants come from the product page's #sf-variants-data and every pack
  // price from the server quote (POST /api/storefront/cart/price): the theme never sets a price.
  // Theme setting mt_prod_packs = false (data-featured-packs="0") turns the pack cards off.
  // ---------------------------------------------------------------------------------------------
  function featuredRecord(v) {
    return {
      id: v.id,
      options: v.option_values || v.options || [],
      price: num(v.price),
      compare: num(v.compare_at_price),
      image: v.featured_image || '',
      available: v.available !== false
    };
  }

  function lowKey(x) { return String(x == null ? '' : x).trim().toLowerCase(); }

  /** Variant of `list` with these option values: case-insensitive, then ignoring the option order (as core.js). */
  function featuredFind(list, values) {
    var want = values.map(lowKey);
    var hit = list.filter(function (v) {
      var o = v.options.map(lowKey);
      return o.length === want.length && o.every(function (x, i) { return x === want[i]; });
    })[0];
    if (hit) return hit;
    var sorted = want.slice().sort().join('|');
    return list.filter(function (v) { return v.options.map(lowKey).sort().join('|') === sorted; })[0] || null;
  }

  /** Option groups of the product page ([data-opt]: name, values, swatch buttons), topped up from the variants. */
  function featuredGroups(doc, list) {
    var groups = $$('[data-opt]', doc).sort(function (a, b) {
      return Number(a.getAttribute('data-opt')) - Number(b.getAttribute('data-opt'));
    }).map(function (g) {
      var legend = $('legend', g), sel = $('[data-opt-select]', g);
      return {
        name: legend && legend.firstChild ? legend.firstChild.textContent.replace(/:\s*$/, '').trim() : '',
        choices: sel ? [].map.call(sel.options, function (o) { return { value: o.value, label: o.text }; })
          : $$('[data-opt-value]', g).map(function (b) {
            return { value: b.getAttribute('data-opt-value'), label: b.getAttribute('data-opt-display') || b.getAttribute('data-opt-value'), btn: b };
          })
      };
    });
    var n = list.length ? list[0].options.length : 0;
    for (var i = groups.length; i < n; i++) {
      var seen = [];
      list.forEach(function (v) { if (seen.indexOf(v.options[i]) < 0) seen.push(v.options[i]); });
      groups.push({ name: '', choices: seen.map(function (s) { return { value: s, label: s }; }) });
    }
    groups = groups.slice(0, n);
    groups.forEach(function (g, k) { if (!g.name) g.name = 'Option ' + (k + 1); });
    return groups;
  }

  /** The product page's pack cards block when its packs are quantity packs (not one option shown as cards). */
  function featuredPackBlock(doc) {
    var block = $('[data-cards-block]', doc);
    if (!block || !$('[data-qcards] [data-qcard]', block)) return null;
    var mode = block.getAttribute('data-mode') || 'auto';
    if (mode === 'option') return null;
    if (mode === 'auto' && $$('[data-cards]', block).some(function (g) { return PACK_NAME.test(g.getAttribute('data-cards-name') || ''); })) return null;
    return block;
  }

  function initFeatured() {
    var root = $('[data-featured]');
    if (!root) return;
    var url = root.getAttribute('data-featured'), thumbs = $('[data-featured-thumbs]', root), strip = $('[data-featured-strip]', root);
    var select = $('[data-featured-select]', root), atc = $('[data-featured-atc]', root), qty = $('[data-featured-qty-input]', root);
    var packBox = $('[data-featured-pack-box]', root), optsBox = $('[data-featured-opts]', root);
    var pcfg = null, pvars = [], list = [], groups = [];
    var mode = 'select'; // 'packs' (pack cards) · 'opts' (one select per option + quantity) · 'select' (combined select)
    var pack = null; // { el: [data-qcards], settings }
    var mainVals = [], unitVals = [], quotes = {}, requote = null;
    // The price line rendered hidden for the pack cards (templates/index.hbs) comes back outside the 'packs' mode.
    var showPrice = function () { var p = $('[data-featured-price-auto]', root); if (p) p.hidden = false; };

    $$('[data-featured-qty-step]', root).forEach(function (b) {
      b.addEventListener('click', function () { qty.value = String(Math.min(999, Math.max(1, (parseInt(qty.value, 10) || 1) + Number(b.getAttribute('data-featured-qty-step'))))); });
    });

    var chosen = function () {
      var all = (pcfg && pcfg.variants) || [];
      return all.filter(function (v) { return v.id === (select && select.value); })[0] || all[0] || null;
    };
    var full = function (v) { return pvars.filter(function (x) { return x.id === v.id; })[0] || {}; };
    var showImage = function (src) {
      var main = $('[data-featured-main]', root);
      if (!src || !main) return;
      swapMedia(main, src, 'data-featured-main');
      markThumb(thumbs, src);
    };
    var paintHead = function (total, compare) {
      var priceEl = $('[data-featured-price]', root), cmpEl = $('[data-featured-compare]', root);
      if (priceEl) priceEl.textContent = money(total);
      if (!cmpEl && priceEl && compare > total) {
        cmpEl = el('s');
        cmpEl.setAttribute('data-featured-compare', '');
        priceEl.parentNode.appendChild(document.createTextNode(' '));
        priceEl.parentNode.appendChild(cmpEl);
      }
      if (cmpEl) cmpEl.textContent = compare > total ? money(compare) : '';
      var barPrice = $('[data-sticky-price]');
      if (barPrice) barPrice.textContent = money(total);
    };
    var paint = function () { // 'select' mode: the combined select (unchanged behaviour)
      var v = chosen();
      if (!v) return;
      var f = full(v), cmp = num(f.compare_at_price);
      paintHead(v.price, cmp);
      if (f.featured_image) showImage(f.featured_image);
    };

    // --- 'opts' / 'packs': one variant from the per-option selects, quantity packs priced by the server ----
    var mainVariant = function () { return featuredFind(list, mainVals); };
    var line = function (v, q) {
      return {
        variantId: v.id, variant: v.options.join(' / '),
        opts: v.options.map(function (value, i) { return { name: groups[i] ? groups[i].name : 'Option ' + (i + 1), value: value }; }),
        qty: q, title: pcfg.title || '', handle: pcfg.handle || '', productId: pcfg.productId || '', url: url,
        image: v.image || pcfg.image || '', price: v.price, comparePrice: v.compare || undefined
      };
    };
    var unitsOn = function () { return mode === 'packs' && !!(pack.settings || {}).unit_pickers && groups.length > 0; };
    var selectedCard = function () { return pack ? $('[data-qcard].is-selected', pack.el) : null; };
    var cardQty = function (card) { return Math.min(999, Math.max(1, Number(card.getAttribute('data-qty')) || 1)); };

    /** [{ v, q }] of a pack card: the chosen card's unit rows (one entry per variant), else N × the main variant. */
    var packParts = function (card) {
      var n = cardQty(card), base = mainVariant();
      if (!(unitsOn() && card.classList.contains('is-selected'))) return base ? [{ v: base, q: n }] : null;
      var by = {}, out = [];
      for (var k = 0; k < Math.min(n, 12); k++) {
        var v = featuredFind(list, unitVals[k] || mainVals);
        if (!v) return null;
        if (!by[v.id]) { by[v.id] = { v: v, q: 0 }; out.push(by[v.id]); }
        by[v.id].q++;
      }
      if (n > 12 && out.length) out[0].q += n - 12; // rows stop at 12; the extra units follow the first row
      return out;
    };
    var gross = function (parts) { return Base.round2(parts.reduce(function (s, p) { return s + p.v.price * p.q; }, 0)); };
    var grossCompare = function (parts) { return Base.round2(parts.reduce(function (s, p) { return s + Math.max(p.v.compare, p.v.price) * p.q; }, 0)); };
    var partsKey = function (parts) { return parts.map(function (p) { return p.v.id + 'x' + p.q; }).sort().join(','); };

    /** The checkout's price for these lines (subtotal − discount), cached; null when the quote fails. */
    var quote = function (parts) {
      var key = partsKey(parts);
      if (!quotes[key]) {
        quotes[key] = Base.postJson('/api/storefront/cart/price', {
          domain: cfg.domain || undefined, handle: pcfg.handle || undefined, protection: false,
          items: parts.map(function (p) { return { variantId: p.v.id, qty: p.q }; })
        }).then(function (r) {
          var q = r && r.ok && r.data && r.data.data;
          if (!q || (q.currency && cfg.currency && q.currency !== cfg.currency)) throw new Error('quote');
          return Base.round2((Number(q.subtotal) || 0) - (Number(q.discount) || 0));
        }).catch(function () { delete quotes[key]; return null; });
      }
      return quotes[key];
    };

    var paintCard = function (card) {
      var s = pack.settings || {}, pos = Number(card.getAttribute('data-card-pos')) || 1;
      var suffix = s.currency_code === false ? '' : ' ' + (cfg.currency || 'USD');
      var fmt = function (n) { return money(n) + suffix; };
      var priceEl = $('[data-card-price]', card), cmpEl = $('[data-card-compare]', card), unitEl = $('[data-card-unit]', card);
      var parts = packParts(card), selected = card.classList.contains('is-selected');
      card.classList.toggle('is-unavailable', !parts);
      var sub = $('[data-card-sub]', card), badge = $('[data-card-badge]', card), inc = $('[data-card-includes]', card), gift = $('[data-card-gift]', card);
      if (sub) sub.textContent = s['card_' + pos + '_sub'] || '';
      if (badge) { badge.textContent = s['card_' + pos + '_badge'] || ''; badge.hidden = !badge.textContent; }
      if (inc) {
        var html = s['card_' + pos + '_includes'] || '';
        inc.innerHTML = html;
        inc.hidden = !html || (!s.includes_all && !selected);
      }
      if (gift) gift.hidden = true; // free gifts need the product page's #sf-gifts-data
      var base = mainVariant(), img = $('[data-qcard-img]', card), mark = $('.b-card__qty', card), src = (base && base.image) || pcfg.image || '';
      if (img && src) { img.src = src; img.hidden = false; if (mark) mark.hidden = false; }
      if (!parts) {
        if (priceEl) priceEl.textContent = '';
        if (cmpEl) cmpEl.textContent = '';
        if (unitEl) unitEl.hidden = true;
        paintSave(card, s, 0, 0);
        return;
      }
      var key = partsKey(parts), compare = grossCompare(parts), n = cardQty(card);
      card.__featuredKey = key;
      var show = function (total) {
        if (card.__featuredKey !== key) return; // a newer pick of this card is on its way
        if (priceEl) priceEl.textContent = fmt(total);
        if (cmpEl) cmpEl.textContent = compare > total ? fmt(compare) : '';
        paintSave(card, s, total, compare);
        if (unitEl) {
          var unitText = s.unit_label && n > 1 && total > 0 ? money(Base.round2(total / n)) + ' / ' + s.unit_label : '';
          unitEl.textContent = unitText;
          unitEl.hidden = !unitText;
        }
        if (card.classList.contains('is-selected')) paintHead(total, compare);
      };
      if (priceEl && !priceEl.textContent) priceEl.textContent = '…';
      quote(parts).then(function (total) { show(total == null ? gross(parts) : total); });
    };

    var paintCards = function () {
      if (mode !== 'packs') return;
      $$('[data-qcard]', pack.el).forEach(paintCard);
      var card = selectedCard();
      if (atc) atc.disabled = !(card && packParts(card));
    };

    var unitRow = function (k, names) {
      var vals = unitVals[k] = unitVals[k] || mainVals.slice();
      var row = el('div', 'b-unit');
      // Picking inside a row must not re-select (and re-render) the card.
      ['click', 'keydown'].forEach(function (t) { row.addEventListener(t, function (e) { e.stopPropagation(); }); });
      var img = el('img', 'b-unit__img');
      img.alt = '';
      img.width = 36;
      img.height = 44;
      row.appendChild(img);
      var dots = [];
      var paintRow = function () {
        var v = featuredFind(list, vals), src = (v && v.image) || pcfg.image || '';
        if (src && img.getAttribute('src') !== src) img.src = src;
        row.classList.toggle('is-unavailable', !v);
        dots.forEach(function (d) {
          var c = dotColor(groups[d.i].choices.filter(function (x) { return x.value === vals[d.i]; })[0]);
          d.el.style.background = c;
          d.el.hidden = !c;
        });
        return v;
      };
      names.forEach(function (name, i) {
        var wrap = el('span', 'b-unit__sel');
        if (/colou?r/i.test(name)) {
          var dot = el('span', 'b-unit__dot');
          dot.setAttribute('aria-hidden', 'true');
          wrap.appendChild(dot);
          wrap.classList.add('has-dot');
          dots.push({ i: i, el: dot });
        }
        var s = el('select', 'b-unit__select');
        s.setAttribute('aria-label', name + ' ' + (k + 1));
        s.setAttribute('data-unit-select', String(i));
        groups[i].choices.forEach(function (c) {
          var o = el('option', null, c.label);
          o.value = c.value;
          s.appendChild(o);
        });
        s.value = vals[i];
        s.addEventListener('change', function () {
          vals[i] = s.value;
          var v = paintRow(), c = groups[i].choices.filter(function (x) { return x.value === s.value; })[0];
          // The gallery shows this unit: its variant's picture, else the picked colour's picture when the gallery has it.
          showImage((v && v.image) || swatchGalleryUrl(thumbs, c && c.btn));
          clearTimeout(requote);
          requote = setTimeout(paintCards, 150);
        });
        wrap.appendChild(s);
        if (wrap.classList.contains('has-dot')) colorField(s, groups[i].choices, wrap);
        row.appendChild(wrap);
      });
      paintRow();
      return row;
    };

    var renderUnits = function () {
      if (mode !== 'packs') return;
      var on = unitsOn(), names = groups.map(function (g) { return g.name; });
      $$('[data-qcard]', pack.el).forEach(function (card) {
        var box = $('[data-unit-rows]', card);
        if (!box) return;
        var show = on && card.classList.contains('is-selected');
        box.innerHTML = '';
        box.hidden = !show;
        if (!show) return;
        box.appendChild(el('p', 'b-units__label', names.join(', ')));
        for (var k = 0; k < Math.min(12, cardQty(card)); k++) box.appendChild(unitRow(k, names));
      });
    };

    var selectCard = function (card) {
      $$('[data-qcard]', pack.el).forEach(function (c) {
        var on = c === card;
        c.classList.toggle('is-selected', on);
        c.setAttribute('aria-checked', on ? 'true' : 'false');
      });
      renderUnits();
      paintCards();
    };

    var buildOpts = function () {
      optsBox.innerHTML = '';
      groups.forEach(function (g, i) {
        var label = el('label', 'mt-product__opt');
        label.appendChild(el('span', 'mt-product__opt-name', g.name));
        var s = el('select', 'b-select');
        s.setAttribute('data-featured-opt', String(i));
        g.choices.forEach(function (c) {
          var o = el('option', null, c.label);
          o.value = c.value;
          s.appendChild(o);
        });
        s.value = mainVals[i];
        s.addEventListener('change', function () {
          mainVals[i] = s.value;
          var v = mainVariant(), c = g.choices.filter(function (x) { return x.value === s.value; })[0];
          showImage((v && v.image) || swatchGalleryUrl(thumbs, c && c.btn));
          if (mode === 'packs') { unitVals = []; renderUnits(); paintCards(); return; }
          if (v) paintHead(v.price, Math.max(v.compare, v.price));
          if (atc) atc.disabled = !v;
        });
        label.appendChild(s);
        optsBox.appendChild(label);
      });
    };

    /** Pack cards (or per-option selects) from the product page; false keeps the combined select. */
    var setupPicker = function (doc) {
      list = (pvars.length ? pvars : (pcfg.variants || []).map(function (v) {
        return { id: v.id, option_values: v.options, price: v.price };
      })).map(featuredRecord);
      groups = featuredGroups(doc, list);
      var src = packBox && root.getAttribute('data-featured-packs') !== '0' ? featuredPackBlock(doc) : null;
      if (!optsBox || (!groups.length && !src)) return false;
      var first = list.filter(function (v) { return v.available; })[0] || list[0];
      mainVals = first.options.slice();
      if (src) {
        var block = document.importNode(src, true);
        // Not the product page's own block: ui.js initProductForm must never pick this copy up.
        block.removeAttribute('data-cards-block');
        block.setAttribute('data-featured-cards', '');
        $$('[data-cards], [data-cards-price]', block).forEach(function (n) { n.parentNode.removeChild(n); });
        var qcards = $('[data-qcards]', block);
        qcards.hidden = false;
        if (!$('[data-qcard].is-selected', qcards)) $('[data-qcard]', qcards).classList.add('is-selected');
        pack = { el: qcards, settings: Base.readJson($('[data-cards-settings]', block), {}) || {} };
        packBox.appendChild(block);
        packBox.hidden = false;
        mode = 'packs';
        $$('[data-qcard]', qcards).forEach(function (card) {
          card.addEventListener('click', function () { selectCard(card); });
          card.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectCard(card); } });
        });
        var qtyBox = $('[data-featured-qty]', root);
        if (qtyBox) qtyBox.hidden = true;
      } else {
        mode = 'opts';
      }
      // Unit rows carry their own Size / Color; without them the per-option selects pick the variant.
      if (!unitsOn() && groups.length) { buildOpts(); optsBox.hidden = false; }
      if (mode === 'packs') { renderUnits(); paintCards(); } else {
        var v = mainVariant();
        if (v) paintHead(v.price, Math.max(v.compare, v.price));
      }
      return true;
    };

    fetch(url, { credentials: 'include' }).then(function (r) { return r.text(); }).then(function (html) {
      var doc = new DOMParser().parseFromString(html, 'text/html');
      pcfg = Base.readJson(doc.getElementById('sf-config'), null);
      pvars = Base.readJson(doc.getElementById('sf-variants-data'), []) || [];
      if (!pcfg || !(pcfg.variants || []).length) return showPrice();
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
      var picked = setupPicker(doc);
      if (mode !== 'packs') showPrice();
      if (picked) {
        if (atc && mode === 'opts') atc.disabled = !mainVariant();
        return;
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
    }).catch(showPrice);

    if (atc) atc.addEventListener('click', function () {
      if (!pcfg) return;
      if (mode === 'packs') {
        var card = selectedCard(), parts = card && packParts(card);
        if (!parts) return;
        quote(parts).then(function (total) {
          Base.cart.add(parts.map(function (p) { return line(p.v, p.q); }), { mode: 'cart', value: total == null ? gross(parts) : total });
        });
        return;
      }
      var n = Math.min(999, Math.max(1, parseInt(qty.value, 10) || 1));
      if (mode === 'opts') {
        var mv = mainVariant();
        if (mv) Base.cart.add(line(mv, n));
        return;
      }
      var v = chosen();
      if (!v) return;
      var f = full(v);
      Base.cart.add({
        variantId: v.id, variant: (v.options || []).join(' / '), qty: n,
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
    // Every FAQ / accordion opens and closes with a height + fade animation: the base items, and any theme's own
    // <details data-accordion> (its [data-accordion-icon] turns while open). .is-closing turns the icon back at once.
    var SEL = 'details.b-faq__item, details.b-acc, details[data-accordion]';
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
        d.classList.add('is-closing');
        animate(d, b, open(b), shut, 240, function () { d.open = false; d.classList.remove('is-closing'); });
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

  // Size chart block: with an option name set, only products that have that option keep it. Only ever hides: a block
  // rendered hidden (no size chart picture or text anywhere) stays hidden.
  function initSizeChart() {
    $$('[data-size-chart]').forEach(function (box) {
      var want = String(box.getAttribute('data-option') || '').trim().toLowerCase();
      if (!want) return;
      var names = String(box.getAttribute('data-options') || '').toLowerCase().split('|').map(function (n) { return n.trim(); });
      if (names.indexOf(want) === -1) box.hidden = true;
    });
  }

  // Maggie's size finder (snippets/mt-size-finder.hbs): a box that opens in place; height + weight (+ full bust) → the
  // size from the store's table (Theme settings, one line per size: "Size | weight lb | full bust in").
  // Weight is read for a woman about 5'5": at the same girth, weight grows with height, so it is scaled by 65 / height.
  // Size by weight, size by bust (when given): the larger one wins. Past the table = the largest size.
  function sizeFinderRows(text) {
    var top = function (s) { var n = String(s || '').match(/\d+(?:\.\d+)?/g); return n ? parseFloat(n[n.length - 1]) : NaN; };
    return String(text || '').split(/\r?\n/).map(function (line) {
      var c = line.split('|').map(function (s) { return s.trim(); });
      return c[0] ? { size: c[0], weight: c[1] || '', bust: c[2] || '', wMax: top(c[1]), bMax: top(c[2]) } : null;
    }).filter(Boolean);
  }
  function sizeFinderPick(rows, heightIn, weightLb, bustIn) {
    var find = function (key, v) {
      var last = -1;
      for (var i = 0; i < rows.length; i++) {
        if (isNaN(rows[i][key])) continue;
        if (v <= rows[i][key]) return i;
        last = i;
      }
      return last;
    };
    var byWeight = find('wMax', weightLb * 65 / heightIn), byBust = bustIn ? find('bMax', bustIn) : -1;
    var i = Math.max(byWeight, byBust);
    return i < 0 ? null : { size: rows[i].size, byBust: byBust > byWeight };
  }
  function initSizeFinder() {
    $$('[data-size-finder]').forEach(function (box, n) {
      var rows = sizeFinderRows(box.getAttribute('data-sf-table'));
      var toggle = $('[data-sf-toggle]', box), panel = $('[data-sf-panel]', box);
      if (!toggle || !panel) return;
      panel.id = panel.id || 'mt-sf-panel-' + n;
      toggle.setAttribute('aria-controls', panel.id);
      toggle.addEventListener('click', function () {
        var open = toggle.getAttribute('aria-expanded') !== 'true';
        toggle.setAttribute('aria-expanded', String(open));
        box.classList.toggle('is-open', open);
        panel.hidden = !open;
      });
      var height = $('[data-sf-height]', box);
      for (var h = 52; h <= 76; h++) {
        var o = el('option', '', Math.floor(h / 12) + '\' ' + (h % 12) + '"');
        o.value = String(h);
        height.appendChild(o);
      }
      var how = $('[data-sf-how]', box), howPanel = $('[data-sf-howpanel]', box);
      if (how && howPanel) how.addEventListener('click', function () {
        var open = how.getAttribute('aria-expanded') !== 'true';
        how.setAttribute('aria-expanded', String(open));
        howPanel.hidden = !open;
      });
      var chart = $('[data-sf-chart]', box);
      if (chart && rows.length) {
        var table = el('table', 'mt-sf__table'), head = el('tr');
        ['Size', 'Weight (lb)', 'Full bust (in)'].forEach(function (t) { head.appendChild(el('th', '', t)); });
        table.appendChild(el('thead')).appendChild(head);
        var body = table.appendChild(el('tbody'));
        rows.forEach(function (r) {
          var tr = body.appendChild(el('tr'));
          [r.size, r.weight, r.bust].forEach(function (t) { tr.appendChild(el('td', '', t)); });
        });
        chart.appendChild(table);
      }
      var error = $('[data-sf-error]', box), result = $('[data-sf-result]', box);
      var fill = function (tpl, map) { return String(tpl || '').replace(/\{(\w+)\}/g, function (m, k) { return k in map ? map[k] : m; }); };
      $('[data-sf-go]', box).addEventListener('click', function () {
        var hIn = parseInt(height.value, 10), wLb = parseFloat($('[data-sf-weight]', box).value);
        var raw = String($('[data-sf-bust]', box).value || '').toLowerCase(), b = parseFloat(raw.replace(',', '.'));
        // Bust in cm when it says so or is too large for inches (a full bust is 25–70 in, 60–180 cm).
        var bustIn = isNaN(b) ? 0 : (/cm/.test(raw) || b > 70 ? b / 2.54 : b);
        if (bustIn && (bustIn < 24 || bustIn > 72)) bustIn = 0;
        var pick = (!hIn || !(wLb >= 60 && wLb <= 600)) ? null : sizeFinderPick(rows, hIn, wLb, bustIn);
        error.hidden = !!pick;
        result.hidden = !pick;
        if (!pick) { error.textContent = box.getAttribute('data-sf-missing') || ''; return; }
        var bustText = (Math.round(bustIn * 10) / 10) + '" (' + Math.round(bustIn * 2.54) + ' cm)';
        $('[data-sf-size]', box).textContent = pick.size;
        $('[data-sf-note-out]', box).textContent = fill(box.getAttribute(pick.byBust ? 'data-sf-note-bust' : 'data-sf-note'), { bust: bustText, size: pick.size });
        $('[data-sf-pick-out]', box).textContent = fill(box.getAttribute('data-sf-pick'), { bust: bustText, size: pick.size });
      });
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

  // ---------------------------------------------------------------------------------------------
  // Related rows ([data-related]): top each grid up to data-limit with cards from the store's all-products
  // page (config.allProductsUrl, the theme's own .b-pcard markup), cached per tab. Skips the product on screen
  // and cards already on the page, so two rows ("Complete the look", "You may also like") never repeat.
  // ---------------------------------------------------------------------------------------------
  var STORE_CARDS_KEY = 'b-store-cards:' + (cfg.domain || location.host);

  function storeCards() {
    try {
      var cached = JSON.parse(sessionStorage.getItem(STORE_CARDS_KEY) || 'null');
      if (cached && cached.length) return Promise.resolve(cached);
    } catch (e) { /* storage off */ }
    var url = cfg.allProductsUrl || '/collections/all';
    if (!window.fetch || !window.DOMParser) return Promise.resolve([]);
    return fetch(url, { credentials: 'same-origin', headers: { Accept: 'text/html' } })
      .then(function (r) { return r.ok ? r.text() : ''; })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html || '', 'text/html');
        var list = [].map.call(doc.querySelectorAll('.b-pcard'), function (c) { return c.outerHTML; });
        try { sessionStorage.setItem(STORE_CARDS_KEY, JSON.stringify(list)); } catch (e) { /* full */ }
        return list;
      })
      .catch(function () { return []; });
  }

  function cardKey(a) {
    var href = a.getAttribute('href') || '';
    try { href = new URL(href, location.href).pathname; } catch (e) { /* keep raw */ }
    return href.replace(/\/+$/, '') + '|' + (a.getAttribute('data-card-title') || '').trim().toLowerCase();
  }

  function initRelatedFill() {
    var rows = $$('[data-related]');
    if (!rows.length) return;
    var need = rows.some(function (r) { return $$('.b-pcard', r).length < (Number(r.getAttribute('data-limit')) || 4); });
    if (!need) return;
    storeCards().then(function (list) {
      var holder = document.createElement('div');
      var here = location.pathname.replace(/\/+$/, ''), title = String(cfg.title || '').trim().toLowerCase();
      var seen = {};
      $$('.b-pcard').forEach(function (c) { seen[cardKey(c)] = true; });
      rows.forEach(function (row) {
        var grid = $('[data-related-grid]', row), max = Number(row.getAttribute('data-limit')) || 4;
        if (!grid) return;
        for (var i = 0; i < list.length && $$('.b-pcard', grid).length < max; i++) {
          holder.innerHTML = list[i];
          var card = holder.firstElementChild;
          if (!card) continue;
          var key = cardKey(card), path = key.split('|')[0];
          var t = (card.getAttribute('data-card-title') || '').trim().toLowerCase();
          if (seen[key] || (path && path === here && (!t || !title || t === title)) || (title && t === title)) continue;
          seen[key] = true;
          $$('img', card).forEach(function (im) { im.setAttribute('loading', 'lazy'); im.removeAttribute('fetchpriority'); });
          grid.appendChild(card);
        }
        row.hidden = !$$('.b-pcard', grid).length;
      });
    });
  }

  function start() {
    [initTopbar, initHeader, initGallery, initProductForm, initSticky, initUrgency, initCart, initReviews,
      initTestimonials, initHomeReviews, initDragScroll, initForms, initCollection, initSearchPage, initFeatured, initHomeCompare,
      initMarquee, initAccordions, initReels, initSizeChart, initSizeFinder, initModals, initCardEntrance, initFeatureNumbers, initRelatedFill].forEach(function (fn) {
      try { fn(); } catch (e) { if (window.console) console.error(e); }
    });
  }

  window.BaseUI = { openCart: openCart, closeCart: closeCart, refreshProduct: refreshProduct, renderCart: renderCart, swapMedia: swapMedia };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
