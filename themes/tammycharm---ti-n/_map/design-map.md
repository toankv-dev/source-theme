# Design map: tammycharm---ti-n
<!-- Written by tools/theme-map.js from the theme's files. Edit only inside the notes blocks at the end; run the tool after every change. -->
Tammycharm Sculpt 2026.11.22.r16 · schema v2 · 9 templates · 45 sections · 28 snippets · 12 CSS · 5 JS
One part in detail: `node tools/theme-map.js themes/tammycharm---ti-n --part <id>` (a section, snippet, template or asset file name, `design`, `sources`).
README.md: Layers — what a child theme may change L18 · Platform contract (keep in every theme) L31 · JavaScript API (`window.Base`, core.js) L54 · Section catalog (product templates) L62 · Pages L96 · Mobile first L103 · Work on it L112

## Design
| setting | value | Theme settings | read by |
|---|---|---|---|
| primary | #78063A | Colors › Primary (buttons, accents) | checkout.hbs, index.hbs, vars.hbs |
| primary_text | #ffffff | Colors › Text on primary | checkout.hbs, vars.hbs |
| accent | #3A0A1E | Colors › Accent | cx-details.hbs, cx-howq.hbs, cx-promise.hbs +4 |
| text_color | #121212 | Colors › Body text | checkout.hbs, image-banner.hbs, vars.hbs |
| page_bg | #ffffff | Colors › Page background | vars.hbs |
| check | #78063A | Colors › Check marks / success | checkout.hbs, vars.hbs |
| badge | #78063A | Colors › Badges | cx-details.hbs, rf-reviews.hbs, vars.hbs |
| sale | #78063A | Colors › Sale price / discount | checkout.hbs, vars.hbs |
| alert | #78063A | Colors › Alerts | vars.hbs |
| lu_star_color | #FFB400 | Colors › Stars | vars.hbs |
| header_bg | #FFFFFF | Colors › Header background | index.hbs, vars.hbs |
| header_text | #121212 | Colors › Header text | vars.hbs |
| footer_bg | #3A0A1E | Colors › Footer background | vars.hbs |
| footer_text | #ffffff | Colors › Footer text | vars.hbs |
| checkout_bg | #f4f4f4 | Colors › Checkout background | checkout.hbs |
| font | Poppins | Typography & shape › Body font (Google Fonts name) | checkout.hbs, vars.hbs |
| font_heading | Poppins | Typography & shape › Heading font (optional) | checkout.hbs, vars.hbs |
| font_weights | 400;500;600;700 | Typography & shape › Google Fonts weights | vars.hbs |
| load_google_fonts | false | Typography & shape › Load the fonts from Google Fonts | vars.hbs |
| radius | 4 | Typography & shape › Corner radius (cards, images) | product.hbs, vars.hbs |
| btn_radius | 2 | Typography & shape › Button corner radius | checkout.hbs, vars.hbs |
| topbar_bg | #78063A | Top bar › Background | vars.hbs |
| topbar_color | #ffffff | Top bar › Text | vars.hbs |
| cart_upsell_bg | #f4f5f7 | Cart drawer & Shipping protection › Background | cart-drawer.hbs |
| cart_upsell_color | #15171c | Cart drawer & Shipping protection › Text | cart-drawer.hbs |
| cart_upsell_accent | — | Cart drawer & Shipping protection › Switch colour | cart-drawer.hbs |
| pf_marq_bg | — | PeakFlex – Home top › Band colour | index.hbs |
| pf_marq_color | — | PeakFlex – Home top › Text colour | index.hbs |
| pf_marq_wave | — | PeakFlex – Home top › Wave colour | index.hbs |
CSS variables: --c-text: #15171c · --c-muted: #5d6270 · --c-line: #e3e5ea · --c-soft: #f4f5f7 · --radius: 12px · --wrap: 1200px · --rf-ink: #3A0A1E · --rf-ink-2: #2A0614 · --rf-olive: #78063A · --rf-olive-2: #5C042C · --rf-khaki: #C98AA6 · --rf-sand: #F8F4F5
Breakpoints: 749px ×52 · 750px ×36 · 990px ×17 · 900px ×14 · 989px ×7 · 899px ×5 · 600px ×4 · 1200px ×3
Every page (theme.json): base.css, sections.css, skin.css, core.js, ui.js, theme.js

## Templates
| template | sections in order |
|---|---|
| checkout.hbs | — |
| collection.hbs | head · header · icon-caret · card-product · footer · scripts |
| index.hbs | head · header · rf-waves · pf-marquee-set · newsletter-form · footer · scripts |
| page.hbs | head · header · contact-form-body · footer · scripts |
| product.hbs | head · header · product · reviews · faq · related · footer · product-scripts · scripts |
| product.json "" | main:product (17 blocks) · details:cx-details (8 blocks) · promise:cx-promise (4 blocks) · zones:cx-zones (6 blocks) · howq:cx-howq (8 blocks) · reels:cx-reels (6 blocks) · reviews · faq:cx-faq (6 blocks) |
| search.hbs | head · header · card-product · footer · scripts |
| theme.hbs (layout) | head · header · footer · product-scripts · scripts |
| tracking-result.hbs | head · header · footer · scripts |

## Sections
| section | lines | blocks | uses | styled in | edited by |
|---|---|---|---|---|---|
| cart-drawer | 58 | — | pay-icons | sections.css, base.css, zz-custom.css | — |
| comparison | 20 | row | — | pf-product.css, base.css, sections.css | — |
| contact-form | 2 | — | contact-form-body | — | — |
| custom-html | 4 | — | — | <style> 0.0 KB | — |
| cx-details | 68 | ba, photos | — | zz-custom.css | — |
| cx-faq | 20 | qa | — | zz-custom.css | — |
| cx-howq | 39 | chip, q | — | zz-custom.css | — |
| cx-promise | 39 | card | — | zz-custom.css | — |
| cx-reels | 50 | clip | — | zz-custom.css | — |
| cx-rvcards | 132 | review | — | <style> 5.2 KB | — |
| cx-zones | 41 | chip, zone, custom_html | — | zz-custom.css | — |
| faq | 19 | qa | faq-list | skin.css, base.css, pf-product.css | — |
| feature-rows | 32 | row | — | base.css, pf-product.css | — |
| footer | 46 | — | social-links, policy-link, newsletter-form, pay-icons | zz-custom.css, sections.css, skin.css | — |
| guarantee | 9 | — | — | base.css, sections.css | — |
| header | 98 | — | vars, pf-fonts, icon-caret, nav-links, cart-drawer | sections.css, skin.css, base.css | — |
| icon-columns | 14 | column | — | sections.css, pf-product.css | — |
| image-banner | 16 | — | — | sections.css, pf-product.css | — |
| image-row | 27 | video, image | — | pf-product.css | — |
| image-with-text | 12 | — | — | pf-product.css, base.css, sections.css | — |
| logo-bar | 23 | logo | — | sections.css | — |
| marquee | 8 | item | — | base.css, sections.css, pf-product.css | — |
| newsletter | 8 | — | newsletter-form | sections.css | — |
| pf-promise | 10 | — | — | pf-product.css | — |
| pf-quotes | 33 | quote | — | pf-product.css, zz-custom.css | — |
| product-scripts | 5 | — | — | — | — |
| product | 366 | pf_rating, pf_social, pf_hsa, pf_comment, rf_proof, rf_stars +32 | lu-tp-stars, pay-icons, rf-desc, rf-sizes, price +6 | rf3.css, pf-product.css | — |
| related | 10 | — | card-product | sections.css, base.css | — |
| reviews | 86 | — | icon-caret, review-form | rf3.css, pf-product.css, sections.css | — |
| rf-anatomy | 21 | point | — | rf3.css, zz-skin.css | — |
| rf-banner | 13 | — | — | rf3.css, zz-skin.css, rf-type.css | — |
| rf-bento | 16 | tile | — | rf3.css, zz-skin.css, rf-type.css | — |
| rf-compare | 23 | row | — | rf3.css, zz-skin.css | — |
| rf-cta | 10 | — | — | rf3.css, zz-skin.css, rf-type.css | — |
| rf-features | 19 | feature | — | rf3.css, zz-skin.css | — |
| rf-guarantee | 20 | — | — | rf3.css, zz-skin.css, rf-type.css | — |
| rf-reviews | 75 | review | — | rf.css, zz-custom.css, rf-type.css | — |
| rf-ticker | 14 | item | rf-waves | rf-motion.css, zz-skin.css | — |
| rf-trust | 21 | benefit | — | rf.css, zz-skin.css, rf-motion.css | — |
| rf-waves | 5 | — | — | — | — |
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
- head · 35 lines · used by collection.hbs, index.hbs, page.hbs, product.hbs, search.hbs +2
- icon-arrow · 2 lines · used by —
- icon-caret · 2 lines · used by collection.hbs, header, reviews
- lu-mbuy · 51 lines · used by product
- lu-tp-stars · 3 lines · used by product
- nav-links · 9 lines · used by header
- newsletter-form · 9 lines · used by footer, index.hbs, newsletter
- options · 28 lines · used by product
- pack-cards · 46 lines · used by product
- pack-qcard · 21 lines · used by pack-cards
- pay-icons · 14 lines · used by cart-drawer, footer, product
- pf-fonts · 3 lines · used by header
- pf-marquee-set · 9 lines · used by index.hbs
- policy-link · 5 lines · used by footer
- price · 7 lines · used by product
- review-form · 29 lines · used by reviews
- rf-desc · 20 lines · used by product
- rf-sizes · 36 lines · used by product
- rf-waves · 9 lines · used by index.hbs, rf-ticker
- scripts · 9 lines · used by collection.hbs, index.hbs, page.hbs, product.hbs, search.hbs +2
- social-links · 7 lines · used by footer
- stars · 3 lines · used by —
- vars · 30 lines · used by header

## Assets
- base.css 24 KB minified · linked by head, theme.json
- pf-home.css 19 KB minified · linked by index.hbs
- pf-product.css 31 KB minified · linked by product.hbs, theme.hbs
- rf-brand.css 1.6 KB minified · linked by head, theme.hbs
- rf-motion.css 3.9 KB minified · linked by head, index.hbs, theme.hbs
- rf-type.css 4.6 KB minified · linked by head, index.hbs, theme.hbs
- rf.css 21 KB minified · linked by theme.hbs
- rf3.css 26 KB minified · linked by theme.hbs
- sections.css 37 KB minified · linked by head, theme.json
- skin.css 6.4 KB minified · linked by head, theme.json
- zz-custom.css 33 KB minified · linked by checkout.hbs, collection.hbs, index.hbs, page.hbs +4
- zz-skin.css 14 KB minified · linked by checkout.hbs, collection.hbs, index.hbs, page.hbs +4
- core.js: platform core, never edit
- rf.js 11 KB minified · linked by theme.hbs
- srv-price.js 4.3 KB minified · linked by scripts
- theme.js 2.7 KB minified · linked by scripts, theme.json
- ui.js 54 KB minified · linked by scripts, theme.json

## Sources
No build or patch scripts: the theme files are the source.

## Platform hooks
{{{trackingHead}}} head.hbs:33 · {{{trackingBody}}} theme.hbs:17 · #sf-config with configJson checkout.hbs:1553 · #sf-variants-data product-scripts.hbs:3 · #addToCart buy-row.hbs:10 · data-testid="add-to-cart" buy-row.hbs:10 · #CartDrawer-Checkout cart-drawer.hbs:46 · data-testid="checkout-button" cart-drawer.hbs:2

## Notes
<!-- Write what the code does not say (intent, traps, recipes) under "### <part id>", between notes:<id> markers. -->
### theme
<!-- notes:theme -->
- ui.js is hand-edited (no `_src/`, not synced by sync-core). Bundle per-unit rows: `function ae(` builds each `.b-unit`; its select `change` handler now also swaps `[data-gallery-main]` + active thumb (`Y(...)`, `Ct(...)`) to that unit's variant image (like hushflex). Find it: `grep -o 'h.addEventListener("change",function(){c\[f\]=h.value.\{0,200\}' assets/js/ui.js`.
- Variant image = `featured_image` in `#sf-variants-data` (core.js maps it to `.image`). The preview's sample product has none, so a test must set `Base.variants.list()[i].featured_image` first.
- Main picker → gallery only after a user click/change outside the gallery (`window.__luGalOk`), so the first image stays on load.
- Preview route from Git Bash: prefix `MSYS_NO_PATHCONV=1`, else `/product` becomes a Windows path.
- Pack / cart prices come from the server (`srv-price.js` → `/api/storefront/cart/price`), so a pack total like 119.91 vs "29.98 × 4" is the discount's setup (percent rounding), not the theme: fix it in Discounts (fixed amount per unit). Cart drawer: after the quote, ui.js puts each line's `lineTotalAfterDiscount` in `.b-line__now` and the pre-discount / compare total in `.b-line__was` (find: `grep -o 'lineTotalAfterDiscount.\{0,200\}' assets/js/ui.js`). Preview has no price API: test by stubbing `Base.cart.quote` then `BaseUI.renderCart()`.
- Live discounts (2026-11-23): bra Duo −4.45/unit min 2 (70.90), Trio −24.87 % min 4 (119.91); leggings −50 % min 2 (49.90), −54.96 % min 4 (89.90) + Buy 2 Get 1 BOGO.
<!-- /notes -->
