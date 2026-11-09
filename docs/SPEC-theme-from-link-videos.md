# Spec: video trong skill `theme-from-link` — tải đủ và đưa vào theme

Trạng thái: **bản nháp, chờ duyệt** · 2026-11-09 · Sửa đổi cho [SPEC-theme-from-link.md](../SPEC-theme-from-link.md)
(mục "Tất cả ảnh và video" và quyết định số 3).

## Mục tiêu

Hiện tại skill chỉ đưa **ảnh** của bản gốc vào theme. Video thì hoặc bị bỏ qua lúc tải (stream HLS, video giấu trong
trình phát), hoặc đã tải về `_work/` nhưng theme không dùng (ô video để trống, chỉ có poster). Sau thay đổi:

1. **Bước tải lấy đủ mọi video** mà trang có, kể cả các loại đang bị bỏ sót:
   - stream HLS (`.m3u8`): với Shopify, tải file MP4 tương ứng (xem *Dữ kiện*); stream khác thì lưu playlist + các đoạn
     để tham khảo;
   - video nằm trong `<template>` (kiểu `deferred-media` của Shopify: chỉ dựng khi bấm phát), trong dữ liệu JSON của trang,
     trong script inline, và link `<a href="….mp4">`.
2. **Theme dùng video của bản gốc làm mặc định**, giữ **nguyên file** (không nén):
   - áp dụng ở mọi trang, **kể cả trang sản phẩm**;
   - merchant tải video khác lên thì video đó thay cho mặc định.

### Quyết định đã chốt (hỏi đáp 2026-11-09)

| # | Câu hỏi | Chốt |
| --- | --- | --- |
| 1 | Lỗi nằm ở đâu? | **Cả hai**: bước tải phải lấy đủ, và theme phải dùng video |
| 2 | Dung lượng video trong theme | **Giữ nguyên file gốc**, không nén |
| 3 | Video của trang sản phẩm | **Được vào theme làm mặc định**; ảnh trang sản phẩm vẫn như cũ (không bao giờ vào theme) |

### Dữ kiện đã kiểm tra

- `themes/maggies-tanks`, trang chủ: đã tải đủ 10 MP4 (hero 1,1 MB; 6 video đánh giá 1080p, tổng ~78 MB; 3 video của
  section ẩn, 21–45 MB). 6 file `.m3u8` bị bỏ qua là bản stream của chính 6 video đánh giá. Trang sản phẩm không có video.
  Theme hiện không dùng video nào.
- HLS của Shopify dùng đoạn `.ts` (nối lại không chạy được trên Chrome). Nhưng **mỗi độ phân giải đều có file MP4 với tên
  suy ra được**: `<id>.HD-1080p.2.5Mbps.hls.94731942_.m3u8` → `<id>.HD-1080p-2.5Mbps-94731942.mp4`. Đã kiểm tra với
  1080p / 720p / 480p của một video: đều trả `200 video/mp4`.

### Giả định (sửa giúp nếu sai)

1. "File gốc" = bản chất lượng cao nhất mà site phục vụ: `<source>` mà trang dùng, hoặc bản MP4 ứng với nhánh HLS có
   bandwidth cao nhất. Giữ nguyên từng byte.
2. Video thuộc **gallery của sản phẩm chính** vẫn lấy từ dữ liệu sản phẩm của platform, không thành mặc định của theme.
   Chỉ các ô video khác (hero, video đánh giá, ảnh/video kèm chữ, hàng video…) mới nhận mặc định.
3. Chỉ video của section **đang hiện** trên bản gốc mới vào theme. Video của section ẩn (A/B test, biến thể) chỉ lưu trong
   `_work/`.
4. YouTube / Vimeo / iframe bên thứ ba vẫn không tải. Đó là trình phát của bên khác, không phải file của cửa hàng.
5. Không thêm npm dependency. Không cần ffmpeg, vì không nén.

## Thiết kế

### A. Bước tải (`tools/download-page.js`, `tools/lib/mirror.js`)

| Nguồn video | Hiện tại | Sau khi sửa |
| --- | --- | --- |
| `<video src>`, `<source>`, `poster` | tải | giữ nguyên |
| `.m3u8` có tên kiểu Shopify (`…hls.<n>_.m3u8`) | bỏ qua | đọc playlist chính, chọn nhánh bandwidth cao nhất, suy ra MP4 và tải. Đã có file đó (từ `<source>`) thì ghi là trùng |
| `.m3u8` khác (không phải Shopify) | bỏ qua | lưu playlist chính, playlist nhánh cao nhất và mọi đoạn (+ `EXT-X-MAP`); viết lại link thành local. Ghi `stream: true` (chỉ để tham khảo, theme không dùng được). Stream mã hoá (`EXT-X-KEY`) hoặc DASH (`.mpd`) → `skipped` kèm lý do |
| Video do JS phát qua MSE (`blob:`) | bỏ qua | bắt mọi response `.m3u8` (cả fetch / xhr), rồi xử lý như hai dòng trên |
| `<template>` (deferred media) | không thấy | quét `template.content` (cả trong shadow root), viết lại link trong đó |
| JSON (`application/json`, `ld+json` VideoObject), script inline, `<a href>` | không thấy | quét chữ tìm URL `.mp4 / .webm / .mov / .m4v / .ogv / .m3u8` (tuyệt đối hoặc `//`) |
| iframe YouTube / Vimeo | bỏ qua | giữ nguyên (ghi vào `skipped`) |

Hai bổ sung đi kèm:
- `assets.json`: mỗi video có thêm `via` (`page` / `stream` / `template` / `json` / `script` / `link`), `stream` (URL m3u8
  nguồn nếu có), `poster` (URL poster nếu có).
- Dòng tóm tắt in thêm mỗi video một dòng: trang · MB · kích thước hiển thị · vùng · nguồn · file local. Bước dựng theme
  chọn video theo danh sách này.

### B. Theme dùng video (`new-theme` / `theme-from-link` SKILL.md, `tools/lib/media-guard.js`, `tools/pack.js`)

- **Quy tắc mới**, sửa ở `new-theme/SKILL.md` và `theme-from-link/SKILL.md`:
  - mỗi video của section đang hiện được chép **nguyên file** vào `assets/videos/<prefix>/<tên-ô>.mp4`, làm mặc định cho ô
    video tương ứng;
  - poster làm như ảnh (WebP trong `assets/images/<prefix>/`);
  - ảnh trang sản phẩm: giữ quy tắc cũ.
- **Cách viết mặc định:**
  - section / snippet riêng của theme: `{{#if setting}}{{setting}}{{else}}{{@root.assets_url}}/videos/<prefix>/<file>.mp4{{/if}}`;
  - section base dùng trên trang sản phẩm (`image-row`, `media_slider`…): bản sao của theme thêm setting chữ
    `default_video` (đường dẫn trong `assets/videos/`), chỉ dùng khi ô video trống. Đây là ngoại lệ duy nhất cho quy tắc
    "không có setting chữ chứa đường dẫn file", và chỉ áp dụng cho video.
- **`media-guard.js`**: video không còn bị báo lỗi (kể cả video trang sản phẩm); ảnh trang sản phẩm vẫn ERROR như cũ.
- **`pack.js`**: in thêm một dòng thông tin `videos: N file, X MB` (không phải lỗi hay cảnh báo) để biết zip nặng bao nhiêu.
- Video không autoplay dùng `preload="none"` (chỉ tải khi bấm); video hero autoplay dùng `preload="metadata"` + poster, để
  ảnh poster vẫn là LCP.

## Commands

```bash
node tools/download-page.js <url> themes/<slug> [--name …] [--refresh]   # in danh sách video ở cuối
node tools/pack.js themes/<slug>                                          # in "videos: N file, X MB"
cd tools && npm test                                                      # gồm test mới về video
```

## Cấu trúc thay đổi

```
tools/lib/mirror.js              + hlsVariants(text, base), shopifyMp4(variantUrl), videoUrlsIn(text, base)
tools/download-page.js           bắt .m3u8 mọi loại response; quét <template>, JSON, script inline, <a href>;
                                 tải MP4 từ HLS Shopify / lưu đoạn HLS khác; via / stream / poster trong assets.json;
                                 danh sách video trong dòng tóm tắt
tools/lib/media-guard.js         chỉ chặn ảnh (video được phép)
tools/pack.js                    dòng "videos: N file, X MB"
tools/fixtures/site/*            trang có <template> video, JSON video, link .mp4, HLS kiểu Shopify + HLS thường, video blob:
tools/test/*.test.js             test cho các trường hợp trên
.claude/skills/new-theme/SKILL.md, .claude/skills/theme-from-link/SKILL.md, SPEC-theme-from-link.md   quy tắc video mới
themes/maggies-tanks/*           nghiệm thu: hero + 6 video đánh giá thành mặc định
```

## Code style

Như các tool hiện có: CommonJS, `'use strict'`, hàm thuần trong `mirror.js` (chạy được cả node lẫn trình duyệt), không
dependency mới.

```js
// "…/abc.HD-1080p.2.5Mbps.hls.94731942_.m3u8" → "…/abc.HD-1080p-2.5Mbps-94731942.mp4" (Shopify progressive file of
// that HLS rendition); null for any other stream.
function shopifyMp4(variantUrl) {
  const m = String(variantUrl).match(/^(.*\/([^/]+))\.((?:HD|SD|UHD)-\d+p)\.([\d.]+Mbps)\.hls\.(\d+)_\.m3u8(\?.*)?$/);
  return m ? m[1] + '.' + m[3] + '-' + m[4] + '-' + m[5] + '.mp4' : null;
}
```

## Chiến lược test

- **Unit** (`tools/test/mirror.test.js`):
  - `hlsVariants` chọn nhánh bandwidth cao nhất, hiểu link tương đối;
  - `shopifyMp4` đúng với 1080p / 720p / 480p và trả `null` với stream khác;
  - `videoUrlsIn` tìm được URL video trong JSON (cả dạng `\/` escape), trong script và trong `srcset`-like; bỏ qua `data:` / `blob:`.
- **Site giả** (`tools/test/download-page.test.js`), chạy offline:
  - `<template>` chứa `<video><source src=/media/tpl.mp4>`;
  - `<script type=application/json>` có `/media/json.mp4`;
  - `<a href=/media/link.mp4>`;
  - HLS đặt tên kiểu Shopify (master → nhánh → MP4 suy ra, server giả có file MP4 đó);
  - HLS thường (master → nhánh → 2 đoạn `.ts`);
  - một `<video>` phát bằng `blob:`, script giả lấy `.m3u8` qua `fetch()` như hls.js.
  - Kiểm tra: mọi file có trong `_m/`, `via` đúng, bản offline vẫn 0 request ra ngoài và 0 lỗi 404, danh sách video in ra đủ.
- **Chốt chặn** (`tools/test/media-guard.test.js`): theme chép video trang sản phẩm → không lỗi; chép ảnh trang sản phẩm →
  vẫn lỗi.
- **Trang thật** (chạy tay): tải lại trang chủ maggies-tanks. 6 stream phải được nhận ra là trùng với MP4 1080p đã có, không
  còn nằm trong `skipped`. Thêm một trang có video nếu bạn có link (câu hỏi mở 1).
- **Nghiệm thu**: maggies-tanks dùng video hero + 6 video đánh giá làm mặc định. Phải đạt: pack 0 lỗi, smoke pass,
  mobile-audit 0 lỗi; bấm thẻ video trong preview thì video phát.

## Ranh giới

- **Luôn làm**: giữ nguyên file video (không nén, không cắt); video không autoplay dùng `preload="none"`; ghi mọi video không
  tải được vào `skipped` kèm lý do; vẫn chỉ tải trang của link.
- **Hỏi trước**: thêm dependency (ffmpeg…); zip vượt giới hạn upload của Adlux (câu hỏi mở 2); tải video của section ẩn vào theme.
- **Không bao giờ**: tải video từ YouTube / Vimeo / trình phát bên thứ ba; tìm cách gỡ mã hoá stream (`EXT-X-KEY`, DRM); đưa
  ảnh trang sản phẩm vào theme.

## Tiêu chí hoàn thành

1. Site giả: mọi loại video ở bảng mục A đều có file trong `_m/` (stream thường: playlist + đoạn), với `via` đúng. Bản offline
   vẫn 0 request ra ngoài, 0 lỗi 404, khác ≤ 1 %.
2. Tải lại trang chủ maggies-tanks: không còn `.m3u8` trong `skipped`; 6 stream được ghi là trùng với MP4 1080p.
3. Dòng tóm tắt của `download-page.js` liệt kê từng video (trang, MB, nguồn, file).
4. `media-guard`: video trang sản phẩm chép vào theme không còn bị lỗi; ảnh trang sản phẩm vẫn lỗi. `pack.js` in dòng
   `videos: N file, X MB`.
5. Hai `SKILL.md` và `SPEC-theme-from-link.md` ghi quy tắc video mới.
6. maggies-tanks: hero tự phát video mặc định; 6 thẻ đánh giá phát video khi bấm; merchant tải video khác thì video đó được
   dùng. Pack 0 lỗi, smoke pass, mobile-audit 0 lỗi.
7. `cd tools && npm test` pass; mọi theme cũ pack ra kết quả như trước.

## Câu hỏi còn mở

1. **Link kiểm tra**: bạn có link trang nào (site khác) mà video không tải được không? Mình sẽ dùng nó để thử trên dữ liệu
   thật, ngoài maggies-tanks.
2. **Giới hạn upload của Adlux**: zip / mỗi file asset tối đa bao nhiêu MB? maggies-tanks có video sẽ khoảng 80 MB. Nếu có
   giới hạn thấp hơn, cần phương án dự phòng (chỉ lấy một phần, hoặc cho phép nén).
3. **Stream không phải Shopify**: chỉ lưu playlist + đoạn để tham khảo (theme không dùng được nếu không chuyển thành MP4).
   Như vậy có được không?
