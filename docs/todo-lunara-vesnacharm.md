# Todo: Lunara Vesnacharm

Spec: [SPEC-lunara-vesnacharm.md](SPEC-lunara-vesnacharm.md) · Plan: [plan-lunara-vesnacharm.md](plan-lunara-vesnacharm.md).
`VN` = `themes/lunara---vesnacharm`; `COPY` = bản so sánh `<scratchpad>/vn-copy` do `VN/_work/compare-copy.js` tạo, chạy
preview ở cổng 8093. URL của template: `/product?template=triple-zone-bodysuit`.

## Giai đoạn 0 — Nền

- [x] **T1: Chép theme, đổi tên template, chụp mốc** (M)
  - Làm:
    - lưu SHA-256 mọi file của hushflex vào `<scratchpad>/hushflex-sha256.txt`;
    - chép hushflex → `VN`;
    - `theme.json`: name "Lunara Vesnacharm", version `2026.11.19.1`, description mới;
    - `_work/build-sc.js` ghi `templates/product.triple-zone-bodysuit.json`, tên "Triple-Zone Drop-Seat Bodysuit", nhãn
      skin "Bodysuit (…)"; chạy lại script rồi xoá `templates/product.shapecurve.json` **trong VN**;
    - `compare-copy.js` và `sc-e2e.js` dùng tên mới; sửa chú thích đường dẫn hushflex → vesnacharm;
    - chạy `mobile-audit`, `smoke`, `sc-e2e` trên COPY rồi lưu kết quả vào `VN/_work/baseline/`, cùng ảnh chụp 1440 / 390.
  - Đạt khi:
    - template mới render không lỗi script;
    - `sc-e2e` qua (hành vi giữ nguyên);
    - `pack.js VN` ra 0 lỗi và tên zip là `lunara-vesnacharm-2026.11.19.1.zip`.
  - Kiểm: `node VN/_work/sc-e2e.js`; `node tools/pack.js VN`; `grep -r "shapecurve.json" VN --include=*.js` = 0.
  - File: `VN/theme.json`, `VN/_work/build-sc.js`, `VN/_work/compare-copy.js`, `VN/_work/sc-e2e.js`,
    `VN/templates/product.triple-zone-bodysuit.json`.

- [x] **T2: Màu và chữ toàn theme bằng setting** (S) — phụ thuộc T1
  - Làm: viết `VN/_work/build-vn-settings.js`, ghi cả `settings_data.json` lẫn default trong `settings_schema.json`:
    - `primary` `#333333`, `primary_text` `#ffffff`, `footer_bg` `#000000`, `footer_text` `#ffffff`, `sale` `#e13f3f`;
    - `show_footer_wave` false;
    - top bar: `topbar_style` `rotate`, `topbar_text` "FREE SHIPPING OVER $79|Don't Wait, Black Friday Starts Now!",
      `topbar_color` `#232323`;
    - setting mới `highlight` `#790236` (nhóm Colors);
    - `vn_ft_*` (chữ footer) và `vn_footer_logo` (image_picker).

    Mỗi giá trị kèm chú thích nguồn đo.
  - Đạt khi: chạy lại script lần 2 không sinh diff; nút / footer / badge chuyển màu `#333` / `#000` trên COPY; footer
    không còn sóng.
  - Kiểm: chạy script 2 lần và so `git diff --no-index`; `pixel.js` trên ảnh COPY ở nút ADD TO CART và nền footer;
    `pack.js` ra 0 lỗi.
  - File: `VN/_work/build-vn-settings.js`, `VN/config/settings_data.json`, `VN/config/settings_schema.json`.

## Giai đoạn 1 — Khung trang (lần lượt; T3–T6 cùng sửa `vn-chrome.css`)

- [x] **T3: Biến highlight và top bar** (M) — phụ thuộc T2
  - Làm:
    - `gs-head.hbs`: thêm `<style>:root{--vn-hl;--vn-grad}</style>` và link `css/vn-chrome.css` ngay sau `custom.css`;
    - nhánh `rotate` của top bar: thêm nút ‹ › (vùng bấm 44 px, `aria-label`), cao 36 px, nền `var(--vn-grad)` (có màu
      đặc làm dự phòng), chữ `#232323` đậm in hoa 13 px.
  - Đạt khi:
    - `pixel.js` y 0–35 ra các sắc độ `#790236` (`#f6edf1` … `#e4ccd7`) ở 1440 / 390;
    - bấm ‹ › thì đổi câu;
    - checkout không nạp `vn-chrome.css`.
  - Kiểm: `shot.js --eval` bấm mũi tên rồi đọc chữ; `pixel.js`; `mobile-audit` không báo vùng bấm < 44 px ở top bar.
  - File: `VN/snippets/gs-head.hbs`, `VN/assets/css/vn-chrome.css`, `VN/sections/header.hbs`.

- [x] **T4: Header hai hàng** (S) — phụ thuộc T3
  - Làm:
    - `header--middle-center` → `header--top-center`;
    - CSS: logo giữa hàng 1, menu giữa hàng 2 (chữ `#232323`, cỡ / khoảng cách đo trên mẫu), icon bên phải, số đếm giỏ
      nền đen chữ trắng;
    - phone: icon menu bên trái, logo giữa, icon bên phải.
  - Đạt khi:
    - ảnh 1440 khớp bố cục mẫu;
    - lề header và thân trang lệch ≤ 1 px ở 1440 / 1024 / 390 / 360;
    - menu xổ xuống (Collections) và drawer phone vẫn mở được.
  - Kiểm: `shot.js` 4 độ rộng, `--eval` đo mép; `visual-diff` dải 0–190 px so với `_work/site/pages/product-shapecurve/desktop.png`.
  - File: `VN/sections/header.hbs`, `VN/assets/css/vn-chrome.css`.

- [x] **T5: Footer 5 cột** (M) — phụ thuộc T2 (CSS sau T4)
  - Làm: thay `ft-main` / `ft-bottom` bằng 5 cột như mục 5 của plan.
    - Dải dưới `#111111`: © bên trái, 8 icon thanh toán bên phải.
    - Nút SUBMIT nền `var(--vn-grad)`.
    - Phone: các cột xếp dọc.
    - Giữ `data-lu-newsletter`, `#lu-newsletter-email`, `data-ms-year`, `#ms-card-tpl`, `#QuickAdd-ms`.
  - Đạt khi:
    - `pixel.js` ra nền `#000000` và dải dưới `#111111`;
    - link đi đúng `policyLinks` / `trackUrl` / collections;
    - newsletter vẫn phản hồi như trước;
    - grep thấy đủ các hook như trước khi sửa.
  - Kiểm: `shot.js --selector "#lu-ft"` 1440 / 390; `--eval` liệt kê `href`; bấm SUBMIT với email thử trên preview;
    `mobile-audit`.
  - File: `VN/sections/footer.hbs`, `VN/assets/css/vn-chrome.css`, `VN/_work/build-vn-settings.js` (nếu thêm chữ).

- [x] **T6: Thẻ sản phẩm và "You Will Also Love"** (M) — phụ thuộc T5
  - Làm:
    - `#ms-card-tpl`: thêm `<span class="vn-badge" data-ms-badge><span data-ms-pct></span>% OFF</span>` ở góc phải trên;
    - CSS:
      - dải `#f8f8f8` tràn hai mép;
      - tiêu đề in hoa nhỏ `#232323` (đo trên mẫu);
      - thẻ trắng không đổ bóng;
      - giá sale `#e13f3f`, giá gốc xám gạch ngang;
      - sao vàng `#F9C40F`;
    - `build-sc.js`: `related.show_quick_add = false`, chạy lại.
  - Đạt khi:
    - related trên template bodysuit không có nút;
    - sản phẩm có giá gốc thì có badge đỏ, không có thì không có badge;
    - thẻ trên `/` và `/collections/all` vẫn đủ ảnh, tên, giá, nút.
  - Kiểm: `shot.js` cho template, `/`, `/collections/all`; `pixel.js` ở badge / giá; `smoke.js` so với mốc.
  - File: `VN/sections/footer.hbs`, `VN/assets/css/vn-chrome.css`, `VN/_work/build-sc.js`,
    `VN/templates/product.triple-zone-bodysuit.json`.

### Checkpoint A — người dùng xem

> Ghi chú khi làm (2026-11-19):
> - Preview chạy ở cổng **8097**, vì cổng 8093 đang bị preview hushflex của một phiên khác giữ.
> - Lunara `#lu-ft` bỏ qua `footer_bg` (lấy nền từ màu chính); CSS mới đọc `--lu-footer-rgb`.
> - Giá sale trong thẻ đo được là `#ff0000`, khác với `#e13f3f` ghi trong spec; nhãn "% OFF" mới là `#e13f3f`.
> - Thanh trên cùng có 2 câu; câu thứ 3 của mẫu chứa mã `BLK20` mà store không có, nên bỏ.
> - Ảnh so sánh: `themes/lunara---vesnacharm/_work/compare/1-top-1440.png`, `2-related-1440.png`, `3-footer-1440.png`,
>   `4-top-390.png`.

- [ ] Gửi ảnh cạnh nhau của template bodysuit với shape-curve.com (`side-by-side.js`, 1440 + 390): top bar, header,
  related, footer. Bạn đồng ý mới làm tiếp T7.

## Giai đoạn 1b — Sửa sau Checkpoint A (người dùng, 2026-11-19; spec mục "Bổ sung sau Checkpoint A")

- [x] **T6b: Add to cart kiểu hushflex, nền #333** (S)
  - Làm: trong `assets/css/sc-product.css` của VN, bỏ các luật skin ép nút `#addToCart` thành nút phẳng (nền `#333!important`,
    bo 10 px, ẩn `::before` / `::after`, cao 52 px, chữ 20 px). Nút `.sc-buynow` giữ nguyên.
  - Đạt khi: `#addToCart` của template bodysuit có cùng bo góc, chiều cao, font và hiệu ứng `::after` như template
    `product` (đo cả hai bằng `getComputedStyle`); nền `#333333`; e2e vẫn qua.
  - Kiểm: `shot.js --eval` so 2 template; chụp trạng thái hover; `sc-e2e.js`.
  - File: `VN/assets/css/sc-product.css`.

- [x] **T6c: Section `sc-reviews` kiểu Okendo** (L, chia 3 bước) — phụ thuộc T6b
  - Làm:
    1. `sections/sc-reviews.hbs`: phần render từ server (tóm tắt, phân bố, danh sách trang đầu từ `product.reviews`),
       có `<style>` riêng; schema sinh bằng `build-sc.js` (chữ, bật / tắt "would recommend", số review mỗi lần, màu sao).
    2. `<script>` riêng:
       - tải `reviewsUrl` (limit 50), điền phân bố và "would recommend" (4–5★);
       - dải ảnh và popup xem ảnh;
       - Filters (sao / có ảnh) và bấm thanh để lọc;
       - Sort; ngày dạng tương đối; Read More; Show More (lộ thêm review đã tải, hết thì tải trang sau);
       - không gọi được API thì dùng review render từ server.
    3. Template: `reviews` → `sc-reviews` (giữ anchor `#lu-reviews` cho nút "View All"). `compare-copy.js` thêm 12 review
       mẫu có ảnh (`assets/images/sc-reviews/*`, chỉ cho bản so sánh); `sc-e2e.js` thêm phần kiểm review.
  - Đạt khi:
    - giống ảnh người dùng gửi ở 1440 / 390, trừ cờ quốc gia, "Was this helpful?" và nút Write a Review;
    - sort / lọc / Show More / Read More / popup ảnh chạy được;
    - không có lỗi script;
    - template `product` vẫn dùng section `reviews` cũ, không đổi.
  - Kiểm: `sc-e2e.js` (1440 + 390); ảnh cạnh nhau với ảnh người dùng gửi; `mobile-audit`.
  - File: `VN/sections/sc-reviews.hbs`, `VN/_work/build-sc.js` (→ `sc-reviews.schema.json`, template),
    `VN/_work/compare-copy.js`, `VN/_work/sc-e2e.js`.

### Checkpoint A2 — người dùng xem lại nút Add to cart và phần review

> Ghi chú khi làm:
> - `sc-e2e.js` qua 102 bước (1440 + 390), trong đó 20 bước mới cho review.
> - Khoảng cách các khối review khớp ảnh người dùng gửi, lệch ≤ 1 px.
> - Review trang đầu đọc lại từ HTML (đã escape), **không** nhúng vào `<script>`, vì helper `json` của engine không escape `<`.
> - Ảnh so sánh: `_work/compare/5-reviews-1440.png`, `6-reviews-390.png`, `7-atc-normal.png`, `8-atc-hover.png`.

## Giai đoạn 1c — Sửa sau lần upload live đầu tiên (người dùng, 2026-11-19, bản 2026.11.19.2)

> Zip được upload **đè vào theme `d696f6cf`** (theme hushflex cũ), vì vậy cài đặt đã lưu của hushflex vẫn thắng: màu chính
> `#124F9F`, top bar kiểu countdown. Tên tuỳ chọn size của sản phẩm là "Side" (đặt trong admin).

- [x] Logo: setting Header > Logo width (280 / 180 px) + file logo đã cắt `dist/vesnacharm-logo-trimmed.png`.
- [x] Top bar countdown không có nền riêng → màu highlight.
- [x] Gói: ẩn dòng "Size, Color" (CSS của skin).
- [x] Highlights: setting Look, mặc định Check list (icon tick tròn, màu highlight, bỏ emoji đầu dòng).
- [x] Add to cart: nền giống nút express (`#f0f0f0` + gradient, chữ `#333`), giữ hiệu ứng của Lunara; bỏ nút express
  (`buy_now_label` rỗng).
- [x] Nút của thanh sticky: không còn `#124f9f` ghi cứng.
- Cài đặt (người dùng tự làm trong admin):
  - Primary colour = `#333333`;
  - Pack 4 trong block Kaching bundle;
  - xoá Second button nếu template đã được lưu;
  - đổi tên tuỳ chọn "Side" → "Size";
  - upload logo đã cắt.
- Kiểm: `sc-e2e.js` 110 bước qua; zip `lunara-vesnacharm-2026.11.19.2.zip` 0 lỗi; hushflex không đổi.

### Bản 2026.11.19.3 (người dùng, 2026-11-19)
- [x] Review: phân trang dạng số (‹ 1 2 3 4 5 … 20 ›) thay cho Show More. Review tải khi section gần màn hình, mỗi đợt 50,
  tối đa 500.
- [x] Nút cuộn lên đầu trang dùng màu highlight.
- Kiểm: `sc-e2e.js` 122 bước qua (thêm template chỉ có trong bản so sánh `reviewpages`, 1 review mỗi trang); zip .3 0 lỗi;
  hushflex không đổi.

### Bản 2026.11.19.4 (người dùng, 2026-11-19)
- [x] Bỏ bộ chọn Color / Size chính phía trên các gói. Mặc định của template là `show_variants: false`; mỗi dòng trong gói
  vẫn có bộ chọn riêng.
- [x] Sửa lỗi: bỏ tick "Show variant pickers…" trước đây không có tác dụng trong skin bodysuit (`sc-product.css` ép hiện).
- Kiểm: `sc-e2e.js` 128 bước qua (các luồng có bộ chọn chính chạy trên template `picker`, chỉ có trong bản so sánh);
  zip .4 0 lỗi; hushflex không đổi.

### Bản 2026.11.19.5 (người dùng, 2026-11-19): màu chủ đạo #790236
- [x] Footer: setting mới Colors > Footer background (`vn_footer_bg`, để trống = highlight) thay `footer_bg`. Giá trị
  `footer_bg` đã lưu `#000000` trên store sẽ thắng mọi giá trị mặc định mới, nên không dùng nó nữa. Dải dưới là màu
  footer đậm hơn.
- [x] Add to cart (mọi template), nút trên thẻ sản phẩm, quick add, thanh sticky, Check out trong cart drawer, nút
  Pay / Continue ở trang checkout: dùng màu highlight, chữ trắng.
- [x] Nút cuộn lên có viền trắng, để không chìm trên footer cùng màu.
- Kiểm: `sc-e2e.js` 128 bước qua; đo màu từng nút (`#790236`, chữ trắng; Check out cả lúc rê chuột); zip .5 0 lỗi;
  hushflex không đổi.

### Bản 2026.11.19.6 (người dùng, 2026-11-19): cả theme theo tone #790236, viền nút cùng màu
- [x] `--lu-primary` và các biến accent của Dawn lấy từ highlight (gs-head, trang tracking, `--ink` của checkout). Bỏ
  setting Primary colour.
- [x] Viền và nền nút cùng màu chủ đạo, gồm:
  - viên chọn size/màu (skin bodysuit; Lunara default / Shapermint / Walmart);
  - ô màu dạng ảnh, thumbnail gallery;
  - Filters và chip của review;
  - chấm testimonials;
  - thanh phân bố, avatar, icon Verified, trang đang xem;
  - nhãn "% OFF", giá sale.
- [x] `_work/scan-colors.js` (thay T7): quét 11 trang cùng các trạng thái mở ở 1440 / 390, giả lập Primary `#124F9F`
  của server → sạch.
- Kiểm: `sc-e2e.js` 128 bước qua; zip .6 0 lỗi; hushflex không đổi.

### Bản 2026.11.19.7–.8 (người dùng, 2026-11-19)
- [x] .7: tiêu đề "BUY MORE - SAVE MORE" theo Accent colour của block (skin cũ ép màu đen).
- [x] .8: Find my size làm lại theo bộ gợi ý size của shape-curve:
  - Weight bắt buộc, Bust / Waist / Hips tuỳ chọn; đổi in / lbs ⇄ cm / kg;
  - "Select M" điền size; bảng size đầy đủ;
  - setting mới `rec_*`; tự nhận ra tuỳ chọn size theo giá trị khi tên không khớp ("Side").
- [x] .8: menu in đậm; trang hiện tại và lúc rê chuột dùng màu chủ đạo, gạch chân mảnh.
- [x] e2e và script quét: chặn `/events` của preview (live reload) để trang không tự tải lại giữa chừng.
- Kiểm: `sc-e2e.js` 122 bước qua; `scan-colors.js` sạch; zip .8 0 lỗi.
- Ghi chú: hushflex có thêm `assets/images.zip` (2026-11-19 14:31, 155 ảnh), không phải do việc này tạo ra; mọi file khác
  của hushflex không đổi.

### Bản 2026.11.19.9 (người dùng, 2026-11-19)
- [x] Nút Next ở trang Contact (form của nền tảng, chỉ nạp `base.css` + `custom.css`) còn xanh, do
  `:root{--lu-primary:#124F9F}` trong `custom.css`. Mọi giá trị xanh còn ghi cứng trong theme đã đổi sang màu chủ đạo,
  gồm:
  - mặc định trong `custom.css` / `base.css` (accent của Dawn `18, 79, 159`);
  - các giá trị dự phòng trong section / snippet;
  - màu hover `#0d3b78` → `#5c0129`.

  Việc đổi này là bước cuối của `patch-vn.js`.
- [x] Popup Find my size: cuộn được nhưng ẩn thanh cuộn.
- Kiểm: nút Next đo được `rgb(121, 2, 54)` khi dựng lại đúng cách trang Contact nạp CSS; popup cuộn bằng con lăn, thanh
  cuộn rộng 0; `sc-e2e.js` 122 bước qua; `scan-colors.js` sạch; zip .9 0 lỗi; hushflex không đổi (trừ `images.zip` của
  người dùng).

### "Complete the bundle" (bodysuit + áo ngực): TẠM GÁC (người dùng, 2026-11-19)
- Đề xuất ở spec, mục "Đề xuất: dòng Complete the bundle"; chưa duyệt, chưa code.
- Hiện trên store: Buy X Get Y "mua bodysuit → tặng áo ngực (Free)" đang chạy; thẻ áo ngực ở "Customers also add" trong
  cart drawer.

### Bản 2026.11.19.10 (người dùng, 2026-11-19, tham khảo tammycharm.com)
- [x] Dưới Add to cart (skin bodysuit): khung "Guaranteed **safe** checkout" có 7 icon thanh toán; hộp xám gồm
  "Order today, get it between {hôm nay + 7} and {hôm nay + 15}" và "45-day money-back guarantee. Read the policy".
  Mã ở `snippets/sc-trustbox.hbs`, chèn vào `product.hbs` qua `patch-vn.js`; setting mới của section Product (bật sẵn,
  có tác dụng cả với template đã lưu).
- Kiểm: `sc-e2e.js` 128 bước qua; `scan-colors.js` sạch; zip .10 0 lỗi; hushflex không đổi.

### Bản 2026.11.19.11 (người dùng, 2026-11-19, tham khảo tammycharm.com "See them in motion")
- Bỏ phương án "mũi tên ‹ › + 1 thẻ/màn hình" cho "Loved By 12,000+" (người dùng đổi ý). Ảnh review nhiều ảnh: dừng
  theo cùng tin nhắn (cần sửa cả API Shopdy, chưa làm).
- [x] Section mới "Customer videos" (`sections/sc-reels.hbs` + schema do `build-sc.js` sinh): nền màu chủ đạo sẫm,
  dòng nhỏ "Caught on camera", tiêu đề 2 dòng (dòng 2 nghiêng màu accent #F1C6D6), video dọc 9:16 cuộn ngang; video
  chạy tắt tiếng + lặp khi ≥ 50 % trên màn hình, dừng khi khuất (preload none); nút Sound (mỗi lúc 1 video có tiếng);
  chạm = dừng / chạy tiếp; điện thoại: video sau ló ra 62 % (như đối thủ) hoặc 1 video/màn hình (setting); mũi tên chỉ
  hiện trên desktop khi hàng dài hơn màn hình; ô trống không hiện trên store, không có video nào thì ẩn cả dải.
- [x] Template bodysuit: "Customer videos" (6 ô trống) đứng chỗ "Loved By"; "Photo testimonials" vẫn trong template
  nhưng ẩn (`disabled`), bật lại bằng icon con mắt trong editor.
- Kiểm: `sc-e2e.js` 130 bước qua (thêm 2 bước video); kiểm phát video bằng Chrome thật (H.264) ở 1440 / 390 trên
  template thử `reels` / `reelsone` của bản copy (4 video mẫu của club-ritual, chỉ trong bản copy): 35 bước qua;
  `scan-colors.js` (thêm trang video) sạch.

### Bản 2026.11.19.12 (người dùng, 2026-11-19, tham khảo tammycharm.com)
- [x] "Write a review" (đổi quyết định cũ "không có nút"): nút viền màu chủ đạo ở góc phải phần tổng điểm, mở form
  giống đối thủ; gửi `POST /api/storefront/reviews` có sẵn của Shopdy (review ở trạng thái chờ duyệt, merchant publish
  trong tab Reviews của sản phẩm). Email + "I recommend" chỉ hiển thị, nền tảng chưa lưu.
- [x] Nhãn "SAVE xx%" đứng ngay sau tên pack, màu chủ đạo (như ảnh người dùng gửi); phần còn lại của phụ đề ở dưới /
  cùng hàng (skin bodysuit). Template: SAVE style so với giá gạch, phụ đề `SAVE {save}` / `SAVE {save} {each} Each`.
- Kiểm: `sc-e2e.js` 132 bước qua; `write-save-check.js` (scratchpad) 1440 / 390 đạt, POST bị chặn và trả lời giả;
  số % với dữ liệu giống store: percent 12 / 17 %, so với giá gạch 50 / 56 / 58 %; `scan-colors.js` sạch.

### Bản 2026.11.19.13 (người dùng hỏi cách đổi "Loved By" sang video trên store, 2026-11-19)
- [x] Preset "Customer videos" có sẵn 6 ô Video; trong editor dải video luôn hiện (ô trống có chữ hướng dẫn).
- [x] Sửa: ô trống tràn khỏi hàng trong editor (hàng `max-content`, ô chỉ có nội dung absolute) → ô có `width` rõ ràng.
- Kiểm: `sc-e2e.js` 132 bước; kiểm phát video Chrome đạt; giả lập editor 6 ô, không tràn.

### Bản 2026.11.19.15 (người dùng, 2026-11-19/20)
- [x] Review nhiều ảnh (theme): đọc `images[]` / `media[]` / `image`, xếp dọc cột phải, dải ảnh + popup có ảnh nhỏ để
  chuyển; API thiếu ảnh không xoá ảnh SSR.
- [ ] Review nhiều ảnh (Shopdy, chờ mã Jira): thêm `images: r.mediaUrls` (bổ sung, giữ `image`) ở
  `storefront-reviews-feed.ts` và `product-mapper.ts` + test. Hiện nền tảng chỉ gửi ảnh đầu tiên.
- Ghi nhận 2026-11-20: trên vesnacharm.com cả 591 review của bodysuit đang KHÔNG có ảnh (API + trang), dù trước đó 5 review
  có ảnh → dữ liệu review đã mất ảnh (không phải theme); người dùng kiểm tra trong admin.
- [x] Video: luôn tự chạy (bỏ chặn khi "reduce motion"), hiệu ứng tải (sweep + spinner), chạm trang để chạy khi trình
  duyệt chặn autoplay, Sound chỉ 1 video trên cả trang.
- Kiểm: `sc-e2e.js` 134 bước; `reels-check2.js` / `reviews-multi-check.js` (scratchpad) đạt; quét màu sạch.
- Lưu ý: bản .14 ("Complete the bundle", SHOPDY-127) do phiên khác làm song song trên cùng thư mục theme; .15 gồm cả .14.

### Bản 2026.11.19.16 (người dùng, 2026-11-20, tham khảo tammycharm.com)
- [x] Top bar (rotating): nền trống = màu chủ đạo đặc (bỏ gradient nhạt), chữ trắng 14px/600, cao 40 / 44 px, mũi tên sát
  mép; setting mới "Text size (rotating messages)".
- Kiểm: `topbar-check.js` (scratchpad) đạt; `sc-e2e.js` 134 bước; quét màu sạch.

### Logo bị cắt ở trang checkout trên mobile (người dùng, 2026-11-20) — KHÔNG thuộc theme
- `/checkout` (class `ck-…`) do Shopdy `render-checkout.ts` vẽ, không nạp CSS nào của theme. Logo chỉ có
  `max-height` 44 / 48 px, không có `max-width`: logo 1800×150 (tỉ lệ 12) → rộng 576 px trên màn 390 (chỗ 354 px), desktop
  528 px trong cột 500 px.
- Vá tạm (người dùng tự dán): Store settings → Pixels & Analytics → Custom scripts:
  `<style>.ck-logo-img{max-width:100%!important;width:auto!important;height:auto!important;object-fit:contain}.ck-header{min-width:0}</style>`
  (thử trên checkout live bằng CSS chèn trong trình duyệt: 390 → 354×30, 360 → 324×27, 1440 → 500×42, vừa khung).
  Bị giữ lại nếu sau này bật banner cookie (Custom scripts chờ đồng ý).
- [ ] Sửa gốc trong Shopdy (chờ mã Jira): `.ck-logo-img{max-width:100%;width:auto;height:auto;object-fit:contain}` +
  test render.

## Giai đoạn 2 — Các trang còn lại

- [ ] **T7: Quét sạch màu xanh trên toàn theme** (M) — phụ thuộc Checkpoint A
  - Làm:
    - viết `VN/_work/scan-colors.js`: dùng Playwright mở 10 trang (xem plan) cùng cart drawer, liệt kê mọi phần tử có
      `color` / `background-color` / `border-color` / `fill` là `rgb(18, 79, 159)`;
    - sửa từng chỗ trong `vn-chrome.css`:
      - nút sticky `.lu-sticky-bar__btn`;
      - phần còn sót của drawer / reviews / size-finder / page;
    - dải nhấn trang chủ (`hf_wave_color`, `hf_strip_bg`) đổi sang `#790236` qua `build-vn-settings.js`.
  - Đạt khi: `scan-colors.js` báo 0 phần tử; nút checkout trên `/checkout` có nền `#333333`.
  - Kiểm: `node VN/_work/scan-colors.js http://localhost:8093`; `shot.js /checkout`.
  - File: `VN/_work/scan-colors.js`, `VN/assets/css/vn-chrome.css`, `VN/_work/build-vn-settings.js`,
    `VN/config/settings_*.json`.

- [ ] **T8: Audit tổng** (S) — phụ thuộc T7
  - Làm: chạy `style-audit --allow "Poppins"`, `mobile-audit` (360 / 390), `smoke`, `sc-e2e`, đo lề, so SHA-256 của
    hushflex. Chỉ sửa những gì audit báo.
  - Đạt khi:
    - mọi tiêu chí 2–8 của spec đạt;
    - không có lỗi mới so với `_work/baseline/`;
    - hushflex giống hệt mốc.
  - Kiểm: kết quả các lệnh trên lưu ở `VN/_work/audit/`.
  - File: tuỳ kết quả (thường chỉ `vn-chrome.css`).

## Giai đoạn 3 — Giao

- [ ] **T9: Tài liệu, ảnh preview, đóng gói, báo cáo** (S) — phụ thuộc T8
  - Làm:
    - viết lại `README.md`, `CHANGELOG.md` (2026.11.19.1) của VN;
    - chụp `assets/theme-preview.jpg` từ template bodysuit;
    - `pack.js` → `dist/lunara-vesnacharm-2026.11.19.1.zip`;
    - thêm một dòng vào `.claude/skills/new-theme/RUNLOG.md`;
    - báo cáo bằng tiếng Việt: zip, những gì đã khớp, chỗ còn khác và lý do, 17 ảnh gallery cần upload cho sản phẩm,
      cách upload (theme **mới**, không dùng `d696f6cf-…` / `de997065-…`), cách gán template.
  - Đạt khi: zip ra 0 lỗi và < 50 MB; README mô tả đúng các setting mới.
  - Kiểm: `node tools/pack.js VN`; `unzip -l` không có `_work/`.
  - File: `VN/README.md`, `VN/CHANGELOG.md`, `VN/assets/theme-preview.jpg`, `.claude/skills/new-theme/RUNLOG.md`.

### Checkpoint cuối
- [ ] Mọi tiêu chí hoàn thành của spec đạt; bạn nhận zip và báo cáo. Không commit nếu bạn chưa bảo.
