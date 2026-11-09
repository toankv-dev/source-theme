# Việc: Lunara Black (brixpant.com) — template "Tredvik – Brixpant bundle"

Spec: [SPEC-lunara-brixpant-tredvik-template.md](SPEC-lunara-brixpant-tredvik-template.md) · Plan:
[plan-lunara-brixpant-tredvik-template.md](plan-lunara-brixpant-tredvik-template.md)

Thư mục theme: `themes/lunara-black-brixpant/` (gọi tắt `LB/`). Preview: `node tools/preview-server.js LB --port 8090`,
Tredvik gốc `--port 8091`.

## Giai đoạn 1 — Nền

- [x] **T1: Chép theme vào repo, lưu mốc** (S)
  - Làm: chép `C:\Users\ADMIN\Downloads\lunara-black---brixpant-com` → `LB/`; tạo `LB/_work/`; viết
    `_work/baseline.js` lưu HTML + ảnh (1440 / 390) của `/`, `/product`, `?template=bundle|sizes|tiles`,
    `/collections/all`, `/pages/about-us`, `/checkout`, `/pages/tracking/result` vào `_work/baseline/`.
  - Đạt: `diff -rq` giữa Downloads và `LB/` (trừ `_work/`) rỗng; mọi trang trả 200.
  - Kiểm: `diff -rq … ` · chạy `baseline.js`.
  - File: `LB/**` (chép), `LB/_work/baseline.js`.
  - Phụ thuộc: —

- [x] **T2: `pack.js` nhận partial inline** (S, TDD)
  - Làm: viết test trước; sau đó trong `pack.js` thêm bước đọc trước từng file để gom tên `{{#*inline "x"}}`
    (DecoratorBlock `inline`); phần gọi `{{> x}}` trong **cùng file** coi như có.
  - Đạt: fixture dùng inline của chính nó → 0 lỗi; partial thật sự thiếu → vẫn báo lỗi; inline khai ở file A không
    cứu được lời gọi ở file B.
  - Kiểm: `cd tools && npm test` (đỏ trước, xanh sau); `node tools/pack.js LB --no-zip` → 0 lỗi, 1 cảnh báo.
  - File: `tools/pack.js`, `tools/test/pack-inline.test.js`.
  - Phụ thuộc: — (cần T1 cho bước kiểm cuối)

- [x] **T3: `scope-css.js` + test** (S, TDD)
  - Làm: hàm thuần `scope(css, '.tvb')` theo đúng quy tắc trong plan (`:root` / `html` / `body` → `.tvb`, `*`, phần
    tử, lớp, đi vào `@media` / `@supports`, giữ `@keyframes` / `@font-face`, ngoại lệ `body.b-lock`).
  - Đạt: chạy trên `base.css` + `sections.css` + `skin.css` của Tredvik → mọi bộ chọn bắt đầu bằng `.tvb` (hoặc là
    `body.b-lock`); số quy tắc ra bằng số quy tắc vào; `@keyframes` không đổi.
  - Kiểm: `node --test LB/_work/scope-css.test.js`.
  - File: `LB/_work/scope-css.js`, `LB/_work/scope-css.test.js`.
  - Phụ thuộc: T1

### Checkpoint A
- [x] `npm test` xanh (54/54) · pack.js trên `LB` 0 lỗi · test phạm vi CSS xanh (9/9)

## Giai đoạn 2 — Lát dọc: khối mua + giỏ

- [x] **T4: `tv-product` hiện trên template mới** (M; nhiều file nhưng đều sinh từ một kịch bản)
  - Làm: viết `_work/build-tvb.js` (bảng ánh xạ, đổi tên partial / setting), sinh ra:
    - `sections/tv-product.hbs` + schema;
    - các snippet `tv-buy-row`, `tv-options`, `tv-pack-cards`, `tv-pack-qcard`, `tv-price`, `tv-stars`,
      `tv-icon-caret`, `tv-icon-arrow`, `tv-pay-icons`, `tv-fonts`, `tv-vars`;
    - `assets/css/tv-bundle.css` (qua T3); chép `tv-core.js` (giống từng byte), `tv-ui.js`; font, ảnh `tv-*`, `pay/`;
    - nhóm cài đặt "Tredvik template" (`tv_*`) chỉ thêm vào cuối `settings_schema.json` / `settings_data.json`;
    - `templates/product.tredvik-brixpant-bundle.json`, tạm thời chỉ có section `main`.
    `tv-product` gồm wrapper `.tvb[data-tvb-page]`, vars, fonts, link CSS, `#b-offers`, `#sf-gifts-data`, 3 script defer.
  - Đạt: khối mua của Tredvik hiện đúng (gallery, đánh giá, lợi ích, thẻ gói 1–4 có bộ chọn từng cái, nút mua, ảnh,
    accordion); không lỗi console; vùng header / footer giống ảnh mốc; `sha1(tv-core.js) = sha1(core.js Tredvik)`.
  - Kiểm: chạy build 2 lần → `git diff --stat` không đổi lần hai; chụp `?template=tredvik-brixpant-bundle` ở 1440 / 390;
    pack.js `--no-zip` 0 lỗi.
  - File: `LB/_work/build-tvb.js` + các file sinh ra ở trên, `LB/config/settings_schema.json`,
    `LB/config/settings_data.json`.
  - Phụ thuộc: T2, T3

- [x] **T5: Cầu nối giỏ + sự kiện** (M)
  - Làm: `assets/js/tv-bridge.js` (thêm `opts`, phát `StorageEvent` có cờ chống lặp, `MSCart.open()`, bọc `.tvb` quanh
    popup bị dời ra `<body>`); thêm điều kiện `[data-tvb-page]` vào ViewContent trong `sections/product-scripts.hbs`;
    `_work/tvb-e2e.js` (Playwright, đọc `window.__events` + localStorage).
  - Đạt (1440 + 390):
    - Gói 1 / 2 / 3 / 4 với Color / Size khác nhau → đúng dòng / số lượng / `variantId`; drawer Lunara mở, có tên biến
      thể, tổng tiền = giá trên thẻ.
    - Đúng 1 ViewContent mỗi lần tải; đúng 1 AddToCart mỗi lần thêm; đúng 1 InitiateCheckout và `/checkout` đọc đúng
      giỏ.
    - Đủ điều kiện quà → đúng 1 dòng quà giá 0.
    - Giỏ đi qua lại giữa template mới và `?template=bundle` vẫn giữ đủ dòng và tên biến thể.
    - Ở chế độ chỉnh sửa (`Adlux.designMode`), một lần bấm chỉ thêm giỏ một lần.
    - Template cũ vẫn có đúng 1 ViewContent.
  - Kiểm: `node LB/_work/tvb-e2e.js http://localhost:8090`.
  - File: `LB/assets/js/tv-bridge.js`, `LB/sections/product-scripts.hbs`, `LB/_work/tvb-e2e.js`,
    `LB/_work/build-tvb.js` (thêm thẻ script).
  - Phụ thuộc: T4

### Checkpoint B
- [x] E2E xanh ở 1440 + 390 (29/29 mỗi cỡ trên theme; 98/98 trên bản sao gói 1–4 + tiers) · không lỗi console

## Giai đoạn 3 — Các section còn lại

- [x] **T6: Các section nội dung** (M)
  - Làm: build thêm `tv-image-with-text`, `tv-steps`, `tv-comparison`, `tv-quotes` (+ schema); đưa `iwt_1`, `iwt_2`,
    `steps`, `compare`, `quotes` vào template theo đúng thứ tự Tredvik, giữ nguyên chữ và `default_*`.
  - Đạt: 5 khối hiện như ở Tredvik; ô ảnh trống thì hiện ảnh mặc định của Tredvik; hàng quotes cuộn ngang trên điện
    thoại.
  - Kiểm: chụp 1440 / 390 cạnh trang Tredvik (`tools/side-by-side.js`); pack.js 0 lỗi.
  - File: `LB/_work/build-tvb.js` (bảng ánh xạ) + các section sinh ra, template JSON.
  - Phụ thuộc: T4 (song song với T7 được)

- [x] **T7: FAQ + reviews** (S)
  - Làm: build `tv-faq`, `tv-reviews` (+ `tv-faq-list`, `tv-faq-qa`); thêm `faq`, `reviews` vào cuối template.
  - Đạt: FAQ mở / đóng có hoạt ảnh, mặc định đóng hết; reviews dạng list với Show more, ảnh trước; không có form viết
    review; lightbox ảnh review có style.
  - Kiểm: chụp + bấm thử bằng Playwright (thêm vào `tvb-e2e.js`).
  - File: `LB/_work/build-tvb.js` + các section / snippet sinh ra, template JSON, `LB/_work/tvb-e2e.js`.
  - Phụ thuộc: T4

### Checkpoint C
- [x] Đủ 8 section đúng thứ tự · `main` lệch 1,46 % (1440) / 0,55 % (390) so với Tredvik (bản sao tạm dùng
      `sample/product.json` của Tredvik)

## Giai đoạn 4 — Chất lượng + giao hàng

- [x] **T8: Mobile + chỉnh ảnh** (S–M)
  - Làm: chạy mobile-audit và so `main`; sửa lệch trong `_work/tvb-overrides.css` (build gộp vào cuối bundle). Kiểm
    thanh mua dính khi drawer Lunara mở và khi header dính.
  - Đạt: mobile-audit 0 lỗi overflow / tap / text / input / cls-img / lcp-lazy cho phần tử trong `.tvb` ở 360 / 390;
    không cuộn ngang ở 1440; `main` lệch ≤ 3 %; drawer luôn nằm trên thanh mua dính.
  - Kiểm: `MSYS_NO_PATHCONV=1 node tools/mobile-audit.js http://localhost:8090 --pages "/product?template=tredvik-brixpant-bundle" --width 360,390`.
  - File: `LB/_work/tvb-overrides.css`, `LB/_work/build-tvb.js`, `LB/assets/css/tv-bundle.css` (sinh ra).
  - Phụ thuộc: T5, T6, T7

- [x] **T9: Hồi quy các trang cũ** (S)
  - Làm: `_work/regress.js` so HTML / ảnh hiện tại với `_work/baseline/`.
  - Đạt:
    - HTML các trang cũ giống mốc từng byte, chỉ trừ đoạn điều kiện ViewContent.
    - Không trang cũ nào nạp `tv-bundle.css` hay `tv-*.js`.
    - Diff của `settings_data.json` chỉ là các khoá `tv_*` mới.
    - Header / footer / drawer trên trang mới giống trên trang cũ.
  - Kiểm: `node LB/_work/regress.js http://localhost:8090`.
  - File: `LB/_work/regress.js`.
  - Phụ thuộc: T8

- [x] **T10: Phiên bản, tài liệu, zip** (S)
  - Làm: `theme.json` → `2026.11.09.1` + description; README có mục template mới (bố cục, cài đặt `tv_*`, các section
    `tv-*` chỉ dùng trong template này, cách build lại); thêm `CHANGELOG.md`; ghi số đo trọng lượng JS / CSS của trang
    mới.
  - Đạt: `npm test` xanh; `node tools/pack.js LB` 0 lỗi → zip trong `dist/`; zip không chứa `_work/`.
  - Kiểm: pack.js; liệt kê nội dung zip.
  - File: `LB/theme.json`, `LB/README.md`, `LB/CHANGELOG.md`.
  - Phụ thuộc: T9

### Checkpoint cuối (dừng, chờ người dùng)
- [ ] Đủ 13 tiêu chí của spec · zip · ảnh chụp và con số gửi người dùng duyệt · commit / upload chỉ làm khi người dùng
      bảo

## Kết quả (2026-11-09, preview local)

- Zip: `dist/lunara-black-2026.11.09.1.zip` (145 file, 2,6 MB), pack.js 0 lỗi (1 cảnh báo `theme.css` có từ bản gốc).
- E2E `_work/tvb-e2e.js`: 70/70 (template như giao, 1440 + 390); 112/112 (bản sao: gói 1–4, bật tiered, khối size chart).
- Thân trang so với Tredvik gốc: lệch 1,46 % (1440), 0,55 % (390), 1,05 % (360).
- Trang Lunara cũ: HTML giống từng byte (template sản phẩm: thêm đúng dòng điều kiện ViewContent), ảnh 0,000 %; khung
  Lunara trên trang mới: 291 phần tử, 0 khác biệt style.
- mobile-audit 360 / 390: không có lỗi mới nào trong `.tvb`; JS 232 KB / CSS 701 KB (Lunara riêng: 113 / 583 KB) — đã chấp nhận.
- Phát hiện khi làm: Lunara có `div:empty{display:none}` và 33 luật cấp phần tử khác mạnh hơn lớp reset → bộ scope thêm
  `:not(#tvb-x)` (sức nặng ID); `body.b-body` mạnh hơn `body` → `.tvb.tvb`; popup đưa lên trên header Lunara (z 10002).
- Lưu ý store: brixpant đang **tắt** "Allow tiered discount" (Theme settings → Discounts) nên thẻ gói (giống Kaching + drawer
  của Lunara) không hiện giảm giá tiered cho tới khi bật.
