# Lunara (hushflex) — changelog

## 2026.11.19.2 — "Find my size" as getionix.com
### Added
- Product block **Find my size (weight)** (`sc_fit`, `snippets/sc-fit.hbs`), modelled on the size finder of
  getionix.com (Sculpt 3D leggings): a pill button with a turning border opens a pop-up with US (lbs · ft) / Metric
  (kg · cm), Weight and — when the chart has a Height column — Height (optional), a live result (one size, or both when
  the weight sits on the line between two; a height outside the size's range adds the next size), the full chart with
  the matching rows marked, an optional second table, a "customers have found their fit" line, and "Select M", which
  sets the Size option of the main picker and of every pack row. Charts are typed as text (`Size | Weight | …` lines);
  Metric converts weights, heights and (in) columns. Every text is a setting. Fonts = the theme's; accent = the
  highlight colour (#790236); getionix's cream / dark / gold → pale tint / #333 / highlight. Own `<style>` + `<script>`:
  works in any product template.
- Template "Shapecurve – Drop-seat bodysuit": Find my size uses it (in place of Lunara's size finder) with the
  bodysuit's chart from shape-curve.com: weight + US size, and bust / waist / hip as the second table. That chart has
  no heights, so the Height field stays hidden until a Height column is added.
- `sections/product.hbs`: block type `sc_fit` (in `_work/patch-sc.js`; edits now carry an "already applied" marker).
### Checked
- `_work/sc-e2e.js` (1440 + 390): 110 lbs → XS / S (both rows marked), Metric 50 kg + chart in kg, second table,
  130 lbs → M → "Select M" sets the main picker and the pack rows, Esc closes; on a copy with getionix's chart:
  Height shows, 150 lbs → M, + 5′9″ → M / L, Metric 175 cm keeps M / L. Plus all earlier checks.
- Open pop-up at 360: no text under 12 px, no tap under 44 px, no sideways scroll. `mobile-audit.js`: only the
  theme's existing menu-drawer errors. Old templates' HTML unchanged.

## 2026.11.19.1 — new product template "Shapecurve – Drop-seat bodysuit"
### Added
- `templates/product.shapecurve.json`, rebuilt from shape-curve.com's Triple-Zone Compression Drop-Seat bodysuit page
  (downloaded 2026-11-19, `_work/site/`): Lunara product section with Look = Shapecurve, then feature cards, details,
  photo testimonials, trust badges, reviews, related products. Font = Poppins (the theme's); highlight `#790236` and its
  tints in place of the original's violets (radio, selected pack frame, pack badges, Find My Size, tag / icon gradients,
  tinted band `#F6EDF1`).
- Product section: settings `skin` (Lunara / Shapecurve), `skin_highlight`, `buy_now_label` (second button that adds
  the items and opens the checkout, through theme.js's `[data-ms-buy-now]`); blocks `sc_price` (price + compare-at +
  badge, updated by theme.js on variant change), `sc_highlights`, `sc_ship`, `sc_tabs` (accordion rows + size chart).
- `assets/css/sc-product.css`, `assets/js/sc-product.js` (picture colour tiles from each variant's picture, main picker →
  every pack row, size chart table), loaded only by a product section with Look = Shapecurve.
- Sections `sc-features`, `sc-details`, `sc-testimonials`, `sc-trust`; snippets `sc-icon`, `sc-stars`, `sc-pb-*`.
- `assets/images/sc-*`: every picture of the original page as WebP (media library); the two animated feature pictures
  re-encoded as animated WebP at 556 px, every 2nd frame (7.5 / 6.8 MB → 0.86 MB each; `_work/anim-webp.py`).
- `sections/reviews.hbs`: setting `show_write` (default on); the new template turns the "Write a review" button off.
### Changed
- `snippets/lu-size-finder.hbs`: a size value with a part in brackets (`XS (95-110 lbs)`) counts as its letter size,
  so Find My Size works on such products (was silent). Plain `S / M / L` values: unchanged.
### Checked
- Old templates (`product`, `bundle`, `sizes`, `tiles`) and home: HTML byte-identical before / after, except that one
  size-finder line.
- `_work/sc-e2e.js` (1440 + 390, bodysuit sample): picture tiles, main picker → pack rows, Buy 3 → 3 cart lines
  Brown / M, drawer subtotal = pack price, one ViewContent / AddToCart, Express checkout → /checkout, Find My Size 38 / 31 /
  41 in → M (125-140 lbs) picked, size chart 7 rows, dots, no sideways scroll, no script errors.
- `tools/mobile-audit.js` 360 / 390: only the theme's existing menu-drawer errors; LCP ≈ 0.3 s, CLS 0.012.
- `tools/smoke.js`: passes up to `[data-cart-drawer]`, which Lunara never had (same before this change).
- `tools/pack.js`: 0 errors (the old `theme.css` warning).
### Not rebuilt
- "Complete the bundle" (bodysuit + a bra from another product): Kaching packs are one product only.
- Recently viewed products; Okendo review widget (Lunara's reviews section instead); the original's weight-only size
  recommender (Find My Size asks bust / waist / hips).
