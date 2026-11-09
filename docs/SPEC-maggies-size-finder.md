# Spec: Maggies Tanks — Size Chart dạng thả xuống + gợi ý size (như maggies-tanks.com)

Trạng thái: **người dùng yêu cầu (2026-11-08)**; mã Jira gửi sau, chưa commit. Phạm vi: `themes/maggies-tanks`.
Không sửa mã nguồn Shopdy. Bản `2026.11.08.7`. Thay nút popup Size Chart của bản .6 (chưa upload). Phần ẩn giá của .6 giữ.

## Mục tiêu

Ô **Size Chart** trên trang chủ (`#mt-product`, trên các gói) và trang sản phẩm (block Size chart): bấm → **mở ngay tại chỗ**
(không popup) → khách chọn **chiều cao** (4'4"–6'4"), nhập **cân nặng** (lb), tuỳ chọn **vòng ngực** (in hoặc cm), bấm
**Show my size** → "Your size is XL", ghi chú, "Choose XL below when you pick your colors." Có "See how to measure"
và "See the full size chart" (bảng + ảnh của người bán).

Cách trang mẫu chạy (đo trên maggies-tanks.com, chỉ để so hành vi — không chép mã): 5'2"/130 → M, 5'4"/165 → XL,
5'6"/200 → 2XL; thêm ngực 43" (hoặc 109 cm) ở 5'4"/165 → 2XL "Sized up for your 43" (109 cm) bust…". Không tự chọn size.

## Thiết kế

- **Dữ liệu = bảng size của người bán** (Theme settings → Maggie's – Home middle → "Size chart & size finder"):
  `mt_sf_table`, mỗi dòng `Size | cân nặng lb | vòng ngực in` (vd. `M | 121-140 | 33-35`); tên size = giá trị option
  Size của sản phẩm. Mặc định là **bảng VÍ DỤ** (S…5XL) — người bán phải thay bằng bảng thật của nhà cung cấp.
- **Thuật toán** (ui.js, của theme): cân nặng quy về người cao 5'5" theo chu vi (`kg × 65 / chiều cao in` — cùng vòng
  người thì nặng tỉ lệ thuận chiều cao); size theo cân = dòng đầu tiên có max ≥ giá trị (vượt bảng → size lớn nhất);
  có ngực → size theo ngực tương tự (> 70 hoặc có "cm" → đổi cm); lấy size **lớn hơn**; ngực làm tăng size → ghi chú
  "Sized up for your {bust} bust…". Thiếu chiều cao / cân nặng → báo lỗi, không đoán.
- **Chữ**: mọi nhãn / ghi chú là cài đặt (tiếng Anh mặc định, viết lại bằng lời của mình), `{size}` / `{bust}` thay khi
  chạy; ảnh hướng dẫn đo + ảnh bảng size (`mt_size_image`) + chữ (`mt_size_text`) trong "See the full size chart".
- **Markup**: `snippets/mt-size-finder.hbs` (+ link `assets/css/mt-size.css` một lần, chỉ trang có ô này). Trang chủ:
  thay nút popup .6 (có bảng → size finder; không bảng mà có ảnh/chữ → popup .6). Block `size_chart`: cài đặt mới
  `mode` = `finder` (mặc định) | `popup`; `label` mặc định rỗng (= cài đặt "Size Chart"). Trống bảng → ẩn trên web
  thật như popup trống.
- **CSS** `mt-size.css` tự viết, số đo theo trang mẫu (ô 56px viền #d8d2c6 bo 12; mở: nền tiêu đề #f3efe8, bóng; nút
  xanh #1f5c3d; ô kết quả #f2f6f3). Chữ 16px trong ô nhập (iPhone không phóng to).

## Kiểm thử

- Preview (bản sao scratchpad): mở/đóng (aria-expanded), 5 ca trên ra đúng size + ghi chú, thiếu cân → lỗi, cm,
  "how to measure", bảng đủ dòng; trang chủ + trang sản phẩm maggies + template mặc định (finder) + `mode: popup`;
  390 / 1440 không cuộn ngang; ảnh chụp so với trang mẫu.
- `smoke.js` 49/49, `home_packs_test.py`, `pdp_tiers_test.py … maggies`, `price_size_test.py` (cập nhật), `mobile-audit`
  (0 lỗi), `pack.js` 0 lỗi.

## Ranh giới

- Luôn: chỉ `themes/maggies-tanks`; viết file bằng Edit / Write; không chép mã / CSS / chữ nguyên văn của trang gốc.
- Hỏi trước: upload production, commit (chờ Jira).
- Không bao giờ: sửa `core.js` / checkout / `head.hbs` / `product-scripts.hbs` / `sections.css` / `skin.css`.

## Việc cần làm

1. [x] Cài đặt `mt_sf_*` (build-mt-settings.js).
2. [x] `snippets/mt-size-finder.hbs`, `assets/css/mt-size.css`, `initSizeFinder` (ui.js).
3. [x] Trang chủ dùng size finder; block `size_chart` có `mode`; template maggies.
4. [x] Kiểm thử, version `.7`, CHANGELOG, zip.
