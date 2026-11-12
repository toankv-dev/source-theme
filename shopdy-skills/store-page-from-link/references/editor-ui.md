# Driving the shopdy page editor

All browser work goes through `scripts/shopdy.py` (Playwright for Python, sync API). Run every command from the
skill folder with `python -I`, one command at a time (one browser profile cannot be opened twice). Each command
prints one JSON object; read it before the next step.

```
S=.claude/skills/store-page-from-link/scripts
python -I $S/shopdy.py login                       # once; the profile in _work/.profile keeps the session
python -I $S/shopdy.py options                     # stores (+ products) and layouts with their block lists
python -I $S/shopdy.py create --job J --name "…" --store "<domain>" --layout "Advertorial" [--product "…"]
python -I $S/shopdy.py upload-media --job J --plan _work/J/build-plan.json
python -I $S/shopdy.py build --job J --plan _work/J/build-plan.json [--from N]
python -I $S/shopdy.py inspect --job J [--block "#5" --fields]
python -I $S/shopdy.py shot --job J --view mobile|pc  |  --phone
python -I $S/shopdy.py verify --job J
python -I $S/shopdy.py exec --job J --script _work/J/snippet.py
```

Exit codes: 3 = the page is not Draft (stop, tell the user) · 4 = not signed in (run `login`) · 5 = a build op
failed (JSON has the op, the error, a screenshot and the inspector's fields) · 6 = the guard blocked a request
(read `_work/J/guard.log`).

## The guard (scripts/_common.py)

Every command routes `**/api/**` through a guard. Allowed writes: sign-in/refresh, `POST /api/store-pages` (create),
`PATCH /api/store-pages/<this job's page>`, the editor's main-product preview, `POST /api/media/upload*`. Blocked
and logged: any body with `"status": "published"`, every `DELETE`, a `PATCH` to another page, the AI autoflow, any
other write. Never widen the allow-list to publish, delete, or touch other pages, layouts, products or stores.

## Build plan

`_work/<job>/build-plan.json` = `{"ops": [ … ]}`, run top to bottom in one editor session. Put a `save` op after
every section: progress is recorded at each save, and a failed run resumes from the last save (`build` picks it up
itself; `--from N` forces a start).

| op | fields | does |
| --- | --- | --- |
| `add` | `type` (block type), `as` (alias) | clicks "Add <Label> block" (appends, selects it, opens all inspector groups) |
| `select` | `block` (alias, block id, or `#N` = Nth block) | focuses the block and presses Enter |
| `fill` | `label`, `value` or `value_file` (path in the job folder), `nth` | text / textarea / rich text / CodeMirror (HTML, CSS); blurs to commit |
| `fill` + `html` | `label`, `html` | rich text with formatting (`<b>`, `<a>`, lists): sets the box's HTML |
| `number` | `label`, `value` | number input or slider |
| `color` | `label`, `value` (`#RRGGBB`) | the hex box beside the colour swatch |
| `choose` | `label`, `option` (visible text) | Radix select / `<select>` / toggle buttons |
| `toggle` | `label`, `value` (true/false) | switch / checkbox |
| `image` | `label`, `media` (file name from `assets/` or URL) | pastes the media-library URL into "<label> URL" / "…or paste a URL" |
| `click` | `name`, `role` (button), `scope` (inspector/page), `nth` | e.g. "Add review", "Add step", "Add blank slide" |
| `action` | `name` | selected block's toolbar: Move up · Move down · Duplicate · Delete · Convert to editable blocks |
| `page` | — | deselect; the right panel shows Page settings |
| `press` / `wait` / `note` | `key` / `ms` / `text` | keyboard, pause, comment |
| `save` | — | clicks Save, waits for the PATCH, fails unless the page is still Draft |

Any op with `"scope": "page"` works on Page settings (Font, Content width, Page background, Layout, Product this
page sells). `{{media:<file>}}` in any value becomes that file's shopdy URL (`upload-media --plan` uploads only the
files a plan names, `media-map.json` keeps file → URL).

List items: click the "Add …" button, then fill the item's own label — `Review 3 name`, `Review 3 text`,
`Step 2 title`, `Row 4 ours`, `Bullet 1`, `Link 2 address`, `Slide 3 image`, `Trust line 1 icon`. When a label is
unknown, run `inspect --job J --block <alias> --fields` and use what it lists.

Example (a hero, a reason, an FAQ in HTML):

```json
{"ops": [
  {"op": "note", "text": "s01 hero"},
  {"op": "select", "block": "#3"},
  {"op": "fill", "label": "Text", "value": "The 30-second fix for squeaky floors"},
  {"op": "choose", "label": "Level", "option": "H1: page title"},
  {"op": "select", "block": "#4"},
  {"op": "image", "label": "Image", "media": "j-004-hero.webp"},
  {"op": "fill", "label": "Alt text", "value": "Fixing a floor gap"},
  {"op": "save"},
  {"op": "note", "text": "s07 faq"},
  {"op": "add", "type": "html", "as": "faq"},
  {"op": "fill", "label": "HTML", "value_file": "sections/s07-faq.html"},
  {"op": "fill", "label": "CSS", "value_file": "sections/s07-faq.css"},
  {"op": "save"}
]}
```

## Selectors the scripts rely on (verified against the code, 2026-11-12)

| What | Selector | Source |
| --- | --- | --- |
| Sign in | test ids `login-email`, `login-password`, `login-submit` | `apps/web/src/components/login-form.tsx` |
| New page | button "New page" on `/store-pages` | `store-pages.page.tsx` |
| Store picker | combobox "Pick a store", search "Search domain", options | `store-picker.tsx` |
| Product picker | **button** "Product it sells" (not a combobox), search "Search products", listbox "Products" | `product-picker.tsx` |
| Layout cards | radiogroup "Layout", radio named after the layout | `layout-picker.tsx` |
| Page name | placeholder "Floor Gap Fixer story"; slug "Page slug" | `create-store-page-dialog.tsx` |
| AI autoflow | checkbox "Write the copy and make the photos with AI after creating" (on by default when a product is picked — the script unticks it) | same |
| Palette | test id `block-palette`, buttons "Add <Label> block" | `block-palette.tsx` |
| Canvas | test id `canvas-scroll`; each block `[data-block-id]`; its shell role=button "Select <Label> block" | `page-canvas.tsx` |
| Inspector | test id `block-inspector`; groups are Radix Collapsibles ("Spacing & layout", "Visibility" start closed) | `block-inspector.tsx`, `inspector-fields.tsx` |
| Save / Publish | header buttons "Save" and "**Publish**" side by side — never click Publish | `store-page-editor.page.tsx` |
| PC / Mobile preview | buttons "PC", "Mobile" inside `[data-page-header]` | `viewport-toggle.tsx` |
| Phone frame | test ids `device-frame`, `device-screen` | `device-frame.tsx` |
| Media upload | `#media-upload-file-trigger` → dialog `input[type=file]` → `#media-upload-btn` | `media.page.tsx`, `media-upload-dialog.tsx` |

## Gotchas found while testing the scripts on local

- Clicking a block selects whatever is under the pointer: an empty Image block opens its "Image options" menu.
  The script focuses the block shell and presses Enter instead.
- A label can point at a wrapper: the HTML/CSS labels name CodeMirror's `div[role=group]`; rich text rows also hold
  their toolbar's `<select>`s. The script steps into the editable box.
- Text edits commit on blur (`EditableText`); the script blurs after every fill.
- Escape is ignored while a field has focus; to reach Page settings the script blurs first.
- The upload dialog hands files to a background uploader and closes itself; the script counts the upload responses.
  A re-run maps files that are already in the library instead of uploading them twice.
- The storefront renders only Published pages (`storefront-pages.routes.ts`), so a Draft can only be checked in the
  editor preview: PC / Mobile toggle, and the editor itself opened on a 360 px phone (`verify` does both).
- Media URLs are absolute (`<SHOPDY_URL>/uploads/media/…`); images are stored as WebP by the server.
