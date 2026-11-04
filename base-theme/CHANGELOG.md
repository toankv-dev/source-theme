# Base theme — changelog

Versions follow `YYYY.MM.DD.N`. Each entry names the theme(s) it came from.

## 2026.11.04.2 — from TwinklingTree build
### Added
- Settings `font_weights` (Google Fonts weights to request) and `load_google_fonts` (off when the theme ships
  its own `@font-face`), because requesting weights a font lacks makes Google return no CSS.
- Setting `nav_show_shop` (hide the Shop link in the menu).
- Product section setting `sale_badge_style` (`-50%` or `50% OFF`).
### Fixed
- Product cards could stay hidden after a fast scroll (entrance animation): reveal check now runs on every
  scroll frame.

## 2026.11.04.1 — initial base (Lunara, TwinklingTree, Wayfare)
- Platform core (`core.js`): cart `sf-cart:<domain>` + legacy mirror, live discounts with the checkout formula
  and server quote, ViewContent / AddToCart / InitiateCheckout / Lead / Search, variant matching + `?variant=`,
  reviews GET/POST, contact, tracking links.
- Chrome: top bar (rotate / countdown), header + menu drawer + search, cart drawer with shipping protection,
  footer with newsletter and social links.
- Product section with 20 block types, reviews with write-a-review form, FAQ, testimonials, related, marquee,
  logo bar, image banner, image with text, icon columns, feature rows, spec card, steps, stats, comparison,
  guarantee / rich text, image row, newsletter, contact form, custom HTML.
- Pages: home, collection, search, page (policies / order tracking / contact), tracking result, checkout.
