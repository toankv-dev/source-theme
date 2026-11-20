# Lunara Vesnacharm — changelog

Built from `themes/lunara---hushflex` 2026.11.19.2 (docs/SPEC-lunara-vesnacharm.md). The hushflex history follows below.

## 2026.11.20.7 — guarantee box in the colours of the pack rows
### Changed
- Money-back guarantee box under Add to cart: the background, border and corners of an unselected pack row (user:
  "in line with the bundle"): 5 % of the highlight colour, 1 px border of it at 30 %, radius 8 (was grey #efefef with
  a dashed #555 border, as brixpant.com). Follows the section's highlight colour.
### Checked
- Preview: box background and border equal to the unselected pack row (`_src/sc-e2e.js` compares them on the page),
  all checks passed; the platform engine renders every template.

## 2026.11.20.6 — fix: 2026.11.20.5 failed with a 500 on the store
### Fixed
- 2026.11.20.5 took the store down (HTTP 500; 2026.11.20.4 fine): the "Color, Size" line of the pack rows
  (`snippets/lu-kaching.hbs`) called a `contains` helper the platform engine does not have ("Missing helper:
  "contains"", reproduced with shopdy-promax theme-engine.ts on the Bundle and Triple-Zone templates: every template
  with a Kaching block). It now uses the engine's own `isColorGroup`. Same result: Color first, then Size.
- Why it got through: the repo's helper list (base-theme README, pack.js, the preview) named `contains`, which the
  engine never had. Fixed in tools: one list copied from the engine (`tools/lib/engine-helpers.js`), used by pack.js,
  inspect-theme.js and the preview; pack.js now stops on `contains` (it reports 4 errors on the 2026.11.20.5 files).
### Checked
- The platform's own engine (theme-engine.ts renderThemeDocument / renderThemeFromDir) renders every product template
  (store and editor), the home and the legacy product entry of this version; also of every other theme in the repo.

## 2026.11.20.5 — compact top bar on phones; guarantee box + videos under Add to cart; colour first in packs
**Broken on the store (500): do not upload; use 2026.11.20.6.**
### Changed
- Top bar, countdown style, phones (under 750 px): one compact row as the user's reference: title (and subtitle, link
  text) on the left, the timer on the right. 48 px high with a title only (was 70 px), 61 px with the link text at
  390 px (one line from about 410 px). Labels stay 12 px; the link text has no underline or arrow on phones.
- Cart count in the header: the theme's main colour (was #1a2531).
- Under Add to cart (bodysuit look, and the Lunara look with "Show them in the Lunara look too"): the grey box with
  "Order today, get it between …" and "45-day money-back guarantee. Read the policy" is gone (its settings too). In
  its place, as brixpant.com/compression-tank: a money-back guarantee box (grey #efefef, dashed #555 border, radius 8,
  gold seal with the days, "45-Day Money Back Guarantee" + "Less than 1% of customers have used our Money Back
  Guarantee", a gold shine crossing it every 6 s; off with reduced motion). Settings: show, title, line, days on the
  seal, own seal picture, shine.
- Template "Triple-Zone Drop-Seat Bodysuit": an "Image / video slider" block right under it, 3 portrait (9:16) videos
  side by side, 12 px apart, phones too (as brixpant.com). Its slots are empty: pick the videos in the editor. An
  empty slider now shows nothing on the store (was an empty band).
- Pack rows (Kaching bundles, every template): the Color picker first, then Size, whatever the product's option order;
  the "Color, Size" line above them too. Visual order only (the scripts still read the selects in option order).
### Fixed
- Pack row pickers in the Lunara look were 14 px on phones (iOS zoomed the page on tap): 16 px, 44 px high.
### Checked
- Top bar at 360 / 390 / 412 / 768 / 1440 with title only, + link text, + subtitle, a long title: no sideways scroll.
- `_src/sc-e2e.js` all passed (new checks: guarantee box, no delivery estimate, Color before Size); a copy with the
  options in Size, Color order: Color still first, the packs still follow the main picker (only the test's fixed
  "Color / Size" strings differ).
- Guarantee box 360 x 73 at 390 px (brixpant 360 x 70), videos 3 x 112 x 199 (brixpant the same).
- `mobile-audit.js` on home, bundle and bodysuit templates: only the old menu drawer errors.

## 2026.11.20.4 — before / after slider as shape-curve.com
### Changed
- "Before / after slider" rebuilt on shape-curve.com's "Sculpt Your Curves Without the Struggle" section, downloaded
  this time (cooling bodysuit page; `_work/capture/cooling`, section 01), after the user's live page showed the review
  ("Still Comfortable Hours Later") as plain text lines. Measured on the original, in the theme's Poppins with the
  highlight colour for the original's violet:
  - review card: white, 1 px #ececec border, radius 10, 5 green star boxes, title 20 px bold, quote 16 px, name 14 px
    (18 / 14 / 12 px on phones). New settings "Review card": stars (0-5), star colour, title, quote, name. Shows when
    the title or the quote is filled in; empty by default (no made-up review in the theme).
  - heading 36 px (24 on phones) with a highlighted end (new setting "Heading: highlighted end").
  - check list italic, 16 px (14), round checks 20 px (16).
  - photos: 4:3 frame (new default), square corners, no shadow; BEFORE / AFTER in white capitals at the bottom corners;
    2 px line, 40 px see-through ring handle with two chevrons.
  - band: soft gradient of the highlight colour (new setting "Background": gradient / one colour), 36 px above and
    below (27 on phones), content up to 1600 px, photos and text halves side by side from 1024 px, text centred.
  - phones: photos first, then heading, list and review card.
- Default content of the section: heading "Sculpt Your Curves" + "Without the Struggle", the check list only.
### Checked
- Preview with the user's live content and the original's two photos: 1440 px section 552 px high (original 552),
  photos 640 x 480 (same); 390 px 770 px high (original 770). Slider test passes (mouse, keys, swipe, tap). Every
  print case (editor, no photo, one photo, solo, review with 3 stars, quote only, solid band). `mobile-audit.js`:
  nothing from the section (the 6 menu drawer errors are old), no sideways scroll at 360 px.

## 2026.11.20.3 — every feature in every product template; home cards the same height
### Changed
- Every product template has every product-page section (user: "the before / after slider for every template, not only
  Triple-Zone Drop-Seat Bodysuit; the same for the other features"). Default, Bundle (Kaching), Size buttons and Variant
  tiles now carry Feature cards, Details, Before / after slider, Customer videos, Photo testimonials, Trust badges,
  Reviews (Okendo style) and You Will Also Love; the bodysuit template carries Lunara's Reviews and FAQ. Added switched
  off (the editor's eye icon turns them on) with the bodysuit template's content to start from, so no live page
  changes; the before / after slider is on and prints nothing until both photos are picked. `_src/build-sc.js` adds
  what a template lacks and never changes a section it has.
- The bodysuit blocks work in the Lunara look too: Price + badge, Highlights box, Shipping box, Info rows (size chart
  table included) and the second button keep their look in any product section (`sc-product.css`: blocks under
  `.sc-any`, the look itself under `.sc-skin`; outside the look each block links the file itself). "Under the
  buttons" (safe checkout box, delivery estimate, guarantee) gets "Show them in the Lunara look too" (off by default).
- Before / after slider: on the store it now prints nothing at all until both photos are set (was printed, then
  hidden), since it sits in every product template.
- Home product list (also the catalog and the upsell list): every card of a list has the same picture box, so all
  cards are the same height (user: "no long and short cards"); the whole photo still shows (never cut), a photo of
  another shape gets blank space around it. New Theme settings > Home page > "Product cards: picture shape": same as
  most photos of the list (default), square, 4:5, 3:4, 2:3. Cards of a row also end level, buttons in line (a price
  not on sale is taller than a sale price).
### Fixed
- Reviews (Okendo style): the "Sort reviews" field is 16 px on phones (was 14 px: iOS zoomed the page on tap).
### Checked
- Preview, Default template with every section on and every bodysuit block in the Lunara look, 390 / 1440: blocks
  styled as in the bodysuit look (price 26 / 30 px, highlights in the main colour, grey ship box and rows, chart
  table built, express button gradient), sections the same heights as in the bodysuit template, no sideways scroll.
- Templates as shipped vs 2026.11.20.2: Bundle, Default 390 / 1440 pixel-identical; HTML of the bodysuit template
  differs only by the class `sc-any`. Slider interaction test passes again (mouse, keys, swipe, tap).
- Home cards with photos 1:1, 2:3, 3:4, 4:5 and one without sizes, 360 / 390 / 1440: one box per list, cards of a row
  the same height and buttons in line, no sideways scroll.
- `mobile-audit.js`: home and product pages as before (the menu drawer errors are old); "Sort reviews" error gone.

## 2026.11.20.2 — before / after slider
### Added
- Section "Before / after slider" (`sections/sc-before-after.hbs`, schema from `_src/build-sc.js`), asked for as
  shape-curve.com's "Sculpt Your Curves Without the Struggle" (cooling tummy-control bodysuit page). That page could
  not be downloaded (bot check, then 429; no web archive copy), so the look follows the theme's other shape-curve
  sections: photos in a 20 px rounded frame with a shadow, white line + round handle with arrows in the highlight
  colour, BEFORE / AFTER pills, heading + rich text beside (bulleted list = check marks); phones: heading, photos,
  text. Drag with the mouse, swipe sideways or tap on a phone (an up / down swipe still scrolls the page), arrow keys /
  Home / End (role=slider). Mechanism from `themes/lunara-black-brixpant/sections/before-after.hbs`.
- Settings: before / after photo (+ theme file while empty), labels, start position, frame (4:5, square, 4:3, the
  after photo's shape), line colour, photos side, heading, text, background, highlight, spacing. Preset "Before /
  after slider" (Content): addable to any product template from the editor.
- Template "Triple-Zone Drop-Seat Bodysuit": the section after "Crafted In Every Detail", white band, photos empty.
  On the store the whole section stays hidden until BOTH photos are set (a half slider looks broken, and two unrelated
  photos must not pass as a before / after); the editor shows the empty frames with a hint.
### Checked
- Preview 1440 / 390 with two test photos: mouse drag 50 → 25 %, click 80 %, ArrowLeft ×5 → 70 %, Home → 0 %; phone
  (touch, CDP): sideways swipe 50 → 85 %, up swipe scrolls the page (+216 px) and leaves the line, tap → 20 %.
  Hidden with no / one photo (display none, no request), shown with two; editor render shows both hints.
  `mobile-audit.js` on the template: nothing from the section, CLS 0 (the 8 errors are the menu drawer and the reviews
  sort select, as before).

## 2026.11.20.1 — countdown top bar with days and a link; home cards show the whole photo; banner picture link
### Fixed
- Top bar, Style = Countdown timer: a long title (e.g. "Black Friday Is Live - Ends Mon, Nov 30") ran off both sides
  of a phone and squeezed the timer (one nowrap row of 17 px). New bar as the user's screenshot: one row on a computer
  (title · subtitle · DAYS : HRS : MINS : SECS · link text →), flat background with a 2 px line in the accent colour; on
  phones the title wraps (balanced) on top, the subtitle sits next to the timer, the link text below; 750–989 px two
  rows. Timer labels 12 px on phones (were 7 px). The old animated gradient + shine are gone. Source
  `_src/vn-countdown.hbs`, applied by `_src/patch-vn.js` (an `always` entry: the block is rewritten on every run).
- Home page product list (and the catalog / search grids, all `theme.js` `ht()`): the card picture was cropped to a
  square. The card box now takes the picture's own shape (`imageWidth` / `imageHeight` of the product data, so no
  layout shift) and the picture is drawn with `object-fit: contain` (`.lu-card--fit`, `assets/css/vn-chrome.css`); a
  product without sizes keeps the square box with the whole picture inside. Related products keep their 4:5 crop.
### Added
- Theme settings > Top bar > Countdown timer: "Link text", "Link" (the whole bar is the link; a link text without a
  link opens all products), "Timer length (days)" (+ the hours, which may now be 0), "Or a fixed end" (e.g.
  `2026-11-30 23:59`, the visitor's own time; after it the days + hours take over), "Countdown background" (default
  #050100), "Countdown title, numbers and bottom line" (default #f58634). The DAYS box shows while a whole day is left.
- Theme settings > Home page > "Banner image link": a click on the banner picture opens it (empty = not a link; the
  text box button keeps its own link). Dawn's transparent overlays let the click through on a computer.
### Checked
- Preview 360 / 390 / 768 / 1000 / 1440, three text lengths: no sideways scroll, bar 87–89 px on phones (143 px with
  a 3-line title), 45 px on a computer. Timer: fixed end, date only, past end, days + hours. Banner click at 360 /
  1440, button link kept. `mobile-audit.js` on `/` + `/product` with the countdown on: same 12 errors as before (menu
  drawer, all pre-existing), 34 warnings (were 54: the old bar's 7–10 px text), CLS 0 (was 0.012).

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
