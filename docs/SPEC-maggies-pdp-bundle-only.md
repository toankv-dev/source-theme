# Spec: Maggies Tanks — trang sản phẩm chỉ bán bundle, giao diện gói giống trang mẫu

Trạng thái: **người dùng đồng ý sửa theme (2026-11-08)**; mã Jira gửi sau, chưa commit.
Phạm vi: `themes/maggies-tanks` trong repo này. Không sửa mã nguồn Shopdy. Tiếp nối
[SPEC-maggies-home-bundle.md](SPEC-maggies-home-bundle.md).

## Mục tiêu

Trang sản phẩm (vd. `vesnacharm.com/built-in-bra-comfort-shaper-tanks`, template "Vesnacharm Tank Bundle") đang
**vừa bán gói vừa bán biến thể**: dưới các gói còn bộ chọn riêng "Side" + "Color". Cần:

1. **Chỉ bán gói** như trang chủ / trang mẫu: không còn bộ chọn riêng; khách chọn Size / Color trong từng hàng của gói.
2. **Giao diện gói giống trang mẫu** maggies-tanks.com (đo trực tiếp trên trang mẫu):
   gói viền 1px `#dddddd`, góc 8px, đệm 15px, **ảnh nhỏ bên trái** (48×60 điện thoại / 60×60 máy tính), không chấm
   radio; gói đang chọn viền `#25745c` + nền xanh 5%; tiêu đề 16px đậm, phụ đề 14px, giá 14px đậm, giá gạch 13px
   `#8a8a8a`; nhãn đen bo tròn (20px); mỗi hàng: **Color (chấm màu) trước, Size sau, cùng một dòng**.

## Vì sao không chỉ tắt cài đặt có sẵn

`Buy buttons → Show the option pickers` = tắt thì **không mua được**: các hàng trong gói đọc tên / giá trị option từ
bộ chọn đó (ui.js `optionNames / optionChoices`). Đã thử trên bản sao theme: không hàng, giá gói trống, nút khoá.

## Thiết kế

- **Ẩn bộ chọn** — `Buy buttons` thêm checkbox `hide_options` (mặc định **tắt** → các sản phẩm / store khác không đổi):
  bộ chọn vẫn render (ui.js cần) nhưng có `hidden` + `data-options-hidden` (`snippets/options.hbs` nhận tham số
  `hidden`). ui.js `initProductForm`: nếu bộ chọn bị ẩn mà gói **không** có hàng từng cái → hiện lại (khách vẫn chọn
  được); nếu có hàng → ẩn luôn ô chọn biến thể của thanh mua dính (`data-sticky-variant`, kiểu "full").
- **Kiểu thẻ mới** — `Pack cards → Card style` thêm giá trị `tiers` ("Maggie's tiers"): class
  `b-cards-block--tiers`; CSS ở `mt-product.css` (trang sản phẩm) và bản giới hạn trong `.mt-product__packs` ở
  `mt-home.css` (trang chủ nhập cùng khối gói). Màu chọn = `pack_color`, trống = màu accent của theme (`--c-accent`).
- Chênh có chủ ý so với trang mẫu: chữ nhãn **12px** (mẫu 10px) và ô chọn **cao 44px** (mẫu 40px) — luật mobile của
  repo (chữ ≥ 12px, ô bấm ≥ 44px).
- Size vẫn **chọn sẵn** như trang chủ (không có "Select a size"); không làm ô quà "FREE + ADD".

## Kiểm thử

Bản sao theme với template bundle bật `hide_options` + `card_style: tiers` trên preview:
bộ chọn có trong DOM nhưng không hiện; gói có hàng từng cái; Add to cart ghi đúng dòng; màu đo được = trang mẫu (viền
`rgb(37,116,92)`, nhãn đen bo 20px, góc 8px); Color đứng trước Size trong hàng; 360 / 390 không cuộn ngang; trang chủ
với kiểu `tiers` cũng đúng. Rồi `smoke.js`, `mobile-audit.js` (không thêm cảnh báo), `pack.js` 0 lỗi; kịch bản trang chủ
cũ vẫn 32/32. Version `2026.11.08.3`.

## Việc cần làm

1. [x] `product.schema.json`: `hide_options` (Buy buttons), `card_style: tiers` (Pack cards).
2. [x] `snippets/options.hbs` + `sections/product.hbs`: tham số `hidden`.
3. [x] `snippets/pack-cards.hbs`: class `b-cards-block--tiers`.
4. [x] `ui.js initProductForm`: hiện lại khi không có hàng; ẩn ô biến thể thanh dính.
5. [x] CSS `tiers`: `mt-product.css` + `mt-home.css` (giới hạn `.mt-product__packs`).
6. [x] Kiểm thử + version + CHANGELOG + zip.

## Kết quả kiểm tra (2026-11-08, máy local)

- Bản sao theme (template bundle: `hide_options` + `tiers` + gói 1/3/5): 34/34 — bộ chọn có trong trang nhưng ẩn, 3 gói
  có giá, 3 hàng mỗi hàng Color trước Size, viền `rgb(37,116,92)` 1px + nền xanh, góc 8px, nhãn đen bo 20px, ảnh 48/60px,
  giỏ trộn màu 2 dòng / 3 cái, không cuộn ngang 390/1440; tắt hàng từng cái → bộ chọn hiện lại và vẫn mua được; template
  mặc định không đổi.
- Trang chủ 32/32 (cả kiểu cũ và `tiers`); `smoke.js` 49/49; `mobile-audit.js` 0 lỗi, 86 cảnh báo (không thêm);
  `pack.js` 0 lỗi.
- Sự cố trong lúc làm: script nối CSS đã làm trống `mt-product.css` (file chưa vào git); đã khôi phục nguyên văn từ
  `dist/maggies-tanks-2026.11.08.2.zip` (24 343 byte, trùng bản .1) rồi nối phần `tiers`; bản sao lưu ở scratchpad.

## Sau khi upload (người dùng làm)

Template "Vesnacharm Tank Bundle": `Buy buttons` → bật "Hide the option pickers…"; `Item` (Pack cards) → Card style
"Maggie's tiers" (+ "Chosen card… colour" để trống hoặc `#25745c`) → Publish.
