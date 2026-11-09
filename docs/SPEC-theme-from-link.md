# Spec: skill `theme-from-link` — tạo theme từ đường link

Trạng thái: **đã duyệt ngày 2026-11-08**, kèm các chỉnh sửa trong phần *Quyết định đã chốt*.
Kế hoạch: [tasks/plan.md](tasks/plan.md).

## Mục tiêu

Người dùng gửi **một đường link** (hoặc vài link, mỗi link một trang). Với mỗi link, agent:

1. **chỉ tải đúng trang của link đó**, không đi sang trang khác. Tải về HTML, CSS, JS, font và **tất cả ảnh, video**
   của trang, kèm ảnh chụp desktop (1440) và mobile (390). Kết quả là một bản sao xem lại được offline;
2. dựng theme mới từ `base-theme`, **cùng cấu trúc với các theme trong `themes/`**, khớp với bản đã tải;
3. giao file zip như skill `new-theme` (`node tools/pack.js`, 0 lỗi).

Người dùng của skill: người làm theme, ra lệnh cho Claude Code ngay trong repo này.

So với skill `new-theme` hiện có:

| | `new-theme` hiện tại | `theme-from-link` |
| --- | --- | --- |
| Đầu vào | link của từng trang, hoặc ảnh chụp | link của từng trang (ảnh chụp vẫn dùng `new-theme`) |
| Lưu lại | DOM đã render, ảnh chụp, tối đa 160 ảnh, font đang dùng | thêm **toàn bộ CSS / JS / font / ảnh / video**, xem lại offline |
| Ảnh / video trang SP | không tải | tải **hết** vào `_work/`; ảnh chỉ để tham khảo, video thành mặc định của ô video (từ 2026-11-09) |
| Đo và so sánh | trên site thật (có thể bị chặn bot, có thể đổi giữa chừng) | trên bản offline, ổn định, chạy lại không cần mạng |

### Quyết định đã chốt (2026-11-08)

1. Phạm vi: **một link = một trang**. Không tự tìm hay tải trang nào khác. Trang nào không có link thì theme dùng
   bố cục của base, phủ màu và font của theme.
2. Tải **tất cả ảnh và video** của trang, **không giới hạn** số file hay dung lượng (tool in tổng dung lượng).
3. Ảnh trang SP: chỉ để tham khảo trong `_work/`; trong theme, các ô ảnh vẫn để trống. **Sửa ngày 2026-11-09**
   ([docs/SPEC-theme-from-link-videos.md](docs/SPEC-theme-from-link-videos.md)): video của bản gốc, ở mọi trang kể cả
   trang SP, được chép nguyên file vào theme làm mặc định của ô video.
4. Cách dựng: **dựng lại trên markup của base**. Mọi quy tắc của `new-theme` giữ nguyên, không bê nguyên CSS/HTML gốc.
5. Cấu trúc theme: **cấu trúc chung của `themes/*`** (bản sao `base-theme`, khởi tạo bằng `tools/new-theme.js`).
6. Template SP thứ hai (ví dụ trang bundle): **chỉ khi người dùng gửi link** của trang đó.
7. **Không chụp ngăn giỏ hàng** của site gốc.
8. Bản offline được phép khác site thật **≤ 5 %** điểm ảnh ở mỗi trang.
9. Tên skill là `theme-from-link`. Đầu vào là link thì luôn dùng skill này; đầu vào là ảnh chụp thì dùng `new-theme`.

### Giả định

1. `base-theme/` **không đổi** (không bump version). "Base code" ở đây là công cụ và skill của repo.
2. **Không thêm npm dependency**: dùng Playwright 1.48.2, pixelmatch, pngjs đã có. Test dùng `node:test` có sẵn
   (Node 26).
3. Không trang nào cần đăng nhập. Không thêm vào giỏ, không checkout, không gửi form trên site gốc.
4. Quy tắc dựng chỉ nằm ở `new-theme/SKILL.md`; skill mới tham chiếu tới đó, không chép lại, để hai bên không lệch nhau.

### "Tất cả ảnh và video" nghĩa là gì

Mỗi ảnh hoặc video **khác nhau** mà trang tham chiếu ở 1440 hoặc 390 đều được tải:

- `img`, `picture source`, `srcset` / `data-srcset`: bản lớn nhất và bản trình duyệt đã dùng. Các kích cỡ trung gian
  của cùng một ảnh không tải; `srcset` được viết lại chỉ còn những bản đã tải;
- `data-src` (ảnh lazy), ảnh trong tab, slide hay accordion đang ẩn;
- ảnh nền trong `style` inline và trong mọi file CSS của trang, kể cả ảnh của breakpoint khác;
- `video[src]`, `video source` (mọi file trực tiếp như mp4 / webm / mov), `poster`;
- từ 2026-11-09: video trong `<template>`, trong JSON / script inline, sau link `.mp4`; stream HLS (cả loại phát qua
  `blob:`) → MP4 của bản cao nhất với Shopify, các đoạn + playlist với stream khác.

Không tải được và chỉ ghi vào `skipped`: iframe nhúng của bên thứ ba (YouTube, Vimeo…; giữ khung, `src` →
`about:blank`), stream mã hoá / byte-range / DASH.

## Luồng

```
link ─► tools/new-theme.js        scaffold themes/<slug>/ từ base-theme (chỉ ở link đầu tiên)
     ─► tools/download-page.js    trang thật ─► _work/site/pages/<name>/ + _work/site/_m/   (DOM, ảnh chụp, tài nguyên)
                                  bản offline ─► kiểm tra (0 request ra ngoài, 0 lỗi 404, ≤ 5 % khác biệt)
                                  bản offline ─► capture.js ─► _work/capture/<name>/   (tokens, sections, text, fonts)
     ─► Bước 3–8 của new-theme     map → build → so với bản đã tải → verify → pack → report
```

### Tên trang và chỗ của nó trong theme

`download-page.js` đoán tên từ URL; `--name` ghi đè.

| URL | `name` | Chỗ trong theme |
| --- | --- | --- |
| `/` | `home` | `templates/index.hbs` + settings `home_*` |
| `/products/…` | `product` (link SP thứ hai: `--name product-<x>`) | `templates/product.json` (`product-<x>` → `product.<x>.json`) |
| `/collections/…` | `collection` | `templates/collection.hbs` |
| `/search…` | `search` | `templates/search.hbs` |
| `/pages/contact…` | `contact` | `templates/page.hbs` + section `contact-form` |
| `…track…` | `tracking` | `templates/page.hbs` + `tracking-result.hbs` (không sửa script) |
| `/policies/…` | `policy` | `templates/page.hbs` |
| khác | `page` | `templates/page.hbs` |

Trùng tên đã có trong `manifest.json` thì báo lỗi, trừ khi có `--refresh` (tải lại) hoặc đổi `--name`.

## Commands

```bash
# cài một lần
cd tools && npm install && npx playwright install chromium

# 1. scaffold (ở link đầu tiên)
node tools/new-theme.js "<Name>" --source "<url>"

# 2. mỗi link một lệnh (chạy nền): tải → kiểm tra bản offline → capture trên bản offline
node tools/download-page.js <url> themes/<slug> [--name product] [--keep-popups] [--no-capture] [--refresh]

# 3. mở bản offline cho shot.js / pixel.js (mọi host ngoài bị chặn)
node tools/site-server.js themes/<slug> --port 8092
#    http://localhost:8092/<name>; User-Agent điện thoại hoặc ?view=mobile → DOM mobile

# 4. dựng và kiểm tra, y như new-theme
node tools/preview-server.js themes/<slug> --port 8091
node tools/visual-diff.js themes/<slug>/_work/site/pages/product/desktop.png http://localhost:8091/product --out themes/<slug>/_work/diff
node tools/visual-diff.js themes/<slug>/_work/site/pages/product/mobile.png http://localhost:8091/product --width 390 --out themes/<slug>/_work/diff
node tools/smoke.js http://localhost:8091
node tools/mobile-audit.js http://localhost:8091
node tools/style-audit.js http://localhost:8091 themes/<slug>
node tools/pack.js themes/<slug>

# test của công cụ mới
cd tools && npm test            # = node --test "test/*.test.js"
```

`download-page.js` in một dòng tóm tắt cho mỗi trang: name → url → trạng thái (ok / blocked) → số ảnh, video, CSS,
font, JS và tổng dung lượng → số request ra ngoài và số lỗi 404 khi xem offline → % khác biệt desktop / mobile.

## Cấu trúc

Mã và tài liệu thêm hoặc sửa:

```
.claude/skills/theme-from-link/SKILL.md  skill mới (viết tiếng Anh như các skill khác; nói với người dùng bằng tiếng Việt)
tools/download-page.js                   tải 1 trang + dựng bản offline + kiểm tra + (mặc định) chạy capture.js trên bản offline
tools/site-server.js                     phục vụ _work/site/ dạng tĩnh, chặn host ngoài, content-type lấy từ assets.json, hỗ trợ Range cho video
tools/lib/mirror.js                      hàm thuần, chạy được cả trong node lẫn trình duyệt: URL → đường dẫn local, viết lại CSS / srcset, đoán tên trang, nhận diện trang chặn bot
tools/lib/page.js                        tách từ capture.js: UA, settle, clearPopups; capture.js giữ nguyên hành vi
tools/test/*.test.js                     test bằng node:test
tools/fixtures/site/                     site giả: trang product (CSS @import, url(), font, srcset, ảnh lazy, tab ẩn, video, iframe), trang home, trang 403
tools/pack.js                            thêm kiểm tra: ảnh / video trong assets/ trùng byte với ảnh nội dung của trang SP đã tải → ERROR
tools/package.json                       thêm script "test"
.claude/skills/new-theme/SKILL.md        đầu vào là link → theme-from-link; nới quy tắc ảnh SP (được nằm trong _work/site/, vẫn cấm vào theme)
.claude/skills/new-theme/RUNLOG.md       ghi cả các lượt chạy theme-from-link (thêm cột thời gian download)
CLAUDE.md                                thêm các tool mới và quy tắc chọn skill
```

Kết quả của một lượt chạy. Không commit, không đóng gói (`themes/*/_work/` đã có trong `.gitignore`, `pack.js` bỏ
qua thư mục `_*`):

```
themes/<slug>/_work/site/
  manifest.json            { pages: [{ name, url, title, fetchedAt, blocked: [], check: { external, notFound, diffDesktop, diffMobile } }],
                             skipped: [{ url, page, reason }] }
  assets.json              { "<url gốc>": { file, contentType, bytes, pages: [name], area: header|main|footer, rendered: { w, h } } }
  pages/<name>/index.html  DOM desktop đã render; link tài nguyên đổi sang /_m/…; bỏ <script> và thuộc tính on*;
                           shadow root mở (widget của app) giữ lại dạng declarative shadow DOM; cây mà trình phân tích
                           HTML không dựng lại được (div trong p, a trong a) → phần tử trong thành <span> giữ display;
                           chỉ thêm một script nhỏ định nghĩa rỗng các custom element (CSS hay ẩn `x-y:not(:defined)`)
  pages/<name>/mobile.html DOM mobile (UA iPhone, rộng 390)
  pages/<name>/desktop.png, mobile.png   ảnh chụp toàn trang từ TRANG THẬT, là chuẩn để so sánh
  pages/<name>/offline-desktop.png, offline-mobile.png   ảnh chụp bản offline (để xem chỗ khác khi vượt 5 %)
  _m/<host>/<path>         mọi CSS / JS / font / ảnh / video, dùng chung giữa các trang; giữ host trong đường dẫn để các
                           regex cũ (fonts.gstatic, fonts.googleapis) trong capture.js / style-audit.js vẫn khớp
themes/<slug>/_work/capture/<name>/   như hiện nay (tokens.json, sections, text.txt, fonts.json, fonts/…), nhưng chạy trên
                                      bản offline; trang product-* vẫn dùng --no-images (ảnh gốc đã nằm trong _work/site)
```

Cấu trúc theme đầu ra giống hệt `themes/club-ritual`, `themes/peakflex`, `themes/resilia`: `layout/`, `templates/`
(`index.hbs`, `product*.json`, `collection.hbs`, `search.hbs`, `page.hbs`, `tracking-result.hbs`, `checkout.hbs`),
`sections/*.hbs` + `.schema.json`, `snippets/`, `assets/css/skin.css`, `assets/fonts/`, `config/settings_*.json`,
`sample/product.json`, `theme.json`, `README.md`, `CHANGELOG.md`.

## Code style

Theo đúng kiểu các tool trong `tools/`: CommonJS, `'use strict'`, đầu file là comment hướng dẫn dùng, đọc tham số
giống `capture.js`, không thêm dependency, thụt 2 dấu cách, nháy đơn, có chấm phẩy, dòng ≤ 120 ký tự. Hàm trong
`tools/lib/mirror.js` là hàm thuần, không dùng module của node, nên vừa `require` được vừa đưa được vào trang bằng
`page.evaluate`.

```js
/*
 * Pure helpers shared by download-page.js (node) and the page it snapshots (browser): no node modules here.
 */
'use strict';

// FNV-1a, 32-bit, hex: a short stable name for over-long URLs (works in node and in the page).
function hash(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

// Local path of a downloaded URL. Keeps the host so host checks (fonts.gstatic …) still match; a path without
// an extension becomes <path>/__index so "/a" and "/a/b" never collide; Windows-safe; hashed when too long.
function localPath(u) {
  const { host, pathname, search } = new URL(u);
  let p = decodeURIComponent(pathname).replace(/[<>:"|?*\\]/g, '_');
  if (!/\.[a-z0-9]{1,5}$/i.test(p)) p = p.replace(/\/?$/, '/__index');
  if (search) p += '__' + search.slice(1).replace(/[^\w.=-]+/g, '_');
  if (p.length > 180) p = p.slice(0, 160) + '-' + hash(u);
  return '_m/' + host + p;
}

module.exports = { hash, localPath };
```

## Chiến lược test

- **Công cụ, tự động** (`cd tools && npm test`, chạy offline). Bật site giả `tools/fixtures/site/` ở một cổng ngẫu
  nhiên rồi kiểm:
  - chỉ trang của link được tải: không có request document nào tới trang home của site giả, dù trang product có link sang;
  - mọi ảnh và video được tham chiếu đều có trong `_m/` (CSS `@import`, `url()` trong CSS, `srcset`, ảnh lazy, ảnh
    trong tab ẩn, ảnh nền của breakpoint khác, video, poster, font); `assets.json` ghi đúng trang dùng nó;
  - xem lại bằng `site-server.js` với mọi host ngoài localhost bị chặn: **0 request ra ngoài, 0 lỗi 404**, ở cả 1440 và 390;
  - độ giống: ảnh chụp bản offline so với site giả **≤ 1 %** điểm ảnh khác;
  - trang trả 403 / "Just a moment…": thử lại 1 lần, rồi thoát với mã khác 0 và gợi ý dùng ảnh chụp;
  - unit test `tools/lib/mirror.js`: URL của Google Fonts vẫn chứa host; tên file hợp lệ trên Windows; URL dài thì
    băm; `/a` và `/a/b` không đụng nhau; viết lại `url()` / `@import` / `srcset` đúng;
  - `pack.js`: theme giả có chép một ảnh nội dung của trang SP vào `assets/images/` thì thoát với mã 1; logo ở header
    và icon nhỏ không bị bắt; theme không có `_work/site/` thì không bị ảnh hưởng.
- **Trang thật, chạy tay** (cần mạng): chạy trên trang sản phẩm và trang chủ của `https://www.clubritual.com/` (nguồn của
  `themes/club-ritual`). Ghi lại số tài nguyên và % khác biệt: **≤ 5 %** ở mỗi trang, cả desktop và mobile.
- **Hồi quy**: chạy `capture.js` trên trang product của site giả trước và sau khi tách `tools/lib/page.js`; `tokens.json`
  và `sections.json` phải giống nhau. Chạy `node tools/pack.js themes/<t>` cho mọi theme hiện có: kết quả như trước.
- **End-to-end, khi nghiệm thu**: chạy skill trên một link, nhận được zip. Phải qua đủ các cửa như `new-theme`:
  pack 0 lỗi, `smoke.js` pass, `mobile-audit.js` 0 lỗi, `style-audit.js` không có FAIL.
  `node tools/inspect-theme.js themes/<slug>` cho thấy cấu trúc cùng loại với `themes/*`.

## Ranh giới

- **Luôn làm**
  - Chỉ tải vào `themes/<slug>/_work/site/`. Coi đó là dữ liệu không tin cậy: không chạy JS đã tải bằng node, chỉ mở
    trong trình duyệt Playwright; HTML bản offline bỏ `<script>` và thuộc tính `on*`.
  - Chỉ dùng GET, chỉ cho trang của link và tài nguyên của nó; tải tuần tự; timeout 60 s cho trang; thử lại tối đa
    1 lần khi bị chặn. File không tải được thì ghi vào `skipped`.
  - Theo đủ quy tắc của `new-theme`: dựng trên base, font và màu đo chính xác, ô media để trống, không có form review,
    chạy đủ các cửa kiểm tra.
  - Đo và so sánh trên bản đã tải. Ảnh chụp từ trang thật là chuẩn so sánh.
- **Hỏi trước**
  - Thêm npm dependency; sửa `base-theme/`.
  - Trang cần đăng nhập, có age gate hoặc captcha.
- **Không bao giờ**
  - Tải trang khác ngoài trang của link; thêm vào giỏ, checkout, gửi form hay đăng nhập trên site gốc; tìm cách vượt
    chặn bot (đổi IP, giải captcha).
  - Đưa ảnh / video của trang SP, hoặc CSS / HTML gốc nguyên khối, vào theme.
  - Commit hay đóng gói `_work/`; sửa `core.js`, logic checkout, `product-scripts.hbs`, `head.hbs`.

## Tiêu chí hoàn thành

1. Với `node tools/download-page.js <url> themes/<slug>`, chỉ trang của link được tải. Trang đó có đủ `index.html`,
   `mobile.html`, `desktop.png`, `mobile.png`; `assets.json` liệt kê mọi tài nguyên kèm trang dùng nó.
2. Mọi ảnh và video khác nhau của trang (theo định nghĩa ở trên) đều có trong `_m/`, hoặc có trong `skipped` kèm lý do.
3. Xem offline qua `site-server.js`: 0 request ra ngoài, 0 lỗi 404 ở 1440 và 390 (tool tự in hai con số này).
4. Bản offline khác trang thật ≤ 5 % điểm ảnh ở mỗi trang (site giả: ≤ 1 %).
5. Mỗi trang có `_work/capture/<name>/` như hiện nay, chạy trên bản offline. Font Google vẫn được nhận là Google
   (`tokens.googleFonts` có giá trị, file của `fonts.gstatic` không bị tính là font tự host).
6. Trang bị chặn: thoát rõ ràng sau tối đa 1 lần thử lại, gợi ý chuyển sang `new-theme` với ảnh chụp.
7. `cd tools && npm test` pass.
8. `pack.js` báo ERROR khi `assets/` chứa ảnh / video nội dung của trang SP đã tải. Các theme hiện có pack ra kết quả
   như trước.
9. Skill chạy trọn từ link: theme có cấu trúc `themes/*`, pack 0 lỗi, `smoke.js` pass, `mobile-audit.js` 0 lỗi,
   `style-audit.js` không có FAIL. Báo cáo bằng tiếng Việt, kèm danh sách trang đã tải, file bị bỏ qua, và các trang
   không có link (dùng bố cục base).
10. `CLAUDE.md`, `new-theme/SKILL.md`, `RUNLOG.md` được cập nhật; `base-theme/` không đổi.
