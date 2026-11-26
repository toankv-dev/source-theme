# Lunara Black Owear Tien — changelog

Was `themes/lunara-black---owear-a-ti-n` ("Lunara Black" 2026.11.16.4).

## 2026.11.26.7 — A big pack shows as added
### Changed
- A 6 / 9 Pack added to the cart shows as "6 Pack" / "9 Pack", quantity 1 (was "3 Pack" × 2 / × 3). Inside, the line is
  still 2 / 3 × 3 Pack, so the prices and the checkout are unchanged (3 + 6 + 9 Pack = $259.90); + / − on it adds or
  removes a whole 6 / 9 Pack, the cart count counts packs, its sheet opens on that pack with the pack quantity. A
  3 Pack added later stays its own line. Kept when the page reloads. Source: `_src/patch-cart.js` edit 7 (D.luPk) + 9.

## 2026.11.26.6 — Type choice in the cart sheet
### Added
- The cart line's "colour, size ▾" sheet starts with a **Type** row (Theme settings › Product types: Briefs / Boxer),
  then Color, Size, Packs, Quantity. Another type keeps the same colour / size / pack when it sells them (best
  available match, sold-out values crossed out); Confirm moves the line to that product (n of qty units = split off).
  Only for a line of one of the types, not gifts / bundles. Off: Cart drawer › "Type choice in the line's colour /
  size sheet". The cart drawer carries only name / id / url / title of each type; variants come from the product page's
  type data or a fetch of that product's page. Source: `_src/patch-cart.js` edit 8.

## 2026.11.26.5 — Big packs counted as base packs
### Added
- Theme settings › Cart drawer › "Big packs = N × the base pack": Pack option name (`Packs`) + Packs, smallest first
  (`3 Pack, 6 Pack, 9 Pack`). In the cart a 6 Pack line becomes 2 × 3 Pack and a 9 Pack line 3 × 3 Pack (same
  colour / size, merged with a line of that variant), so the tier discount counts every 3-pack. The store charged
  3 + 6 + 9 Pack (one unit each) $226.64, the seller wants $259.90 = 6 × 3 Pack (live cart-totals: 1 / 3 / 6 × 3 Pack =
  59.95 / 129.95 / 259.90). Only while "Allow tiered discount" is on, for that discount's products. Source:
  `_src/patch-cart.js` edit 7 (luSP, run before every cart render).

## 2026.11.26.4 — Pack lines keep their pack, prices add up to the subtotal
### Changed
- A cart line shows the pack it was added with (3 Pack stays 3 Pack whatever the quantity or the other lines): the
  "packs follow the quantity" of 2026.11.26.2 / .3 is removed (user: wrong), with its settings Cart drawer ›
  "Packs in the cart" (cart_pack_option / cart_pack_values) and cart-drawer[data-lu-packs].
- A tier discount ("Tiered next item") is shared over all its lines by their price, not per product: 3 different
  products × 3 Pack = $43.32 + $43.31 + $43.32 = the $129.95 subtotal (was 9 Pack · $129.95 each; before that
  59.95 / 40.00 / 30.00). Other discounts unchanged. Source: `_src/patch-cart.js` step 5 (cleanup) + edit 6.

## 2026.11.26.3 — The cart's pack on every pack line
### Changed
- Every pack line (a "3 Pack" line of a product the tier discount covers: LuTierPids, none = all) shows the pack of ALL
  pack units of the cart and that pack's price: 3 lines of 1 = each "9 Pack · $129.95" (was 3 Pack · $43.32);
  4 units = 9 Pack · $173.27. The subtotal / checkout are unchanged (it was already right). In the sheet the chips
  count the other pack lines (3 / 6 Pack out of reach when the others already make 9), the price = the cart's pack.
  User's wish (2026-11-26) although the lines no longer add up to the subtotal.

## 2026.11.26.2 — Packs follow the quantity in the cart
### Added
- Theme settings › Cart drawer › "Packs in the cart": Pack option name (`Packs`) + Pack values by quantity
  (`3 Pack, 6 Pack, 9 Pack`). A cart line of "3 Pack" shows 3 / 6 / 9 Pack for quantity 1 / 2 / 3+; in its sheet a pack
  chip sets the quantity (3 = 1, 6 = 2, 9 = 3), ± moves the chip, the price shown = that pack's price; Confirm with
  another colour / size changes the whole line. The item stays the "3 Pack" variant: price it with a Tiered next item
  discount (2:33.28, 3:49.96, 4:27.74 …). Empty name = off. Source: `_src/patch-cart.js` step 5.

## 2026.11.26.1 — Cart like tammycharm-tien
### Changed
- Theme renamed: folder `themes/lunara-black---owear-tien`, name "Lunara Black Owear Tien".
- Cart drawer = the lunara---vesnacharm cart (2026.11.25.8), which tammycharm-tien copies: compact lines (title /
  "colour, size ▾" box | quantity / price), the box opens a bottom sheet (picture, price, colour, size, quantity,
  Confirm: the whole line, or n < quantity units split off; the same variant merges), drawer 100 % wide under 750 px,
  protection text on one line (tap to show all), Discounts row above the subtotal, Buy X Get Y free units shown as
  "Free gift" / "N Free gifts" (no price, no stepper; a pack adds its free units as gift lines), line prices = their
  share of what the checkout charges. Colours: the theme's primary (#000000).
- Shipping protection = only a product named so (Shipping / Package … Protection / Insurance): other picks of
  "Protection product" are ignored, and product lists never show a protection product.
- New Theme settings > Cart drawer > "Show the upsell products" (default off): the "Customers also add …" cards.
### Source
- `_src/patch-cart.js` (re-runnable) puts `_src/cart-module.js` into `assets/js/theme.js` and applies
  `_src/cart-edits.json` to `sections/cart-drawer.hbs` / `snippets/gs-head.hbs`.
### Checked
- Local preview 1440 + 360: add, + / −, sheet (whole line, split 1 of 2, merge back), a faked Buy X Get Y (gift lines,
  Discounts row, back to 1), home page; 0 console errors on the product page, no sideways scroll.
