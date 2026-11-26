# Lunara (Adlux theme, schema v2)

Clone of lunara-comfort.com (Shopify Shrine PRO 1.2.3), built by `lunnara-theme/_build/build_lu_pdp.py`
(do not edit this folder by hand - edit the build and run it again).

## Editor (Themes > Customize)
- **Product page** = `templates/product.json`: section `product` = gallery + blocks you can drag in the outline (Star rating, Title, Variant picker, Size finder, **Kaching bundle**, Custom HTML, Image / video slider (snippets/lu-media-slider.hbs, 10 image_picker slots, a video URL becomes a <video> server side), FAQ (snippets/lu-pi-faq.hbs: 8 own Q/A, else listing FAQ, else Theme settings FAQ), Buy buttons, Trust line, Payment icons, Description; a product section with only Kaching / Custom HTML blocks keeps the old fixed order) (gallery, star rating, block **Kaching bundle**,
  block Custom HTML, Add to cart, description), `reviews`, `faq` ("Questions? We've Got Answers"). Template
  `product.simple.json` = no bundle (variant pills + one Add to cart).
- **Kaching bundle** block: heading, up to 4 packs (quantity 0 hides one), title / subtitle / badge / gift line,
  colours. Every item of the selected pack gets its own Color / Size pickers (one cart line per variant).
  Prices = what the Adlux checkout charges: the best of the live automatic discounts the backend sends
  (*Tiered next item* as `nextItemTiers`, *Buy X Get Y* as `bxgyOffers`), same formula and per-item rounding as
  `discount-engine.ts` (snippets/gs-head.hbs `LuDisc`, also used by the cart drawer). No discount = price x quantity.
  The theme sets no prices.
- **Theme settings**: Colors (primary `#000000` drives buttons, menu, top bar, footer, badges, checkout button),
  Top bar (sale text + countdown), Home page (banner, product list, real reviews of random products), Cart drawer,
  Brand contact, FAQ (default questions for every product page without its own FAQ).

## Pages
Home (`templates/index.hbs`, Shop All catalog on `#collection/<handle>`), policies / About us (`page.hbs`, About
layout), Order tracking (ParcelPanel form -> `/pages/tracking/result`), Contact = the platform contact page.

## Hooks kept for pixels
`#addToCart` + `data-testid="add-to-cart"`, `#CartDrawer-Checkout`, checkout `#co-checkout-form` / `#co-pay-btn`,
`#sf-variants-data`, ViewContent script (sections/product-scripts.hbs).

## Add-to-cart form (2026.11.07.4)
Default template (`templates/product.json`): Variant pills -> Product type switch -> Kaching block in **Bars** layout with *show the variant picker above the packs* (pills set every item of the selected pack; an item changed in the pack lights its value in the pills) (every item of the selected pack picks its own Color / Size; accent #17509D) -> Stock bar -> Add to cart. The **Stack** layout below stays available in the Kaching block.
- Variant picker style **Boxes**; section settings *Option 1 / 2 / 3 shows as* = Auto / Text / Variant image. Values with
  no available variant for the other chosen options are crossed out.
- **Product type switch** (block): tiles Briefs / Boxer = links to other products. Names, products (store product picker)
  and optional tile images in Theme settings > Product types. The tile of the product on screen is marked; by default the
  switch shows only on the picked products. No white flash when switching: the other product is prefetched on hover / touch and the navigation cross-fades (View Transitions, Chrome / Edge / Safari 18.2+; other browsers load normally).
- **Stack** packs: pack image, title, subtitle, price per item + `/ each`, compare per item, badge strip, gift line.
  Kaching setting *Pick quantity per option inside the pack* (default Auto = Color): the selected pack lists every colour
  with - / + (counts add up to the pack quantity; + on a full pack takes one from the biggest colour; Add to cart waits
  until the pack is full). The colour option is hidden from the picker above; size etc. still come from it.
  Prices still come from the Adlux discounts (the theme sets none).
- Blocks *Stock bar* and *Checkbox offer* (both display only; the checkbox is not in the template).
- Script `assets/js/lu-form.js`; CSS at the end of `assets/css/custom.css`.

### Type per item + scroll (2026.11.07.7)
- Kaching *Bars: every item can pick its type* (template on): each item of the pack gets a Type select (Theme settings >
  Product types; only when this product is one of the types). Another type = that product's own options, image and
  price. The pack price is then computed with the checkout formula (`window.LuDisc`, the live automatic discounts of
  this page; a tiered discount is assumed to cover both products) and Add to cart adds every item as its own product
  (`window.MSCart`), with the pack's gifts and one AddToCart event. The controls sit in `.lu-kt-item` around each
  unit because theme.js reads every select inside a unit by position.
- Switching type keeps the page where it was: the click stores where the switch sat in the viewport, the new page
  scrolls the switch back to that place as soon as it exists (inline script in `snippets/lu-product-switch.hbs`).

### Type switch in place (2026.11.07.8)
- A click on a type tile no longer loads a page: `assets/js/lu-form.js` fetches the other product (prefetched on
  hover / touch), swaps `<main>`, title / meta / JSON-LD and `#sf-config` / `#sf-variants-data`, pushes the URL, then
  dispatches `adlux:section:load` on `<main>` (theme.js' own re-init: gallery, price, Kaching, cart) and fires
  ViewContent. Back / Forward swap back the same way; the switch keeps its place on screen. Any failure -> normal load.
- `assets/js/theme.js` patch (one place, `kt()`): the product init re-reads `#sf-config` / `#sf-variants-data`
  instead of the copy cached at page load (`var r=n.cfg||(at=Dt("#sf-config",at)),i=n.variants||(Qt=Dt("#sf-variants-data",Qt))`).
  Same result on a normal load; needed so the cart adds the product on screen after a swap.

### Product types as one product (2026.11.07.9)
Section setting *Merge the product types into this page* (default template: on; the Product type switch block is
then left out of the template). Types = Theme settings > Product types.
- Gallery: `snippets/lu-merge-gallery.hbs` adds the other types' images (product image + every variant image) to the
  slides / dots / thumbnails before theme.js builds the slider.
- Picker: a Type choice on top (section setting *Type shows as*: image + name tiles (default), image only, or name
  only), then ONE group per option name with the union of every type's values in order (X S L M + XS X S -> XS X S L M;
  this product's own option order first). A value the chosen type does not sell with the other choices is crossed out;
  a value only another type sells switches to that type. This product's own groups stay hidden and are set (with change
  events) while it is the chosen type, so theme.js still prices and adds it. The gallery shows the chosen variant's image.
- Bundle: every item of the selected pack follows the picker (type + values by option name); an item changed in the
  pack lights its type / values in the picker. Mixed packs are priced and added to the cart as in "Type per item".

## Add-to-cart form extras (2026.11.09.1)
Default template (`templates/product.json`): ... Variant pills -> **Size finder** ("Size guide" link + popup; section
setting *show_size_finder* now on) -> Kaching -> Stock bar -> **Upload image** -> Add to cart ... **Sticky add to cart**.
Script `assets/js/lu-atc-extras.js` (loaded after lu-form.js), CSS at the end of `assets/css/custom.css`.
- 2026.11.09.15: default block order: Payment icons, then Money back guarantee.
- 2026.11.09.16: Kaching "Pack variant" mode: each pack adds ONE item of the variant whose pack option (e.g. Packs = "3 Pack") matches the pack; one Type / Size / Color row per pack, pack option hidden, price and SAVE % from that variant (compare price when no discount). Default packs 3 / 6 / 9 Pack.
- 2026.11.09.17: product types: picking another Type in the selected pack swaps the whole gallery (slides, thumbnails, dots) to that product's images, fetched once from its page; back to this product restores its own. lu-gallery.js follows the new slide count. theme.js: define the missing fileOf() used by __showImage. Kaching "Colour guide" (mc_value / mc_text / mc_swatches): a note with colour dots under the selected pack while an item has that colour (default Multi-color = Black, Gray, Navy Blue).
- 2026.11.09.18: Sticky add to cart: new setting *Always show on mobile* (always_mobile, default on): under 750 px the CLAIM OFFER button is always visible, from the top of the page.
- 2026.11.09.19: removes *Always show on mobile* again. Sticky button rule (lu-atc-extras.js check): form within 2.5 screens of the page top (product page) = shown once the form is scrolled past; form further down (landing page) = shown everywhere except while the form is on screen.
- 2026.11.09.20: Color guide moved into the Size guide popup: tabs Size guide | Color guide (Product section > Color guide: cg_enabled, cg_tab_size, cg_tab_color, cg_title, cg_text, cg_swatches, cg_image). The Kaching inline colour note (mc_value) is now off by default.
- 2026.11.09.21: Color guide colours are 6 editable slots (cg_cN_name / cg_cN_image / cg_cN_color) instead of the "Name:#hex" text (cg_swatches removed): product image tile with the colour name; colour tile when there is no image; empty name = hidden.
- 2026.11.09.22: CLAIM OFFER scroll lands on the form on long landing pages: lazy images above the form load during the smooth scroll and pushed it down; scrollToEl now re-measures once the scroll settles and corrects (up to ~4 s, stops on visitor touch / wheel / key).
- 2026.11.09.23: Size guide link alignment (Product section > *sf_link_align*: Left / Center / Right, default Center). Product title on mobile (< 750 px): *title_size_mobile* (default 20 px) and *title_align_mobile* (default Center); desktop: *title_align_desktop* (default Center), size unchanged. Size guide link text default is now "Size Guide" (*sf_link_label*). New home banner sample image (assets/images/lu-banner.jpg, 1280 x 722); settings_data home_banner_image / _mobile cleared so the sample shows.
- 2026.11.09.24: Size guide + Color guide settings (every sf_* / cg_*) moved from the Product section to the *Size finder* block, so clicking the block in the editor shows only them. The Product section keeps *show_size_finder*. Values saved earlier on the section are no longer read: re-enter them on the block.
- 2026.11.09.25: Quick add popup (home / collection Add to cart) showed the base price on every Kaching pack: the page is fetched with DOMParser, whose inline scripts never run, so the JSON blocks filled from <template data-lu-json> (variants, options, gifts, sf-variants-data) stayed empty. theme.js now fills them right after parsing.
- 2026.11.09.26: Quick add popup renders like the product page form: its wrapper carries the product section's data-section-id (section-scoped CSS applies, e.g. the price under the title hides when there is a Kaching bundle), and the inline scripts of the popup content run after Kaching init (Size guide link + popup, Color guide tabs). Scripts inside .quick-add-hidden are skipped.
- 2026.11.09.27: Home banner *Banner size* (home_banner_fit): "Fit the image" (default) shows the whole image with its own height (a 1280 x 480 image was cropped top and bottom by the fixed 56rem banner); "Fixed height" keeps the old cropped look.
- 2026.11.09.28: Product star rating row follows the product title alignment (centred by default).
- 2026.11.09.29: Product types in the bundle form: changing Type keeps the row's other choices (Size, Color...) when the new product has them, also when switching back to this product or between two other types; an unavailable combination falls back to the variant closest to the current choices.
- 2026.11.09.30: Tablet (750-1199 px): the bundle Type + option selects stay on one line (smaller 14px selects, widths follow their text); new Product title size on tablet (title_size_tablet, default 28px).
- 2026.11.09.31: Tablet: star rating and "Excellent 5 | N reviews" stay on one line (smaller stars/text); Product title size on tablet default 24px. Payment icons stay on one row (34px on tablet, shrink to fit). Money back guarantee block is more compact on tablet.
- 2026.11.09.32: Bundle block: the option names line above the selects ("Type, Size, Color Bundle") is hidden by default; new checkbox Show option names above the selects (show_option_names).
- 2026.11.09.33: Home products heading defaults to BEST SELLER, always shown in capitals, with more space under it.
- 2026.11.09.14: fix bundle items with product types: changing one item no longer switches every item to the last chosen type. lu-form.js followPicker (N) and the picker change listener now run only while the variant picker above the packs is visible (a hidden picker is only a mirror). Shipping protection in the cart = Theme settings > Cart drawer > *Protection product* (cart_upsells), unchanged.
- 2026.11.09.13: default Kaching packs (product + bundle templates) = Single (1) / BUY 2 GET 1 FREE (3, BEST SELLER, selected) / BUY 4 GET 2 FREE (6) / BUY 6 GET 4 FREE (10, BEST VALUE), matching the store Buy X get Y offers.
- 2026.11.09.12: new product block *Money back guarantee* (`guarantee_box`: seal image or a drawn gold seal with a number, title, text, background, dashed border) replaces the Trust line in every template; Trust line (*show_trust*) and the cart drawer trust line (*cart_show_trust*) default OFF.
- 2026.11.09.11: Sticky *Always show* default OFF: the button shows only after the main Add to cart has scrolled out of view.
- 2026.11.09.10: Reviews *Star size* (default 18 px, was 13; popup +2 px; rules at the end of the shadow-root style in sections/reviews.hbs). Scroll-to-top button sits above the sticky bar (sets `bottom` itself: theme.js writes `--sticky-atc-offset` inline for the old bar), 44 px on phones. Reviewer name + Verified already share one line with an ellipsis (card and popup).
- 2026.11.09.9: Sticky *Button click* default = scroll back to the bundle / Add to cart form (was: add to cart).
- 2026.11.09.8: Sticky add to cart *Style* = Button only (default: one full-width rounded CLAIM OFFER button, no image / title / price) or Bar; *Show on mobile only* (default on, hidden from 750 px).
- 2026.11.09.7: default template: Kaching *show_picker* off - the form is only the bundle (each item has its own pickers), the variant picker above is hidden.
- 2026.11.09.6: Kaching *Use the theme colours* (default on) ignores the saved accent / price colours and uses `--lu-primary` (also the SAVE badge, was blue #124F9F); bundle items keep image + Type + every picker on ONE row on phones (custom.css end); Stock bar *Blink in red* (default on, colour editable, no blink with reduced motion); sticky button default CLAIM OFFER.
- Texts the shopper clicks are editable: Size guide link = Product section > *sf_link_label*; size finder popup = Product section > *sf_intro* (rich text under the title, also shown in image-only mode) + every popup text (*sf_meas_label*, *sf_bust_label* / *_hint* ... *sf_chart_hide*; empty = English default, the JS texts ride on `data-t-*`); upload button / text after
  upload / remove = Upload image block; sticky button = Sticky add to cart block.
- **Upload image** block (`snippets/lu-photo-upload.hbs`): the file goes from the browser to Cloudinary
  (Theme settings > Photo upload: cloud name + an *unsigned* upload preset). Hidden on the store until both are set
  (hint in the editor). Every line the main Add to cart adds (not gifts / quick add) gets the option text
  `<Name on the order line>: <image link>` - the order receives it in the line's variant text; lines with another photo
  never merge (own bundleKey). HEIC photos are handed over as a .jpg link. *Photo required* = Add to cart (and the sticky
  button) waits for a photo; a running upload always holds Add to cart back. The cart drawer shows a thumbnail.
  The checkout summary splits variant text on "/", so the link reads broken there (display only; the order keeps it whole).
- **Sticky add to cart** block (`snippets/lu-sticky-atc.hbs`): moved to `<body>`, always shown (setting *Always show*,
  default on; off = shows once the main Add to cart is above the screen); image, title (editable: *Product title*, empty = product name) + selected Kaching pack, compare price, price follow the page live; the button uses the
  theme's `.button` (Add to cart look, Theme settings > Colors) and adds the current choice (or scrolls back to the form).
  When the block is on the page, the section's old CLAIM OFFER bar is removed.
