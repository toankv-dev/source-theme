# Plan: Lunara Black (brixpant.com) — template "Tredvik – Brixpant bundle"

Spec: [SPEC-lunara-brixpant-tredvik-template.md](SPEC-lunara-brixpant-tredvik-template.md) · Việc:
[todo-lunara-brixpant-tredvik-template.md](todo-lunara-brixpant-tredvik-template.md)

## Tổng quan

Chép theme Lunara Black của brixpant.com vào `themes/lunara-black-brixpant/`, rồi thêm template sản phẩm
`product.tredvik-brixpant-bundle.json`: header / footer / cart drawer giữ của Lunara, thân trang là 8 section của Tredvik,
đổi tên `tv-*`, CSS gói trong `.tvb`, JS chỉ nạp trên template này. Làm theo lát dọc: trước tiên khối mua + giỏ (phần
nhiều rủi ro nhất), sau đó các section nội dung, cuối cùng là kiểm tra hồi quy và đóng gói.

## Quyết định kiến trúc (sau khi đọc mã)

- **Mọi file `tv-*` sinh ra từ một kịch bản** `_work/build-tvb.js`, đọc thẳng từ `themes/tredvik` theo một bảng ánh xạ
  (nguồn → đích, đổi partial `{{> x}}` → `{{> tv-x}}`, đổi `@root.settings.<id>` → `@root.settings.tv_<id>`). Chạy lại
  bao nhiêu lần cũng ra cùng kết quả; khi Tredvik có bản mới thì chỉ cần chạy lại.
- **CSS có phạm vi** — `_work/scope-css.js` (hàm thuần, có test):
  - `:root`, `html`, `body`, `body.b-body` → `.tvb`; `*`, `*:before`, `*:after` → `.tvb *…`; bộ chọn phần tử
    (`img`, `a`, `button`, `h1`…) → `.tvb img`…; bộ chọn lớp → `.tvb .b-…`.
  - Đi vào bên trong `@media` / `@supports`; giữ nguyên `@keyframes` / `@font-face`.
  - **Ngoại lệ**: `body.b-lock` giữ nguyên, vì `ui.js` gắn lớp này lên `<body>` để khoá cuộn và Lunara không dùng lớp
    này.
- **Biến CSS và font**: `tv-vars` in `.tvb{--c-ink:…}` từ các cài đặt `tv_*`; `tv-fonts` in `@font-face` Montserrat /
  DM Serif Display (Lunara dùng Poppins nên không đụng nhau). Cả hai, cùng `<link>` tới `tv-bundle.css` và ba
  `<script defer>`, chỉ do `tv-product` in. Các section `tv-*` khác chỉ dùng trong template này (ghi trong README).
- **Cài đặt `tv_*`**: `primary`, `primary_text`, `accent`, `text_color`, `page_bg`, `check`, `badge`, `sale`, `alert`,
  `star`, `font`, `font_heading`, `font_weights`, `radius`, `btn_radius`, `btn_case`, `page_width`,
  `load_google_fonts`, `atc_label`, `pay_*`. Mặc định là giá trị Tredvik hiện tại (`#000000`, Montserrat / DM Serif
  Display, nền `#f7f7f7`, sao `#f3cc4b`…). Hai nhóm sau **dùng chung với Lunara, không thêm tiền tố**:
  - `open_cart_on_add`;
  - `allow_tiered_discount`, `allow_bxgy_discount`, `allow_amount_off_discount` (cùng id ở hai theme; Lunara đang
    tắt amount-off). Dòng `#b-offers` của `head.hbs` (Tredvik) chép vào `tv-product`, nên giá gói theo đúng công tắc
    của store.
- **Dữ liệu sản phẩm**: `#sf-variants-data` đã có sẵn do layout Lunara in, kể cả trên template mới; nội dung được điền
  lúc phân tích trang, trước khi `tv-core.js` (defer) chạy, nên không in thêm. `tv-product` in `#sf-gifts-data` (Lunara
  không in) và `#b-offers`.
- **`tv-bridge.js`** (nạp sau `tv-core.js` / `tv-ui.js`):
  1. Bắt `b:cart-added`: thêm `opts` = `[{name, value}]` từ chuỗi `variant` vào các dòng vừa thêm (đọc `Base.cart.get()`,
     ghi lại bằng `Base.cart.save(cart, true)`), rồi phát `StorageEvent('storage', {key: Base.cart.key})` để `MSCart`
     đọc lại giỏ, rồi `MSCart.open()` nếu `open_cart_on_add` không tắt.
  2. Có cờ chống lặp: `tv-core.js` cũng nghe `storage` và phát `b:cart-change`; bridge **không** nghe
     `b:cart-change`, và trong lúc tự phát sự kiện thì bật cờ.
  3. Popup bảng size bị `initModals` dời ra `<body>`: bridge bọc nó trong một `<div class="tvb">` để giữ style và biến
     CSS.
- **ViewContent**: `sections/product-scripts.hbs` của Lunara thêm đúng một điều kiện: bỏ qua khi có
  `[data-tvb-page]`. Trên template mới `tv-core.js` bắn sự kiện này; các template cũ vẫn chạy y như trước.
- **Dòng quà**: hai bên (`tv-core.js` và `theme.js`) cùng *thay* dòng quà bằng kết quả của cùng một API, nên về lý thuyết
  không bị nhân đôi. E2E sẽ đo; nếu vẫn nhân đôi thì bridge gộp các dòng quà theo `variantId` sau mỗi lần đồng bộ.
- **So sánh trực quan**: preview đọc `sample/product.json` của từng theme, mà sản phẩm mẫu của hai theme khác nhau.
  Vì vậy khi so `main` với Tredvik, dùng một bản sao tạm của theme mới trong scratchpad, thay bằng
  `sample/product.json` của Tredvik.
- **Hồi quy**: chụp HTML của các trang cũ trước khi sửa, sau khi sửa phải giống từng byte, trừ đoạn điều kiện
  ViewContent. Chụp thêm ảnh 1440 / 390. Thanh đếm ngược ở top bar thay đổi theo giờ, nên dùng HTML làm thước đo chính.

## Thứ tự

```
T1 chép + mốc ─┬─ T3 scope-css ── T4 tv-product hiện ── T5 giỏ + sự kiện ──┬─ T6 section nội dung ─┐
T2 pack.js ────┘                                                           └─ T7 FAQ + reviews ────┴─ T8 mobile / ảnh ── T9 hồi quy ── T10 đóng gói
```

T2 làm song song với T1 / T3 được; T6 và T7 song song với nhau được. Rủi ro lớn nhất (T5: hai bộ JS dùng chung một
giỏ) nằm sớm, ngay sau khi trang hiện được khối mua.

### Giai đoạn 1 — Nền

- [ ] T1: Chép theme vào repo, lưu mốc HTML / ảnh
- [ ] T2: `pack.js` nhận partial inline (TDD)
- [ ] T3: `scope-css.js` + test

**Checkpoint A**: `npm test` xanh · pack.js trên bản chép 0 lỗi (1 cảnh báo `theme.css` có từ trước) · `tv-bundle.css`
qua test phạm vi.

### Giai đoạn 2 — Lát dọc: khối mua + giỏ

- [ ] T4: `tv-product` hiện trên template mới (kịch bản build, cài đặt `tv_*`, biến / font / CSS)
- [ ] T5: Cầu nối giỏ + sự kiện (`tv-bridge.js`, điều kiện ViewContent, E2E)

**Checkpoint B**: E2E qua ở 1440 + 390 (tiêu chí 3–6) · không lỗi console · header / footer / drawer của Lunara trên
trang mới không đổi so với mốc.

### Giai đoạn 3 — Các section còn lại

- [ ] T6: `tv-image-with-text` ×2, `tv-steps`, `tv-comparison`, `tv-quotes`
- [ ] T7: `tv-faq`, `tv-reviews`

**Checkpoint C**: đủ 8 section đúng thứ tự · `main` lệch ≤ 3 % so với Tredvik (1440 + 390).

### Giai đoạn 4 — Chất lượng + giao hàng

- [ ] T8: Mobile + chỉnh ảnh (mobile-audit, cuộn ngang, thứ tự lớp của thanh mua dính / drawer)
- [ ] T9: Hồi quy các trang cũ
- [ ] T10: Phiên bản, tài liệu, zip

**Checkpoint cuối**: đủ 13 tiêu chí của spec · zip trong `dist/` · báo kết quả (con số trọng lượng JS / CSS, ảnh chụp)
để người dùng duyệt trước khi upload.

## Rủi ro

| Rủi ro | Mức | Cách xử |
|---|---|---|
| `StorageEvent` tự phát khiến `tv-core.js` phát `b:cart-change` → vòng lặp với bridge | Cao | Bridge chỉ nghe `b:cart-added`, có cờ chống lặp; E2E đếm số lần ghi giỏ |
| Drawer Lunara tính tổng khác giá thẻ gói (LuDisc vs `Base.discount`) | Cao | Cùng công tắc `allow_*`; E2E so tổng drawer với giá thẻ cho gói 1–4 khi có tiers / bxgy |
| Dòng quà bị nhân đôi | Trung bình | Đo trong E2E; nếu có thì bridge gộp theo `variantId` |
| Popup / lightbox bị dời ra `<body>` thì mất style | Trung bình | Bridge bọc `.tvb`; kiểm popup bảng size và ảnh review |
| Thứ tự lớp: thanh mua dính của Tredvik đè drawer / header của Lunara (z-index 1000 / 10001) | Trung bình | Kiểm ở T8; nếu đè thì chỉnh trong `_work/tvb-overrides.css` (gộp vào bundle) |
| Chế độ chỉnh sửa: `theme.js` bắt click `#addToCart` và gửi `submit` cho `r.form` → có thể thêm giỏ 2 lần | Thấp | E2E giả lập `window.Adlux.designMode = true`; nếu trùng thì nút của Tredvik không nằm trong `<form>` hoặc bridge chặn |
| Người bán thêm một section `tv-*` vào template Lunara khác → không có CSS / JS | Thấp | README ghi rõ; section `tv-*` chỉ dùng trong template này |
| Engine thật khác preview (`<link>` trong `<body>`) | Thấp | Cách này Maggies Tanks đã chạy thật (`mt-landing.css`) |
| Trọng lượng JS trên trang mới ≈ 230 KB | Đã chấp nhận | Báo con số; `tv-ui.js` bỏ các hàm của header / cart / collection / home nếu bỏ gọn được |

## Câu hỏi mở

Không còn câu hỏi chặn. Các checkpoint A–C là điểm tôi tự kiểm; chỉ checkpoint cuối dừng lại chờ người dùng duyệt
(cùng với commit / upload).
