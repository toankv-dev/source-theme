# Kế hoạch triển khai: skill `theme-from-link`

Spec: [../SPEC-theme-from-link.md](../SPEC-theme-from-link.md) (đã duyệt 2026-11-08) · Danh sách task: [todo.md](todo.md)

## Tổng quan

Thêm hai công cụ, `tools/download-page.js` và `tools/site-server.js`, cùng hai thư viện nhỏ trong `tools/lib/`.
Với một link, các công cụ tải đúng trang đó cùng mọi tài nguyên, dựng bản xem offline, tự kiểm tra độ giống, rồi chạy
`capture.js` trên bản offline. Sau đó thêm skill `theme-from-link`: gọi các công cụ trên, rồi đi tiếp các bước dựng theme
của `new-theme`. Thêm một chốt chặn trong `pack.js` để ảnh nội dung trang SP không lọt vào theme. `base-theme/` không đổi.

## Quyết định kiến trúc

- **Chụp DOM trên một bản sao "trơ"**: copy `document.documentElement` sang `document.implementation.createHTMLDocument()`
  rồi mới viết lại link. Document không gắn với trình duyệt thì không tải gì, nên việc viết lại không bắn request lạ
  sang site gốc. Bản sao bỏ `<script>` (trừ `application/ld+json`), thuộc tính `on*`, `<base>`; iframe đổi sang
  `about:blank` và giữ `data-orig-src`; `document.adoptedStyleSheets` được ghi ra một thẻ `<style>`.
- **Hàm thuần dùng chung node ↔ trình duyệt** (`tools/lib/mirror.js`): cùng một `localPath()` vừa đặt tên file khi lưu
  (node), vừa viết lại link trong DOM (trình duyệt). Vì cách đặt tên là tất định, hai bên không cần trao đổi bảng ánh xạ.
  Hash dùng FNV-1a viết bằng JS thuần, không dùng `crypto`.
- **Đường dẫn local giữ host** (`_m/<host>/<path>`). Nhờ vậy `capture.js` và `style-audit.js` vẫn nhận ra
  `fonts.gstatic` / `fonts.googleapis` mà không phải sửa. Đường dẫn không có đuôi file → `<path>/__index`, để `/a` và
  `/a/b` không đụng nhau. Tên file hợp lệ trên Windows; quá 180 ký tự thì băm.
- **Ba lượt mở trang**: (1) trang thật ở 1440 và 390, lấy DOM, ảnh chụp và mọi response; (2) bổ sung bằng `fetch` những gì
  trình duyệt chưa tải (srcset lớn nhất, ảnh lazy, ảnh nền của breakpoint khác, font chưa dùng, video, poster);
  (3) mở bản offline, chặn mọi host ngoài, đếm request ra ngoài và lỗi 404, so ảnh chụp với trang thật.
  Ảnh chụp ở lượt (1) và (3) đều tắt animation (`animations: 'disabled'`) để số % ổn định.
- **Tái dùng thay vì viết lại**: tách `UA`, `settle`, `clearPopups` từ `capture.js` sang `tools/lib/page.js`, hành vi giữ
  nguyên. Đo tokens / sections / text / fonts vẫn do `capture.js` làm, chỉ là chạy trên `http://127.0.0.1:<port>/<name>`
  của site-server. Phần so pixel dùng `pixelmatch` giống `visual-diff.js`.
- **site-server chọn DOM theo User-Agent** (iPhone / Android / Mobile → `mobile.html`), đúng UA mà lượt mobile của
  `capture.js` dùng, nên không phải sửa `capture.js`. Content-type lấy từ `assets.json`. Có hỗ trợ `Range` cho video.
- **Chốt chặn media là một hàm riêng** (`tools/lib/media-guard.js`), `pack.js` chỉ gọi nó. Hàm chỉ chạy khi theme có
  `_work/site/assets.json`, nên các theme cũ không bị ảnh hưởng. "Ảnh nội dung trang SP" là ảnh raster hoặc video thỏa cả
  ba điều kiện: chỉ xuất hiện trên trang `product*`, nằm trong vùng `main` (không phải header / footer), hiển thị lớn
  hơn 100×100 px. Logo, icon thanh toán và icon nhỏ nhờ vậy không bị bắt. Trùng byte → ERROR. Chỉ trùng tên gốc
  (ví dụ đã đổi sang WebP) → WARN.
- **Test bằng `node:test`**, chạy offline trên site giả `tools/fixtures/site/`. Iframe giả trỏ tới host `.invalid`,
  không bao giờ phân giải được, để không phụ thuộc mạng. Ảnh của site giả lấy từ `tools/fixtures/sample/`, font lấy từ
  `themes/club-ritual/assets/fonts/` (đều đã có trong git).

## Danh sách task (chi tiết trong [todo.md](todo.md))

### Phase 1: Nền móng
- [x] Task 1: `tools/lib/mirror.js` + unit test + script `npm test`
- [x] Task 2: Site giả `tools/fixtures/site/` + helper cho test
- [x] Task 3: Tách `tools/lib/page.js` khỏi `capture.js` (không đổi hành vi)
- [x] Task 4: `tools/site-server.js` + test

### Checkpoint 1: Nền móng
- [x] `cd tools && npm test` pass
- [x] `capture.js` trên site giả: `tokens.json` và `sections.json` giống hệt trước khi tách

### Phase 2: Công cụ tải (lát dọc, từ dễ hỏng nhất)
- [x] Task 5: `download-page.js` lượt 1: DOM + ảnh chụp + tài nguyên trình duyệt đã tải, chỉ trang của link
- [x] Task 6: `download-page.js` lượt 2: tải đủ mọi ảnh / video / CSS / font được tham chiếu; ghi `area` + kích thước
- [x] Task 7: `download-page.js` lượt 3: kiểm tra bản offline + xử lý trang bị chặn

### Checkpoint 2: Thử trên trang thật (làm sớm để biết sớm nếu không đạt)
- [x] `npm test` pass
- [x] Chạy trên trang SP và trang chủ của `https://www.clubritual.com/`, ghi vào một theme nháp trong scratchpad
  (không đụng `themes/club-ritual/_work`): 0 request ra ngoài, 0 lỗi 404, khác biệt ≤ 5 % desktop / mobile
- [x] Báo số liệu cho bạn. Nếu vượt ngưỡng: sửa (shadow DOM, loader ảnh lạ…) trước khi đi tiếp

### Phase 3: Nối vào quy trình
- [x] Task 8: Chạy `capture.js` trên bản offline (mặc định; `--no-capture` để bỏ)
- [x] Task 9: Chốt chặn media trong `pack.js` (`tools/lib/media-guard.js`)

### Checkpoint 3: Công cụ hoàn chỉnh
- [x] `npm test` pass
- [x] `node tools/pack.js <t> --no-zip` cho `base-theme` và mọi `themes/*`: số lỗi / cảnh báo giống trước khi sửa
- [x] tokens từ bản offline của clubritual khớp với `themes/club-ritual/_work/capture/product/tokens.json` (font body,
  màu chính) — so sánh trên máy này, nơi bản capture cũ còn tồn tại

### Phase 4: Skill và tài liệu
- [x] Task 10: `.claude/skills/theme-from-link/SKILL.md` + sửa `new-theme/SKILL.md`, `RUNLOG.md`, `CLAUDE.md`
- [x] Task 11: Nghiệm thu end-to-end: chạy skill trên một link → zip

### Checkpoint 4: Hoàn tất
- [x] Đủ 10 tiêu chí hoàn thành của spec
- [x] Bạn xem lại trước khi commit

## Rủi ro và cách xử lý

| Rủi ro | Mức | Cách xử lý |
| --- | --- | --- |
| Trang dùng web component có shadow DOM: `outerHTML` không chép shadow root, bản offline thiếu nội dung | Trung bình | Đo ở Checkpoint 2. Nếu gặp, chụp bằng `getHTML({ serializableShadowRoots: true, shadowRoots })` (Chromium 130 hỗ trợ) thành declarative shadow DOM |
| CSS sinh bằng JS (`adoptedStyleSheets`, CSS-in-JS) mất khi bỏ script | Trung bình | Ghi `adoptedStyleSheets` và các `<style>` do JS chèn ra HTML lúc chụp (DOM đã có sẵn chúng) |
| Ảnh lazy dùng thuộc tính lạ (`data-lazy`, `data-bgset`…) | Trung bình | Quét mọi thuộc tính `data-*` có giá trị giống URL ảnh / video; test bằng site giả; bổ sung khi gặp ở trang thật |
| Bot chặn (Cloudflare…) | Trung bình | Thử lại 1 lần; một viewport bị chặn thì dùng viewport còn lại; cả hai bị chặn thì thoát và gợi ý `new-theme` + ảnh chụp |
| Không giới hạn dung lượng → video lớn làm chậm hoặc đầy đĩa | Thấp | Ghi file theo luồng (stream); in tiến độ và tổng dung lượng; `_work/` không commit |
| Đường dẫn dài hoặc ký tự cấm trên Windows | Trung bình | `localPath` lọc ký tự, cắt + băm; có unit test |
| Animation hoặc slider tự chạy làm % khác biệt dao động | Thấp | Tắt animation khi chụp ở cả hai bên; trang thật vượt ngưỡng vì nội dung động thì tool in WARN và nêu lý do |
| Chốt chặn media bắt nhầm (logo / icon) hoặc bỏ sót bản đã đổi sang WebP | Thấp | Lọc theo vùng + kích thước hiển thị; bản trùng tên gốc → WARN; quy tắc trong skill vẫn là tuyến chặn chính |
| Tách code khỏi `capture.js` làm đổi hành vi | Thấp | So `tokens.json` / `sections.json` trước và sau trên site giả (Task 3), và với capture cũ của club-ritual (Checkpoint 3) |

## Làm song song

- Task 1, 2 và 4 độc lập nhau, làm song song được. Task 3 cần Task 2.
- Task 5 → 6 → 7 → 8 phải tuần tự (cùng một file). Task 9 làm song song với 7–8 được, khi định dạng `assets.json` của
  Task 6 đã chốt.
- Task 10 viết sau Task 8–9 (cần tên lệnh và cờ đã chốt). Task 11 làm cuối cùng.

## Commit

Không tự commit. Đề xuất mỗi checkpoint một commit (bạn đồng ý thì mới làm), tin nhắn có tham chiếu tới spec.

## Câu hỏi còn mở

1. **Link để nghiệm thu end-to-end (Task 11)**: bạn muốn dùng link nào? Theme làm ra được giữ lại trong `themes/`
   và commit, hay chỉ là bản thử rồi xóa? Nếu không có link riêng: dùng trang SP của clubritual.com, dựng vào
   `themes/club-ritual-link`, rồi xóa sau khi so với `themes/club-ritual`.
2. **Ngưỡng chốt chặn media**: "ảnh nội dung" = chỉ có trên trang SP + nằm trong vùng main + hiển thị > 100×100 px.
   Ngưỡng này có ổn không?

## Kết quả (2026-11-08)

Cả 11 task đã xong. `cd tools && npm test` → 23/23 pass. `pack.js --no-zip` cho `base-theme` và 5 theme hiện có ra kết quả
giống hệt trước khi sửa (0 lỗi, 0 cảnh báo).

| Kiểm tra | Kết quả |
| --- | --- |
| Site giả | 0 request ra ngoài, 0 lỗi 404, khác 0 % (desktop và mobile) |
| clubritual.com, trang SP | 173 ảnh, 5 video, 74 MB; 0 request ra ngoài, 0 lỗi 404; khác 0 % desktop / 2,22 % mobile |
| clubritual.com, trang chủ | desktop bị chặn bot sau khi đã thử lại → chỉ có mobile: khác 0 % |
| Capture trên bản offline | token (font, cỡ chữ, màu, nút, bảng màu) giống hệt capture cũ trên trang thật |
| Nghiệm thu `themes/club-ritual-link` | zip `dist/club-ritual-link-2026.11.08.1.zip`; pack 0 lỗi; smoke 50/50; mobile-audit 0 lỗi; style-audit đạt |

Những gì phát sinh so với kế hoạch:
- **Shadow DOM** (rủi ro đã ghi): ban đầu trang SP khác 21 % / 37 %, vì widget của app vẽ trong shadow root. Đã sửa
  bằng `getHTML({ shadowRoots })` + `Document.parseHTMLUnsafe` → 7 % / 12 %.
- **Cây mà trình phân tích HTML không dựng lại được**: script chèn `<div>` vào `<p>` (dòng trả góp Shop Pay). Phần tử
  bên trong được đổi thành `<span>` giữ `display` → 0 % / 2,22 %. Site giả có thêm trường hợp này để test luôn giữ được.
- Lưu thêm `offline-<viewport>.png`; gợi ý "Next" của `tools/new-theme.js` trỏ sang `download-page.js`.
- Chốt chặn media: ảnh SP mà trang chủ cũng dùng (thẻ sản phẩm) không bị coi là "chỉ thuộc trang SP", nên không bị
  bắt. Quy tắc trong skill vẫn cấm đưa vào theme.
- Theme nghiệm thu đã xóa sau khi so sánh (như đã nêu); file zip vẫn giữ trong `dist/` (không commit).
- Mobile-audit còn 54 cảnh báo, đều là nhãn đồng hồ đếm ngược 8 px. Bản gốc cố ý dùng 7 px, nên được giữ theo quy tắc
  của new-theme.
