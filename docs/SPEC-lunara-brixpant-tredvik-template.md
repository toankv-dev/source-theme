# Spec: Lunara Black (brixpant.com) — thêm template sản phẩm "Tredvik – Brixpant bundle"

Trạng thái: **người dùng đồng ý (2026-11-09)**, quyết định ở mục "Câu hỏi mở". Plan:
[plan-lunara-brixpant-tredvik-template.md](plan-lunara-brixpant-tredvik-template.md), việc:
[todo-lunara-brixpant-tredvik-template.md](todo-lunara-brixpant-tredvik-template.md). Theme đích: Lunara Black của brixpant.com
(`C:\Users\ADMIN\Downloads\lunara-black---brixpant-com`, bản 2026.11.06.3). Nguồn giao diện: `themes/tredvik`
(bản 2026.11.09.2), template `templates/product.json`.

## Mục tiêu

Store brixpant.com chạy theme Lunara Black. Mỗi store chỉ có một theme, nên muốn một số sản phẩm có trang kiểu
Tredvik thì giao diện Tredvik phải nằm **trong** Lunara Black, dưới dạng template sản phẩm thứ 5:
`templates/product.tredvik-brixpant-bundle.json` (tên hiển thị "Tredvik – Brixpant bundle"). Bốn template cũ, trang
chủ, các trang khác, giỏ hàng và checkout giữ nguyên.

- **Người bán**: chọn template "Tredvik – Brixpant bundle" cho một sản phẩm → trang có bố cục Tredvik; sửa chữ / ảnh /
  khối trong Customize như ở theme Tredvik.
- **Người mua**: chọn gói 1–4 cái, mỗi cái chọn Color / Size riêng → Add to cart → cart drawer của Lunara mở ra với
  đúng dòng, đúng giá. Sang sản phẩm Lunara khác vẫn còn giỏ đó; checkout tính đúng.

## Hiện trạng (đã đo)

| | Lunara Black (đích) | Tredvik (nguồn) |
|---|---|---|
| Kiến trúc | Bản build cũ (Shrine PRO): `base.css` 536 KB + `custom.css` 60 KB, `theme.js` 111 KB (`MSCart`, `LuDisc`, `LuUp`); header / cart drawer / footer riêng | base-theme: `core.js` 28 KB + `ui.js` 90 KB (`window.Base`, `BaseUI`); `base.css` + `sections.css` + `skin.css` ≈ 120 KB |
| Template sản phẩm | `product`, `bundle`, `sizes`, `tiles` (section `product` · `reviews` · `faq`) | `product.json`: `product` · `image-with-text` ×2 · `tv-steps` · `comparison` · `tv-quotes` · `faq` · `reviews` |
| Giỏ | `sf-cart:<domain>` + `sf-cart`; giỏ giữ trong bộ nhớ, chỉ đọc lại khi có sự kiện `storage` (từ tab khác); tên biến thể lấy từ `opts` | `sf-cart:<domain>` + `sf-cart` qua `Base.cart` |
| Pixel | ViewContent trong `sections/product-scripts.hbs` (layout luôn in), AddToCart trong `theme.js` | ViewContent + AddToCart trong `core.js` |
| Quà tặng | `theme.js` tự đồng bộ dòng quà từ `cartGiftsUrl` | `core.js` cũng tự đồng bộ |
| `pack.js` hôm nay | 55 lỗi, đều là partial inline (`{{#*inline "lu_p_…"}}`, `lu_chtml`) mà pack.js không nhận ra; 1 cảnh báo `theme.css` | 0 lỗi |

Nếu chép thẳng sang thì sẽ va chạm:
- **Tên section trùng**: `product`, `reviews`, `faq` (mỗi tên chỉ có một section trong theme).
- **Tên file trùng**: `assets/css/base.css` (Lunara 536 KB ≠ Tredvik 28 KB).
- **Id cài đặt trùng nhưng khác giá trị**: `primary`, `primary_text`, `accent`, `sale`, `page_bg`, `font`,
  `footer_*`, `topbar_*`, `atc_label`…
- **CSS toàn cục**: CSS của Tredvik có các bộ chọn `*`, `html`, `body`, `img`, `a`, `button`, `input`, `h1–h3` → làm lệch
  header / footer / cart drawer của Lunara.
- **Hai bộ JS trên cùng một trang**: ViewContent bắn 2 lần, hai bên cùng ghi dòng quà, và drawer của Lunara không biết
  `Base.cart` vừa thêm dòng.

## Thiết kế (đề xuất)

**Khung trang lấy của Lunara, thân trang lấy của Tredvik.** Layout không đổi: header, top bar, cart drawer, footer của
Lunara bọc ngoài; chỉ phần `content_for_layout` là Tredvik.

1. **Nơi làm**: chép nguyên theme vào `themes/lunara-black-brixpant/` và làm trong đó; thư mục trong Downloads giữ
   nguyên. README của Lunara bảo sửa bằng `build_lu_pdp.py`, nhưng kịch bản đó không có trong repo này. Vì vậy phần
   thêm mới được sinh bằng `_work/build-tvb.js`, còn file Lunara cũ chỉ sửa tối thiểu (liệt kê ở mục Ranh giới).
2. **Section / snippet mang sang, đổi tên `tv-`** (hết trùng, nhìn tên là biết thuộc template nào):
   `product → tv-product`, `image-with-text → tv-image-with-text`, `comparison → tv-comparison`, `faq → tv-faq`,
   `reviews → tv-reviews`; `tv-steps`, `tv-quotes` giữ tên. Mỗi section mang theo `.schema.json` của nó. Các snippet
   chúng dùng (`buy-row`, `options`, `pack-cards`, `pack-qcard`, `price`, `stars`, `faq-list`, `faq-qa`, `icon-caret`,
   `icon-arrow`, `pay-icons`, `vars`) đổi thành `tv-<tên>`; `tv-fonts` giữ tên. Markup giữ nguyên, chỉ khác tên
   partial và lớp bọc.
3. **Bọc ngoài + CSS có phạm vi**: mỗi section mới nằm trong `.tvb`. `assets/css/tv-bundle.css` gộp `base.css` +
   `sections.css` + `skin.css` của Tredvik và được sinh bằng kịch bản: mọi bộ chọn có thêm tiền tố `.tvb` (`:root` /
   `html` / `body` / `*` → `.tvb`), không quy tắc nào chạm ra ngoài `.tvb`. Section `tv-product` tự link file này, nên
   chỉ template mới nạp nó. Font Montserrat / DM Serif Display và ảnh `assets/images/tv-*`, `pay/`,
   `google-trust.png` (≈ 2.3 MB WebP) chép sang.
4. **Cài đặt riêng**: thêm nhóm Theme settings "Tredvik template" với id `tv_<tên>` (màu, font, bo góc, kiểu nút, màu
   sao…), mặc định bằng giá trị đang dùng ở theme Tredvik. `tv-vars` in biến CSS lên `.tvb` (không lên `:root`). Mọi
   cài đặt cũ của Lunara giữ nguyên giá trị. Không mang sang cài đặt của khung trang (nav, social, footer, top bar), vì
   khung là của Lunara.
5. **JS**: chỉ section `tv-product` nạp (`defer`), các trang khác không đổi.
   - `assets/js/tv-core.js` = `core.js` của Tredvik, chép nguyên từng byte.
   - `assets/js/tv-ui.js` = `ui.js` của Tredvik (lớp Interface, được phép bỏ phần header / menu / search / cart drawer
     không dùng).
   - `assets/js/tv-bridge.js` mới:
     - Sau `b:cart-added` / `b:cart-change`: phát `StorageEvent` với khoá `sf-cart:<domain>` để `MSCart` đọc lại giỏ, rồi
       gọi `MSCart.open()` (trừ khi `open_cart_on_add` tắt).
     - Thêm `opts` (`[{name, value}]`) vào dòng do `Base.cart` ghi, để drawer Lunara hiện tên biến thể và giữ nó khi lưu
       lại.
6. **Không trùng sự kiện / dòng quà**:
   - `tv-product` in sẵn cờ `data-tvb-page`. ViewContent trong `sections/product-scripts.hbs` của Lunara bỏ qua khi
     thấy cờ (lúc đó `tv-core.js` bắn). Trên trang Lunara thường, hành vi y như cũ.
   - Dòng quà: trên trang Tredvik chỉ một bên được đồng bộ, đề xuất là Lunara (vì drawer đang hiện là của Lunara).
     Cách tắt phía `tv-core.js` mà không sửa file đó sẽ chốt trong plan sau khi đo.
   - `#sf-variants-data` đã có sẵn do layout Lunara in, `tv-product` không in thêm (để tránh trùng id). Dữ liệu giảm giá
     (`#b-offers`) thì `tv-product` tự in, và chỉ in các loại mà công tắc `allow_*_discount` của Lunara đang bật, để
     giá trên thẻ gói khớp với drawer.
7. **Template** `templates/product.tredvik-brixpant-bundle.json` = `product.json` của Tredvik, chỉ đổi `type` của các
   section sang tên `tv-`. Chữ, khối, thứ tự và ảnh mặc định (`default_*`) giữ như Tredvik; người bán thay sau.
8. **Công cụ**: `tools/pack.js` nhận các partial inline `{{#*inline "x"}}` khai báo trong cùng file (đúng cú pháp
   Handlebars, engine vẫn đang chạy được), kèm test trong `tools/test/`. Ngoài ra không đổi gì khác trong pack.js.
9. **Phiên bản**: `theme.json` 2026.11.06.3 → 2026.11.09.1, phần description có nhắc template mới; README thêm mục cho
   template; theme có thêm `CHANGELOG.md`.

## Lệnh

```
cd tools && npm install && npx playwright install chromium        # một lần
cp -r "/c/Users/ADMIN/Downloads/lunara-black---brixpant-com" themes/lunara-black-brixpant
node themes/lunara-black-brixpant/_work/build-tvb.js               # sinh phần tv-*

node tools/preview-server.js themes/lunara-black-brixpant --port 8090
#   /product?template=tredvik-brixpant-bundle   (mới)      /product?template=bundle …   (cũ, phải y như trước)
node tools/preview-server.js themes/tredvik --port 8091            # bản gốc để so

cd tools && npm test
node themes/lunara-black-brixpant/_work/tvb-e2e.js http://localhost:8090
MSYS_NO_PATHCONV=1 node tools/mobile-audit.js http://localhost:8090 --pages "/product?template=tredvik-brixpant-bundle" --width 360,390
node tools/shot.js … --selector main                               # thân trang hai bên, 1440 + 390, rồi so ảnh
node tools/pack.js themes/lunara-black-brixpant                    # 0 lỗi → dist/*.zip
```

## Cấu trúc

```
themes/lunara-black-brixpant/              toàn bộ Lunara Black như bản tải về, cộng thêm:
  templates/product.tredvik-brixpant-bundle.json
  sections/tv-*.hbs + tv-*.schema.json     7 section
  snippets/tv-*.hbs
  assets/css/tv-bundle.css                 sinh ra, mọi quy tắc nằm dưới .tvb
  assets/js/tv-core.js · tv-ui.js · tv-bridge.js
  assets/fonts/montserrat-*.woff2, dm-serif-display.woff2
  assets/images/tv-*/, pay/, google-trust.png
  config/settings_schema.json · settings_data.json      + nhóm "Tredvik template" (tv_*)
  sections/product-scripts.hbs             sửa nhỏ: bỏ qua ViewContent khi có data-tvb-page
  theme.json · README.md · CHANGELOG.md
  _work/                                   build-tvb.js, tvb-e2e.js, ảnh chụp, so sánh (không đóng gói)
tools/pack.js + tools/test/pack-inline.test.js
docs/SPEC-lunara-brixpant-tredvik-template.md · plan-… · todo-…
```

## Phong cách mã

- Mọi file thêm mới có tiền tố `tv-`. Lớp CSS vẫn là `b-…` như base, nhưng luôn nằm dưới `.tvb`.
- File sinh ra (`tv-bundle.css`, các section / snippet đổi tên) chỉ sửa qua `_work/build-tvb.js` rồi chạy lại.
- Chỉ dùng helper của engine (pack.js có kiểm). Checkbox mặc định BẬT, nên kiểm tra bằng `(eq settings.x false)`.

```css
/* skin.css của Tredvik */          /* tv-bundle.css */
body{color:var(--c-text)}       →   .tvb{color:var(--c-text)}
h1,h2{font-family:var(--font)}  →   .tvb h1,.tvb h2{font-family:var(--font)}
.b-pack{…}                      →   .tvb .b-pack{…}
```

```hbs
<div class="tvb" data-tvb-page>
  {{> tv-vars}}
  <link rel="stylesheet" href="{{assets_url}}/css/tv-bundle.css">
  {{!-- markup sections/product.hbs của Tredvik, partial đổi sang tv-… --}}
</div>
```

## Kiểm thử

1. **Đơn vị** (`cd tools && npm test`): pack.js nhận partial inline (viết test đỏ trước, rồi sửa cho xanh); test trên
   `tv-bundle.css` vừa sinh: không bộ chọn nào thiếu `.tvb`.
2. **E2E** (`_work/tvb-e2e.js`, Playwright, 1440 + 390): chạy theo tiêu chí 3–7 bên dưới, đọc `window.__events` và
   localStorage.
3. **Trực quan**: chụp `main` của template mới và `main` của trang Tredvik gốc rồi so.
4. **Hồi quy**: chụp 4 template cũ + trang chủ trước và sau khi sửa.

## Tiêu chí hoàn thành

Template mới (`/product?template=tredvik-brixpant-bundle`):
1. Đủ 8 section theo đúng thứ tự Tredvik: product · image-with-text ×2 · steps · comparison · quotes · FAQ · reviews.
   Header / top bar / footer / cart drawer là của Lunara.
2. Thân trang (`main`) lệch so với trang Tredvik gốc không quá 3 % ở 1440 px và 390 px.
3. Chọn gói 1 / 2 / 3 / 4 cái, mỗi cái chọn Color / Size riêng → Add to cart:
   - localStorage có đúng dòng, đúng số lượng, đúng `variantId`.
   - Drawer Lunara mở ngay, có hiện tên biến thể.
   - Tổng tiền trong drawer bằng giá gói ghi trên thẻ.
4. Mỗi lần tải trang có đúng 1 ViewContent; mỗi lần thêm giỏ có đúng 1 AddToCart. Bấm Checkout trong drawer → đúng 1
   InitiateCheckout, và `/checkout` đọc đúng giỏ.
5. Gói đủ điều kiện nhận quà → đúng 1 dòng quà, giá 0 (không bị nhân đôi).
6. Giỏ dùng chung: thêm hàng từ template mới rồi sang template Lunara cũ (và ngược lại) → giỏ còn đủ dòng, tên biến thể
   vẫn nguyên.
7. Không lỗi console; không cuộn ngang ở 360 / 390 / 1440 px.
8. `mobile-audit` trên trang mới: 0 lỗi overflow / tap / text / input / cls-img / lcp-lazy cho các phần tử trong
   `.tvb`.
9. Customize: các section / khối của template mới thêm, xoá, sửa được; ô ảnh còn trống thì hiện ảnh mặc định của
   Tredvik.

Không hồi quy:
10. Template `product` / `bundle` / `sizes` / `tiles`, trang chủ, collection, page, checkout, tracking: ảnh chụp trước và
    sau giống nhau (1440 + 390). Các trang này không nạp `tv-bundle.css` hay `tv-*.js`.
11. Header / footer / cart drawer trên trang mới trông y như trên các trang Lunara khác (CSS của `.tvb` không lọt ra
    ngoài).
12. Diff của `settings_data.json` chỉ có thêm các khoá `tv_*` mới.

Giao hàng:
13. `npm test` xanh; `node tools/pack.js themes/lunara-black-brixpant` 0 lỗi (cảnh báo `theme.css` có từ trước được
    chấp nhận); zip nằm trong `dist/`.

## Ranh giới

- **Luôn**: làm trong `themes/lunara-black-brixpant/` (cộng `tools/pack.js` + test của nó); file mới có tiền tố `tv-`;
  file sinh ra chỉ sửa qua kịch bản; giữ mọi hook pixel / platform; kiểm tra ở 360 px.
- **Hỏi trước**: upload lên store hay đổi template của sản phẩm thật; commit; sửa file Lunara cũ nào ngoài
  `sections/product-scripts.hbs`, `config/settings_schema.json`, `config/settings_data.json`, `theme.json`, `README.md`;
  mọi thay đổi khác trong `tools/`.
- **Không bao giờ**: sửa `core.js` (`tv-core.js` chép nguyên byte), `theme.js` của Lunara, `templates/checkout.hbs` hay
  logic giỏ / checkout; sửa thư mục trong Downloads hay `reference/`; đặt giá trong theme; thêm form viết review; dùng
  helper ngoài danh sách của engine.

## Rủi ro

- `ui.js` có thể gắn phần tử ra thẳng `<body>` (lightbox ảnh review, thanh mua dính, popup bảng size) → các phần tử đó
  ra ngoài `.tvb` và mất style. Cần đo, rồi bọc `.tvb` hoặc giữ chúng trong section.
- `theme.js` của Lunara nghe click `#addToCart` trên toàn trang, mà nút của Tredvik cũng dùng id này → phải chứng minh
  chỉ một bên xử lý (tiêu chí 4).
- Ngân sách JS 150 KB: trang mới nạp `theme.js` 111 KB + `tv-core.js` 28 KB + `tv-ui.js` ≤ 90 KB, nên chắc chắn vượt
  (xem câu hỏi 5).
- Engine thật có thể khác preview ở chỗ nạp `<link rel="stylesheet">` nằm trong `<body>`. Maggies Tanks đã dùng cách
  này (`mt-landing.css`) và chạy được.

## Quyết định (người dùng, 2026-11-09)

1. **Template nguồn**: người dùng để tôi chọn → `themes/tredvik/templates/product.json` (trang Tredvik đầy đủ, vốn đã
   bán gói 1–4 cái có bộ chọn từng cái). `product.bundle.json` chỉ là bản gói chung của base với chữ mẫu, không có
   thiết kế Tredvik.
2. **Khung trang**: của **Lunara**.
3. **Nội dung mặc định**: giữ chữ + ảnh của Tredvik, người dùng tự thay sau.
4. **`tools/pack.js`**: đồng ý sửa để nhận partial inline.
5. **Ngân sách JS**: chấp nhận vượt 150 KB, báo con số.
6. **Tên**: "Tredvik – Brixpant bundle", thư mục `themes/lunara-black-brixpant/` — ổn.
