# Spec: Maggies Tanks — ẩn giá trên gói ở trang chủ + Size Chart dùng được ở trang chủ và trang sản phẩm

Trạng thái: **người dùng yêu cầu (2026-11-08)**; mã Jira gửi sau, chưa commit. Phạm vi: `themes/maggies-tanks`.
Không sửa mã nguồn Shopdy. Bản `2026.11.08.6`.

## Mục tiêu

1. **Trang chủ `#mt-product`**: dòng giá (`.mt-product__price`) giữa các dòng ✓ và các gói bị bỏ khi gói đang hiện
   (giá đã nằm trên từng gói, như trang mẫu).
2. **Size Chart** bấm được ở **trang chủ** và **trang sản phẩm**, nội dung (ảnh bảng size + chữ) nhập **một lần**.

## Thiết kế

- Cài đặt mới (sinh bằng `_work/build-mt-settings.js`), Theme settings → **Maggie's – Home middle**:
  - Product: `mt_prod_price` (checkbox, mặc định **tắt**) "Show the price above the pack cards".
  - Header "Size chart (home product block + the product page's Size chart block)": `mt_size_label` (mặc định
    "Size Chart"), `mt_size_title` ("Size Chart"), `mt_size_image` (image_picker), `mt_size_text` (richtext).
- **Giá**: khi gói bật (`mt_prod_packs` khác false) và `mt_prod_price` tắt → `<p class="mt-product__price">` render
  `hidden data-featured-price-auto` (không nháy khi JS chạy). ui.js `initFeatured` bỏ `hidden` khi trang **không** vào
  chế độ gói (gói không tải được, sản phẩm không có gói, fetch lỗi) → luôn còn giá để mua.
- **Size Chart**: snippet mới `snippets/mt-size-chart.hbs` (nút + popup), nhận `label/title/image/text` của block; ô
  trống → `mt_size_*`. Dùng ở:
  - trang chủ: dưới dòng giá, trên gói, chỉ khi `mt_size_image` hoặc `mt_size_text` có;
  - block `size_chart` của section product (mọi template): ô ảnh/chữ của block trống → lấy cài đặt; **không có nội
    dung nào** → nút ẩn trên web thật (`hidden`), trong trình chỉnh sửa vẫn hiện kèm lời nhắc tải ảnh.
  - `initSizeChart` chỉ được ẩn thêm (lọc theo option), không bỏ `hidden` của block trống.
- CSS trang chủ: nút kiểu Maggie's (ô 56px, viền #d8d2c6, bo 12, DM Sans 17/700, mũi tên) trong `mt-home.css`, chọn
  `.mt-product .b-sizechart__link` (không lọt vào `mt-story.css`). Popup dùng `.b-modal` / `.b-sizechart__*` sẵn có.

## Kiểm thử

- Bản sao theme ở scratchpad + `preview-server`: (a) gói bật, giá tắt → giá ẩn, gói hiện; (b) `mt_prod_price` bật →
  giá hiện; (c) `mt_prod_packs` tắt → giá hiện; (d) có `mt_size_image` → nút trang chủ mở popup có ảnh, Esc đóng;
  (e) trang sản phẩm maggies: block trống + cài đặt có ảnh → popup có ảnh; không có gì → nút ẩn.
- `smoke.js` 49/49, `home_packs_test.py`, `pdp_tiers_test.py`, `mobile-audit.js` (không thêm cảnh báo), `pack.js` 0 lỗi;
  `mt-story.css` không đổi.

## Ranh giới

- Luôn: chỉ `themes/maggies-tanks`; viết file bằng Edit / Write.
- Hỏi trước: upload production, commit (chờ Jira).
- Không bao giờ: sửa `core.js` / checkout / `head.hbs` / `product-scripts.hbs` / `sections.css` / `skin.css`.

## Việc cần làm

1. [x] `build-mt-settings.js`: `mt_prod_price`, `mt_size_*`; chạy lại.
2. [x] `snippets/mt-size-chart.hbs`; block `size_chart` (product.hbs) dùng snippet + ẩn khi trống; `initSizeChart`.
3. [x] `index.hbs`: giá ẩn có điều kiện + Size Chart; ui.js hiện lại giá ngoài chế độ gói.
4. [x] CSS trang chủ.
5. [x] Kiểm thử, version `2026.11.08.6`, CHANGELOG, zip.
