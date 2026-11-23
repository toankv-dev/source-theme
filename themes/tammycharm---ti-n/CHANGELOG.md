# Tammycharm Sculpt

2026.11.22.r16: home product list ("Our pick", `.pf-best__row`) on phones (under 750px) is a 2-column grid like the
hushflex list: every card whole, no sideways dragging. It was a sideways scroller whose `justify-content:center`
(skin.css) pushed the first card 43px off the left edge, where it could not be scrolled back. Square images, smaller
title/price/button so they fit two columns. Desktop unchanged. Block at the end of `assets/css/zz-skin.css`.
Edited by hand, not by build.py: port it when rebuilding.

2026.11.21.r15: prices follow the backend. New `assets/js/srv-price.js`, loaded between core.js and ui.js in
`snippets/scripts.hbs`: pack cards (every quantity, 1 included), the main and sticky price, and the cart drawer
subtotal/discount show the figures of POST /api/storefront/cart/price, the endpoint the checkout charges with. Until
the server answers they are hidden, never replaced by the theme's own sum, and asked again (up to 60 s apart) so they
show as soon as the server is back. Fixes pack prices when a discount is linked to another id of the product (master vs store copy).
Edited by hand, not by build.py: port `srv-price.js` and the scripts.hbs line when rebuilding. (r14 tried the same
in theme.js; theme.js is back to r13.)

2026.11.18.r13: built from theme.config.json with tools/shopdy_theme/build.py.
