# new-theme run log

Read before every run; update after it (see "Speed" in SKILL.md). Keep under ~50 lines.

## Shortcuts
- Link input (theme-from-link): `node tools/download-page.js <url> themes/<slug>` per link in the background replaces
  the captures; measure on `node tools/site-server.js themes/<slug> --port 8092`, never the live store. Product ≈ 1–2
  min / 75 MB, long home ≈ 3 min / 190 MB. Desktop bot checks often pass on the built-in retry; twice → phone only.
- Long pages: `node tools/probe-sections.js http://127.0.0.1:8092/<name> --width 1440` (and 390) = every block's fonts,
  sizes, colours, edges in one table (save as `_work/probe-*.txt`).
- Videos (2026-11-09): the download summary lists every video (`video …` lines, streams already turned into MP4s);
  copy the shown sections' files unchanged into `assets/videos/<prefix>/` as slot defaults + poster WebP; keep a
  `--refresh` for a bot-checked desktop: it no longer wipes the old viewport.
- Captures without a link: `capture.js` per page in the background (product `--no-images`); blocked sites: one try.
- Tall screenshots: `node tools/crop.js <png> <scratch>/m --slices 2000`; one part: `tools/shot.js <url> - --eval` /
  `--selector`; compare: `tools/side-by-side.js`.
- **CSS budget 120 KB**: run `mobile-audit.js` right after the first skin pass. Page-only CSS in its own file linked by
  that template (`<prefix>-home.css` in index.hbs); `css-compact.js` then `split-product-css.js themes/<slug> --prefix x`
  (moves product-only rules to `<prefix>-product.css`; mixed selector lists are split since 2026-11-08).
- Patch scripts: write them with the Write / Edit tool, then `node <file>`; heredocs and `node -e` mangle `\n`,
  regexes and `$`. JS replace with a function (`s.replace(a, () => b)`).
- Git Bash paths: `D:/…` in `a=b` arguments; `MSYS_NO_PATHCONV=1` before `--pages "/"`. `to-webp.js` splits `in=out`
  at the last "=" (download names keep `…__v=123`).
- Fonts / colours: measure (`pixel.js`, computed styles), pin, `style-audit.js`; its `--allow` is ONE selector group
  (`".b-topbar, .mt-home, h1, h2, .b-btn"`) for fonts the original uses on purpose. Pinned `h1–h3` serif overrides
  block fonts: give Inter / Georgia headings `!important` in the page CSS.
- Phone overflow: grids with `1fr` grow to their thumbs strip → `minmax(0, 1fr)` + `min-width: 0`; wide uppercase
  buttons in forms (search) → smaller padding / letter-spacing.
- Handlebars: `{{/if}}}` inside `<style>` parses as a triple-stash → write `{{/if}} }`. No string split in templates:
  lists are numbered settings (`many()`), tables from a textarea go through a small page script.
- Sample product: copy `tools/fixtures/product.json`, change title, price, options, packs; keep variants available
  (smoke picks the 2nd option). Product page with packs needs the `variant_picker` block.
- First smoke run right after a server start can fail on contact / AddToCart: re-run once before debugging.
- Home-heavy originals: own `templates/index.hbs` + `<prefix>-home.css` + `_work/build-<prefix>-settings.js` (theme
  groups replaced idempotently, defaults also in schema); theme product card gets `data-product-card` for smoke.js.
  `_work/` is not committed: reuse the newest builder on this machine if present.
- A product page whose blocks the home already has: move the home blocks into snippets (check the home HTML is byte-identical before / after) and render them with a section; copy their CSS with a generator into a file only that template links ONCE (one link per section = parsed N times, mobile-audit counts each).

## Runs
<!-- date · theme · minutes per step (scaffold/capture-or-download/map/build product/build other pages/compare/verify/pack+report) · slowest step -->
- 2026-11-06 · resilia (5 pages) · 1/9/6/15/14/8/6/6 · build (throwaway scripts → now tools)
- 2026-11-06 · peakflex (4 pages, product phone-only) · 1/10/5/22/16/8/8/3 · build product (CSS split was manual
  → split-product-css.js)
- 2026-11-08 · club-ritual-link (theme-from-link acceptance, 1 link: product, desktop bot-checked) · 0.5/1.5/1/4/0/2/2/1
  · build
- 2026-11-08 · maggies-tanks (theme-from-link, 1 link: home, 14 blocks; product = base + offer) · 0.5/3/8/0/20/5/6/1 ·
  build home (phone overflow, serif pin, CSS budget) → tools/probe-sections.js
- 2026-11-08 · maggies-tanks product page (theme-from-link, 2nd link on a built theme; reuse the home blocks) · 0/1.5/4/25/0/15/10/2 · build product (one source with home: snippets + generated mt-story.css; CSS budget)
