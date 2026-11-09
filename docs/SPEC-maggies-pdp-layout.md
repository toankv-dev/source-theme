# Spec: Maggies Tanks — trang sản phẩm giống trang mẫu (template "Maggie's product page")

Trạng thái: **người dùng yêu cầu làm ngay (2026-11-08)**; mã Jira gửi sau, chưa commit. Phạm vi: `themes/maggies-tanks`.
Không sửa mã nguồn Shopdy. Quy trình: skill `theme-from-link` (link =
`https://maggies-tanks.com/products/maggies-ribbed-cotton-built-in-bra-tank`, tải về `_work/site/pages/product-maggies`,
bản offline lệch 0 %). Tiếp nối [SPEC-maggies-pdp-bundle-only.md](SPEC-maggies-pdp-bundle-only.md).

## Mục tiêu

Trang sản phẩm `vesnacharm.com/built-in-bra-comfort-shaper-tanks` trông và bán **như trang mẫu**: 8 khối, trên → dưới:

| # | Trang mẫu | Dựng bằng |
|---|---|---|
| 0 | Ảnh (chú thích trên ảnh lớn) + khối mua: nhãn #1, tiêu đề, tên sản phẩm (serif nhỏ), 4 dòng ✓ (có chữ đậm), Size Chart (ô viền), 3 gói "tiers", ADD TO CART, "Ships by Tomorrow / Free Shipping", hộp bảo hành 90 ngày, câu nói founder | section `product` (thêm `style: maggies`, `gallery_caption`) + block MỚI `mt_intro` + `size_chart` + `variant_cards` (tiers) + `buy_buttons` (hide_options) + block MỚI `mt_trust` |
| 1 | Real Women. Real Comfort. Real Relief. (4 thẻ trước/sau) | section MỚI `mt-story` (part `before_after`) |
| 2 | What We Changed | `mt-story` (`changed`) |
| 3 | Your New Morning Routine | `mt-story` (`routine`) |
| 4 | How It Compares | `mt-story` (`compare`) |
| 5 | Your Comfort Comes First | `mt-story` (`comfort`) |
| 6 | Frequently Asked Questions | `mt-story` (`faq`) |
| 7 | This Is The Last Bra Alternative… | `mt-story` (`last`) |

Ngoài phạm vi: ô quà "FREE + ADD" trong gói (không có trong theme), lá cờ quốc gia ở "Free Shipping to VN" (giữ chữ
từ cài đặt), "Select a size" bắt chọn size.

## Thiết kế

- **Một nguồn nội dung với trang chủ.** Khối 1–7 và chữ của `mt_intro` / `mt_trust` đọc **Theme settings → Maggie's –
  Home top / middle / bottom** (`mt_*`, những gì người dùng đã sửa ở trang chủ: bỏ chữ Maggie, video…). Block `mt_intro`
  / `mt_trust` có ô riêng; ô trống → lấy cài đặt trang chủ.
- **Markup không nhân đôi**: 7 khối dưới tách khỏi `templates/index.hbs` thành `snippets/mt-<part>.hbs` (dùng
  `@root.settings`, `@root.assets_url`); `index.hbs` gọi lại các snippet đó (trang chủ phải giữ nguyên từng pixel);
  section `sections/mt-story.hbs` (+ schema: `part`) gọi snippet theo `part`.
- **Ảnh trên trang sản phẩm là ô trống** (luật new-theme): thẻ trước/sau, nhãn #1, ảnh founder không lấy ảnh mẫu của
  theme mà lấy ảnh người bán đã tải (cài đặt `mt_*` hoặc ô của block); chưa có → khung giữ chỗ đúng tỉ lệ. Con dấu
  "90 days" là biểu tượng tin cậy (được phép đi kèm theme). Trang chủ vẫn dùng ảnh mẫu khi trống như cũ.
- **CSS**: luật của 7 khối chuyển từ `mt-home.css` sang `assets/css/mt-story.css` (trang chủ link cả hai, tổng không
  đổi); CSS khối mua kiểu Maggie's cũng ở `mt-story.css`. Trang sản phẩm chỉ tải `mt-story.css` khi template dùng
  `mt_intro` / `mt-story` (thẻ `<link>` trong section) → template khác không nặng thêm. Ngân sách CSS 120 KB.
- **Template mới** `templates/product.maggies.json` ("Maggie's product page"), sinh bằng `_work/build-mt-product.js`;
  gói mặc định = trang mẫu (1 / 3 / 5, "Buy 1 · Buy 2 Get 1 Free · Buy 3 Get 2 Free", phụ đề, "Most Popular", chọn sẵn
  gói 2, `unit_pickers`, `card_style: tiers`, `hide_options`). Template cũ (`product.json`, `product.bundle.json`, và
  "Vesnacharm Tank Bundle" trên server) không đổi.

## Kiểm thử

- `visual-diff.js` với ảnh trang mẫu `_work/site/pages/product-maggies/desktop.png` / `mobile.png` →
  `http://localhost:8091/product?template=maggies` (1440, 390): bố cục, cỡ, khoảng cách; ô ảnh trống được phép khác.
- Trang chủ trước / sau khi tách snippet: ảnh chụp 1440 + 390 trùng (khác ≤ 0,5 %).
- Gói: giá = quote, giỏ trộn màu, bộ chọn ẩn; kịch bản trang chủ cũ 32/32; kịch bản tiers 34/34.
- `smoke.js`, `style-audit.js` (font / màu đúng trang mẫu), `mobile-audit.js` (0 lỗi, không thêm cảnh báo; CSS ≤ 120 KB),
  `pack.js` 0 lỗi; không có ảnh trang sản phẩm trong `assets/images/` hay `templates/product*.json`.
- Thật (sau khi người dùng upload và chọn template cho sản phẩm): vesnacharm.com + báo giá checkout.

## Ranh giới

- Luôn: chỉ trong `themes/maggies-tanks`; giữ hook `data-*` / pixel; viết file bằng Write / Edit, không mở file để ghi
  trước khi nội dung đã dựng xong (sự cố `mt-product.css` lần trước).
- Hỏi trước: upload lên production, commit (chờ Jira), sửa `base-theme`.
- Không bao giờ: sửa `core.js` / checkout / `head.hbs` / `product-scripts.hbs`; chép CSS/HTML của trang gốc; đưa ảnh
  trang sản phẩm vào theme; sửa `sections.css` / `skin.css` đang dở của người dùng.

## Việc cần làm

1. [x] Tách 7 khối của `index.hbs` → `snippets/mt-*.hbs`; trang chủ trùng ảnh trước / sau.
2. [x] `mt-story.css` (chuyển luật 7 khối khỏi `mt-home.css`), link ở `index.hbs`.
3. [x] Section `mt-story` (+ schema).
4. [x] Block `mt_intro`, `mt_trust`, cài đặt section `style` / `gallery_caption` (product.hbs + schema) + CSS.
5. [x] `templates/product.maggies.json` qua `_work/build-mt-product.js`.
6. [x] So với trang mẫu (visual-diff 1440 / 390), sửa đến khi khớp.
7. [x] Kiểm thử đủ bộ, version `2026.11.08.4`, CHANGELOG, `plan.md`, RUNLOG, zip.
