# Spec: theme mới "Lunara Vesnacharm" + template riêng cho Triple-Zone Drop-Seat Bodysuit

Trạng thái: **người dùng duyệt (2026-11-19), mọi câu hỏi mở theo mặc định**. Plan:
[plan-lunara-vesnacharm.md](plan-lunara-vesnacharm.md), việc: [todo-lunara-vesnacharm.md](todo-lunara-vesnacharm.md).
Trang mẫu: https://shape-curve.com/products/triple-zone-compression-drop-seat-full-body-shaping-bodysuit?variant=45216025477206
(đã tải về ngày 2026-11-19 trong `themes/lunara---hushflex/_work/site/`; lần này dùng lại bản đó, không tải lại).
Nguồn: `themes/lunara---hushflex` (bản 2026.11.19.2, đang chưa commit). Việc này chỉ đụng repo theme, nên không cần mã Jira.

## Mục tiêu

Lần trước, template "Shapecurve – Drop-seat bodysuit" được thêm vào **chính** hushflex. Phần thân trang sản phẩm đã giống
trang mẫu, nhưng **khung theme vẫn là của hushflex**. Thanh trên cùng màu xanh `#124F9F` có đồng hồ đếm ngược, header
một hàng, nền `#f7f7f7`, "You Will Also Love" có nút xanh và sao xanh lá, footer xanh có sóng. Vì thế trang upload lên
server (theme `d696f6cf-…`) trông giống hushflex chứ không giống shape-curve.com.

Cần làm: **một theme mới tên `lunara---vesnacharm`**, chép từ hushflex. Trong đó:
- **Khung toàn theme** theo bảng màu và bố cục của shape-curve.com: top bar, header, nền trang, nút, khối sản phẩm liên
  quan, footer. Font giữ **Poppins** của hushflex. Mọi chỗ trang mẫu dùng tím thì thay bằng **highlight `#790236`** và
  các sắc độ nhạt của nó.
- **Một template sản phẩm riêng** cho Triple-Zone Compression Drop-Seat Full Body Shaping Bodysuit. Đó là template
  Shapecurve sẵn có, đổi tên và bỏ tên thương hiệu đối thủ khỏi admin.
- **hushflex giữ nguyên**: việc này không sửa file nào của nó.

Người dùng:
- **Người bán** upload zip thành một theme **mới** trên admin.shopdy.com, gán template "Triple-Zone Drop-Seat Bodysuit"
  cho sản phẩm bodysuit. Khi đó trang sản phẩm, từ top bar đến footer, trông như shape-curve.com, chỉ khác font
  (Poppins) và màu nhấn (`#790236`).
- **Người mua** chọn màu, size, gói Buy 1/2/3, rồi Add to cart hoặc Express checkout. Mọi thao tác chạy như template
  Shapecurve hiện nay; giỏ, pixel và checkout không đổi.

## Hiện trạng và mục tiêu (đã đo)

Số đo lấy từ `_work/capture/product-shapecurve/{tokens.json,desktop.png}` và `_work/site/pages/product-shapecurve/desktop.png`,
qua `tools/pixel.js`. Cột hushflex chụp bằng preview của template Shapecurve hiện tại.

| Phần | hushflex hôm nay | shape-curve.com (đo) | vesnacharm (mục tiêu) |
|---|---|---|---|
| Top bar | nền `#124F9F`, kiểu đồng hồ đếm ngược "BUY 2 GET 1 FREE", cao 47 px | gradient tím nhạt 120deg (`#d6caf8` → `#e6c4f2` → `#e2dbf9`, pixel y 0–35), 2 câu xoay "FREE SHIPPING OVER $79" / "Don't Wait, Black Friday Starts Now!", mũi tên ‹ ›, chữ `#232323` đậm in hoa, cao 36 px | gradient sắc độ `#790236` (`--sc-grad` đã có: `#f6edf1 / #e4ccd7 / #efdde5 / #f2e6eb`), 2 câu xoay + mũi tên, chữ `#232323`, cao 36 px |
| Header | trắng, 1 hàng: menu trái, logo giữa, icon phải, có kẻ dưới | trắng, logo giữa ở hàng 1, menu giữa ở hàng 2 (chữ `#232323`), tìm kiếm + giỏ (số đếm nền đen) bên phải | như mẫu, font Poppins |
| Nền trang | trắng khi hiển thị (setting `page_bg` `#f7f7f7` chỉ checkout dùng) | `#ffffff` | `#ffffff` |
| Màu chính (nút, badge, nút checkout) | `#124F9F` | ADD TO CART `#333333`, bo 10 | `#333333` |
| "You Will Also Love" | nền trắng, thẻ đổ bóng, sao xanh lá, giá xanh, nút "Add to cart" xanh | dải `#f8f8f8`, tiêu đề in hoa nhỏ, thẻ không có nút, nhãn "40% OFF" `#e13f3f`, giá sale `#ff0000`, giá gốc gạch ngang | như mẫu: dải `#f8f8f8`, không có nút, nhãn `#e13f3f`, giá sale `#ff0000`, sao vàng `#F9C40F` |
| Footer | nền `#124F9F` + sóng; cột NEED HELP? / thông tin / CUSTOMER CARE / Subscribe; nút trắng | nền `#000000`, 5 cột: logo + "Feel good in every curve." + email · Shop By · Information · Customer Service · Stay In The Know (ô email + nút SUBMIT gradient tím nhạt); dải dưới `#111111`: © + 8 icon thanh toán | như mẫu; nút SUBMIT dùng `--sc-grad`, không có sóng |
| Font | Poppins | Montserrat / Inter / Jost | Poppins ở mọi nơi trừ checkout (giữ font của platform) |
| Thân trang sản phẩm | đã giống mẫu (skin Shapecurve, `sc-*`) | — | giữ nguyên |

## Thiết kế (đề xuất)

1. **Chép**: `themes/lunara---hushflex` → `themes/lunara---vesnacharm`, mọi file, kể cả `_work/` (≈ 105 MB; ổ D: còn 1,7 GB).
   `theme.json`: `name` "Lunara Vesnacharm", `version` "2026.11.19.1", sửa `description`. `pack.js` lấy tên file từ
   `name`, nên zip sẽ là `dist/lunara-vesnacharm-2026.11.19.1.zip`. Các script `_work/*.js` đang ghi cứng đường dẫn
   hushflex (`build-sc.js`, `patch-sc.js`, `sc-e2e.js`, `compare-copy.js`), nên trỏ lại sang vesnacharm.
2. **Màu toàn theme** sinh bằng `_work/build-vn-settings.js`. Script ghi cả `config/settings_data.json` lẫn `default`
   trong `settings_schema.json`, mỗi giá trị kèm chú thích nguồn đo. Các giá trị: `primary` `#333333`, `page_bg`
   `#ffffff`, `footer_bg` `#000000`, `footer_text` `#ffffff`, `sale` `#e13f3f`, `show_footer_wave` false,
   `topbar_style` rotate cùng 2 câu của mẫu, chữ top bar `#232323`, sao vàng. Thêm setting theme `highlight`
   (mặc định `#790236`) để nuôi `--sc-hl` / `--sc-grad` cho top bar, nút SUBMIT và template. Template vẫn có thể ghi đè
   bằng `skin_highlight` của nó.
3. **Khung trang**: thêm một file `assets/css/vn-chrome.css`, link một lần trong layout (áp cho mọi trang, vì đây là màu
   của cả theme). Nếu chỉ sửa CSS không đổi được bố cục, thì sửa markup trong bản `sections/header.hbs` /
   `sections/footer.hbs` / `sections/related.hbs` của vesnacharm. Đây là theme mới, nên được sửa thẳng file của nó.
   Lunara có nhiều quy tắc `#id … !important`, nên bộ chọn của file mới cần đủ mạnh (theo cách RUNLOG đã ghi).
   Không đụng `core.js`, `theme.js` (trừ khi bắt buộc và có hỏi trước), cũng như checkout và các hook pixel.
4. **Template**: đổi `templates/product.shapecurve.json` → `templates/product.triple-zone-bodysuit.json`, tên hiển thị
   "Triple-Zone Drop-Seat Bodysuit". Tên nội bộ `sc-*` (section, snippet, CSS) giữ nguyên, vì đổi tên tốn công mà người
   bán không thấy khác gì.
5. **Nội dung footer**: chữ của mẫu thành setting có giá trị mặc định ("Shop By", "Information", "Customer Service",
   "Stay In The Know", "Be the first one to receive new releases, special offers, and more", "Feel good in every curve.").
   Link lấy từ dữ liệu platform (menu, trang chính sách, tracking); email lấy từ `brand_email`; logo là logo của store.
   Không có link nào trỏ sang shape-curve.com.
6. **Trang không có link mẫu** (home, collection, about / policy, tracking, cart drawer): giữ bố cục Lunara, chỉ khoác
   bảng màu mới. Checkout: chỉ đổi những gì setting vốn đã điều khiển (màu nút).

### Ngoài phạm vi
- "Complete the bundle", "Recently viewed", widget Okendo: giống lần trước, không làm.
- Ô màu tròn và dòng "MORE SIZES AVAILABLE" trên thẻ "You Will Also Love": thêm sau nếu cần.
- Tải lại trang mẫu, sửa bố cục trang chủ (không có link mẫu), mọi code của shopdy-promax.

## Bổ sung sau Checkpoint A (người dùng, 2026-11-19)

1. **Nút Add to cart** của template bodysuit làm giống hushflex: viên thuốc bo 40 px, cao 60 px (56 px trên phone),
   chữ 18 px đậm in hoa; khi rê chuột, nền ở `::after` co lại từ hai bên (`scaleX(0)`) và chữ đổi sang màu nút. Chỉ
   đổi màu nền: `#333333` (màu chính của theme). Nút thứ hai "Express checkout now" giữ như cũ.
2. **Phần review** làm giống widget Okendo của shape-curve.com (ảnh người dùng gửi). Đây là section mới `sc-reviews`
   và chỉ template bodysuit dùng; section `reviews` của Lunara vẫn giữ cho các template khác. Từ trên xuống:
   - điểm trung bình "5.0", 5 sao, "Based on N reviews";
   - bên phải là "NN% would recommend these products";
   - 5 thanh phân bố 5★…1★, mỗi thanh kèm số lượng; bấm một thanh để lọc theo mức sao đó;
   - dải ảnh của khách;
   - nút **Filters** (lọc theo sao / chỉ review có ảnh), **không có "Write a Review"** (người dùng chọn giữ quy tắc);
   - "N reviews" và ô **Sort** (Photos & Videos · Most Recent · Highest Rating · Lowest Rating);
   - danh sách review: avatar chữ cái đầu, tên, "Verified Buyer ✓", ngày dạng "1 month ago", sao, tiêu đề đậm, nội dung
     có "Read More", ảnh ở cột phải;
   - cuối danh sách là nút **Show More**.
   - **Số đo**: `probe-1440.txt` (Okendo): "5.0" 20 px/600 `#0b0b0b`; chữ phụ 12–14 px `#878787`; nút `#262626` bo 4 px
     cao 40 px; tiêu đề review 14 px/600; nội dung 14 px, cao dòng 25,2 px; "Verified Buyer" 12 px/600. Font là Poppins,
     sao vàng `#F9C40F`.
   - **Dữ liệu** lấy từ `GET /api/storefront/reviews` (avg_rating, count, distribution, reviews: name / rating / title /
     content / image / verified / date, has_more; tối đa 50 review mỗi lần gọi), cùng `product.reviews` render sẵn từ
     server. Sort và lọc chạy trên các review đã tải; khi hết, "Show More" tải thêm.
   - **Khác ảnh mẫu vì không có dữ liệu**:
     - không có cờ quốc gia;
     - không có "Was this helpful?";
     - mỗi review chỉ có 1 ảnh;
     - "would recommend" được **tính** là tỷ lệ review 4–5★. Chữ và việc ẩn / hiện là setting; README ghi rõ cách tính.
3. Sửa số đo: giá sale trong thẻ sản phẩm là `#ff0000` (probe "$45.99", `pixel.js`); `#e13f3f` là màu nhãn "% OFF".

## Đề xuất: dòng "Complete the bundle" gồm hai sản phẩm (chờ duyệt, 2026-11-19)

Người dùng muốn: khi chọn "Complete the bundle" (ảnh 1, đang là Pack 4 = 4 cái bodysuit, $116.97) thì hiện như
shape-curve.com (ảnh 2):
- một khung liệt kê **bodysuit + áo ngực All-Day Comfort Wireless Full Coverage Jelly Smoothing Bra**;
- mỗi món có ảnh, tên, nhãn "Color, Size", ô chọn Color / Size, giá sau giảm và giá gốc gạch ngang, có dấu "+" ở giữa;
- đầu dòng có tiêu đề, "Save $X!", tổng giá, tổng giá gốc và nhãn.

**Hiện trạng (đã kiểm tra trên vesnacharm.com và trong code):**
- Gói Kaching chỉ chứa được sản phẩm đang xem, nên Pack 4 đang bán 4 bodysuit.
- Chương trình Buy X Get Y "mua bodysuit → tặng áo ngực (Free)" đã chạy. Checkout: bodysuit + áo ngực = $35.99.
- Nền tảng chỉ đổi cài đặt kiểu `store_products` thành dữ liệu sản phẩm (tên, ảnh, tên tuỳ chọn, biến thể id / giá / giá
  gốc / ảnh) cho **Theme settings**, không làm cho block (`store-product-settings.ts` chỉ đọc `settings_schema.json`).
  Đổi điều này là việc của code Shopdy, không thuộc theme.
- Giỏ: `window.MSCart.add({...})` thêm từng dòng; giá: `LuDisc`, cùng công thức với checkout (có Buy X Get Y).

**Thiết kế (chỉ sửa theme):**
1. **Theme settings → nhóm mới "Complete the bundle":** setting `vn_bundle_products` (`store_products`, chọn theo store) =
   các sản phẩm ghép với sản phẩm đang xem. vesnacharm.com chọn áo ngực. Sản phẩm trùng với sản phẩm đang xem bị bỏ qua.
2. **Block Kaching bundle**, các setting mới:
   - **"Show Complete the bundle"** (mặc định tắt; template bodysuit bật);
   - tiêu đề "Complete the bundle";
   - dòng phụ "Save {save}!";
   - nhãn "Hot Pick🔥".

   Có thêm một dòng nữa ở cuối danh sách gói, giống hệt các gói khác. Bấm vào thì mở khung như ảnh 2:
   - sản phẩm đang xem với ô Color / Size của nó;
   - "+" ở giữa;
   - từng sản phẩm đã chọn với ô Color / Size, ảnh đổi theo biến thể.
3. **Giá:** dùng `LuDisc` trên các dòng (sản phẩm đang xem + sản phẩm ghép), tức là đúng số checkout sẽ tính:
   - giá từng món sau giảm và giá gốc;
   - tổng; "Save" = tổng giá gốc (compare-at) − tổng;
   - đổi biến thể thì tính lại.

   Với chương trình hiện tại: bodysuit $35.99, áo ngực $0.00, tổng **$35.99**.
4. **Add to cart** khi dòng này đang chọn (gồm cả nút trên thanh sticky):
   - thêm từng sản phẩm bằng `MSCart.add`;
   - bắn một sự kiện `AddToCart` (giá trị, số món);
   - mở giỏ.

   Hook pixel, giỏ và checkout không đổi. Chọn một gói khác thì dòng bundle bỏ chọn, và ngược lại.
5. **Dữ liệu sản phẩm đang xem:** lấy từ `#sf-config` / `#sf-variants-data`.
6. **Không có sản phẩm ghép nào được chọn** (hoặc chưa tick "Show") thì không có dòng này.

**Người dùng tự làm sau khi upload:**
- Theme settings → Complete the bundle → chọn áo ngực;
- block Kaching → tick "Show Complete the bundle";
- Pack 4: Quantity = 0, để ẩn gói "4 bodysuit" cũ;
- Save → Publish.

**Kiểm (bản so sánh):**
- template chỉ có trong bản so sánh, với một sản phẩm ghép giả lập (preview chưa có dữ liệu `store_products`);
- e2e: hiện / ẩn dòng, chọn biến thể, giá theo Buy X Get Y, Add to cart → 2 dòng đúng biến thể, 1 sự kiện AddToCart,
  thanh sticky;
- ảnh so với ảnh 2, ở 1440 / 390.

**Rủi ro:**
- Logic chọn gói của Kaching nằm trong `theme.js` (đã nén). Dòng mới tự quản phần chọn và chặn Add to cart khi đang
  chọn nó, không sửa `theme.js`.
- `store_products` theo từng store: chọn áo ngực ở vesnacharm.com thì mọi trang có tick "Show" đều ghép áo ngực.

## Lệnh (chạy ở `D:\source-theme`)

```bash
node themes/lunara---vesnacharm/_work/build-vn-settings.js            # colours + texts → settings_data + schema defaults
node themes/lunara---vesnacharm/_work/build-sc.js                     # template + schemas (retargeted)
node tools/preview-server.js themes/lunara---vesnacharm --port 8091   # theme's own sample
node themes/lunara---vesnacharm/_work/compare-copy.js <scratch>/vn-copy && node tools/preview-server.js <scratch>/vn-copy --port 8093
#   → http://localhost:8093/product?template=triple-zone-bodysuit  (bodysuit sample)
node tools/visual-diff.js themes/lunara---vesnacharm/_work/site/pages/product-shapecurve/desktop.png "http://localhost:8093/product?template=triple-zone-bodysuit" --out themes/lunara---vesnacharm/_work/diff
node tools/visual-diff.js themes/lunara---vesnacharm/_work/capture/product-shapecurve/mobile.png "http://localhost:8093/product?template=triple-zone-bodysuit" --width 390 --out themes/lunara---vesnacharm/_work/diff
node tools/pixel.js <shot.png> --top 6 --y <a-b>                      # measured colours of a band
node tools/style-audit.js http://localhost:8091 themes/lunara---vesnacharm --allow "Poppins"
node themes/lunara---vesnacharm/_work/sc-e2e.js                       # template behaviour (1440 + 390)
node tools/smoke.js http://localhost:8091
node tools/mobile-audit.js http://localhost:8091
node tools/pack.js themes/lunara---vesnacharm                         # → dist/lunara-vesnacharm-2026.11.19.1.zip, 0 errors
```

## Cấu trúc

```
themes/lunara---vesnacharm/
  theme.json, README.md, CHANGELOG.md           name / version / description; how the theme and template work
  config/settings_{data,schema}.json            written by _work/build-vn-settings.js (never by hand)
  layout/theme.hbs                              + one <link> to vn-chrome.css
  sections/header.hbs, footer.hbs, related.hbs  vesnacharm's own copies, changed only where CSS cannot do it
  assets/css/vn-chrome.css                      top bar, header, page, related, footer look (new)
  templates/product.triple-zone-bodysuit.json   the bodysuit template (was product.shapecurve.json)
  _work/                                        download, captures, build / patch / e2e scripts (never packed)
docs/SPEC-lunara-vesnacharm.md, plan-…, todo-…
.claude/skills/new-theme/RUNLOG.md              one line for this run
```

## Cách viết code

Màu đi qua script, mỗi giá trị ghi rõ nguồn đo. CSS dùng biến của theme, không lặp lại mã hex:

```js
// _work/build-vn-settings.js: one source for theme colours (writes settings_data.json AND schema defaults)
const SETTINGS = {
  primary: '#333333',        // ADD TO CART, capture tokens.json buttons[0].background
  page_bg: '#ffffff',        // tokens.json body.background
  footer_bg: '#000000',      // pixel.js capture desktop.png --y 10540-10900
  sale: '#e13f3f',           // "40% OFF" badge, pixel.js 640,9240
  highlight: '#790236',      // user's highlight, replaces every violet of the original
  show_footer_wave: false,   // the original footer is flat
};
```

```css
/* Header: logo centred on row 1, menu centred on row 2 (shape-curve.com 1440) */
.header__inline-menu { grid-area: navigation; justify-self: center; }
/* Top bar: the original's 120deg violet gradient → tints of the highlight */
.vn-topbar { background: var(--sc-grad); color: #232323; } /* #232323 = tokens.json body.color */
```

Quy ước: bộ chọn phẳng, mỗi khối có chú thích tên phần; class mới dùng tiền tố `vn-`; chỉ dùng helper của engine.

## Kiểm thử

Theme không có unit test. Mọi kiểm tra chạy bằng `tools/` trên preview:
- **Hình**: dùng `visual-diff` ở 1440 và 390 với template bodysuit. Chụp `shot.js` cho trang chủ, `/collections/all`,
  `/pages/about-us`, tracking, cart drawer đang mở.
- **Màu**: dùng `pixel.js` trên ảnh chụp từng dải (top bar, header, related, footer, dải dưới). Quét bằng
  `shot.js --eval` mọi phần tử ở các trang trên: không phần tử nào có `color` / `background` / `border` là `#124F9F`.
- **Font**: chạy `style-audit.js --allow "Poppins"`.
- **Hành vi**: `sc-e2e.js` (chọn màu, size, gói, Add to cart, Express checkout, Find my size, size chart),
  `smoke.js`, `mobile-audit.js` (360 / 390).
- **Không làm hỏng hushflex**: lưu SHA-256 của mọi file hushflex trước khi bắt đầu, sau khi xong so lại.
- `cd tools && npm test` chỉ khi có sửa `tools/`.

## Ranh giới

- **Luôn làm**: chỉ ghi vào `themes/lunara---vesnacharm/`, spec / plan / todo trong `docs/`, và RUNLOG. Màu sinh bằng
  script, có đo, không ước lượng. Kiểm ở 360 px. Giữ các hook pixel (`#addToCart`, `#CartDrawer-Checkout`,
  `#sf-variants-data`, ViewContent). Báo cáo bằng tiếng Việt.
- **Hỏi trước**: sửa bất kỳ file nào của hushflex; upload zip hay thao tác gì trên admin.shopdy.com; commit / push
  `D:\source-theme`; sửa `tools/` hoặc `base-theme/`; sửa `theme.js`; xoá gì trên ổ D:.
- **Không bao giờ**: upload vào theme `d696f6cf-…` (hushflex) hoặc `de997065-…` (Maggies Tanks của vesnacharm.com). Lý
  do: setting đã lưu của theme cũ thắng giá trị trong zip, nên màu sẽ vẫn là màu cũ. Không sửa `core.js`, logic checkout,
  font checkout. Không chạy JS của `_work/site`. Không add to cart / checkout trên shape-curve.com. Không có form viết
  review. Không có link sang shape-curve.com.

## Tiêu chí hoàn thành

1. `node tools/pack.js themes/lunara---vesnacharm` ra **0 lỗi**, zip `dist/lunara-vesnacharm-2026.11.19.1.zip` < 50 MB.
2. SHA-256 mọi file của `themes/lunara---hushflex` giống hệt trước khi bắt đầu.
3. Template bodysuit ở 1440 và 390 khớp bảng "vesnacharm (mục tiêu)":
   - top bar là gradient sắc độ `#790236`, cao 36 px, 2 câu xoay;
   - header trắng, logo giữa hàng 1, menu giữa hàng 2, icon bên phải;
   - nền `#ffffff`, nút `#333333`;
   - related nằm trên dải `#f8f8f8`, nhãn và giá sale `#e13f3f`, không có nút;
   - footer `#000000` 5 cột (390: xếp dọc), dải dưới `#111111` có icon thanh toán.
   Đo bằng `pixel.js`, sai lệch ≤ 2 đơn vị mỗi kênh, trừ gradient (so điểm đầu / giữa / cuối).
4. Không phần tử nào trên các trang kiểm tra có màu `#124F9F`. Mọi màu tím của mẫu đều thành `#790236` hoặc sắc độ của nó.
5. `style-audit --allow "Poppins"`: không có FAIL. Mọi chữ (trừ checkout) là Poppins.
6. Lề: ở 1440 / 1024 / 390 / 360, mép nội dung header và thân trang lệch nhau ≤ 1 px; không có cuộn ngang.
7. `sc-e2e.js` qua hết. `smoke.js` qua tới mốc giới hạn đã biết của Lunara (`[data-cart-drawer]`, như hushflex).
   `mobile-audit.js` không có lỗi mới so với hushflex; LCP / CLS trong ngân sách; không có lỗi script.
8. Danh sách template trong theme có "Triple-Zone Drop-Seat Bodysuit". Bốn template cũ vẫn render không lỗi, mang bảng
   màu mới (đây là thay đổi chủ ý).
9. README / CHANGELOG của vesnacharm mô tả theme, template và danh sách ảnh cần upload cho sản phẩm (17 ảnh gallery).
   RUNLOG có thêm một dòng cho lần chạy này.

## Câu hỏi mở (mỗi câu có mặc định; không trả lời = làm theo mặc định)

1. **hushflex**: giữ nguyên, kể cả template Shapecurve đã thêm lần trước? Hay gỡ template đó ra khỏi hushflex (việc
   riêng, làm sau)? *Mặc định: giữ nguyên.*
2. **Template trong vesnacharm**: giữ 4 template cũ (`product`, `bundle`, `sizes`, `tiles`) cùng template bodysuit? Hay
   chỉ giữ `product.json` cùng bodysuit? Hay cho bodysuit làm template mặc định? *Mặc định: giữ hết, bodysuit là
   template riêng.*
3. **Phạm vi "giống mẫu" của khung**: đổi cả bố cục header (2 hàng) và footer (5 cột), hay chỉ đổi màu? *Mặc định: đổi
   cả bố cục.*
4. **Upload**: zip này lên admin dưới dạng theme mới, rồi bạn tự gán cho store (vesnacharm.com đang chạy Maggies Tanks
   `de997065-…`)? Tôi chỉ giao zip, không tự upload. *Mặc định: đúng như vậy.*
5. **Top bar**: bỏ đồng hồ đếm ngược, chỉ còn 2 câu xoay như mẫu (setting đếm ngược vẫn còn để bật lại)? *Mặc định: có.*
6. **Commit** `D:\source-theme`: commit khi xong? *Mặc định: không commit nếu bạn chưa bảo.*
