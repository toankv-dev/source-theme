# Lunara (Adlux theme, schema v2)

Clone of lunara-comfort.com (Shopify Shrine PRO 1.2.3), built by `lunnara-theme/_build/build_lu_pdp.py`
(do not edit this folder by hand - edit the build and run it again).

## Editor (Themes > Customize)
- **Product page** = `templates/product.json`: section `product` = gallery + blocks you can drag in the outline (Star rating, Title, Variant picker, Size finder, **Kaching bundle**, Custom HTML, Image / video slider (snippets/lu-media-slider.hbs, 10 image_picker slots, a video URL becomes a <video> server side), FAQ (snippets/lu-pi-faq.hbs: 8 own Q/A, else listing FAQ, else Theme settings FAQ), Buy buttons, Trust line, Payment icons, Description; a product section with only Kaching / Custom HTML blocks keeps the old fixed order) (gallery, star rating, block **Kaching bundle**,
  block Custom HTML, Add to cart, description), `reviews`, `faq` ("Questions? We've Got Answers"). Template
  `product.simple.json` = no bundle (variant pills + one Add to cart).
- **Kaching bundle** block: heading, up to 4 packs (quantity 0 hides one), title / subtitle / badge / gift line,
  colours. Every item of the selected pack gets its own Color / Size pickers (one cart line per variant).
  Prices = what the Adlux checkout charges: the best of the live automatic discounts the backend sends
  (*Tiered next item* as `nextItemTiers`, *Buy X Get Y* as `bxgyOffers`), same formula and per-item rounding as
  `discount-engine.ts` (snippets/gs-head.hbs `LuDisc`, also used by the cart drawer). No discount = price x quantity.
  The theme sets no prices.
- **Theme settings**: Colors (primary `#124F9F` drives buttons, menu, top bar, footer, badges, checkout button),
  Top bar (sale text + countdown), Home page (banner, product list, real reviews of random products), Cart drawer,
  Brand contact, FAQ (default questions for every product page without its own FAQ).

## Template "Shapecurve – Drop-seat bodysuit" (`templates/product.shapecurve.json`)
The product page of shape-curve.com (Triple-Zone Compression Drop-Seat bodysuit, 2026-11-19) inside Lunara's header,
top bar, cart drawer and footer. Font = the theme's Poppins; highlight colour = `#790236` (and tints of it) where the
original uses violet. Pick it per product in the admin (template list).
- **Product section** with Look = **Shapecurve** (`skin`; links `assets/css/sc-product.css` + `assets/js/sc-product.js`
  for this section only): title, rating ("617 Reviews", yellow stars), **Price + badge**, **Highlights box**, Color as
  picture tiles (each variant's own picture) + Size pills, **Find my size (weight)** (`sc_fit`, snippets/sc-fit.hbs, as
  getionix.com: US / Metric, weight + height when the chart has a Height column, one size or both on a boundary, full
  chart + optional second table, "Select M" sets the main picker and every pack row; self-contained, any template),
  Kaching packs Buy 1 / 2 / 3 (the main picker sets every pack row), Add to cart + **second button** (`buy_now_label`,
  "Express checkout now" = add the same items, then the checkout), **Shipping box**, **Info rows** (Shipping & Return,
  Care Guide, Size Chart table typed as `a | b | c` lines). Bold = new block types (`sc_*`, snippets `sc-pb-*`).
- Sections (each with its own `<style>`, tinted band colour + highlight settings): `sc-features` (feature cards, the two
  animated pictures play), `sc-details` (large picture + round-picture cards), `sc-testimonials` (typed quotes with
  photos, swipe + dots + "View All" → reviews), `sc-trust` (4 round icons), then Lunara's `reviews` (with
  `show_write: false`: no "Write a review") and `related` ("You Will Also Love").
- Pictures are theme files (`assets/images/sc-*`, the original store's, to be replaced) set as `default_image`; a file
  picked in the editor wins. The main product's gallery stays product data: upload `assets/images/sc-sections/*_*.webp`
  (17 bodysuit photos) to the product.
- Files of the Lunara build changed by hand (the build script is not in this repo): `_work/patch-sc.js` applies them
  again and stops if an anchor moved — `sections/product.hbs` (skin, second button, rating text, 4 block types),
  `sections/reviews.hbs` (`show_write`), `snippets/lu-size-finder.hbs` (`XS (95-110 lbs)` counts as XS). Every change
  keeps the other templates' HTML byte-identical except the one size-finder line. Schemas + the template JSON:
  `_work/build-sc.js`. Checks: `_work/sc-e2e.js` on a copy with a bodysuit sample (`_work/compare-copy.js`).

## Pages
Home (`templates/index.hbs`, Shop All catalog on `#collection/<handle>`), policies / About us (`page.hbs`, About
layout), Order tracking (ParcelPanel form -> `/pages/tracking/result`), Contact = the platform contact page.

## Hooks kept for pixels
`#addToCart` + `data-testid="add-to-cart"`, `#CartDrawer-Checkout`, checkout `#co-checkout-form` / `#co-pay-btn`,
`#sf-variants-data`, ViewContent script (sections/product-scripts.hbs).
