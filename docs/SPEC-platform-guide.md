# Spec: `platform-guide` — admin shopdy làm được gì

Trạng thái: **xong ngày 2026-11-20**. Bản đồ: [SPEC-theme-token-cost.md](SPEC-theme-token-cost.md).

## Mục tiêu
Phiên A: 10 câu hỏi "làm sao để …" (16,4%) và 4 câu "shopdy xử lý thế nào" (6,5%) đều phải dò code. Một tài liệu trả lời
từ đó, mỗi mục có bằng chứng trong code shopdy, và một tool báo mục nào đã cũ.

## Gồm
- `.claude/skills/theme-edit/references/platform-guide.md`: menu admin, theme editor (kéo đổi thứ tự section, thêm /
  nhân bản / xoá, Theme settings, Template, Preview with, bản nháp), chọn template cho sản phẩm, giảm giá (Amount off
  products / order, Buy X Get Y, Free shipping, Tiered next item `qty:percent` + ví dụ tính), Complete the bundle (nhánh
  SHOPDY-127, chưa ở main), review (pending → Products › Customer Reviews › Publish), badge giảm giá (compare-at price,
  đánh dấu "chưa kiểm"), việc chỉ theme làm, việc cần shopdy. Mỗi mục một dòng `Nguồn:` (đường dẫn trong
  shopdy-promax, hoặc `<git ref>:<path>`).
- `node tools/platform-guide-check.js [--shopdy D:\shopdy-promax] [--update]`: sha1 các nguồn so với
  `platform-guide.sources.json`; in mục nào có nguồn đổi / mất (exit 1); `--update` ghi lại sau khi đã kiểm.

## Ranh giới
Chỉ đọc code shopdy, không sửa. Mục không có bằng chứng ghi "chưa kiểm".

## Kiểm thử (`tools/test/platform-guide-check.test.js`)
Ghi nguồn; không đổi → exit 0; đổi một file trong thư mục → đúng mục đó; xoá file → "(missing)".

## Đo
Ghi lần đầu: 9 mục, 10 nguồn. Tiêu chí: câu hỏi loại C ≤ 3 lượt, 0 lần đọc code shopdy (đo bằng cost-meter).
