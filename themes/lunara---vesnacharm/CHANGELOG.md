# Lunara Vesnacharm — changelog

Built from `themes/lunara---hushflex` 2026.11.19.2 (docs/SPEC-lunara-vesnacharm.md). The hushflex history follows below.

## 2026.11.19.16 — top bar as tammycharm.com
### Changed
- Top bar (rotating messages): with no Background set it is the main colour, solid (was a pale gradient of it, made for
  dark text, unreadable with white text), white text 14px / 600 (was 12px), 40 px high (phones 44), ‹ › near the edges
  of a 1300 px row; on phones a long message wraps onto two lines instead of being cut. Default text colour white.
  `sections/header.hbs` (anchored, `_work/patch-vn.js`, which now has optional entries), `assets/css/vn-chrome.css`.
### Added
- Theme settings > Top bar > "Text size (rotating messages)", 12–20 px, default 14 (new id: applies on a store saved
  before).
### Checked
- Copy at 1440 / 390: rgb(121, 2, 54) solid, 14px / 600 white, 40 / 44 px, arrows at 98 / 1342 and 22 / 368 px;
  `_work/sc-e2e.js` 134 steps; colour scan clean.

## 2026.11.19.15 — reviews with several photos; customer videos autoplay with a loading look
### Fixed
- Reviews (`sections/sc-reviews.hbs`): a review shows EVERY photo, stacked in the right column (200 × 130; phones: side
  by side, 120 × 120); the customer photo strip has every photo of every review; the pop-up opens on the photo clicked
  with thumbnails to switch between the review's photos. Read from `images[]` (as the platform is to send it), else
  `media[]`, else the single `image`. An API page without photos no longer wipes the photos the server rendered for
  the same reviews. Note: the platform sends only the FIRST photo today (`mediaUrls[0]`); the rest show once it sends
  `images` (shopdy change, see docs/todo).
- Customer videos (`sections/sc-reels.hbs`): they now always autoplay (muted, looped), also with "reduce motion" on
  (Windows 11 animation effects off, iPhone Reduce Motion, Android Remove animations), which stopped them before.
  A browser that refuses autoplay (iPhone Low Power Mode, data saver) shows the play button and the first tap anywhere
  on the page starts the videos on screen. Videos start fetching as they come in, play from 25 % on screen.
### Added
- Loading look: until a video's first frame (and again whenever it stalls) its card shows a light sweep and a spinner in
  the accent colour; cards with a video start in it before any script runs.
- "Sound" is now one-at-a-time across the whole page (every Customer videos band); Sound again turns it off.
### Checked
- `_work/sc-e2e.js` 134 steps; Chrome: reduced motion, mp4 held back 2 s, autoplay refused until a tap, Sound one at a
  time (1440 / 390) all ok; several photos: stacked / side by side, strip 6 photos, dialog thumbnails, API without
  photos keeps them; colour scan clean.

## 2026.11.19.14 — "Complete the bundle": this product + another product
### Added
- Kaching block: one more bar per "Bundle with another product" offer the seller set on the product (shopdy
  SHOPDY-127; the backend sends only the live ones as `product.companion_bundles` / `#sf-config.companionBundles`).
  Same look as a pack (title, badge, "SAVE $x" chip, price + struck price), after the 4 packs, in the same radio group.
  Picked, it opens two rows — this product and the other one — each with its picture, name, one select per option
  (none for a one-variant product), its bundle price and its own price struck. Bar price = both bundle prices; struck =
  both variants' own prices (compare-at when higher); "Save $x" = the gap.
- Add to cart with the bar picked adds the two chosen variants, one cart line each, both carrying the offer key
  (`companionBundle`) and their bundle price; the drawer opens as usual. The server prices the pair from the offer as it
  is then, never from the theme.
- Cart drawer (every page, `window.LuCB` in `snippets/gs-head.hbs`): the server's pairing — per offer, pairs = the
  smaller of the two products' units, the rest of a line at its own price. Removing one of the two puts the other back
  at its own price; 2 × this product + 1 × the other = one pair + one at its own price. Bundle units stay out of the
  automatic discounts (`LuDisc`); `/cart/gifts` and the drawer's InitiateCheckout value use the same prices.
- Files: `snippets/lu-companion-bar.hbs`, `assets/js/lu-companion.js`, `assets/css/lu-companion.css` (loaded only on a
  product with an offer), anchored edits in `snippets/lu-kaching.hbs`, `snippets/gs-head.hbs`, `assets/js/theme.js`
  (MSCart) — all by `_work/patch-cb.js` (sources in `_work/cb/`). Lines without an offer key are written exactly as
  before.
### Checked
- On a local shopdy store (offer $34.20 + $25.50, two 2-option products at $35.99 / $32.99, compare-at $59.99): bar
  $59.70 / $119.98 / "Save $60.28"; rows, selects 44 px / 16 px; Add to cart → drawer $34.20 + $25.50 = $59.70 = the
  server's `/cart/price`; +1 on this product → $95.69; companion removed → $35.99; a pack picked after the bar adds the
  pack only; `/checkout` $59.70. 1280 and 390 px, keyboard (Enter), no console errors. `node tools/pack.js`: 0 errors.

## 2026.11.19.13 — customer videos: ready to fill from the editor
### Fixed
- "Customer videos" added from the editor's section list came with no Video block, and a band without videos hides
  itself, so the preview stayed empty. The section now arrives with 6 empty Video slots, and in the editor the band
  always shows (empty frames "Upload a portrait video (MP4) for this slot", or a hint when it has no block at all).
- Empty slots (no file yet) spilled out of the row to the right in the editor: the row is as wide as its content and
  a slot without a video had no width of its own. The slots now have an explicit width (6 fill a 1440 px screen).
### Checked
- `_work/sc-e2e.js` 132 steps; playback check in Chrome (1440 / 390) all ok; editor view simulated: 6 frames, no
  overflow, no arrows.

## 2026.11.19.12 — Write a review, "SAVE xx%" next to the pack title
### Added
- Reviews (Okendo style, `sections/sc-reviews.hbs`): a "Write a review" button (outlined in the main colour, pen icon;
  top right, full width on phones) opening a pop-up form as on tammycharm.com: product name, stars, Name + Email, Review
  title, Your review, one photo (optional, up to 5 MB), "I recommend this product", SUBMIT REVIEW. It posts to the
  platform's `POST /api/storefront/reviews` (multipart: productId, domain, rating, name, title, body, photo); the
  review waits, unpublished, in the product's Reviews tab until the merchant publishes it. No title typed → the start
  of the review. Field messages from the form and from the platform (400), the hourly limit message (429), a thank-you
  panel; Esc / × / outside click close it; no visible scrollbar.
- Section settings under "Write a review" (new ids, on by default, so a template saved before gets the button): show,
  button text, form heading, ask for email, photo, "I recommend", send button, thank-you message. Email and "I recommend"
  are not stored by the platform (it has no field for them) and are not sent.
### Changed
- Packs: the "SAVE xx%" of a pack subtitle (`SAVE {save}`) now sits right after the pack title in the main colour
  (white text); the rest of the subtitle stays below (bodysuit look: on the same row, as its "$31.50 Each" pill).
  `snippets/lu-kaching-bar.hbs` + `assets/js/theme.js` (anchored, `_work/patch-vn.js`), CSS in `vn-chrome.css`.
- Template "Triple-Zone Drop-Seat Bodysuit": SAVE style "Saving vs compare-at price, as %", subtitles `SAVE {save}` /
  `SAVE {save} {each} Each`.
### Checked
- `_work/sc-e2e.js` 132 steps; pop-up flow and badges at 1440 / 390 with the POST intercepted (nothing sent to a store);
  badge numbers with the store's tiers: percent 12 % / 17 %, vs compare-at 50 % / 56 % / 58 %; colour scan clean.

## 2026.11.19.11 — customer videos
### Added
- Section "Customer videos" (`sections/sc-reels.hbs`, as "Don't just take our word for it. See them in motion." on
  tammycharm.com): a dark band in the main colour, a small "Caught on camera" line, a two-line heading (the second line
  italic in the accent colour, #F1C6D6), a short line, then portrait 9:16 videos side by side that scroll sideways.
  - Each video plays muted and looped while at least half of it is on screen and pauses off screen; nothing downloads
    before that (`preload="none"`). Shoppers who ask for reduced motion get a play button instead.
  - "Sound" turns the sound on for that video only (any other goes quiet); a tap pauses / resumes.
  - Phones: the next video peeks in (as the reference) or one video per screen (setting "On phones").
  - Desktop: round arrows only while the row is wider than the screen.
  - Video blocks take an uploaded MP4 / WebM (media picker), an optional cover picture, name and line. A block without a
    file is left out of the store (an empty frame in the editor); with none, the whole band is hidden.
### Changed
- Template "Triple-Zone Drop-Seat Bodysuit": "Customer videos" (6 empty slots) takes the place of the photo testimonials
  "Loved By 12,000+ Ladies Worldwide", which stay in the template, hidden (eye icon in the editor brings them back).
### Checked
- `_work/sc-e2e.js` (1440 + 390, 130 steps); playback in Google Chrome (H.264) on copy-only templates with 4 sample
  clips; `_work/scan-colors.js` with the video page: clean.

## 2026.11.19.10 — safe checkout box and delivery estimate under Add to cart
### Added
- Bodysuit look, right under Add to cart (as tammycharm.com; `snippets/sc-trustbox.hbs`, wired in `sections/product.hbs`
  by `_work/patch-vn.js`):
  - a "Guaranteed **safe** checkout" box (the middle word in the main colour) with Visa, Mastercard, Amex, Discover,
    Apple Pay, Google Pay and PayPal;
  - a grey box: "Order today, get it between **Thu, Nov 26** and **Fri, Dec 4**" (today + 7 / + 15 days in the shopper's
    own date, set while the page is parsed), and "45-day money-back guarantee. Read the policy" (the store's refund
    policy unless a link is set).
- Product section settings under "Under the buttons (bodysuit look)": show / hide each part, heading words, delivery days
  and line (`{from}` / `{to}`), guarantee text, link text and link. New ids, on by default: they show on a template
  saved before, without editing it.
### Checked
- `_work/sc-e2e.js` (1440 + 390): the box follows Add to cart, 7 icons, highlighted word in #790236, the dates are
  today + 7 / + 15 in bold, the link goes to the refund policy.

## 2026.11.19.9 — contact page button, no scrollbar in the size recommender
### Fixed
- The platform's contact page (it links only base.css + custom.css) showed its Next button in Lunara's blue:
  custom.css set `:root{--lu-primary:#124F9F}`. Every blue still written in the theme — custom.css / base.css defaults
  (Dawn's accent 18, 79, 159), fallbacks in sections and snippets, the sticky bar's hover #0d3b78 — is now the main
  colour (#790236, hover #5c0129); a last step of `_work/patch-vn.js` does it.
### Changed
- Size recommender: scrolls without a visible scrollbar.

## 2026.11.19.8 — size recommender as shape-curve.com, bold menu
### Changed
- Find my size (`snippets/sc-fit.hbs`, block `sc_fit`) rebuilt as shape-curve.com's size recommender (user's screenshot),
  was getionix's: "Size recommender / Find Your Best Size", in / lbs ⇄ cm / kg, Weight (required) + Bust / Waist / Hips
  (optional, shown when the chart has the column), "Find My Size" → the recommended size (weight only: one, or both on the
  line between two; with measurements: the size that fits the largest) + "Select M" (sets the main picker and every pack
  row), then the complete size chart (one table: Size, US, Bust, Waist, Hip, Weight; converted to cm / kg). Violets → the
  main colour and its tints. New setting ids `rec_*` (their defaults reach a store whose template was saved with the old
  texts); the getionix settings (height, second table, proof line…) are gone. The size option is found by its values when
  no option has the "Size option name" (a product whose option is "Side" works).
- Menu: bold; the current page and hover in the main colour with a thin underline (was a filled accent pill with dark
  text); phone menu: bold, current page in the main colour.
### Checked
- `_work/sc-e2e.js` (1440 + 390): 122 checks with the new finder (copy-only template `fitopt` for the option found by its
  values; `fittest` removed). `_work/scan-colors.js`: clean.

## 2026.11.19.7 — pack heading in the main colour
### Changed
- Bodysuit template: the packs' heading (BUY MORE - SAVE MORE) follows the Kaching block's **Accent colour (border,
  radio, badge, heading)** setting (#790236 in the template); the bodysuit look forced it black (the original's colour).

## 2026.11.19.6 — the whole theme in the #790236 tone
### Changed
- Everything Lunara coloured with its primary colour (`--lu-primary`, Dawn's accent colours: menu, badges, cart drawer,
  size finder, Load more, tracking page, checkout ink…) takes the main colour (Colors > **Main colour (highlight)**).
  The Primary colour setting is gone: its #124F9F saved on the store would win over any new default. "Text on primary
  colour" is now "Text on the main colour".
- No black or grey button borders: variant pills (bodysuit look and Lunara's default / Shapermint / Walmart looks),
  picture colour tiles, gallery thumbnails, review Filters / chips: borders in the main colour; the selected one filled
  with it (white text). Testimonial dots, review star bars, avatars, Verified tick, current review page: the main colour
  or a tint of it. Card "% OFF" badge and sale price: the main colour (were red).
### Checked
- `_work/scan-colors.js` (new): every control on 11 pages + open states (cart drawer, Find my size, review filters, phone
  menu) at 1440 and 390, with the store's saved primary #124F9F simulated: no neutral dark fill, no grey / black border,
  nothing in #124F9F.

## 2026.11.19.5 — footer, Add to cart and checkout buttons in the theme's main colour
### Changed
- Add to cart (every product template, Lunara's pill + hover kept), card "Add to cart", quick-add pop-up, sticky bar,
  cart drawer Check out (when Cart drawer has no checkout colour of its own) and the checkout page's Pay / Continue
  buttons: the highlight colour (#790236), white text. They used Lunara's primary colour, saved as #124F9F on the store;
  the highlight is a vesnacharm setting, so its value reaches the store. `--vn-hl-rgb` (set from the setting in gs-head)
  feeds Dawn's `rgb(var(--color-button))`.
- Footer background = the highlight colour (#790236) by default: new setting Colors > **Footer background**
  (`vn_footer_bg`, empty = the highlight). It replaces Lunara's `footer_bg`, whose value saved on a store (#000000) would
  win over any new default. The bar under the footer is a darker shade of it (was #111); © text in the footer's soft
  text colour.
- Scroll-to-top button: thin white ring, so it stays visible over the footer of the same colour.

## 2026.11.19.4 — no main Color / Size picker on the bodysuit page
### Changed
- Bodysuit template: no Color / Size picker above the packs; each pack row keeps its own pickers (Buy 1 too), Find my
  size still sets them. Template default `show_variants: false`.
### Fixed
- Product section "Show variant pickers when there is no Kaching bundle" off had no effect in the bodysuit look:
  sc-product.css forced the picker visible (`.sc-skin.sc-skin [data-ms-pdp] .lu-variants{display:block!important}`). The
  setting's rule now wins (`_work/patch-vn.js`); its info says so.
### Checked
- `_work/sc-e2e.js` (1440 + 390): 128 checks; the picker flows run on a copy-only template with the picker on.

## 2026.11.19.3 — review pages, scroll-to-top colour
### Changed
- Reviews (`sc-reviews`): numbered pages (‹ 1 2 3 4 5 … 20 ›, current page in a grey circle; phone: 1 … p … n with 44 px
  taps) in place of Show More. Setting "Reviews per page" (was "Reviews shown at first / per Show More"); "Show More"
  text setting removed. Reviews load when the section comes near the screen, 50 at a time up to 500, so sort, filters and
  page numbers cover the whole list.
- Scroll-to-top button in the highlight colour (was the primary colour).
### Checked
- `_work/sc-e2e.js` (1440 + 390): 122 checks, incl. pages on a copy-only template with one review per page (… at both ends).

## 2026.11.19.2 — fixes after the first live upload (vesnacharm.com)
### Changed
- Logo size: Theme settings > Header > Logo width (desktop 280 px / phone 180 px, ≈ the original store's logo). Lunara capped
  it at 200 x 50 / 150 x 40 px. Use a trimmed logo file (no empty space around the letters).
- Countdown top bar without its own background takes the highlight colour (was the primary colour).
- Bodysuit template:
  - Add to cart is Lunara's pill button with its hover, filled like the original's express button (#f0f0f0 + the
    highlight gradient, #333 text), whatever the store's primary colour;
  - no second "Express checkout now" button by default (setting `buy_now_label` empty);
  - the pack rows no longer show the "Size, Color" line;
  - "Highlights box" has a new **Look** setting: Check list (default: round check icon, text in the highlight colour,
    a leading emoji left out) or Grey box (the old look).
- Sticky Add to cart bar: its button follows the primary colour (Lunara hard-coded #124f9f); on the bodysuit template it
  matches Add to cart.
### Checked
- `_work/sc-e2e.js` (1440 + 390): 110 checks, incl. the new ones; logo with the trimmed file: 280 x 25 / 180 x 16 px.

## 2026.11.19.1 — new theme from hushflex in the look of shape-curve.com
### Added
- Theme chrome in the look of shape-curve.com: rotating top bar on a #790236 tint gradient with ‹ › arrows, two-row
  header, #333 buttons, "% OFF" product cards, "You Will Also Love" on a #f8f8f8 band, black 5-column footer
  (`assets/css/vn-chrome.css`, `_work/patch-vn.js`, `_work/build-vn-settings.js`). New settings: Colors > Highlight colour,
  Footer texts and logo.
- Template "Triple-Zone Drop-Seat Bodysuit" (was hushflex's "Shapecurve – Drop-seat bodysuit"), with section
  `sc-reviews` (Okendo-style reviews: average, star bars that filter, customer photos, Filters, Sort, Read More, Show More;
  no review form; "would recommend" = share of 4- and 5-star reviews).
### Fixed
- Lunara's footer ignored the Footer background / text settings.

# Lunara (hushflex) — changelog

## 2026.11.19.2 — "Find my size" as getionix.com
### Added
- Product block **Find my size (weight)** (`sc_fit`, `snippets/sc-fit.hbs`), modelled on the size finder of
  getionix.com (Sculpt 3D leggings): a pill button with a turning border opens a pop-up with US (lbs · ft) / Metric
  (kg · cm), Weight and — when the chart has a Height column — Height (optional), a live result (one size, or both when
  the weight sits on the line between two; a height outside the size's range adds the next size), the full chart with
  the matching rows marked, an optional second table, a "customers have found their fit" line, and "Select M", which
  sets the Size option of the main picker and of every pack row. Charts are typed as text (`Size | Weight | …` lines);
  Metric converts weights, heights and (in) columns. Every text is a setting. Fonts = the theme's; accent = the
  highlight colour (#790236); getionix's cream / dark / gold → pale tint / #333 / highlight. Own `<style>` + `<script>`:
  works in any product template.
- Template "Shapecurve – Drop-seat bodysuit": Find my size uses it (in place of Lunara's size finder) with the
  bodysuit's chart from shape-curve.com: weight + US size, and bust / waist / hip as the second table. That chart has
  no heights, so the Height field stays hidden until a Height column is added.
- `sections/product.hbs`: block type `sc_fit` (in `_work/patch-sc.js`; edits now carry an "already applied" marker).
### Checked
- `_work/sc-e2e.js` (1440 + 390): 110 lbs → XS / S (both rows marked), Metric 50 kg + chart in kg, second table,
  130 lbs → M → "Select M" sets the main picker and the pack rows, Esc closes; on a copy with getionix's chart:
  Height shows, 150 lbs → M, + 5′9″ → M / L, Metric 175 cm keeps M / L. Plus all earlier checks.
- Open pop-up at 360: no text under 12 px, no tap under 44 px, no sideways scroll. `mobile-audit.js`: only the
  theme's existing menu-drawer errors. Old templates' HTML unchanged.

## 2026.11.19.1 — new product template "Shapecurve – Drop-seat bodysuit"
### Added
- `templates/product.shapecurve.json`, rebuilt from shape-curve.com's Triple-Zone Compression Drop-Seat bodysuit page
  (downloaded 2026-11-19, `_work/site/`): Lunara product section with Look = Shapecurve, then feature cards, details,
  photo testimonials, trust badges, reviews, related products. Font = Poppins (the theme's); highlight `#790236` and its
  tints in place of the original's violets (radio, selected pack frame, pack badges, Find My Size, tag / icon gradients,
  tinted band `#F6EDF1`).
- Product section: settings `skin` (Lunara / Shapecurve), `skin_highlight`, `buy_now_label` (second button that adds
  the items and opens the checkout, through theme.js's `[data-ms-buy-now]`); blocks `sc_price` (price + compare-at +
  badge, updated by theme.js on variant change), `sc_highlights`, `sc_ship`, `sc_tabs` (accordion rows + size chart).
- `assets/css/sc-product.css`, `assets/js/sc-product.js` (picture colour tiles from each variant's picture, main picker →
  every pack row, size chart table), loaded only by a product section with Look = Shapecurve.
- Sections `sc-features`, `sc-details`, `sc-testimonials`, `sc-trust`; snippets `sc-icon`, `sc-stars`, `sc-pb-*`.
- `assets/images/sc-*`: every picture of the original page as WebP (media library); the two animated feature pictures
  re-encoded as animated WebP at 556 px, every 2nd frame (7.5 / 6.8 MB → 0.86 MB each; `_work/anim-webp.py`).
- `sections/reviews.hbs`: setting `show_write` (default on); the new template turns the "Write a review" button off.
### Changed
- `snippets/lu-size-finder.hbs`: a size value with a part in brackets (`XS (95-110 lbs)`) counts as its letter size,
  so Find My Size works on such products (was silent). Plain `S / M / L` values: unchanged.
### Checked
- Old templates (`product`, `bundle`, `sizes`, `tiles`) and home: HTML byte-identical before / after, except that one
  size-finder line.
- `_work/sc-e2e.js` (1440 + 390, bodysuit sample): picture tiles, main picker → pack rows, Buy 3 → 3 cart lines
  Brown / M, drawer subtotal = pack price, one ViewContent / AddToCart, Express checkout → /checkout, Find My Size 38 / 31 /
  41 in → M (125-140 lbs) picked, size chart 7 rows, dots, no sideways scroll, no script errors.
- `tools/mobile-audit.js` 360 / 390: only the theme's existing menu-drawer errors; LCP ≈ 0.3 s, CLS 0.012.
- `tools/smoke.js`: passes up to `[data-cart-drawer]`, which Lunara never had (same before this change).
- `tools/pack.js`: 0 errors (the old `theme.css` warning).
### Not rebuilt
- "Complete the bundle" (bodysuit + a bra from another product): Kaching packs are one product only.
- Recently viewed products; Okendo review widget (Lunara's reviews section instead); the original's weight-only size
  recommender (Find My Size asks bust / waist / hips).
