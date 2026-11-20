---
name: theme-edit
description: Change a theme that already exists in d:\source-theme\themes\ (or base-theme) — fix the layout or the phone view, restyle, add a feature or a block, make one part like a part of another store's page, add a template from another link, answer how to do something in the shopdy admin, or split work that also needs shopdy-promax code. Use whenever the user asks to edit / fix / change / add to an existing theme ("sửa theme", "thêm vào theme", "làm giống phần … của đối thủ", "làm sao để … trong admin", "bị lỗi trên mobile"). A brand-new theme → theme-from-link or new-theme.
---

# Theme edit

Talk to the user in Vietnamese. Spec: `docs/SPEC-theme-edit.md`.

**Cost rule.** Every call re-reads the whole conversation, so a long session is what makes edits expensive (one day of
38 requests in one session cost 2.5× what 38 short sessions would). One request — or a batch of small requests for the
same theme — per session. Finish every reply with: "Yêu cầu tiếp theo: gõ `/clear` trước."

## 0. Start (≤ 3 calls)

1. `node tools/theme-map.js themes/<slug>` — creates or refreshes the design map; note any "review notes" line.
2. Read `themes/<slug>/_map/design-map.md`, and `_map/edit-log.md` if it exists (recent changes, open issues).
3. Sort the request; a message can hold several kinds — answer C first, then A / B, D last:
   - **A** change the theme's code (layout, phone view, colours, a feature, a block)
   - **B** make it like a part (or a whole page) of another link
   - **C** the user can do it in the admin (settings, order of sections, discounts, templates, reviews…)
   - **D** it also needs shopdy-promax code (price / cart / checkout logic, storefront API, a new editor setting type)

## A. Change the theme's code

- **Find, don't search.** `node tools/theme-map.js themes/<slug> --part <section | snippet | template | design | sources>`
  gives the file, the lines of each block, the CSS file and lines that style it, the settings, and which `_src/` script
  writes it at which lines. Open only those lines (Read with offset / limit; a minified file: the `grep -o` the map
  prints). No grep over the whole theme, no `cat` of whole files, no re-reading a file already read in this session.
- A file listed under "Sources" is generated or patched by `_src/*.js`: change the script at the lines the map gives,
  run it, never hand-edit its output. Read the map's notes first (e.g. Lunara: `#MainProduct-…` + `!important` wins).
- **Check with one command**, never by starting servers or writing scripts:
  `node tools/edit-check.js themes/<slug> --page <route> --selector "<css>"` → at 1440 and 360: box, font, colours,
  border, padding, sideways scroll, controls under 44 px, text under 12 px, console errors, then pack. An interaction:
  `--eval "<js expression>"`. A picture only when the numbers cannot tell: `--shot` (one per width). The preview keeps
  running between calls (`--stop` when done). Routes: `/`, `/product?template=<name>`, `/collections/all`, `/pages/<slug>`.
- Phone first: 360 px, taps ≥ 44 px, text ≥ 12 px, inputs 16 px, no sideways scroll.
- Budget: a small change ≤ 10 calls, a new block or feature ≤ 30. Over it → stop, say what is done and what is left.

## B. Like a part of another link, or a template from a link

- **One part:** `node tools/section-grab.js <url> --heading "<its heading>" --out themes/<slug>/_work/grab/<name>`, then
  read only `section.md` (texts with fonts and colours, phone sizes, buttons, items per row, scroll, interactions,
  media). Open `desktop.png` / `mobile.png` only if the summary is not enough. Its media into the theme: add
  `--to-theme themes/<slug> --prefix <xx>` (a prefix not used yet in the theme).
- **Every picture and video of a link:** `node tools/media-grab.js <url> --out themes/<slug>/_work/grab/<name>`
  (`--to-theme … --prefix <xx>` to add them to the theme).
- **A whole template from a link:** theme-from-link steps 2–4 for that one link (`download-page.js <url> themes/<slug>
  --name product-<x>`), on top of this theme's map.
- **Bot check (exit 2):** tell the user what the tool printed. A rate limit: try again later. A check page: run it again
  with `--headed` — the user passes the check in the window that opens — or ask for screenshots. Never get around it.
- Then build as A (a new section with its own `<style>` and settings, pictures as `default_*` from the media library) and
  compare: `node tools/edit-check.js themes/<slug> --selector "<css>" --ref <url> --ref-selector "<css>"` (prints only
  the styles that differ).

## C. The user can do it in the admin

- Answer from `references/platform-guide.md` and the theme's map (`--part design`, the section's settings). ≤ 3 calls,
  no shopdy code, no theme code. Click-by-click steps in Vietnamese.
- Before relying on an entry: `node tools/platform-guide-check.js`; if that entry's sources changed, re-check it in
  `D:\shopdy-promax` (read only), fix the entry, then `--update`.
- Not in the guide: say so, offer to look it up in shopdy's code (read only); then add the entry with its `Nguồn:` line
  and run `node tools/platform-guide-check.js --update`.

## D. It also needs shopdy-promax code

1. Stop before any code. Show the table of `references/shopdy-split.md` (what shopdy does, what the theme does, what the
   user does in the admin, the order, the risks) and ask for approval.
2. Approved → do the theme part (A) so that it works before shopdy ships (a setting, a fallback, nothing broken).
3. Write the shopdy spec at `D:\shopdy-promax\docs\<yyyy-mm-dd>-spec-<topic>.md` and a Jira ticket draft (templates in
   `references/shopdy-split.md`). Never change shopdy code: that needs a Jira key from the user and its own approved spec
   and plan.

## End of every request

1. `node tools/theme-map.js themes/<slug>`: fix the notes it flags (or `--ack <id>` if they still hold); add ≤ 5 lines of
   notes for what the code does not say (where a colour really comes from, a trap, a recipe).
2. One line at the top of `themes/<slug>/_map/edit-log.md`: `yyyy-mm-dd · request · files · open issues` (keep ≤ 30 lines).
3. `node tools/edit-check.js themes/<slug> --zip` → the zip in `dist/` (0 pack errors).
4. Report (Vietnamese): what changed, the zip, what the user still does in the admin, open issues, then
   "Yêu cầu tiếp theo: gõ `/clear` trước."
