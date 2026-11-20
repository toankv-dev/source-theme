# Design map: lunara-black-brixpant
<!-- Written by tools/theme-map.js from the theme's files. Edit only inside the notes blocks at the end; run the tool after every change. -->
Lunara Black 2026.11.16.5 · schema v2 · 11 templates · 22 sections · 19 snippets · 4 CSS · 5 JS
One part in detail: `node tools/theme-map.js themes/lunara-black-brixpant --part <id>` (a section, snippet, template or asset file name, `design`, `sources`).
README.md: Template "Tredvik – Brixpant bundle" (`templates/product.tredvik-brixpant-bundle.json`) L10 · One font (Poppins) on every page L42 · Buy now bar (`snippets/lu-sticky-buy.hbs`, every product template) L51 · Editor (Themes > Customize) L57 · Pages L79 · Hooks kept for pixels L83

## Design
| setting | value | Theme settings | read by |
|---|---|---|---|
| primary | #1f1f1f | Colors › Primary colour (buttons, menu, footer, top bar, badges, checkout button) | checkout.hbs, gs-head.hbs, page.hbs |
| primary_text | #FFFFFF | Colors › Text on primary colour | gs-head.hbs |
| footer_bg | — | Colors › Footer background | gs-head.hbs, tv-vars.hbs |
| footer_text | — | Colors › Footer text | gs-head.hbs, tv-vars.hbs |
| sale | #c0392b | Colors › Checkout: sale / error colour | checkout.hbs |
| accent | #1f9d55 | Colors › Checkout: success colour | checkout.hbs, lu-kaching.hbs |
| page_bg | #f7f7f7 | Colors › Checkout: page background | checkout.hbs |
| topbar_bg | — | Top bar › Background | header.hbs, tv-vars.hbs |
| topbar_color | #FFFFFF | Top bar › Text | header.hbs, tv-vars.hbs |
| cart_header_bg | #ffffff | Cart drawer › Header background | cart-drawer.hbs |
| cart_header_color | #121212 | Cart drawer › Title colour | cart-drawer.hbs |
| cart_notice_bg | #f3f3f3 | Cart drawer › Notice bar background | cart-drawer.hbs |
| cart_notice_color | #121212 | Cart drawer › Notice bar text | cart-drawer.hbs |
| cart_body_bg | #ffffff | Cart drawer › Background | cart-drawer.hbs |
| cart_footer_bg | #ffffff | Cart drawer › Background | cart-drawer.hbs |
| cart_upsell_bg | #F4F4F4 | Cart drawer › Background | cart-drawer.hbs |
| cart_upsell_color | #121212 | Cart drawer › Text | cart-drawer.hbs |
| cart_upsell_accent | — | Cart drawer › Switch colour | cart-drawer.hbs |
| cart_body_upsell_btn_bg | — | Cart drawer › Button colour | cart-drawer.hbs |
| cart_body_upsell_btn_color | #ffffff | Cart drawer › Button text colour | cart-drawer.hbs |
| cart_body_upsell_badge_color | #121212 | Cart drawer › Badge colour | cart-drawer.hbs |
| cart_body_upsell_card_bg | #ffffff | Cart drawer › Card background | cart-drawer.hbs |
| cart_checkout_bg | — | Cart drawer › Checkout button colour | cart-drawer.hbs |
| cart_checkout_color | #ffffff | Cart drawer › Checkout button text | cart-drawer.hbs |
| tv_primary | #000000 | Tredvik template › Primary (buttons, accents) | tv-vars.hbs |
| tv_primary_text | #ffffff | Tredvik template › Text on primary | tv-vars.hbs |
| tv_accent | #000000 | Tredvik template › Accent | tv-vars.hbs |
| tv_text_color | #121212 | Tredvik template › Body text | tv-vars.hbs |
| tv_page_bg | #f7f7f7 | Tredvik template › Page background | tv-vars.hbs |
| tv_check | #53af01 | Tredvik template › Check marks / success | tv-vars.hbs |
| tv_badge | #000000 | Tredvik template › Badges | tv-vars.hbs |
| tv_sale | #921a19 | Tredvik template › Sale price / discount | tv-vars.hbs |
| tv_alert | #921a19 | Tredvik template › Alerts | tv-vars.hbs |
| tv_star | #f3cc4b | Tredvik template › Stars | tv-vars.hbs |
| tv_radius | 12 | Tredvik template › Corner radius (cards, images) | tv-vars.hbs |
| tv_btn_radius | 8 | Tredvik template › Button corner radius | tv-vars.hbs |
CSS variables: --font-body-family: Poppins, sans-serif · --font-body-style: normal · --font-body-weight: 400 · --font-body-weight-bold: 700 · --font-heading-family: Poppins, sans-serif · --font-heading-style: normal · --font-heading-weight: 700 · --font-body-scale: 1 · --font-heading-scale: 1.3 · --font-heading-line-height: .3 · --font-heading-letter-spacing: .06rem · --color-base-text: 18, 18, 18
Fonts: Poppins 400 700 · Material Symbols Outlined 300
Breakpoints: 750px ×144 · 749px ×111 · 990px ×34 · 900px ×21 · 989px ×20 · 768px ×17 · 600px ×10 · 810px ×9
Every page (theme.json): theme.css, theme.js

## Templates
| template | sections in order |
|---|---|
| checkout.hbs | lu-black-finish |
| index.hbs | gs-head · header · cart-drawer · reviews · footer |
| page.hbs | gs-head · header · cart-drawer · footer |
| product.bundle.json "Bundle (Kaching)" | product (9 blocks) · reviews · faq |
| product.hbs | gs-head · header · cart-drawer · product · reviews · faq · footer · product-scripts |
| product.json "Default" | product (8 blocks) · reviews · faq |
| product.sizes.json "Size buttons (Shapermint)" | product (8 blocks) · reviews · faq |
| product.tiles.json "Variant tiles (Walmart)" | product (8 blocks) · reviews · faq |
| product.tredvik-brixpant-bundle.json "Tredvik – Brixpant bundle" | main:tv-product (13 blocks) · iwt_1:tv-image-with-text · iwt_2:tv-image-with-text · steps:tv-steps (3 blocks) · compare:tv-comparison (6 blocks) · quotes:tv-quotes (3 blocks) · faq:tv-faq (7 blocks) · reviews:tv-reviews · 9 default media |
| theme.hbs (layout) | gs-head · header · cart-drawer · footer · product-scripts |
| tracking-result.hbs | gs-head · header · cart-drawer · footer |

## Sections
| section | lines | blocks | uses | styled in | edited by |
|---|---|---|---|---|---|
| before-after | 116 | — | — | <style> 3.2 KB | — |
| cart-drawer | 11 (minified) | — | — | custom.css, base.css, <style> 2.2 KB | — |
| custom-html | 15 | — | — | <style> 0.2 KB | — |
| faq | 3 (minified) | qa | — | base.css, custom.css, <style> 0.6 KB | — |
| features | 48 | feature | — | <style> 1.0 KB | — |
| footer | 96 | — | — | base.css, custom.css, <style> 7.9 KB | — |
| guarantee | 21 | item | — | <style> 0.6 KB | — |
| header | 128 | — | — | base.css, custom.css, <style> 5.9 KB | — |
| image-banner | 23 | — | — | <style> 0.8 KB | — |
| marquee | 17 | item | — | <style> 0.6 KB | — |
| product-scripts | 121 | — | — | — | — |
| product | 3 (minified) | rating, title, variant_picker, size_finder, buy_buttons, trust +6 | lu-size-finder, lu-kaching, custom-html-block, lu-media-slider, lu-pi-faq +1 | base.css, custom.css, <style> 4.4 KB | — |
| related | 114 | — | — | custom.css, <style> 1.8 KB | — |
| reviews | 207 | — | — | <style> 38 KB | — |
| rich-text | 13 | — | — | <style> 0.4 KB | — |
| tv-comparison | 23 | row | — | tv-bundle.css | — |
| tv-faq | 22 | qa | tv-faq-list | tv-bundle.css | — |
| tv-image-with-text | 15 | — | — | tv-bundle.css | — |
| tv-product | 214 | award, rating, title, subtitle, benefit, stock +17 | tv-vars, tv-price, tv-options, tv-pack-cards, tv-buy-row +8 | tv-bundle.css | — |
| tv-quotes | 26 | quote | — | tv-bundle.css | — |
| tv-reviews | 78 | — | tv-icon-caret | tv-bundle.css | — |
| tv-steps | 23 | step | — | tv-bundle.css | — |

## Snippets
- custom-html-block · 11 lines · used by product
- gs-head · 74 lines · used by index.hbs, page.hbs, product.hbs, theme.hbs, tracking-result.hbs
- lu-black-finish · 6 lines · used by checkout.hbs, gs-head
- lu-kaching-bar · 12 lines · used by lu-kaching
- lu-kaching · 44 lines · used by product
- lu-media-slider · 3 lines · used by product
- lu-pi-faq · 3 lines · used by product
- lu-size-finder · 279 lines · used by product
- lu-sticky-buy · 80 lines · used by product, tv-product
- tv-buy-row · 15 lines · used by tv-product
- tv-faq-list · 43 lines · used by tv-faq, tv-product
- tv-faq-qa · 7 lines · used by tv-product
- tv-icon-caret · 3 lines · used by tv-reviews
- tv-options · 29 lines · used by tv-product
- tv-pack-cards · 47 lines · used by tv-product
- tv-pack-qcard · 22 lines · used by tv-pack-cards
- tv-pay-icons · 15 lines · used by tv-product
- tv-price · 8 lines · used by tv-product
- tv-vars · 30 lines · used by tv-product

## Assets
- base.css 524 KB minified · linked by checkout.hbs, gs-head
- custom.css 61 KB minified · linked by gs-head
- theme.css 0.1 KB · linked by theme.json
- tv-bundle.css 135 KB · linked by tv-product
- lu-gallery.js 3.3 KB minified · linked by index.hbs, product.hbs, theme.hbs
- theme.js 109 KB minified · linked by index.hbs, page.hbs, product.hbs, theme.hbs +2
- tv-bridge.js 2.9 KB · linked by tv-product
- tv-core.js 28 KB · linked by tv-product
- tv-ui.js 88 KB · linked by tv-product

## Sources
No build or patch scripts: the theme files are the source.

## Platform hooks
{{{trackingHead}}} theme.hbs:16 · {{{trackingBody}}} theme.hbs:20 · #sf-config with configJson theme.hbs:8 · #sf-variants-data product-scripts.hbs:7 · #addToCart product.hbs:2 · data-testid="add-to-cart" product.hbs:2 · #CartDrawer-Checkout cart-drawer.hbs:9 · data-testid="checkout-button" cart-drawer.hbs:9

## Notes
<!-- Write what the code does not say (intent, traps, recipes) under "### <part id>", between notes:<id> markers. -->
### theme
<!-- notes:theme -->
<!-- /notes -->
