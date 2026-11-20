# Plan: Lunara Vesnacharm + template "Triple-Zone Drop-Seat Bodysuit"

Spec: [SPEC-lunara-vesnacharm.md](SPEC-lunara-vesnacharm.md), đã duyệt 2026-11-19, mọi câu hỏi mở theo mặc định.
Việc: [todo-lunara-vesnacharm.md](todo-lunara-vesnacharm.md).

## Tổng quan

Chép `themes/lunara---hushflex` sang `themes/lunara---vesnacharm`, đổi tên template bodysuit, rồi thay khung theme cho
giống shape-curve.com: top bar, header, footer, thẻ sản phẩm / "You Will Also Love", và mọi chỗ còn màu xanh. Font giữ
Poppins, màu nhấn là `#790236`. Thân trang sản phẩm (`sc-*`) đã giống mẫu nên không đụng tới.

## Hiện trạng trong code (đã đọc)

| Chỗ | Cách chạy hôm nay | Hệ quả cho việc này |
|---|---|---|
| Màu chính | `snippets/gs-head.hbs`: script đọc `settings.primary / primary_text / footer_bg / footer_text` → `--lu-primary`, `--color-base-accent-1/2`, `--lu-footer-rgb`, `--lu-footer-text-rgb` | đổi setting là nút, footer, badge, drawer đổi theo |
| `#124F9F` còn ghi cứng | chỉ ở dạng fallback `var(--lu-primary,#124F9F)` (header, footer, cart-drawer, reviews, related, size-finder, kaching, page, checkout), riêng `custom.css` có `.lu-sticky-bar__btn{background:#124f9f!important}` | fallback hết tác dụng khi có `primary`; nút sticky phải ghi đè trong CSS |
| Nền trang | thực tế là trắng; `page_bg` chỉ checkout dùng | không cần đổi gì |
| Top bar | `sections/header.hbs`, 2 kiểu: `countdown` (đang bật) / `rotate` (chữ xoay, không có mũi tên), nền `topbar_bg` hoặc primary | chuyển sang `rotate`, thêm mũi tên ‹ ›, nền gradient |
| Header | Dawn `header--middle-center` (menu · logo · icon); `base.css` có sẵn `header--top-center` (logo hàng 1, menu hàng 2) | đổi một class, chỉnh CSS là xong bố cục |
| Footer | `sections/footer.hbs`: 4 cột Need Help / `<domain> Info` / Customer Care / newsletter (`data-lu-newsletter`), `ft-bottom` có 8 icon `images/pay/*.svg`, sóng `lu-wave` (`show_footer_wave`); trong file còn `#ms-card-tpl` và modal quick-add | viết lại 5 cột, giữ hook newsletter, card template và modal |
| Thẻ sản phẩm | `#ms-card-tpl` (footer) dùng chung cho catalog trang chủ và `related`; `theme.js` và `related.hbs` đã điền `[data-ms-badge] [data-ms-pct]` nhưng template chưa có phần tử badge | thêm badge "NN% OFF" vào template → mọi thẻ đều có |
| Related | `sections/related.hbs`, setting `show_quick_add` (tắt nút), `heading` | template bodysuit đặt `show_quick_add: false` |
| CSS chung | `gs-head` link `base.css` + `custom.css`; `gs-head` có ở layout, index, page, product, tracking-result, **không** có ở checkout | link `vn-chrome.css` ngay sau `custom.css` trong `gs-head` → checkout không bị ảnh hưởng |
| Script `_work/` | đường dẫn đi theo `__dirname`; "hushflex" chỉ có trong chú thích; tên `shapecurve` nằm trong `build-sc.js` (đường dẫn template + nhãn skin), `compare-copy.js`, `sc-e2e.js` (`?template=shapecurve`) | khi đổi tên template phải sửa cả 3 file |
| Chính sách platform | `policyLinks`: about, contact, privacy, refund, shipping, terms; `config.trackUrl`; `collections` | "Payment Policy" và "Intellectual Property Rights" của mẫu không có trang tương ứng → bỏ |

## Quyết định kiến trúc

1. **Chép nguyên, kể cả `_work/`**. Template vẫn sinh từ `_work/build-sc.js` (một nguồn duy nhất). Chỉ đổi tên template,
   không đổi nội dung.
2. **Đổi màu theo thứ tự**: setting trước (`_work/build-vn-settings.js` ghi cả data lẫn schema default), sau đó mới tới
   một file `assets/css/vn-chrome.css`, và cuối cùng là markup trong file theme của vesnacharm (header, footer). Mã hex
   ghi cứng phải kèm chú thích nguồn đo.
3. **Màu chính `primary` = `#333333`**, lấy từ nút ADD TO CART của mẫu. Nút, nút checkout, badge và drawer đi theo màu này.
   **Highlight** là setting mới `highlight` (`#790236`). Trong `gs-head` nó sinh ra `--vn-hl` và
   `--vn-grad` = `linear-gradient(120deg, …)`, với các điểm màu `color-mix(in srgb, var(--vn-hl) 7 / 20 / 13 / 10 %, #fff)`.
   Đây cũng là các tỷ lệ của `--sc-grad` trong template. Top bar, nút SUBMIT và dải nhấn trang chủ dùng biến này.
   Các section `sc-*` giữ `highlight` / `skin_highlight` riêng của chúng.
4. **Header** dùng `header--top-center` có sẵn của Dawn, không viết markup mới. Mục menu vẫn lấy từ dữ liệu platform
   (Home, Collections, Contact, About us, Track Your Order), không chép danh mục của shape-curve.
5. **Footer**:
   - 5 cột: logo + tagline + email · Shop By (collections) · Information (About Us, Terms Of Service, Privacy Policy) ·
     Customer Service (Contact Us, Shipping Policy, Return & Refunds, Track Order) · Stay In The Know (newsletter).
   - Chữ là setting `vn_ft_*`, mặc định là chữ của mẫu.
   - Logo footer là setting mới `vn_footer_logo` (image_picker); để trống thì hiện tên store chữ trắng. Logo
     "Shapecurve" (`sc-brand/footer_logo_1.webp`) không gắn vào, vì đó là thương hiệu đối thủ.
6. **Badge "% OFF"** gắn vào `#ms-card-tpl` dùng chung, nên mọi thẻ sản phẩm của theme đều có (trang chủ và related),
   như trên shape-curve.
7. **Tên trong admin**:
   - template đổi thành `product.triple-zone-bodysuit.json`, tên "Triple-Zone Drop-Seat Bodysuit";
   - nhãn skin đổi "Shapecurve (…)" → "Bodysuit (…)";
   - **giá trị** skin `shapecurve` và tên nội bộ `sc-*` giữ nguyên.
8. **Kiểm tra so với mốc**: trước khi đổi gì, chạy `mobile-audit`, `smoke` và `sc-e2e` trên bản chép, lưu kết quả vào
   `_work/baseline/`. Tiêu chí "không có lỗi mới" so với mốc này.

## Thứ tự và phụ thuộc

```
T1 chép + đổi tên + mốc ──► T2 settings ──► T3 highlight + top bar ──► T4 header
                                        └──► T5 footer ──► T6 thẻ / related
                         (T3–T6 cùng ghi vn-chrome.css → làm lần lượt, không song song)
Checkpoint A (người dùng xem ảnh so sánh) ──► T7 quét sạch màu xanh ──► T8 audit ──► T9 tài liệu + đóng gói
```

Làm phần rủi ro trước: T1 chứng minh bản chép chạy được và `sc-e2e` vẫn qua sau khi đổi tên. T4 / T5 là chỗ hay vướng các
quy tắc `!important` của Lunara.

## Rủi ro

| Rủi ro | Mức | Cách xử lý |
|---|---|---|
| Quy tắc `#id … !important` của Lunara thắng CSS mới | Trung bình | Bộ chọn bắt đầu bằng id có sẵn (`#lunara-topbar`, `#lu-ft`, `#shopify-section-…header`), như RUNLOG đã ghi; đo lại bằng `pixel.js` |
| Sửa `#ms-card-tpl` làm hỏng catalog trang chủ | Trung bình | Chỉ **thêm** phần tử badge; chụp `/` và `/collections/all` trước / sau; `smoke.js` |
| Viết lại footer làm mất hook (newsletter, card template, quick-add modal, `data-ms-year`) | Trung bình | Giữ nguyên các khối này, chỉ thay phần `ft-main` / `ft-bottom`; grep hook trước / sau |
| `color-mix` không chạy trên trình duyệt cũ | Thấp | Khai báo màu đặc (7 %) trước dòng gradient làm dự phòng; Lunara cũng đã dùng `color-mix` |
| Lỡ tay ghi vào hushflex | Cao | T1 lưu SHA-256 mọi file hushflex; T8 so lại; mọi lệnh ghi dùng đường dẫn `themes/lunara---vesnacharm` |
| Ổ D: hết chỗ (còn 1,7 GB) | Thấp | Bản chép ≈ 105 MB, bản so sánh để trong scratchpad (ổ C:) |
| Upload nhầm vào theme cũ khiến màu cũ quay lại | Cao | Báo cáo ghi rõ: upload thành theme mới, nêu đúng 2 id không được dùng |

## Kiểm tra cuối (gộp từ tiêu chí của spec)

- `pack.js` ra 0 lỗi; zip < 50 MB.
- SHA-256 của hushflex không đổi.
- Không phần tử nào có màu `rgb(18, 79, 159)` trên 10 trang: `/`, `/collections/all`, `/pages/about-us`, tracking,
  `/product` với 5 template, cart drawer đang mở. Dò bằng `_work/scan-colors.js`.
- `pixel.js` đúng bảng màu ở 1440 / 390.
- `style-audit --allow "Poppins"` sạch.
- Lề ≤ 1 px ở 1440 / 1024 / 390 / 360.
- `sc-e2e` qua. `smoke` / `mobile-audit` không có lỗi mới so với `_work/baseline/`.
