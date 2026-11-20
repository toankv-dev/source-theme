# Plan: giảm token khi tạo và sửa theme, đợt 1

Spec: [SPEC-theme-token-cost.md](SPEC-theme-token-cost.md) (bản đồ module) · [SPEC-cost-meter.md](SPEC-cost-meter.md) ·
[SPEC-theme-map.md](SPEC-theme-map.md) · [SPEC-media-grab.md](SPEC-media-grab.md).
Việc chi tiết: [todo-theme-token-cost.md](todo-theme-token-cost.md). Trạng thái: **đợt 1 xong** (2026-11-20).

## Tổng quan

Đợt 1 làm ba module không phụ thuộc nhau: `cost-meter` (thước đo), `theme-map` (design map của từng theme) và
`media-grab` (tải ảnh / video từ link đối thủ). Xong đợt 1 thì mọi theme có design map, CLAUDE.md bắt đọc map trước code,
và có một lệnh tải media. Đợt 2–4 (`edit-check`, `platform-guide`, `section-grab`, `theme-edit`, `link-slim`) được nối
vào file này khi tới lượt.

## Quyết định kiến trúc

- **Thứ tự trong đợt 1: `cost-meter` → `theme-map` → `media-grab`.** Ba module độc lập. `theme-map` lên trước
  `media-grab` (bản đồ ghi `media-grab` trước) vì người dùng nhấn mạnh design map, và mọi phiên sửa theme hưởng lợi ngay
  khi CLAUDE.md có luật đọc map, chưa cần chờ `theme-edit`.
- **Phần thuần tách khỏi I/O**: `tools/lib/theme-map.js` (quét theme → mô hình → markdown) và `tools/lib/media-grab.js`
  (đọc dữ liệu sản phẩm, nhóm, đặt tên, tóm tắt) có test không cần trình duyệt; CLI chỉ đọc / ghi file và chạy
  Playwright.
- **Dùng chung, không chép**:
  - `collectRefs()` chuyển từ `download-page.js` sang `tools/lib/collect-refs.js`;
  - danh sách hook nền tảng chuyển từ `pack.js` sang `tools/lib/platform-hooks.js`;
  - `media-grab --to-theme` gọi `media-library.js` với cờ mới `--from <dir>` (mặc định vẫn là `_work/site`);
  - nhóm `variants` / `description` thêm vào `media-pick.classify` theo cách không đổi kết quả cũ.
- **Map xác định**: đường dẫn dùng `/`, khoá được sắp xếp, không timestamp (chỉ ngày phát hiện lệch, lưu trong `.json`),
  nên chạy lại không đổi byte nào và git diff chỉ hiện thay đổi thật.
- **Ghi chú không bao giờ mất**: marker của ghi chú bị hỏng (do sửa tay) → tool không ghi gì và báo lỗi.
- **`_src/` cho script nguồn của theme**: chỉ `build-*`, `patch-*`, nguồn của chúng (`cb/`) và script kiểm tra
  (`compare-copy.js`, `sc-e2e.js`, `scan-colors.js`). Dữ liệu (`site/`, `capture/`, `images/`…) vẫn ở `_work/`.
  `theme-map` đọc cả `_src/` lẫn `_work/` (theme cũ).
- **Mỗi phase làm trong một phiên** (`/clear` giữa các phase): file todo là bản giao việc giữa các phiên. Đây cũng là
  lần thử đầu tiên của bài học "một việc một phiên", đo bằng `cost-meter`.

## Danh sách việc

### Phase 1: cost-meter
- [x] T1: Tách phiên theo yêu cầu, thêm `--by-request` và `--prompts`
- [x] T2: Thêm `--fresh`, `--title` và các bước của việc làm theme

**Checkpoint 1**: `cd tools && npm test` xanh; trên phiên A ra 710 lượt, 42,4M, `--fresh` ≈ 17,1M (±1%).

### Phase 2: theme-map
- [x] T3: `lib/theme-map.js`: quét theme thành mô hình (+ `lib/platform-hooks.js`, fixture)
- [x] T4: CLI `theme-map.js`: markdown, ghi chú, cờ xem lại, `--check` / `--ack` / `--part` / `--all`
- [x] T5: Chạy trên theme thật: chỉnh cho vừa ngân sách, sinh map cho base-theme + 10 theme

**Checkpoint 2**: test xanh; mọi map ≤ 16 000 ký tự, ≤ 5 giây mỗi theme; vesnacharm đánh dấu đủ file sinh / vá.

- [x] T6: Chuyển script nguồn Lunara sang `_src/` (hushflex, vesnacharm)
- [x] T7: Tool tích hợp map: `new-theme.js` tạo map, `pack.js` cảnh báo map lệch
- [x] T8: Luật và skill: CLAUDE.md, new-theme, theme-from-link

**Checkpoint 3**: test xanh; `pack.js` 0 lỗi cho base-theme + 10 theme, danh sách file trong zip không đổi; smoke +
mobile-audit của base 0 lỗi, 0 cảnh báo; duyệt với người dùng.

### Phase 3: media-grab
- [x] T9: Tách `collectRefs()` sang `lib/collect-refs.js`
- [x] T10: `lib/media-grab.js`: dữ liệu sản phẩm, nhóm, tên, tóm tắt
- [x] T11: CLI `media-grab.js`: lượt desktop, fixture kiểu Shopify, ghi file
- [x] T12: Lượt mobile, fixture kiểu shopdy, bot check, các cờ còn lại
- [x] T13: `--to-theme` và `--sheet`
- [x] T14: Chạy với link thật và cập nhật tài liệu

**Checkpoint 4**: test xanh; link thật đạt tiêu chí của SPEC-media-grab; cập nhật trạng thái các spec; duyệt với
người dùng.

## Rủi ro

| Rủi ro | Mức | Cách giảm |
|---|---|---|
| Tách `collectRefs()` làm hỏng download-page | Trung bình | Hàm chạy trong trang và không dùng biến ngoài; làm riêng một việc (T9); `download-page.test.js` phải xanh không đổi |
| Theme Lunara dùng inline partial, CSS / JS minified → khó lấy khoảng dòng | Trung bình | Nhận block bằng `eq block.type "x"` ở mọi chỗ; file minified ghi "grep -o"; đo trên vesnacharm ở T5 |
| Map của theme lớn vượt 16 000 ký tự | Trung bình | Bảng gọn một dòng mỗi phần, chi tiết qua `--part`; đo ở T5 trước khi tích hợp |
| Chuyển sang `_src/` làm gãy đường dẫn trong script | Trung bình | Grep `_work/` trong từng script; chạy lại mọi `patch-*` / `build-*` → "already there" và git diff file theme rỗng |
| Trang thật khác fixture (shopdy chưa rõ cấu trúc, bot check) | Trung bình | Fixture trước, link thật ở T14; bot check → exit 2; thiếu dữ liệu sản phẩm → chỉ dùng trang và nói rõ trong tóm tắt |
| Không lấy được `/products/<handle>.js` | Thấp | Rơi về ảnh của trang + JSON-LD; tóm tắt ghi `product data: none` |
| Chạy trên Windows ra đường dẫn `\`, xuống dòng CRLF | Thấp | Chuẩn hoá `/` và `\n`; test so từng byte |

## Song song

Phase 2 và Phase 3 độc lập. Nếu chạy hai phiên cùng lúc thì chỉ đụng nhau ở `CLAUDE.md` (T8, T14): làm T14 sau T8.

## Câu hỏi mở

Không có. Tiêu chí 7 của SPEC-theme-map (đọc code ≤ 2 lần mỗi yêu cầu sửa nhỏ) chỉ đo được khi có phiên sửa thật; nó
được đo ở đợt 3 (`theme-edit`), hoặc sớm hơn nếu người dùng sửa theme sau T8.
