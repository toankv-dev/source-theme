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
- **One side gutter for header and body.** Whatever side padding / max width the header has (topbar and
  footer too), every boxed body section uses the same, so their content edges line up on one vertical line at
  every width (1440, 1024, 390, 360):
  - set it once on `.b-wrap` (max width + `padding-inline`, per breakpoint) in skin.css and let the header and
    sections inherit it; never give one section its own side padding or max width that shifts its edge, and
    never add a gutter on an inner element of a section that already sits in `.b-wrap`;
  - align the *visible* edges: the first / last header item (menu icon, logo, cart icon) inside its 44 px tap
    area must sit on the same line as the body content (gallery, headings, cards) — offset the tap area
    (e.g. negative margin equal to the icon's inner padding), never shrink it below 44 px;
  - **exception — full-width sections** (edge-to-edge banners, image / video rows, marquees, coloured bands,
    sliders that bleed to the screen edge, as on the original): no side padding, keep their full width and
    size. A full-width band whose *text* is boxed puts that text in `.b-wrap` so it lines up again.
- Use the original's real texts. **Fonts and colours must be the original's exact ones** — measured, never
  guessed or "close enough" (see *Fonts and colours* below). Theme-wide images (logo, icons, payment badges,
  home page banners) may be copied from `_work/capture/home/images` into `assets/images/` as settings
  defaults. **The product page's images and videos are never downloaded from the source page** (capture it
  with `--no-images`): the main product's media comes from the product data and every other media slot is
  left empty for the merchant to upload (see below). The page's screenshots are the only visual reference.
- **No review form, ever.** Shoppers never write reviews on the storefront: no "Write a review" / "Write a
  Rating" button, modal or form, even when the original page has one (leave it out and say so in the report).
  Reviews are shown only (the store adds them in the admin). `tools/smoke.js` fails on `[data-review-form]`,
  `[data-review-write]`, `[data-review-modal]`.
- **Main product** (the `product` section: gallery, title, price, variants, packs, buy box, reviews) comes
  from the platform product data — never hard-code it. Set the sample (`sample/product.json`) to resemble the
  original so the preview compares fairly.
- **Every image / video on the product page that does not come from the product data is an empty, dynamic
  slot** the merchant uploads in the theme editor. That covers base sections (image with text, feature rows,
  banners, video row, image / video slider, comparison / steps / spec images) **and** everything the theme
  adds: its own sections and snippets, pack / bundle card pictures, gift tiles, story / promise / help tiles,
  avatars and testimonial photos, background pictures, before / after, charts drawn as images. Only UI icons
  (line icons, trust / payment badges, arrows, stars — inline SVG or tiny files) may ship with the theme. So:
  - each such slot is an `image_picker` setting (a video slot: `image_picker` with an `info` saying MP4 / WebM)
    on the section or block — never a `text` setting holding a file name / path (`theme_image`,
    `card_1_theme_image`, …), never a picture written into the `.hbs`, never a `background-image: url(…)` of a
    picture in skin.css, never a fallback to a file in `assets/images/`;
  - never copy those images / videos into `assets/images/` and never put them in `templates/product*.json`
    or schema `default`s — leave every slot empty;
  - keep as many slots (blocks) as the original has, with its texts, so the layout and the slot count match;
  - an empty slot must still render its frame at the original's size and aspect ratio (placeholder `b-ph` /
    `b-reel__ph`, with an "Upload …" hint only in design mode) — never collapse, hide or skip it, and never fall
    back to the product's own photos. If a base section skips or hides empty slots, fix that in `base-theme`
    (see the last section) rather than working around it in the theme;
  - each slot's schema label / `info` says what to upload (image or MP4 / WebM, recommended size / ratio).
  - In the visual diff these slots are expected to differ (placeholder vs the original's picture): compare
    their position, size and ratio, not their content.
  - Before packing, check: `templates/product*.json` holds no image / video path, `assets/images/` holds no
    product-page picture, and no section / snippet used on the product page points to `assets/images/` except
    for UI icons.
- Prefer one question to the user over a guess only when something cannot be read from the input
  (e.g. a screenshot shows no phone layout, or a font is unidentifiable).

## Fonts and colours (exact, and they must survive on the live store)

- **Read, don't estimate.** Fonts: `tokens.json` (`body`, `h1`–`h3`, `price`, `buttons[]`: family, weight, size,
  line height, letter spacing, case) + `fonts.json` (every face the page loads). Colours: `tokens.json` (`palette`,
  each button's text / background / border, top bar, header, footer, price) and, for what tokens miss (stars,
  badges, compare-at price, borders, section backgrounds), the exact pixel colour of the screenshot:
  `node tools/pixel.js <capture>/mobile.png --top 8 --y <a-b>` (most used colours of a band), `… x,y` (one
  point), `… --find "#hex"` (where a colour sits) — never a hex from memory or from a downscaled look. A desktop pass that hit a bot-check page has no tokens: take them from
  the phone pass. Colours can differ per page (PeakFlex: orange `#c25204` on home, `#cf5905` on product; stars
  `#f5a623` / `#ffbe59`) — take each from its own page and scope page-only ones to that page's CSS.
- Write the measured table into `plan.md` (role → font / weight / size, role → hex, with the source of each).
- **Fonts on the theme**: copy every face the original uses (all weights + italics from `fonts.json`) into
  `assets/fonts/`. Declare `@font-face` in a header snippet (`snippets/<prefix>-fonts.hbs`, `{{> …}}` right after
  `{{> vars}}` in `sections/header.hbs`) with `{{@root.assets_url}}/fonts/…` URLs — not `url("../fonts/…")` in
  a CSS file. Set `font` / `font_heading` / `font_weights`, `load_google_fonts: false` (Google-hosted original →
  keep `load_google_fonts` on with that exact family name instead). Pin it in skin.css so a store's stale saved
  "font" setting cannot replace it: `:root { --font: "<Font>", system-ui, sans-serif !important; --font-heading:
  … !important; }` plus `font-family: var(--font) !important` on body text elements (a separate heading / button
  family gets its own variable). Preload the 400 + 700 woff2 after `{{> head}}` in `layout/theme.hbs` and the
  templates. **Never touch the fonts of `templates/checkout.hbs`** (checkout / payment keep the platform's own).
- **Colours on the theme**: every override goes through `_work/build-*-settings.js`, which writes it into
  `settings_data.json` **and** as the default in `settings_schema.json` (a live store shows schema defaults when a
  key is not saved). Hard-coded hex in skin.css only for what has no setting, with a comment naming its source.
- **Check**: `node tools/style-audit.js http://localhost:8091 themes/<slug> [--allow "<intentional other font>"]`
  — fails when any text element on any page is not in the original's font (also with a stale saved font
  simulated) or a face fails to load; lists key element colours that are not in the original (tokens or
  screenshot pixels). Fix every line it prints before packing.

## Speed — every run faster than the last

Deliver as fast as possible without dropping a check. Before step 1, read `RUNLOG.md` (next to this file):
apply its **Shortcuts** and watch the step that was slowest last time.

- **Parallel by default**: send independent calls in one message. Start the captures (one command, pages one
  after another) in the background right after scaffolding, and read `base-theme/README.md` + the newest
  `themes/*/_work/plan.md` while they run. Start the preview server once, in the background; it watches files.
- **Use the tools, don't write throwaway scripts**: texts → `capture/<name>/text.txt`; self-hosted fonts →
  `capture/<name>/fonts/` (only the faces the page loads, see `fonts.json`); a tall screenshot →
  `tools/crop.js --slices`; pick images → `tools/contact-sheet.js`; one section / one measurement →
  `tools/shot.js --selector` / `--eval`; compare → `tools/side-by-side.js`; images → `tools/scripts/to-webp.js`;
  CSS over budget → `tools/scripts/css-compact.js`, `css-merge.js`, `css-split.js`.
- **Read by need**: the README catalog and class names first; for the base markup of one part `grep` the class
  in `sections.css` / the `.hbs` instead of reading whole files.
- **Generate, don't hand-patch JSON**: `templates/product.json`, theme-only global settings and long texts
  (FAQ) come from small `_work/build-*.js` scripts you edit and re-run (see `themes/resilia/_work/`).
- **Batch the checks**: one `shot.js` call per page and width; while iterating re-run only what failed; smoke +
  mobile-audit + pack once at the end.

At the end (after the report), update `RUNLOG.md`: add one line to **Runs** (date · theme · rough minutes per
step · slowest step) and turn what slowed you into a concrete **Shortcut**. If the same step is slowest in two
runs, fix it with tooling (a flag or script in `tools/`) instead of another note. Keep the file under ~50 lines.

## Steps

1. **Scaffold**: `node tools/new-theme.js "<Name>" --source "<url or image paths>"` → `themes/<slug>/`.
2. **Capture the input**
   - URL: `node tools/capture.js <url> themes/<slug> --name product --no-images` (product page: never download
     its images / videos), and `--name home` / other pages given without `--no-images`. If only a product page
     is given, the logo is the one file that may be saved by hand (its URL from `page.html`); nothing else. If a
     product capture already has an `images/` folder, delete it.
     Read `tokens.json` (fonts, colours, button / header / topbar / footer styles), `sections.json`,
     `text.txt` (all texts incl. hidden FAQ answers), `fonts.json` (copy `fonts/*` into `assets/fonts/`), and
     LOOK at `desktop.png`, `mobile.png` and `sections/NN-*.png`. If a capture misses content (lazy / animated
     blocks, pop-ups), take extra screenshots with `node tools/shot.js` or re-run with `--keep-popups`.
   - Images: read them with the Read tool; measure proportions; note fonts, colours (exact hex with
     `tools/pixel.js`), spacing,
     radius, shadows, icon style, every text. Ask for the phone view if only desktop is given.
3. **Map sections**: write `themes/<slug>/_work/plan.md` — the original's sections top to bottom, each mapped
   to a base section / block (see the catalog in `base-theme/README.md`) or marked NEW, plus the design tokens.
4. **Build**
   - Tokens (measured — see *Fonts and colours*) → `config/settings_data.json` + schema defaults via the
     build-settings script (primary, primary_text, text_color, page_bg, header/topbar/footer
     colours, sale, star, check, badge, font, font_heading, radius, btn_radius, btn_case, page_width, top bar
     style + texts, menu labels, cart texts, home_* settings).
   - Product page → `templates/product.json` (section order, block order, block settings with the original's
     texts; image / video settings of content slots left empty — see Rules). In `plan.md`, list each media
     slot with its size / ratio and whether it takes an image or a video. Home → `home_*` settings and, if
     needed, the theme's own `templates/index.hbs`.
   - Look → `assets/css/skin.css` (override base classes; keep selectors flat and commented by section).
   - Run `node tools/scripts/prune-css.js themes/<slug>` only after copying/renaming markup, to drop dead rules.
5. **Compare and iterate** (preview in the background: `node tools/preview-server.js themes/<slug> --port 8091`):
   - `node tools/visual-diff.js themes/<slug>/_work/capture/product/desktop.png http://localhost:8091/product --out themes/<slug>/_work/diff`
     and the same with `mobile.png --width 390`. For image input, use `node tools/shot.js` and compare by eye
     side by side with the Read tool.
   - Check the gutter: at 1440 and 360 px, the left / right edge of the header content and of each boxed
     section's content must match (within 1 px); full-width sections must touch the screen edges.
   - Look at `diff-*.png` and the worst bands; fix the biggest mismatch first (layout and sizes before colours,
     colours before fine spacing). Repeat until every section matches; content-driven differences (other
     product photos, review texts, empty media slots showing placeholders) are acceptable — say which remain.
6. **Verify behaviour**: `node tools/smoke.js http://localhost:8091` must pass (cart, pixels, checkout,
   packs, reviews, contact, tracking, search). Also open `/checkout`, `/pages/track-your-order`,
   `/collections/all`, `/search?q=` and `?legacy=1` once.
   **Fonts and colours**: `node tools/style-audit.js http://localhost:8091 themes/<slug>` must print no FAIL and no
   colour line.
   **Mobile first**: `node tools/mobile-audit.js http://localhost:8091` must report 0 errors (sideways
   overflow, fields < 16 px, LCP / CLS over budget); fix every warning the skin introduced (taps < 44 px, text
   < 12 px, lazy first-screen image) unless the original page has it on purpose — say which remain.
7. **Pack**: `node tools/pack.js themes/<slug>` → `dist/<slug>-<version>.zip` (0 errors required).
8. **Report** (Vietnamese): the zip path, what matches, remaining differences with their cause, sections added
   beyond the base, the list of empty media slots the merchant should fill in the editor (section → slot →
   image or video, recommended size), and that the zip must be uploaded in the Adlux admin (Themes → upload) to check live.

## When the base itself should grow

If a new section would clearly be useful for later themes too (it appeared in 2+ themes), build it in
`base-theme` instead (generic settings, base styles), run the base's smoke test and pack it, then use it in the
child theme. Mention this in the report.
