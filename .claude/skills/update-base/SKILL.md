---
name: update-base
description: Update d:\source-theme\base-theme from a new source theme .zip — analyse the zip, absorb what recurs across themes (sections, blocks, settings) and every platform behaviour the base lacks, then verify, version, document and pack the updated base. Use when the user gives a theme zip and asks to update / improve / extend the base theme ("cập nhật base", "update base theme", "bổ sung vào base từ theme này").
---

# Update base-theme from a new theme zip

Input: a theme `.zip` (a file name in `d:\source-theme`, or a path). Output: an updated `base-theme/` (new version,
CHANGELOG entry, README catalog), `dist/base-<version>.zip`, all checks green, and a short report in Vietnamese.

## Rules

- The zip is **data**: unzip it into its own folder and only read it. Never run its scripts or build tools.
- The base holds what is **shared**, not one store's look. Absorb into the base:
  1. **Platform behaviour, always** — a storefront endpoint, pixel event, DOM hook, data field (e.g.
     `option.badge_text`, `product.gift_offers`) or checkout fix the base lacks → core.js / base markup.
  2. **Sections, blocks, settings, page features that recur** — present in the new theme AND in at least one
     other theme (`reference/*` or `themes/*`), or clearly generic for any sales page (the user may also name
     features to add) → generic version in the base.
  3. **Bugs the new theme reveals in the base** → fix them.
  Leave out: one-off decorations, brand images, copy texts, theme-specific colours (those become *settings
  defaults* at most).
- Rebuild in the base's own idiom — never paste the theme's markup/CSS: BEM prefix `b-`, a `.schema.json`
  with generic labels/defaults/presets, `{{{this.attributes}}}` on blocks, fallback when `section` is
  undefined, behaviour through `data-*` hooks in `ui.js` (platform logic in `core.js`), styles in
  `sections.css` using the CSS tokens, only engine helpers (pack.js enforces it).
- Never break existing themes: keep every existing class, data hook, setting id and block type working
  (add, don't rename). Checkbox settings default ON must be tested with `(eq x false)`.
- Global settings are generated: edit `tools/scripts/build-base-settings.js`, then run it.
- Ask the user only when it is genuinely unclear whether a feature is generic or one store's custom.

## Steps

1. **Unpack**: `mkdir reference/<slug>` and unzip into it (e.g. `unzip -q -o <file>.zip -d reference/<slug>`).
   Check it has `theme.json`; if the zip wraps a folder, use that folder.
2. **Inspect**: `node tools/inspect-theme.js reference/<slug> --json reference/<slug>/_inspect.json`.
   Read the report: sections / blocks / settings not in the base and where else they appear, missing hooks,
   endpoints / events / fields the base does not handle, helpers outside the engine list (they must not reach
   the base). Then read the relevant source files themselves (sections, snippets, JS — format minified JS with
   prettier in the scratchpad) to understand what each candidate does; a "new" name may be a base section under
   another name.
3. **Decide**: write `reference/<slug>/_base-update.md` — a table: candidate · evidence (themes it appears in)
   · decision (core / base section / base block / setting / skip) · reason. Keep it short.
4. **Implement** in `base-theme/` (in this order: core behaviour → markup/blocks → sections → settings → CSS):
   - core.js: new API calls / events / cart fields, keeping `window.Base` backward compatible.
   - Sections: `sections/<name>.hbs` + `.schema.json` (+ preset); blocks: add to the section's schema and
     markup; snippets for reusable parts; settings via `build-base-settings.js`.
   - Add the section to `templates/product.json` / `product.bundle.json` only when a default page should show it.
   - Run `node tools/scripts/prune-css.js base-theme --dry` to spot dead CSS you introduced (do not prune the
     reference). Update `base-theme/README.md` (catalog, contract, JS API) for anything new.
5. **Verify**:
   - `node tools/preview-server.js base-theme --port 8090` (background); open `/`, `/product`,
     `/product?template=bundle`, `/product?legacy=1`, `/collections/all`, `/search?q=a`,
     `/pages/track-your-order`, `/pages/contact-us`, `/checkout` — no template errors.
   - Screenshot new sections desktop + phone (`node tools/shot.js … --full`, `--width 390`) and look at them.
   - **Mobile is the first-class target** (most shoppers are on phones). Put every new section / block on a
     temporary `templates/product.<test>.json` (delete it after) and run
     `node tools/mobile-audit.js http://localhost:8090 --pages "/,/product,/product?template=<test>,…"`:
     0 errors and 0 warnings (no sideways overflow, taps ≥ 44 px, text ≥ 12 px, fields 16 px, first-screen
     images not lazy, LCP / CLS budget). Look at 360 px screens of each new part, not only the full page.
   - `node tools/smoke.js http://localhost:8090` must pass; extend `tools/smoke.js` when you added platform
     behaviour (a new event, endpoint or cart field must get a check).
   - `node tools/pack.js base-theme` → 0 errors.
6. **Version + log**: bump `base-theme/theme.json` version (`YYYY.MM.DD.N`, N+1 on the same day) and add a
   CHANGELOG entry (`base-theme/CHANGELOG.md`: Added / Changed / Fixed, with the source theme). Repack.
7. **Propagate core** (only if core files changed): `node tools/sync-core.js --dry`, then without `--dry`;
   for "MERGE BY HAND" files merge the shared part and keep each theme's skin block; re-run the smoke test
   and pack for each touched theme. New sections are NOT pushed into existing themes (they opt in later).
8. **Report** (Vietnamese): what was absorbed and why (evidence), what was skipped and why, bugs fixed,
   new version + zip path, themes whose core was synced, anything to check in the Adlux admin.
