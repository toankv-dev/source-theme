# Design map: lunara-black---owear-tien
<!-- Written by tools/theme-map.js from the theme's files. Edit only inside the notes blocks at the end; run the tool after every change. -->
Lunara Black Owear Tien 2026.11.26.7 · schema v2 · 10 templates · 14 sections · 19 snippets · 3 CSS · 4 JS
One part in detail: `node tools/theme-map.js themes/lunara-black---owear-tien --part <id>` (a section, snippet, template or asset file name, `design`, `sources`).
README.md: Editor (Themes > Customize) L6 · Pages L20 · Hooks kept for pixels L24 · Add-to-cart form (2026.11.07.4) L28 · Type per item + scroll (2026.11.07.7) L43 · Type switch in place (2026.11.07.8) L53 · Product types as one product (2026.11.07.9) L62 · Add-to-cart form extras (2026.11.09.1) L75

## Design
| setting | value | Theme settings | read by |
|---|---|---|---|
| primary | #000000 | Colors › Primary colour (buttons, menu, footer, top bar, badges, checkout button) | checkout.hbs, gs-head.hbs, page.hbs |
| primary_text | #FFFFFF | Colors › Text on primary colour | gs-head.hbs |
| footer_bg | — | Colors › Footer background | gs-head.hbs |
| footer_text | — | Colors › Footer text | gs-head.hbs |
| sale | #c0392b | Colors › Checkout: sale / error colour | checkout.hbs |
| accent | #1f9d55 | Colors › Checkout: success colour | checkout.hbs, lu-kaching.hbs |
| page_bg | #f7f7f7 | Colors › Checkout: page background | checkout.hbs |
| font | Poppins | Typography › Checkout font (Google Fonts name) | checkout.hbs |
| topbar_bg | — | Top bar › Background | announcement-bar.hbs |
| topbar_color | #FFFFFF | Top bar › Text | announcement-bar.hbs |
| cart_header_bg | #ffffff | Cart drawer › Header background | cart-drawer.hbs |
| cart_header_color | #000000 | Cart drawer › Title colour | cart-drawer.hbs |
| cart_notice_bg | #f3f3f3 | Cart drawer › Notice bar background | cart-drawer.hbs |
| cart_notice_color | #000000 | Cart drawer › Notice bar text | cart-drawer.hbs |
| cart_body_bg | #ffffff | Cart drawer › Background | cart-drawer.hbs |
| cart_footer_bg | #ffffff | Cart drawer › Background | cart-drawer.hbs |
| cart_upsell_bg | #F4F4F4 | Cart drawer › Background | cart-drawer.hbs |
| cart_upsell_color | #000000 | Cart drawer › Text | cart-drawer.hbs |
| cart_upsell_accent | — | Cart drawer › Switch colour | cart-drawer.hbs |
| cart_body_upsell_btn_bg | — | Cart drawer › Button colour | cart-drawer.hbs |
| cart_body_upsell_btn_color | #ffffff | Cart drawer › Button text colour | cart-drawer.hbs |
| cart_body_upsell_badge_color | #000000 | Cart drawer › Badge colour | cart-drawer.hbs |
| cart_body_upsell_card_bg | #ffffff | Cart drawer › Card background | cart-drawer.hbs |
| cart_checkout_bg | — | Cart drawer › Checkout button colour | cart-drawer.hbs |
| cart_checkout_color | #ffffff | Cart drawer › Checkout button text | cart-drawer.hbs |
CSS variables: --font-body-family: Poppins, sans-serif · --font-body-style: normal · --font-body-weight: 400 · --font-body-weight-bold: 700 · --font-heading-family: Poppins, sans-serif · --font-heading-style: normal · --font-heading-weight: 700 · --font-body-scale: 1 · --font-heading-scale: 1.3 · --font-heading-line-height: .3 · --font-heading-letter-spacing: .06rem · --color-base-text: 18, 18, 18
Fonts: Poppins 400 700 · Material Symbols Outlined 300
Breakpoints: 750px ×138 · 749px ×104 · 990px ×27 · 768px ×17 · 989px ×17 · 810px ×9 · 1000px ×8 · 500px ×7
Every page (theme.json): theme.css, theme.js

## Templates
| template | sections in order |
|---|---|
| checkout.hbs | lu-black-finish |
| index.hbs | gs-head · lu-track-once · header · cart-drawer · reviews · footer · lu-cart-float |
| page.hbs | gs-head · lu-track-once · header · cart-drawer · footer · lu-cart-float |
| product.bundle.json "Bundle (Kaching)" | product (9 blocks) · reviews · faq |
| product.hbs | gs-head · lu-track-once · header · cart-drawer · product · reviews · faq · footer · product-scripts · lu-cart-float |
| product.json "Default" | product (12 blocks) · reviews · faq |
| product.sizes.json "Size buttons (Shapermint)" | product (8 blocks) · reviews · faq |
| product.tiles.json "Variant tiles (Walmart)" | product (8 blocks) · reviews · faq |
| theme.hbs (layout) | gs-head · lu-track-once · header · cart-drawer · footer · product-scripts · lu-cart-float |
| tracking-result.hbs | gs-head · header · cart-drawer · footer |

## Sections
| section | lines | blocks | uses | styled in | edited by |
|---|---|---|---|---|---|
| cart-drawer | 11 (minified) | — | — | custom.css, base.css, <style> 11 KB | patch-cart.js |
| custom-html | 15 | — | — | <style> 0.2 KB | — |
| faq | 3 (minified) | qa | — | base.css, custom.css, <style> 0.6 KB | — |
| features | 48 | feature | — | <style> 1.0 KB | — |
| footer | 87 | — | — | base.css, custom.css, <style> 7.5 KB | — |
| guarantee | 21 | item | — | <style> 0.6 KB | — |
| header | 119 | — | announcement-bar | base.css, custom.css, <style> 1.7 KB | — |
| image-banner | 23 | — | — | <style> 0.8 KB | — |
| marquee | 17 | item | — | <style> 0.6 KB | — |
| product-scripts | 120 | — | — | — | — |
| product | 3 (minified) | rating, title, variant_picker, size_finder, buy_buttons, trust +12 | lu-merge-gallery, lu-size-finder, lu-benefits-usp, lu-kaching, custom-html-block +7 | base.css, custom.css, <style> 6.9 KB | — |
| related | 114 | — | — | custom.css, <style> 1.8 KB | — |
| reviews | 207 | — | — | <style> 42 KB | — |
| rich-text | 13 | — | — | <style> 0.4 KB | — |

## Snippets
- announcement-bar · 12 lines · used by header
- custom-html-block · 11 lines · used by product
- gs-head · 91 lines · used by index.hbs, page.hbs, product.hbs, theme.hbs, tracking-result.hbs · edited by patch-cart.js
- lu-benefits-usp · 5 lines · used by product
- lu-black-finish · 6 lines · used by checkout.hbs, gs-head
- lu-cart-float · 7 lines · used by index.hbs, page.hbs, product.hbs, theme.hbs
- lu-icon · 4 lines · used by lu-benefits-usp
- lu-kaching-bar · 25 lines · used by lu-kaching
- lu-kaching · 75 lines · used by product
- lu-media-slider · 3 lines · used by product
- lu-merge-gallery · 28 lines · used by product
- lu-optin · 4 lines · used by product
- lu-photo-upload · 14 lines · used by product
- lu-pi-faq · 3 lines · used by product
- lu-product-switch · 30 lines · used by product
- lu-size-finder · 283 lines · used by product
- lu-sticky-atc · 13 lines · used by product
- lu-stock-bar · 7 lines · used by product
- lu-track-once · 5 lines · used by index.hbs, page.hbs, product.hbs, theme.hbs

## Assets
- base.css 524 KB minified · linked by checkout.hbs, gs-head
- custom.css 85 KB minified · linked by gs-head
- theme.css 0.1 KB · linked by theme.json
- lu-atc-extras.js 8.8 KB minified · linked by theme.hbs
- lu-form.js 32 KB minified · linked by product.hbs, theme.hbs
- lu-gallery.js 3.3 KB minified · linked by index.hbs, product.hbs, theme.hbs
- theme.js 139 KB minified · linked by index.hbs, page.hbs, product.hbs, theme.hbs +2

## Sources
- _src/patch-cart.js patches assets/js/theme.js, config/settings_data.json, config/settings_schema.json, sections/cart-drawer.hbs, snippets/gs-head.hbs (anchored edits) → edit the script, then run it
- _src/cart-edits.json: source read by _src/patch-cart.js → edit it, then run that script
- _src/cart-module.js: source read by _src/patch-cart.js → edit it, then run that script

## Platform hooks
{{{trackingHead}}} theme.hbs:16 · {{{trackingBody}}} theme.hbs:20 · #sf-config with configJson theme.hbs:8 · #sf-variants-data product-scripts.hbs:7 · #addToCart product.hbs:2 · data-testid="add-to-cart" product.hbs:2 · #CartDrawer-Checkout cart-drawer.hbs:9 · data-testid="checkout-button" cart-drawer.hbs:9

## Notes
<!-- Write what the code does not say (intent, traps, recipes) under "### <part id>", between notes:<id> markers. -->
### theme
<!-- notes:theme -->
- Cart = lunara---vesnacharm's cart (2026.11.25.8, = what tammycharm-tien copies). A cart fix made in vesnacharm: copy its new module (`var dt=(function(){…})()` before `window.MSCart=dt;` in its theme.js) into `_src/cart-module.js`, its new template edits into `_src/cart-edits.json` (wine `--vn-hl` → `--lu-primary,#000000`), run `_src/patch-cart.js`.
- theme.js here is the same Lunara source minified apart from vesnacharm / hushflex: never apply their patch scripts' theme.js anchors as is. The wrapper in patch-cart.js maps the helper names (u→l, ct→ut, B→V, ae→le, ne→ue, gt→bt, he→Ce).
- Buy X Get Y gifts in the cart need `allow_bxgy_discount` on and the store's offers (`cart-drawer[data-bxgy]`); the preview has none: test by setting that attribute in `--eval` (offer `{buy,get,type:"FREE",x:[pid],y:[pid]}`, preview pid `sample-product-id`).
- Home preview logs one 404 (older, lunara-black-brixpant too). Kaching packs in the preview all have quantity 1.
- Pack price by 3-pack count (3 / 6 / 9 Pack = 59.95 / 99.95 / 129.95) = admin only (platform-guide › Discounts "Packs
  priced as N × a base pack"). Since 2026.11.26.4 a cart line keeps the pack it was added with (the 26.2 / 26.3
  relabel by quantity was WRONG for the user: never bring it back) and its price = its share of the tier discount's
  total over ALL tier lines (patch-cart.js edit 6, luAvg group "~tier": 3 × 3 Pack = 43.32 / 43.31 / 43.32 = 129.95).
  Since 2026.11.26.7 the split line keeps D.luPk {vid, n "6 Pack", f 2, on} (saved in the cart): shows the big pack, qty
  = units / f, ± = f units (edit 9, luPkQ / luPkUn); a cart saved before .7 stays "3 Pack × 2" (no luPk).
  Since 2026.11.26.5 a 6 / 9 Pack line becomes 2 / 3 × "3 Pack" in the cart (edit 7 luSP, settings cart_split_*): the
  tier discount counts cart UNITS, so a big-pack variant = 1 unit priced by a 3-pack percent (live 3+6+9 Pack = 226.64).
  Live Kaching rows = qty 1 of 3 / 6 / 9 Pack variants (data-lu-pack), keep them: the bars show 59.95 / 99.95 / 129.95.
  Test: temporary sample/product.json (Color × Size M × Packs 3/6/9) + MSCart.add of each pack (delete sample/ after).
  Test: `--eval` setting cart-drawer data-tiers "2:33.28,3:49.96,4:27.74" + 3 × MSCart.add({…opts Packs "3 Pack",
  price 59.95}) + MSCart.open(). Live check without admin: POST https://<store>/api/storefront/cart-totals
  {domain, handle, items:[{price,quantity}]} + the page's LuTierPids. Live: Boxer Briefs is not in "Owear packs".
- Cart sheet Type row (2026.11.26.6, edit 8 luTy*): types = cart-drawer [data-lu-cart-types] i (rendered from
  ptype_N_product: the preview does NOT resolve that picker, pid empty = no row; test by injecting the <i> + a
  [data-lu-types] template + sessionStorage "lu-pv:<pid>"). Boxer Briefs must be in the "Owear packs" discount too,
  or a line moved to Boxer leaves the tier (different price, no 3-pack split).
- Live check: the platform RE-MINIFIES theme.js on upload (own function names mangled: luSP / luTys … not found), so
  grep live assets for string literals ("data-lu-split", "~tier", "lu-sh__ty"); the assets URL token (@xxxx) changes
  per upload. Run the scenario live: node tools/shot.js <product url> - --eval (Kaching .kaching-bundles__bar[data-n] +
  #addToCart; the cart is the browser's only). Boxer = discount "Next item progressive", not the theme's tiers.
  Theme setting Discounts › "Allow tiered discount" defaults to OFF here: without it the page AND the checkout ignore tiers.
<!-- /notes -->
