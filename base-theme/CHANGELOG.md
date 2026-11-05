# Base theme — changelog

Versions follow `YYYY.MM.DD.N`. Each entry names the theme(s) it came from.

## 2026.11.05.5 — full-width sticky buy bar (from Club Ritual)
### Added
- Product section setting `sticky_style`: `compact` (default, unchanged small card) or `full` — a full-width bar
  on the page width with picture, title, price + was price + SAVE badge, a variant select (`[data-sticky-variant]`,
  drives the pickers / option pack cards above and the URL) and the Add to cart button. Phones: the select hides,
  the bar stays one row. Hooks `[data-sticky-compare]`, `[data-sticky-off]` follow the live price.

## 2026.11.05.4 — related products on live pages (from Club Ritual)
### Fixed
- `related` showed nothing on a live product page: the platform sends `relatedProducts` (same collection only)
  and no `products` there, so the section rendered empty. The grid is now always printed and ui.js
  (`initRelatedFill`, hook `[data-related]` / `[data-related-grid]`) tops it up to the section's limit with cards
  from the store's all-products page (the theme's own card markup, cached per tab), skipping the product on
  screen and cards another related row already shows.
- `related` schema `limit` 1 → 3, so a page can carry "Complete the look" + "You may also like".
### Added
- `tools/smoke.js`: related rows filled without `relatedProducts`, no product repeated across rows.

## 2026.11.05.3 — volume discount bundle (from Club Ritual)
### Added
- Pack cards (`variant_cards`) "volume bundle" style: `card_style` = `radio` (radio dot, no picture; chosen card,
  radio and badges in `pack_color`), `unit_label` ("$18.00 / Pair" pill = pack total ÷ units), `includes_all`
  (every pack's "What's included" list stays visible). `product.bundle.json` uses it.
- `unit_pickers`: the chosen quantity pack shows one row per unit (picture + a select per option, colour dot), so
  shoppers can mix variants in one pack; Add to cart sends one line per distinct variant and core.js keeps the
  tier discount on the product's total quantity. Hooks `[data-unit-rows]`, `[data-card-unit]`. (Club Ritual —
  the Kaching-style bundle the stores use most.)
- `tools/smoke.js`: mixed 2-pack → 2 unit rows, one cart line per variant, tier discount kept.
### Changed
- ui.js `addSelection` builds its lines through `cartLine(v, qty)` (same line fields as before).

## 2026.11.05.2 — mobile pass
### Added
- `tools/mobile-audit.js`: phone audit at 360 / 390 px (sideways overflow incl. opened popovers and drawers,
  tap targets, text size, form-field size, layout-shift images, lazy LCP image, LCP / CLS / JS / CSS budget).
  Base result: 0 errors, 0 warnings (was 26 errors, 344 warnings).
- "Phone pass" block in `sections.css`: controls ≥ 44 px (top-bar arrows, gallery arrows, quantity stepper,
  rating link, review "More", track tabs, footer links, size-guide link), carousel dots 24 × 44 hit area,
  text ≥ 12 px (review count, Verified pill, pack ×N, copyright), form fields 16 px.
- `card-product above_fold=true`: collection / search load their first 4 card images eagerly (LCP).
### Fixed
- Review Filters panel opened off the left edge of the screen on phones; the toolbar now wraps (Filters +
  Sort on one row, Write a review full width) with 44 px controls.
- Review sort select and order-tracking inputs were under 16 px (iOS zoomed the page on focus).

## 2026.11.05.1 — from Lunara Black (lunara-black.zip)
### Added
- Free gifts (platform): `product.gift_offers` printed as `#sf-gifts-data`; `Base.gifts.{offers, forCart, sync}`;
  with `config.cartGiftsUrl` the cart's gift lines (`gift: true`, price 0) follow the server on every cart change
  (event `b:gifts-change`). Pack cards show "+ FREE <gift>" for the tier a pack reaches. (Lunara, Lunara Black)
- Option values show `custom_name` when the listing sets one (pickers, dropdown, option cards). (Lunara Black,
  TwinklingTree)
- Product blocks `media_slider` (up to 10 images / videos, per-row count, shape, gap, radius, arrows), `faq` (own
  Q/A, else the store FAQ) and `size_chart` ("Size guide" link + popup with image / text, optional option filter).
- Generic popup hook `data-modal-open` / `data-modal` / `data-modal-close` (ui.js).
- `feature-rows` / `guarantee` fall back to the listing's `page.heroTitle`, `page.intro`, `page.features`,
  `page.guarantees` when they have no content of their own.
- Preview: mock gift tiers, `/api/storefront/cart/gifts`, `page.faqFromListing`; smoke: 4 gift checks.
### Fixed
- FAQ showed `page.faq` even when the platform marks it as not the listing's (`page.faqFromListing: false`);
  Theme-settings FAQ now comes first then (`snippets/faq-list.hbs`).
- Footer linked policies the store does not have; links now follow `policies.<key>` when the platform sends it.
- Video row / slider: tapping a plain image threw an error; a video file in an image slot is now swapped to a
  `<video>` in the browser too.

## 2026.11.04.2 — from TwinklingTree build
### Added
- Settings `font_weights` (Google Fonts weights to request) and `load_google_fonts` (off when the theme ships
  its own `@font-face`), because requesting weights a font lacks makes Google return no CSS.
- Setting `nav_show_shop` (hide the Shop link in the menu).
- Product section setting `sale_badge_style` (`-50%` or `50% OFF`).
### Fixed
- Product cards could stay hidden after a fast scroll (entrance animation): reveal check now runs on every
  scroll frame.

## 2026.11.04.1 — initial base (Lunara, TwinklingTree, Wayfare)
- Platform core (`core.js`): cart `sf-cart:<domain>` + legacy mirror, live discounts with the checkout formula
  and server quote, ViewContent / AddToCart / InitiateCheckout / Lead / Search, variant matching + `?variant=`,
  reviews GET/POST, contact, tracking links.
- Chrome: top bar (rotate / countdown), header + menu drawer + search, cart drawer with shipping protection,
  footer with newsletter and social links.
- Product section with 20 block types, reviews with write-a-review form, FAQ, testimonials, related, marquee,
  logo bar, image banner, image with text, icon columns, feature rows, spec card, steps, stats, comparison,
  guarantee / rich text, image row, newsletter, contact form, custom HTML.
- Pages: home, collection, search, page (policies / order tracking / contact), tracking result, checkout.
