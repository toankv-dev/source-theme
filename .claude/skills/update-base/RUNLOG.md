# update-base run log

Read before every run; update after it (see "Speed" in SKILL.md). Keep under ~50 lines.

## Shortcuts
- Unpack + inspect in one command: `unzip -q -o <zip> -d reference/<slug> && node tools/inspect-theme.js reference/<slug> --json reference/<slug>/_inspect.json`.
- Start `node tools/preview-server.js base-theme --port 8090` in the background right after unpacking; it watches
  files, so keep it running for the whole run.
- Already absorbed (see CHANGELOG): free gifts, option `custom_name`, `media_slider`, `faq`, `size_chart`,
  modal hook, `feature-rows` / `guarantee` fallbacks, phone pass. A theme repeating these needs no new work.
- Validate with `pack.js --no-zip` while iterating; build the zip once after the version bump.
- Patching JS with a Node script: replace with a function (`s.replace(a, () => b)`) — a string replacement turns
  `$$(` into `$(` and breaks ui.js. Write patch scripts to the scratchpad; `node -e` with backticks / `$` in bash fails.
- A feature first built in `themes/<slug>` (no zip): diff the theme's file against `base-theme/` and port the
  part in `b-` names; skip unzip/inspect.
- Class names glued in Handlebars (`b-x--{{…}}`) look dead to `prune-css.js`: write the full class name.
- Already absorbed: volume bundle (`card_style` radio, `unit_pickers`, `unit_label`, `pack_color`, `includes_all`),
  animated menu drawer + `details[data-accordion]` FAQ hook (2026.11.06.2).
- Interface changes (ui.js / sections.css) go to the base and to the theme built in the same session only — the
  user does not want older themes touched unless asked. Check `git status` first: base may hold another
  uncommitted bump today (take the next `.N`).
- Preview servers just started make the first smoke run flaky (contact / AddToCart): re-run once before debugging.
- Themes near the 120 KB CSS budget: strip comments from the theme's copy of sections.css (base keeps the docs).

## Runs
<!-- date · zip · minutes per step (unpack/inspect/decide/implement/verify/version/sync/report) · slowest step -->
- 2026-11-05 · themes/club-ritual (no zip) · 0/0/1/2/2/1/0/1 · implement (quoting errors in one-line node patches)
- 2026-11-06 · request "FAQ + header menu always animate" (no zip) · 0/0/1/3/4/1/6/1 · propagation to old themes (reverted on request)
- 2026-11-06 · request "image-with-text text alignment" (no zip) · 0/0/0/2/3/1/1/1 · verify (shot + audit + smoke); theme copy needs the theme's own breakpoint (PeakFlex 750, base 900)
- 2026-11-06 · request "comparison rows add / remove" (no zip) · 0/0/1/1/2/1/1/1 · decide (rows were already blocks: check the schema before building)
- 2026-11-06 · request "reviews list layout" (no zip) · 0/0/1/4/3/1/2/1 · implement (patch script; escaped \n in a Node fix broke it — write fixes with Edit). Product page CSS of a theme near budget: run css-compact.js after porting
- 2026-11-06 · request "no review form, ever" (no zip) · 0/0/0/2/2/1/1/1 · implement (removal script: hbs, snippet, schema, ui.js, CSS)
