# What a shopdy store page can be built from

The "tools already on shopdy" (rule 4). Source of truth: `packages/shared-types/src/domain/page-block.ts`
(schema, limits), `page-template.ts` (built-in layouts), `free-html.ts` (what the HTML block keeps),
`apps/web/src/features/store-pages/components/block-inspector.tsx` (the fields). If the code changed since this was
written, the code wins — re-read those files before deciding a section is impossible.

## Page-wide settings (Page settings panel, no block selected → ops with `"scope": "page"`)

| Setting | Values |
| --- | --- |
| Layout | One column (`single`) · Sidebar (`sidebar`: story left, 268 px column right on ≥1024 px; first Side product card + blocks with Column = Sidebar go there) |
| Font | Lato (default) · Poppins · Inter · System default — no other font |
| Content width | 320–1600 px (presets 640 / 760 / 900 / 980 / 1100); on a phone the page fills the screen |
| Page background | hex colour, edge to edge |
| Product this page sells | one listing of the store (optional) — CTA "Goes to" offers its checkout |

## Every block (palette tile = "Add <Label> block")

Every block also has: Padding ↕ / Padding ↔ (0–160), Align (Left / Centre / Right), Block background, Max
width, Show on (Desktop and mobile / Desktop only / Mobile only), Column (sidebar layout).

| Type | Palette label | Use it for | Main fields · limits |
| --- | --- | --- | --- |
| `header` | Header | top bar with logo / brand text | Logo text (empty = store name), logo image, Logo height 16–120, Tagline, Logo links to, colours, Sticky, border |
| `heading` | Heading | any title | Text (rich), Level H1/H2/H3, Colour |
| `byline` | Author line | "By … · date" with portrait | avatar, name, date, name colour |
| `share` | Share buttons | social share row | Label, networks, size 16–64, one colour |
| `text` | Text | paragraphs, bullet lists (rich: bold, italic, colour, size, link, lists) | Text (rich, ≤ 60 000), Colour |
| `image` | Image | one photo / GIF / banner | image (media URL), Alt text, radius, Links to |
| `slider` | Slider | swipeable gallery | ≤ 8 slides (`Slide N image`, `Slide N alt text`, "Add blank slide"), ratio 1:1 4:5 3:4 4:3 16:9, autoplay 0–15 s, arrows, dots |
| `feature` | Image + text | one "reason": photo beside heading + story (+ quote, stars, trust lines, fine print); stacks on phone | image, image side, heading, text, quote + name + badge, show stars, ≤ 4 trust lines (icon + text), note, link |
| `steps` | Numbered steps | "How to use: 3 steps" beside a photo/GIF | heading, ≤ 8 steps (`Step N title` / text, "Add step"), image + side, number colour |
| `cta` | CTA button | every buy / claim button | Button text, Goes to (product checkout · #main-product · custom URL), colours, Size S/M/L, full width, radius, extra CSS |
| `offer` | Offer box | discount box near the end: photo, "UP TO 50% OFF", button, deal clock, guarantee | image, headline (+colour), subheadline, text, button text + Goes to, countdown label + minutes 0–1440, note |
| `mainproduct` | Main product | the product itself: gallery, title, stars, price, variants, Add to cart (or bundle tiers "Buy 2 get 1") | product, title, show rating/price/compare-at, promo lines, gallery, variant style buttons/dropdown, quantity, label, destination checkout/product, ≤ 4 badges, picker mode variants/bundle (≤ 6 tiers) |
| `product` | Side product card | product card (sticky in sidebar layout) | title, image, rating, button + Goes to, ≤ 6 bullets (`Bullet N`, "Add bullet"), border colour, show on mobile |
| `stickybar` | Sticky bottom button | button pinned to the bottom of the screen | label, Goes to, colours |
| `comparison` | Comparison table | "Ours vs Others" table | title, column labels, ≤ 12 rows (`Row N feature/ours/others`, "Add row"), highlight colour |
| `reviews` | Reviews | testimonials | style `simple` (quote cards) · `social` (Facebook posts) · `comments` (FB comment thread, replies, likes) · `product` (photo masonry + "Rated 4.9/5"); ≤ 24 items (`Review N name/text/title/when`, rating 1–5, avatar, photo; "Add review"/"Add comment"); source manual / product / both |
| `countdown` | Countdown | ticking offer bar ("Order in the next {timer} …") | text with `{timer}`, minutes 1–120 (evergreen, restarts per visitor — not a fixed date), colours, "Stick to the top while scrolling" |
| `html` | Custom HTML | any STATIC section no block covers | HTML ≤ 100 000, CSS ≤ 20 000 (scoped to the block; `@media` and `@keyframes` work) |
| `divider` | Divider | thin rule | colour, thickness 1–12 |
| `spacer` | Spacer | vertical gap | height 4–400 |
| `footer` | Footer | copyright, links, small print | text (`{year}`, `{store}`), ≤ 8 links (`Link N label/address`, "Add link"), disclaimer, colours |

A page holds at most 200 blocks.

## Built-in layouts (New page → "Start from"), plus the workspace's own (`shopdy.py options`)

| Layout | Blocks, top to bottom |
| --- | --- |
| Blank page | none |
| News article + product card | ~20: author line, 7 reasons with a photo beside each, comparison table, Facebook-style comments, offer box, product card that follows the reader, sticky button |
| News — Battery Protector | ~23: finished news advertorial — author line, 6 reasons, verified-buyer quote with trust badges, 3 steps, comparison, FB comments, offer box, sticky product card |
| Advertorial | ~16: header, countdown, hero heading, image, text, CTA, 3 × (heading + text), CTA, reviews, CTA, footer |
| Listicle | ~14: header, numbered reasons with a CTA after each cluster, footer |

The layout is COPIED into the page: change, delete and reorder its blocks freely.

## The Custom HTML block — what survives the save

Kept: any layout/styling markup, `<img>`, `<picture>`, `<video>` (with `controls`/`autoplay muted loop playsinline`),
inline `<svg>`, `<details>/<summary>` (accordion without JS), `<table>`, `<a href>` links, `style` attributes, the
block's scoped CSS incl. `@media`, `@keyframes`, `:hover`, `:checked` tricks.

Stripped on save (`free-html.ts`): `<script>`, `<iframe>`, `<object>`, `<embed>`, `<base>`, `<link>`, `<meta>`,
`<form>`, every `on…=` handler, `javascript:` / `vbscript:` / `data:text/html` URLs. The save toast and
`sanitizedAway` in the save result say what was removed — treat that as a failed section.

Rules for using it:
- A **buy / claim / checkout button is never a link inside HTML**: it must be a `cta`, `offer`, `product`,
  `stickybar` or `mainproduct` block (click tracking, the publish check, the "Goes to" destination).
- Pictures and videos come from the shopdy media library (`{{media:<file>}}` in the value), never hot-linked from
  the competitor.
- Make it responsive in its own CSS (`@media (max-width: 640px) { … }`), no fixed widths over 320 px, text ≥ 12 px,
  taps ≥ 44 px. Check it at 360 px with `verify`.
- `Convert to editable blocks` (block toolbar) turns simple HTML (headings, paragraphs, images, links-as-buttons,
  numbered lists) into native blocks — prefer native blocks when the result looks the same.

## Competitor section → what to use

| On the competitor page | Use | Missing tool (→ ticket) when… |
| --- | --- | --- |
| Announcement / top bar with timer | `countdown` (sticky) | it counts to a fixed date/time, or rotates several messages |
| Plain announcement bar, marquee | `html` (CSS `@keyframes` marquee) | — |
| Logo header, sticky header | `header` | it needs a menu / dropdown navigation |
| Hero: big title + subtitle + photo + button | `heading` + `text` + `image` + `cta` (or `feature`) | — |
| Hero with a video background / autoplay video | `html` with `<video autoplay muted loop playsinline>` from the media library | the video is YouTube/Vimeo/an embed (iframe stripped) or HLS/blob stream |
| Image gallery / carousel | `slider` (≤ 8) | > 8 slides, thumbnails strip, zoom/lightbox |
| Before/after drag slider, 360° viewer, tabs that switch content, quizzes | — | always (needs JS) |
| "Reason" rows: photo beside text | `feature` | — |
| Icons row / trust badges ("Free shipping", "30-day returns") | `feature` trust lines, `mainproduct` badges, or `html` grid with inline SVG / media images | — |
| "How it works" numbered steps | `steps` | > 8 steps |
| Comparison "us vs them" | `comparison` | more than 3 columns → `html` `<table>` |
| Reviews / testimonials / UGC grid / FB comments | `reviews` (pick the style that looks the same) | a live widget (Trustpilot, Judge.me) — replicate it as static `reviews`, no ticket |
| Star rating summary with bars (5★ 80 % …) | `html` | — |
| FAQ accordion | `html` with `<details>/<summary>` | it must be a native, editable FAQ block (ask the user) |
| Product buy box: gallery, price, variants, qty, add to cart | `mainproduct` (needs a product on the page) | a picker the block lacks (e.g. subscription, upsell checkboxes) |
| Quantity breaks / bundles ("Buy 2 get 1") | `mainproduct` bundle mode | price rules the checkout cannot charge |
| Offer box with deal clock + guarantee | `offer` | — |
| Sticky add-to-cart bar | `stickybar` | it must show price / variant inside the bar |
| Email / SMS sign-up form, contact form | — | always (`<form>` stripped) |
| Size chart, popup, slide-in cart, exit intent | — | always (needs JS / overlay) — note: Lead Popups is a separate shopdy feature, outside the page |
| Live "X people viewing", stock counter that changes | static `html` text | it must be live |
| Footer with links + disclaimer | `footer` | — |
| Fonts other than Lato / Poppins / Inter / System | closest of the four | the exact font is essential to the look (ask the user before filing) |

A gap is a missing tool only if the section cannot look and behave the same with the blocks above. Static look
alike in `html` counts as "done with existing tools".
