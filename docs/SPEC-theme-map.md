# Spec: `theme-map` — design map của từng theme

Trạng thái: **xong ngày 2026-11-20** (trừ tiêu chí 7: đo ở phiên sửa thật); câu hỏi mở theo đề xuất (map tiếng Anh, script nguồn sang `_src/`, có map
cho base-theme). Plan: [plan-theme-token-cost.md](plan-theme-token-cost.md). Bản đồ module: [SPEC-theme-token-cost.md](SPEC-theme-token-cost.md) (quy ước
chung về lệnh, cấu trúc, phong cách code, kiểm thử, ranh giới ở đó).

## Mục tiêu

Mỗi theme có một **design map**: một file ngắn cho Claude biết theme trông thế nào và mỗi thứ nằm ở đâu, để khỏi đọc lại
code mỗi lần sửa. Yêu cầu của người dùng:
- theme nào chưa có map thì tạo;
- có map rồi thì Claude đọc map, chỉ mở đúng đoạn code mà map chỉ tới;
- sửa theme hoặc thấy map khác thực tế thì cập nhật map.

Bằng chứng (phiên A, 38 yêu cầu sửa vesnacharm): 105 grep + 61 `node -e` + 55 sed + 50 cat để tìm section / class /
setting, tức khoảng 7 lệnh mỗi yêu cầu, tất cả ở context 450–950k. Theme Lunara có file sinh ra (`_work/build-sc.js`) và
file vá (`_work/patch-*.js`): mỗi lần đều phải đọc script mới biết sửa ở đâu.

Người dùng của map: Claude (skill `theme-edit`, `theme-from-link`, `new-theme`). Người dùng thật không cần đọc map.

## Map gồm hai phần

1. **Phần sinh từ code** (tool viết, luôn đúng với file hiện tại): template, section, block, snippet, CSS / JS, setting,
   màu / font, nguồn sinh / vá, hook nền tảng. Mỗi lần chạy tool đều tạo lại phần này, nên phần này không bao giờ lệch.
2. **Ghi chú** (Claude viết): những gì code không nói ra, ví dụ "Lunara thắng bằng `#MainProduct-…` + `!important`:
   copy prefix đó", "màu footer đổi ở setting `footer_bg`, nhưng `#lu-ft` trong vn-chrome.css đè lên", ý đồ thiết kế, lỗi
   đã biết. Tool không bao giờ xoá ghi chú. Khi file của một phần đã đổi kể từ lần ghi chú được xác nhận, tool gắn cờ
   **xem lại** cho ghi chú đó.

Như vậy: **tạo khi thiếu** (tool), **cập nhật khi sửa** (tool tạo lại phần code, gắn cờ ghi chú bị ảnh hưởng, Claude sửa
ghi chú rồi xác nhận), **cập nhật khi thấy khác thực tế** (Claude sửa ghi chú; nếu phần sinh từ code sai thì đó là lỗi
của tool, sửa tool).

## File

```
themes/<slug>/_map/design-map.md     Claude đọc file này. Commit; không vào zip (pack bỏ thư mục bắt đầu bằng "_")
themes/<slug>/_map/design-map.json   sha1 từng file, file nào thuộc phần nào, ghi chú xác nhận ở sha nào
base-theme/_map/…                    cũng có, cho theme-from-link / new-theme dựng trên base
```

Không đặt trong `_work/`, vì `themes/*/_work/` nằm trong `.gitignore`.

Ví dụ `design-map.md` (rút gọn, theme vesnacharm; số dòng và giá trị chỉ để minh hoạ):

```md
# Design map: lunara---vesnacharm
<!-- tools/theme-map.js writes everything outside the notes blocks; run it after every change -->
Lunara 2026.11.19 · schema v2 · from: Lunara build (external) + _work patches · 5 product templates · 20 sections · 17 snippets
One part in detail: node tools/theme-map.js themes/lunara---vesnacharm --part <id>

## Design
| token | value | change it in | read by |
|---|---|---|---|
| accent | #790236 | Theme settings › Colors › Primary (`accent`) | gs-head.hbs, footer.hbs, header.hbs +4 |
| font | Poppins 400 500 600 700 | Theme settings › Typography (`font`) | layout/theme.hbs |
CSS breakpoints: 750 ×41, 990 ×18 · fonts: assets/fonts/poppins-*.woff2

## Templates
| template | sections in order | own CSS / JS |
|---|---|---|
| product.triple-zone-bodysuit.json "Shapecurve" | product[skin=shapecurve] · sc-features · sc-details · sc-reels · sc-testimonials · sc-trust · sc-reviews · related | sc-product.css, sc-product.js |

## Sections
| part | files | blocks | snippets | styled in |
|---|---|---|---|---|
| product | product.hbs (patched: _work/patch-sc.js) · product.schema.json (generated: _work/build-sc.js) | 14 types | lu-kaching, sc-fit, sc-pb-* | theme.css, sc-product.css, vn-chrome.css |
| sc-reviews | sc-reviews.hbs (own <style> 9 KB) · sc-reviews.schema.json | — | sc-stars | — |

## Sources
- _work/build-sc.js generates: sections/sc-*.schema.json, templates/product.triple-zone-bodysuit.json → edit the script, run it
- _work/patch-sc.js patches (anchored): sections/product.hbs, sections/reviews.hbs, snippets/lu-size-finder.hbs
- WARNING _work/ is not committed: these scripts exist only on this machine
- assets/js/core.js: platform core, never edit

## Platform hooks
#addToCart product.hbs:412 · #CartDrawer-Checkout cart-drawer.hbs:88 · #sf-variants-data product-scripts.hbs:3

## Notes
### product
<!-- notes:product -->
- Lunara wins with `#MainProduct-…` + `!important` (gallery 530 px, thumbs, ATC radius): use that prefix.
<!-- /notes -->
### theme
<!-- notes:theme -->
<!-- /notes -->
```

Ví dụ một phần chi tiết (`--part product`, sinh khi gọi, không lưu):

```
part product · sections/product.hbs 1,240 lines · patched by _work/patch-sc.js
used by: product.json, product.bundle.json, product.sizes.json, product.tiles.json, product.triple-zone-bodysuit.json
settings (12): gallery_side, skin [default|shapecurve], buy_now_label, show_rating …
blocks: rating 88-120 · title 121-140 · variant_picker 141-260 · kaching 261-330 (snippet lu-kaching) · sc_price 331-360 …
CSS: .lu-p* → theme.css (minified: grep -o) · .sc-* → sc-product.css 1-400 · #MainProduct- → vn-chrome.css 88-140
JS hooks: [data-ms-buy-now] → theme.js · #addToCart → core.js (never edit)
```

## Lệnh

```
node tools/theme-map.js <theme-dir>              tạo nếu chưa có, không thì làm mới (giữ ghi chú); in 1–5 dòng
node tools/theme-map.js <theme-dir> --check      không ghi; exit 0 = khớp, 1 = thiếu hoặc lệch (in phần nào)
node tools/theme-map.js <theme-dir> --part <id>  in chi tiết một phần: section, template, design, sources
node tools/theme-map.js <theme-dir> --ack <id|all>   Claude đã xem / sửa ghi chú của phần đó: bỏ cờ "xem lại"
node tools/theme-map.js --all                    base-theme + mọi themes/*
```

Dòng in ra khi chạy: `design map: created` | `up to date` | `refreshed: product, sc-reviews (files changed: sections/product.hbs)`
| `review notes: product`.

## Phần sinh từ code lấy từ đâu

| Thông tin | Nguồn |
|---|---|
| tên, version, schema | `theme.json` |
| template → section theo thứ tự, block, setting đáng chú ý (skin…) | `templates/*.json`; `templates/*.hbs` (các `{{> partial}}`) |
| section: setting, loại block, snippet dùng, CSS / JS link, `<style>` riêng, dòng của từng block | `sections/*.hbs`, `*.schema.json` (`{{#if (eq block.type "x")}}` → khoảng dòng) |
| snippet: ai dùng | `{{> name}}` trong mọi file hbs |
| CSS: ai link, prefix class / id nó style, breakpoint, file minified hay không | `assets/css/*.css` |
| JS: ai link, hook (`data-*`, id) | `assets/js/*.js`; `core.js` luôn ghi "never edit" |
| design: setting màu / font, giá trị hiện tại, file nào đọc `settings.<id>` | `config/settings_schema.json`, `config/settings_data.json`, `:root { --x }`, `@font-face` |
| nguồn sinh / vá | `_work/*.js`: chuỗi đường dẫn file của theme + có ghi file; `build-*` = sinh, `patch-*` = vá |
| hook nền tảng (#addToCart, data-testid…) | danh sách của `tools/inspect-theme.js` (dùng chung, không chép lại) |

Không đọc `_work/site/` (dữ liệu không tin cậy), không đọc ảnh.

## Tích hợp

- `tools/new-theme.js`: sau khi chép base, tạo map mới cho theme (không chép map của base).
- Skill `new-theme` và `theme-from-link`: bước pack thêm `node tools/theme-map.js themes/<slug>` và ghi ≤ 15 dòng ghi chú
  cho những quyết định không thấy được trong code.
- `tools/pack.js`: **cảnh báo** (không phải lỗi) khi theme thiếu map hoặc map lệch; zip không có `_map/`.
- `CLAUDE.md`: thêm luật "đọc `_map/design-map.md` trước code; sau khi sửa, chạy theme-map, sửa ghi chú bị gắn cờ, `--ack`".
- Skill `theme-edit` (đợt 3) bắt đầu bằng `theme-map.js` và kết thúc bằng refresh + ghi chú + `--ack`.
- Tạo ngay map cho base-theme và 10 theme hiện có (`--all`), commit.

## Kiểm thử

`tools/test/theme-map.test.js`, fixture `tools/fixtures/theme-map/` (theme nhỏ: 2 template, 3 section, 1 snippet, 1 CSS
thường + 1 CSS minified, `_work/build-x.js`, `_work/patch-x.js`), chạy trên bản copy ở thư mục tạm:

1. Chưa có map → tạo `.md` + `.json`; chạy lại không đổi gì → file giống từng byte, in `up to date`.
2. Ghi chú giữ nguyên qua refresh; phần bị xoá → ghi chú chuyển sang `### (removed) <id>`, không mất.
3. Sửa một file section → phần đó gắn cờ "xem lại", `--check` exit 1; `--ack` bỏ cờ; `--check` exit 0.
4. `build-*` ghi là sinh, `patch-*` ghi là vá, đúng file đích.
5. `--part` cho khoảng dòng từng block (file thường) và ghi "minified: grep -o" (file minified).
6. pack: zip không có `_map/`; cảnh báo khi map lệch; không cảnh báo khi khớp.
7. Trên theme thật (không ghi vào repo): `--all` vào thư mục tạm, mỗi map ≤ 16 000 ký tự chưa tính ghi chú.

## Ranh giới

- Luôn: phần sinh chỉ lấy từ file của theme, không đoán; kết quả xác định (cùng file → cùng byte, không timestamp thừa);
  không xoá ghi chú.
- Hỏi trước: đổi cấu trúc thư mục theme (xem câu hỏi 2).
- Không bao giờ: đưa map vào zip; đọc `_work/site/` hay ảnh; sửa `core.js`.

## Tiêu chí hoàn thành

1. `node tools/theme-map.js --all` tạo map cho base-theme + 10 theme; mỗi `design-map.md` ≤ 16 000 ký tự (~4k token)
   chưa tính ghi chú; ≤ 5 giây mỗi theme.
2. Chạy lại không đổi file → không đổi byte nào.
3. Ở vesnacharm, mọi file mà `_work/build-*.js` / `patch-*.js` ghi đều được đánh dấu.
4. `--part <id>` ≤ 4 000 ký tự.
5. Mọi test ở trên xanh; `cd tools && npm test` xanh.
6. new-theme / theme-from-link / CLAUDE.md có bước và luật về map; pack cảnh báo khi lệch.
7. Đo bằng `cost-meter` ở 3 phiên sửa đầu tiên: số lần đọc code theme trước lần sửa đầu tiên ≤ 2 cho mỗi yêu cầu sửa
   nhỏ (phiên A: khoảng 7).

## Câu hỏi mở

1. Map viết bằng tiếng Anh? Đề xuất: **có**. Map chỉ Claude đọc, và tiếng Việt có dấu tốn token hơn nhiều; báo cáo cho
   người dùng vẫn bằng tiếng Việt.
2. Các script nguồn của theme Lunara (`_work/build-*.js`, `patch-*.js`, `_work/cb/`) đang không được commit, chỉ có trên
   máy này. Chuyển sang `themes/<slug>/_src/` (được commit, không vào zip)? Đề xuất: **có**, làm như một việc riêng trong
   plan của module này; map trỏ tới `_src/`.
3. Map cho cả `base-theme`? Đề xuất: **có**.
