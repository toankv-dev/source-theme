# Plan: local currency (shopdy SHOPDY-12) in Lunara Vesnacharm

Asked 2026-11-26 for the Norwegian store (no-vesnacharm.com): show and charge NOK. Tasks: [todo-lunara-local-currency.md](todo-lunara-local-currency.md).
Code goes in the master `themes/lunara---vesnacharm` (does nothing while a store's switch is off). Only the NB build
declares it, through `_src/i18n/nb.json` `_meta.localCurrency` → `theme.json` `"supportsLocalCurrency": true`
(build-lang.js). The flag ships **only after every task below passes**: with the flag on and the theme unfinished, the page
shows $ while the checkout charges NOK.

## The platform contract (read in shopdy-promax, 2026-11-26)
- `apps/api/src/features/storefront/application/theme-capabilities.ts`: the admin switch opens only when theme.json has
  `"supportsLocalCurrency": true`. `stores/domain/local-currency.ts`: the gateways must also charge the currency.
- Who: the shopper's country currency (`sf_cur` cookie from the presence beat), Norway → NOK. Elsewhere USD.
- `sf-money-runtime.ts` (in `<head>` only when the switch is on): `SFMoney.currency`, `convertUsd(usd)` (the per-unit
  catalog price: converted, then up to .99), `format(local)` (en-US Intl: "NOK 1,289.97", not "kr"), `formatUsd`,
  `apply()`. When the runtime loads, `apply()` sets the textContent of every `[data-price-usd]` (÷ `data-price-div`)
  after DOMContentLoaded and fires `sfmoney:change` once. The first visit waits ≤ 300 ms for the cookie, else stays USD.
- `fx-quote.ts` (checkout): each catalog unit price (selling and compare-at) goes through `localPrice` first; percent /
  tiered / Buy X Get Y discounts are worked out on those local prices; a fixed discount uses the exact rate rounded
  DOWN; shipping and protection use the exact rate rounded UP (not .99); Complete-the-bundle unit = localPrice.
  So the theme must convert **each unit**, then multiply, sum and discount: converting a USD total is wrong by up to
  ~1 NOK per unit.
- Model: `shopdy-promax/apps/api/src/scripts/theme-local-currency-patch.ts` (the same work on SoftMuse: JS_PRELUDE
  `sfS / sfFmt / sfPk / sfCa / sfMark`, rules matched by shape and counted).

## Trap found: prices flow back into the cart
theme.js reads prices with parsers (`B` in the cart / cards / product module, `v` in the Kaching module) and the same
values are saved into the cart (`price:w,compareAt:v` on Add to cart, `bundlePrice`). Converting in the parser would
store NOK as USD: a double conversion on the next read, and a wrong bundle price at the checkout. `v(Y.textContent)`
parses a price the page already shows. **Stored numbers stay USD. Convert only where a number is shown or summed for
display.**

## Where prices are shown (master, 2026-11-26.7)
| Place | File / shape | Kind |
|---|---|---|
| Product price + compare | `snippets/sc-pb-price.hbs` `{{@root.product.price}}`, `compare_at_price` | server → add `data-price-usd="{{usdAmount …}}"` |
| Same, on variant change | theme.js `yt(c)` / `yt(a)` near `.price__regular .price-item--regular` (c, a = `B(e.sellingPrice)`) | unit → convert + mark |
| Product cards (home, collection, search) | theme.js `G(e,n)` → `yt(n.sellingPrice)` / `yt(n.compareAtPrice)` | unit → convert |
| Sticky / mini bar | theme.js `a.textContent=yt(pr)`, `yt(m.compare)` | unit → convert |
| Cards from data `I.price` | theme.js `V=…?I.price:yt(U)` | unit → convert |
| Kaching packs | theme.js module of `M` / `v`: unit `at=v(et.price)`, pack total `ot`, compare `J`, `[data-lu-price]`, `[data-lu-was]`, subtitle `{each}/{total}/{save}` (formatter `Yt`) | units → convert per unit, then the tier / BXGY maths |
| Kaching bar (lu-kaching-bar) | theme.js `j+=w-…` loop, `.kaching-bundles__bar-title` | same |
| Cart drawer lines, savings, subtotal, discount row, was | theme.js module of `yt`: `Lt`, `Ct`, `q`, `C-S.total`, `S.total` (LuDisc from gs-head) | units → convert at the top of the render (a display copy of the lines), keep the stored cart USD |
| Discount engine | `snippets/gs-head.hbs` LuDisc / LuCB (`r2`, `l.price`, fixed `o.value`, labels `"$"+o.value+" off"`) | runs on the display copy; fixed values → exact rate DOWN |
| Upsells in the drawer | `sections/cart-drawer.hbs` `data-price` / `data-compare`; theme.js `Pt(G.price)`, `Pt(G.compare)` | unit → convert |
| Complete the bundle | `assets/js/lu-companion.js` `money()` | unit (bundle price) → convert |
| Related products | `sections/related.hbs` inline `money()` | unit → convert |
| Collection price filter | theme.js facets `"$"+N.toFixed(2)` | label only |
| Free-shipping bar, protection | cart drawer (threshold / price) | exact rate UP |
| Merchant texts with "$79" | Customize / Template texts | user rewrites them (no amount) |

## Approach
1. `_src/patch-cur.js` (run after patch-cart.js, idempotent marker `/*lu-cur*/`, every rule must match its count or the
   file is left untouched): a prelude `window.LuCur = { on(), u(usd) → local unit, f(local) → text, fu(usd), up(usd) /
   down(usd) exact }`, falling back to "$" + toFixed(2) without SFMoney (byte-identical output for USD stores).
2. Display sites only: convert each unit with `LuCur.u` before the maths; formatters `yt / M / Pt / Yt / money()` print
   through `LuCur.f`; unit elements carry `data-price-usd` (kept in step on variant change, as `sfMark`); totals never do.
3. Redraw on `sfmoney:change`: re-render the cart drawer if open, re-run the Kaching refresh, the sticky bar and cards.
4. Flag in the NB build only (build-lang `_meta.localCurrency`).

## How to check
- Preview: a way to load a fake `SFMoney` before theme.js (tools: `edit-check.js --init <file>` or the preview
  server `?sfcur=NOK&rate=…` that pastes shopdy's `sfMoneyScript`) → product page, packs, cart with 1 / 3 / 5 / 6 units,
  gifts, upsell, bundle at 360 / 1440: every amount in NOK, no "$".
- Exactness: `POST /api/storefront/cart-totals` with `country: "NO"` on local shopdy (switch on, rate set) → the drawer's
  subtotal / discount / total = the quote for 1, 2, 3, 4, 5, 6, 8 units and mixed colours.
- USD store (switch off): byte-identical prices to 2026.11.26.7 (smoke of the same cases).
