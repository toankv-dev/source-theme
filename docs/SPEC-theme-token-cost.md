# Capability map: giảm token khi tạo và sửa theme

Trạng thái: **đã duyệt ngày 2026-11-20**. Người dùng duyệt mà không trả lời các câu hỏi mở, nên mọi câu theo đề xuất
(xem *Quyết định*). Thêm yêu cầu khi duyệt: **mỗi theme có một design map**. Chưa có thì tạo; có rồi thì Claude đọc
map thay vì đọc lại code; khi sửa theme hoặc thấy map khác thực tế thì cập nhật map (module `theme-map`).

Spec từng module (viết theo thứ tự làm, mỗi đợt duyệt riêng):

| Module | Spec | Trạng thái |
|---|---|---|
| `cost-meter` | [SPEC-cost-meter.md](SPEC-cost-meter.md) | **xong** 2026-11-20 · [plan](plan-theme-token-cost.md) |
| `media-grab` | [SPEC-media-grab.md](SPEC-media-grab.md) | **xong** 2026-11-20 · [plan](plan-theme-token-cost.md) |
| `theme-map` | [SPEC-theme-map.md](SPEC-theme-map.md) | **xong** 2026-11-20 · [plan](plan-theme-token-cost.md) |
| `edit-check` | [SPEC-edit-check.md](SPEC-edit-check.md) | **xong** 2026-11-20 (đợt 2) |
| `section-grab` | [SPEC-section-grab.md](SPEC-section-grab.md) | **xong** 2026-11-20 (đợt 2) |
| `platform-guide` | [SPEC-platform-guide.md](SPEC-platform-guide.md) | **xong** 2026-11-20 (đợt 2) |
| `theme-edit` | [SPEC-theme-edit.md](SPEC-theme-edit.md) | **xong** 2026-11-20 (đợt 3) |
| `link-slim` | [SPEC-link-slim.md](SPEC-link-slim.md) | **xong** 2026-11-20 (đợt 4) |

Đợt 2–4 làm liền một mạch theo yêu cầu "tiếp tục code hết tất cả các đợt" (không dừng duyệt từng spec). Cùng lúc sửa lỗi
`media-grab` trên shape-curve.com: đó là bot check thật (403 "Browser verification", sau đó 429), không phải lỗi tải —
thêm chờ 429 một lần theo `Retry-After`, `--headed` để người dùng tự qua bước xác minh trong cửa sổ, thông báo rõ hơn
(`lib/page.js openPage`, dùng chung với section-grab).

Yêu cầu của người dùng:
1. `/theme-from-link` tốn token → tìm lý do, chuyển phần làm được bằng code sang code.
2. Skill mới để **sửa** theme (việc làm nhiều nhất): 2.1 sửa code theme (responsive, thêm chức năng…); 2.2 thêm
   template / một phần từ link khác (logic như theme-from-link); 2.3 việc người dùng tự làm được → hướng dẫn, không
   sửa; 2.4 phải sửa cả shopdy → trình bày shopdy làm gì / theme làm gì, người dùng duyệt, sửa theme, rồi viết spec
   cho shopdy.
3. Tool tải hết ảnh + video sản phẩm từ một link đối thủ, bằng code, dùng lại cho 1 và 2.

## Nghiên cứu: token đi đâu

Đo bằng `tools/transcript-cost.js` và hai script phân tích tạm (theo từng yêu cầu; module `cost-meter` đưa chúng vào
`tools/`). Đơn vị chi phí = input + ghi cache × 1,25 + đọc cache × 0,1 + output × 5. Mỗi lượt gọi API đọc lại toàn bộ
context, nên **chi phí ≈ số lượt gọi × độ lớn context**.

| Phiên | Việc | Lượt gọi | Context TB / max | Chi phí | Ước tính nếu mỗi yêu cầu một phiên mới |
|---|---|---|---|---|---|
| A `d--shopdy-promax/1c0d32c8…` 19/11 04:38 → 20/11 01:20 | "Theme lunara---vesnacharm cho bodysuit": ~38 yêu cầu sửa | 710 | 468k / 968k | 42,4M | 17,1M (−60%) |
| B `d--source-theme/e68fdec6…` 19/11 | `/theme-from-link`: template Shapecurve vào lunara---hushflex, rồi find my size | 198 | 318k / 542k | 8,3M | 4,8M (−42%) |
| C `d--shopdy-promax/e3df979c…` 16/11 | "Banner và ảnh trên brixpant.com": 9 yêu cầu sửa | 230 | 197k / 343k | 6,6M | 4,6M (−30%) |

Phiên sửa A tốn gấp 5 lần lần tạo B. 67–77% chi phí mỗi phiên là đọc lại cache.
(Ước tính "phiên mới": giữ nguyên các lượt gọi, context mỗi yêu cầu bắt đầu lại từ context nền.)

### Phiên A theo loại yêu cầu

| Loại | Số yêu cầu | Lượt gọi | % phiên |
|---|---|---|---|
| 2.3 Người dùng tự làm được (ẩn size/color, hiện 4 bundle, đặt giảm giá, tìm Customize, đổi chữ "Buy 2 get 1", xoá icon payment lặp, đổi thứ tự section…) | 10 | 88 | 16,4% |
| 2.4 Hỏi shopdy xử lý thế nào (complete the bundle, quà tặng, review gửi đi đâu) | 4 | 31 | 6,5% |
| 2.1 Sửa nhỏ (màu footer / nút, nút Next trang contact, logo checkout mobile) | 5 | 80 (TB 16) | 15,1% |
| 2.2 Làm giống một phần của đối thủ (find my size, safe checkout, video "See them in motion", write a review, banner chữ to) | 7 | 195 | 26,1% |
| Còn lại (dựng theme ban đầu, review, sửa lỗi sau khi đẩy lên server) | ~12 | ~316 | ~36% |

### 8 nguyên nhân

1. **Một phiên cho cả ngày.** A: 38 yêu cầu trong 21 giờ, chỉ 1 lần compact; 77% chi phí rơi vào các lượt có context
   > 400k. Câu hỏi "làm sao để hiện 4 bundle" (3 lượt) cũng đọc lại 613k mỗi lượt.
2. **Mỗi yêu cầu lại đi tìm code từ đầu.** A: 105 grep + 61 `node -e` + 55 sed + 50 cat để tìm section / class /
   setting. Theme Lunara có file sinh ra và file vá (`_work/build-sc.js`, `patch-sc.js`, `patch-cb.js`, `patch-vn.js`):
   3 trong 15 kết quả lớn nhất là đọc các script này để biết phải sửa ở đâu. Không có bản đồ theme.
3. **Ảnh nằm lại trong context.** A: 109 ảnh (94 ảnh chụp tự đọc + 15 ảnh người dùng dán); B: 33. Mỗi ảnh đọc một lần
   nhưng bị đọc lại ở mọi lượt sau. Phần lớn chỉ để xem một màu, một vị trí, một cỡ chữ: số đo trả lời được.
4. **Đọc code shopdy để trả lời câu hỏi nền tảng.** A: 102 lần đọc code shopdy (13,9% chi phí): discount-engine,
   storefront.routes, gửi review, companion bundles.
5. **Câu hỏi "làm thế nào" bị xử lý như việc code.** 10 yêu cầu loại 2.3 tốn 88 lượt, vì phải dò code mới biết admin
   có gì.
6. **Script dùng một lần.** A: ~14 script tạm (hover-atc.js, shot-reviews.js, live-bundle.js, logo-trim.js…) + 16
   lệnh curl trang live / đối thủ. Viết script tốn token output (× 5) và thêm lượt sửa lỗi script.
7. **Làm việc theme từ repo shopdy-promax.** Context nền 71k (B ở source-theme: 44k), cộng luật và memory của shopdy.
8. **theme-from-link đọc định hướng quá nhiều.** B, yêu cầu đầu: hơn 120 nghìn ký tự (~35k token) trước khi làm:
   new-theme SKILL + RUNLOG (24k), spec + plan của theme trước (22k), `git show` changelog (20k), CLAUDE.md + README
   (16k), `git log --stat` (13k)… và mang theo suốt ~190 lượt sau. Rồi 37 grep + 17 cat + 10 `node -e` để hiểu theme có
   sẵn. Yêu cầu thứ ba trong cùng phiên (find my size từ getionix.com) chạy ở 456k → 542k: 34 lượt = 25% phiên.

### Ba đòn bẩy

- **Context nhỏ**: mỗi yêu cầu một phiên ngắn, khởi đầu từ bản đồ theme + nhật ký sửa (không từ lịch sử chat); không
  đọc ảnh toàn trang.
- **Ít lượt gọi**: tool trả lời "ở đâu", "đối thủ trông thế nào", "đã đúng chưa" bằng một lệnh, in số liệu ngắn.
- **Bỏ việc không cần**: câu 2.3 trả lời từ hướng dẫn admin; câu nền tảng từ tài liệu nền tảng, không đọc code shopdy.

## Capability map

| Module id | Làm gì | Phụ thuộc |
|---|---|---|
| `cost-meter` | `transcript-cost.js --by-request`: chi phí từng yêu cầu, số ảnh, lần đọc code shopdy, ước tính "mỗi yêu cầu một phiên mới". Thước đo cho mọi module khác. | — |
| `media-grab` | **Mục 3.** `node tools/media-grab.js <link> [--out <dir>] [--to-theme <theme> --prefix xx]`: mở đúng một trang, tải mọi ảnh + video (gallery, ảnh biến thể, mô tả, section, review, icon; HLS → MP4), bỏ trùng giữ bản lớn nhất, đặt tên theo nhóm + thứ tự, ghi `media.json`, in tóm tắt ≤ 30 dòng. Không mirror CSS/JS, không chụp, không capture. Dùng lại `lib/mirror.js`, `lib/media-pick.js`. | — |
| `theme-map` | **Design map của từng theme**: `node tools/theme-map.js themes/<slug>` → `themes/<slug>/_map/design-map.md` (commit, không vào zip; ≤ 4k token): template → section → block → file hbs / css / js; file nào sinh ra hay bị vá bởi `_work/*.js` (sửa nguồn rồi chạy lại); setting nào trong editor đổi được gì; màu / font chính; ghi chú của Claude. Chưa có thì tạo; phần sinh từ code luôn tự cập nhật; ghi chú của phần có file đã đổi được đánh dấu để xem lại. | — |
| `edit-check` | `node tools/edit-check.js themes/<slug> --page <trang> --selector "<css>" [--ref <link hoặc ảnh gốc>]`: một lệnh chạy preview, đo phần tử ở 1440 + 360 (font, màu, cỡ, tràn ngang, vùng chạm), so với bản gốc ra bảng chênh lệch, chỉ tạo một ảnh ghép nhỏ khi cần, chạy mobile-audit + pack. Thay các script kiểm tra viết tay. | — |
| `section-grab` | `node tools/section-grab.js <link> --heading "<chữ tiêu đề>"`: chỉ một phần của trang đối thủ: ảnh cắt 1440 / 390 (nhỏ), chữ, kiểu chữ / màu từng khối (như probe-sections), DOM rút gọn, ảnh + video của phần đó (qua `media-grab`). Cho 2.2 ở mức một phần, loại yêu cầu tốn nhất của A. | media-grab |
| `platform-guide` | Tài liệu (tiếng Việt) "shopdy cho theme gì, admin làm được gì": giảm giá, bundle, complete the bundle, review, thứ tự section, ẩn picker, template sản phẩm, Customize… Mỗi mục: các bước trong admin + file nguồn shopdy làm bằng chứng. Một script báo mục nào có file nguồn đã đổi từ lúc viết (cần xem lại). Trả lời 2.3, làm nền cho 2.4. | — |
| `theme-edit` | **Mục 2.** `/theme-edit <slug> <yêu cầu>`: đọc theme-map + nhật ký sửa, phân loại yêu cầu (2.1 / 2.2 / 2.3 / 2.4), mỗi loại một quy trình có ngân sách lượt gọi. 2.4: bảng "shopdy làm / theme làm" → người dùng duyệt → sửa theme → viết spec shopdy (không sửa code shopdy). Kết thúc: ghi `_work/edit-log.md`, pack, nhắc `/clear` trước yêu cầu sau. | theme-map, edit-check, section-grab, media-grab, platform-guide |
| `link-slim` | **Mục 1.** theme-from-link gọn lại: lệnh `run-brief` in đúng những gì lần chạy cần (thay ~35k token đọc định hướng); SKILL / new-theme tách phần lõi và phần đọc khi cần; theme có sẵn → theme-map thay cho grep; so sánh bằng bảng số của edit-check trước, ảnh sau; ảnh / video qua media-grab; pack xong là dừng, sửa tiếp bằng theme-edit ở phiên mới. | theme-map, edit-check, media-grab |

Thứ tự làm: `cost-meter`, `media-grab` → `theme-map`, `edit-check`, `platform-guide` → `section-grab` → `theme-edit`
→ `link-slim`.

```
media-grab ──→ section-grab ──┐
theme-map ────────────────────┼──→ theme-edit
edit-check ───────────────────┤
platform-guide ───────────────┘
theme-map + edit-check + media-grab ──→ link-slim
cost-meter: đo trước và sau mỗi module
```

## Đo sau đợt 1 (căn cứ để xếp thứ tự đợt 2)

Phiên sửa đầu tiên có design map: `d--source-theme/06a2156e…` "Topbar và banner theme lunara---vesnacharm",
2026-11-20, 4 yêu cầu (topbar + banner; before / after kéo thả như đối thủ; làm slider đó dùng cho mọi template; sửa
sau khi dùng thử).

| | Phiên A (trước) | Phiên 06a2156e (sau đợt 1) |
|---|---|---|
| Context trung bình | 468k | **187k** |
| Lượt gọi mỗi yêu cầu | TB 19 | 93 · 42 · 125 · 14 (yêu cầu lớn hơn: tính năng mới) |
| Chi phí | 42,4M / 38 yêu cầu | 7,0M / 4 yêu cầu |
| Đọc code theme | ~7 lệnh mỗi yêu cầu | 42 lệnh có đường dẫn theme + phần lớn 30 grep / 17 sed / 9 `node -e` / 6 cat chạy sau `cd` vào theme |
| Đọc design map | — | 10 lần, `theme-map.js` 10 lần |

Còn tốn ở đâu (số lần dùng tool):
- **Kiểm tra sau khi sửa: ~1/3 số lần dùng tool.** `shot.js` 22, đọc ảnh 22, `preview-server.js` 18 (khởi động lại
  nhiều lần), `mobile-audit.js` 12, `visual-diff` / `pixel` / `crop` / `side-by-side` 13, script tạm 15 (thử kéo
  slider) → `edit-check` lên đầu đợt 2.
- **Làm giống một phần của đối thủ: yêu cầu 2 + 3 = 65% phiên**, `download-page.js` 4 lần → `section-grab` thứ hai.
- **Đọc code vẫn nhiều:** map nói ở đâu, nhưng tính năng mới (JS của slider) vẫn phải đọc code. `cost-meter` cần tính
  lệnh chạy sau `cd` vào theme là đọc code theme (theo dõi `cd` trong cùng lệnh / cwd của dòng transcript).
- Không có câu hỏi admin hay shopdy trong phiên này → `platform-guide` xếp thứ ba.

## Mục tiêu đo được (chi tiết trong spec từng module)

Đo bằng `cost-meter` trên các lần chạy thật tiếp theo, so với phiên A / B:

- 2.3 câu hỏi admin: ≤ 3 lượt, 0 lần đọc code shopdy, context ≤ 120k (A: TB 8,8 lượt ở 450–950k).
- 2.1 sửa nhỏ: ≤ 10 lượt, context ≤ 150k, ≤ 2 ảnh đọc → chi phí ≤ 25% của cùng loại trong A (A: TB 16 lượt ở 600–800k).
- 2.2 một phần từ link đối thủ: ≤ 30 lượt, context ≤ 250k (A: TB 28 lượt ở 250–950k).
- 2.4: bảng đề xuất có trước mọi dòng code, ≤ 10 lượt trước khi người dùng duyệt.
- Một ngày sửa như A: ≤ 25% của 42,4M.
- theme-from-link như B: ≤ 50% của 8,3M; đọc định hướng ≤ 10k token.
- media-grab: một lệnh, 0 ảnh phải đọc, đủ ảnh gallery + ảnh biến thể + video trên fixture Shopify và fixture shopdy.

## Giả định

1. Thước đo là đơn vị chi phí của `transcript-cost.js` (tỉ lệ giá API); model giữ nguyên.
2. Sửa theme chạy từ `d:\source-theme` (nơi có theme và tool), không từ shopdy-promax. Code shopdy chỉ đọc qua
   `platform-guide`; đọc file cụ thể khi bắt buộc (2.4).
3. Người dùng chấp nhận mỗi yêu cầu (hoặc một nhóm yêu cầu nhỏ cùng theme) một phiên, `/clear` giữa các yêu cầu;
   `_work/edit-log.md` giữ những gì cần nhớ.
4. "Ảnh sản phẩm từ link đối thủ" = mọi ảnh + video của đúng trang đó. Với cửa hàng Shopify, thêm
   `/products/<handle>.json` của chính sản phẩm đó (ảnh gốc full size, ảnh từng biến thể); không trang nào khác.
5. File tải về là dữ liệu không tin cậy: chỉ mở trong trình duyệt, không chạy bằng node.
6. Tool viết bằng Node như `tools/`, test `node --test`, không thêm dependency.
7. 2.4 không sửa code shopdy (luật Jira key + spec/plan được duyệt); spec shopdy ghi vào `D:\shopdy-promax\docs\` theo
   cách đặt tên của repo đó.
8. Skill mới là của repo này (`.claude/skills/theme-edit/`), nói chuyện bằng tiếng Việt.

## Quyết định (câu hỏi mở, theo đề xuất)

1. Sửa theme chạy từ `d:\source-theme`; chưa cài vào shopdy-promax.
2. Tên skill: `/theme-edit`.
3. `media-grab` chạy riêng lưu vào `downloads/<host>-<handle>/` ở gốc repo (trong `.gitignore`).
4. Được lấy dữ liệu sản phẩm của chính sản phẩm đó (Shopify `/products/<handle>.js`), không trang nào khác.
5. Spec shopdy ở 2.4: `D:\shopdy-promax\docs\<yyyy-mm-dd>-spec-<chủ đề>.md` (cách đặt tên của repo đó) + bản nháp ticket
   Jira; xác nhận lại khi viết spec `theme-edit`.
6. Làm theo thứ tự trên.

## Quy ước chung cho mọi module

**Lệnh**
```
cd tools && npm test                               # test mọi tool (node --test), phải xanh trước khi xong một việc
node tools/<tool>.js …                             # mỗi tool in cách dùng khi gọi sai
node tools/pack.js themes/<slug>                   # 0 lỗi
```

**Cấu trúc**: tool ở `tools/<tên>.js`, phần thuần (không I/O, test được) ở `tools/lib/<tên>.js`, test ở
`tools/test/<tên>.test.js`, fixture ở `tools/fixtures/<tên>/`. Spec / plan / todo ở `docs/`.

**Phong cách code** (như các tool hiện có): CommonJS, `'use strict'`, đầu file là khối chú thích có cách dùng, file ghi
ra và exit code; không thêm dependency; in ngắn (số, đường dẫn), không in nội dung trang hay file.
```js
#!/usr/bin/env node
/*
 * One line: what it does.
 *
 *   node tools/media-grab.js <url> [--out <dir>] [--refresh]
 *
 * Writes <out>/media.json …  Exit codes: 0 done, 1 usage / error, 2 the page is behind a bot check.
 */
'use strict';
const { plan } = require('./lib/media-pick');
```

**Kiểm thử**: `node --test`, không mạng (fixture qua server cục bộ), mỗi hành vi trong spec có ít nhất một test; test cũ
của tool bị sửa phải xanh không đổi.

**Ranh giới**
- Luôn: chạy `cd tools && npm test`; giữ hành vi các tool cũ; ghi số đo trước / sau bằng `cost-meter`.
- Hỏi trước: thêm dependency; đổi output hay cờ của tool đã có; đổi `base-theme`.
- Không bao giờ: chạy JS tải về bằng node; mở trang khác ngoài link được đưa; thêm vào giỏ / thanh toán / gửi form /
  đăng nhập trên trang đối thủ; sửa `assets/js/core.js` hay checkout; sửa code shopdy-promax.
