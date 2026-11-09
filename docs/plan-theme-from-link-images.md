# Kế hoạch: ảnh và video của store mẫu vào theme

Spec: [SPEC-theme-from-link-images.md](SPEC-theme-from-link-images.md) (đã duyệt 2026-11-09) · Task: [todo-theme-from-link-images.md](todo-theme-from-link-images.md)

## Tổng quan

`download-page.js` biết thêm mỗi ảnh thuộc section nào. Tool mới `media-library.js` biến bản tải thành thư viện: WebP và video trong `assets/`, file gốc trong
`_work/images/`, bảng tra `_work/media-map.json`. Base có `default_image` cho mọi ô ảnh. `pack.js` đổi từ chặn sang nhắc ảnh còn phải thay. Tredvik là theme thử.

## Quyết định kỹ thuật

- **Hàm thuần tách riêng** (`tools/lib/media-pick.js`) để test nhanh, không cần trình duyệt. CLI chỉ lo file và gọi Chromium.
- **Gộp theo ảnh, không theo URL**: chọn file nặng nhất, nhưng `rendered`, `section`, `gallery`, `area` gộp từ mọi cỡ. Bản lớn nhất thường là bản `srcset` có
  `rendered` 0×0, nên chỉ nhìn một file sẽ xếp nhầm nhóm.
- **Nhóm xét theo thứ tự**: `reviews` (host) → `hidden` (section ẩn ở mọi viewport) → `brand` (header / footer) → `gallery` → `icons` (hiển thị ≤ 100 px) → `sections`.
- **WebP qua `to-webp.js`** chạy theo lô; lô lỗi thì chạy từng file, file vẫn lỗi thì chép nguyên bản. WebP mới nặng hơn nguồn WebP thì giữ nguồn.
- **Chạy lại an toàn nhờ sha1 trong `media-map.json`**: file trong `assets/` khác sha1 đã ghi nghĩa là bạn đã thay, tool giữ nguyên.
- **`default_image` không có `default` trong schema**, nên `{{{json settings}}}` của pack cards và HTML base không đổi khi để trống.

## Thứ tự

1. Hàm thuần → 2. `download-page.js` ghi section → 3. `media-library.js` → 4. `media-guard` + `pack.js` → *checkpoint: `npm test`* →
5. Base: section thường → 6. Base: section product, version, tài liệu → *checkpoint: smoke, audit, pack base* → 7. Tredvik: tải lại, thư viện → 8. Tredvik: gắn ô, so sánh, pack → 9. Skill và tài liệu →
*checkpoint cuối: tiêu chí hoàn thành của spec*.

## Rủi ro

| Rủi ro | Mức | Cách xử lý |
| --- | --- | --- |
| Tải lại Tredvik dính kiểm tra bot | Trung bình | `--refresh` giữ file cũ của viewport bị chặn; nếu thiếu `section` thì báo trong báo cáo, không vượt kiểm tra bot |
| `default_image` làm đổi HTML base | Thấp | So sánh HTML trước và sau khi sửa |
| Ảnh mặc định làm trang vượt 2 MB hoặc CLS | Trung bình | `mobile-audit` trên Tredvik; lazy dưới màn hình đầu, khung có `aspect-ratio` |
| Zip quá nặng khi có video ẩn | Trung bình | `pack.js` in dung lượng; giới hạn Adlux vẫn là câu hỏi mở |

## Câu hỏi còn mở

Giới hạn upload của Adlux (xem spec).
