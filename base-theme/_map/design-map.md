# Design map: base-theme
<!-- Written by tools/theme-map.js from the theme's files. Edit only inside the notes blocks at the end; run the tool after every change. -->
Base 2026.11.09.1 · schema v2 · 10 templates · 25 sections · 20 snippets · 3 CSS · 2 JS
One part in detail: `node tools/theme-map.js base-theme --part <id>` (a section, snippet, template or asset file name, `design`, `sources`).
README.md: Layers — what a child theme may change L8 · Platform contract (keep in every theme) L21 · JavaScript API (`window.Base`, core.js) L46 · Section catalog (product templates) L54 · Pages L91 · Mobile first L98 · Work on it L107

## Design
| setting | value | Theme settings | read by |
|---|---|---|---|
| primary | #14203b | Colors › Primary (buttons, accents) | checkout.hbs, vars.hbs |
| primary_text | #ffffff | Colors › Text on primary | checkout.hbs, vars.hbs |
| accent | #14203b | Colors › Accent | vars.hbs |
| text_color | #15171c | Colors › Body text | checkout.hbs, image-banner.hbs, vars.hbs |
| page_bg | #ffffff | Colors › Page background | vars.hbs |
| check | #1fa463 | Colors › Check marks / success | checkout.hbs, vars.hbs |
| badge | #3b9dea | Colors › Badges | vars.hbs |
| sale | #e0392b | Colors › Sale price / discount | checkout.hbs, vars.hbs |
| alert | #e0392b | Colors › Alerts | vars.hbs |
| star | #17b26a | Colors › Stars | vars.hbs |
| header_bg | #ffffff | Colors › Header background | vars.hbs |
| header_text | #15171c | Colors › Header text | vars.hbs |
| footer_bg | #14203b | Colors › Footer background | vars.hbs |
| footer_text | #ffffff | Colors › Footer text | vars.hbs |
| checkout_bg | #f7f7f7 | Colors › Checkout background | checkout.hbs |
| font | Manrope | Typography & shape › Body font (Google Fonts name) | checkout.hbs, vars.hbs |
| font_heading | — | Typography & shape › Heading font (optional) | checkout.hbs, vars.hbs |
| font_weights | 400;500;600;700;800 | Typography & shape › Google Fonts weights | vars.hbs |
| load_google_fonts | true | Typography & shape › Load the fonts from Google Fonts | vars.hbs |
| radius | 12 | Typography & shape › Corner radius (cards, images) | product.hbs, vars.hbs |
| btn_radius | 8 | Typography & shape › Button corner radius | checkout.hbs, vars.hbs |
| topbar_bg | #14203b | Top bar › Background | vars.hbs |
| topbar_color | #ffffff | Top bar › Text | vars.hbs |
| cart_upsell_bg | #f4f5f7 | Cart › Background | cart-drawer.hbs |
| cart_upsell_color | #15171c | Cart › Text | cart-drawer.hbs |
| cart_upsell_accent | — | Cart › Switch colour | cart-drawer.hbs |
CSS variables: --c-text: #15171c · --c-muted: #5d6270 · --c-line: #e3e5ea · --c-soft: #f4f5f7 · --radius: 12px · --wrap: 1200px
Breakpoints: 900px ×15 · 749px ×13 · 750px ×11 · 990px ×6 · 600px ×4 · 899px ×4 · 989px ×3 · 420px ×1
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
| product.json "Default" | main:product (11 blocks) · promises:marquee (4 blocks) · story:image-with-text · benefits:icon-columns (3 blocks) · testimonials · faq · reviews · related |
| search.hbs | head · header · card-product · footer · scripts |
| theme.hbs (layout) | head · header · footer · product-scripts · scripts |
| tracking-result.hbs | head · header · footer · scripts |

## Sections
| section | lines | blocks | uses | styled in | edited by |
|---|---|---|---|---|---|
| cart-drawer | 58 | — | pay-icons | sections.css, base.css | — |
| comparison | 20 | row | — | sections.css, base.css | — |
| contact-form | 2 | — | contact-form-body | — | — |
| custom-html | 4 | — | — | <style> 0.0 KB | — |
| faq | 19 | qa | faq-list | base.css, sections.css | — |
| feature-rows | 32 | row | — | base.css, sections.css | — |
| footer | 52 | — | policy-link, newsletter-form, social-links, pay-icons | sections.css, base.css | — |
| guarantee | 9 | — | — | base.css, sections.css | — |
| header | 97 | — | vars, icon-caret, nav-links, cart-drawer | sections.css, base.css | — |
| icon-columns | 14 | column | — | sections.css | — |
| image-banner | 21 | — | — | sections.css | — |
| image-row | 32 | video, image | — | sections.css | — |
| image-with-text | 12 | — | — | sections.css, base.css | — |
| logo-bar | 25 | logo | — | sections.css | — |
| marquee | 8 | item | — | base.css, sections.css | — |
| newsletter | 8 | — | newsletter-form | sections.css | — |
| product-scripts | 5 | — | — | — | — |
| product | 223 | award, rating, title, subtitle, benefit, stock +17 | price, options, pack-cards, buy-row, pay-icons +2 | sections.css, base.css | — |
| related | 10 | — | card-product | sections.css, base.css | — |
| reviews | 75 | — | icon-caret | sections.css, base.css | — |
| rich-text | 7 | — | — | sections.css | — |
| spec-card | 22 | tile | — | base.css, sections.css | — |
| stats | 16 | stat | — | base.css | — |
| steps | 17 | step | — | base.css, sections.css | — |
| testimonials | 19 | — | — | base.css | — |

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
- vars · 30 lines · used by header

## Assets
- base.css 30 KB · linked by head, theme.json
- sections.css 74 KB · linked by head, theme.json
- skin.css 0.3 KB · linked by head, theme.json
- core.js: platform core, never edit
- ui.js 87 KB · linked by scripts, theme.json

## Sources
No build or patch scripts: the theme files are the source.

## Platform hooks
{{{trackingHead}}} head.hbs:29 · {{{trackingBody}}} theme.hbs:7 · #sf-config with configJson checkout.hbs:1551 · #sf-variants-data product-scripts.hbs:3 · #addToCart buy-row.hbs:10 · data-testid="add-to-cart" index.hbs:70 · #CartDrawer-Checkout cart-drawer.hbs:46 · data-testid="checkout-button" cart-drawer.hbs:2

## Notes
<!-- Write what the code does not say (intent, traps, recipes) under "### <part id>", between notes:<id> markers. -->
### theme
<!-- notes:theme -->
<!-- /notes -->
