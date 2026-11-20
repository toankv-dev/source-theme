# Design map: twinklingtree
<!-- Written by tools/theme-map.js from the theme's files. Edit only inside the notes blocks at the end; run the tool after every change. -->
TwinklingTree 2026.11.04.1 · schema v2 · 9 templates · 25 sections · 18 snippets · 3 CSS · 3 JS
One part in detail: `node tools/theme-map.js themes/twinklingtree --part <id>` (a section, snippet, template or asset file name, `design`, `sources`).
README.md: Layers — what a child theme may change L8 · Platform contract (keep in every theme) L21 · JavaScript API (`window.Base`, core.js) L37 · Section catalog (product templates) L45 · Pages L72 · Work on it L79

## Design
| setting | value | Theme settings | read by |
|---|---|---|---|
| primary | #000000 | Colors › Primary (buttons, accents) | checkout.hbs, vars.hbs |
| primary_text | #ffffff | Colors › Text on primary | vars.hbs |
| accent | #f0b323 | Colors › Accent | vars.hbs |
| text_color | #000000 | Colors › Body text | image-banner.hbs, vars.hbs |
| page_bg | #fcf9f4 | Colors › Page background | vars.hbs |
| check | #3f5d4b | Colors › Check marks / success | checkout.hbs, vars.hbs |
| badge | #d11225 | Colors › Badges | vars.hbs |
| sale | #d11225 | Colors › Sale price / discount | checkout.hbs, vars.hbs |
| alert | #d11225 | Colors › Alerts | vars.hbs |
| star | #ffb800 | Colors › Stars | vars.hbs |
| header_bg | #fcf9f4 | Colors › Header background | vars.hbs |
| header_text | #000000 | Colors › Header text | vars.hbs |
| footer_bg | #000000 | Colors › Footer background | vars.hbs |
| footer_text | #ffffff | Colors › Footer text | vars.hbs |
| checkout_bg | #fcf9f4 | Colors › Checkout background | checkout.hbs |
| font | Crimson Text | Typography & shape › Body font (Google Fonts name) | checkout.hbs, vars.hbs |
| font_heading | Crimson Pro | Typography & shape › Heading font (optional) | vars.hbs |
| font_weights | 400;600;700 | Typography & shape › Google Fonts weights | vars.hbs |
| load_google_fonts | false | Typography & shape › Load the fonts from Google Fonts | vars.hbs |
| radius | 8 | Typography & shape › Corner radius (cards, images) | vars.hbs |
| btn_radius | 8 | Typography & shape › Button corner radius | vars.hbs |
| topbar_bg | #8b2b22 | Top bar › Background | vars.hbs |
| topbar_color | #ffffff | Top bar › Text | vars.hbs |
| cart_upsell_bg | #f4f5f7 | Cart › Background | cart-drawer.hbs |
| cart_upsell_color | #15171c | Cart › Text | cart-drawer.hbs |
| cart_upsell_accent | — | Cart › Switch colour | cart-drawer.hbs |
CSS variables: --c-text: #15171c · --c-muted: #5d6270 · --c-line: #e3e5ea · --c-soft: #f4f5f7 · --radius: 12px · --wrap: 1200px · --tt-cream: #fcf9f4 · --tt-card: #fffdf8 · --tt-yellow: #f0b323 · --tt-red: #d11225 · --tt-brick: #8b2b22 · --tt-hero-btn: #90100a
Fonts: Crimson Text 400 · Crimson Pro 200
Breakpoints: 749px ×18 · 900px ×16 · 750px ×11 · 990px ×6 · 989px ×5 · 600px ×4 · 899px ×3 · 420px ×1
Every page (theme.json): base.css, sections.css, skin.css, core.js, ui.js, tt.js

## Templates
| template | sections in order |
|---|---|
| checkout.hbs | — |
| collection.hbs | head · header · card-product · footer · scripts |
| index.hbs | head · header · card-product · footer · scripts |
| page.hbs | head · header · contact-form-body · footer · scripts |
| product.hbs | head · header · product · reviews · faq · related · footer · product-scripts · scripts |
| product.json "Default" | main:product (15 blocks) · reviews |
| search.hbs | head · header · card-product · footer · scripts |
| theme.hbs (layout) | head · header · footer · product-scripts · scripts |
| tracking-result.hbs | head · header · footer · scripts |

## Sections
| section | lines | blocks | uses | styled in | edited by |
|---|---|---|---|---|---|
| cart-drawer | 58 | — | pay-icons | sections.css, base.css | — |
| comparison | 19 | row | — | sections.css, base.css | — |
| contact-form | 2 | — | contact-form-body | — | — |
| custom-html | 4 | — | — | <style> 0.0 KB | — |
| faq | 31 | qa | — | base.css, sections.css | — |
| feature-rows | 17 | row | — | base.css, sections.css | — |
| footer | 53 | — | pay-icons | skin.css | — |
| guarantee | 6 | — | — | — | — |
| header | 97 | — | vars, icon-caret, nav-links, cart-drawer | sections.css, base.css, skin.css | — |
| icon-columns | 14 | column | — | sections.css | — |
| image-banner | 16 | — | — | sections.css | — |
| image-row | 27 | video, image | — | sections.css | — |
| image-with-text | 10 | — | — | sections.css, base.css | — |
| logo-bar | 23 | logo | — | sections.css | — |
| marquee | 8 | item | — | base.css, sections.css | — |
| newsletter | 8 | — | newsletter-form | sections.css | — |
| product-scripts | 5 | — | — | — | — |
| product | 148 | award, rating, title, subtitle, benefit, stock +14 | price, options, pack-cards, buy-row, pay-icons | sections.css, base.css, skin.css | — |
| related | 14 | — | card-product | sections.css, base.css, skin.css | — |
| reviews | 56 | — | review-form | skin.css, sections.css | — |
| rich-text | 7 | — | — | sections.css | — |
| spec-card | 22 | tile | — | base.css, sections.css | — |
| stats | 16 | stat | — | base.css | — |
| steps | 17 | step | — | base.css, sections.css | — |
| testimonials | 19 | — | — | base.css | — |

## Snippets
- buy-row · 14 lines · used by product
- card-product · 15 lines · used by collection.hbs, index.hbs, related, search.hbs
- contact-form-body · 19 lines · used by contact-form, page.hbs
- head · 31 lines · used by collection.hbs, index.hbs, page.hbs, product.hbs, search.hbs +2
- icon-arrow · 2 lines · used by —
- icon-caret · 2 lines · used by header
- nav-links · 8 lines · used by header
- newsletter-form · 9 lines · used by newsletter
- options · 28 lines · used by product
- pack-cards · 42 lines · used by product
- pack-qcard · 16 lines · used by pack-cards
- pay-icons · 14 lines · used by cart-drawer, footer, product
- price · 7 lines · used by product
- review-form · 29 lines · used by reviews
- scripts · 5 lines · used by collection.hbs, index.hbs, page.hbs, product.hbs, search.hbs +2
- social-links · 7 lines · used by —
- stars · 3 lines · used by —
- vars · 30 lines · used by header

## Assets
- base.css 30 KB · linked by head, theme.json
- sections.css 57 KB · linked by head, theme.json
- skin.css 32 KB · linked by head, theme.json
- core.js: platform core, never edit
- tt.js 1.1 KB · linked by scripts, theme.json
- ui.js 72 KB · linked by scripts, theme.json

## Sources
No build or patch scripts: the theme files are the source.

## Platform hooks
{{{trackingHead}}} head.hbs:29 · {{{trackingBody}}} theme.hbs:7 · #sf-config with configJson checkout.hbs:1554 · #sf-variants-data product-scripts.hbs:3 · #addToCart buy-row.hbs:10 · data-testid="add-to-cart" buy-row.hbs:10 · #CartDrawer-Checkout cart-drawer.hbs:46 · data-testid="checkout-button" cart-drawer.hbs:2

## Notes
<!-- Write what the code does not say (intent, traps, recipes) under "### <part id>", between notes:<id> markers. -->
### theme
<!-- notes:theme -->
<!-- /notes -->
