---
name: new-theme
description: Build a new Adlux storefront theme that looks exactly like a given original page (a URL or screenshots), starting from d:\source-theme\base-theme, and deliver it as an uploadable .zip. Use whenever the user asks to create / clone / build a theme ("tạo theme", "dựng theme mới", "làm giống trang này", a store link or screenshots of a store page).
---

# New theme from base-theme

Output = **a zip of the new theme** in `d:\source-theme\dist\` (made by `tools/pack.js`), looking the same as
the input page on desktop (1440) and phone (390), with every platform behaviour of the base intact.
Talk to the user in Vietnamese.

## Rules

- Always start from `base-theme` (`node tools/new-theme.js <Name>`). Never start from a reference theme or
  from scratch, and never cut the original site's CSS/HTML wholesale: rebuild the look on the base's markup.
- Never edit `assets/js/core.js`, the checkout logic, the tracking-result script, `product-scripts.hbs` or
  `head.hbs`. Keep every `data-*` hook and the pixel hooks listed in `base-theme/README.md`.
- Restyle in this order: settings (`config/settings_data.json`: colours, fonts, radius, button case, texts) →
  `assets/css/skin.css` → the theme's own copy of a section/snippet when the layout really differs → a new
  section (same pattern as the base: `.hbs` + `.schema.json`, BEM class prefix of the theme, data-* hooks,
  `{{{this.attributes}}}` on blocks, fallback when `section` is undefined).
- Only engine helpers (see README). Test checkboxes with `(eq x false)`. No `theme.css`.
- Use the original's real texts, images (downloaded by capture into `_work/capture/*/images`, copied into
  `assets/images/` and referenced as settings defaults / section defaults) and fonts (Google Fonts name in
  settings; self-hosted fonts → copy the woff2 into `assets/fonts/` and declare `@font-face` in skin.css).
- Product data (title, price, variants, reviews) comes from the platform — never hard-code it. Set the
  sample (`sample/product.json`) to resemble the original so the preview compares fairly.
- Prefer one question to the user over a guess only when something cannot be read from the input
  (e.g. a screenshot shows no phone layout, or a font is unidentifiable).

## Steps

1. **Scaffold**: `node tools/new-theme.js "<Name>" --source "<url or image paths>"` → `themes/<slug>/`.
2. **Capture the input**
   - URL: `node tools/capture.js <url> themes/<slug> --name product` (and `--name home`, other pages given).
     Read `tokens.json` (fonts, colours, button / header / topbar / footer styles), `sections.json`, and LOOK at
     `desktop.png`, `mobile.png` and `sections/NN-*.png`. If a capture misses content (lazy / animated
     blocks, pop-ups), take extra screenshots with `node tools/shot.js` or re-run with `--keep-popups`.
   - Images: read them with the Read tool; measure proportions; note fonts, colours (estimate hex), spacing,
     radius, shadows, icon style, every text. Ask for the phone view if only desktop is given.
3. **Map sections**: write `themes/<slug>/_work/plan.md` — the original's sections top to bottom, each mapped
   to a base section / block (see the catalog in `base-theme/README.md`) or marked NEW, plus the design tokens.
4. **Build**
   - Tokens → `config/settings_data.json` (primary, primary_text, text_color, page_bg, header/topbar/footer
     colours, sale, star, check, badge, font, font_heading, radius, btn_radius, btn_case, page_width, top bar
     style + texts, menu labels, cart texts, home_* settings).
   - Product page → `templates/product.json` (section order, block order, block settings with the original's
     texts). Home → `home_*` settings and, if needed, the theme's own `templates/index.hbs`.
   - Look → `assets/css/skin.css` (override base classes; keep selectors flat and commented by section).
   - Run `node tools/scripts/prune-css.js themes/<slug>` only after copying/renaming markup, to drop dead rules.
5. **Compare and iterate** (preview in the background: `node tools/preview-server.js themes/<slug> --port 8091`):
   - `node tools/visual-diff.js themes/<slug>/_work/capture/product/desktop.png http://localhost:8091/product --out themes/<slug>/_work/diff`
     and the same with `mobile.png --width 390`. For image input, use `node tools/shot.js` and compare by eye
     side by side with the Read tool.
   - Look at `diff-*.png` and the worst bands; fix the biggest mismatch first (layout and sizes before colours,
     colours before fine spacing). Repeat until every section matches; content-driven differences (other
     product photos, review texts) are acceptable — say which remain.
6. **Verify behaviour**: `node tools/smoke.js http://localhost:8091` must pass (cart, pixels, checkout,
   packs, reviews, contact, tracking, search). Also open `/checkout`, `/pages/track-your-order`,
   `/collections/all`, `/search?q=` and `?legacy=1` once.
7. **Pack**: `node tools/pack.js themes/<slug>` → `dist/<slug>-<version>.zip` (0 errors required).
8. **Report** (Vietnamese): the zip path, what matches, remaining differences with their cause, sections added
   beyond the base, and that the zip must be uploaded in the Adlux admin (Themes → upload) to check live.

## When the base itself should grow

If a new section would clearly be useful for later themes too (it appeared in 2+ themes), build it in
`base-theme` instead (generic settings, base styles), run the base's smoke test and pack it, then use it in the
child theme. Mention this in the report.
