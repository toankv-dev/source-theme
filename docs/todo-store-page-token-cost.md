# Task list: giảm token của skill `store-page-from-link`

Spec: [SPEC-store-page-token-cost.md](SPEC-store-page-token-cost.md) · Kế hoạch:
[plan-store-page-token-cost.md](plan-store-page-token-cost.md)

Lệnh test chung:
- Node: `cd tools && npm test`
- Python: `python -m unittest discover -s shopdy-skills/store-page-from-link/tests -v`

Viết tắt: `$S` = `shopdy-skills/store-page-from-link/scripts`, `$T` = `shopdy-skills/store-page-from-link/tests`.

---

## Task 1: `tools/transcript-cost.js`

**Mô tả:** Đọc một transcript Claude Code (`.jsonl`) và in ra:
- số lượt gọi API, gộp theo `requestId|message.id`;
- các loại token: input / ghi cache / đọc cache / output;
- chi phí quy đổi (đọc cache ×0,1, ghi cache ×1,25, viết ra ×5);
- context lớn nhất / trung bình;
- bảng theo tool;
- bảng theo bước của skill: fetch, login, options, create, catalog, upload, build, inspect, verify, exec, plan;
- số lần đọc code shopdy (`apps/`, `packages/` ngoài thư mục skill), số lần đọc `scripts/*.py`, số ảnh đã đọc.

Tham số:
- `<file>`, hoặc `--project <dir> --latest` (tìm transcript mới nhất trong `~/.claude/projects/<tên mã hoá của dir>`);
- `--json` để ra JSON;
- `--since <iso>` để chỉ tính từ một mốc thời gian.

**Tiêu chí:**
- [x] Transcript giả (3 lượt, có một lượt tách thành nhiều dòng cùng `message.id`, có ảnh, có Read file shopdy) cho ra
  đúng số lượt, đúng token, đúng số ảnh, đúng số lần đọc code shopdy
- [x] Chạy trên transcript owearfit thật: 114 lượt, chi phí ≈ 3,16 triệu (khớp spec)
- [x] Không in nội dung tin nhắn, chỉ in số và tên lệnh

**Kiểm tra:**
- `cd tools && npm test` (`test/transcript-cost.test.js`)
- `node tools/transcript-cost.js C:\Users\ADMIN\.claude\projects\d--shopdy-promax\8449d050-8c90-4ce9-9d94-772acbc92096.jsonl`

**Phụ thuộc:** Không · **File:** `tools/transcript-cost.js`, `tools/test/transcript-cost.test.js` · **Cỡ:** S

---

## Task 2: Trình cài giữ `catalog/`, không chép `tests/`

**Mô tả:** Sửa `tools/install-shopdy-skill.js`:
- `_work`, `.env`, `catalog` chỉ được giữ khi nằm **ở gốc** thư mục skill;
- `__pycache__` vẫn bỏ qua ở mọi tầng;
- không chép `tests/` của nguồn sang shopdy-promax.

Dòng cuối in thêm `catalog/`.

**Tiêu chí:**
- [x] Cài lại giữ nguyên `catalog/block-catalog.json` có sẵn ở đích
- [x] Một thư mục `references/catalog/` (không ở gốc) vẫn được chép, và bị xoá khi nguồn bỏ nó
- [x] Không có `tests/` ở đích; test cũ vẫn xanh

**Kiểm tra:** `cd tools && npm test` (`test/install-shopdy-skill.test.js`)

**Phụ thuộc:** Không · **File:** `tools/install-shopdy-skill.js`, `tools/test/install-shopdy-skill.test.js` · **Cỡ:** S

---

## Task 3: Guard có chế độ quét + bộ khung test Python

**Mô tả:**
- `Guard(job, page_id, scan=False)`: khi `scan=True`, chặn mọi method khác GET/HEAD/OPTIONS kể cả PATCH page của job,
  lý do ghi là "catalog scan is read-only".
- `Session(..., scan=False)` truyền cờ này xuống guard.
- Tạo `$T/` gồm `__init__.py` (thêm `$S` vào `sys.path`) và `_fakes.py` (route / request giả). Không dùng thư viện
  ngoài.

**Tiêu chí:**
- [x] `scan=True`: POST / PATCH (page của job) / PUT / DELETE đều bị chặn và ghi vào `guard.log`; GET đi qua
- [x] `scan=False`: mọi luật cũ không đổi (publish bị chặn, PATCH page khác bị chặn, allow-list đi qua)

**Kiểm tra:** `python -m unittest discover -s shopdy-skills/store-page-from-link/tests -v` (`test_guard.py`)

**Phụ thuộc:** Không · **File:** `$S/_common.py`, `$T/__init__.py`, `$T/_fakes.py`, `$T/test_guard.py` · **Cỡ:** S

---

## Task 4: `status.py` + dòng `!` trong SKILL.md (M1)

**Mô tả:** `$S/status.py` chỉ dùng thư viện chuẩn, mọi lỗi đều bị bắt, luôn exit 0. In tối đa 15 dòng:
- Playwright có hay không (`importlib.util.find_spec`);
- tên các khoá có trong `.env`, không in giá trị;
- profile đăng nhập có hay không;
- từng job: bước đang dở, `pageId`, ticket đang `awaiting-key`;
- catalog: có hay không, số block, ngày ghi gần nhất, số dòng trong `changes.log`;
- version skill đã cài so với `SOURCE_THEME_DIR` hoặc `../source-theme` (nếu có);
- đường dẫn tuyệt đối của skill và `_work`.

SKILL.md thêm khối "Trạng thái" bằng `` !`…` ``, bọc để không bao giờ lỗi (`python … || py -3 … || echo …`).

**Tiêu chí:**
- [x] Test chạy được với: thiếu `.env`, `.env` có mật khẩu (output không chứa giá trị), chưa có catalog, có catalog,
  job dở, thư mục `_work` không tồn tại
- [x] Mọi trường hợp exit 0, tối đa 15 dòng
- [x] Gọi skill trong shopdy-promax thì thấy khối trạng thái (kiểm tra tay ở Task 18)

**Kiểm tra:** `python -m unittest …` (`test_status.py`)

**Phụ thuộc:** Task 3 (bộ khung test) · **File:** `$S/status.py`, `$T/test_status.py`, SKILL.md (chỉ khối trạng thái)
· **Cỡ:** S

---

## Checkpoint A
- [x] Test Node + Python xanh
- [x] `transcript-cost.js` đo lại owearfit ra đúng số trong spec

---

## Task 5: `catalog.py` phần thuần

**Mô tả:** Module thuần, không import Playwright:
- `load()` / `save_entries(entries, job, sha)`: đọc bản mới nhất, ghép theo loại block, ghi file tạm rồi
  `os.replace`; ghi `changes.log`.
- `diff(old_entry, new_entry)`: trả danh sách thay đổi đọc được, ví dụ
  `+"Badge text"`, `"Star size" 10–32 → 8–40`, `"Style" select → radio`, `-"Old"`.
  - Chuẩn hoá label đánh số: "Review 2" → "Review #".
  - Không so giá trị mặc định.
- `render_md(catalog, notes_md)`: bản gọn cho Claude (một dòng cho mỗi trường); đánh dấu **MỚI** cho block / trường
  không có trong `block-notes.md`.
- `palette_diff(catalog, palette_labels)`: loại block mới / đã mất.

**Tiêu chí:**
- [x] `diff` đúng với: thêm, bớt, đổi label, đổi loại, đổi lựa chọn, đổi min-max; không đổi gì → rỗng, và không ghi
  file
- [x] Hai lần ghi chen nhau (mỗi lần một block khác nhau) giữ được cả hai mục
- [x] `render_md` cho 21 block dưới ~4 nghìn token (đếm xấp xỉ 4 ký tự / token) và có MỚI đúng chỗ

**Kiểm tra:** `python -m unittest …` (`test_catalog.py`)

**Phụ thuộc:** Task 3 · **File:** `$S/catalog.py`, `$T/test_catalog.py` · **Cỡ:** M

---

## Task 6: Đọc inspector đầy đủ

**Mô tả:** Thay `Editor.fields()` bằng `INSPECTOR_JS`, trả mỗi trường gồm: group (tiêu đề nhóm), label, loại
(text, textarea, rich, code, number, slider, color, select, radio, tabs, switch, checkbox, image, list), `options`,
`min` / `max` / `step`, `value`, và các trường con của mục đầu tiên nếu là danh sách.
- Select kiểu Radix: mở → đọc lựa chọn → Escape.
- Thanh trượt không có label: lấy chữ ở gần nó làm label (ví dụ "Star size").
- Danh sách nút hành động của block.

Fixture: `$T/fixtures/inspector.html` tự viết, mô phỏng đủ mọi loại.

**Tiêu chí:**
- [x] Trên fixture: mọi loại được nhận đúng, có min / max / step / options; thanh trượt không label lấy được "Star size"
- [x] Trên editor local: đọc block Reviews ra cả "Star size" (`slider`) và các trường của một review

**Kiểm tra:**
- `python -m unittest …` (`test_inspector.py`, bỏ qua nếu chưa cài playwright)
- Kiểm tra tay: `python -I $S/shopdy.py inspect --job <job> --fields` trên stack local

**Phụ thuộc:** Task 5 (định dạng mục) · **File:** `$S/shopdy.py` (Editor), `$S/inspector_js.py`,
`$T/fixtures/inspector.html`, `$T/test_inspector.py` · **Cỡ:** M

---

## Task 7: Quét toàn bộ + `create` tự gọi + quét riêng loại block mới

**Mô tả:**
- `shopdy.py catalog --job <job> [--refresh | --show <block>]`.
- `catalog.ensure(session, editor)`:
  - chưa có file (hoặc `--refresh`): mở editor của page job ở chế độ quét; với mỗi nút "Add … block" trong palette,
    thêm block → đọc inspector (Task 6) → ghi mục. Gặp dialog thì đóng; loại nào lỗi thì ghi `scanFailed` kèm lý do.
    Xong tải lại, không Save;
  - có file rồi: chỉ so palette (`palette_diff`), quét riêng loại mới, đánh dấu `removed` cho loại đã mất.
- Ghi `sha` lấy từ `GET /api/health`, kèm layout từ `options`.
- `cmd_create` gọi `ensure` sau khi tạo page, và in một dòng tóm tắt.

**Tiêu chí:**
- [x] Stack local, chưa có file: `create` tạo `catalog/block-catalog.json` + `.md`, đủ các loại trong palette (hoặc
  `scanFailed` có lý do)
- [x] `guard.log` không có lệnh ghi nào bị chặn ngoài dự kiến; `store_pages.blocks` của page trong DB trước và sau
  khi quét **giống hệt nhau**
- [x] `create` lần hai (job khác): không quét toàn bộ (< 5 giây cho phần catalog); xoá một loại khỏi file thì
  `create` kế tiếp quét đúng loại đó

**Kiểm tra:**
- Chạy tay trên stack local
- So `blocks` bằng SQL chỉ đọc trên `:5433`
- `python -m unittest …` (phần thuần của `ensure`, dùng editor giả)

**Phụ thuộc:** Task 3, 5, 6 · **File:** `$S/catalog.py`, `$S/shopdy.py` (`cmd_create`, `cmd_catalog`),
`$T/test_catalog.py` · **Cỡ:** M

---

## Task 8: Tự sửa khi lệch, op `set`, chạy lại op

**Mô tả:**
- `Editor.select` / `add` → `catalog.check(editor, block_type)`: đọc inspector đang mở, so với mục trong file. Lệch thì
  ghi lại, thêm dòng vào `changes.log`, đưa thông báo vào đầu ra của op.
- Op `set` (label, value) tra loại trong catalog rồi gọi hàm tương ứng. Thêm hàm `Editor.slider` (dùng phím hoặc nhập
  giá trị cho `input[type=range]` / `role=slider`).
- `run_op`: gặp `LookupError` hoặc sai loại thì `check` block hiện tại rồi chạy lại một lần; vẫn lỗi thì exit 5 như cũ.
- `inspect --fields` cũng gọi `check`.

**Tiêu chí:**
- [x] Sửa tay file (bỏ "Star size", đổi label "Columns" → "Cols", đổi min-max): build dùng block Reviews thì ghi lại
  đúng 3 thay đổi, op chạy được, `changes.log` có 1 dòng
- [x] `set` với "Star size" = 18 chạy được trên Reviews (op lỗi lần trước)
- [x] Plan cũ (op `fill` / `number` / `choose`…) vẫn chạy y như trước

**Kiểm tra:**
- `python -m unittest …` (dispatch của `set`, logic chạy lại, dùng editor giả)
- Chạy tay một plan nhỏ trên stack local

**Phụ thuộc:** Task 7 · **File:** `$S/shopdy.py`, `$S/catalog.py`, `$T/test_set_op.py` · **Cỡ:** M

---

## Task 9: `references/block-notes.md`

**Mô tả:** Viết ghi chú tay, thay `block-catalog.md`. Gồm:
- từng block: renderer tự làm gì (huy hiệu review, `mainproduct` vẽ product section của theme: gói, size chart, sticky
  ATC…);
- luật lọc HTML và luật scope CSS (at-rule giữ / bỏ, `@container`);
- các điểm dễ sai của editor (màu `p` bị xám trong canvas…);
- bảng "tính năng trên trang đối thủ → block";
- bảng page settings.

Lấy từ `block-catalog.md` hiện có, các phát hiện trong transcript owearfit, và đọc lại đúng các file nguồn liên quan
**một lần** (người bảo trì làm, chỉ đọc). Không lặp lại thông tin catalog đã có (tên trường, giới hạn).

**Tiêu chí:**
- [x] Mọi câu hỏi Claude đã phải đọc code để trả lời trong lần chạy owearfit (bước D trong spec) đều có câu trả lời
  ở đây hoặc trong catalog
- [x] Dưới ~3 nghìn token
- [x] `render_md` đánh dấu MỚI đúng theo tên block trong file này

**Kiểm tra:** Đối chiếu tay với danh sách 42 lượt đọc code (bảng D trong spec); `python -m unittest …` (test MỚI dùng
file thật)

**Phụ thuộc:** Task 5 · **File:** `references/block-notes.md` (mới), `references/block-catalog.md` (xoá) · **Cỡ:** S

---

## Checkpoint B (stack local)
- [x] Task 7 và 8 đạt trên stack local; `git status` của shopdy-promax sạch
- [x] Xoá admin tạm và page thử khỏi DB local như lần trước
- [x] **Người dùng xem kết quả trước khi đi tiếp** (2026-11-12: "tiếp tục")

---

## Task 10: `shopdy_blocks.py`: tách block của trang dựng bằng shopdy (M4)

**Mô tả:** Module thuần, chạy trên `dom.html` (dùng `html.parser`). Nhận ra trang có `.sp-page` và
`section.sp-block--<type>`, rồi trả ra:
- danh sách theo thứ tự, mỗi block có: type, id, `vis` (all / desktop / mobile), sticky, bleed;
- với html: HTML bên trong và CSS đã gỡ `#sp-bN` (tách từ các `<style>`);
- với text / cta / countdown / footer / reviews: giá trị trường đọc từ markup (chữ, href, màu inline, các review);
- `max-width` của `.sp-page`.

`fetch_competitor.py` ghi `source/shopdy-blocks.json` khi nhận ra trang shopdy.

Fixture: `$T/fixtures/shopdy-page.html`, tự viết, đủ 6 loại block, nội dung giả.

**Tiêu chí:**
- [ ] Fixture cho ra đúng thứ tự, loại, cờ; CSS gỡ scope đúng (kể cả rule nằm trong `@media`)
- [ ] Trang không phải shopdy → `None`, và không ghi file
- [ ] Trên `dom.html` của owearfit (chỉ đọc trên máy, không commit): 18 block khớp bảng trong `analysis.md`

**Kiểm tra:** `python -m unittest …` (`test_shopdy_blocks.py`); chạy tay trên bản owearfit đã tải

**Phụ thuộc:** Task 3 · **File:** `$S/shopdy_blocks.py`, `$S/fetch_competitor.py`, `$T/fixtures/shopdy-page.html`,
`$T/test_shopdy_blocks.py` · **Cỡ:** M

---

## Task 11: Chữ ẩn + outline trên điện thoại + `digest.py` (M2)

**Mô tả:**
- `OUTLINE_JS` lấy thêm cho mỗi section: `hidden` (chữ trong `details` đang đóng và phần tử đang ẩn mà có chữ, ví dụ
  câu trả lời FAQ) và `media` (map `src` sang file trong `assets.json`).
- Chạy `OUTLINE_JS` thêm một lần trên trang điện thoại → `outline-mobile.json`.
- `digest.py render(outline, outline_mobile, assets)` → `digest.md`:
  - phần cả trang: nền, màu chữ, font, độ rộng nội dung, kiểu nút;
  - mỗi section: loại đoán, heading kèm style, chữ nguyên văn kể cả chữ ẩn, nút, media, khác biệt trên điện thoại;
  - nối section desktop với mobile theo chữ trùng.

**Tiêu chí:**
- [ ] Fixture JSON có FAQ ẩn, cột ảnh + chữ, nút, section ẩn trên điện thoại: `digest.md` có đủ chữ ẩn, ghi "ẩn trên
  điện thoại" và "ảnh lên trước trên điện thoại"
- [ ] Owearfit: `digest.md` < 6 nghìn token, có đủ 13 câu FAQ, có mã màu nút `#003FFF`

**Kiểm tra:** `python -m unittest …` (`test_digest.py`); chạy lại `fetch_competitor.py` trên owearfit

**Phụ thuộc:** Task 3 · **File:** `$S/fetch_competitor.py`, `$S/digest.py`, `$T/fixtures/outline*.json`,
`$T/test_digest.py` · **Cỡ:** M

---

## Task 12: Ảnh tổng có đánh số section

**Mô tả:** Sau khi chụp các màn hình, dựng một trang HTML tạm từ các ảnh (base64), thu nhỏ còn khoảng 1.500 px cạnh
dài, vẽ khung và số `sNN` theo `y` / `h` của outline, rồi chụp ra `source/overview-desktop.jpg` và
`overview-mobile.jpg`. Trang quá cao thì chia 2 ảnh. `read_next` đổi thành `digest.md` + 2 ảnh tổng.

**Tiêu chí:**
- [ ] Owearfit cho ra 2 ảnh (hoặc 3–4 nếu phải chia), đọc được số section
- [ ] Mỗi ảnh ≤ 1.568 px cạnh dài (để không bị thu nhỏ thêm khi đưa cho Claude)

**Kiểm tra:** Chạy `fetch_competitor.py` trên owearfit, mở ảnh xem

**Phụ thuộc:** Task 11 (outline có `y` / `h` của cả hai bản) · **File:** `$S/fetch_competitor.py` · **Cỡ:** S

---

## Checkpoint C
- [ ] Owearfit: có `shopdy-blocks.json` (18 block), `digest.md` < 6 nghìn token, ảnh tổng; test xanh

---

## Task 13: `plan.py layout` (M6)

**Mô tả:** Lấy chuỗi loại block mong muốn (từ `shopdy-blocks.json`, hoặc từ section của digest qua bảng tính năng →
block) và block của từng layout trong `options.json`. Chấm điểm bằng sequence alignment (Needleman–Wunsch, điểm cho
block giữ lại cùng thứ tự). In ra layout tốt nhất cùng các block cần xoá / di chuyển / thêm, 3 layout kế tiếp, và ghi
`layout-score.json`.

**Tiêu chí:**
- [ ] Với chuỗi owearfit và 5 layout local: chọn Advertorial, giữ được 7 block, giống `analysis.md` lần trước
- [ ] Chuỗi rỗng / không layout nào giữ được block nào → chọn Blank page

**Kiểm tra:** `python -m unittest …` (`test_plan.py`)

**Phụ thuộc:** Task 10 · **File:** `$S/plan.py`, `$T/test_plan.py` · **Cỡ:** S

---

## Task 14: `plan.py draft` (M6)

**Mô tả:** Sinh `build-plan.draft.json` gồm:
- op sắp xếp lại layout (`select` + `action` Delete / Move, `add`);
- `note` có `section` → alias block;
- `set` chữ, màu, `{{media:…}}` theo catalog;
- `fill` HTML / CSS bằng `value_file` cho html block (lấy từ `shopdy-blocks.json`, ghi file vào `sections/`);
- `save` sau mỗi section; page settings trước.

Section 🔴 không có op. In tóm tắt số op theo section và các chỗ Claude cần xem lại.

`build` lưu `sections → block id` vào `state.json` từ các `note`.

**Tiêu chí:**
- [ ] Owearfit trên stack local: plan nháp chạy `build` qua hết mà không phải sửa tay chỗ nào bắt buộc; chuỗi block
  khớp lần chạy trước
- [ ] Plan chỉ dùng label có trong catalog; test với catalog giả

**Kiểm tra:** `python -m unittest …` (`test_plan.py`); chạy tay `build` trên stack local

**Phụ thuộc:** Task 8, 10, 11, 13 · **File:** `$S/plan.py`, `$S/shopdy.py` (lưu map section), `$T/test_plan.py` ·
**Cỡ:** M

---

## Task 15: `inspect --values`, op `item-image`, đầu ra gọn, `ops` / `help` (M5)

**Mô tả:**
- `inspect --values <block>`: giá trị đã lưu của block, lấy từ API của page.
- Op `item-image {"list": "Reviews", "item": 2, "media": "{{media:…}}"}`: mở hộp chọn Media library của mục đó và chọn
  ảnh theo tên file.
- `options`: in gọn mặc định (store dạng bảng, layout kèm danh sách block), JSON đầy đủ ghi ra `options.json`.
- `build`: in vài dòng (số op, lần save, dòng catalog sửa), chi tiết ghi `build.out.json`.
- `shopdy.py ops`: in bảng op.
- `shopdy.py help <lệnh>`: in hướng dẫn, gồm API của snippet `exec`.

**Tiêu chí:**
- [ ] Gắn được ảnh cho review 1 và 2 trên stack local (việc lần trước phải viết `exec`)
- [ ] Đầu ra mặc định của `options` / `build` ≤ 25 dòng
- [ ] `ops` và `help` đủ để viết plan mà không cần mở `shopdy.py`

**Kiểm tra:** Chạy tay trên stack local; `python -m unittest …` (định dạng đầu ra)

**Phụ thuộc:** Task 8 · **File:** `$S/shopdy.py`, `references/editor-ui.md` · **Cỡ:** M

---

## Checkpoint D
- [ ] Plan nháp owearfit build được trên stack local; ảnh review gắn được; test xanh

---

## Task 16: `compare.py`: so style + thẻ HTML bị lọc (M7)

**Mô tả:**
- `verify` đọc style (màu, cỡ, độ đậm, font) của heading / đoạn văn / nút trong từng block đã dựng, qua map
  `sections → block`.
- `compare.py` so với `digest` của section tương ứng, theo ngưỡng: màu ΔE > 10, cỡ chữ lệch > 2 px, độ đậm khác, font
  khác.
- Ghi `compare.json`; in mỗi section lệch một dòng, ví dụ `s05 p color #62676F ≠ #111111`.
- Kèm `sanitizedAway` của các lần save, và so thẻ trong HTML đã gửi với HTML đã lưu (thay `final-check.py`).

**Tiêu chí:**
- [ ] Dữ liệu giả của lỗi màu xám lần trước → báo đúng `s05 p color`
- [ ] Thẻ `<video>` bị lọc → báo; không bị lọc → không báo

**Kiểm tra:** `python -m unittest …` (`test_compare.py`)

**Phụ thuộc:** Task 11, 14 · **File:** `$S/compare.py`, `$S/shopdy.py` (`cmd_verify`), `$T/test_compare.py` · **Cỡ:** M

---

## Task 17: Điểm hình từng section + ảnh ghép khi dưới ngưỡng (M7)

**Mô tả:**
- Chụp từng block đã dựng (PC 1440 / mobile) và so với ảnh cắt `sNN` của đối thủ cùng độ rộng. Điểm = tỷ lệ điểm ảnh
  giống nhau, tính trong trình duyệt bằng canvas, không cần thư viện mới.
- Section dưới ngưỡng (mặc định 0,80) có ảnh ghép hai bên `shots/cmp-sNN-{pc,mobile}.jpg`.
- `verify` in danh sách cần xem, tối đa 4 ảnh.

**Tiêu chí:**
- [ ] Hai ảnh giống nhau → ≥ 0,95; hai ảnh khác hẳn → < 0,5 (fixture ảnh tự tạo)
- [ ] Owearfit: chỉ section thật sự lệch mới có ảnh ghép

**Kiểm tra:** `python -m unittest …` (bỏ qua nếu chưa cài playwright); chạy `verify` trên stack local

**Phụ thuộc:** Task 16 · **File:** `$S/shopdy.py`, `$S/compare.py`, `$T/test_compare.py` · **Cỡ:** M

---

## Task 18: Viết lại SKILL.md, `editor-ui.md`, README; version 1.1.0; cài (M8)

**Mô tả:**
- **SKILL.md**, dưới 160 dòng:
  - khối trạng thái `!`, đường dẫn dùng `${CLAUDE_SKILL_DIR}`;
  - quy tắc tiết kiệm: không đọc `scripts/*.py`, không đọc code shopdy (trừ khi catalog + inspect không trả lời được,
    và khi đó ghi vào `catalog-gaps.md`), gộp lệnh, không đọc cả file lớn;
  - quy trình mới: `fetch` → đọc `digest.md` + ảnh tổng → `plan.py layout` → hỏi → `create` (catalog tự lo) →
    `plan.py draft` → sửa → `upload-media` → `build` → `verify` (chỉ mở ảnh được đánh dấu) → báo cáo.
- **`editor-ui.md`**: bảng op mới.
- **README** source-theme:
  - catalog nằm trong shopdy-promax và được giữ khi cài lại;
  - người dùng không phải làm gì thêm.
- `metadata.version` = 1.1.0. Cài sang shopdy-promax.

**Tiêu chí:**
- [ ] SKILL.md < 160 dòng, frontmatter hợp lệ, description ≤ 1.536 ký tự
- [ ] Gọi `/store-page-from-link` trong shopdy-promax: khối trạng thái hiện ra, không lỗi (kiểm tra cả khi đổi tên
  `python` tạm thời)
- [ ] Cài lại: giữ `_work/`, `catalog/`, `.env`; không có `tests/`

**Kiểm tra:** `cd tools && npm test`; `python -m unittest …`; `node tools/install-shopdy-skill.js D:\shopdy-promax`; mở
phiên Claude Code thử trong shopdy-promax

**Phụ thuộc:** Task 4–17 · **File:** `SKILL.md`, `references/editor-ui.md`, `README.md`, `CLAUDE.md` (nếu cần) ·
**Cỡ:** M

---

## Checkpoint E
- [ ] Mọi test xanh; skill v1.1.0 đã cài; khối trạng thái hiện ra

---

## Task 19: Nghiệm thu owearfit (tiêu chí 1, 2, 3, 5)

**Mô tả:**
- Stack local đang chạy, chưa có `catalog/`. Mở phiên Claude Code **mới** trong shopdy-promax và chạy
  `/store-page-from-link <link owearfit>`, cùng store test.
- Đo bằng `node tools/transcript-cost.js --project D:\shopdy-promax --latest`.
- Giả lập lệch / block mới (tiêu chí 3), chạy thêm một job ngắn để kiểm.
- Ghi số đo vào spec (mục "Đo sau khi làm").

**Tiêu chí:**
- [ ] ≤ 40 lượt gọi; chi phí ≤ 0,95 triệu; 0 lần đọc `scripts/*.py`; ≤ 2 lần đọc code shopdy (có `catalog-gaps.md`);
  ≤ 8 ảnh
- [ ] Page vẫn Draft, cùng chuỗi block, `verify` sạch hoặc mọi mục đều có lý do
- [ ] Mọi điểm của tiêu chí 3 đạt; `git status` của shopdy-promax sạch

**Kiểm tra:** Kết quả của `transcript-cost.js`; `verify.json`; `compare.json`; `changes.log`

**Phụ thuộc:** Task 18 · **File:** `docs/SPEC-store-page-token-cost.md` (ghi số đo) · **Cỡ:** S

---

## Task 20: Nghiệm thu link không dựng bằng shopdy (tiêu chí 4)

**Mô tả:** Người dùng chọn một link (Shopify hoặc nền tảng khác), chạy như Task 19, đo, ghi vào spec. Vượt 50 lượt
gọi thì phân tích theo loại việc và đề xuất bổ sung (không tự hạ chỉ tiêu).

**Tiêu chí:**
- [ ] ≤ 50 lượt gọi; page Draft; `verify` sạch hoặc có lý do

**Kiểm tra:** `transcript-cost.js`

**Phụ thuộc:** Task 18 · **File:** `docs/SPEC-store-page-token-cost.md` · **Cỡ:** S

---

## Checkpoint: Xong
- [ ] Đạt mọi tiêu chí của spec; số đo đã ghi vào spec
- [ ] Báo người dùng; hỏi trước khi commit / push
