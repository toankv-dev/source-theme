# Việc: giảm token khi tạo và sửa theme, đợt 1

Plan: [plan-theme-token-cost.md](plan-theme-token-cost.md). Mỗi phase một phiên: đầu phiên đọc file này và spec của
module, cuối phiên đánh dấu việc xong và ghi số đo. Mọi việc đều phải qua chuẩn chung: `cd tools && npm test` xanh, test
cũ không đổi, đầu file tool có cách dùng.

## Phase 1: cost-meter ([SPEC-cost-meter.md](SPEC-cost-meter.md))

### T1: Tách phiên theo yêu cầu, `--by-request`, `--prompts`
`summarize()` trả thêm danh sách yêu cầu. Một yêu cầu = lời người dùng, không phải tool result, `<task-notification>`,
lệnh nội bộ hay tin bị ngắt. Mỗi yêu cầu có: giờ, slash command, lượt gọi, chi phí, context đầu → cuối, ảnh, compact.
`--by-request` in bảng; `--prompts` thêm 60 ký tự đầu.
- Tiêu chí: tách đúng trên transcript giả (có tin ngắt, notification, compact); mặc định không in chữ của người dùng;
  output khi không có cờ mới giữ nguyên.
- Kiểm tra: `cd tools && npm test`; `node tools/transcript-cost.js <phiên A> --by-request` ra 38 yêu cầu (5 bị ngắt;
  dòng "[Request interrupted…]" đánh dấu yêu cầu trước nó, không phải một yêu cầu).
- Phụ thuộc: không. File: `tools/transcript-cost.js`, `tools/test/transcript-cost.test.js`. Cỡ: S.
- **Xong 2026-11-20.**

### T2: `--fresh`, `--title`, các bước làm theme
- `--fresh`: ước tính chi phí nếu mỗi yêu cầu là một phiên mới.
- `--title`: tìm phiên theo `aiTitle` / `customTitle`.
- `classify()` thêm các bước `tool <tên>`, `theme script`, `temp script`, `read theme code`, `read design map`,
  `fetch web`; cột img / theme / shopdy trong `--by-request`.
- Tiêu chí: phép tính `--fresh` đúng trên transcript giả; các bước cũ giữ tên; `--title` trùng tên thì liệt kê.
- Kiểm tra: test xanh; phiên A ra 710 lượt, 42,4M, `--fresh` 17,1M (±1%); `--project D:\shopdy-promax --title
  vesnacharm` tìm ra `1c0d32c8…`.
- Phụ thuộc: T1. File: `tools/transcript-cost.js`, `tools/test/transcript-cost.test.js`. Cỡ: S.
- **Xong 2026-11-20.** Thêm: lượt "synthetic" (không token) không tính vào context hay `--fresh`.

### Checkpoint 1 (2026-11-20)
- [x] test của transcript-cost xanh (12/12). `npm test`: 80/81. Test còn đỏ (`install-shopdy-skill`: còn ghim
  `store-page-from-link v1.0.0`, skill đã lên v1.1.0) có từ trước và không thuộc việc này.
- [x] phiên A: 710 lượt · 42 375 383 · `--fresh` 17 128 814 (40%) · 38 yêu cầu (5 bị ngắt) · `--title vesnacharm` ra
  `1c0d32c8…` · chạy 2,4 giây
- [x] SPEC-cost-meter: trạng thái xong

## Phase 2: theme-map ([SPEC-theme-map.md](SPEC-theme-map.md))

### T3: `lib/theme-map.js`: quét theme thành mô hình
Hàm thuần `scan(themeDir)` → mô hình:
- template → section theo thứ tự, block, setting đáng chú ý;
- section: setting, loại block + khoảng dòng (`eq block.type "x"`, kể cả trong inline partial), snippet, CSS / JS link,
  `<style>` riêng;
- snippet: ai dùng;
- CSS / JS: ai link, prefix, breakpoint, có minified không;
- design: setting màu / font, giá trị, file đọc `settings.<id>`;
- nguồn: `_src/*.js` và `_work/*.js` (`build-*` = sinh, `patch-*` = vá, file đích);
- hook nền tảng;
- sha1 từng file.

Danh sách hook chuyển từ `pack.js` sang `tools/lib/platform-hooks.js` (pack.js dùng lại, output không đổi).
- Tiêu chí: test 4 và 5 của spec xanh trên fixture (2 template, 3 section, 1 snippet, 1 CSS thường + 1 minified, một
  `build-x.js`, một `patch-x.js`); không đọc `_work/site/`.
- Kiểm tra: `cd tools && npm test`; `node tools/pack.js base-theme` cho cùng kết quả như trước.
- Phụ thuộc: không. File: `tools/lib/theme-map.js`, `tools/lib/platform-hooks.js`, `tools/pack.js`,
  `tools/fixtures/theme-map/**`, `tools/test/theme-map.test.js`. Cỡ: M.
- **Xong 2026-11-20.** Thêm: block Lunara `(eq type "x")` / `(eq this.type "x")`; file hbs minified → vị trí ký tự + lệnh
  `grep -o`; chỉ `build-*` / `patch-*` được tính là sửa theme (script khác = helper / check); "edited by" ghi đúng file.

### T4: CLI `theme-map.js`
- Từ mô hình, viết `_map/design-map.md` (tiếng Anh, theo mẫu trong spec) và `_map/design-map.json`.
- Giữ ghi chú theo id phần; phần bị xoá → `### (removed) <id>`; gắn cờ xem lại khi file của phần đó đổi; marker hỏng →
  không ghi, exit 1.
- `--check` (exit 0 / 1), `--ack <id|all>`, `--part <id>`, `--all`. In 1–5 dòng.
- Tiêu chí: test 1, 2, 3, 5 của spec xanh; chạy lại giống từng byte.
- Kiểm tra: `cd tools && npm test`; chạy trên một bản copy của base-theme ở thư mục tạm.
- Phụ thuộc: T3. File: `tools/theme-map.js`, `tools/lib/theme-map.js`, `tools/test/theme-map.test.js`. Cỡ: M.
- **Xong 2026-11-20.** Ghi chú đổi chữ cùng lúc với code → coi như đã xem lại (không gắn cờ).

### T5: Chạy trên theme thật, sinh map
`--all` vào thư mục tạm trước: đo cỡ, thời gian, độ đúng (vesnacharm: `patch-sc` vá `product.hbs`, `reviews.hbs`,
`lu-size-finder.hbs`; `build-sc` sinh schema `sc-*` + template; `--part product` có khoảng dòng block). Chỉnh heuristic
cho tới khi đạt, rồi sinh `_map/` thật cho base-theme + 10 theme.
- Tiêu chí: mỗi `design-map.md` ≤ 16 000 ký tự, `--part` ≤ 4 000, ≤ 5 giây mỗi theme; test 7 của spec xanh.
- Kiểm tra: test xanh; `node tools/theme-map.js --all` rồi `--check` trên từng theme → exit 0; zip của mỗi theme không
  có `_map/`.
- Phụ thuộc: T4. File: `tools/lib/theme-map.js`, `base-theme/_map/*`, `themes/*/_map/*` (sinh ra). Cỡ: M.
- **Xong 2026-11-20.** 11 map: 7 008–10 057 ký tự, ≤ 145 ms mỗi theme, `--part` ≤ 2 659 ký tự; ghi chú đầu tiên cho 2
  theme Lunara (CSS id thắng, màu chủ đạo = `highlight`, sửa qua script).

### Checkpoint 2 (2026-11-20)
- [x] test xanh · [x] mọi map đạt ngân sách · [x] đọc thử map vesnacharm: footer → `patch-vn.js` + `vn-chrome.css 61-122`,
  ATC → `#addToCart product.hbs` + `grep -o`, review → `sc-reviews.hbs` (`<style>` riêng 14 KB)

### T6: Script nguồn Lunara → `_src/`
Ở `lunara---hushflex` và `lunara---vesnacharm`, chuyển `build-*.js`, `patch-*.js`, `_work/cb/`, `compare-copy.js`,
`sc-e2e.js`, `scan-colors.js` sang `_src/`. Sửa đường dẫn `_work/…` bên trong nếu trỏ tới chính các script / nguồn đó
(dữ liệu vẫn ở `_work/`). Cập nhật README của theme. Chạy lại map.
- Tiêu chí: chạy lại mọi `patch-*` → "already there"; chạy lại mọi `build-*` → `git diff` các file theme rỗng; map ghi
  nguồn ở `_src/`, không còn cảnh báo "not committed".
- Kiểm tra: `node tools/pack.js themes/lunara---hushflex` và `…vesnacharm` 0 lỗi; `git status` chỉ có file chuyển chỗ,
  README và `_map/`.
- Phụ thuộc: T5. File: `themes/lunara---hushflex/{_src/**,README.md}`, `themes/lunara---vesnacharm/{_src/**,README.md}`.
  Cỡ: M.
- **Xong 2026-11-20.** Kiểm tra trên bản copy ở thư mục tạm: mọi `patch-*` exit 0 ("already there"), mọi `build-*` exit 0,
  0 file khác bản gốc. Cũng chuyển `anim-webp.py`, `vn-footer.hbs`; `compare-copy.js` bỏ qua `_src`, `_map`.

### T7: Tool tích hợp map
- `tools/new-theme.js`: sau khi chép base, tạo map cho theme mới (không chép map của base).
- `tools/pack.js`: `WARN` khi thiếu map hoặc map lệch (`run node tools/theme-map.js <dir>`); không phải lỗi.
- Tiêu chí: test 6 của spec xanh; theme mới vừa tạo có `_map/` khớp.
- Kiểm tra: `cd tools && npm test`; `node tools/new-theme.js "Map Test"` vào thư mục tạm → `--check` exit 0; pack 0 lỗi.
- Phụ thuộc: T5. File: `tools/new-theme.js`, `tools/pack.js`, `tools/test/theme-map.test.js`. Cỡ: S.
- **Xong 2026-11-20.** Theme thử "Map Test": map 7 438 ký tự, `--check` 0, pack 0 lỗi 0 cảnh báo (đã xoá).

### T8: Luật và skill
- `CLAUDE.md`: luật "đọc `_map/design-map.md` trước code; sau khi sửa: `theme-map.js`, sửa ghi chú bị gắn cờ, `--ack`";
  thêm `theme-map.js` vào danh sách tools; `_src/` cho script nguồn.
- `new-theme/SKILL.md` và `theme-from-link/SKILL.md`: bước pack tạo map + ≤ 15 dòng ghi chú.
- `new-theme/RUNLOG.md`: đổi quy ước `_work/patch-*.js` thành `_src/`.
- Tiêu chí: ba file có luật; không còn chỗ nào bảo đặt script nguồn trong `_work/`.
- Kiểm tra: `grep -rn "_work/patch\|_work/build" CLAUDE.md .claude/skills/new-theme .claude/skills/theme-from-link` không
  còn hướng dẫn cũ.
- Phụ thuộc: T6, T7. File: `CLAUDE.md`, `.claude/skills/new-theme/SKILL.md`, `.claude/skills/new-theme/RUNLOG.md`,
  `.claude/skills/theme-from-link/SKILL.md`. Cỡ: S.
- **Xong 2026-11-20.** theme-from-link bước 1: theme đã có → đọc map thay vì khám phá code.

### Checkpoint 3 (2026-11-20)
- [x] test 89/90 (còn test cũ `install-shopdy-skill`, xem Checkpoint 1) · [x] `pack.js` 0 lỗi cho base-theme + 10 theme,
  không zip nào có `_map/` / `_src/` (3 theme Lunara giữ cảnh báo cũ `theme.css exists`) · [x] base: smoke 50/50,
  mobile-audit 0 lỗi 0 cảnh báo · [x] SPEC-theme-map: xong (trừ tiêu chí 7) · [ ] duyệt với người dùng (cùng Checkpoint 4,
  người dùng bảo chạy hết mọi việc)

## Phase 3: media-grab ([SPEC-media-grab.md](SPEC-media-grab.md))

### T9: Tách `collectRefs()`
Chuyển `collectRefs()` của `download-page.js` sang `tools/lib/collect-refs.js`; download-page dùng lại, không đổi hành vi.
- Tiêu chí: `download-page.test.js` xanh không đổi một dòng test nào.
- Kiểm tra: `cd tools && npm test`.
- Phụ thuộc: không. File: `tools/lib/collect-refs.js`, `tools/download-page.js`. Cỡ: S.
- **Xong 2026-11-20.** `download-page.test.js` 14/14, không đổi test nào.

### T10: `lib/media-grab.js`
Các hàm thuần:
- đọc dữ liệu sản phẩm: Shopify `.js` (ảnh, biến thể, video), JSON shopdy trong trang, JSON-LD;
- URL bản gốc của CDN Shopify;
- nhóm `variants` / `description` (thêm vào `media-pick.classify`, kết quả cũ không đổi);
- tên `NNN-<name>`, `media.json`, tóm tắt ≤ 30 dòng.
- Tiêu chí: test với JSON fixture cho cả ba loại dữ liệu; `media-pick.test.js` xanh không đổi.
- Kiểm tra: `cd tools && npm test`.
- Phụ thuộc: T9. File: `tools/lib/media-grab.js`, `tools/lib/media-pick.js`, `tools/test/media-grab.test.js`,
  `tools/fixtures/media-grab/*.json`. Cỡ: M.
- **Xong 2026-11-20.** `media-pick` thêm `pictureKey` (export), cờ `variant` / `description` / `review` (chỉ
  media-grab đặt; giữ qua bỏ trùng; cờ review xếp sau gallery).

### T11: CLI `media-grab.js`, lượt desktop
Mở trang 1440 px, cuộn hết, đóng pop-up, `collectRefs` + nhận phần mô tả, lấy `/products/<handle>.js` (đúng handle),
tải (chỉ `image/*` / `video/*`), HLS Shopify → MP4, bỏ trùng, ghi `images/` `videos/` `media.json`, in tóm tắt; mặc định
`--out downloads/<host>-<handle>/`; thêm `downloads/` vào `.gitignore`.
- Tiêu chí: trên fixture kiểu Shopify, test 1, 2, 3, 6 của spec xanh (nhóm, bỏ trùng, MP4, chỉ request trang + file +
  `.js` của đúng handle, tóm tắt ≤ 30 dòng).
- Kiểm tra: `cd tools && npm test`.
- Phụ thuộc: T10. File: `tools/media-grab.js`, `tools/fixtures/media-grab/shopify/**`, `tools/test/media-grab.test.js`,
  `.gitignore`. Cỡ: M.
- **Xong 2026-11-20.** Poster để cạnh video (`-poster.<ext>`), không tính là ảnh.

### T12: Lượt mobile, shopdy, bot check, các cờ
Lượt 390 px (`--desktop-only` để bỏ); fixture kiểu shopdy (JSON trong trang); trang bot check → exit 2; `--only`,
`--refresh` (thư mục đã có mà không có cờ → exit 1), `--max-mb`, bỏ pixel / `data:`.
- Tiêu chí: test 4 của spec xanh; ảnh chỉ có ở mobile được tải; fixture shopdy ra đúng `gallery`.
- Kiểm tra: `cd tools && npm test`.
- Phụ thuộc: T11. File: `tools/media-grab.js`, `tools/fixtures/media-grab/shopdy/**`, `tools/fixtures/media-grab/blocked/**`,
  `tools/test/media-grab.test.js`. Cỡ: M.
- **Xong 2026-11-20.** Tải lại 403 / 429 / 5xx sau 1,5 s rồi 5 s (2 luồng): CDN Shopify từ chối khi tải dồn.

### T13: `--to-theme` và `--sheet`
- `media-library.js` thêm `--from <dir>` (mặc định `_work/site`, hành vi cũ không đổi).
- `media-grab` ghi `assets.json` tương thích vào thư mục out rồi gọi media-library với `--prefix`.
- `--sheet` gọi `contact-sheet.js`.
- Tiêu chí: test 5 của spec xanh (WebP, video, `_work/media-map.json`, pack 0 lỗi); `media-library.test.js` xanh không
  đổi.
- Kiểm tra: `cd tools && npm test`.
- Phụ thuộc: T12. File: `tools/media-library.js`, `tools/media-grab.js`, `tools/test/media-grab.test.js`. Cỡ: S.
- **Xong 2026-11-20.** `--from` = thêm vào thư viện: không xoá gì, bản gốc ở `_work/images/<prefix>-<group>/`, tên đã có
  chủ (ảnh khác) → dừng trước khi ghi.

### T14: Link thật và tài liệu
Chạy với link shape-curve.com (Shopify) và một trang sản phẩm vesnacharm.com / tammycharm.com (shopdy), ra thư mục tạm.
Sửa những gì trang thật khác fixture (thêm vào fixture rồi test). Thêm `media-grab.js` vào danh sách tools của CLAUDE.md.
- Tiêu chí: tiêu chí 1–3 của SPEC-media-grab.
- Kiểm tra: số trong tóm tắt so với dữ liệu sản phẩm; thời gian ≤ 90 giây; test xanh.
- Phụ thuộc: T13, T8 (cùng sửa CLAUDE.md). File: `CLAUDE.md`, có thể `tools/media-grab.js` + fixture. Cỡ: S.
- **Xong 2026-11-20**, kết quả:
  - shape-curve.com: **bot check ở cả desktop lẫn mobile** (403 "Browser verification") → exit 2, không ghi gì, không vượt.
    Thay bằng link Shopify khác của người dùng, getionix.com: 21 ảnh trong dữ liệu sản phẩm; 52 ảnh, 7 video
    (54,6 MB), 0 lỗi, 67 giây. Một ảnh sản phẩm hiện cả trong khối review bị xếp `reviews` → đã sửa (gallery thắng),
    có test; lần chạy lại để xác nhận bị bot check (lần thứ 3), dừng.
  - tammycharm.com (shopdy): 86 ảnh, 8 video (56 MB) trong 27 giây; gallery 22; 6 video "See them in motion" có mặt.
  - Tóm tắt ≤ 11 dòng; Claude không đọc ảnh nào.

### Checkpoint 4 (2026-11-20)
- [x] test 99/100 (còn test cũ `install-shopdy-skill`) · [x] link thật: shopdy đạt; Shopify đạt trên getionix.com,
  shape-curve.com bị bot check · [x] trạng thái các spec cập nhật · [ ] duyệt với người dùng, rồi viết spec đợt 2

## Đợt 2–4 (2026-11-20, làm liền theo yêu cầu "code hết tất cả các đợt")

- [x] Sửa media-grab khi bị chặn: `lib/page.js openPage` (429 → chờ `Retry-After` ≤ 60 s rồi thử lại một lần; `--headed`
  → người dùng tự qua bot check, tool chờ ≤ 3 phút; cookie mang sang lượt mobile và các lần tải), thông báo phân biệt
  429 / trang xác minh. Test: 429 có Retry-After, trang xác minh tự qua (giả lập người bấm), ảnh cần cookie.
- [x] `cost-meter`: lệnh grep / sed / cat chạy sau khi `cd` vào theme cũng là đọc code theme (cwd của dòng transcript).
- [x] `theme-map`: số dòng của mỗi file đích trong script `_src/` (`--part`, "edited by … (script lines a-b)").
- [x] `edit-check` ([SPEC](SPEC-edit-check.md)) · `tools/edit-check.js`, `tools/test/edit-check.test.js` (4 test).
- [x] `lib/fetch-media.js`: tải file dùng chung (media-grab chuyển sang dùng, 12 test vẫn xanh).
- [x] `section-grab` ([SPEC](SPEC-section-grab.md)) · `tools/section-grab.js`, fixture `section.html`, 2 test; chạy thật
  trên tammycharm.com.
- [x] `platform-guide` ([SPEC](SPEC-platform-guide.md)) · guide 9 mục, `tools/platform-guide-check.js`, 1 test.
- [x] `theme-edit` ([SPEC](SPEC-theme-edit.md)) · `.claude/skills/theme-edit/` (SKILL + 2 reference).
- [x] `link-slim` ([SPEC](SPEC-link-slim.md)) · `tools/run-brief.js` + test; theme-from-link và new-theme SKILL.
- [x] CLAUDE.md, README.
- [ ] Đo ở các phiên thật tiếp theo (`transcript-cost.js --by-request --fresh`) và ghi vào SPEC-theme-token-cost.
- [ ] shape-curve.com: chạy lại `media-grab … --headed` khi hết giới hạn 429 (người dùng tự qua bước xác minh).
