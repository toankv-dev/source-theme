/* Shapecurve look of the Lunara product section — loaded (defer) by sections/product.hbs when
   Product > "Look of this product section" = Shapecurve, and by the Info rows block in any other look (size chart
   only). Reads the page, never the cart: theme.js keeps every cart, price and pixel job.
   1. Picture tiles: the option whose values have their own variant pictures (#sf-variants-data featured_image, e.g.
      Color) shows each value as an 80 x 100 tile of that picture (label.sc-swimg, --sc-sw). No pictures = pills.
   2. The main Color / Size picker feeds the pack rows (Kaching units), as on the original: a change of the main picker
      sets the same option on every unit row and fires "change" so theme.js re-prices the pack.
   3. Size chart rows (data-sc-chart: lines, cells split by |, first line = header) become a <table>. */
(function () {
  'use strict';
  // linked by the bodysuit look and again by an Info rows block outside it: run once
  if (window.__scProduct) return;
  window.__scProduct = true;
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  function variants() {
    var el = document.getElementById('sf-variants-data') || document.querySelector('[data-lu-variants-json]');
    try { return JSON.parse((el && el.textContent) || '[]') || []; } catch (e) { return []; }
  }

  function tiles(root) {
    var list = variants();
    if (!list.length) return;
    $$('.lu-variants .ms-variant-group', root).forEach(function (group, gi) {
      var radios = $$('input[type=radio]', group);
      var pics = radios.map(function (r) {
        for (var i = 0; i < list.length; i++) {
          var v = list[i], ov = v.option_values || [];
          if (ov[gi] === r.value && v.featured_image) return v.featured_image;
        }
        return '';
      });
      var distinct = pics.filter(function (p, i) { return p && pics.indexOf(p) === i; });
      if (distinct.length < 2) return;
      radios.forEach(function (r, i) {
        var label = r.nextElementSibling;
        if (!label || label.tagName !== 'LABEL' || !pics[i]) return;
        label.classList.add('sc-swimg');
        label.style.setProperty('--sc-sw', 'url("' + String(pics[i]).replace(/"/g, '%22') + '")');
        label.title = r.value;
      });
    });
  }

  function feedUnits(root) {
    if (root.__scFeed) return;
    root.__scFeed = true;
    root.addEventListener('change', function (e) {
      var r = e.target;
      if (!r || r.type !== 'radio' || !r.closest('.lu-variants .ms-variant-group')) return;
      var gi = $$('.lu-variants .ms-variant-group', root).indexOf(r.closest('.ms-variant-group'));
      if (gi < 0) return;
      $$('[data-lu-unit]', root).forEach(function (unit) {
        var sel = $$('select', unit)[gi];
        if (!sel || sel.value === r.value) return;
        if (!$$('option', sel).some(function (o) { return o.value === r.value; })) return;
        sel.value = r.value;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });
  }

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function charts(root) {
    $$('[data-sc-chart]', root).forEach(function (box) {
      if (box.firstChild) return;
      var rows = String(box.getAttribute('data-sc-chart') || '').split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean)
        .map(function (l) { return l.split('|').map(function (c) { return c.trim(); }); });
      if (!rows.length) return;
      var h = '<table><thead><tr>' + rows[0].map(function (c) { return '<th scope="col">' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>';
      rows.slice(1).forEach(function (r) {
        h += '<tr>' + r.map(function (c, i) { return i ? '<td>' + esc(c) + '</td>' : '<th scope="row">' + esc(c) + '</th>'; }).join('') + '</tr>';
      });
      box.innerHTML = h + '</tbody></table>';
    });
  }

  function run() {
    $$('.sc-skin').forEach(function (skin) {
      var root = skin.querySelector('[data-ms-pdp]') || skin;
      tiles(skin);
      feedUnits(root);
    });
    charts(document); // the Info rows block in any look (user 2026-11-20)
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
})();
