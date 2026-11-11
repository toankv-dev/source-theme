# Lunara Black (brixpant.com) — changelog

## 2026.11.10.1 — one font (Archivo) on every page
### Changed
- `assets/css/custom.css`: last rule pins Archivo on every element, form control and ::before / ::after of every page
  that links it, merchant HTML included (was: Arial on buttons / inputs, sans-serif in Kaching badges). Only the FAQ
  check box icons keep their icon font.
- `templates/checkout.hbs`: Archivo (its own @font-face + the same rule, since the checkout does not link custom.css)
  instead of the "Checkout font" setting (Poppins on the store); no Poppins preloads, no Google Fonts stylesheet. The
  three unused Poppins files `assets/fonts/pxi*.woff2` are gone.
- "Tredvik – Brixpant bundle": Archivo instead of Montserrat / DM Serif Display, every heading at Lunara's weight
  (600); "More" under a review keeps a 44 px tap target. `_work/build-tvb.js` no longer ships Tredvik's fonts
  (`snippets/tv-fonts.hbs`, 4 font files) nor its Google Fonts link; `_work/tvb-overrides.css` pins the variables.
- `sections/product.hbs`: the size chart's system font stack → inherit.
- Settings removed (they would do nothing now): Typography → "Checkout font", and the 4 font settings of the "Tredvik
  template" group. Stored values stay in the store's data and are ignored; the editor drops unknown keys on save.
### Checked
- `_work/one-font-e2e.js`: preview 170/170 (11 pages + cart drawer + checkout with an item, 1440 / 390), live 170/170
  (home, catalog, the 3 products, contact, 4 policies, about, tracking; CSS swapped in the test browser only).
- `_work/tvb-e2e.js` 70/70, `_work/sticky-buy-e2e.js` 299/299, `_work/bundle-select-e2e.js` 510/510 (live 555/555),
  `_work/scope-css.test.js` 11/11; `tools/smoke.js` same as before. `tools/mobile-audit.js`: same errors as 2026.11.09.4;
  Tredvik page 2351 KB / 32 requests (was 2399 KB / 35). Checkout with an item: no sideways scroll, same font sizes.

## 2026.11.09.4 — bigger selects in the bundle packs
### Changed
- The Color / Size / … selects of each item of a pack are as big as vesnacharm.com's bundle: 44 px tall, 16 px text,
  light #ddd border, sharing the row (equal widths when the texts fit, never narrower than their text). A select that
  does not fit wraps under the other selects; the picture stays at the start of the first line.
  - Lunara templates (Kaching block): `assets/css/custom.css` (was content-wide, 29 px, 14 px text).
  - "Tredvik – Brixpant bundle": `_work/tvb-overrides.css` → `assets/css/tv-bundle.css` (was a grid of content-wide
    selects, 33 px / 14 px on desktop).
### Checked
- `_work/bundle-select-e2e.js`: preview 510/510 (every pack, 1440 / 390 / 360); live 558/558 (compression tank and knee
  sleeve with the new CSS swapped in the test browser only; the knee sleeve has 3 options and wraps on phones).
- `_work/tvb-e2e.js` 70/70, `_work/sticky-buy-e2e.js` 299/299, `_work/scope-css.test.js` 11/11. `tools/mobile-audit.js`:
  24 errors / 152 warnings (was 28 / 156: the Kaching selects were 14 px and 29 px tall); `tools/smoke.js`: same as before.

## 2026.11.09.3 — Buy now bar: small card on desktop
### Changed
- `snippets/lu-sticky-buy.hbs`, `assets/css/custom.css`: on desktop the bar is a small card at the bottom right (picture,
  title, price, button) instead of a full-width strip, with no empty strip under the footer any more. The picture is the
  first gallery item's thumbnail / poster, so a video first in the gallery does not play in the card. The price is the
  chosen pack's total on both templates (Lunara: copied from the selected Kaching pack; Tredvik: tv-ui.js). The
  scroll-to-top button moves above the card. Phone: unchanged, a full-width button.
### Checked
- Local preview: `_work/sticky-buy-e2e.js` 299/299, `_work/tvb-e2e.js` 70/70, `_work/scope-css.test.js` 11/11;
  `tools/mobile-audit.js` and `tools/smoke.js`: same result as 2026.11.09.2.
- The 3 real brixpant.com products at 1440 and 390, with the new CSS and markup swapped in the test browser only: card
  in place, price = chosen pack, footer not covered, click lands on the picker, cart empty, no page errors.

## 2026.11.09.2 — "Buy now" bar on every product page, Best Seller heading
### Changed
- New `snippets/lu-sticky-buy.hbs`, printed by `sections/product.hbs` (was the inline "CLAIM OFFER" bar) and
  `sections/tv-product.hbs` (replaces Tredvik's sticky card and its Add to cart button; `_work/build-tvb.js`). A click
  scrolls to the pack / option picker and never touches the cart; the main Add to cart button stays in the buy box.
  Desktop: shows once the main button is above the screen (it used to be hidden on Lunara templates). Phone: pinned
  from the start, stepping aside only while the main button is on screen.
- Theme settings → Cart & checkout: `sticky_buy_label` ("BUY NOW - SAVE 70%"). `tv-product`: "Sticky Add to cart bar"
  is now "Sticky Buy now bar", "Sticky bar style" is gone.
- `assets/css/custom.css`: room under the footer and above the scroll-to-top button for the bar; the home page heading
  has the same space above and below it (20 px each, was 40 / 0), the products stay where they were.
### Checked (local preview)
- `_work/sticky-buy-e2e.js` 243/243 (5 product templates and the home page at 1440, 390, 360), `_work/tvb-e2e.js` 70/70,
  `_work/scope-css.test.js` 11/11. `tools/mobile-audit.js` and `tools/smoke.js`: same result as 2026.11.09.1.

## 2026.11.09.1 — product template "Tredvik – Brixpant bundle" (docs/SPEC-lunara-brixpant-tredvik-template.md)
Starting point: the downloaded Lunara Black 2026.11.06.3. Its own files are unchanged except the ones listed under
"Changed".
### Added
- `templates/product.tredvik-brixpant-bundle.json`: the Tredvik product page (themes/tredvik 2026.11.09.2,
  `templates/product.json`) inside Lunara's header, top bar, footer and cart drawer. Texts and pictures are Tredvik's
  defaults.
- `sections/tv-product`, `tv-image-with-text`, `tv-steps`, `tv-comparison`, `tv-quotes`, `tv-faq`, `tv-reviews`
  (+ schemas) and `snippets/tv-*`, generated from Tredvik by `_work/build-tvb.js`.
- `assets/css/tv-bundle.css` (Tredvik base + sections + skin, scoped under `.tvb`), `assets/js/tv-core.js` /
  `tv-ui.js` (byte copies of Tredvik's), `assets/js/tv-bridge.js` (joins the buy box to Lunara's cart drawer).
- Montserrat / DM Serif Display fonts, `assets/images/tv-sections/` (slot defaults), `assets/images/tv-pay/`
  (Tredvik's payment icons; Lunara's `images/pay/` are untouched).
- Theme settings → "Tredvik template": 26 `tv_*` settings with Tredvik's values.
### Changed
- `sections/product-scripts.hbs`: Lunara's ViewContent script skips the Tredvik template (its own script fires it
  there). Every other page: same HTML, same events.
- `config/settings_schema.json` / `settings_data.json`: the "Tredvik template" group and its values appended; no
  existing value changed.
- `theme.json`: version, description. `README.md`: the template section.
### Checked (local preview)
- Cart, pixels, gifts, popups: `_work/tvb-e2e.js` 70/70 (template as shipped, 1440 + 390) and 112/112 (copy with packs
  1–4, tiered discount on, size chart block).
- Body vs the Tredvik original (same sample product): 1.46 % (1440), 0.55 % (390), 1.05 % (360) pixels differ.
- Lunara pages (home, 4 product templates, collection, about, checkout, tracking): HTML identical (product templates:
  plus the ViewContent guard line), screenshots 0.000 % different; Lunara's header / footer / drawer have the same
  computed styles on the new template (291 elements, 0 differences).
- Mobile audit 360 / 390: nothing new inside the template; JS 232 KB, CSS 701 KB on this page (Lunara alone: 113 KB /
  583 KB) — accepted.
