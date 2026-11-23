# Spec: `media-grab` luôn tải bản chất lượng cao nhất

Trạng thái: **nháp 2026-11-21, chờ duyệt.** Liên quan: [SPEC-media-grab.md](SPEC-media-grab.md) (tool gốc),
[SPEC-theme-from-link-images.md](SPEC-theme-from-link-images.md) (luật WebP 1600 px / q 0,82 của `media-library.js`).

## Mục tiêu

`node tools/media-grab.js <url>` phải lưu mỗi ảnh và video ở **bản lớn nhất mà CDN của cửa hàng công khai cho đúng file
đó**, không phải bản thu nhỏ hay bản transcode mà trang tình cờ dùng. Khi chính cửa hàng chỉ có ảnh nhỏ, tool phải nói
ra thay vì im lặng. Người dùng: bạn (đưa ảnh và video của đối thủ vào theme làm mặc định) và các skill `theme-edit`,
`theme-from-link`.

## Kết quả kiểm tra logic hiện tại (đo ngày 2026-11-21)

Đo trên hai lần tải có sẵn trong `downloads/`, rồi gọi lại CDN để so với bản lớn hơn.

| # | Chỗ mất chất lượng | Bằng chứng | Code |
|---|---|---|---|
| 1 | **Ảnh có đường dẫn resize chỉ lưu bản thu nhỏ.** Chỉ Shopify được đổi sang bản gốc; CDN khác giữ đúng URL tìm thấy. Bản crop và bản gốc nằm ở hai thư mục khác nhau nên `pictureKey` không gộp. | tatacharm: 25 ảnh chỉ có bản `cdn…/c/96x96/p/…` (96×96, ~3 KB, bị xếp vào `icons`). Cùng URL bỏ `/c/96x96` trả về **800×800, ~450 KB** | `lib/media-grab.js` `shopifyOriginal`, `lib/media-pick.js` `pictureKey` |
| 2 | **Video Shopify lấy bản transcode** mà trang ghi, không lấy file gốc người bán tải lên. | shape-curve: lưu `…/c/vp/<h>/<h>.HD-720p-4.5Mbps….mp4` = 540×720, 4,4 Mbps. `…/videos/c/o/v/<h>.mp4` = **720×960, 8,3 Mbps**; cả 4/4 video đều có bản gốc, nặng hơn 1,7–1,9 lần. HLS master cũng chỉ cao tới 540×720 | `media-grab.js` (streams), `lib/mirror.js` `shopifyMp4` |
| 3 | **Cả chuỗi srcset bị lấy làm một URL.** Thuộc tính `data-*` được thử `looksLikeMedia` trước, trước khi xét nó là srcset. | `model2.jpg?v=1789547409+165w%2C%2F%2Fshape-curve.com…`: lần này Shopify vẫn trả ảnh; CDN khác sẽ lỗi hoặc trả sai bản | `lib/collect-refs.js` dòng 78–83 |
| 4 | **Chọn bản "nặng nhất", không phải bản "nhiều điểm ảnh nhất".** Một WebP 1600 px có thể nhẹ hơn JPEG 800 px, nên bản nhỏ bị giữ lại. | quy luật của `gather` | `lib/media-pick.js` `gather` |
| 5 | Bản gốc Shopify mà lỗi thì **mất luôn ảnh đó**, không quay lại URL tìm thấy. | đọc code: `add()` chỉ tải `shopifyOriginal(raw)` | `media-grab.js` `add` |
| 6 | Trang được render ở `deviceScaleFactor: 1`, nên loader JS (`data-sizes="auto"`, mẫu `{width}`, Next.js) xin bản 1×. | rủi ro; chưa gặp trên 2 link đã đo | `media-grab.js` `pass` |
| 7 | `media.json` không ghi kích thước thật (spec cũ có `width`, `height` nhưng code không ghi), nên không ai nhận ra file nhỏ. | `media.json` hiện có | `media-grab.js` |
| 8 | **Bản đưa vào theme** (`--to-theme` → `media-library.js`): mọi JPEG/PNG/WebP bị mã hóa lại WebP q 0,82, thu về ≤ 1600 px (gallery ≤ 1200 px) bằng canvas `drawImage` ở `imageSmoothingQuality` mặc định `low`. Thu nhỏ nhiều lần sẽ ra răng cưa. Đây là quyết định có chủ ý (ngân sách mobile 2 MB), nên muốn đổi phải được duyệt: xem câu hỏi mở 1. | `scripts/to-webp.js`, `media-library.js` (`MAX`, `QUALITY`, `GALLERY_MAX`) | |

**Không phải lỗi của tool:** ảnh Shopify đã được tải ở bản gốc. shape-curve chỉ tải lên ảnh 800×1000 (thử `width=5000`
vẫn ra 800×1000). Tool không làm ảnh to hơn bản gốc của cửa hàng; nó chỉ báo ra (mục E).
Ghi chú: gọi `products/<handle>.js` bằng curl bị trả `local_rate_limited`. Nếu media-grab cũng gặp, nó mất dữ liệu sản
phẩm; việc này nằm ngoài spec, chỉ ghi lại.

## Giả định (sửa ngay nếu sai)

1. "Chất lượng cao nhất" là file lớn nhất mà CDN công khai cho **đúng file đó**: không phóng to, không làm nét bằng AI.
2. Thư mục tải về (`downloads/…`, `_work/grab/…`) luôn chứa byte gốc, không mã hóa lại (hiện đã như vậy).
3. Được xin thêm URL "bản gốc" của chính file đã thấy (cùng host, chỉ bỏ bước resize), như đang làm với Shopify. Chỉ
   theo các mẫu trong bảng A, không đoán thêm.
4. Không thêm dependency (không ffmpeg, không sharp). Kích thước và codec đọc từ header của file.
5. Stream HLS / DASH không phải của Shopify vẫn bỏ qua (cần ffmpeg), nằm ngoài phạm vi.

## Hành vi mới

### A. Xin bản gốc cho mọi CDN đã biết

`originalOf(url)` trả URL bản gốc, hoặc chính `url` khi không khớp mẫu nào. Cách tải mở rộng từ cách đang làm với Shopify:
ứng viên được gộp theo `originalOf`, **tải bản gốc trước**, và nếu lỗi (không 2xx, không phải `image/*` / `video/*`)
thì tải bản lớn nhất trong các URL đã thấy. Bình thường mỗi file chỉ tốn 1 request, tối đa 2.

| CDN | Bản thu nhỏ | Bản gốc thử |
|---|---|---|
| Shopify ảnh | `_800x`, `width=`, `height=`, `crop=` | như hiện tại |
| Đường dẫn crop | `…/c/96x96/p/…` | bỏ đoạn `/c/<W>x<H>` |
| Cloudflare Images | `/cdn-cgi/image/<opts>/<path>` | `/<path>` |
| Next.js | `/_next/image?url=<u>&w=…&q=75` | `<u>` |
| Cloudinary | `/image/upload/<transform>/v123/…` | bỏ đoạn transform |
| imgix (`*.imgix.net`) | `?w= h= q= fit= auto= dpr=` | bỏ các tham số đó |
| WordPress / WooCommerce | `name-300x200.jpg`, `name-scaled.jpg` | `name.jpg` |
| Wix | `…~mv2.jpg/v1/fill/w_…/name.jpg` | `…~mv2.jpg` |
| BigCommerce | `/images/stencil/500x659/…` | `/images/stencil/original/…` |
| Squarespace | `?format=500w` | bỏ `format` |
| Mẫu `{width}` (`data-widths`) | `…_{width}x.jpg` | Shopify: bỏ hậu tố; nơi khác: số lớn nhất trong `data-widths` |

`pictureKey` so khóa trên URL đã qua `originalOf`, nên bản crop và bản gốc được gộp thành một ảnh.

### B. Video Shopify: file gốc người bán tải lên

`…/videos/c/vp/<h>/<h>.<rendition>.mp4` và HLS `…/videos/c/vp/<h>/<h>.m3u8` → thử `…/videos/c/o/v/<h>.mp4` (cùng host,
cùng tiền tố). Chỉ giữ bản gốc khi đủ ba điều kiện:
- là `video/mp4` hoặc `video/webm`;
- codec trình duyệt nào cũng phát được: H.264 `avc1`, VP9, AV1. HEVC `hvc1` / `hev1` thì không, vì Chrome / Firefox trên
  Windows thường không phát được;
- nhỏ hơn hoặc bằng `--max-mb`.

Thiếu một điều kiện thì dùng rendition tốt nhất: HLS có bandwidth cao nhất → MP4, hoặc MP4 cao nhất trong product JS.

### C. Chọn bản tốt nhất theo điểm ảnh

`lib/media-probe.js` đọc header file: ảnh JPEG / PNG / GIF / WebP / AVIF cho rộng × cao; MP4 / WebM cho rộng × cao,
codec, thời lượng, kbps. Trong mỗi nhóm trùng:
- ảnh: giữ bản **nhiều điểm ảnh nhất**; bằng nhau thì giữ bản nặng hơn (nén ít hơn);
- video: giữ bản nhiều điểm ảnh nhất, rồi bản có bitrate cao nhất.

### D. Thu thập trên trang

- `collect-refs.js`: thuộc tính tên kết thúc bằng `srcset` / `bgset`, hoặc giá trị có dạng srcset (`url 800w, url 1600w`),
  được phân tích như srcset và lấy ứng viên lớn nhất. Không bao giờ lấy cả chuỗi làm một URL. Lỗi này cũng làm hỏng
  `download-page.js`, xem phần Ranh giới.
- `media-grab.js` render ở `deviceScaleFactor` 2 (1440 px) và 3 (390 px), như máy thật, để loader JS xin bản lớn.

### E. Báo cáo trung thực

- `media.json` thêm `width`, `height` cho mọi file. Video thêm `codec` và `kbps`. Khi đã đổi URL, thêm `from` (URL như
  trên trang).
- Tóm tắt thêm một dòng `quality` (vẫn ≤ 30 dòng), ví dụ:
  `quality     25 crop → gốc · 4 video → bản gốc · 7 ảnh gốc của cửa hàng < 2× khung hiện (không có bản lớn hơn)`

### F. Bản đưa vào theme (`--to-theme`, `media-library.js`): chờ bạn chọn ở câu hỏi mở 1

Đề xuất (phương án A):
- thu nhỏ với `imageSmoothingQuality = 'high'` để hết răng cưa;
- WebP q 0,82 → **0,90**; trần **2000 px** cho mọi nhóm (gallery 1200 → 2000), bằng trần shopdy tự áp khi người bán tải
  ảnh lên (≤ 2000 px, WebP q85, `upload-media-file.use-case.ts`);
- nguồn đã là WebP / AVIF và ≤ trần thì chép nguyên, không mã hóa lại. Mọi loại khác chỉ dùng bản WebP khi nó nhỏ hơn
  nguồn (hiện quy tắc này mới áp cho WebP);
- video vẫn chép nguyên file;
- `--max` / `--quality` vẫn ghi đè được.

Đổi lại theme nặng hơn, ước chừng 1,5–2 lần dung lượng ảnh, phải đo lại bằng `mobile-audit` trên một theme thật.

## Lệnh

```
node tools/media-grab.js <url> [--out <dir>] [--refresh] …          # không thêm cờ: chất lượng cao nhất là mặc định
node tools/media-grab.js <url> --to-theme themes/<slug> --prefix xx  # thêm vào theme (phần F)
cd tools && npm test                                                # mọi test, không mạng
node tools/media-grab.js https://tatacharm.com/softmuseus --out <scratch>/tata --refresh       # kiểm tra thật
node tools/media-grab.js https://shape-curve.com/products/cooling-tummy-control-butt-lift-shapewear-bodysuit --out <scratch>/sc --refresh
node tools/pack.js themes/<slug>                                     # nếu duyệt F: 0 lỗi
```

## Cấu trúc

```
tools/lib/media-original.js   mới: originalOf(url), shopifyVideoOriginal(url): hàm thuần
tools/lib/media-probe.js      mới: imageInfo(buf), videoInfo(buf, size): đọc header, không dependency
tools/lib/media-grab.js       shopifyOriginal chuyển vào media-original.js (giữ export cũ cho section-grab)
tools/lib/media-pick.js       pictureKey qua originalOf; gather chọn theo điểm ảnh (C)
tools/lib/collect-refs.js     srcset trong data-* (D)
tools/media-grab.js           gộp ứng viên, tải gốc rồi mới fallback (A, B), DSF 2/3, media.json, dòng quality (E)
tools/media-library.js, tools/scripts/to-webp.js     chỉ khi duyệt F
tools/test/media-original.test.js, media-probe.test.js   mới
tools/test/media-grab.test.js, media-pick.test.js, media-library.test.js, tools/fixtures/media-grab/*   thêm ca
docs/SPEC-media-grab.md       link sang spec này; tiêu chí 3 cho phép thêm request tới bản gốc của file đã thấy
```

`section-grab.js` dùng chung `lib/media-grab.js` và `lib/fetch-media.js`, nên cũng được A và B. Test của nó phải
giữ xanh.

## Code style

CommonJS, `'use strict'`, hàm thuần có chú thích một dòng, không dependency, giống `lib/media-grab.js`:

```js
/** The same file without the CDN's resize step; the URL itself when no known pattern matches. */
function originalOf(url) {
  let u;
  try { u = new URL(url); } catch (e) { return url; }
  if (isShopify(u)) return shopifyOriginal(url);
  u.pathname = u.pathname
    .replace(/\/c\/\d+x\d+(?=\/)/, '')                    // cdn.<store>/c/96x96/p/… → /p/…
    .replace(/^\/cdn-cgi\/image\/[^/]+/, '');             // Cloudflare Images
  return u.toString();
}
```

## Kiểm thử

Unit, không mạng:
- `media-original.test.js`: mỗi dòng của bảng A cho đúng URL gốc; URL không khớp mẫu nào giữ nguyên; host không bao giờ
  đổi; video Shopify `c/vp` → `c/o/v`.
- `media-probe.test.js`: JPEG baseline + progressive, PNG, GIF, WebP (VP8 / VP8L / VP8X), AVIF, SVG; MP4 có `moov` ở đầu
  và ở cuối file; codec `avc1` / `hvc1`.
- `media-pick.test.js`: WebP 1600 px nhẹ hơn JPEG 800 px → giữ WebP; bản crop cộng bản gốc → một ảnh.

Tích hợp (server fixture ghi log mọi request, như test hiện có):
- Trang kiểu Shopify: video `c/vp/…HD-720p….mp4` và server có `c/o/v/<h>.mp4` lớn hơn → lưu bản gốc, `from` = URL 720p.
  Bản gốc HEVC → giữ 720p. Bản gốc 404 → giữ 720p.
- Trang có ảnh chỉ ở dạng `/c/96x96/…` → lưu bản gốc. Gốc 404 → lưu bản crop, không mất ảnh.
- `data-srcset` / `data-bgset` lạ → URL lớn nhất, không có URL rác.
- Log server: request thêm chỉ tới bản gốc của file đã thấy, mỗi file tối đa 1 lần.
- Nếu duyệt F, `media-library.test.js`: ảnh 3000 px → 2000 px ở q 0,9; WebP nguồn 1200 px → byte giống nguồn.

Thật, chạy tay khi xong: hai link ở phần Lệnh, đối chiếu với tiêu chí hoàn thành.

## Ranh giới

- **Luôn:** byte gốc trong thư mục tải về; lỗi thì quay về URL như trên trang, không bao giờ mất file; một link = một
  trang; file tải về là dữ liệu không tin cậy.
- **Hỏi trước:** đổi `media-library.js` (phần F); đổi hành vi `download-page.js` ngoài việc sửa lỗi srcset (D dùng
  chung `collect-refs.js`, nên download-page cũng hết URL rác; duyệt spec này coi như đồng ý sửa lỗi đó); thêm ffmpeg
  để tải HLS không phải Shopify.
- **Không bao giờ:** phóng to hay làm nét rồi gọi là "gốc"; đoán URL ngoài bảng A (dò thư mục, liệt kê bucket); vượt
  bot check; mở trang khác.

## Tiêu chí hoàn thành

1. tatacharm: không còn ảnh nào lưu ở bản `/c/<W>x<H>/` khi bản gốc trả 200; 25 ảnh trước đây 96×96 giờ ≥ 800×800.
2. shape-curve: 4/4 video là bản gốc 720×960, khoảng 8 Mbps, không còn 540×720.
3. Không `url` nào trong `media.json` chứa mô tả srcset (`%2C%2F%2F`, ` 165w`).
4. Mọi file trong `media.json` có `width` / `height`; tóm tắt có dòng `quality` và vẫn ≤ 30 dòng.
5. Request thêm ≤ 1 cho mỗi file; thời gian một trang tăng ≤ 30 %.
6. `cd tools && npm test` xanh, gồm test mới và `download-page` / `section-grab`.
7. Nếu duyệt F: một theme thử có ảnh ≤ 2000 px ở q 0,9, contact sheet không răng cưa, `pack.js` 0 lỗi; ghi lại tổng MB
   ảnh trước / sau.

## Câu hỏi mở

1. **Bản đưa vào theme (F):** A, WebP chất lượng cao (đề xuất, xem phần F) · B, ship file gốc nguyên vẹn (đẹp nhất nhưng
   nặng nhất, vượt ngân sách mobile 2 MB) · C, giữ như hiện tại, chỉ sửa phần tải về.
2. **Bạn thấy ảnh "vỡ" ở đâu:** trong thư mục tải về, trong theme (preview), hay trên store sau khi tải zip lên? Nếu là
   trên store thì có thể shopdy nén lại khi nhận zip; việc này nằm ngoài repo này và cần kiểm riêng.
3. **Video gốc rất lớn** (ví dụ 4K, 150 MB) khi `--to-theme`: đưa nguyên vào theme (đề xuất, vì bạn muốn chất lượng cao
   nhất; `pack.js` sẽ in số MB) hay đưa bản 1080p vào theme và để bản gốc ở `_work/`?
