/*
 * The pixel / platform hooks every Adlux theme keeps (searched across all its templates, sections and snippets).
 * tools/pack.js stops a theme that misses one; tools/theme-map.js lists where each one is.
 */
'use strict';

const HOOKS = [
  ['{{{trackingHead}}}', /\{\{\{trackingHead\}\}\}/],
  ['{{{trackingBody}}}', /\{\{\{trackingBody\}\}\}/],
  ['#sf-config with configJson', /id="sf-config"[^>]*>\{\{\{configJson\}\}\}/],
  ['#sf-variants-data', /id="sf-variants-data"/],
  ['#addToCart', /id="addToCart"/],
  ['data-testid="add-to-cart"', /data-testid="add-to-cart"/],
  ['#CartDrawer-Checkout', /id="CartDrawer-Checkout"/],
  ['data-testid="checkout-button"', /data-testid="checkout-button"/],
];

module.exports = { HOOKS };
