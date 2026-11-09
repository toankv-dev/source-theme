# Lunara Black (brixpant.com) — changelog

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
