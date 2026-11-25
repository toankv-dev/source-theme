# Platform guide: what the shopdy admin does (answer "làm sao để…" from here, not from shopdy's code)

Each entry: where in the admin → steps → limits. `Nguồn:` = the shopdy-promax files that prove it; run
`node tools/platform-guide-check.js` to see which entries' sources changed since they were checked (then re-check only
those). A theme's own settings and blocks (Kaching packs, top bar text, colours…) are in its design map:
`node tools/theme-map.js themes/<slug> --part design` / `--part <section>`, and its README.

## Admin menu
Dashboard · Analytics · Orders · Products (Product Catalog, Collections, Inventory, Customer Reviews) · Online Stores
(Pages, Themes) · Discounts · Media · Settings (Shipping, Policy, Cookie banner) · Payment Gateway.
Nguồn: apps/web/src/components/app-sidebar.tsx

## Change a page's layout (theme editor)
Online Stores → Themes → open the theme → editor:
- Sections (left): drag the handle ("Drag to reorder") to change the order; "Add section"; a section's menu: Duplicate,
  Remove. A section's blocks are dragged inside it.
- Click a section → its Settings (right). "Theme settings" = the whole theme (colours, fonts, top bar, footer …).
- "Template": which template is edited (product.json, product.<x>.json …). "Preview with": the product shown.
- Changes stay a draft ("Unpublished changes") until published; "Discard draft" drops them.
- Example "put Questions? before You Will Also Love": pick the template → drag the FAQ section above Related → publish.
Nguồn: apps/web/src/features/theme-editor/components/section-outline.tsx, apps/web/src/features/theme-editor/components/section-inspector.tsx

## Theme editor shows only Theme settings (Sections greyed out) — by design
Since SHOPDY-122 (2026-11-21) a product page belongs to its product: Online Stores → Themes → Customize edits only
Theme settings (colours, top bar, cart drawer …); the page in the middle is read-only ("The page shown is this product's
own: its sections are edited from the product"). To change its sections: button "Edit template in product" on the right
(→ Online Stores → Pages → that page → Template), or Products → the product → Template. "Preview with" picks which
product's page opens. Not a theme bug: no theme change brings the Sections tab back.
Nguồn: apps/web/src/features/theme-editor/pages/theme-editor.page.tsx, apps/web/src/features/theme-editor/api/theme-editor.api.ts

## Theme update (zip) on a live store
Online Stores → Themes → the theme → Update (zip). The store's saved settings and every product page stay. TRAP: for
the first minutes the new version's theme.js is served slowly by the origin (12–60 s seen 2026-11-24, vesnacharm):
the first buyers see the page without packs / Add to cart. Right after the update open a product page a few times
(or run a warm-up that fetches theme.js with gzip / br / zstd) until it loads at once; avoid busy hours.
Nguồn: apps/api/src/features/templates/templates.routes.ts, apps/api/src/features/templates/infrastructure/update-theme-from-zip.ts

## A product's template
Products → open the product → tab "Template" → choose the template (e.g. product.triple-zone-bodysuit).
A theme's extra product templates appear only after its zip is uploaded.
Nguồn: apps/web/src/features/products/components/page-template-overview.tsx, apps/web/src/features/products/components/product-editor.tsx, apps/web/src/features/products/components/product-theme-selector-dialog.tsx

## Discounts
Discounts → create. Method: Discount code or Automatic (Automatic needs a Title). Type:
- Amount off products / Amount off order: percent or fixed amount.
  Amount off products + Fixed amount = off EACH unit (bra $4.45, min qty 2 → 2 units −8.90, 3 units −13.35;
  tammycharm 2026-11-23, live /cart/price). A percent rounds the whole line once: 24.87 % of 4 × 39.90 = −39.69 →
  119.91, while the pack shows "$29.98 / item" (119.91 / 4) and 29.98 × 4 = 119.92. A pack meant as "N × $X each" →
  fixed amount (price − X) per unit with min qty N, e.g. 39.90 − 29.98 = 9.92 → 4 = 119.92 exactly.
- Buy X Get Y: buy X, get Y free or discounted (a gift). TRAP: a unit of a product in BOTH lists counts as bought AND
  as the gift: "Buy 1 Get 1 FREE" with the bra in X and Y = every bra free, alone too (pack rows SAVE 100 %, the
  checkout charges $0; vesnacharm 2026-11-23). Gift only with another product → that product alone in X. Same-product
  BOGO → keep it in X and Y with Buy 2 Get 1 (1 = full price, 2 = one free, 4 = two free).
  Packs "BUY 2 GET 1" (3 items, pay 2) + "BUY 3 GET 2" (5 items, pay 3), as hushflex.com: two automatic discounts
  Buy 3 Get 1 FREE + Buy 5 Get 2 FREE, every BOGO product in X and Y of BOTH (one discount per cart: a pair per product
  = a mixed cart gets one product's deal), Eligibility All customers, no usage limit, products linked directly (a
  collection link, a limit or a customer list = themes do not show it). Tier discount off, or 2 units take its price.
- Theme switches "Allow tiered / Buy X Get Y discount" gate the checkout (auto-discount-switches.ts) from Themes →
  Customize (Template.dataJson.settings) + the listing's settings bucket ONLY. A store's own theme settings (Online
  Stores → store → theme, storeValues) do not reach the gate: switching a tier off there hides it on the page while the
  checkout still applies it. Turn it off in Customize (affects every store on that theme), or end the discount.
  A tier discount with "All products" covers every store of the workspace: never end it for one store.
- The checkout applies ONE automatic discount per cart, the biggest (tiers OR Buy X Get Y), never both.
- Turn a discount off: no on / off switch, the list's Status comes from the dates (Active / Scheduled / Expired). Open
  it → tick "Set end date" → End date + End time = now (must be after the start) → Save → Status "Expired". Or tick its
  row in the list → Delete (cannot be undone). Vesnacharm 2026-11-25: ending "5+ items, 40% off each" = 6+ units take a
  Buy X Get Y (6 = $183.96, not $165.56); at 6–8 units Buy 3 Get 1 and Buy 5 Get 2 both free 2 = a tie, either name.
- Same SAVE % packs on another product: give it the same compare-at / price ratio (bodysuit 119.98 / 35.99, bra 99.98 /
  29.99 → 70 / 74 / 75 %) and ADD it to the same tier discount. Never a 2nd tier discount: themes mirror only the
  newest one (nextItemTiers), so the other product's packs would show prices the checkout does not charge.
  In the Discounts list the tier discount = column Type "Next item (progressive)" (Buy X Get Y = "Buy X Get Y (BOGO)");
  two of them live = themes read the newest CREATED automatic one of the workspace, the checkout takes the biggest.
  Variant compare-at for all at once: Variants table → tick the header box → bulk bar "Compare at" → apply → Save.
- Free shipping.
- Tiered next item ("Next-item discount tiers"): the 1st item full price, each extra item discounted by its tier,
  typed `qty:percent`, e.g. `2:10, 3:15, 4:20`.
- Example "2 for $62.99, 3 for $89.98" on a $39.99 item: 2nd item = 62.99 − 39.99 = 23.00 → −42.5 %; 3rd = 89.98 −
  62.99 = 26.99 → −32.5 % → tiers `2:42.5, 3:32.5`. A Kaching-style theme shows what the checkout will charge.
- A unit past the last tier takes the last tier's percent. "4+ at the Buy 3 unit price": add a tier for 4 that makes
  the 4th unit = Buy 3 / 3, e.g. $35.99 with `2:24.98, 3:25.01` → `4:16.67` (4 = $119.97, 5 = $149.96, all SAVE 75 %).
  Percent rounded per unit to the cent, highest price first.
- A tier may be LOWER than the one before (each unit takes the highest tier ≤ its position): "3 = $29.99 each, 4+ =
  $29.93 each" on $35.99 → `2:24.98, 3:25.03, 4:17.34, 5:16.84` (89.97, 119.72, then 29.93 × n). Check the totals
  with the formula above (per unit, rounded to the cent) before giving a tier list.
- Discount "Applies to" specific products = only their units take positions and percents (a protection line stays
  full price); Lunara Vesnacharm's cart follows it since 2026.11.23.3 (`nextItemTierProducts`).
Nguồn: apps/web/src/features/discounts/pages/discount-edit.page.tsx, apps/web/src/features/discounts/pages/discounts.page.tsx, apps/api/src/features/discounts/discount-engine.ts, apps/web/src/features/products/components/variant-options-builder.tsx

## Shipping protection (two ways: use ONE, both = the buyer pays twice)
- Product in the cart drawer (themes with Theme settings › Cart drawer › "Protection product": Lunara, base-theme
  children): Products → add a product "Shipping Protected" (price, picture, short description = the line under its
  name; several prices = variants, the buyer picks one) → Online Stores → Themes → Customize → Theme settings → Cart
  drawer → "Protection product" → "Choose products" → the store domain on the left → tab "On this store" / "All
  products" → tick it → close → Publish. Shows switched ON above the subtotal once the cart holds a real item, added as
  a real cart line (charged as any product; any active variant works, no listing needed). Picks are per domain.
- NEVER pick a product you sell as "Protection product": the theme treats every line of it as protection and empties
  the cart when only protection is left = Add to cart does nothing (vesnacharm 2026-11-23: the bodysuit and the bra
  were picked). Only the protection product itself goes there.
- Checkout add-on: System Settings → Checkout → the layout → order summary → "Shipping protection add-on" (label,
  amount): a fixed fee, once per order, shown on the checkout page only.
- A TIERED_NEXT_ITEM discount on all products also discounts the protection line (cheapest unit, last position):
  limit the discount to the products sold.
Nguồn: apps/web/src/features/theme-editor/components/store-products-setting.tsx, apps/api/src/features/storefront/application/store-product-settings.ts, apps/web/src/features/checkout-layouts/pages/checkout-layout-editor.page.tsx, apps/api/src/features/storefront/application/cart-pricing.ts

## Complete the bundle (sold with another product)
Product editor → "Product sold with this one": the other product, the bundle price, a badge (e.g. Hot Pick), "Show this
bundle on the product page". Only once SHOPDY-127 is on production (it is a branch, not main, as of 2026-11-20).
Nguồn: origin/SHOPDY-items/SHOPDY-127:apps/web/src/features/products/components/companion-bundles-builder.tsx

## Customer reviews
A review sent from the storefront is saved as pending: not shown. Products → Customer Reviews → "Publish this review?"
(or Remove). Photos come with the review.
Nguồn: apps/api/src/features/storefront/storefront.routes.ts, apps/web/src/features/customer-reviews/pages/customer-reviews.page.tsx

## "−xx %" badge, crossed-out price
The theme shows them from the product's compare-at price: set it above the price on the product / variant. (chưa kiểm:
the label of that field in the product editor)

## Only the theme can do it (no admin setting)
New markup, a new block type, animations, phone layout → change the theme (theme-edit flow A).

## Needs shopdy code
Price / cart / checkout logic, storefront API, a new editor setting type, a new discount type → theme-edit flow D
(table "shopdy does / theme does", user approves, Jira key, spec in shopdy-promax).
