# Design map: tredvik
<!-- Written by tools/theme-map.js from the theme's files. Edit only inside the notes blocks at the end; run the tool after every change. -->
Tredvik 2026.11.09.2 · schema v2 · 10 templates · 27 sections · 21 snippets · 3 CSS · 2 JS
One part in detail: `node tools/theme-map.js themes/tredvik --part <id>` (a section, snippet, template or asset file name, `design`, `sources`).
README.md: Layers — what a child theme may change L8 · Platform contract (keep in every theme) L21 · JavaScript API (`window.Base`, core.js) L44 · Section catalog (product templates) L52 · Pages L86 · Mobile first L93 · Work on it L102

## Design
| setting | value | Theme settings | read by |
|---|---|---|---|
| primary | #000000 | Colors › Primary (buttons, accents) | checkout.hbs, vars.hbs |
| primary_text | #ffffff | Colors › Text on primary | checkout.hbs, vars.hbs |
| accent | #000000 | Colors › Accent | vars.hbs |
| text_color | #121212 | Colors › Body text | checkout.hbs, image-banner.hbs, vars.hbs |
| page_bg | #f7f7f7 | Colors › Page background | vars.hbs |
| check | #53af01 | Colors › Check marks / success | checkout.hbs, vars.hbs |
| badge | #000000 | Colors › Badges | vars.hbs |
| sale | #921a19 | Colors › Sale price / discount | checkout.hbs, vars.hbs |
| alert | #921a19 | Colors › Alerts | vars.hbs |
| star | #f3cc4b | Colors › Stars | vars.hbs |
| header_bg | #f7f7f7 | Colors › Header background | vars.hbs |
| header_text | #121212 | Colors › Header text | vars.hbs |
| footer_bg | #f7f7f7 | Colors › Footer background | vars.hbs |
| footer_text | #121212 | Colors › Footer text | vars.hbs |
| checkout_bg | #f7f7f7 | Colors › Checkout background | checkout.hbs |
| font | Montserrat | Typography & shape › Body font (Google Fonts name) | checkout.hbs, vars.hbs |
| font_heading | DM Serif Display | Typography & shape › Heading font (optional) | checkout.hbs, vars.hbs |
| font_weights | 400;700 | Typography & shape › Google Fonts weights | vars.hbs |
| load_google_fonts | false | Typography & shape › Load the fonts from Google Fonts | vars.hbs |
| radius | 12 | Typography & shape › Corner radius (cards, images) | product.hbs, vars.hbs |
| btn_radius | 8 | Typography & shape › Button corner radius | checkout.hbs, vars.hbs |
| topbar_bg | #000000 | Top bar › Background | vars.hbs |
| topbar_color | #ffffff | Top bar › Text | vars.hbs |
| cart_upsell_bg | #f4f5f7 | Cart › Background | cart-drawer.hbs |
| cart_upsell_color | #15171c | Cart › Text | cart-drawer.hbs |
| cart_upsell_accent | — | Cart › Switch colour | cart-drawer.hbs |
CSS variables: --c-text: #15171c · --c-muted: #5d6270 · --c-line: #e3e5ea · --c-soft: #f4f5f7 · --radius: 12px · --wrap: 1200px · --font: "Montserrat", system-ui, sans-serif !important · --font-heading: "DM Serif Display", Georgia, serif !important · --c-line: rgba(18, 18, 18, .1) · --tv-text: rgba(18, 18, 18, .9)
Breakpoints: 900px ×15 · 749px ×14 · 750px ×12 · 990px ×7 · 600px ×4 · 899px ×4 · 989px ×3 · 420px ×1
Every page (theme.json): base.css, sections.css, skin.css, core.js, ui.js

## Templates
| template | sections in order |
|---|---|
| checkout.hbs | — |
| collection.hbs | head · header · icon-caret · card-product · footer · scripts |
| index.hbs | head · header · icon-arrow · card-product · faq · newsletter-form · contact-form-body · footer · scripts |
| page.hbs | head · header · contact-form-body · footer · scripts |
| product.bundle.json "Bundle packs" | main:product (13 blocks) · promises:marquee (4 blocks) · story:image-with-text · benefits:icon-columns (3 blocks) · testimonials · faq · reviews · related |
| product.hbs | head · header · product · reviews · faq · related · footer · product-scripts · scripts |
| product.json "Product" | main:product (13 blocks) · iwt_1:image-with-text · iwt_2:image-with-text · steps:tv-steps (3 blocks) · compare:comparison (6 blocks) · quotes:tv-quotes (3 blocks) · faq (7 blocks) · reviews · 9 default media |
| search.hbs | head · header · card-product · footer · scripts |
| theme.hbs (layout) | head · header · footer · product-scripts · scripts |
| tracking-result.hbs | head · header · footer · scripts |

## Sections
| section | lines | blocks | uses | styled in | edited by |
|---|---|---|---|---|---|
| cart-drawer | 58 | — | pay-icons | sections.css, base.css | — |
| comparison | 20 | row | — | skin.css, sections.css, base.css | — |
| contact-form | 2 | — | contact-form-body | — | — |
| custom-html | 4 | — | — | <style> 0.0 KB | — |
| faq | 19 | qa | faq-list | skin.css, base.css, sections.css | — |
| feature-rows | 32 | row | — | base.css, sections.css | — |
| footer | 52 | — | policy-link, newsletter-form, social-links, pay-icons | sections.css, skin.css, base.css | — |
| guarantee | 9 | — | — | base.css, sections.css | — |
| header | 99 | — | vars, tv-fonts, icon-caret, nav-links, cart-drawer | sections.css, skin.css, base.css | — |
| icon-columns | 14 | column | — | sections.css | — |
| image-banner | 21 | — | — | sections.css | — |
| image-row | 32 | video, image | — | sections.css | — |
| image-with-text | 12 | — | — | sections.css, skin.css, base.css | — |
| logo-bar | 25 | logo | — | sections.css | — |
| marquee | 8 | item | — | base.css, sections.css | — |
| newsletter | 8 | — | newsletter-form | sections.css | — |
| product-scripts | 5 | — | — | — | — |
| product | 225 | award, rating, title, subtitle, benefit, stock +17 | price, options, pack-cards, buy-row, pay-icons +2 | sections.css, base.css | — |
| related | 10 | — | card-product | sections.css, base.css | — |
| reviews | 75 | — | icon-caret | skin.css, sections.css, base.css | — |
| rich-text | 7 | — | — | sections.css | — |
| spec-card | 22 | tile | — | base.css, sections.css, skin.css | — |
| stats | 16 | stat | — | base.css | — |
| steps | 17 | step | — | base.css, sections.css | — |
| testimonials | 19 | — | — | base.css | — |
| tv-quotes | 23 | quote | — | skin.css | — |
| tv-steps | 20 | step | — | skin.css | — |

## Snippets
- buy-row · 14 lines · used by product
- card-product · 19 lines · used by collection.hbs, index.hbs, related, search.hbs
- contact-form-body · 19 lines · used by contact-form, index.hbs, page.hbs
- faq-list · 42 lines · used by faq, product
- faq-qa · 6 lines · used by product
- head · 31 lines · used by collection.hbs, index.hbs, page.hbs, product.hbs, search.hbs +2
- icon-arrow · 2 lines · used by index.hbs
- icon-caret · 2 lines · used by collection.hbs, header, reviews
- nav-links · 8 lines · used by header
- newsletter-form · 9 lines · used by footer, index.hbs, newsletter
- options · 28 lines · used by product
- pack-cards · 46 lines · used by product
- pack-qcard · 21 lines · used by pack-cards
- pay-icons · 14 lines · used by cart-drawer, footer, product
- policy-link · 5 lines · used by footer
- price · 7 lines · used by product
- scripts · 6 lines · used by collection.hbs, index.hbs, page.hbs, product.hbs, search.hbs +2
- social-links · 7 lines · used by footer
- stars · 3 lines · used by —
- tv-fonts · 5 lines · used by header
- vars · 30 lines · used by header

## Assets
- base.css 28 KB · linked by head, theme.json
- sections.css 65 KB · linked by head, theme.json
- skin.css 25 KB · linked by head, theme.json
- core.js: platform core, never edit
- ui.js 88 KB · linked by scripts, theme.json

## Sources
No build or patch scripts: the theme files are the source.

## Platform hooks
{{{trackingHead}}} head.hbs:29 · {{{trackingBody}}} theme.hbs:9 · #sf-config with configJson checkout.hbs:1551 · #sf-variants-data product-scripts.hbs:3 · #addToCart buy-row.hbs:10 · data-testid="add-to-cart" index.hbs:72 · #CartDrawer-Checkout cart-drawer.hbs:46 · data-testid="checkout-button" cart-drawer.hbs:2

## Notes
<!-- Write what the code does not say (intent, traps, recipes) under "### <part id>", between notes:<id> markers. -->
### theme
<!-- notes:theme -->
<!-- /notes -->
