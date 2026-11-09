# Task list: video trong `theme-from-link`

Spec: [SPEC-theme-from-link-videos.md](SPEC-theme-from-link-videos.md) · Kế hoạch: [plan-theme-from-link-videos.md](plan-theme-from-link-videos.md)
Lệnh test chung: `cd tools && npm test`.

---

## Task 1: Hàm thuần cho video trong `tools/lib/mirror.js`

**Mô tả:** Thêm 4 hàm, không dùng module node:
- `hlsVariants(text, base)` → `[{ url, bandwidth, resolution }]`, xếp bandwidth giảm dần;
- `hlsMedia(text, base)` → `{ segments: [url], map: url | null, encrypted, byteRange }`;
- `shopifyMp4(variantUrl)` → URL MP4 hoặc `null`;
- `videoUrlsIn(text, base)` → URL video tuyệt đối tìm thấy trong chữ (hiểu `\/` của JSON và `//host`, bỏ `data:` / `blob:`).

**Tiêu chí:**
- [x] `hlsVariants` đọc đúng playlist chính của Shopify (3 nhánh), đường dẫn tương đối thành tuyệt đối, nhánh cao nhất đứng đầu
- [x] `shopifyMp4` đúng với HD-1080p / HD-720p / SD-480p, giữ query nếu có; trả `null` với `master.m3u8` thường
- [x] `hlsMedia` nhận ra `EXT-X-MAP`, `EXT-X-KEY` (`encrypted: true`), `EXT-X-BYTERANGE`; `videoUrlsIn` tìm được URL trong
  JSON escape `https:\/\/cdn…\/a.mp4?v=1`

**Kiểm tra:** `cd tools && npm test` → `test/mirror.test.js` pass (gồm cả test chạy trong trang)

**Phụ thuộc:** Không · **File:** `tools/lib/mirror.js`, `tools/test/mirror.test.js` · **Cỡ:** S

---

## Task 2: Site giả có đủ loại video

**Mô tả:** Trang mới `tools/fixtures/site/video.html` (route `/products/video-tee`). Trang có:
- `<template>` chứa `<video><source src="/media/tpl.mp4">`;
- `<script type="application/json">` có `"/media/json.mp4"` dạng escape;
- `<a href="/media/link.mp4">`;
- `<video>` có `<source>` HLS kiểu Shopify `/videos/c/vp/abc/abc.m3u8`;
- một video phát bằng `blob:`, script giả lấy `/media/plain/master.m3u8` qua `fetch()` như hls.js.

`helpers.js` phục vụ:
- playlist chính và playlist nhánh (kiểu Shopify và kiểu thường);
- MP4 suy ra từ tên Shopify (`abc.HD-720p-1.6Mbps-123.mp4`);
- 2 đoạn `.ts`;
- `/media/*.mp4`.

Trang `product.html` cũ giữ nguyên, để test cũ không đổi.

**Tiêu chí:**
- [x] Mở `/products/video-tee` qua helper: không có lỗi console ngoài lỗi giải mã video
- [x] Log helper thấy request `master.m3u8` có `sec-fetch-dest: empty` (fetch)
- [x] Site giả vẫn < 1 MB (video giả là buffer sinh trong bộ nhớ)

**Kiểm tra:** `node tools/shot.js http://127.0.0.1:<port>/products/video-tee - --eval "…"` · `npm test` (test cũ vẫn pass)

**Phụ thuộc:** Không · **File:** `tools/fixtures/site/video.html`, `tools/test/helpers.js` · **Cỡ:** S

---

## Task 3: `download-page.js` — tìm video ở mọi chỗ

**Mô tả:**
- Response có URL `.m3u8`, bất kể `resourceType`, được thêm vào danh sách stream.
- `collectRefs`:
  - duyệt `template.content` (cả trong shadow root) như một gốc DOM;
  - đọc chữ của `script[type*=json]`, script inline và `a[href]` qua `videoUrlsIn`;
  - mỗi URL mang `via`.
- `snapshot`: viết lại link trong `<template>` (gốc DOM thêm vào `qsa`).

**Tiêu chí:**
- [x] Site giả `/products/video-tee`: `tpl.mp4`, `json.mp4`, `link.mp4` có trong `_m/`, `via` lần lượt là `template` / `json` / `link`
- [x] `index.html` offline: `<source>` trong `<template>` trỏ `/_m/…`
- [x] Hai `master.m3u8` (Shopify và thường) nằm trong danh sách stream (Task 4 xử lý tiếp)

**Kiểm tra:** `npm test` → `test/download-page.test.js` (khối mới cho `video-tee`)

**Phụ thuộc:** Task 1, 2 · **File:** `tools/download-page.js`, `tools/test/download-page.test.js` · **Cỡ:** M

---

## Task 4: `download-page.js` — tải stream, ghi vào `assets.json`, liệt kê video

**Mô tả:** Với mỗi stream, đọc playlist chính rồi chọn nhánh cao nhất.
- Tên kiểu Shopify: tải MP4 (`via: 'stream'`, `stream: <master>`). Đã có file đó thì chỉ thêm `stream` vào bản ghi.
- Stream thường: lưu playlist chính + playlist nhánh (link đã viết lại thành `/_m/…`) + các đoạn + `EXT-X-MAP`, ghi
  `stream: true`.
- `EXT-X-KEY`, `EXT-X-BYTERANGE`, `.mpd`: ghi vào `skipped` kèm lý do.
- Bản ghi video có thêm `poster` (từ `collectRefs`).
- Dòng tóm tắt in mỗi video một dòng: MB · kích thước · vùng · `via` · file.
- Bỏ lý do "video stream (not one file)" với các stream đã xử lý được.

**Tiêu chí:**
- [x] Site giả: MP4 suy ra (`abc.HD-720p-1.6Mbps-123.mp4`) có trong `_m/`; stream thường có playlist + 2 đoạn với link local; `skipped` không còn `.m3u8`
- [x] Bản offline của `video-tee`: 0 request ra ngoài, 0 lỗi 404; trang `product` cũ vẫn ≤ 1 %
- [x] Dòng tóm tắt có danh sách video

**Kiểm tra:** `npm test`

**Phụ thuộc:** Task 3 · **File:** `tools/download-page.js`, `tools/test/download-page.test.js` · **Cỡ:** M

---

## Checkpoint 1
- [x] `cd tools && npm test` pass
- [x] `node tools/download-page.js https://maggies-tanks.com/ themes/maggies-tanks --refresh --no-capture`: không còn `.m3u8` trong
  `skipped`; 6 stream ghi `stream` vào bản ghi MP4 1080p đã có; 0 request ra ngoài / 0 lỗi 404

---

## Task 5: Chốt chặn cho phép video, `pack.js` in dung lượng video

**Mô tả:**
- `media-guard.isContent` chỉ còn tính ảnh raster; video không còn bị báo lỗi hay cảnh báo.
- `pack.js` in `videos: N file, X MB` khi theme có video (dòng thông tin, không phải WARN). Theme không có video thì không in.

**Tiêu chí:**
- [x] Test: theme chép video trang sản phẩm → không lỗi; chép ảnh trang sản phẩm → vẫn lỗi
- [x] `pack.js --no-zip` các theme cũ: kết quả như trước

**Kiểm tra:** `npm test` → `test/media-guard.test.js`; so pack với mốc

**Phụ thuộc:** Task 4 (định dạng `assets.json`) · **File:** `tools/lib/media-guard.js`, `tools/pack.js`, `tools/test/media-guard.test.js` · **Cỡ:** S

---

## Task 6: Quy tắc video trong tài liệu

**Mô tả:**
- `new-theme/SKILL.md`, quy tắc media:
  - video của section đang hiện được chép nguyên file vào `assets/videos/<prefix>/`, làm mặc định cho ô video, ở mọi trang
    kể cả trang sản phẩm (trừ gallery sản phẩm chính);
  - mẫu viết mặc định;
  - ngoại lệ `default_video`;
  - `preload`;
  - ảnh trang sản phẩm giữ nguyên quy tắc cũ.
- `theme-from-link/SKILL.md`: đọc danh sách video trong dòng tóm tắt, chọn video của section đang hiện, chép vào theme.
- `SPEC-theme-from-link.md`: sửa quyết định số 3 và mục "Tất cả ảnh và video", trỏ sang spec video.
- RUNLOG: một shortcut.

**Tiêu chí:**
- [x] Hai SKILL.md không mâu thuẫn nhau, và không mâu thuẫn với `media-guard`
- [x] Mọi lệnh viết trong tài liệu khớp với cờ thật của tool

**Kiểm tra:** đọc lại; `git diff --stat` chỉ có các file đã liệt kê

**Phụ thuộc:** Task 4, 5 · **File:** `.claude/skills/new-theme/SKILL.md`, `.claude/skills/theme-from-link/SKILL.md`, `SPEC-theme-from-link.md`, `.claude/skills/new-theme/RUNLOG.md` · **Cỡ:** S

---

## Task 7: Nghiệm thu trên maggies-tanks

**Mô tả:** Đọc trạng thái hiện tại của theme trước (có thay đổi chưa commit từ phiên khác), rồi:
- chép nguyên file video hero (720p, 1,1 MB) và 6 video đánh giá (1080p) từ `_work/site/_m` vào `assets/videos/mt/`;
- `mt-vr-card.hbs`: thêm tham số video mặc định; nút phát luôn bật khi có video (của merchant hoặc mặc định); `preload="none"`;
- `index.hbs`: hero lùi về video mặc định;
- `build-mt-settings.js`: chú thích ô video ghi "để trống = video của theme";
- tăng version trong `theme.json`, ghi `CHANGELOG.md`, đóng gói lại.

**Tiêu chí:**
- [x] Preview: hero có `<video>` trỏ `assets/videos/mt/hero.mp4`; bấm thẻ đánh giá gọi `play()` với `currentSrc` là video của theme (request 200 / 206)
- [x] Đặt một ô video trong settings thì ô đó dùng video của merchant thay cho mặc định
- [x] Pack 0 lỗi (in `videos: 7 file, ~79 MB`); smoke pass; mobile-audit 0 lỗi

**Kiểm tra:** `tools/shot.js --click` / `--eval`; `smoke.js`; `mobile-audit.js`; `pack.js`

**Phụ thuộc:** Task 5, 6 · **File:** `themes/maggies-tanks/assets/videos/mt/*`, `snippets/mt-vr-card.hbs`, `templates/index.hbs`, `_work/build-mt-settings.js`, `theme.json`, `CHANGELOG.md` · **Cỡ:** M

---

## Checkpoint 2: Hoàn tất
- [x] Đủ 7 tiêu chí hoàn thành của spec
- [x] Mọi theme cũ pack ra như trước
- [x] Bạn xem lại trước khi commit
