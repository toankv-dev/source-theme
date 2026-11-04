# TwinklingTree — Adlux Handlebars theme

Each template is the cut TwinklingTree page (BigCommerce Stencil markup, the original `theme.css` and inline styles). Only the places that carry data are Handlebars. The data contract is the same as `Theme-Sale` / `Theme-Sale-Pro`.

> **Import:** zip this folder's **contents** (not the folder itself) and upload it in the admin.
> **Regenerate:** run `python ../_build/build_tt.py`, which rewrites this whole folder. Hand-written sources are in `_build/src/`; do not edit the output by hand.
> **Preview:** run `node ../_build/render.js` and open http://localhost:8091 (`/`, `/#collection/<handle>`, `/product`, `/pages/track-your-order`, `/pages/contact-us`, `/pages/privacy`, `/checkout`).

## Pages

| Template | Source page | Dynamic parts |
| --- | --- | --- |
| `templates/index.hbs` | Home + Best Sellers | One product grid per collection (6 cards plus **VIEW ALL**). `#collection/<handle>` switches to the Best Sellers layout: banner, Filter & Sort (sort and collection list), grid, **Show More**. |
| `templates/product.hbs` (entry) | Product detail | Gallery (desktop and mobile carousels, thumbnails), title, stars, price, discount tag, variants (`swatches` / `pills` / `dropdown`), quantity, Add to cart, floating mobile Add to cart bar, description, FAQ, reviews (`twinkling-reviews`, shadow DOM) |
| `templates/page.hbs` | Privacy / Refund policy | Policy body (`page.bodyHtml`). The `Order Tracking` and `Contact Us` branches use the TwinklingTree support-app layout, scoped under `.tt-support` (`assets/css/support.css`). |
| `templates/tracking-result.hbs` | — | Order lookup result (Theme-Sale logic) inside the policy layout |
| `templates/checkout.hbs` | Theme-Sale checkout | Crimson Text font, yellow `#efb141` buttons |

## Shared parts

| Partial | What is dynamic |
| --- | --- |
| `sections/header.hbs` | Announcement text, logo (`brand.logo` / `brand.name`), menu (collections, Contact Us, Track Order), social links, search (searches the store's products) |
| `sections/footer.hbs` | Policy links, collections, contact details (`brand.*`), social links, store name |
| `sections/cart-drawer.hbs` | "Your Cart" drawer: the BigCommerce cart-preview markup captured from the live site. Holds items, quantities, volume discount (`discount_tiers_config`), subtotal and Checkout. |
| `snippets/tt-card.hbs` | Product card: image or video, Sale badge, prices, stars and review count |
| `sections/product-scripts.hbs` | `#sf-variants-data`, ViewContent and `?variant=` sync (from Theme-Sale) |

## JavaScript

`assets/js/theme.js` is vanilla JS, written against the original class names, because the original jQuery, Stencil, Flickity and Slick code does not run outside BigCommerce. It handles:

- the mobile menu and search
- the cart, in Theme-Sale's `sf-cart:<domain>` / `sf-cart` format
- the reviews slider and the category view
- the product page: gallery, variants, Add to cart, sticky bar
- reviews: pagination through `config.reviewsUrl`, the write-a-review form and the review viewer
- order tracking and contact (`POST /api/storefront/contact`)
- the newsletter form

## Store design switches (Customizer)

All switches default to **on**:

- **Home:** hero, category tiles, the "What Our Customers Have to Say" slider.
- **Product page:** viewers / stock lines, notes under Add to cart, FAQ, reviews, review summary, floating Add to cart bar.
- **Cart:** notice strip, plant-a-tree line.

The hero and category tiles are static parts of the design: images and texts as cut.
