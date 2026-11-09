# Kế hoạch triển khai: video trong `theme-from-link`

Spec: [SPEC-theme-from-link-videos.md](SPEC-theme-from-link-videos.md) (đã duyệt 2026-11-09) · Task: [todo-theme-from-link-videos.md](todo-theme-from-link-videos.md)
Kế hoạch trước (skill `theme-from-link`, đã xong cả 11 task) nằm trong lịch sử git (commit `3858b23`).

## Tổng quan

Có hai phần:
- **A. Bước tải lấy đủ mọi video.** Đọc HLS: với Shopify thì đổi sang file MP4, stream khác thì lưu playlist và các đoạn.
  Quét thêm `<template>`, JSON, script inline và link `.mp4`. Phần này nằm ở `mirror.js` và `download-page.js`.
- **B. Theme dùng video gốc làm mặc định.** Gồm: chốt chặn media cho phép video, `pack.js` in tổng dung lượng video, quy
  tắc mới trong hai SKILL.md, và nghiệm thu trên maggies-tanks.

Ba câu hỏi còn mở trong spec dùng phương án mặc định:
1. Thử trên site giả và maggies-tanks.
2. Chưa rõ giới hạn upload của Adlux: ghi là rủi ro, báo dung lượng zip.
3. Stream không phải Shopify chỉ lưu để tham khảo.

## Quyết định kiến trúc

- **Hàm thuần trong `mirror.js`:** `hlsVariants`, `hlsMedia`, `shopifyMp4`, `videoUrlsIn`. Unit test được, và chạy được cả
  trong trang lẫn trong node.
- **Bắt stream ở tầng network:** mọi response có URL `.m3u8`, bất kể loại (media / fetch / xhr), đều vào danh sách stream.
  Cách này bắt được cả video do hls.js phát qua `blob:`, vốn không để lại URL nào trong DOM.
- **Xử lý stream bằng node sau lượt chụp trang:**
  - đọc playlist chính, chọn nhánh bandwidth cao nhất;
  - nhánh có tên kiểu Shopify → `shopifyMp4()` → tải MP4. Đã có file đó thì chỉ ghi `stream` vào bản ghi cũ;
  - nhánh khác → lưu playlist chính + playlist nhánh (đã viết lại link thành local) + mọi đoạn + `EXT-X-MAP`, ghi
    `stream: true`;
  - `EXT-X-KEY`, `EXT-X-BYTERANGE`, `.mpd` → `skipped` kèm lý do.
- **`<template>` là một gốc DOM nữa:** trong `collectRefs` và `snapshot`, nội dung `template.content` được duyệt như shadow
  root, nên link bên trong được tải và viết lại.
- **Quét chữ có giới hạn:** chỉ quét JSON, script inline và `a[href]` của trang. Không quét các file JS đã tải, vì bundle
  chứa rất nhiều URL không liên quan.
- **Theme:**
  - video nằm ở `assets/videos/<prefix>/`;
  - snippet riêng của theme lùi về video mặc định khi ô trống;
  - section base dùng trên trang sản phẩm thì thêm setting `default_video` (chỉ dành cho video);
  - `media-guard` bỏ video khỏi danh sách chặn.

## Danh sách task (chi tiết trong [todo-theme-from-link-videos.md](todo-theme-from-link-videos.md))

### Phase 1: Nền
- [x] Task 1: `mirror.js` — `hlsVariants`, `hlsMedia`, `shopifyMp4`, `videoUrlsIn` + unit test
- [x] Task 2: site giả có đủ loại video (`video.html` + route mới trong `helpers.js`)

### Phase 2: Bước tải
- [x] Task 3: `download-page.js` — bắt `.m3u8` mọi loại response; quét `<template>` / JSON / script / `a[href]`; viết lại link trong `<template>`
- [x] Task 4: `download-page.js` — tải stream (Shopify → MP4, stream khác → các đoạn); `via` / `stream` / `poster` trong `assets.json`; danh sách video trong dòng tóm tắt

### Checkpoint 1
- [x] `cd tools && npm test` pass (test cũ + test video)
- [x] Tải lại trang chủ maggies-tanks (`--refresh --no-capture`): không còn `.m3u8` trong `skipped`, 6 stream được ghi trùng với MP4 1080p, bản offline 0 request ra ngoài / 0 lỗi 404

### Phase 3: Theme
- [x] Task 5: `media-guard.js` cho phép video; `pack.js` in `videos: N file, X MB`
- [x] Task 6: quy tắc video mới trong `new-theme/SKILL.md`, `theme-from-link/SKILL.md`, `SPEC-theme-from-link.md`, RUNLOG
- [x] Task 7: nghiệm thu maggies-tanks — hero + 6 video đánh giá thành mặc định, version mới, đóng gói lại

### Checkpoint 2: Hoàn tất
- [x] Đủ 7 tiêu chí hoàn thành của spec
- [x] Mọi theme cũ pack ra như trước (`--no-zip`)
- [x] Bạn xem lại trước khi commit

## Rủi ro và cách xử lý

| Rủi ro | Mức | Cách xử lý |
| --- | --- | --- |
| Giới hạn upload của Adlux (zip maggies ~80 MB) | Cao | `pack.js` in tổng dung lượng video; báo cáo rõ; nếu upload bị từ chối thì quay lại câu hỏi nén (cần ffmpeg, phải hỏi trước) |
| Chromium của Playwright không giải mã H.264, nên không kiểm tra được "video phát" bằng hình | Trung bình | Kiểm tra `currentSrc` trỏ đúng file trong theme, request trả 200/206, nút phát gọi `play()`; xem bằng tay trên Chrome thật |
| Shopify đổi cách đặt tên file video | Thấp | `shopifyMp4()` trả `null` → stream được lưu theo cách chung (các đoạn) và ghi rõ trong tóm tắt |
| HLS lạ (byte-range, mã hoá, đường dẫn tuyệt đối khác host) | Trung bình | Byte-range / mã hoá → `skipped` kèm lý do; host khác vẫn tải theo URL tuyệt đối |
| Quét JSON / script bắt URL video không thuộc trang (tracking, preload) | Thấp | Chỉ đuôi video; ghi `via` để lọc; theme chỉ dùng video của section đang hiện |
| `themes/maggies-tanks` đang có thay đổi chưa commit từ phiên khác | Trung bình | Đọc file trước khi sửa, chỉ thêm phần video, không hoàn tác thay đổi khác; chạy lại smoke / pack sau khi sửa |
| Video autoplay làm trang nặng | Thấp | Chỉ hero autoplay (1,1 MB, `preload="metadata"`, poster là LCP); thẻ đánh giá `preload="none"` |

## Làm song song

Task 1 và Task 2 độc lập nhau. Task 3 → 4 tuần tự (cùng một file). Task 5 và 6 làm song song được sau Task 4. Task 7 làm
cuối cùng.

## Commit

Không tự commit. Cuối cùng mình đề xuất commit riêng phần video. Thay đổi chưa commit của phiên trước trong
`themes/maggies-tanks` sẽ để bạn quyết định.

## Kết quả (2026-11-09)

Cả 7 task đã xong. `cd tools && npm test` → 34/34 pass. `pack.js --no-zip` các theme cũ: số lỗi / cảnh báo không đổi.
`club-ritual` có thêm dòng thông tin `videos: 4 files, 8.2 MB`, vì theme này vốn đã kèm video.

| Kiểm tra | Kết quả |
| --- | --- |
| Site giả `/products/video-tee` | đủ video ở cả 5 kiểu (`template`, `json`, `link`, stream Shopify → MP4 kèm poster, stream thường → playlist + 2 đoạn); `skipped` rỗng; offline 0 / 0 / 0 % |
| Tải lại trang chủ maggies-tanks | 10 video; 6 stream được ghi trùng với MP4 1080p đã có (kèm poster); không còn `.m3u8` trong `skipped` |
| Nghiệm thu maggies-tanks `2026.11.09.1` | hero + 6 video đánh giá thành mặc định (79,3 MB, nguyên file); bấm thẻ thì tải video (200); video merchant thay được mặc định; pack 0 lỗi; smoke 49/49; mobile-audit 0 lỗi; zip 79,7 MB |

Những gì phát sinh so với kế hoạch:
- **Lỗi mất dữ liệu của `--refresh`:** trước đây tool xoá thư mục trang trước khi tải, nên một viewport bị chặn bot thì mất file
  cũ. Giờ tool giữ lại file của viewport bị chặn (`kept` trong manifest); nếu cả hai viewport đều bị chặn thì giữ nguyên
  bản cũ. Đã có test. Lần tải maggies đầu tiên ở Checkpoint 1 (trước khi sửa) đã làm mất ảnh chụp desktop thật của trang
  chủ. Hai lần thử lại sau đó desktop vẫn bị chặn bot, nên tạm dùng `_work/capture/home/desktop.png` (bản offline, khác 2,73 %).
- **HTML offline:** `<source>` HLS được trỏ sang file MP4 local (Shopify) hoặc playlist local (stream thường), để Chrome
  thật không gọi ra ngoài.
- **Không kiểm tra được video phát bằng hình:** Chromium của Playwright báo `MEDIA_ERR_SRC_NOT_SUPPORTED` với H.264, như rủi ro
  đã ghi. Đã kiểm tra `currentSrc`, request 200 và trạng thái đang phát; cần mở thử trên Chrome thật.
- **Quy ước mới trong CLAUDE.md:** spec / plan / todo của lượt này đã chuyển sang `docs/`.
