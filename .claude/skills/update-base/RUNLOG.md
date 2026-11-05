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
- Already absorbed: volume bundle (`card_style` radio, `unit_pickers`, `unit_label`, `pack_color`, `includes_all`).

## Runs
<!-- date · zip · minutes per step (unpack/inspect/decide/implement/verify/version/sync/report) · slowest step -->
- 2026-11-05 · themes/club-ritual (no zip) · 0/0/1/2/2/1/0/1 · implement (quoting errors in one-line node patches)
