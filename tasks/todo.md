# Task list: skill `theme-from-link`

Spec: [../SPEC-theme-from-link.md](../SPEC-theme-from-link.md) · Kế hoạch: [plan.md](plan.md)

Lệnh test chung: `cd tools && npm test` (= `node --test "test/*.test.js"`). Mọi đường dẫn tính từ gốc repo.

---

## Phase 1: Nền móng

## Task 1: Thư viện hàm thuần `tools/lib/mirror.js`

**Mô tả:** Các hàm thuần chạy được cả trong node lẫn trong trang (không `require` module nào): `hash` (FNV-1a),
`localPath(url)`, `absUrl(u, base)`, `rewriteCss(css, baseUrl)` → `{ css, urls }` (`url()` + `@import`, bỏ qua `data:`),
`rewriteSrcset(srcset, baseUrl, keep)`, `largestCandidate(srcset)`, `pageName(url)` (bảng tên trong spec),
`isBlocked({ status, title, text })`. Thêm script `"test"` vào `tools/package.json`.

**Tiêu chí:**
- [x] `localPath` giữ host (`fonts.gstatic.com`, `fonts.googleapis.com`); `/a` → `…/a/__index`, `/a/b.css` không đụng `/a`;
  không có ký tự `<>:"|?*\`; URL > 180 ký tự cho ra đường dẫn ≤ 200 ký tự, cố định giữa các lần gọi
- [x] `rewriteCss` viết lại `url(x)`, `url('x')`, `url("x")`, `@import "x"`, `@import url(x)` thành `/_m/…` và trả về
  danh sách URL tuyệt đối; giữ nguyên `data:` và `#id`
- [x] `pageName` đúng với cả 8 mẫu URL trong spec; `isBlocked` nhận ra 403 / 503 và các tiêu đề "Just a moment",
  "Attention Required", "Access denied", "Verify you are human"

**Kiểm tra:**
- [x] `cd tools && npm test` → `test/mirror.test.js` pass
- [x] Hàm chạy được trong trang: test gọi `page.evaluate` với mã nguồn của module, kết quả giống trong node

**Phụ thuộc:** Không

**File:** `tools/lib/mirror.js`, `tools/test/mirror.test.js`, `tools/package.json`

**Cỡ:** S

---

## Task 2: Site giả và helper cho test

**Mô tả:** `tools/fixtures/site/` là một cửa hàng giả nhỏ. Trang `product.html` có: CSS ngoài với `@import`, ảnh nền
`url()` riêng cho desktop và cho `@media (max-width: 600px)`, `@font-face` (woff2 copy từ
`themes/club-ritual/assets/fonts/`), `img srcset` 3 kích cỡ, ảnh lazy `data-src`, ảnh trong tab ẩn, `<video>` có 2
`<source>` + `poster`, một iframe trỏ tới `http://embed.invalid/`, một `<script>` inline có `onload`, link sang `home.html`.
Ngoài ra có `home.html`. `tools/test/helpers.js` bật server tĩnh ở cổng ngẫu nhiên, ghi log mọi request (có loại
document), có route `/blocked` trả 403 với tiêu đề "Just a moment…", và tạo thư mục theme tạm trong `os.tmpdir()`.

**Tiêu chí:**
- [x] Mở `product.html` qua helper thấy đủ mọi thành phần trên; ảnh lấy từ `tools/fixtures/sample/` (không thêm file nhị phân mới ngoài 1 font)
- [x] Log của helper tách được request document và request tài nguyên
- [x] Tổng dung lượng site giả < 1 MB

**Kiểm tra:**
- [x] `node tools/shot.js http://127.0.0.1:<port>/product.html <scratch>/f.png --width 390` chụp được, không có lỗi console
  nào ngoài iframe `.invalid`

**Phụ thuộc:** Không

**File:** `tools/fixtures/site/*` (dữ liệu), `tools/test/helpers.js`

**Cỡ:** M (phần lớn là file dữ liệu nhỏ)

---

## Task 3: Tách `tools/lib/page.js` khỏi `capture.js`

**Mô tả:** Chuyển `UA`, `UA_M`, `settle(page)`, `clearPopups(page, { keep })` sang `tools/lib/page.js`; `capture.js`
`require` lại từ đó. Không đổi hành vi, không đổi tham số dòng lệnh.

**Tiêu chí:**
- [x] `capture.js` không còn bản sao của các hàm này; `--keep-popups` vẫn chạy như cũ
- [x] Chạy `capture.js` trên `product.html` của site giả trước và sau khi tách: `tokens.json` và `sections.json` giống hệt
  (bỏ qua trường thời gian, nếu có)

**Kiểm tra:**
- [x] So hai bản capture bằng `diff`
- [x] `cd tools && npm test` pass

**Phụ thuộc:** Task 2

**File:** `tools/lib/page.js`, `tools/capture.js`

**Cỡ:** S

---

## Task 4: `tools/site-server.js`

**Mô tả:** Server tĩnh cho `<theme-dir>/_work/site/`. CLI: `node tools/site-server.js <theme-dir> [--port 8092]`; export
`start({ siteDir, port })` → `{ server, port, stats }`. Các route:
- `/` → danh sách trang trong `manifest.json`;
- `/<name>` → `pages/<name>/index.html`; UA iPhone / Android / Mobile hoặc `?view=mobile` → `mobile.html`
  (thiếu thì lùi về bản còn lại);
- `/_m/…` → file, content-type theo `assets.json`, không có thì theo đuôi file; hỗ trợ `Range` (206);
- còn lại → 404, đếm vào `stats.notFound` và in ra.

**Tiêu chí:**
- [x] Phục vụ đúng desktop / mobile theo UA; content-type đúng cả với file không có đuôi (`…__index`)
- [x] `Range: bytes=0-99` trả 206 với đúng 100 byte
- [x] Đường dẫn có `..` bị chặn (không đọc được ra ngoài `_work/site/`)

**Kiểm tra:**
- [x] `cd tools && npm test` → `test/site-server.test.js` pass (mirror nhỏ tự dựng trong thư mục tạm)

**Phụ thuộc:** Không

**File:** `tools/site-server.js`, `tools/test/site-server.test.js`

**Cỡ:** S

---

## Checkpoint 1: Nền móng
- [x] `cd tools && npm test` pass
- [x] Bản capture trên site giả giống hệt trước khi tách (Task 3)

---

## Phase 2: Công cụ tải

## Task 5: `download-page.js` — lượt 1: trang thật

**Mô tả:** `node tools/download-page.js <url> <theme-dir> [--name] [--keep-popups] [--no-capture] [--refresh]`. Mở trang
ở 1440 (UA desktop) rồi 390 (UA iPhone, `isMobile`); `settle` + `clearPopups`; lưu mọi response 200 (không lưu 206) vào
`_m/` theo `localPath`. Sau đó chụp toàn trang (`animations: 'disabled'`) → `pages/<name>/desktop.png`, `mobile.png`.
Chụp DOM trên bản sao trơ (xem *Quyết định kiến trúc*), viết lại `src`, `srcset`, `href` của `link`, `poster`,
`data-src*`, `style` inline và `<style>` → `index.html`, `mobile.html`. Ghi `manifest.json` và `assets.json`.
Tên trang lấy từ `pageName` hoặc `--name`; trùng tên thì báo lỗi, trừ khi có `--refresh`.

**Tiêu chí:**
- [x] Trên site giả: log helper chỉ có **1 request document** (`product.html`) cho mỗi viewport, không có `home.html`
- [x] `index.html` / `mobile.html` không còn `<script>` thực thi, không còn thuộc tính `on*`; iframe → `about:blank` +
  `data-orig-src`, và iframe được ghi vào `skipped`
- [x] Mọi link tài nguyên trong HTML đã lưu đều trỏ vào `/_m/…`; chạy lại khi không có `--refresh` thì báo lỗi trùng tên

**Kiểm tra:**
- [x] `cd tools && npm test` → `test/download-page.test.js` (phần lượt 1) pass

**Phụ thuộc:** Task 1, 2, 3

**File:** `tools/download-page.js`, `tools/test/download-page.test.js`

**Cỡ:** M

---

## Task 6: `download-page.js` — lượt 2: tải đủ mọi thứ được tham chiếu

**Mô tả:** Sau lượt 1, gom trong trang (cả hai viewport) mọi URL ảnh / video được tham chiếu: bản lớn nhất của `srcset`
(và bản trình duyệt đã dùng), `data-src` / `data-srcset` / mọi `data-*` giống URL ảnh, ảnh trong phần tử ẩn,
`poster`, mọi `video source` là file trực tiếp. Phân tích từng file CSS đã lưu (cả `@import` lồng nhau) để lấy `url()`
của ảnh nền ở mọi breakpoint và mọi font. Tải phần còn thiếu bằng `fetch` (UA desktop), ghi theo luồng; response 206
thì tải lại cả file. Stream (`.m3u8`, `blob:`) → `skipped`. Viết lại `srcset` chỉ còn các bản đã tải. Với mỗi ảnh, ghi
vào `assets.json`: `area` (header / main / footer, theo phần tử cha gần nhất hoặc vị trí) và `rendered` (kích thước
hiển thị lớn nhất).

**Tiêu chí:**
- [x] Site giả: có đủ srcset lớn nhất, ảnh lazy, ảnh tab ẩn, ảnh nền mobile + desktop, font, cả 2 video source, poster
- [x] `assets.json` có `contentType`, `bytes`, `pages`, `area`, `rendered` đúng cho ảnh trong header và trong main
- [x] In một dòng tóm tắt: số ảnh, video, CSS, font, JS và tổng dung lượng

**Kiểm tra:**
- [x] `cd tools && npm test` (phần lượt 2) pass

**Phụ thuộc:** Task 5

**File:** `tools/download-page.js`, `tools/lib/mirror.js` (nếu cần thêm hàm), `tools/test/download-page.test.js`,
`tools/fixtures/site/*` (nếu cần thêm trường hợp)

**Cỡ:** M

---

## Task 7: `download-page.js` — lượt 3: kiểm tra bản offline và trang bị chặn

**Mô tả:** Bật `site-server` ngay trong tiến trình, ở cổng ngẫu nhiên. Mở `/<name>` ở 1440 và 390, chặn (`route` → abort)
và đếm mọi request không phải `127.0.0.1`, đếm 404 qua `stats.notFound`. Chụp toàn trang (tắt animation), so với ảnh
chụp trang thật bằng `pixelmatch` trên phần kích thước chung. Ghi `manifest.pages[].check` và in dòng tóm tắt; trên 5 %
thì in WARN. Trang bị chặn (theo `isBlocked`): thử lại viewport đó 1 lần. Một viewport bị chặn thì tiếp tục với
viewport còn lại (site-server dùng nó cho cả hai) và ghi `blocked: ['desktop']`. Cả hai bị chặn thì thoát với mã 2 và
gợi ý chuyển sang `new-theme` với ảnh chụp.

**Tiêu chí:**
- [x] Site giả: `external = 0`, `notFound = 0` ở cả 1440 và 390; khác biệt ≤ 1 %
- [x] `/blocked`: đúng 1 lần thử lại cho mỗi viewport (đếm trong log helper), mã thoát 2, thông báo có gợi ý `new-theme`
- [x] Số liệu kiểm tra có trong `manifest.json` và trong dòng in ra

**Kiểm tra:**
- [x] `cd tools && npm test` (phần lượt 3) pass

**Phụ thuộc:** Task 4, 6

**File:** `tools/download-page.js`, `tools/test/download-page.test.js`

**Cỡ:** M

---

## Checkpoint 2: Trang thật
- [x] `cd tools && npm test` pass
- [x] `node tools/download-page.js https://www.clubritual.com/products/<một SP> <scratch>/cr-test --no-capture` và trang chủ
  `https://www.clubritual.com/`: 0 request ra ngoài, 0 lỗi 404, khác biệt ≤ 5 % ở desktop và mobile
- [x] Báo số liệu cho bạn; vượt ngưỡng thì sửa xong mới đi tiếp

---

## Phase 3: Nối vào quy trình

## Task 8: Chạy `capture.js` trên bản offline

**Mô tả:** Mặc định, sau lượt 3 (site-server vẫn đang chạy), gọi
`node tools/capture.js http://127.0.0.1:<port>/<name> <theme-dir> --name <name>` (`--no-images` với `product*`,
`--keep-popups` nếu được truyền vào). `--no-capture` bỏ bước này. Lỗi của capture được báo ra, nhưng không xóa phần đã
tải.

**Tiêu chí:**
- [x] Site giả: `_work/capture/product/` có `tokens.json`, `sections.json`, `text.txt`, `fonts.json`, `fonts/<woff2>`; không có `images/`
- [x] Font body trong `tokens.json` là font của site giả
- [x] `--no-capture` không tạo `_work/capture/`

**Kiểm tra:**
- [x] `cd tools && npm test` (phần capture) pass

**Phụ thuộc:** Task 7

**File:** `tools/download-page.js`, `tools/test/download-page.test.js`

**Cỡ:** S

---

## Task 9: Chốt chặn media trong `pack.js`

**Mô tả:** `tools/lib/media-guard.js` export `findOriginalMedia(themeDir)` → `{ errors, warnings }`. Hàm chỉ chạy khi có
`_work/site/assets.json`. Lấy các ảnh raster / video chỉ thuộc trang `product*`, `area = main`, `rendered` > 100×100;
băm sha1 file của chúng; duyệt `assets/` của theme (bỏ qua thư mục `_*`). Trùng byte → error (kèm URL gốc và lời
nhắc để trống ô media). Chỉ trùng tên gốc → warning. `pack.js` gọi hàm này và gộp kết quả vào danh sách lỗi / cảnh báo của nó.

**Tiêu chí:**
- [x] Theme giả có ảnh nội dung SP trong `assets/images/` → error; có logo header hoặc icon 32×32 → không lỗi
- [x] Theme không có `_work/site/` → `{ errors: [], warnings: [] }`
- [x] `node tools/pack.js <t> --no-zip` cho `base-theme` và mọi `themes/*`: số lỗi / cảnh báo giống trước khi sửa

**Kiểm tra:**
- [x] `cd tools && npm test` → `test/media-guard.test.js` pass
- [x] Ghi số lỗi / cảnh báo của từng theme trước và sau khi sửa

**Phụ thuộc:** Task 6 (định dạng `assets.json`)

**File:** `tools/lib/media-guard.js`, `tools/pack.js`, `tools/test/media-guard.test.js`

**Cỡ:** S

---

## Checkpoint 3: Công cụ hoàn chỉnh
- [x] `cd tools && npm test` pass
- [x] Mọi theme hiện có pack (`--no-zip`) ra kết quả như trước
- [x] Capture trên bản offline của trang SP clubritual: font body và màu chính khớp với
  `themes/club-ritual/_work/capture/product/tokens.json`

---

## Phase 4: Skill và tài liệu

## Task 10: Skill `theme-from-link` và cập nhật tài liệu

**Mô tả:**
- Viết `.claude/skills/theme-from-link/SKILL.md`. Frontmatter: `name`, `description` có các câu kích hoạt ("tạo theme từ
  link", "tải giao diện trang này", một link cửa hàng).
- Các bước của skill:
  1. scaffold ở link đầu tiên;
  2. `download-page.js` cho mỗi link (chạy nền, tuần tự), đọc dòng tóm tắt; bị chặn thì hỏi xin ảnh chụp và chuyển sang `new-theme`;
  3. đi tiếp bước 3–8 của `new-theme`, với các thay thế:
     - ảnh chuẩn = `_work/site/pages/<name>/{desktop,mobile}.png`;
     - đo bằng `shot.js` / `pixel.js` trên `http://localhost:8092/<name>`;
     - ảnh trong `_m/` chỉ để nhìn;
     - trang không có link dùng bố cục base phủ skin;
  4. báo cáo thêm: trang đã tải, file bị bỏ qua, trang không có link.
- Sửa `new-theme/SKILL.md`:
  - description: link → `theme-from-link`;
  - quy tắc ảnh SP: được nằm trong `_work/site/` nhưng không bao giờ vào theme;
  - bước 2 trỏ sang skill mới.
- Sửa `RUNLOG.md`: thêm cột download, thêm shortcut cho `download-page.js`.
- Sửa `CLAUDE.md`: thêm tool `download-page.js`, `site-server.js`; quy tắc "link → theme-from-link, ảnh chụp → new-theme".

**Tiêu chí:**
- [x] Skill mới không chép lại quy tắc dựng của `new-theme`, chỉ tham chiếu tới; mọi lệnh trong skill chạy được đúng như viết
- [x] Hai description không chồng nhau: link → `theme-from-link`, ảnh chụp → `new-theme`
- [x] `CLAUDE.md` liệt kê đủ tool mới; `base-theme/` không đổi (`git status base-theme` sạch)

**Kiểm tra:**
- [x] Đọc lại: mỗi lệnh trong `SKILL.md` khớp với cờ thật của tool (`--help` / comment đầu file)
- [x] `git diff --stat` chỉ có các file đã liệt kê

**Phụ thuộc:** Task 8, 9

**File:** `.claude/skills/theme-from-link/SKILL.md`, `.claude/skills/new-theme/SKILL.md`, `.claude/skills/new-theme/RUNLOG.md`,
`CLAUDE.md`

**Cỡ:** M

---

## Task 11: Nghiệm thu end-to-end

**Mô tả:** Chạy skill `theme-from-link` trên link đã thống nhất (câu hỏi mở 1 trong plan.md), từ đầu tới zip. Ghi lượt
chạy vào `RUNLOG.md`.

**Tiêu chí:**
- [x] Có `dist/<slug>-<version>.zip`, `pack.js` 0 lỗi
- [x] `smoke.js` pass, `mobile-audit.js` 0 lỗi, `style-audit.js` không có FAIL; `inspect-theme.js` cho thấy cấu trúc như `themes/*`
- [x] Báo cáo bằng tiếng Việt có: trang đã tải, file bị bỏ qua, trang không có link, các ô media trống cần merchant điền

**Kiểm tra:**
- [x] Chạy đủ các lệnh ở mục 4 phần *Commands* của spec

**Phụ thuộc:** Task 10

**File:** `themes/<slug>/*` (sinh ra), `.claude/skills/new-theme/RUNLOG.md`

**Cỡ:** L (một lượt dựng theme đầy đủ, theo quy trình có sẵn)

---

## Checkpoint 4: Hoàn tất
- [x] Đủ 10 tiêu chí hoàn thành của spec
- [x] Bạn xem lại trước khi commit
