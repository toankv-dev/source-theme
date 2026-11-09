# Task: ảnh và video của store mẫu vào theme

Spec: [SPEC-theme-from-link-images.md](SPEC-theme-from-link-images.md) · Kế hoạch: [plan-theme-from-link-images.md](plan-theme-from-link-images.md)

## Giai đoạn 1: công cụ

- [x] **1. Hàm thuần `tools/lib/media-pick.js`** (S). Lọc cờ, pixel, cỡ nhỏ; gộp thông tin mọi cỡ; chia nhóm; tên an toàn; đuôi thật; chọn video.
  Kiểm tra: `node --test test/media-pick.test.js`. Files: `tools/lib/media-pick.js`, `tools/test/media-pick.test.js`, `tools/scripts/to-webp.js` (AVIF).
- [x] **2. `download-page.js` ghi `section`, `hidden`, `gallery`** (S). Kiểm tra: test site giả. Files: `tools/download-page.js`, `tools/fixtures/site/*`, `tools/test/download-page.test.js`.
- [x] **3. `tools/media-library.js`** (M). WebP + file gốc + video + `media-map.json` + contact sheet; chạy lại giữ file đã thay. Kiểm tra: `test/media-library.test.js`.
- [x] **4. `media-guard` + `pack.js` thành báo cáo** (S). Không còn lỗi trùng ảnh; in dòng `originals`; ghi `media-to-replace.md`. Kiểm tra: `test/media-guard.test.js`.
- [x] **Checkpoint**: `cd tools && npm test` đạt.

## Giai đoạn 2: base

- [x] **5. `default_image` cho section thường** (M). comparison, feature-rows, icon-columns, image-banner, image-row, image-with-text, logo-bar, spec-card, steps.
- [x] **6. `default_*` cho section product, version, tài liệu** (M). image, size chart, media slider, pack cards; `theme.json`, `CHANGELOG.md`, `README.md`, `.schema` hợp lệ.
- [x] **Checkpoint**: HTML base để trống không đổi; smoke, mobile-audit 0 / 0, `pack.js base-theme`.

## Giai đoạn 3: thử trên Tredvik

- [x] **7. Tải lại và tạo thư viện** (S). `download-page.js --refresh`, `media-library.js --prefix tv`. Kiểm tra: nhóm đúng, 45 ảnh trừ trùng.
- [x] **8. Gắn ô, so sánh, đóng gói** (M). 9 ô + gallery mẫu + logo. Kiểm tra: desktop ≤ 8 % (đạt 1,78 %), mobile ≤ 15 % (**15,09 %, vượt nhẹ**: select 44 px đẩy trang xuống 30 px; căn thẳng thì 0,9–5,1 %), smoke, mobile-audit 0 / 0, style-audit, zip, dòng `originals`.

## Giai đoạn 4: quy tắc

- [x] **9. Skill và tài liệu** (S). `theme-from-link/SKILL.md`, `new-theme/SKILL.md`, `RUNLOG.md`, `CLAUDE.md`, hai spec cũ.
- [x] **Checkpoint cuối**: đủ tiêu chí hoàn thành trong spec; `npm test` đạt; các theme cũ pack như trước.
