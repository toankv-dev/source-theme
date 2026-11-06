# new-theme run log

Read before every run; update after it (see "Speed" in SKILL.md). Keep under ~50 lines.

## Shortcuts
- Captures: `for p in "product|<url>" "home|<url>" …; do node tools/capture.js "${p#*|}" themes/<slug> --name "${p%%|*}" …; done`
  in the background (product with `--no-images`). Blocked sites (memory: capture-blocked-sites): one try, no loops.
  Never re-capture a page for its phone images, texts or fonts: capture now saves both passes' images,
  `text.txt` and `fonts/`.
- Read a tall `mobile.png` with `node tools/crop.js <png> <scratch>/m --slices 2000`, not the downscaled whole.
- Measure gutters / sizes with `node tools/shot.js <url> - --width 360 --eval "<js>"` (no screenshot) and look
  at one part with `--selector ".rs-x"` instead of a full page.
- **CSS budget (120 KB transfer, headers included ≈ +1 KB)**: run `node tools/mobile-audit.js` right after the
  first skin pass, not at the end. Page-only CSS goes in its own file linked by that template only
  (`rs-home.css` in `templates/index.hbs`, `rs-pages.css` …); `skin.css` keeps what every page needs. Near the
  limit: strip comments from the theme's `sections.css` copy and drop unused font weights.
- Patch scripts: write them with the Write tool into the scratchpad, then `node <file>`. Bash heredocs and
  `node -e` mangle backslashes, regexes and `$` (3 failures in the Resilia run). JS replace with a function
  (`s.replace(a, () => b)`).
- Paths: `D:/…` in `a=b` arguments (Git Bash turns `/d/…` into `D:\d\…`).
- Fonts / colours: measure (`tools/pixel.js`), pin, verify with `tools/style-audit.js` — SKILL.md *Fonts and colours*.
  Card descriptions are HTML → `{{{ }}}` + line clamp.
- Handlebars: `{{/if}}}` inside `<style>` parses as a triple-stash → write `{{/if}} }`.
- Sample product: copy `tools/fixtures/product.json` into `sample/product.json` and change title, price, variants,
  options and packs to the original's; preview images go to `tools/fixtures/sample/<slug>/` as WebP.
- First smoke run right after a server start can fail on contact / AddToCart: re-run once before debugging.
- **CSS budget, product-heavy theme**: `node tools/scripts/split-product-css.js themes/<slug>` (after css-compact) moves
  product-only rules into `<prefix>-product.css` linked by the product layout; add the theme's own product classes to
  its PF list. Port 8091 may still be held by an old preview: start on another port and pass it to every tool.
- Home-heavy originals (10+ custom sections): one own `templates/index.hbs` + `<prefix>-home.css` + a settings
  builder with numbered settings (`many()` helper in themes/peakflex/_work/build-pf-settings.js); review cards stay
  on `data-home-reviews`, give theme cards `data-product-card` for smoke.js.
- Theme-only global settings: `_work/build-<prefix>-settings.js` (idempotent: replaces its own groups in
  `config/settings_schema.json`, writes defaults to `settings_data.json`) — copy it from `themes/resilia/_work/`.

## Runs
<!-- date · theme · minutes per step (scaffold/capture/map/build product/build other pages/compare/verify/pack+report) · slowest step -->
- 2026-11-06 · resilia (5 pages: home, product, tracking, contact, subscription) · 1/9/6/15/14/8/6/6 · build
  (throwaway scripts for texts / fonts / crops / probes, CSS budget hit at the end) → now tools
- 2026-11-06 · peakflex (4 pages: product phone-only + home, collection, tracking) · 1/10/5/22/16/8/8/3 · build product
  (2nd run in a row with build slowest: CSS budget split was manual → tools/scripts/split-product-css.js)
