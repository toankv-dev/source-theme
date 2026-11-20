# Adlux theme workshop

Handlebars storefront themes for the Adlux platform (schema v2: `layout/theme.hbs` + `templates/product*.json`).

## Layout

- `base-theme/` — the base every new theme is built from (platform core + recurring sections). Read
  `base-theme/README.md` before changing any theme: layers, platform contract, JS API, section catalog.
- `themes/<slug>/` — themes built from the base. Inside, never packed: `_map/` = the theme's design map
  (committed), `_src/` = its build / patch scripts and their sources (committed), `_work/` = downloads, captures,
  plans and diffs (not committed: never put a script the theme depends on there).
- `reference/{lunara,twinklingtree,wayfare}/` — the original source themes (unzipped from the `*.zip` files at the
  root). Read-only reference; never build from them.
- `tools/` — `preview-server.js` (local engine, v1 + v2), `download-page.js` (one store page → offline copy in
  `_work/site/`: DOM, CSS, JS, fonts, every image / video, live screenshots, offline check, then capture.js on it),
  `media-grab.js` (every picture + video of one link, grouped and named, no mirror: `downloads/<host>-<handle>/`,
  `--to-theme <dir> --prefix <xx>` adds them to a theme's media library),
  `site-server.js` (serves that copy, no network), `probe-sections.js` (every block's text styles in one table),
  `capture.js` (original page → screenshots, tokens,
  sections, images, texts, used fonts), `visual-diff.js`, `shot.js` (page / `--selector` element shot, `--eval`
  probe), `smoke.js` (end-to-end platform checks), `mobile-audit.js` (phone layout + speed budget), `style-audit.js` (fonts + colours vs the original), `pixel.js` (exact
  colours from a screenshot), `new-theme.js`,
  `media-library.js` (a download → the theme's media: WebP in `assets/images/<prefix>-<group>/`, videos, originals in `_work/images/`, `_work/media-map.json`), `pack.js` (validate + zip to `dist/`), `side-by-side.js` (compare screenshot slices), `crop.js` (slice tall
  screenshots), `contact-sheet.js` (all images of a folder in one picture), `inspect-theme.js`
  (inventory a theme vs the base), `theme-map.js` (a theme's design map: `_map/design-map.md`, `--part <id>`,
  `--check`, `--ack`), `transcript-cost.js` (what a session cost, `--by-request --fresh`), `sync-core.js` (push base core files into built themes), `scripts/prune-css.js`,
  `scripts/build-base-settings.js`, `scripts/to-webp.js`, `scripts/css-compact.js` / `css-merge.js` /
  `css-split.js` (shrink a CSS file under the budget), `lib/` (shared helpers; `lib/media-guard.js` = pack.js check).
  Install once: `cd tools && npm install && npx playwright install chromium`. Tests of the tools: `cd tools && npm test`.
- `dist/` — uploadable zips.
- `docs/` — every spec, plan and task list (`docs/SPEC-<topic>.md`, `docs/plan-<topic>.md`,
  `docs/todo-<topic>.md`).
- `shopdy-skills/` — Claude skills made for the shopdy-promax repo (not used here), e.g. `store-page-from-link`.
  This is their source: edit here (bump `metadata.version` in `SKILL.md`), then install / update a shopdy-promax
  checkout with `node tools/install-shopdy-skill.js <shopdy-promax dir>` (keeps its `_work/` and `.env`). Never edit
  only the installed copy.
- `.claude/` — this repo's own skills `new-theme`, `theme-from-link`, `update-base` (committed). Everything else
  there (the other skills, `agents/`, `commands/`, `references/`) is a junction into an
  [agent-skills](https://github.com/addyosmani/agent-skills) checkout (`D:\agent-skills`): engineering skills from
  spec to ship, the `/spec` `/plan` `/build` `/test` `/review` `/code-simplify` `/ship` `/webperf` commands,
  reviewer agents and checklists. Read-only from here: a change belongs in agent-skills. After a clone, or when
  agent-skills adds or drops a skill, run `node tools/link-agent-skills.js [<agent-skills dir>]`. It never touches
  a real folder of this repo and keeps the links' block in `.gitignore`.

## Rules

- A new theme from a store link → follow the `theme-from-link` skill (`.claude/skills/theme-from-link/SKILL.md`):
  download only the page of each link (offline copy), put all its pictures and videos into the theme as slot defaults (the user replaces them later), then build it with the `new-theme` rules. From screenshots →
  the `new-theme` skill (`.claude/skills/new-theme/SKILL.md`). Both: start from `base-theme`, match the input
  exactly, deliver a zip.
- A theme zip given to improve the base → follow the `update-base` skill (`.claude/skills/update-base/SKILL.md`):
  absorb platform behaviour always and recurring sections/settings, bump the version, log it in
  `base-theme/CHANGELOG.md`, sync core files into `themes/*`.
- Specs, plans and task lists go in `docs/` — never at the repo root or in `tasks/`, whatever a skill's or
  command's default path says (spec-driven-development and `/spec` → `docs/SPEC-<topic>.md`,
  planning-and-task-breakdown and `/plan` → `docs/plan-<topic>.md` + `docs/todo-<topic>.md`; `/build` reads them
  there, not `SPEC.md` / `tasks/`). Link between them with relative paths inside `docs/`.
- Design map first: before reading a theme's code, read its `_map/design-map.md` (missing → `node tools/theme-map.js
  <theme-dir>` creates it) and open only what it points to (`--part <id>` gives the lines). After changing a theme, run
  `node tools/theme-map.js <theme-dir>`, fix the notes it flags (or `--ack <id>` when they still hold), and note what
  the code does not say (intent, traps, recipes). A map that is wrong about a file is a bug of the tool: fix the tool.
- The deliverable of a theme is always the zip from `node tools/pack.js <theme-dir>` (0 errors).
- Never edit a theme's `assets/js/core.js` or the checkout logic; keep the pixel / platform hooks.
- Only the platform engine's Handlebars helpers (listed in `base-theme/README.md`); `pack.js` enforces it.
- Base settings are generated by `tools/scripts/build-base-settings.js` — edit that, not the JSON.
- After changing `base-theme`, run the preview + `node tools/smoke.js` + `node tools/mobile-audit.js` (0 errors,
  0 warnings) + `node tools/pack.js base-theme`.
- Mobile comes first: the base must meet the highest bar for phone UI and speed (taps ≥ 44 px, text ≥ 12 px,
  fields 16 px, no sideways scroll, first-screen images eager, LCP / CLS in budget). Check every change at 360 px.
