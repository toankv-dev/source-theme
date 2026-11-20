# Design map: maggies-tanks
<!-- Written by tools/theme-map.js from the theme's files. Edit only inside the notes blocks at the end; run the tool after every change. -->
Maggies Tanks 2026.11.10.13 · schema v2 · 12 templates · 26 sections · 45 snippets · 9 CSS · 4 JS
One part in detail: `node tools/theme-map.js themes/maggies-tanks --part <id>` (a section, snippet, template or asset file name, `design`, `sources`).
README.md: Layers — what a child theme may change L8 · Platform contract (keep in every theme) L21 · JavaScript API (`window.Base`, core.js) L44 · Section catalog (product templates) L52 · Pages L86 · Mobile first L93 · Work on it L102

## Design
| setting | value | Theme settings | read by |
|---|---|---|---|
| primary | #3e3e3e | Colors › Primary (buttons, accents) | checkout.hbs, vars.hbs |
| primary_text | #ffffff | Colors › Text on primary | checkout.hbs, vars.hbs |
| accent | #25745c | Colors › Accent | vars.hbs |
| text_color | #3d3d3d | Colors › Body text | checkout.hbs, image-banner.hbs, vars.hbs |
| page_bg | #ffffff | Colors › Page background | vars.hbs |
| check | #16a34a | Colors › Check marks / success | checkout.hbs, vars.hbs |
| badge | #000000 | Colors › Badges | product.hbs, vars.hbs |
| sale | #3d3d3d | Colors › Sale price / discount | checkout.hbs, vars.hbs |
| alert | #e0392b | Colors › Alerts | vars.hbs |
| star | #000000 | Colors › Stars | vars.hbs |
| header_bg | #ffffff | Colors › Header background | vars.hbs |
| header_text | #000000 | Colors › Header text | vars.hbs |
| footer_bg | #14382e | Colors › Footer background | vars.hbs |
| footer_text | #b7c3bd | Colors › Footer text | vars.hbs |
| checkout_bg | #f7f7f7 | Colors › Checkout background | checkout.hbs |
| font | Poppins | Typography & shape › Body font (Google Fonts name) | checkout.hbs, vars.hbs |
| font_heading | Poppins | Typography & shape › Heading font (optional) | checkout.hbs, vars.hbs |
| font_weights | 400;500;600;700;800 | Typography & shape › Google Fonts weights | vars.hbs |
| load_google_fonts | false | Typography & shape › Load the fonts from Google Fonts | vars.hbs |
| radius | 8 | Typography & shape › Corner radius (cards, images) | product.hbs, vars.hbs |
| btn_radius | 4 | Typography & shape › Button corner radius | checkout.hbs, vars.hbs |
| topbar_bg | #1d4533 | Top bar › Background | vars.hbs |
| topbar_color | #ffffff | Top bar › Text | vars.hbs |
| cart_upsell_bg | #f4f5f7 | Cart › Background | cart-drawer.hbs |
| cart_upsell_color | #15171c | Cart › Text | cart-drawer.hbs |
| cart_upsell_accent | — | Cart › Switch colour | cart-drawer.hbs |
CSS variables: --c-text: #15171c · --c-muted: #5d6270 · --c-line: #e3e5ea · --c-soft: #f4f5f7 · --radius: 12px · --wrap: 1200px · --font: "Poppins", Arial, sans-serif !important · --font-heading: "Poppins", Arial, sans-serif !important · --mt-ui: "Poppins", Arial, sans-serif
Breakpoints: 749px ×29 · 900px ×15 · 750px ×12 · 990px ×7 · 899px ×6 · 1199px ×6 · 600px ×4 · 989px ×3
Every page (theme.json): base.css, sections.css, skin.css, core.js, ui.js

## Templates
| template | sections in order |
|---|---|
| checkout.hbs | — |
| collection.hbs | mt-landing-page · head · header · icon-caret · card-product · footer · scripts |
| index.hbs | head · header · mt-simple-home · mt-landing-main · footer · scripts |
| page.hbs | head · header · contact-form-body · footer · scripts |
| product.bundle.json "Bundle packs" | main:product (13 blocks) · promises:marquee (4 blocks) · story:image-with-text · benefits:icon-columns (3 blocks) · testimonials · faq · reviews · related |
| product.hbs | head · header · product · reviews · faq · related · footer · product-scripts · scripts |
| product.json "Product" | main:product (13 blocks) · faq · reviews · related |
| product.landing.json "Maggie's landing (ad page)" | hero:mt-story · ticker:mt-story · ba:mt-story · iwt:mt-story · why:mt-story · list:mt-story · main:product (5 blocks) · vr:mt-story · changed:mt-story · routine:mt-story · compare:mt-story · comfort:mt-story · faq:mt-story · last:mt-story |
| product.maggies.json "Maggie's product page" | main:product (5 blocks) · ba:mt-story · changed:mt-story · routine:mt-story · compare:mt-story · comfort:mt-story · faq:mt-story · last:mt-story |
| search.hbs | head · header · card-product · footer · scripts |
| theme.hbs (layout) | head · header · footer · product-scripts · scripts |
| tracking-result.hbs | head · header · footer · scripts |

## Sections
| section | lines | blocks | uses | styled in | edited by |
|---|---|---|---|---|---|
| cart-drawer | 58 | — | pay-icons | sections.css, base.css | — |
| comparison | 20 | row | — | mt-product.css, base.css, sections.css | — |
| contact-form | 2 | — | contact-form-body | — | — |
| custom-html | 4 | — | — | <style> 0.0 KB | — |
| faq | 19 | qa | faq-list | base.css, mt-home.css, mt-story.css | — |
| feature-rows | 32 | row | — | base.css, mt-product.css | — |
| footer | 52 | — | policy-link, newsletter-form, social-links, pay-icons | sections.css, base.css, skin.css | — |
| guarantee | 9 | — | — | base.css, sections.css | — |
| header | 108 | — | vars, mt-fonts, icon-caret, nav-links, cart-drawer +1 | sections.css, base.css, skin.css | — |
| icon-columns | 14 | column | — | sections.css, mt-product.css | — |
| image-banner | 16 | — | — | sections.css, mt-product.css | — |
| image-row | 27 | video, image | — | mt-product.css | — |
| image-with-text | 12 | — | — | mt-product.css, base.css, sections.css | — |
| logo-bar | 23 | logo | — | sections.css | — |
| marquee | 8 | item | — | base.css, sections.css, skin.css | — |
| mt-story | 24 | — | mt-hero, mt-ticker, mt-iwt, mt-why, mt-list +9 | — | — |
| newsletter | 8 | — | newsletter-form | sections.css | — |
| product-scripts | 5 | — | — | — | — |
| product | 261 | award, mt_intro, mt_trust, rating, title, subtitle +19 | mt-founder, price, options, pack-cards, buy-row +8 | mt-home.css, mt-story.css, mt-product.css | — |
| related | 10 | — | card-product | sections.css, base.css, mt-simple.css | — |
| reviews | 75 | — | icon-caret | mt-product.css, sections.css, base.css | — |
| rich-text | 7 | — | — | sections.css | — |
| spec-card | 22 | tile | — | base.css, sections.css, mt-story.css | — |
| stats | 16 | stat | — | base.css | — |
| steps | 17 | step | — | base.css, mt-product.css, sections.css | — |
| testimonials | 19 | — | — | base.css | — |

## Snippets
- buy-row · 14 lines · used by product
- card-product · 19 lines · used by collection.hbs, mt-simple-list, related, search.hbs
- contact-form-body · 19 lines · used by contact-form, page.hbs
- faq-list · 42 lines · used by faq, product
- faq-qa · 6 lines · used by product
- head · 31 lines · used by collection.hbs, index.hbs, mt-landing-page, page.hbs, product.hbs +3
- icon-arrow · 2 lines · used by —
- icon-caret · 2 lines · used by collection.hbs, header, reviews
- mt-ba-card · 14 lines · used by mt-ba
- mt-ba · 23 lines · used by mt-landing-main, mt-story
- mt-changed · 19 lines · used by mt-landing-main, mt-story
- mt-comfort · 15 lines · used by mt-landing-main, mt-story
- mt-compare · 11 lines · used by mt-landing-main, mt-story
- mt-faq · 16 lines · used by mt-landing-main, mt-story
- mt-fonts · 5 lines · used by header
- mt-founder · 8 lines · used by product
- mt-hero · 17 lines · used by mt-landing-main, mt-story
- mt-iwt · 39 lines · used by mt-landing-main, mt-story
- mt-landing-main · 132 lines · used by index.hbs, mt-landing-page
- mt-landing-page · 22 lines · used by collection.hbs
- mt-last · 15 lines · used by mt-landing-main, mt-story
- mt-list · 14 lines · used by mt-landing-main, mt-story
- mt-routine · 12 lines · used by mt-landing-main, mt-story
- mt-simple-home · 39 lines · used by index.hbs
- mt-simple-list · 14 lines · used by mt-simple-home
- mt-size-chart · 20 lines · used by mt-landing-main, product
- mt-size-finder · 55 lines · used by mt-landing-main, product
- mt-sticky-go · 5 lines · used by mt-landing-main, product
- mt-ticker · 5 lines · used by mt-landing-main, mt-story
- mt-ticks · 6 lines · used by mt-ba, mt-hero, mt-why
- mt-vr-card · 13 lines · used by mt-vr
- mt-vr · 20 lines · used by mt-landing-main, mt-story
- mt-why · 19 lines · used by mt-landing-main, mt-story
- nav-links · 14 lines · used by header
- newsletter-form · 9 lines · used by footer, newsletter
- options · 30 lines · used by product
- pack-cards · 48 lines · used by product
- pack-qcard · 21 lines · used by pack-cards
- pay-icons · 14 lines · used by cart-drawer, footer, product
- policy-link · 5 lines · used by footer, header
- price · 7 lines · used by product
- scripts · 6 lines · used by collection.hbs, index.hbs, mt-landing-page, page.hbs, product.hbs +3
- social-links · 7 lines · used by footer
- stars · 3 lines · used by —
- vars · 30 lines · used by header

## Assets
- base.css 31 KB · linked by head, theme.json
- mt-home.css 33 KB · linked by index.hbs, mt-landing-page
- mt-landing.css 7.4 KB minified · linked by product
- mt-product.css 27 KB · linked by product.hbs, theme.hbs
- mt-simple.css 2.2 KB · linked by index.hbs
- mt-size.css 4.7 KB · linked by mt-size-finder
- mt-story.css 13 KB minified · linked by product
- sections.css 47 KB · linked by head, theme.json
- skin.css 4.6 KB · linked by head, theme.json
- core.js: platform core, never edit
- mt-home.js 4.0 KB · linked by index.hbs, mt-landing-page, mt-story
- theme.js 1.2 KB · linked by —
- ui.js 118 KB · linked by scripts, theme.json

## Sources
No build or patch scripts: the theme files are the source.

## Platform hooks
{{{trackingHead}}} head.hbs:29 · {{{trackingBody}}} theme.hbs:9 · #sf-config with configJson checkout.hbs:1551 · #sf-variants-data product-scripts.hbs:3 · #addToCart buy-row.hbs:10 · data-testid="add-to-cart" buy-row.hbs:10 · #CartDrawer-Checkout cart-drawer.hbs:46 · data-testid="checkout-button" cart-drawer.hbs:2

## Notes
<!-- Write what the code does not say (intent, traps, recipes) under "### <part id>", between notes:<id> markers. -->
### theme
<!-- notes:theme -->
<!-- /notes -->
