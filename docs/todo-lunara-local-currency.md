# Todo: local currency in Lunara Vesnacharm (NB first)

Plan: [plan-lunara-local-currency.md](plan-lunara-local-currency.md). Done 2026-11-26 in one session (the user accepted
the risk), version 2026.11.26.8.

- [x] 1. Test harness: `themes/lunara---vesnacharm/_src/cur-test-build.js <built dir> <out dir> NOK <rate> [--first]`
      (shopdy's real runtime from sf-money-runtime.ts + the sf_cur cookie) and `_src/cur-cart-eval.js` (an
      `edit-check.js --eval` body: NB's Buy X Get Y offers, pack 3 → cart, drawer amounts + the stored cart).
- [x] 2. `_src/patch-cur.js` + `window.LuCur` (gs-head); server prices `data-price-usd`; formatters local; variant change,
      cart sheet, cards, related, upsells, filter label. USD store unchanged (the $59.98 pack-3 case is identical).
- [x] 3. Kaching packs + bar + gift price: per-unit conversion before the tier / Buy X Get Y maths; redraw (`el.__luK`).
- [x] 4. Cart drawer: converted copy in R() (try / finally, the stored cart stays USD), LuDisc fixed values local
      (`LuCur.loc`), redraw (`LuCartR`); Complete the bundle per unit.
- [ ] 5. Shopdy check: switch on for a test store, `POST /api/storefront/cart-totals` with `country: "NO"` = the drawer
      for 1–8 units and mixed colours (not done: needs the switch and a Norway shopper, or local shopdy with rates).
- [x] 6. NB build declares `supportsLocalCurrency` (`_meta.localCurrency`): `dist/lunara-vesnacharm-nb-2026.11.26.8.zip`.
