/* Club Ritual additions (loaded after core.js + ui.js).
 * Quantity packs: "£18.00 / Pair" pill next to each card title = the card's live total ÷ its quantity.
 * Every pack keeps its "what's included" list visible (ui.js shows it only on the chosen pack).
 * ui.js rewrites the card prices on every variant / discount change, so the pills follow those writes. */
(function () {
  'use strict';
  function paint(block) {
    block.querySelectorAll('[data-card-includes]').forEach(function (inc) {
      if (inc.hidden && inc.innerHTML.trim()) inc.hidden = false;
    });
    var unit = block.getAttribute('data-unit-label') || '';
    if (!unit || !window.Base) return;
    block.querySelectorAll('[data-qcard]').forEach(function (card) {
      var pill = card.querySelector('[data-card-unit]'), price = card.querySelector('[data-card-price]');
      var qty = Number(card.getAttribute('data-qty')) || 1;
      if (!pill || !price) return;
      var total = Base.num(price.textContent || '');
      var text = qty > 1 && total > 0 ? Base.money(Math.round(total / qty * 100) / 100) + ' / ' + unit : '';
      if (pill.textContent !== text) pill.textContent = text;
      pill.hidden = !text;
    });
  }
  function init() {
    document.querySelectorAll('[data-cards-block]').forEach(function (block) {
      paint(block);
      var busy = false;
      new MutationObserver(function () {
        if (busy) return;
        busy = true;
        requestAnimationFrame(function () { paint(block); busy = false; });
      }).observe(block, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['hidden'] });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
