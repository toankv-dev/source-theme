# Spec: Maggies Tanks — landing quảng cáo ở link sản phẩm + trang chủ dạng danh sách sản phẩm

Trạng thái: **người dùng đồng ý (2026-11-09)**; chỉ sửa theme nên không cần mã Jira. Phạm vi: `themes/maggies-tanks`.
Không sửa mã nguồn Shopdy. Bản `2026.11.09.2`.

## Mục tiêu

1. **Link chạy ads** = `vesnacharm.com/built-in-bra-comfort-shaper-tanks` với template sản phẩm mới **"Maggie's landing"**:
   giống trang chủ hiện tại, cùng thứ tự: hero → dải chữ chạy → Before & after (có nút Buy now) → ảnh + chữ → Why bras →
   Nothing else worked → **khối mua** (section product, Look = Maggie's) → Video reviews → What we changed → Routine →
   Compare → Comfort → FAQ → Last call.
2. **Trang chủ** chọn được (Theme settings → Maggie's – Home layout): *Maggie's landing* (như cũ, mặc định — upload
   không đổi gì) hoặc *Simple product list* như davystore.com: tiêu đề + đoạn giới thiệu, mỗi collection một danh sách
   (hoặc một danh sách mọi sản phẩm), thẻ sản phẩm có sẵn của theme (ảnh, tên, giá, giá gạch), khối "How can we help
   you?" + nút Contact.

Vì sao không làm bằng thao tác Shopdy: trang chủ luôn là `templates/index.hbs` của theme cửa hàng; trình dựng Pages
không có các khối Maggie's; mỗi sản phẩm một link + một template trên một store (`@@unique(storeId, productId)`).

## Thiết kế

- **Một nguồn markup**: 6 khối còn lại của `index.hbs` (hero, ticker, iwt, why, list, vr) tách thành
  `snippets/mt-<part>.hbs` (`@root.settings`, `@root.assets_url`); trang chủ landing phải ra **HTML y hệt** trước khi
  tách (so từng byte). Section `mt-story` thêm các part đó + cài đặt `cta` (nút Buy now dưới Before & after).
- **Ảnh trên trang sản phẩm là ô trống** (luật new-theme, như Before & after): hero ảnh / video, ảnh iwt, poster video
  review không lấy ảnh / video mẫu của theme; chỉ ảnh người bán tải lên, trống → khung giữ chỗ (gợi ý tải trong trình
  chỉnh sửa). Trang chủ giữ nguyên cách lấy mẫu như cũ.
- **CSS**: `assets/css/mt-landing.css` sinh cùng `_work/build-mt-story-css.js` từ `mt-home.css` (luật của 6 khối,
  không trùng `mt-story.css`) + `_work/mt-landing.css` (khung ảnh trống). Section product thêm checkbox `landing`
  ("Has the landing blocks") → link `mt-landing.css` một lần. Template "Maggie's product page" không tải thêm gì.
- **JS**: `mt-home.js` chạy một lần dù được nhúng bởi part compare và vr (cờ toàn cục).
- **Template** `templates/product.landing.json` ("Maggie's landing (ad page)") sinh bằng `_work/build-mt-product.js`;
  khối mua giống template maggies (intro, size finder, gói tiers, nút mua, trust).
- **Trang chủ đơn giản**: `snippets/mt-simple-home.hbs` + `assets/css/mt-simple.css` (nhỏ; trang chủ đơn giản không tải
  `mt-home.css` / `mt-home.js`); cài đặt `mt_home_layout`, `mt_simple_*` (tiêu đề, giới thiệu, nguồn: collections | all,
  số sản phẩm mỗi danh sách, khối trợ giúp). Lưới + thẻ = `b-grid` + `card-product` của trang collection.

## Kiểm thử

- Trang chủ landing: HTML trước / sau tách giống từng byte (1440).
- `/product?template=landing`: đủ 14 khối đúng thứ tự, ô ảnh trống (không ảnh / video mẫu), nút hero cuộn tới khối mua,
  video review phát, `pdp_tiers_test.py … landing` (gói, giỏ trộn màu), `sf_test` phần trang sản phẩm, không cuộn ngang
  390 / 1440, ảnh chụp so trang chủ.
- Trang chủ simple: danh sách theo collection / all, thẻ đúng link, không tải `mt-home.css`, khối trợ giúp.
- `smoke.js`, `home_packs_test.py`, `mobile-audit.js` (0 lỗi), `pack.js` 0 lỗi; `mt-story.css` không đổi.

## Ranh giới

- Luôn: chỉ `themes/maggies-tanks`; Write / Edit; không đổi HTML trang chủ landing.
- Hỏi trước: upload production, đổi cài đặt / template trên production, commit.
- Không bao giờ: sửa `core.js` / checkout / `head.hbs` / `product-scripts.hbs` / `sections.css` / `skin.css`; đưa ảnh mẫu
  lên trang sản phẩm.

## Việc cần làm

1. [x] Ảnh HTML gốc; tách 6 khối → snippets; so byte.
2. [x] Part mới cho `mt-story` + `cta`; slot ảnh trống; `mt-home.js` chạy một lần.
3. [x] `mt-landing.css` (generator) + cờ `landing` của section product.
4. [x] `product.landing.json`.
5. [x] Trang chủ simple (cài đặt, snippet, CSS).
6. [x] Kiểm thử, version, CHANGELOG, zip.
