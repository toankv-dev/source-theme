# Design map: lunara---hushflex
<!-- Written by tools/theme-map.js from the theme's files. Edit only inside the notes blocks at the end; run the tool after every change. -->
Lunara 2026.11.19.2 · schema v2 · 11 templates · 18 sections · 15 snippets · 4 CSS · 4 JS
One part in detail: `node tools/theme-map.js themes/lunara---hushflex --part <id>` (a section, snippet, template or asset file name, `design`, `sources`).
README.md: Editor (Themes > Customize) L6 · Template "Shapecurve – Drop-seat bodysuit" (`templates/product.shapecurve.json`) L20 · Pages L45 · Hooks kept for pixels L49

## Design
| setting | value | Theme settings | read by |
|---|---|---|---|
| primary | #124F9F | Colors › Primary colour (buttons, menu, footer, top bar, badges, checkout button) | checkout.hbs, gs-head.hbs, page.hbs |
| primary_text | #FFFFFF | Colors › Text on primary colour | gs-head.hbs |
| footer_bg | — | Colors › Footer background | gs-head.hbs |
| footer_text | — | Colors › Footer text | gs-head.hbs |
| sale | #c0392b | Colors › Checkout: sale / error colour | checkout.hbs |
| accent | #1f9d55 | Colors › Checkout: success colour | checkout.hbs, lu-kaching.hbs |
| page_bg | #f7f7f7 | Colors › Checkout: page background | checkout.hbs |
| font | Poppins | Typography › Checkout font (Google Fonts name) | checkout.hbs |
| topbar_bg | — | Top bar › Background | header.hbs |
| topbar_color | #FFFFFF | Top bar › Text | header.hbs |
| hf_wave_color | — | Home page › Wave colour | hf-wave-marquee.hbs |
| hf_strip_bg | — | Home page › Strip background | hf-wave-marquee.hbs |
| hf_strip_text | #FFFFFF | Home page › Strip text colour | hf-wave-marquee.hbs |
| cart_header_bg | #ffffff | Cart drawer › Header background | cart-drawer.hbs |
| cart_header_color | #121212 | Cart drawer › Title colour | cart-drawer.hbs |
| cart_notice_bg | #f3f3f3 | Cart drawer › Notice bar background | cart-drawer.hbs |
| cart_notice_color | #121212 | Cart drawer › Notice bar text | cart-drawer.hbs |
| cart_body_bg | #ffffff | Cart drawer › Background | cart-drawer.hbs |
| cart_footer_bg | #ffffff | Cart drawer › Background | cart-drawer.hbs |
| cart_upsell_bg | #F3F6FB | Cart drawer › Background | cart-drawer.hbs |
| cart_upsell_color | #121212 | Cart drawer › Text | cart-drawer.hbs |
| cart_upsell_accent | — | Cart drawer › Switch colour | cart-drawer.hbs |
| cart_body_upsell_btn_bg | — | Cart drawer › Button colour | cart-drawer.hbs |
| cart_body_upsell_btn_color | #ffffff | Cart drawer › Button text colour | cart-drawer.hbs |
| cart_body_upsell_badge_color | #121212 | Cart drawer › Badge colour | cart-drawer.hbs |
| cart_body_upsell_card_bg | #ffffff | Cart drawer › Card background | cart-drawer.hbs |
| cart_checkout_bg | — | Cart drawer › Checkout button colour | cart-drawer.hbs |
| cart_checkout_color | #ffffff | Cart drawer › Checkout button text | cart-drawer.hbs |
CSS variables: --font-body-family: Poppins, sans-serif · --font-body-style: normal · --font-body-weight: 400 · --font-body-weight-bold: 700 · --font-heading-family: Poppins, sans-serif · --font-heading-style: normal · --font-heading-weight: 700 · --font-body-scale: 1 · --font-heading-scale: 1.3 · --font-heading-line-height: .3 · --font-heading-letter-spacing: .06rem · --color-base-text: 18, 18, 18
Fonts: Poppins 400 700 · Material Symbols Outlined 300
Breakpoints: 750px ×133 · 749px ×97 · 990px ×27 · 768px ×17 · 989px ×16 · 810px ×9 · 1000px ×8 · 500px ×7
Every page (theme.json): theme.css, theme.js

## Templates
| template | sections in order |
|---|---|
| checkout.hbs | — |
| index.hbs | gs-head · header · cart-drawer · hf-wave-marquee · reviews · footer |
| page.hbs | gs-head · header · cart-drawer · footer |
| product.bundle.json "Bundle (Kaching)" | product (9 blocks) · reviews · faq |
| product.hbs | gs-head · header · cart-drawer · product · reviews · faq · footer · product-scripts |
| product.json "Default" | product (8 blocks) · reviews · faq |
| product.shapecurve.json "Shapecurve – Drop-seat bodysuit" | product[skin=shapecurve] (10 blocks) · features:sc-features (4 blocks) · details:sc-details (4 blocks) · testimonials:sc-testimonials (4 blocks) · trust:sc-trust (4 blocks) · reviews · related · 13 default media |
| product.sizes.json "Size buttons (Shapermint)" | product (8 blocks) · reviews · faq |
| product.tiles.json "Variant tiles (Walmart)" | product (8 blocks) · reviews · faq |
| theme.hbs (layout) | gs-head · header · cart-drawer · footer · product-scripts |
| tracking-result.hbs | gs-head · header · cart-drawer · footer |

## Sections
| section | lines | blocks | uses | styled in | edited by |
|---|---|---|---|---|---|
| cart-drawer | 11 (minified) | — | — | custom.css, base.css, <style> 2.2 KB | — |
| custom-html | 15 | — | — | <style> 0.2 KB | — |
| faq | 3 (minified) | qa | — | base.css, custom.css, <style> 0.6 KB | — |
| features | 48 | feature | — | <style> 1.0 KB | — |
| footer | 87 | — | — | base.css, custom.css, <style> 7.5 KB | — |
| guarantee | 21 | item | — | <style> 0.6 KB | — |
| header | 128 | — | — | base.css, custom.css, <style> 5.2 KB | — |
| image-banner | 23 | — | — | <style> 0.8 KB | — |
| marquee | 17 | item | — | <style> 0.6 KB | — |
| product-scripts | 120 | — | — | — | — |
| product | 3 (minified) | rating, title, variant_picker, size_finder, buy_buttons, trust +11 | lu-size-finder, lu-kaching, custom-html-block, lu-media-slider, lu-pi-faq +7 | base.css, custom.css, sc-product.css, <style> 4.5 KB | patch-sc.js, build-sc.js (schema) |
| related | 114 | — | — | custom.css, <style> 1.8 KB | — |
| reviews | 207 | — | — | <style> 38 KB | patch-sc.js, build-sc.js (schema) |
| rich-text | 13 | — | — | <style> 0.4 KB | — |
| sc-details | 49 | item | — | <style> 2.2 KB | build-sc.js (schema) |
| sc-features | 41 | card | — | <style> 2.1 KB | build-sc.js (schema) |
| sc-testimonials | 78 | quote | sc-icon, sc-stars | <style> 3.2 KB | build-sc.js (schema) |
| sc-trust | 35 | item | sc-icon | <style> 1.5 KB | build-sc.js (schema) |

## Snippets
- custom-html-block · 11 lines · used by product
- gs-head · 73 lines · used by index.hbs, page.hbs, product.hbs, theme.hbs, tracking-result.hbs
- hf-wave-marquee · 35 lines · used by index.hbs
- lu-kaching-bar · 12 lines · used by lu-kaching
- lu-kaching · 45 lines · used by product
- lu-media-slider · 3 lines · used by product
- lu-pi-faq · 3 lines · used by product
- lu-size-finder · 279 lines · used by product · edited by patch-sc.js
- sc-fit · 295 lines · used by product
- sc-icon · 4 lines · used by sc-pb-ship, sc-pb-tabs, sc-testimonials, sc-trust
- sc-pb-highlights · 4 lines · used by product
- sc-pb-price · 5 lines · used by product
- sc-pb-ship · 4 lines · used by product
- sc-pb-tabs · 5 lines · used by product
- sc-stars · 3 lines · used by sc-testimonials

## Assets
- base.css 524 KB minified · linked by checkout.hbs, gs-head
- custom.css 56 KB minified · linked by gs-head
- sc-product.css 15 KB · linked by product
- theme.css 0.1 KB · linked by theme.json
- lu-gallery.js 3.3 KB minified · linked by index.hbs, product.hbs, theme.hbs
- lu-pack-msg.js 1.2 KB minified · linked by theme.hbs
- sc-product.js 4.0 KB · linked by product
- theme.js 109 KB minified · linked by index.hbs, page.hbs, product.hbs, theme.hbs +2

## Sources
- _src/anim-webp.py: a helper or check, does not edit the theme
- _src/build-sc.js generates sections/product.schema.json, sections/reviews.schema.json, sections/sc-details.schema.json, sections/sc-features.schema.json, sections/sc-testimonials.schema.json, sections/sc-trust.schema.json +1 → edit the script, then run it
- _src/compare-copy.js: a helper or check, does not edit the theme
- _src/patch-sc.js patches sections/product.hbs, sections/reviews.hbs, snippets/lu-size-finder.hbs (anchored edits) → edit the script, then run it
- _src/sc-e2e.js: a helper or check, does not edit the theme

## Platform hooks
{{{trackingHead}}} theme.hbs:16 · {{{trackingBody}}} theme.hbs:20 · #sf-config with configJson theme.hbs:8 · #sf-variants-data product-scripts.hbs:7 · #addToCart product.hbs:2 · data-testid="add-to-cart" product.hbs:2 · #CartDrawer-Checkout cart-drawer.hbs:9 · data-testid="checkout-button" cart-drawer.hbs:9

## Notes
<!-- Write what the code does not say (intent, traps, recipes) under "### <part id>", between notes:<id> markers. -->
### theme
<!-- notes:theme -->
- Lunara rules win with `#MainProduct-…` ids + `!important` (gallery 530 px, thumbs, ATC radius): override with the same prefix.
- A Lunara file listed under Sources is changed through its script (`_src/patch-*.js` anchored edits, `_src/build-sc.js` schemas + template): edit the script, run it, check the other templates render the same.
- Checks: `node <theme>/_src/compare-copy.js <dir>` makes a copy with a bodysuit sample product; `_src/sc-e2e.js <url>` runs on it.
<!-- /notes -->
