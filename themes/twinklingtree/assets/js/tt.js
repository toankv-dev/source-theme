/* TwinklingTree — theme extension (loaded after ui.js). Uses window.Base only. */
(function () {
  'use strict';
  var Base = window.Base;
  if (!Base) return;

  // Swatches without their own image show the photo of the first variant that has that value.
  Base.$$('.tt-opt--swatches').forEach(function (group) {
    var index = Number(group.getAttribute('data-opt'));
    Base.$$('[data-opt-value]', group).forEach(function (pill) {
      var dot = pill.querySelector('.tt-pill__swatch');
      if (!dot || /url\(/.test(dot.getAttribute('style') || '')) return;
      var value = pill.getAttribute('data-opt-value');
      var v = Base.variants.list().filter(function (x) { return (x.option_values || [])[index] === value && x.featured_image; })[0];
      if (v) dot.style.backgroundImage = "url('" + v.featured_image + "')";
    });
  });
})();

(function () {
  'use strict';
  // Footer columns are accordions on phones: start folded there.
  if (window.matchMedia && window.matchMedia('(max-width: 749px)').matches) {
    document.querySelectorAll('.tt-footer__col[open]').forEach(function (d) { d.removeAttribute('open'); });
  }
})();
