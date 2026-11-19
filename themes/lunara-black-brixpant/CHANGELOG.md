# Lunara Black (brixpant.com) — changelog

## 2026.11.16.5 — new section "Before / after slider"
### Added
- `sections/before-after.hbs` + `.schema.json` (Add section → Content → "Before / after slider"), as the "Your body
  changes instantly" block of tryeverheld.com: the after picture underneath, the before picture on top cut at the
  line, a 2 px line with a 40 px round handle (44 px wide to touch). Mouse: drag or click; touch: swipe sideways or tap,
  an up / down swipe still scrolls the page; keyboard: arrow keys / Home / End on the handle (`role="slider"`).
  Settings: before / after pictures (image_picker + `default_*` theme file), optional BEFORE / AFTER labels, start
  position 5–95 %, frame square / 4:5 / 4:3 / the after picture's own shape, line colour, pictures left / right
  (phones: above the text), heading + rich text (default = the brixpant "Reclaim Your Confidence And Power" text),
  space above / below. No heading and no text → the pictures alone, 600 px, centred. An empty picture keeps its frame
  (hint in the editor only). Own `<style>` and `<script>` in the section; the script wires every box once
  (`data-ok`), so two sliders on a page and the editor's section swap (it re-runs section scripts) both work.
  Replaces the merchant's Custom HTML video + code on /compression-tank.
### Checked
- Preview, 3 instances (theme files + labels / picked files, right side, own shape, start 30 %, yellow line / empty):
  1440 / 1024 / 390 / 360 — layout, drag (stops at 0 / 100 %), click, keys, swipe, tap, vertical swipe scrolls 235 px
  with the line untouched, the editor's swap re-wires the new section, no sideways scroll, no script errors.
  `mobile-audit.js`: same 3 errors / 19 warnings with and without the section (menu drawer, top bar — older), none on it.
- Live brixpant.com/compression-tank with the rendered section in place of the Custom HTML (test browser only):
  1440 = 539 px square + text right, 390 = 348 px + text below; drag and swipe move the line; Poppins; no errors.

## 2026.11.16.4 — banner Shop Now: hover widens the button again
### Fixed
- `assets/css/custom.css`: the banner box's button no longer sets its own padding (2026.11.16.3 did, at id level),
  so base.css's arrow hover works again — the button grows 30 px on the right (padding-right 3rem → 6rem) and the
  arrow slides into that room. Was: the button kept its width and the arrow covered "Shop Now".
### Checked
- Live brixpant.com, new custom.css swapped in the test browser only, hover at 1920 / 1440 / 1200 / 1100: button
  +30 px, arrow inside the button, 14–17 px clear of the label.

## 2026.11.16.3 — banner heading box: placed on the picture, scales with it
### Changed
- `templates/index.hbs` + `assets/css/custom.css`: from 1200 px wide the heading box is centred at "Heading box: from
  the left" / "from the top" % of the picture (new range settings `home_banner_box_x` / `home_banner_box_y`, default
  45 / 65 = right under the banner's "ENGINEERED FOR PERFORMANCE", between the man and the shirts) instead of the
  bottom centre, and is sized in vw so it keeps that place at every width (1920 px = 533 x 177 as before; heading /
  button text never under 20 / 13 px; base.css's 45rem minimum width dropped for it). Under 1200 px / "Under the
  picture": unchanged.
### Checked
- Live brixpant.com (new 2000x750 banner), new custom.css swapped in the test browser only, 1920 / 1600 / 1440 /
  1366 / 1280 / 1200: box 31–59 % across and 52–78 % down the picture at every width — below the headline (ends at
  48.6 %), clear of the man (28.8 %) and the shirts (63.5 %), heading on one line, no sideways scroll; 1100 / 390:
  under the picture as before.

## 2026.11.16.2 — Poppins, owearfit.com bar + cards, hushflex.com banner heading
### Changed
- **One font = Poppins** (was Archivo), the 400 / 700 faces (normal + italic) `base.css` already declares, headings
  700 — as owearfit.com. `assets/css/custom.css` (variables + the pin-everything rule), `templates/checkout.hbs` (same
  rule; it links base.css for the faces, preload = Poppins 400), "Tredvik – Brixpant bundle" (`snippets/tv-vars.hbs`,
  `.tvb` line of `assets/css/tv-bundle.css`; `_work/build-tvb.js` is not on this machine, so `ONE_FONT` there still
  says Archivo). The 4 `assets/fonts/archivo_*` files and their `@font-face` rules are gone (zip 2521 → 2382 KB).
- **Top bar** (`sections/header.hbs`, countdown style), owearfit.com's rules: Title and Subtitle on one line split by a
  thin "|", 24 px on desktop, clamp(12px, 3.6vw, 16px) on phones, 11 px / 10 px padding. Set Title = `BLACK FRIDAY 70%`,
  Subtitle = `ENDS IN` (the "|" is drawn by the theme).
- **Product cards** (`assets/css/custom.css`): Lunara Black's flat, left-aligned card rules are gone, so the cards are
  base.css's again, as owearfit.com: white, 12 px corners (6 px on phones), shadow, centred text, yellow stars
  (`#ffb400`, was green), 2-line title box, full-width Add to cart. Also the related products and the cart upsell
  cards.
- **Card Add to cart** (`assets/js/theme.js`, quick add): fills the fetched product page's `<template data-lu-json>`
  holders before reading them (inline scripts never run in DOMParser), as owearfit.com's build. Was: every product
  read as "no variants" and went into the cart with no colour / size (checked live: the compression tank, 24 variants,
  went in with `variant ""`). Now the quick add opens with the product's pack / Color / Size picker.
- **Banner heading box** (`templates/index.hbs`), Lunara's box as hushflex.com: heading + button (link empty = the
  first product). New settings under Home page → Banner: "Show the heading box", "Heading" (`home_banner_title`, a new
  id so a stored "Fall Sale…" of the old `home_banner_heading` cannot win; default `Black Friday - Up To 70% Off`),
  "Button label", "Button link", "Heading box position" (on the picture at the bottom centre from 1200 px wide / under
  the picture). Under 1200 px and on phones it is under the picture; the picture never shrinks for it.
- `config/settings_data.json` (new installs): the values brixpant.com now uses.
### Checked
- Preview (`tools/preview-server.js`), 1440 / 360: home, product (3 templates), catalog, checkout — only Poppins
  computed, only Poppins (+ the icon font) downloaded, no script errors, no sideways scroll; heading box text / button
  / first-product link right. `tools/smoke.js`: every step passes up to `[data-cart-drawer]`, which this theme never
  had (also fails on the committed version).
- Live brixpant.com with the new custom.css / theme.js / bar CSS swapped in the test browser only (box markup added
  by the test): bar on one line at 1920–360; banner = picture size at every width; box at the bottom centre on
  1920 / 1440, under the picture at 1024 / 768 / 390 / 360; card Add to cart opens the quick add with Color / Size for
  each item and the cart line carries `Black / S` + its options; no script errors.

## 2026.11.16.1 — home banner never cropped, heavier "BEST SELLER"
### Changed
- `assets/css/custom.css`, home banner (`#ms-home` only): as tall as its picture on every screen, so nothing of it is
  cut (was a 560 px box on desktop / 340 px on phones with the picture cropped to fill it: on a 1920 px screen the
  2000×750 banner lost 80 px top and bottom, on a 360 px phone the 1374×1145 one lost 24 px each side). Until the
  picture loads, an 8:3 box (6:5 on phones), the shape of the banners in use, keeps the page from jumping.
- `assets/css/custom.css`: the home product list heading is weight 800 and upper case (was Lunara's 600, as typed).
### Checked
- Live brixpant.com with the new custom.css swapped in the test browser only, at 1920 / 1440 / 1280 / 1024 / 768 /
  390 / 360: banner box = picture size at every width (no crop), no sideways scroll, heading 800 + upper case;
  with the banner pictures blocked the box is already the loaded size (1440×540, 360×300); the product page has no
  `#ms-home` / `.lu-home-products`, so it is untouched.

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
