# Design map: peakflex
<!-- Written by tools/theme-map.js from the theme's files. Edit only inside the notes blocks at the end; run the tool after every change. -->
PeakFlex 2026.11.06.1 · schema v2 · 10 templates · 27 sections · 22 snippets · 5 CSS · 2 JS
One part in detail: `node tools/theme-map.js themes/peakflex --part <id>` (a section, snippet, template or asset file name, `design`, `sources`).
README.md: Layers — what a child theme may change L8 · Platform contract (keep in every theme) L21 · JavaScript API (`window.Base`, core.js) L44 · Section catalog (product templates) L52 · Pages L86 · Mobile first L93 · Work on it L102

## Design
| setting | value | Theme settings | read by |
|---|---|---|---|
| primary | #cf5905 | Colors › Primary (buttons, accents) | checkout.hbs, vars.hbs |
| primary_text | #ffffff | Colors › Text on primary | checkout.hbs, vars.hbs |
| accent | #0b2e59 | Colors › Accent | vars.hbs |
| text_color | #121212 | Colors › Body text | checkout.hbs, image-banner.hbs, vars.hbs |
| page_bg | #ffffff | Colors › Page background | vars.hbs |
| check | #1d4f91 | Colors › Check marks / success | checkout.hbs, vars.hbs |
| badge | #0b2e59 | Colors › Badges | vars.hbs |
| sale | #009600 | Colors › Sale price / discount | checkout.hbs, vars.hbs |
| alert | #cf5905 | Colors › Alerts | vars.hbs |
| star | #ffbe59 | Colors › Stars | vars.hbs |
| header_bg | #ffffff | Colors › Header background | vars.hbs |
| header_text | #121212 | Colors › Header text | vars.hbs |
| footer_bg | #0b2e59 | Colors › Footer background | vars.hbs |
| footer_text | #ffffff | Colors › Footer text | vars.hbs |
| checkout_bg | #f7f7f7 | Colors › Checkout background | checkout.hbs |
| font | Poppins | Typography & shape › Body font (Google Fonts name) | checkout.hbs, vars.hbs |
| font_heading | — | Typography & shape › Heading font (optional) | checkout.hbs, vars.hbs |
| font_weights | 400;500;600;700 | Typography & shape › Google Fonts weights | vars.hbs |
| load_google_fonts | false | Typography & shape › Load the fonts from Google Fonts | vars.hbs |
| radius | 12 | Typography & shape › Corner radius (cards, images) | product.hbs, vars.hbs |
| btn_radius | 8 | Typography & shape › Button corner radius | checkout.hbs, vars.hbs |
| topbar_bg | #0b2e59 | Top bar › Background | vars.hbs |
| topbar_color | #ffffff | Top bar › Text | vars.hbs |
| cart_upsell_bg | #f4f5f7 | Cart › Background | cart-drawer.hbs |
| cart_upsell_color | #15171c | Cart › Text | cart-drawer.hbs |
| cart_upsell_accent | — | Cart › Switch colour | cart-drawer.hbs |
CSS variables: --c-text: #15171c · --c-muted: #5d6270 · --c-line: #e3e5ea · --c-soft: #f4f5f7 · --radius: 12px · --wrap: 1200px · --font: "Poppins", system-ui, -apple-system, "Segoe UI", Arial, sans-serif !important · --font-heading: var(--font) !important · --pf-navy: #0b2e59 · --pf-orange: #cf5905 · --pf-green: #009600 · --pf-muted: rgba(18, 18, 18, 0.75)
Breakpoints: 750px ×28 · 749px ×27 · 900px ×14 · 990px ×10 · 600px ×4 · 989px ×4 · 899px ×3 · 1200px ×3
Every page (theme.json): base.css, sections.css, skin.css, core.js, ui.js

## Templates
| template | sections in order |
|---|---|
| checkout.hbs | — |
| collection.hbs | head · header · icon-caret · card-product · footer · scripts |
| index.hbs | head · header · pf-marquee-set · newsletter-form · footer · scripts |
| page.hbs | head · header · contact-form-body · footer · scripts |
| product.bundle.json "Bundle packs" | main:product (13 blocks) · promises:marquee (4 blocks) · story:image-with-text · benefits:icon-columns (3 blocks) · testimonials · faq · reviews · related |
| product.hbs | head · header · product · reviews · faq · related · footer · product-scripts · scripts |
| product.json "Default" | main:product (19 blocks) · story_1:image-with-text · story_2:image-with-text · story_3:image-with-text · story_4:image-with-text · story_5:image-with-text · compare:comparison (7 blocks) · quotes:pf-quotes (3 blocks) · faq (7 blocks) · promise:pf-promise · reviews |
| search.hbs | head · header · card-product · footer · scripts |
| theme.hbs (layout) | head · header · footer · product-scripts · scripts |
| tracking-result.hbs | head · header · footer · scripts |

## Sections
| section | lines | blocks | uses | styled in | edited by |
|---|---|---|---|---|---|
| cart-drawer | 58 | — | pay-icons | sections.css, base.css | — |
| comparison | 20 | row | — | pf-product.css, base.css, sections.css | — |
| contact-form | 2 | — | contact-form-body | — | — |
| custom-html | 4 | — | — | <style> 0.0 KB | — |
| faq | 19 | qa | faq-list | base.css, skin.css, pf-product.css | — |
| feature-rows | 32 | row | — | base.css, pf-product.css | — |
| footer | 41 | — | policy-link, social-links, newsletter-form, pay-icons | sections.css, skin.css, base.css | — |
| guarantee | 9 | — | — | base.css, sections.css | — |
| header | 98 | — | vars, pf-fonts, icon-caret, nav-links, cart-drawer | sections.css, base.css, skin.css | — |
| icon-columns | 14 | column | — | sections.css, pf-product.css | — |
| image-banner | 16 | — | — | sections.css, pf-product.css | — |
| image-row | 27 | video, image | — | pf-product.css | — |
| image-with-text | 12 | — | — | pf-product.css, base.css, sections.css | — |
| logo-bar | 23 | logo | — | sections.css | — |
| marquee | 8 | item | — | base.css, sections.css, pf-product.css | — |
| newsletter | 8 | — | newsletter-form | sections.css | — |
| pf-promise | 10 | — | — | pf-product.css | — |
| pf-quotes | 33 | quote | — | pf-product.css | — |
| product-scripts | 5 | — | — | — | — |
| product | 259 | pf_rating, pf_social, pf_hsa, pf_comment, award, rating +21 | price, options, pack-cards, buy-row, pay-icons +2 | pf-product.css | — |
| related | 10 | — | card-product | sections.css, base.css | — |
| reviews | 75 | — | icon-caret | pf-product.css, sections.css, base.css | — |
| rich-text | 7 | — | — | sections.css | — |
| spec-card | 22 | tile | — | base.css, pf-product.css, sections.css | — |
| stats | 16 | stat | — | base.css | — |
| steps | 17 | step | — | base.css, pf-product.css, sections.css | — |
| testimonials | 19 | — | — | base.css | — |

## Snippets
- buy-row · 14 lines · used by product
- card-product · 20 lines · used by collection.hbs, related, search.hbs
- contact-form-body · 19 lines · used by contact-form, page.hbs
- faq-list · 42 lines · used by faq, product
- faq-qa · 6 lines · used by product
- head · 31 lines · used by collection.hbs, index.hbs, page.hbs, product.hbs, search.hbs +2
- icon-arrow · 2 lines · used by —
- icon-caret · 2 lines · used by collection.hbs, header, reviews
- nav-links · 8 lines · used by header
- newsletter-form · 9 lines · used by footer, index.hbs, newsletter
- options · 28 lines · used by product
- pack-cards · 46 lines · used by product
- pack-qcard · 21 lines · used by pack-cards
- pay-icons · 14 lines · used by cart-drawer, footer, product
- pf-fonts · 4 lines · used by header
- pf-marquee-set · 8 lines · used by index.hbs
- policy-link · 5 lines · used by footer
- price · 7 lines · used by product
- scripts · 6 lines · used by collection.hbs, index.hbs, page.hbs, product.hbs, search.hbs +2
- social-links · 7 lines · used by footer
- stars · 3 lines · used by —
- vars · 30 lines · used by header

## Assets
- base.css 30 KB · linked by head, theme.json
- pf-home.css 22 KB · linked by index.hbs
- pf-product.css 36 KB · linked by product.hbs, theme.hbs
- sections.css 44 KB · linked by head, theme.json
- skin.css 7.0 KB · linked by head, theme.json
- core.js: platform core, never edit
- ui.js 87 KB · linked by scripts, theme.json

## Sources
No build or patch scripts: the theme files are the source.

## Platform hooks
{{{trackingHead}}} head.hbs:29 · {{{trackingBody}}} theme.hbs:10 · #sf-config with configJson checkout.hbs:1551 · #sf-variants-data product-scripts.hbs:3 · #addToCart buy-row.hbs:10 · data-testid="add-to-cart" buy-row.hbs:10 · #CartDrawer-Checkout cart-drawer.hbs:46 · data-testid="checkout-button" cart-drawer.hbs:2

## Notes
<!-- Write what the code does not say (intent, traps, recipes) under "### <part id>", between notes:<id> markers. -->
### theme
<!-- notes:theme -->
<!-- /notes -->
