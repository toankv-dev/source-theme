# Spec: Maggies Tanks — chọn gói bundle ngay ở trang chủ (`#mt-product`)

Trạng thái: **người dùng yêu cầu làm spec rồi code ngay (2026-11-08)**; mã Jira sẽ gửi sau, nên chưa commit.
Phạm vi: chỉ theme `themes/maggies-tanks` trong repo này. **Không sửa mã nguồn Shopdy** (backend / admin).

## Mục tiêu

Trên trang chủ (vd. `vesnacharm.com`), khối sản phẩm "Say Goodbye To Bras Forever…" (`#mt-product`) hiện dồn
**cả 64 biến thể vào một ô `<select>`** ("S / Black — $39.99"…) và không có gói. Khách phải được chọn **gói bundle**
ngay tại đó, giống trang sản phẩm và trang mẫu maggies-tanks.com:

- các thẻ gói lấy **đúng cấu hình gói của template trang sản phẩm** (vd. "Vesnacharm Tank Bundle": Buy 1 /
  Buy 2 Get 1 Free / Buy 3 Get 2 Free, phụ đề, badge, thẻ chọn sẵn) — sửa gói một chỗ, hai trang cùng đổi;
- gói đang chọn mở **mỗi cái một hàng, có ô Size và ô Color riêng** (khách trộn màu / size trong một gói);
- giá mỗi gói = **giá checkout thật** (server tính theo discount đang chạy);
- Add to cart → giỏ → thanh toán y như trang sản phẩm.

Người dùng: khách mua hàng trên trang chủ (đa số trên điện thoại); người bán chỉnh gói ở theme editor.

## Hiện trạng (đã kiểm tra)

- `templates/index.hbs` `#mt-product` chỉ in tên, ảnh đầu, giá; `ui.js initFeatured()` **tải HTML trang sản phẩm**
  (`data-featured="{{url}}"`), đọc `#sf-config` + `#sf-variants-data` rồi đổ biến thể vào một `<select>`.
- Trang sản phẩm đó đã có sẵn: khối gói `[data-cards-block]` (cấu hình `[data-cards-settings]`, các thẻ
  `[data-qcard]` render sẵn), nhóm lựa chọn `[data-opt]` (tên + giá trị + màu swatch), `#b-offers`.
- Trang chủ **không có dữ liệu discount** (`#b-offers` = null) và **không có** `#sf-variants-data`.
- `core.js` (không được sửa) đọc biến thể / discount **một lần lúc tải trang** → `Base.variants`, `Base.discount.pack`
  trên trang chủ không biết sản phẩm. Vì vậy giá gói ở trang chủ lấy từ **`POST /api/storefront/cart/price`**
  (đúng quy tắc README: theme không tự đặt giá; server là nguồn đúng).

## Thiết kế

### Markup — `templates/index.hbs` (`#mt-product`)

- Thêm `data-featured-packs="{{#if (eq @root.settings.mt_prod_packs false)}}0{{else}}1{{/if}}"` vào khối
  `[data-featured]`.
- Thêm hai chỗ trống (JS điền) ngay trên ô "Option" cũ:
  - `<div class="mt-product__packs" data-featured-pack-box hidden></div>` — khối gói nhập từ trang sản phẩm;
  - `<div class="mt-product__opts" data-featured-opts hidden></div>` — ô Size / Color riêng khi không có gói.
- Giữ nguyên ô `[data-featured-variant]` (select cũ) và `[data-featured-qty]` làm đường lui cuối cùng.

### JS — `assets/js/ui.js`, mở rộng `initFeatured()` (không đổi các hook `data-*` sẵn có)

Sau khi tải HTML trang sản phẩm (`doc`):

1. **Dữ liệu**: `pcfg` (`#sf-config`), `pvars` (`#sf-variants-data`: id, option_values, price, compare_at_price,
   featured_image, available), nhóm lựa chọn từ `doc` `[data-opt]` (tên = `legend`, giá trị + nhãn hiển thị + màu
   swatch), gói từ `doc` `[data-cards-block]`.
2. **Tìm biến thể** cục bộ theo giá trị (không phân biệt hoa thường, thử đúng thứ tự rồi bỏ qua thứ tự — như core.js).
3. **Chế độ gói** khi: `data-featured-packs` ≠ `0`, khối gói có thẻ `[data-qcard]` và chế độ của khối là
   `quantity` (hoặc `auto` mà sản phẩm không có option tên Pack / Bundle / Set…). Khi đó:
   - nhập nguyên khối `[data-cards-block]` (`document.importNode`) vào `[data-featured-pack-box]`, hiện
     `[data-qcards]`, ẩn các nhóm thẻ-option; giữ class `.b-cards-block--radio` + biến `--b-pack` → cùng giao diện;
   - phụ đề / badge / "What's included" lấy từ settings của khối (`card_N_sub`, `card_N_badge`, `card_N_includes`,
     `includes_all`) như trang sản phẩm; ô quà tặng ẩn (trang chủ không có dữ liệu quà);
   - **hàng từng cái**: khi `unit_pickers` bật và sản phẩm có option → gói đang chọn có N hàng (tối đa 12), mỗi hàng
     ảnh + một `<select>` cho mỗi option (chấm màu cho option Color), cùng class `.b-unit*` như trang sản phẩm.
     Mặc định mọi hàng = biến thể còn hàng đầu tiên. Khi `unit_pickers` tắt → hiện `[data-featured-opts]`
     (một bộ Size / Color) và gói = N × biến thể đó;
   - ẩn `[data-featured-variant]` và `[data-featured-qty]`.
4. **Giá**: mỗi thẻ gói gọi `Base.postJson('/api/storefront/cart/price', { domain, handle, protection:false,
   items })` với `items` = các dòng của gói (thẻ chưa chọn: N × biến thể mặc định; thẻ đang chọn: gộp theo biến
   thể của từng hàng). Hiển thị `total = subtotal − discount`; giá gạch = `max(compare, price) × N` (chỉ hiển thị,
   như trang sản phẩm); "$x / Item" khi có `unit_label`. Lưu cache theo dòng; đổi hàng → hỏi lại (chờ 200 ms).
   Trong lúc chờ: "…"; lỗi mạng: hiện `price × N` không gạch (checkout vẫn là nơi tính đúng).
   Giá to ở đầu khối (`[data-featured-price]` / `[data-featured-compare]`) = giá gói đang chọn.
5. **Ảnh**: đổi hàng đầu tiên (hoặc bộ Size / Color) → ảnh lớn chuyển sang ảnh biến thể đó.
6. **Add to cart**: `Base.cart.add(lines, { mode: 'cart', value: giá gói })`, mỗi dòng = một biến thể khác nhau
   (`variantId, variant, opts, qty, price, comparePrice, title, handle, productId, url, image`) — đúng dạng dòng
   trang sản phẩm + các trường trang chủ đang gửi. Nút bị khoá khi còn hàng nào không khớp biến thể nào.
7. **Không có gói** (template không có gói, hoặc tắt cài đặt): thay ô select 64 dòng bằng **ô riêng cho từng
   option** + ô số lượng như cũ. Sản phẩm không có option → giữ nguyên hành vi cũ.

### Cài đặt — Theme settings → "Maggie's – Home middle" → Product

- Checkbox mới `mt_prod_packs` — "Show the product's pack cards (set on its product page template)", mặc định **bật**.
  Sinh bằng `_work/build-mt-settings.js` (không sửa tay JSON).

### CSS — `assets/css/mt-home.css`

Khoảng cách / bề rộng của `.mt-product__packs`, `.mt-product__opts` trong cột thông tin; thẻ gói và hàng từng cái
dùng lại CSS `.b-cards*`, `.b-unit*` sẵn có. Không đụng `sections.css` / `skin.css` (đang có thay đổi chưa commit).

## Lệnh

```
cd tools && npm install                                   # một lần
node tools/preview-server.js themes/maggies-tanks         # http://localhost:8090
node tools/smoke.js                                       # chạy với preview đang mở
node tools/mobile-audit.js                                # 360 / 390: 0 lỗi, 0 cảnh báo
node tools/pack.js themes/maggies-tanks                   # 0 lỗi → dist/maggies-tanks-<version>.zip
cd tools && npm test                                      # test của tools
node themes/maggies-tanks/_work/build-mt-settings.js      # sinh lại settings
```

## Cấu trúc dự án (phần đụng tới)

```
themes/maggies-tanks/
  templates/index.hbs            khối #mt-product
  assets/js/ui.js                initFeatured() + hàm phụ cho gói trang chủ
  assets/css/mt-home.css         bố cục khối gói / ô option ở trang chủ
  _work/build-mt-settings.js     thêm mt_prod_packs → config/settings_schema.json + settings_data.json
  theme.json, CHANGELOG.md       tăng version, ghi thay đổi
```

## Code style

Giữ đúng phong cách `ui.js`: ES5 trong IIFE, `'use strict'`, hàm `$ / $$ / el`, tìm phần tử bằng `data-*`
(không bằng class), không thư viện ngoài. Ví dụ:

```js
function featuredQuote(lines) {
  var items = lines.map(function (l) { return { variantId: l.variantId, qty: l.qty }; });
  return Base.postJson('/api/storefront/cart/price', { domain: cfg.domain, handle: pcfg.handle, protection: false, items: items })
    .then(function (r) { var q = r.ok && r.data && r.data.data; return q ? Base.round2(num(q.subtotal) - num(q.discount)) : null; })
    .catch(function () { return null; });
}
```

## Kiểm thử

- **Preview cục bộ** (giá do preview-server giả lập theo `nextItemTiers: '2:10, 3:15'`): Playwright mở `/` với trang
  sản phẩm trỏ tới `/product?template=bundle`; kiểm tra: thẻ gói hiện, giá mỗi thẻ = giá quote của preview, gói đang
  chọn có N hàng với ô Size + Color, đổi màu đổi ảnh, Add to cart ghi đúng dòng vào `localStorage["sf-cart:…"]`
  (tổng số lượng = N, gộp theo biến thể), drawer mở; chụp 360 / 390 / 1440.
- **Đường lui**: `mt_prod_packs` = false và template không có gói → ô Size / Color riêng + ô số lượng.
- **Không hỏng trang sản phẩm**: `node tools/smoke.js` qua hết.
- **Mobile**: `node tools/mobile-audit.js` 0 lỗi, 0 cảnh báo (bấm ≥ 44 px, ô nhập 16 px, không cuộn ngang).
- **Đóng gói**: `node tools/pack.js themes/maggies-tanks` 0 lỗi; JS ≤ 150 KB.
- **Thật (sau khi upload, cần người dùng đồng ý)**: vesnacharm.com trang chủ: Buy 1 = $39.99, Buy 2 Get 1 Free (3 cái)
  = $79.98, Buy 3 Get 2 Free (5 cái) = $119.97; thêm vào giỏ → báo giá checkout ra đúng số đó.

## Ranh giới

- **Luôn**: chỉ sửa trong `themes/maggies-tanks`; giữ mọi hook `data-*` / pixel (`data-testid="add-to-cart"`);
  chạy smoke + mobile-audit + pack trước khi giao zip; mobile 360 px trước.
- **Hỏi trước**: upload zip lên production (Update theme), commit / tạo branch (chờ mã Jira), sửa `base-theme`.
- **Không bao giờ**: sửa `core.js`, checkout, `snippets/head.hbs`, `sections/product-scripts.hbs`; tự đặt giá trong
  theme; sửa `sections.css` / `skin.css` đang dở của người dùng; sửa mã nguồn Shopdy.

## Tiêu chí hoàn thành

1. Trang chủ hiện các thẻ gói giống template trang sản phẩm (tiêu đề, phụ đề, badge, thẻ chọn sẵn).
2. Giá mỗi gói ở trang chủ = báo giá checkout cho đúng các dòng đó.
3. Gói đang chọn có N hàng, mỗi hàng ô Size + ô Color riêng; không còn ô select gộp 64 dòng.
4. Add to cart → giỏ có các dòng gộp theo biến thể, tổng số lượng = N; checkout tính đúng giá gói.
5. Tắt `mt_prod_packs` / template không có gói → ô option riêng + số lượng, vẫn mua được.
6. smoke.js qua hết; mobile-audit 0 lỗi 0 cảnh báo; pack.js 0 lỗi.

## Kế hoạch & việc cần làm

1. [x] Cài đặt `mt_prod_packs` (build-mt-settings.js → chạy → xem git diff chỉ thêm khoá mới).
   Kiểm: `git diff config/`.
2. [x] Markup `index.hbs` (thuộc tính + hai chỗ trống). Kiểm: preview `/` render không lỗi.
3. [x] JS: dữ liệu + tìm biến thể + ô option riêng (đường lui). Kiểm: preview với template mặc định.
4. [x] JS: nhập khối gói, chọn thẻ, hàng từng cái, ảnh. Kiểm: preview với `?template=bundle`.
5. [x] JS: giá qua quote + cache + giá đầu khối. Kiểm: số trên thẻ = quote của preview.
6. [x] JS: Add to cart nhiều dòng. Kiểm: localStorage + drawer.
7. [x] CSS mt-home.css. Kiểm: ảnh 360 / 390 / 1440.
8. [x] smoke + mobile-audit + pack; version + CHANGELOG. Giao zip trong `dist/`.

## Kết quả kiểm tra (2026-11-08, máy local)

- Kịch bản riêng (Playwright, preview :8097 và bản zip đã đóng gói :8099): 32/32 qua — giá mỗi thẻ = quote, gói trộn
  màu = quote của các dòng, giỏ gộp theo biến thể, đổi màu đổi ảnh, đường lui ô option riêng, tắt cài đặt, 360/390 không
  cuộn ngang.
- `smoke.js` 49/49; `mobile-audit.js` 0 lỗi, 86 cảnh báo (bằng đúng bản đang chạy trên server, không thêm cảnh báo mới);
  `pack.js` 0 lỗi 0 cảnh báo → `dist/maggies-tanks-2026.11.08.2.zip`.
- Chưa làm: kiểm tra trên vesnacharm.com (cần upload), commit (chờ mã Jira).

## Câu hỏi mở

1. Theme Maggies Tanks dùng chung với **anhchangdeptrai.shop**: trang chủ store đó cũng hiện gói nếu sản phẩm đầu tiên
   của nó dùng template có gói (cài đặt `mt_prod_packs` cũng dùng chung). Chấp nhận?
2. Mua đúng 2 cái đang được discount "Next item progressive" ($75.98) — xử lý riêng, ngoài spec này.
3. Ai upload zip lên production (Themes → Maggies Tanks → Update theme (.zip)) — bạn hay tôi (khi bạn đồng ý)?
