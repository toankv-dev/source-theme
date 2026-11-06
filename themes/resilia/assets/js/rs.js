/* Resilia additions (loaded after core.js + ui.js). Reads what ui.js already painted; never touches the cart.
 *  - Pack cards: "You save $x" line (block setting save_label) from each card's live price / was price.
 *  - Price row (rs_price) and the Add to cart button follow the chosen pack: price · was · "<prefix> $saved".
 *  - Gifts unlocked (rs_gifts): the product's free-gift tiers (Base.gifts.offers) as tiles, locked until the
 *    chosen pack reaches them.
 *  - Delivery date (rs_delivery): today + N days, "November 9th".
 *  - Contact / help page: richtext FAQ groups (h4 = question) become accordions; chips scroll to groups.
 * ui.js rewrites prices on every variant / discount change, so everything repaints from a MutationObserver. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var num = function (t) { return window.Base ? Base.num(t || '') : parseFloat(String(t || '').replace(/[^0-9.]/g, '')) || 0; };
  var money = function (n) { return window.Base ? Base.money(n) : '$' + n.toFixed(2); };
  var setText = function (el, t) { if (el && el.textContent !== t) el.textContent = t; };
  var setHidden = function (el, h) { if (el && el.hidden !== !!h) el.hidden = !!h; };

  /** The chosen selection: { now, was, qty } from the chosen pack card, else the product price. */
  function selection() {
    var card = $$('[data-qcard].is-selected, [data-card].is-selected').filter(function (c) { return !c.closest('[hidden]'); })[0];
    if (card) {
      var p = $('[data-card-price]', card), c = $('[data-card-compare]', card);
      var now = num(p && p.textContent);
      if (now > 0) return { now: now, was: num(c && c.textContent), qty: Number(card.getAttribute('data-qty')) || 1 };
    }
    var pr = $('[data-price-block] [data-price]') || $('[data-rs-now]');
    var cp = $('[data-price-block] [data-compare]');
    var cfg = (window.Base && Base.cfg) || {};
    return { now: num(pr && pr.textContent) || cfg.priceNum || 0, was: num(cp && cp.textContent) || cfg.compareNum || 0, qty: 1 };
  }

  function paintCards(block) {
    var label = block.getAttribute('data-rs-save-label');
    if (!label) return;
    $$('[data-qcard], [data-card]', block).forEach(function (card) {
      var sub = $('[data-card-sub]', card);
      var now = num(($('[data-card-price]', card) || {}).textContent);
      var was = num(($('[data-card-compare]', card) || {}).textContent);
      if (!sub || !(was > now) || !now) return;
      setText(sub, label + ' ' + money(Math.round((was - now) * 100) / 100).replace(/\.00$/, ''));
    });
  }

  function paintPrice() {
    var s = selection();
    $$('[data-rs-price]').forEach(function (box) {
      setText($('[data-rs-now]', box), money(s.now));
      var was = $('[data-rs-was]', box);
      if (was) { setText(was, s.was > s.now ? money(s.was) : ''); setHidden(was, !(s.was > s.now)); }
      var save = $('[data-rs-save]', box);
      if (save) {
        var t = s.was > s.now ? ((save.getAttribute('data-prefix') || 'Save') + ' ' + money(Math.round((s.was - s.now) * 100) / 100).replace(/\.00$/, '')) : '';
        setText(save, t);
        setHidden(save, !t);
      }
    });
    $$('[data-rs-atc]').forEach(function (box) {
      setText($('[data-rs-atc-now]', box), s.now ? money(s.now) : '');
      setText($('[data-rs-atc-was]', box), s.was > s.now ? money(s.was) : '');
      setHidden(box, !s.now);
    });
    paintGifts(s);
  }

  // ---------- Gifts unlocked ----------
  var giftsBuilt = false;
  function buildGifts() {
    giftsBuilt = true;
    var offers = window.Base && Base.gifts && Base.gifts.offers();
    $$('[data-rs-gifts]').forEach(function (box) {
      var row = $('[data-rs-gifts-row]', box);
      if (offers && Array.isArray(offers.tiers)) {
        offers.tiers.slice().sort(function (a, b) { return num(a.minQty || a.minAmount) - num(b.minQty || b.minAmount); }).forEach(function (t) {
          (t.gifts || []).forEach(function (g) {
            var tile = document.createElement('div');
            tile.className = 'rs-gift';
            tile.setAttribute('data-rs-gift', '');
            if (offers.condition === 'amount') tile.setAttribute('data-min-amount', num(t.minAmount));
            else tile.setAttribute('data-min', t.minQty);
            var img = document.createElement('span');
            img.className = 'rs-gift__img';
            if (g.imageUrl) { var im = document.createElement('img'); im.src = g.imageUrl; im.alt = ''; im.loading = 'lazy'; img.appendChild(im); }
            tile.appendChild(img);
            if (num(g.compareAtPrice) > 0) { var s = document.createElement('s'); s.className = 'rs-gift__was'; s.textContent = money(num(g.compareAtPrice) * (g.qty || 1)); tile.appendChild(s); }
            var n = document.createElement('span'); n.className = 'rs-gift__name'; n.textContent = 'FREE ' + (g.title || 'gift'); tile.appendChild(n);
            row.appendChild(tile);
          });
        });
      }
      $$('[data-rs-gift]', row).forEach(function (tile) {
        var lock = document.createElement('span');
        lock.className = 'rs-gift__lock';
        lock.innerHTML = '<svg viewBox="0 0 16 18" width="14" height="16" aria-hidden="true"><rect x="1.5" y="7.5" width="13" height="9.5" rx="2" fill="currentColor"/><path d="M4.5 7.5V5a3.5 3.5 0 0 1 7 0v2.5" stroke="currentColor" stroke-width="1.8" fill="none"/></svg><span>' + (box.getAttribute('data-locked') || 'Locked') + '</span>';
        tile.appendChild(lock);
      });
      setHidden(box, !$$('[data-rs-gift]', row).length);
    });
  }
  function paintGifts(s) {
    if (!giftsBuilt) buildGifts();
    $$('[data-rs-gift]').forEach(function (tile) {
      var minA = tile.getAttribute('data-min-amount');
      var open = minA != null ? s.now >= num(minA) : s.qty >= (Number(tile.getAttribute('data-min')) || 1);
      tile.classList.toggle('is-locked', !open);
    });
  }

  // ---------- Delivery date ----------
  function paintDelivery() {
    var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    $$('[data-rs-delivery]').forEach(function (p) {
      var d = new Date();
      d.setDate(d.getDate() + (Number(p.getAttribute('data-days')) || 3));
      var n = d.getDate(), sfx = n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th';
      setText($('[data-rs-date]', p), months[d.getMonth()] + ' ' + n + sfx);
    });
  }

  // ---------- Help page: richtext FAQ groups → accordions ----------
  function initHelpFaq() {
    $$('[data-rs-faq]').forEach(function (box) {
      var heads = $$('h4, h3', box);
      heads.forEach(function (h) {
        var d = document.createElement('details');
        d.className = 'rs-faq__item';
        d.setAttribute('data-accordion', '');
        var sum = document.createElement('summary');
        var q = document.createElement('span');
        q.className = 'rs-faq__q';
        var label = h.innerHTML.replace(/\s*\[new\]\s*/i, function () { d.classList.add('is-new'); return ''; });
        q.innerHTML = label;
        sum.appendChild(q);
        if (d.classList.contains('is-new')) { var b = document.createElement('span'); b.className = 'rs-faq__new'; b.textContent = 'NEW'; sum.appendChild(b); }
        var ic = document.createElement('span'); ic.className = 'rs-faq__icon'; ic.setAttribute('aria-hidden', 'true'); ic.setAttribute('data-accordion-icon', ''); sum.appendChild(ic);
        d.appendChild(sum);
        var body = document.createElement('div');
        body.className = 'rs-faq__a b-rte';
        var n = h.nextSibling;
        while (n && !(n.nodeType === 1 && /^H[34]$/.test(n.tagName))) { var next = n.nextSibling; body.appendChild(n); n = next; }
        d.appendChild(body);
        h.parentNode.replaceChild(d, h);
      });
      box.classList.add('is-ready');
    });
  }

  // ---------- Home testimonials: arrows scroll the snap track one card ----------
  function initSliders() {
    $$('[data-rs-slider]').forEach(function (box) {
      var track = $('[data-rs-track]', box);
      if (!track) return;
      $$('[data-rs-step]', box).forEach(function (b) {
        b.addEventListener('click', function () {
          var card = $('[data-rs-slide]', track);
          var step = card ? card.getBoundingClientRect().width + 20 : track.clientWidth;
          var dir = Number(b.getAttribute('data-rs-step')) || 1;
          var max = track.scrollWidth - track.clientWidth - 2;
          var to = track.scrollLeft + dir * step;
          if (to > max + step / 2) to = 0;
          else if (to < -step / 2) to = max;
          track.scrollTo({ left: to, behavior: 'smooth' });
        });
      });
    });
  }

  function init() {
    $$('[data-cards-block]').forEach(function (block) {
      try {
        var s = JSON.parse(($('[data-cards-settings]', block) || {}).textContent || '{}');
        if (s.save_label) block.setAttribute('data-rs-save-label', s.save_label);
      } catch (e) { /* settings stay default */ }
    });
    var busy = false;
    var paint = function () {
      if (busy) return;
      busy = true;
      requestAnimationFrame(function () {
        $$('[data-cards-block]').forEach(paintCards);
        paintPrice();
        busy = false;
      });
    };
    var root = $('[data-pdp]');
    if (root) {
      paint();
      new MutationObserver(paint).observe(root, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class', 'hidden'] });
    }
    paintDelivery();
    initHelpFaq();
    initSliders();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
