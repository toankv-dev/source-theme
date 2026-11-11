# Lunara (Adlux theme, schema v2)

Clone of lunara-comfort.com (Shopify Shrine PRO 1.2.3), built by `lunnara-theme/_build/build_lu_pdp.py`
(do not edit this folder by hand - edit the build and run it again).

brixpant.com copy (this folder, `themes/lunara-black-brixpant/`): the Lunara files are the downloaded theme as is,
plus the **"Tredvik – Brixpant bundle"** product template below. That build script is not in this repo; the
Tredvik part has its own build (`_work/build-tvb.js`). Spec: `docs/SPEC-lunara-brixpant-tredvik-template.md`.

## Template "Tredvik – Brixpant bundle" (`templates/product.tredvik-brixpant-bundle.json`)
The product page of `themes/tredvik` inside Lunara's header, top bar, footer and cart drawer: gallery + buy box
(1–4 packs, Color / Size per item: Tredvik ships 1 and 2, packs 3 / 4 are the "quantity 0" cards of the block),
2 picture + text blocks, numbered steps, comparison, customer quotes, FAQ, reviews. Texts and pictures are Tredvik's
(knee sleeve) as defaults: replace them in Customize.
- **Sections** `tv-product`, `tv-image-with-text`, `tv-steps`, `tv-comparison`, `tv-quotes`, `tv-faq`, `tv-reviews`
  (+ `snippets/tv-*`): only for this template. `tv-product` loads what they all need (CSS, scripts), so keep it in the
  template.
- **Look**: Theme settings → "Tredvik template" (`tv_*`: colours, corners, buttons, payment icons, Add to cart label).
  Lunara's own settings do not change it, and it does not change the rest of the store. Font: the store's one font
  (below); the build ships no Tredvik font and offers no font setting.
- **Prices**: no price in the theme. Pack cards use the same live discounts and the same switches as Lunara's cart
  drawer (Theme settings → Discounts: tiered and Buy X Get Y only when ticked, amount off unless unticked), so a pack
  card always shows the total the drawer shows next.
- **Cart**: one cart for the whole store (`sf-cart:<domain>`). The buy box writes it with `assets/js/tv-core.js` and
  `assets/js/tv-bridge.js` makes Lunara's drawer re-read it and open. Free gifts: one line per gift.
- **Pixels**: on this template `tv-core.js` fires ViewContent and AddToCart (Lunara's ViewContent script skips the
  page), Lunara's drawer fires InitiateCheckout — one event each.
- **CSS**: `assets/css/tv-bundle.css` = Tredvik's CSS scoped under `.tvb` (with `:not(#tvb-x)` so Lunara's
  element rules such as `div:empty` cannot reach inside). Also linked on the platform's own pages (every file in
  assets/css is): it styles nothing there.
- **Do not edit** `sections/tv-*`, `snippets/tv-*`, `assets/css/tv-bundle.css`, `assets/js/tv-core.js` /
  `tv-ui.js`, the template JSON, or the `tv_*` settings block by hand: change `_work/build-tvb.js` (or
  `_work/tvb-overrides.css`) and run `node themes/lunara-black-brixpant/_work/build-tvb.js`. Hand-written:
  `assets/js/tv-bridge.js`, the ViewContent guard line in `sections/product-scripts.hbs`.
- **Sticky bar**: the store's Buy now bar (below), not Tredvik's card: the build drops the card and its style setting.
- Checks: `node --test themes/lunara-black-brixpant/_work/scope-css.test.js`, `_work/tvb-e2e.js` (cart, events,
  gifts, popups), `_work/sticky-buy-e2e.js` (Buy now bar, home heading), `_work/bundle-select-e2e.js` (pack selects),
  `_work/one-font-e2e.js` (one font, every page), `_work/cmp-main.js` (body vs the Tredvik original), `_work/snap.js` +
  `_work/regress.js` (Lunara pages unchanged). The e2e scripts take `--live` (where they say so) to check brixpant.com
  with this folder's CSS swapped in the test browser only.

## One font (Archivo) on every page
Every text of every template is Archivo (`assets/fonts/archivo_*`, `@font-face` in `custom.css`), headings 600. The last
rule of `custom.css` pins it on every element, form control and ::before / ::after (merchant HTML included); the
checkout does not link custom.css, so `templates/checkout.hbs` carries the same faces and rule. Only the FAQ check box
icons keep their icon font (Material Symbols). There is no font setting: a new font = change that rule, the checkout's
copy and `ONE_FONT` in `_work/build-tvb.js`. `base.css` (vendor) still declares Poppins faces; nothing uses them, so
they are never downloaded.

## Buy now bar (`snippets/lu-sticky-buy.hbs`, every product template)
A click scrolls to the pack / option picker; it never adds to cart. Desktop: small card at the bottom right (picture,
title, price of the chosen pack, button), shown once the main Add to cart button is above the screen. Phone: only the
button, full width, pinned from the start, stepping aside only while the main button is on screen. Label: Theme settings
→ Cart & checkout (one text for all products, not computed from a product's discount).

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
- **Theme settings**: Colors (primary `#000000` drives buttons, menu, top bar, footer, badges, checkout button),
  Top bar (sale text + countdown), Home page (banner, product list, real reviews of random products), Cart drawer,
  Brand contact, FAQ (default questions for every product page without its own FAQ).

## Pages
Home (`templates/index.hbs`, Shop All catalog on `#collection/<handle>`), policies / About us (`page.hbs`, About
layout), Order tracking (ParcelPanel form -> `/pages/tracking/result`), Contact = the platform contact page.

## Hooks kept for pixels
`#addToCart` + `data-testid="add-to-cart"`, `#CartDrawer-Checkout`, checkout `#co-checkout-form` / `#co-pay-btn`,
`#sf-variants-data`, ViewContent script (sections/product-scripts.hbs).
