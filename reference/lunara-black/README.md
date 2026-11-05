# Lunara (Adlux theme, schema v2)

Clone of lunara-comfort.com (Shopify Shrine PRO 1.2.3), built by `lunnara-theme/_build/build_lu_pdp.py`
(do not edit this folder by hand - edit the build and run it again).

## Editor (Themes > Customize)
- **Product page** = `templates/product.json`: section `product` = gallery + blocks you can drag in the outline (Star rating, Title, Variant picker, Size finder, **Kaching bundle**, Custom HTML, Image / video slider (snippets/lu-media-slider.hbs, 10 image_picker slots, a video URL becomes a <video> server side), FAQ (snippets/lu-pi-faq.hbs: 8 own Q/A, else listing FAQ, else Theme settings FAQ), Buy buttons, Trust line, Payment icons, Description; a product section with only Kaching / Custom HTML blocks keeps the old fixed order) (gallery, star rating, block **Kaching bundle**,
  block Custom HTML, Add to cart, description), `reviews`, `faq` ("Questions? We've Got Answers"). Template
  `product.simple.json` = no bundle (variant pills + one Add to cart).
- **Kaching bundle** block: heading, up to 4 packs (quantity 0 hides one), title / subtitle / badge / gift line,
  colours. Every item of the selected pack gets its own Color / Size pickers (one cart line per variant).
  Prices = what the Adlux checkout charges: the best of the live automatic discounts the backend sends
  (*Tiered next item* as `nextItemTiers`, *Buy X Get Y* as `bxgyOffers`), same formula and per-item rounding as
  `discount-engine.ts` (snippets/gs-head.hbs `LuDisc`, also used by the cart drawer). No discount = price x quantity.
  The theme sets no prices.
- **Theme settings**: Colors (primary `#000000` drives buttons, menu, top bar, footer, badges, checkout button),
  Top bar (sale text + countdown), Home page (banner, product list, real reviews of random products), Cart drawer,
  Brand contact, FAQ (default questions for every product page without its own FAQ).

## Pages
Home (`templates/index.hbs`, Shop All catalog on `#collection/<handle>`), policies / About us (`page.hbs`, About
layout), Order tracking (ParcelPanel form -> `/pages/tracking/result`), Contact = the platform contact page.

## Hooks kept for pixels
`#addToCart` + `data-testid="add-to-cart"`, `#CartDrawer-Checkout`, checkout `#co-checkout-form` / `#co-pay-btn`,
`#sf-variants-data`, ViewContent script (sections/product-scripts.hbs).
