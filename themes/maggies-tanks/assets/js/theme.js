/* Maggie's Tanks — loader for Shopdy's platform pages (contact, order lookup, order support, tracking result, …).
   Shopdy wraps those pages in this theme's header / footer and loads ONLY assets/js/theme.js (render-theme-chrome.ts →
   resolveThemeJsPath), while this theme's scripts are assets/js/core.js + ui.js: without this file nothing ran there —
   the menu button, the cart drawer and the search did nothing. It adds core.js then ui.js (in that order) next to
   itself; core.js already reads the platform's #sf-chrome-config. The theme's own pages load core.js / ui.js through
   snippets/scripts.hbs and never this file; a page that already has them gets nothing twice. */
(function () {
  'use strict';
  var me = document.currentScript;
  var base = me && me.src ? me.src.replace(/theme\.js(?:[?#].*)?$/, '') : '';
  if (!base) return;
  ['core.js', 'ui.js'].forEach(function (file) {
    if (document.querySelector('script[src*="/js/' + file + '"]')) return;
    var s = document.createElement('script');
    s.src = base + file;
    s.async = false; // dynamic scripts run in insertion order: ui.js needs core.js (window.Base)
    document.body.appendChild(s);
  });
})();
