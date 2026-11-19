# Block notes: what the editor does not show

Reviewed against the editor on: 2026-11-12

The fields of every block (labels, kinds, options, limits) are in the **catalog** this machine made from the editor:
`catalog/block-catalog.md` (`shopdy.py catalog --show <type>` for one block). This file holds only what the
inspector cannot tell: what a block draws by itself, the HTML block's rules, editor traps, and which block fits which
competitor section. A block or field marked MỚI in the catalog is newer than this file: trust the catalog.
Do not read the shopdy source; if neither this file nor the catalog answers, read the code once and write the
question and the answer in `_work/<job>/catalog-gaps.md` (the maintainer folds it in here).

## Page settings (`"scope": "page"`)
Layout "One column" or "Story + sidebar on the right" (story left, 268 px column right on ≥ 1024 px; the first Side
product card and blocks set to the sidebar column go there). Fonts: Lato (default), Poppins, Inter, System default
only. Content width 320–1600 px (on a phone the page fills the screen). The product picked here is what `cta` /
`offer` / `stickybar` "Goes to … checkout" and `mainproduct` use. A page holds at most 200 blocks; a layout is
copied into the page, so change, delete and reorder its blocks freely.

## Editor traps (all blocks)
- Escape deselects the block (the inspector becomes Page settings).
- Text without its own colour looks grey in the editor canvas (it inherits the editor's colour); on the storefront it
  is the page colour. Give text an explicit colour (block Colour, a `<span style="color:…">`, or the HTML block's
  CSS) so both match.
- The editor's Mobile view is a narrow `div`, not an iframe: viewport `@media` queries do not fire there.
  `& {container-type:inline-size}` + `@container (max-width: 600px) {…}` in an HTML block's CSS works in the editor
  and on a phone alike.
- A Draft cannot be opened on the storefront; check it in the editor (PC / Mobile) and with `verify`.

## html
HTML ≤ 100 000 chars, CSS ≤ 20 000. The CSS is scoped to the block: every selector gets the wrapper in front
(`p` → `#sp-bN p`), `&` is the wrapper itself (`& {…}`, `&:hover`, `&.x`); selectors inside `@media`, `@supports`,
`@layer`, `@container`, `@scope` are scoped too; `@keyframes` stay global.
Kept on save: layout and styling markup, `<img>`, `<picture>`, `<video>` (`controls` or `autoplay muted loop
playsinline`), inline `<svg>`, `<details>/<summary>`, `<table>`, `<a href>`, `style` attributes.
Stripped: `<script>`, `<iframe>`, `<object>`, `<embed>`, `<base>`, `<link>`, `<meta>`, `<form>`, `on…=` handlers,
`javascript:` / `vbscript:` / `data:text/html` URLs — `sanitizedAway` in the save result lists them: a failed section.
Rules: a buy / claim button is never a link inside HTML (use `cta` / `offer` / `stickybar` / `mainproduct`);
pictures come from the media library (`{{media:<file>}}`); text ≥ 12 px, taps ≥ 44 px, nothing wider than the phone.
"Convert to editable blocks" (toolbar) turns simple HTML into native blocks.

## mainproduct
The product itself. On the storefront, when the store's theme has a product section, the block draws **the theme's
product section** (gallery + video, rating line, size-chart link, bundle / pack tiers with their prices, variant
selects, stock bar, Add to cart, payment icons, guarantee, the theme's own sticky add-to-cart): these come from the
theme and the product, not from the page. In the editor it shows a fallback preview. Needs the page's product.

## reviews
Styles: Quote cards with stars (`simple`), Social posts (`social`), Facebook comments (`comments`), Photo wall
(`product`: photo masonry). Which fields show depends on the style. The badge "Rated x/5 by N customers" counts the
product's published reviews when "Reviews from" includes the product, else the reviews written in the block. The
"Verified" tick and the date are 11 px by the block's own CSS (also on the competitor's shopdy pages).

## countdown
`{timer}` in the text is the clock; minutes restart per visitor (evergreen), it cannot count to a fixed date.
"Stick to the top while scrolling" makes the announcement bar.

## cta
"Goes to": scroll to the Main Product block, the checkout of the page's product, or a custom URL ("…or a custom
URL"). Every buy / claim / order button of the competitor is a `cta` (click tracking and the publish check need it).

## offer
Discount box: photo, headline, button, deal clock (minutes, 0 = off), note.

## stickybar
A button pinned to the bottom of the screen. Do not add one when the store's theme draws its own sticky add-to-cart
under `mainproduct` (two bars).

## product
Side product card; sticky in the sidebar layout.

## feature
Photo beside a heading and story (+ quote, stars, trust lines, fine print); stacks on a phone.

## steps
"How it works" beside a photo / GIF.

## comparison
"Ours vs others" table; more than 3 columns → `html` `<table>`.

## slider
Swipeable gallery, at most 8 slides.

## text
Rich text (bold, italic, colour, size, link, lists).

## heading
H1 / H2 / H3.

## image
One picture or GIF, optional link.

## header
Logo / brand bar; no menu.

## footer
`{year}` and `{store}` work in the text; links and small print.

## byline
"By … · date" with a portrait.

## share
Social share buttons.

## divider
A thin rule.

## spacer
A vertical gap.

## Competitor section → block

| On the competitor page | Use | Missing tool (→ ticket) when… |
| --- | --- | --- |
| The page is itself a shopdy page (`sp-block--*` in the DOM) | the same blocks: `source/shopdy-blocks.json` lists them with their values and CSS | — |
| Top bar with a timer | `countdown` (sticky) | it counts to a fixed date or rotates messages |
| Plain announcement bar, marquee | `html` (`@keyframes`) | — |
| Logo header | `header` | it needs a menu |
| Hero: title, subtitle, photo, button | `heading` + `text` + `image` + `cta`, or `feature`, or `html` | — |
| Autoplay video | `html` `<video autoplay muted loop playsinline>` from the media library | YouTube / Vimeo / iframe / HLS stream |
| Gallery / carousel | `slider` (≤ 8) | thumbnails strip, zoom, > 8 slides |
| Before/after drag, 360°, tabs, quiz | — | always (needs JS) |
| Photo beside text | `feature` or `html` | — |
| Trust badges, icon rows | `html` grid with inline SVG / media images | — |
| Numbered steps | `steps` | > 8 steps |
| Us vs them | `comparison` | — |
| Reviews / UGC / FB comments | `reviews` (the style that looks the same) | a live widget: copy it as static `reviews`, no ticket |
| Rating summary bars | `html` | — |
| FAQ | `html` `<details>/<summary>` | it must be a native editable FAQ (ask the user) |
| Buy box, packs / bundles, size-chart link, theme sticky add-to-cart | `mainproduct` (the store theme + product draw them) | a picker the theme and block lack |
| Offer box with clock | `offer` | — |
| Sticky buy bar | `stickybar` (only if the theme has none) | it must show price / variant |
| Sign-up / contact form | — | always (`<form>` stripped) |
| Popup, slide-in cart, exit intent | — | always (Lead Popups is a separate shopdy feature) |
| Live counters | static `html` | it must be live |
| Footer | `footer` | — |
| Other fonts | the closest of the four | the exact font is essential (ask first) |

A gap is a missing tool only if nothing here makes the section look **and** behave the same; a static look-alike in
`html` counts as done.
