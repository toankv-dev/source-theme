# Driving the shopdy page editor

All browser work goes through the scripts (Playwright for Python, sync API), run with `python -I`, one at a time
(one browser profile cannot be opened twice). `shopdy.py ops` prints the op table, `shopdy.py help <command>` one
command — never read the scripts themselves.

```
S=${CLAUDE_SKILL_DIR}/scripts
python -I $S/fetch_competitor.py "<url>" --job J  # digest.md, overview-*.jpg, shopdy-blocks.json, styles.json, assets
python -I $S/shopdy.py login                      # once; the profile in _work/.profile keeps the session
python -I $S/shopdy.py options                    # short list; full JSON in _work/options.json
python -I $S/plan.py layout --job J               # which layout keeps most of the competitor's blocks, in order
python -I $S/shopdy.py create --job J --name "…" --store "<domain>" --layout "<name>" [--product "…"]
                                                  # + the block catalog: made the first time (≈30 s), else checked
python -I $S/plan.py draft --job J                # build-plan.draft.json + what to check
python -I $S/shopdy.py upload-media --job J --plan <plan>
python -I $S/shopdy.py build --job J --plan <plan> [--from N]
python -I $S/shopdy.py verify --job J             # Draft, content, phone checks, compare with the competitor
python -I $S/shopdy.py inspect --job J [--block REF [--fields | --values]]
python -I $S/shopdy.py catalog [--job J --refresh] | --show <type>
python -I $S/shopdy.py shot --job J --view mobile|pc | --phone
python -I $S/shopdy.py exec --job J --script <file>   # last resort; `help exec` lists what is in scope
```

Exit codes: 3 = the page is not Draft (stop, tell the user) · 4 = not signed in (`login`) · 5 = a build op failed
(the JSON has the op, the error, a screenshot and the inspector's fields) · 6 = the guard blocked a request
(`_work/J/guard.log`).

## The guard (scripts/_common.py)

Every command routes `**/api/**` through a guard. Allowed writes: sign-in/refresh, `POST /api/store-pages`
(create), `PATCH /api/store-pages/<this job's page>`, the editor's main-product preview, `POST /api/media/upload*`.
Blocked and logged: any body with `"status": "published"`, every `DELETE`, a `PATCH` to another page, any other
write. While the catalog is scanned every write is blocked, the job's page too. Never widen the allow-list.

## Build plan

`{"ops": [ … ]}`, run top to bottom in one editor session; progress is kept at every `save` op, and a failed run
resumes after the last save. `plan.py draft` writes one; edit it rather than writing one by hand.

| op | fields | does |
| --- | --- | --- |
| `set` | `label`, `value` [, `nth`] | fills the field the way its kind in the catalog says (text, rich HTML, number, slider, colour, select option, switch true/false, image media) |
| `set` + `match` | `label`, `match` (regex) | picks the select option matching it at run time (options that depend on the page, e.g. "Scroll to the Main Product block") |
| `optional: true` | on any field op | a field that may only show after an earlier op (a reviews style): skipped with a warning if it never shows |
| `add` | `type`, `as` (alias) | "Add <Label> block": appended at the END of the page, selected |
| `select` | `block` (alias, block id, `#N`) | selects the block (keyboard, not a click) and checks it against the catalog |
| `action` | `name` | toolbar of the selected block: Move up · Move down · Duplicate · Delete · Convert to editable blocks |
| `fill` | `label`, `value` / `html` / `value_file` | a text, rich text or CodeMirror box (`value_file`: a file in the job folder) |
| `item-image` | `item` ("Review 2"), `media` (file or `{{media:<file>}}`) | that row's photo from the media library |
| `click` | `name` [, `role`, `scope`, `nth`] | e.g. "Add review", "Add link", "Add step" |
| `page` | — | Page settings; later ops with `"scope": "page"` act there (Font, Content width, Page background…) |
| `note` | `text`, or `section` + `block` | a comment; `section` + `block` tells verify which block stands for which competitor section |
| `save` / `press` / `wait` | — / `key` / `ms` | Save (fails unless still Draft) / keyboard / pause |
| `number` `slider` `color` `choose` `toggle` `image` | `label` + value | what `set` picks itself |

`{{media:<file>}}` in a value becomes the file's media-library URL (`upload-media --plan` uploads only the files a
plan uses; `media-map.json` keeps file → URL). Labels come from `catalog/block-catalog.md`; numbered rows
("Review 3 name", "Link 2 address") exist after the "Add …" click.

When a field op does not find its field, the build reads the block again, fixes the catalog and tries the op once
more; the build's output lists every catalog fix (`catalogFixed`).

## Selectors the scripts rely on (verified against the code, 2026-11-12)

| What | Selector | Source |
| --- | --- | --- |
| Sign in | test ids `login-email`, `login-password`, `login-submit` | `apps/web/src/components/login-form.tsx` |
| New page | button "New page" on `/store-pages` | `store-pages.page.tsx` |
| Store / product / layout | combobox "Pick a store"; **button** "Product it sells"; radiogroup "Layout" | `store-picker.tsx`, `product-picker.tsx`, `layout-picker.tsx` |
| AI autoflow | checkbox "Write the copy and make the photos with AI…" (unticked by the script) | `create-store-page-dialog.tsx` |
| Palette | test id `block-palette`, buttons aria-label "Add <Label> block" | `block-palette.tsx` |
| Canvas | test id `canvas-scroll`; blocks `[data-block-id]`; shell "Select <Label> block"; toolbar "<Label> block actions" | `page-canvas.tsx`, `block-toolbar.tsx` |
| Inspector | test id `block-inspector`; Section = `div.border-b` > trigger; Row = label + control | `block-inspector.tsx`, `inspector-fields.tsx` |
| Save / Publish | header buttons "Save" and "**Publish**" — never click Publish | `store-page-editor.page.tsx` |
| PC / Mobile | buttons inside `[data-page-header]`; phone frame `device-frame` / `device-screen` | `viewport-toggle.tsx`, `device-frame.tsx` |
| Media | upload `#media-upload-file-trigger` → `#media-upload-btn`; picker dialog "Media library", "Search media", tiles `media-pick-<id>`, "Done" | `media.page.tsx`, `media-selector-modal.tsx` |

## Gotchas (found on the real editor)

- Escape deselects the block (the inspector becomes Page settings): a Radix select is closed by picking the option it
  already has, never with Escape.
- Clicking a block lands on its widgets (an empty Image opens "Image options"): blocks are selected with the keyboard.
- A slider (`RangeField`) has its label in a row of its own and cannot be `fill`ed: `set` / `slider` find it by
  label and set it the React way.
- Which fields and options an inspector shows depends on the block's settings and on the page (a "Photo wall"
  reviews block has more fields; "Scroll to the Main Product block" only once there is one). Checks during a build
  only add to the catalog; only `catalog --refresh` drops fields.
- Text edits commit on blur; the scripts blur after every fill.
- Uploads are handed to a background uploader; the script counts the upload responses and maps files already in
  the library instead of uploading them twice.
- The storefront renders only Published pages: a Draft is checked in the editor (PC / Mobile) and in the editor on a
  360 px phone (`verify`).
