# Spec: ảnh và video của store mẫu vào theme — skill `theme-from-link`

Trạng thái: **đã duyệt ngày 2026-11-09**, kèm các quyết định bên dưới · Kế hoạch: [plan-theme-from-link-images.md](plan-theme-from-link-images.md) · Sửa đổi cho [SPEC-theme-from-link.md](SPEC-theme-from-link.md) (quyết định số 3)
và [SPEC-theme-from-link-videos.md](SPEC-theme-from-link-videos.md) (giả định 3, các dòng "ảnh trang SP vẫn như cũ").

## Mục tiêu

Yêu cầu của bạn: khi dùng `theme-from-link`, tải **tất cả ảnh và video** của store mẫu về, đưa vào thư mục images của theme để
tái sử dụng. Chấp nhận ảnh còn thương hiệu của họ, bạn sẽ thay sau.

Hiện tại làm ngược lại: ảnh trang sản phẩm chỉ nằm trong `_work/site/` để tham khảo, mọi ô ảnh để trống, `pack.js` báo **lỗi** nếu
có file trùng. Sau thay đổi, với theme dựng từ link:

1. Theme vừa dựng xong đã hiện đúng ảnh của bản gốc ở mọi ô, không cần tải lên gì thêm.
2. Mọi ảnh nội dung nằm trong `assets/images/<prefix>-<nhóm>/`, video trong `assets/videos/<prefix>-<nhóm>/`. Bản gốc chưa nén nằm riêng trong
   `_work/images/`, chia nhóm, đúng đuôi file, dễ tìm.
3. Ảnh gốc chỉ là **mặc định**: merchant chọn ảnh khác trong theme editor thì ảnh đó thay ngay.
4. `pack.js` không chặn nữa, thay vào đó in danh sách ảnh còn nguyên của store mẫu để bạn biết còn phải thay gì.

`new-theme` (dựng từ ảnh chụp) không đổi.

### Quyết định đã chốt (2026-11-09)

| # | Câu hỏi | Chốt |
| --- | --- | --- |
| 1 | Dạng ảnh trong zip | **WebP** tối đa 1600 px; file gốc ở `_work/images/` |
| 2 | Ảnh review của khách, avatar Facebook | **Có vào zip**, ở `assets/images/<prefix>-reviews` và `-hidden`; không gắn vào ô nào, không thành review |
| 3 | Sửa `base-theme` | **Có**: thêm `default_image`, bump version |
| 4 | Video của section ẩn | **Có vào zip**, ở `assets/videos/<prefix>-hidden`; giới hạn upload của Adlux vẫn chưa rõ, `pack.js` in dung lượng |
| 5 | Theme đã có | **Không** áp dụng, trừ **Tredvik** để thử |

### Số liệu đo trên hai lần tải đã có

| | Tredvik (1 trang SP) | Maggie's Tanks (home + SP) |
| --- | --- | --- |
| File ảnh đã tải | 364 | 89 |
| Ảnh khác nhau, lấy bản lớn nhất | 45 ảnh, 34,9 MB | 53 ảnh, 7,8 MB |
| Cùng số ảnh đó, WebP tối đa 1600 px | **2,7 MB** | **2,3 MB** |
| Video | 0 | 10 file, 173,8 MB (7 file đang hiện: zip 83,6 MB) |

- 319 file bị loại ở Tredvik là 235 cờ của ô chọn quốc gia, 5 pixel theo dõi và các cỡ nhỏ của cùng một ảnh.
- 45 ảnh của Tredvik gồm: 9 ô ảnh trên trang · 7 gallery sản phẩm (33 MB bản gốc, 1,3 MB WebP) · 4 icon · 2 logo · 4 ảnh review của khách
  · 18 ảnh của khối bình luận Facebook đang ẩn (16 là avatar đặt theo tên người thật) · 1 icon của widget Judge.me.
- Một ảnh gallery gốc nặng tới 6 MB, trong khi ngân sách cả trang của `mobile-audit` là 2 MB. Đuôi file tải về cũng sai ở 12/45 và 35/53 ảnh
  (tên `.png` nhưng nội dung là WebP / AVIF).

### Giả định (sửa giúp nếu sai)

1. Ảnh vào theme là **WebP tối đa 1600 px**, chất lượng 0,82 (SVG, GIF giữ nguyên), để giữ chuẩn tốc độ mobile. File gốc từng byte vẫn có
   trong `_work/images/`. Video vẫn giữ nguyên file, như đã chốt trước đây (câu hỏi mở 1).
2. "Images" nghĩa là thư mục `assets/images/` của theme. Video ở lại `assets/videos/` vì đó là cấu trúc đang có. Chỉ một cấp thư mục con (`images/tv-sections/`, như `images/pay/`), vì chưa theme nào thử đường dẫn sâu hơn trên Adlux.
3. "Tất cả" = mọi ảnh nội dung, kể cả ảnh của slide đang ẩn. Không lấy cờ quốc gia, pixel theo dõi, cỡ nhỏ trùng ảnh, và iframe bên thứ ba
   (YouTube, Vimeo) như cũ.
4. Sản phẩm chính vẫn lấy từ dữ liệu platform. Ảnh gallery vào theme để bạn dùng lại và để preview giống bản gốc, nhưng không viết cứng vào
   template. Trên store thật bạn tải chúng lên sản phẩm trong admin; báo cáo liệt kê các file này.
5. Ảnh review của khách và avatar Facebook vào zip nhưng không gắn vào ô nào (quyết định 2).
6. Một link vẫn là một trang. Không crawl thêm trang khác.

### Rủi ro cần biết

Các ảnh này là tài sản của store mẫu, có logo và sản phẩm của họ. Tải về để dựng thì ít rủi ro; rủi ro nằm ở chỗ đưa zip lên store đang bán khi
chưa thay ảnh (khiếu nại bản quyền, bị gỡ quảng cáo, tranh chấp thanh toán). Bạn đã chấp nhận và sẽ tự thay, nên công cụ không chặn, chỉ nhắc
qua `pack.js` và báo cáo. Nên thay xong rồi mới bật theme cho khách.

## Thiết kế

### A. Thư viện ảnh: tool mới `tools/media-library.js`

Chạy sau `download-page.js`. Đọc `_work/site/assets.json`, rồi:

1. Loại file thừa: host cờ, ảnh dưới 200 byte, các cỡ nhỏ của cùng một ảnh (giữ bản lớn nhất), file trùng từng byte.
2. Chia nhóm: `sections` (ô ảnh trên trang) · `gallery` · `icons` · `brand` (logo) · `reviews` · `hidden` (section ẩn).
   `download-page.js` phải ghi thêm vào `assets.json` các trường `section` (section chứa ảnh) và `gallery: true`, vì hiện chỉ có `area`.
3. Ghi `_work/images/<nhóm>/<tên>.<đuôi thật>` (file gốc) + `contact-sheet.png`.
4. Ghi `assets/images/<prefix>-<nhóm>/<tên>.webp` cho mọi nhóm. Video chép nguyên file vào `assets/videos/<prefix>-<nhóm>/`, kể cả video của section ẩn.
5. Ghi `_work/media-map.json`: URL gốc → file gốc → file trong theme → sha1 → section → cỡ hiển thị.
6. Chạy lại an toàn: file trong `assets/` đã khác sha1 (bạn đã thay) thì **giữ nguyên** và báo `kept`.

### B. Ô ảnh nhận mặc định: setting `default_image`

Mọi ô ảnh trong base (32 ô, 10 section) thêm setting chữ `default_image` (nhiều ô trong một block: `default_<id ô>`), là đường dẫn tính từ `assets/` (`images/tv-sections/a.webp`, `videos/tv-sections/b.mp4`), chỉ dùng khi ô trống. Để trống thì vẫn
hiện khung placeholder như hiện nay, nên theme cũ không đổi. Làm ở `base-theme` vì mọi lượt chạy đều cần (câu hỏi mở 3).

### C. `pack.js` và `media-guard.js`

- Bỏ lỗi "file trùng ảnh trang SP" và cảnh báo trùng tên.
- In thêm: `originals: N images from the sample store still in the theme, X MB → _work/media-to-replace.md`. File đó liệt kê ảnh nào, ở ô nào.
  Ảnh đã đổi sha1 so với `media-map.json` thì không tính.

### D. Quy tắc và tài liệu

`theme-from-link/SKILL.md` thêm bước chạy `media-library.js`, ghi bảng ô ↔ ảnh vào `plan.md`, điền `default_image` trong `_work/build-*-product.js`, báo cáo
danh sách ảnh cần thay và ảnh cần tải lên sản phẩm. `new-theme/SKILL.md` ghi rõ quy tắc "ô ảnh để trống" chỉ áp dụng khi dựng từ ảnh chụp. Cập nhật hai spec
ở đầu trang, `CLAUDE.md`, `base-theme/README.md`, `CHANGELOG.md` của base.

## Commands

```bash
node tools/download-page.js <url> themes/<slug>                 # như cũ, thêm section / gallery trong assets.json
node tools/media-library.js themes/<slug> --prefix tv [--max 1600] [--quality 0.82]
node tools/preview-server.js themes/<slug> --port 8091
node tools/visual-diff.js themes/<slug>/_work/capture/product/desktop.png http://localhost:8091/product --out themes/<slug>/_work/diff
node tools/smoke.js http://localhost:8091 && node tools/mobile-audit.js http://localhost:8091
node tools/pack.js themes/<slug>                                # in dòng originals, 0 lỗi
cd tools && npm test
```

## Cấu trúc thay đổi

```
tools/media-library.js            mới: chạy cả quy trình, WebP, media-map, contact sheet
tools/lib/media-pick.js           mới: hàm thuần lọc, chia nhóm, đặt tên
tools/download-page.js            assets.json thêm section, gallery
tools/lib/media-guard.js          từ chặn sang báo cáo ảnh còn nguyên
tools/pack.js                     dòng originals, ghi _work/media-to-replace.md
tools/scripts/to-webp.js          nhận thêm AVIF
tools/test/media-library.test.js  mới
tools/test/media-guard.test.js    đổi theo hành vi mới
base-theme/sections/*             default_image cho 32 ô; bump version, CHANGELOG, README
.claude/skills/theme-from-link/SKILL.md, .claude/skills/new-theme/SKILL.md, CLAUDE.md, docs/SPEC-theme-from-link*.md
themes/tredvik/*                  nghiệm thu: điền 9 ô, gallery mẫu dùng ảnh thật, logo

Kết quả một lượt chạy:
themes/<slug>/assets/images/<prefix>-{sections,gallery,icons,brand,reviews,hidden}/*.webp   vào zip
themes/<slug>/assets/videos/<prefix>-{sections,gallery,hidden}/*                        vào zip
themes/<slug>/_work/images/{sections,gallery,icons,brand,reviews,hidden}/*   file gốc, không vào zip, không commit
themes/<slug>/_work/media-map.json, _work/media-to-replace.md
```

## Code style

CommonJS, `'use strict'`, không thêm dependency (WebP qua Chromium như `to-webp.js`). Hàm thuần để test được:

```js
// Largest variant of each picture; no flags, no tracking pixels.
function pickContent(assets) {
  const best = new Map();
  for (const [url, a] of Object.entries(assets)) {
    if (!/^image\//.test(a.contentType || '') || FLAG_HOST.test(url) || (a.bytes || 0) < 200) continue;
    const k = stem(url);
    if (!best.has(k) || a.bytes > best.get(k).bytes) best.set(k, Object.assign({ url }, a));
  }
  return [...best.values()];
}
```

```hbs
{{#if section.settings.image}}<img src="{{section.settings.image}}" alt="" loading="lazy">{{else if section.settings.default_image}}<img src="{{@root.assets_url}}/{{section.settings.default_image}}" alt="" loading="lazy">{{else}}<div class="b-ph b-ph--iwt">{{#if @root.__designMode}}Upload an image{{/if}}</div>{{/if}}
```

## Chiến lược test

- **Unit** (`media-library.test.js`, site giả, `node:test`): loại cờ / pixel / cỡ nhỏ / file trùng; chia nhóm đúng; đuôi thật đúng; SVG và GIF giữ nguyên;
  chạy lại giữ file bạn đã thay.
- **Chốt chặn** (`media-guard.test.js`): ảnh trùng không còn là lỗi; đếm đúng ảnh còn nguyên; ảnh đã thay không tính; theme không có `assets.json` thì không báo.
- **Base**: `default_image` trống thì HTML trang sản phẩm giống hệt trước khi sửa; smoke + mobile-audit 0 lỗi 0 cảnh báo + pack.
- **Nghiệm thu trên Tredvik**: chạy trọn quy trình, so với bản gốc, thử thay một ảnh trong settings.

## Ranh giới

- **Luôn làm**: giữ khung placeholder khi ô không có ảnh; ảnh chọn trong editor thắng mặc định; ảnh dưới màn hình đầu dùng `loading="lazy"`; báo cáo ảnh còn nguyên
  của store mẫu ở mỗi lượt.
- **Hỏi trước**: zip vượt giới hạn upload của Adlux; áp dụng lại cho theme đã giao ngoài Tredvik.
- **Không bao giờ**: chạy JS tải về; vượt kiểm tra bot; viết cứng ảnh sản phẩm chính vào template; biến ảnh khách của store mẫu thành review của store khác; tự tải zip lên
  store; sửa `core.js`, checkout.

## Tiêu chí hoàn thành

1. Site giả và Tredvik: mỗi ảnh nội dung có đúng một file trong `_work/images/`, cờ và pixel không có mặt.
2. Tredvik: cả 9 ô hiện ảnh gốc khi không có ảnh tải lên; đặt ảnh khác vào ô thì ảnh đó hiện.
3. Tredvik so với bản gốc: desktop giảm từ 16,5 % xuống ≤ 8 %, mobile từ 22 % xuống ≤ 15 %.
4. Tredvik: smoke 47/47, mobile-audit 0 lỗi 0 cảnh báo, style-audit sạch, pack 0 lỗi, zip ≤ 4 MB.
5. `pack.js` in dòng `originals`, `media-to-replace.md` đủ ảnh; thay một file rồi pack lại thì số giảm đi 1.
6. Base để trống `default_image`: HTML không đổi, smoke + mobile-audit + pack đều đạt. Các theme cũ pack như trước.
7. `cd tools && npm test` đạt. Các SKILL và spec ghi quy tắc mới.

## Câu hỏi còn mở

1. **Giới hạn upload của Adlux**: zip và mỗi file tối đa bao nhiêu MB? Video của section ẩn làm zip nặng hơn (Maggie's khoảng 174 MB).
