# Base — Adlux Handlebars base theme (schema v2)

Every new storefront theme starts as a copy of this folder (`node tools/new-theme.js <Name>`).
It holds what the three source themes (Lunara, TwinklingTree, Wayfare) had in common: the platform
behaviour, the page chrome and the sections that kept coming back. A child theme only re-skins it and adds
what the original page has on top.

## Layers — what a child theme may change

| Layer | Files | Child theme |
| --- | --- | --- |
| Platform core | `assets/js/core.js`, `templates/checkout.hbs` (except the skin `<style>`), `templates/tracking-result.hbs` script, `sections/product-scripts.hbs`, `snippets/head.hbs` | **Never edit.** |
| Interface | `assets/js/ui.js` | May extend or replace; keep the `data-*` hooks it uses. |
| Markup | `sections/*.hbs`, `snippets/*.hbs`, `templates/*.hbs`, `layout/theme.hbs` | Edit freely to match the original layout. |
| Look | `config/settings_data.json` (colours, fonts, radius, texts), `assets/css/skin.css` | This is where most of the work goes. |
| Content | `templates/product*.json` (section order, blocks), `config/settings_data.json` | Arrange to match the original page. |

`base.css` + `sections.css` hold the base styles; `skin.css` is loaded last. Never name a stylesheet
`theme.css` (the engine treats that name as a legacy inline bundle and does not link it on platform pages).

## Platform contract (keep in every theme)

- `{{{trackingHead}}}` in `<head>`, `{{{trackingBody}}}` right after `<body>` on every page (not on checkout).
- `<script id="sf-config">{{{configJson}}}</script>` in `<head>`; the header repeats it as `#sf-chrome-config`
  for the platform's own pages. `#sf-variants-data` on product pages (`sections/product-scripts.hbs`).
- Hooks read by pixels: `#addToCart` + `data-testid="add-to-cart"`, `#CartDrawer-Checkout` +
  `data-testid="checkout-button"`, checkout `#co-checkout-form` / `#co-pay-btn`.
- Cart in `localStorage["sf-cart:<domain>"]` (+ `sf-cart` mirror), lines with at least
  `title, variant, price, qty, image, variantId, comparePrice` — written only through `Base.cart`.
- Events through `window.__adluxTrack`: ViewContent, AddToCart, InitiateCheckout, Lead, Search (core.js).
- Free gifts: `product.gift_offers` → `#sf-gifts-data` (pack cards name the gift a pack unlocks);
  `config.cartGiftsUrl` → the cart's gift lines (`gift: true`, price 0), synced by core.js on every cart change.
- Listing data: option values show `custom_name` (value stays `label`); FAQ order follows `page.faqFromListing`
  (`snippets/faq-list.hbs`); footer policy links follow `policies.<key>` (`snippets/policy-link.hbs`);
  `feature-rows` / `guarantee` fall back to `page.heroTitle / intro / features / guarantees`.
- Discounts: never set a price in the theme. `#b-offers` (nextItemTiers / bxgyOffers / amountOffOffers) +
  the checkout's own formula, corrected by `POST /api/storefront/cart/price`.
- Only the engine's helpers: `if unless each with lookup eq gt limit json money applyTokens faqItems stars5
  swatchStyle contains editable editableSetting`. Checkboxes default ON: test them with `(eq settings.x false)`.
- FAQ / accordions always animate (ui.js): `.b-faq__item`, `.b-acc` and any theme markup `<details data-accordion>`
  (icon: `[data-accordion-icon]`); the header menu drawer slides in (`[data-menu-drawer]` + `.is-open`).
- `templates/product.hbs` (schema v1 entry) must render on its own: sections fall back when `section` is undefined.

## JavaScript API (`window.Base`, core.js)

`Base.cfg`, `Base.money(n)`, `Base.num(str)`, `Base.track(event, payload)`, `Base.cart.{get, save, add(lines,
{mode}), setQty, remove, totals, quote, checkout}`, `Base.discount.{best, pack}`, `Base.variants.{list, find(values),
byId, fromUrl, setUrl}`, `Base.reviews.{list, post}` (post is kept for the API contract only: no theme shows a review form), `Base.gifts.{offers, forCart(qty, amount), sync}`, `Base.contact(fields)`, `Base.lead`, `Base.search`,
`Base.trackingResultUrl`. Events on `document`: `b:cart-change`, `b:cart-added`, `b:gifts-change`. `window.BaseUI` (ui.js):
`openCart, closeCart, refreshProduct, renderCart`.

## Section catalog (product templates)

| Section | What | Blocks |
| --- | --- | --- |
| `product` | Gallery (thumbs below / left / stacked, side) + info column | award, rating, title, subtitle, benefit, stock, urgency, offer_heading, price, variant_picker, variant_cards (option or quantity packs; `card_style` classic / radio "volume bundle", `pack_color`, `unit_label` per-unit price pill, `unit_pickers` = one Color / Size row per unit so a pack can mix variants, `includes_all`), buy_buttons, trust_icons, review, accordion, description, text, image, divider, custom_html, media_slider (images / videos; `slots` = frames kept while empty), faq, size_chart (link + popup) |
| `reviews` | Average, distribution, photos, filters, list, lightbox (no review form — never add one); `layout` grid (cards + Show more) or list (avatar + date rows, numbered pages `[data-reviews-pager]`) | — |
| `faq` | Accordion; blocks → `page.faq` → Theme settings FAQ | qa |
| `testimonials` | Photo reviews from the product's real reviews | — |
| `related` | Other products (relatedProducts, topped up from the all-products page on live pages; several rows never repeat) | — |
| `marquee` | Scrolling promises strip | item |
| `logo-bar` | Press / partner logos loop | logo |
| `image-banner` | Full-width image with text | — |
| `image-with-text` | Image beside heading / text / button; text alignment (desktop / phone), vertical position, text width | — |
| `icon-columns` | Benefits / trust badges in columns | column |
| `feature-rows` | Alternating image + text rows, numbered | row |
| `spec-card` | Intro text + spec tiles card | tile |
| `steps` | How it works, image cards | step |
| `stats` | Big numbers | stat |
| `comparison` | Us vs others table; rows are blocks (≤ 20), each side ✓ / ✕ or a short text | row |
| `guarantee` / `rich-text` | Heading + rich text (+ button) | — |
| `image-row` | Portrait video row (reels) | video |
| `newsletter`, `contact-form`, `custom-html` | Forms, free HTML / CSS | — |

Product section: `sticky_style` compact / full (full-width bar with variant select).

Media slots: the main product's gallery comes from the product data; every other image / video on the product
page (image block, media slider, image-with-text, spec-card, steps, feature rows, banner, video row) is a slot
the merchant fills in the theme editor. An empty slot keeps its frame (`.b-ph`, `.b-mslider__ph`,
`.b-reel__ph`, …) with an "Upload …" hint in design mode only — it never collapses or borrows the product photo.

Chrome (rendered by the layout, settings-driven): `header` (top bar rotating or countdown, nav, animated menu drawer,
search), `cart-drawer` (lines, shipping protection / add-ons, discount, trust lines), `footer` (contact, links,
collections, newsletter, social, payment icons).

## Pages

`index.hbs` (home, settings-driven: hero, promises, featured product, product grid / per collection, banner,
comparison, reviews carousel, FAQ, newsletter, contact) · `collection.hbs` (price filter, sort, drawer on phones) ·
`search.hbs` · `page.hbs` (policies; "Order Tracking" form with order / tracking-number tabs; "Contact Us" with
form) · `tracking-result.hbs` · `checkout.hbs` (platform checkout, skin follows Theme settings).

## Mobile first

Most shoppers arrive on a phone, so the base is built and checked at 360 / 390 px first:
every control ≥ 44 × 44 px (carousel dots 24 × 44), text ≥ 12 px, form fields 16 px (no iOS zoom), no
sideways scroll (popovers stay on screen), the first-screen images load eagerly (`card-product above_fold=true`
on collection / search; gallery main image `fetchpriority="high"`), everything else lazy, LCP ≤ 2.5 s,
CLS ≤ 0.1, JS ≤ 150 KB. Phone rules live in the "Phone pass" block at the end of `sections.css`.
`node tools/mobile-audit.js` checks all of it; a child theme keeps it at 0 errors.

## Work on it

```
cd tools && npm install          # once
node tools/preview-server.js base-theme      # http://localhost:8090  (/product?template=bundle, ?legacy=1)
node tools/smoke.js                          # end-to-end checks (cart, pixels, forms) against the preview
node tools/mobile-audit.js                   # phones 360 / 390: overflow, tap size, text, fields, LCP / CLS
node tools/pack.js base-theme                # validate + zip → dist/
```

Theme settings are generated: edit `tools/scripts/build-base-settings.js`, then run it.
