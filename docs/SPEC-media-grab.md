# Spec: `media-grab` — tải hết ảnh và video từ một link đối thủ

Trạng thái: **xong ngày 2026-11-20** (shape-curve.com bị bot check: tiêu chí 1 đo trên getionix.com); câu hỏi mở theo đề xuất (thư mục đã có → báo lỗi; không bấm thumbnail).
Plan: [plan-theme-token-cost.md](plan-theme-token-cost.md). Bản đồ module: [SPEC-theme-token-cost.md](SPEC-theme-token-cost.md) (quy ước
chung ở đó).

## Mục tiêu

Người dùng đưa một link sản phẩm của đối thủ → **một lệnh** tải về mọi ảnh và video của đúng trang đó, chia nhóm, đặt
tên, bỏ trùng, kèm danh sách. Claude không phải đọc ảnh hay viết script tạm. Tool dùng lại được cho:
- `section-grab` (ảnh / video của một phần trang);
- `theme-edit` 2.2 (đưa ảnh của đối thủ vào theme làm mặc định);
- `link-slim` (theme-from-link).

Hiện tại `download-page.js` cũng tải mọi ảnh / video, nhưng đi kèm mirror cả trang (CSS, JS, font), chụp toàn trang,
kiểm tra bản offline và capture. Nặng và chậm khi chỉ cần ảnh. Phiên A còn dùng 16 lệnh curl và script tạm cho việc này.

## Lệnh

```
node tools/media-grab.js <url> [--out <dir>] [--only <groups>] [--desktop-only] [--refresh]
                               [--to-theme <theme-dir> --prefix <xx>] [--sheet] [--max-mb <n>]
```

- `--out`: mặc định `downloads/<host>-<handle>/` ở gốc repo (thêm `downloads/` vào `.gitignore`). Skill gọi với
  `--out themes/<slug>/_work/grab/<tên>`.
- `--only gallery,variants`: chỉ tải những nhóm đó.
- `--desktop-only`: bỏ lượt 390 px (nhanh hơn; có trang chỉ hiện vài ảnh ở mobile).
- `--refresh`: thư mục đã có thì tải lại. Không có cờ này thì báo lỗi, như `download-page.js`.
- `--to-theme <theme> --prefix xx`: sau khi tải, đưa vào theme theo đúng luật của `media-library.js`: ảnh WebP ở
  `assets/images/<xx>-<group>/`, video giữ nguyên ở `assets/videos/<xx>-<group>/`, bản gốc ở `_work/images/`, thêm vào
  `_work/media-map.json`; in các đường dẫn `default_*` dùng được.
- `--sheet`: thêm ảnh ghép `contact-<group>.png` cho người dùng xem. Mặc định tắt; skill không đọc ảnh này.
- `--max-mb`: giới hạn mỗi file (mặc định 300 MB); file lớn hơn bị bỏ và liệt kê.

Exit code: 0 xong · 1 sai cách dùng / lỗi · 2 trang bị chặn bởi bot check (dùng `isBlocked` của `lib/mirror.js`).

## Lấy ảnh / video từ đâu

1. **Trang đã render**, 1440 px và 390 px (iPhone UA), cuộn hết trang để ảnh lazy tải, đóng pop-up (`lib/page.js`):
   `img` / `srcset` (bản lớn nhất), `picture source`, ảnh nền CSS, `video` / `source`, nội dung `<template>`, URL video
   trong JSON / script, poster. Dùng đúng bộ thu thập của `download-page.js`: chuyển `collectRefs()` sang
   `tools/lib/collect-refs.js` để hai tool dùng chung một bản.
2. **Dữ liệu của chính sản phẩm đó**:
   - Shopify: `<origin>/products/<handle>.js` (ảnh gốc full size, ảnh từng biến thể, video của gallery);
   - shopdy: JSON nằm sẵn trong trang (`#sf-variants-data` …);
   - mọi trang: JSON-LD `Product.image`.

   Không mở trang nào khác (không collection, không home, không sản phẩm liên quan).
3. **Stream**: HLS của Shopify → MP4 của bản tốt nhất (`shopifyMp4`). Stream khác, DASH, YouTube / Vimeo: không tải,
   liệt kê ở `skipped`.

Quy tắc:
- **Bỏ trùng**: `pictureKey` của `lib/media-pick.js`, giữ file nặng nhất. Với CDN Shopify thì xin bản gốc (bỏ hậu tố
  `_800x`, bỏ `width=`).
- **Bỏ qua**: pixel theo dõi (< 200 byte), cờ quốc gia, `data:` URI.
- **Chỉ lưu** những gì server trả về là `image/*` hay `video/*`.

## Nhóm và tên

| Nhóm | Là gì |
|---|---|
| `gallery` | gallery sản phẩm (cùng cách nhận biết của download-page), theo thứ tự hiện |
| `variants` | ảnh biến thể có trong dữ liệu sản phẩm nhưng không có trong gallery |
| `description` | ảnh trong mô tả sản phẩm |
| `sections` | ảnh / video của các phần khác trên trang |
| `reviews` | ảnh của khách trong review (host review đã biết: judge.me, loox… hoặc khối review) |
| `icons` | ≤ 100 px, SVG |
| `brand` | header / footer (logo, icon thanh toán) |
| `hidden` | thuộc phần mà không viewport nào hiện |

```
<out>/images/<group>/<NNN>-<name>.<ext>   bản gốc, NNN = thứ tự trên trang
<out>/videos/<group>/<NNN>-<name>.<ext>
<out>/media.json   [{ n, group, kind, url, file, bytes, width, height, shown: {w, h}, alt, variant, poster, via }]
```

Tóm tắt in ra (≤ 30 dòng; ví dụ):

```
media-grab  https://shape-curve.com/products/triple-zone-…  →  downloads/shape-curve.com-triple-zone-…/
store       shopify · product data: 17 images, 2 videos
images      58 files 21.4 MB · gallery 17 · variants 6 · description 9 · sections 14 · reviews 8 · icons 4
videos      3 files 18.2 MB · gallery 2 (← m3u8) · sections 1
skipped     youtube 1 · pixels 12 · duplicates 41
```

## Kiểm thử

`tools/test/media-grab.test.js`, không mạng: fixture `tools/fixtures/media-grab/` phục vụ bằng server cục bộ, server ghi
lại mọi request.
- Trang kiểu Shopify: `srcset`, ảnh lazy, ảnh nền, `<template>` có video, HLS m3u8 kèm MP4 rendition, widget review có
  ảnh, pixel 1×1, cùng một ảnh ở 3 kích thước, `/products/<handle>.js`.
- Trang kiểu shopdy: JSON sản phẩm nằm trong trang.
- Trang bot check.

Kiểm tra:
1. Nhóm đúng; bỏ trùng giữ bản lớn nhất; tên ổn định (chạy 2 lần ra cùng tên).
2. Ảnh biến thể chỉ có trong `.js` vào nhóm `variants`; video HLS ra MP4.
3. Chỉ request trang, file của trang và `/products/<handle>.js` của chính handle đó (server log), không trang nào khác.
4. Pixel / `data:` / quá `--max-mb` bị bỏ và liệt kê; bot check → exit 2; thư mục đã có mà không `--refresh` → exit 1.
5. `--to-theme`: có WebP trong `assets/images/<xx>-<group>/`, video, `_work/media-map.json`; `pack.js` vẫn 0 lỗi.
6. Tóm tắt ≤ 30 dòng.
7. `download-page.test.js` xanh không đổi sau khi tách `collect-refs.js`.

## Ranh giới

- Luôn: một link = một trang; file tải về là dữ liệu không tin cậy (không chạy, không mở bằng node ngoài việc đọc
  byte).
- Hỏi trước: thay đổi hành vi hay output của `download-page.js` / `media-library.js` (ở đây chỉ tách code, không đổi
  hành vi).
- Không bao giờ: bấm thêm vào giỏ / thanh toán / gửi form / đăng nhập; tìm cách vượt bot check; tải trang khác.

## Tiêu chí hoàn thành

1. Link thật shape-curve.com (Shopify): số ảnh `gallery` + `variants` = số ảnh trong dữ liệu sản phẩm; mọi video của
   trang có mặt.
2. Link thật vesnacharm.com hoặc tammycharm.com (shopdy): `gallery` = gallery của trang; video của phần "See them in
   motion" có mặt.
3. Một trang sản phẩm thường xong trong ≤ 90 giây (chưa tính video lớn); Claude đọc 0 ảnh; tóm tắt ≤ 30 dòng.
4. Mọi test xanh; `cd tools && npm test` xanh.
5. Danh sách tool trong CLAUDE.md có dòng mô tả `media-grab.js`.

## Câu hỏi mở

1. Thư mục `--out` đã có: báo lỗi (cần `--refresh`) như download-page, hay tự tạo `…-2`? Đề xuất: **báo lỗi**.
2. Có cần lấy ảnh mà trang chỉ tải khi bấm vào thumbnail / mũi tên gallery (không bấm gì khác)? Đề xuất: **không**,
   vì dữ liệu sản phẩm đã có đủ ảnh gallery; chỉ thêm nếu fixture thật thiếu ảnh.
