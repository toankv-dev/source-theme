# Tammycharm Tien

2026.11.25.r22: lowering the cart to 1 leaves no gift (live bug: bundle of 4, "−" down to 1 kept a "Free gift" line,
because the gift was its own line without a stepper and the server's "Buy 1, get 1 free" still freed it). New
BCartSheet.lower(i, q): when "−" or the bin on a paid row takes what is paid for from 2+ to exactly 1, the free units
shown go with it (one save). Lowered to 0 paid (last paid line binned) keeps the other lines; the sheet quantity and
"+" are unchanged. ui.js zt() "−" / bin call it. Edited by hand: port when rebuilding.

2026.11.25.r21: Buy X Get Y gifts in the cart (live bug: 4 leggings = 4 lines at $23.14, no gift). The store's
"Buy 2, Get 2 Free" is ~55 % off every unit on the server (4 x 27.43 = 109.70), so no line was ever a whole free unit.
Now, when the /cart/price title is a Buy X Get Y ("free" / "get N" / "gift"), up to 2 units (the last lines) show as
"Free gift" at $0 while the discount pays for each in full, and the paid units share what is left (4 x $49.90 = 2 x
$44.95 + 2 Free gift = $89.90, the server total). Protection keeps its full price. New BCartSheet.rows() in
cart-sheet.js (ui.js zt() draws its rows; the old loop stays as the fallback); the quote's title is set before the
redraw. Edited by hand: port when rebuilding.

2026.11.25.r20: cart lines without the discount-name tag ("Buy 2 Get 2 Free"; the Discounts row above the subtotal
keeps it). Units a Buy X Get Y makes free and the store's gift lines show a "Free gift" chip at the end of the title
("2 Free gifts" when 2+), no price and no quantity stepper, as lunara---vesnacharm. ui.js zt() + .b-gift-badge in
sections/cart-drawer.hbs <style>. Edited by hand: port when rebuilding.

2026.11.25.r19: renamed Tammycharm Tien (folder themes/tammycharm-tien, was tammycharm-sculpt-ti-n). Cart drawer like
lunara---vesnacharm: compact Shopee lines (title / [colour, size box "M, Left ▾" | − qty +] / price, remove at the top
right, header tighter, drawer 100 % wide under 750px, protection description one line, tap shows all); the box opens a
bottom sheet over the drawer (picture + price of the chosen variant, a button per value, colour ones with their
picture, quantity, Confirm; X / backdrop / Esc / drawer closing shut it). Confirm: same variant = the quantity; another
variant = n units of the line take it (all = the whole line, fewer = they split off below), merged into a line of that
variant. New assets/js/cart-sheet.js (before ui.js in snippets/scripts.hbs); ui.js zt(): data-line-index, the box via
BCartSheet.box, no box on the free part of a split line; product-scripts.hbs: #sf-options-data (option names);
CSS in sections/cart-drawer.hbs <style>. Box + quantity 28px high (lunara), 44px tap areas. Edited by hand: port when
rebuilding.

2026.11.23.r18: cart drawer lines priced and badged like runnr-active. ui.js `Pt` / `st` (+ new `rcOffs`, `rcDraw`):
each line gets its share of the cart discount (Base.discount.best `per`, the checkout formula) and shows was / now /
"(Save $X)"; units a Buy X Get Y makes free are their own "free" line at $0 with a discount tag; a discounted line
carries a tag with the discount name; the discount row reads "Discounts" + a tag with its name; the checkout button
shows the total ("Checkout • $40.00 USD") once the server has answered. Server first (r15 kept): when the server
discount differs from the theme's split, the server discount is spread over the lines by line value instead. The old
code read lineDiscount / lineTotalAfterDiscount, which /cart/price does not send, so lines never showed a discount.
CSS at the end of zz-skin.css. Edited by hand, not by build.py: port when rebuilding.

2026.11.23.r17: faster load. logo-white.png re-encoded as palette PNG (34 KB -> 7 KB, same file, every page);
hero-desktop/hero-mobile.webp re-encoded q78 (-17% / -15%); cx/s01, s02, s04 (cx-zones thumbs, shown 76-100px) resized
1000 -> 300px. Home: the default ugc-2..7 and stats-person images were byte-identical copies of ugc-1 / expert, now
point at that one URL (downloaded once). head.hbs: Google Fonts preconnects only when load_google_fonts is on (fonts are
self-hosted). Edited by hand, not by build.py: port when rebuilding.

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
