// edit-check --eval body (an async IIFE): NB's Buy X Get Y offers on the page, pick a pack, add to cart, read the drawer
// and the stored cart. PACK = index of the pack bar (0-based), from window.__PACK or 2.
(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const k = document.querySelector('[data-lu-kaching]');
  const pid = k.dataset.pid;
  const off = JSON.stringify([
    { buy: 3, get: 1, type: 'FREE', value: 0, all: false, x: [pid], y: [pid] },
    { buy: 5, get: 2, type: 'FREE', value: 0, all: false, x: [pid], y: [pid] },
  ]);
  document.querySelectorAll('[data-bxgy]').forEach((e) => e.setAttribute('data-bxgy', off));
  try { localStorage.setItem('sf-bxgy:' + (location.host), off); } catch (e) {}
  k.__luK(k.__luA, k.__luP);
  const bars = [...k.querySelectorAll('.kaching-bundles__bar')];
  const packs = bars.map((b) => [(b.querySelector('[data-lu-price]') || {}).textContent, (b.querySelector('[data-lu-was]') || {}).textContent].join(' / '));
  const P = window.__PACK != null ? window.__PACK : 2;
  bars[Math.min(P, bars.length - 1)].click();
  await wait(300);
  const btn = document.querySelector('[data-lu-atc], button[name="add"], .product-form__submit, [data-ms-add]');
  btn && btn.click();
  await wait(1800);
  const d = document.querySelector('cart-drawer') || document.querySelector('#CartDrawer');
  const q = (s) => ((d && d.querySelector(s)) || {}).textContent;
  const key = Object.keys(localStorage).find((x) => x.startsWith('sf-cart:'));
  const st = key ? JSON.parse(localStorage.getItem(key)) : { items: [] };
  const txt = d ? d.innerText : '';
  return JSON.stringify({
    btn: !!btn,
    packs,
    sub: q('[data-ms-cart-subtotal]'),
    disc: q('[data-lu-disc-amt]'),
    was: q('[data-lu-cart-was]'),
    save: q('[data-ms-cart-savings]'),
    lines: [...(d ? d.querySelectorAll('li[id^="CartDrawer-Item"]') : [])].map((li) => li.innerText.replace(/\s+/g, ' ').slice(0, 110)),
    stored: (st.items || []).map((i) => [i.price, i.packPrice, i.compareAt, i.packQty || i.qty, i.luFree ? 'free' : '']),
    dollar: (txt.match(/\$\s?\d[\d.,]*/g) || []).slice(0, 5),
  });
})()
