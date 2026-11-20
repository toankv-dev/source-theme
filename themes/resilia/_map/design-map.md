# Design map: resilia
<!-- Written by tools/theme-map.js from the theme's files. Edit only inside the notes blocks at the end; run the tool after every change. -->
Resilia 2026.11.06.2 · schema v2 · 10 templates · 25 sections · 32 snippets · 8 CSS · 3 JS
One part in detail: `node tools/theme-map.js themes/resilia --part <id>` (a section, snippet, template or asset file name, `design`, `sources`).
README.md: Layers — what a child theme may change L41 · Platform contract (keep in every theme) L54 · JavaScript API (`window.Base`, core.js) L75 · Section catalog (product templates) L83 · Pages L112 · Mobile first L119 · Work on it L128

## Design
| setting | value | Theme settings | read by |
|---|---|---|---|
| primary | #085946 | Colors › Primary (buttons, accents) | checkout.hbs, vars.hbs |
| primary_text | #ffffff | Colors › Text on primary | checkout.hbs, vars.hbs |
| accent | #085946 | Colors › Accent | vars.hbs |
| text_color | #000000 | Colors › Body text | checkout.hbs, image-banner.hbs, vars.hbs |
| page_bg | #ffffff | Colors › Page background | vars.hbs |
| check | #085946 | Colors › Check marks / success | checkout.hbs, vars.hbs |
| badge | #085946 | Colors › Badges | vars.hbs |
| sale | #085946 | Colors › Sale price / discount | checkout.hbs, vars.hbs |
| alert | #d02e2e | Colors › Alerts | vars.hbs |
| star | #000000 | Colors › Stars | vars.hbs |
| header_bg | #ffffff | Colors › Header background | vars.hbs |
| header_text | #085946 | Colors › Header text | vars.hbs |
| footer_bg | #085946 | Colors › Footer background | vars.hbs |
| footer_text | #ffffff | Colors › Footer text | vars.hbs |
| checkout_bg | #f7f7f7 | Colors › Checkout background | checkout.hbs |
| font | Satoshi | Typography & shape › Body font (Google Fonts name) | checkout.hbs, vars.hbs |
| font_heading | Clash Grotesk | Typography & shape › Heading font (optional) | checkout.hbs, vars.hbs |
| font_weights | 400;500;600;700;800 | Typography & shape › Google Fonts weights | vars.hbs |
| load_google_fonts | false | Typography & shape › Load the fonts from Google Fonts | vars.hbs |
| radius | 8 | Typography & shape › Corner radius (cards, images) | product.hbs, vars.hbs |
| btn_radius | 12 | Typography & shape › Button corner radius | checkout.hbs, vars.hbs |
| topbar_bg | #085946 | Top bar › Background | vars.hbs |
| topbar_color | #ffffff | Top bar › Text | vars.hbs |
| cart_upsell_bg | #f4f5f7 | Cart › Background | cart-drawer.hbs |
| cart_upsell_color | #15171c | Cart › Text | cart-drawer.hbs |
| cart_upsell_accent | — | Cart › Switch colour | cart-drawer.hbs |
CSS variables: --c-text: #15171c · --c-muted: #5d6270 · --c-line: #e3e5ea · --c-soft: #f4f5f7 · --radius: 12px · --wrap: 1200px · --rs-deep: #003d30 · --rs-deep-ink: #023a2d · --rs-lime: #d2fa99 · --rs-lime-pale: #efffd8 · --rs-cardbg: #f6f7ec · --rs-mint: #009370
Fonts: Satoshi 400 500 700 · Clash Grotesk 500 600 · Sentient 400
Breakpoints: 749px ×37 · 900px ×14 · 750px ×13 · 989px ×12 · 990px ×10 · 600px ×4 · 899px ×2 · 1200px ×2
Every page (theme.json): base.css, sections.css, skin.css, rs-product.css, rs-home.css, rs-pages.css, rs-help.css, rs-member.css, core.js, ui.js, rs.js

## Templates
| template | sections in order |
|---|---|
| checkout.hbs | — |
| collection.hbs | head · header · icon-caret · card-product · footer · scripts |
| index.hbs | head · header · rs-icon-check · rs-tile · rs-start-card · rs-testi-card · footer · scripts |
| page.hbs | head · header · rs-help · rs-member · footer · scripts |
| product.bundle.json "Bundle packs" | main:product (13 blocks) · promises:marquee (4 blocks) · story:image-with-text · benefits:icon-columns (3 blocks) · testimonials · faq · reviews · related |
| product.hbs | head · header · product · reviews · faq · related · footer · product-scripts · scripts |
| product.json "Default" | main:product (15 blocks) · story_1:image-with-text · story_2:image-with-text · story_3:image-with-text · promise:icon-columns (5 blocks) · compare:comparison (8 blocks) · offer:image-with-text · faq (9 blocks) |
| search.hbs | head · header · card-product · footer · scripts |
| theme.hbs (layout) | head · header · footer · product-scripts · scripts |
| tracking-result.hbs | head · header · footer · scripts |

## Sections
| section | lines | blocks | uses | styled in | edited by |
|---|---|---|---|---|---|
| cart-drawer | 58 | — | pay-icons | sections.css, base.css | — |
| comparison | 23 | row | — | rs-product.css, sections.css, base.css | — |
| contact-form | 2 | — | contact-form-body | — | — |
| custom-html | 4 | — | — | <style> 0.0 KB | — |
| faq | 21 | qa | faq-list | rs-product.css, base.css, sections.css | — |
| feature-rows | 32 | row | — | base.css, sections.css | — |
| footer | 32 | — | newsletter-form, policy-link, pay-icons | skin.css, rs-help.css, rs-home.css | — |
| guarantee | 9 | — | — | base.css, sections.css | — |
| header | 97 | — | vars, icon-caret, nav-links, cart-drawer | sections.css, skin.css, base.css | — |
| icon-columns | 14 | column | — | rs-product.css, sections.css | — |
| image-banner | 16 | — | — | sections.css | — |
| image-row | 27 | video, image | — | sections.css | — |
| image-with-text | 16 | — | pay-icons | rs-product.css, sections.css, base.css | — |
| logo-bar | 23 | logo | — | sections.css | — |
| marquee | 8 | item | — | base.css, sections.css, rs-product.css | — |
| newsletter | 8 | — | newsletter-form | sections.css | — |
| product-scripts | 5 | — | — | — | — |
| product | 270 | award, rs_rating, rs_price, rs_gifts, rs_delivery, rs_note +22 | price, options, pack-cards, buy-row, pay-icons +2 | sections.css, base.css, rs-product.css, <style> 0.5 KB | — |
| related | 10 | — | card-product | sections.css, base.css | — |
| reviews | 82 | — | icon-caret, review-form | sections.css, base.css | — |
| rich-text | 7 | — | — | sections.css | — |
| spec-card | 22 | tile | — | base.css, sections.css | — |
| stats | 16 | stat | — | base.css | — |
| steps | 17 | step | — | base.css, sections.css | — |
| testimonials | 19 | — | — | base.css | — |

## Snippets
- buy-row · 16 lines · used by product
- card-product · 19 lines · used by collection.hbs, related, search.hbs
- contact-form-body · 19 lines · used by contact-form
- faq-list · 42 lines · used by faq, product
- faq-qa · 6 lines · used by product
- head · 31 lines · used by collection.hbs, index.hbs, page.hbs, product.hbs, search.hbs +2
- icon-arrow · 2 lines · used by —
- icon-caret · 2 lines · used by collection.hbs, header, reviews
- nav-links · 8 lines · used by header
- newsletter-form · 9 lines · used by footer, newsletter
- options · 28 lines · used by product
- pack-cards · 46 lines · used by product
- pack-qcard · 21 lines · used by pack-cards
- pay-icons · 14 lines · used by cart-drawer, footer, image-with-text, product
- policy-link · 5 lines · used by footer
- price · 7 lines · used by product
- review-form · 29 lines · used by reviews
- rs-help-faq · 14 lines · used by rs-help
- rs-help · 121 lines · used by page.hbs
- rs-icon-cal · 2 lines · used by rs-member
- rs-icon-chat · 2 lines · used by rs-help
- rs-icon-check · 2 lines · used by index.hbs, rs-start-card
- rs-member-card · 14 lines · used by rs-member
- rs-member-quote · 12 lines · used by rs-member
- rs-member · 136 lines · used by page.hbs
- rs-start-card · 9 lines · used by index.hbs
- rs-testi-card · 14 lines · used by index.hbs
- rs-tile · 8 lines · used by index.hbs
- scripts · 7 lines · used by collection.hbs, index.hbs, page.hbs, product.hbs, search.hbs +2
- social-links · 7 lines · used by —
- stars · 3 lines · used by —
- vars · 30 lines · used by header

## Assets
- base.css 28 KB · linked by head, theme.json
- rs-help.css 6.7 KB · linked by page.hbs, theme.json
- rs-home.css 12 KB · linked by index.hbs, theme.json
- rs-member.css 8.9 KB · linked by page.hbs, theme.json
- rs-pages.css 2.8 KB · linked by page.hbs, theme.json
- rs-product.css 19 KB · linked by product.hbs, theme.hbs, theme.json
- sections.css 61 KB · linked by head, theme.json
- skin.css 8.9 KB · linked by head, theme.json
- core.js: platform core, never edit
- rs.js 9.6 KB · linked by scripts, theme.json
- ui.js 87 KB · linked by scripts, theme.json

## Sources
No build or patch scripts: the theme files are the source.

## Platform hooks
{{{trackingHead}}} head.hbs:29 · {{{trackingBody}}} theme.hbs:8 · #sf-config with configJson checkout.hbs:1551 · #sf-variants-data product-scripts.hbs:3 · #addToCart buy-row.hbs:12 · data-testid="add-to-cart" buy-row.hbs:12 · #CartDrawer-Checkout cart-drawer.hbs:46 · data-testid="checkout-button" cart-drawer.hbs:2

## Notes
<!-- Write what the code does not say (intent, traps, recipes) under "### <part id>", between notes:<id> markers. -->
### theme
<!-- notes:theme -->
<!-- /notes -->
