# Spec: `link-slim` — theme-from-link gọn hơn

Trạng thái: **xong ngày 2026-11-20** (đo ở lần chạy thật tiếp theo). Bản đồ: [SPEC-theme-token-cost.md](SPEC-theme-token-cost.md).

## Mục tiêu
Phiên B (hushflex, 8,3M): lượt đầu đọc ~35k token định hướng (new-theme SKILL + RUNLOG, CLAUDE.md + README, spec / plan
theme trước, git show changelog, git log) rồi 37 grep + 17 cat để hiểu theme có sẵn; so sánh bằng ảnh. Mục tiêu: ≤ 50%
chi phí cho lần chạy tương tự, định hướng ≤ 10k token.

## Đã làm
- `node tools/run-brief.js [themes/<slug>]` (≤ 40 dòng): repo, base, tools; **dòng nào** của new-theme SKILL (Rules,
  Fonts and colours, Speed) và RUNLOG (phần bài học) cần đọc; những gì không đọc; theme có sẵn: design map, trang đã tải,
  media library, preview, script `_src/` (cảnh báo script nằm trong `_work/`), 3 dòng edit-log, bước tiếp theo.
- theme-from-link SKILL: bắt đầu bằng run-brief, chỉ đọc các dòng nó in; không đọc README / git log / spec theme khác;
  mỗi link một phiên, xong zip thì dừng (sửa tiếp bằng `/theme-edit`); theme có sẵn → design map; so từng phần bằng
  `edit-check --ref` (số trước, ảnh ghép khi cần), visual-diff cả trang ở cuối.
- new-theme SKILL (Speed): kiểm tra bằng `edit-check`, không tự bật preview; một phần của bản gốc bằng `section-grab`.
- Từ đợt 1: design map tạo ở bước pack; media-grab cho ảnh / video.

## Chưa làm (để sau)
`download-page.js` chưa có `--headed`: trang bị bot check vẫn xin ảnh chụp như cũ.

## Kiểm thử
`tools/test/run-brief.test.js`: các dòng cần đọc, theme fixture (chưa có map, chưa tải, script trong `_work/`), bước
tiếp theo, theme không tồn tại.
