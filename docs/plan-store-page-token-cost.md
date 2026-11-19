# Kế hoạch triển khai: giảm token của skill `store-page-from-link`

Spec: [SPEC-store-page-token-cost.md](SPEC-store-page-token-cost.md) (đã duyệt 2026-11-12, bản 3) · Task:
[todo-store-page-token-cost.md](todo-store-page-token-cost.md)

## Tổng quan

Có 8 hạng mục (M1–M8), chia thành 7 giai đoạn và 20 task:
- **Giai đoạn 0** dựng công cụ đo trước, để mỗi bước sau đo được.
- **Giai đoạn 1–2** làm phần tiết kiệm nhiều nhất và rủi ro cao nhất:
  - trạng thái nạp sẵn (M1);
  - file catalog trong shopdy-promax, tạo một lần và tự sửa khi lệch (M3). Phần này phụ thuộc editor thật, nên làm sớm
    để lộ vấn đề sớm.
- **Giai đoạn 3–5** làm phía trang đối thủ (M4 trước, rồi M2), plan nháp (M6), các op còn thiếu (M5) và verify tự so
  (M7).
- **Giai đoạn 6** viết lại SKILL.md (M8).
- **Giai đoạn 7** nghiệm thu bằng hai lần chạy thật, có đo.

Các câu hỏi mở của spec đi theo đề xuất:
1. làm M4 trước;
2. giữ model hiện tại;
3. không ghi JSON block qua API;
4. giữ chỉ tiêu ≤ 30% chi phí, ≤ 40 lượt gọi;
5. catalog đặt trong `.claude/` (cách a).

## Quyết định kiến trúc

- **Tách phần thuần khỏi phần trình duyệt.** Mỗi tính năng có một module Python thuần, chỉ dùng thư viện chuẩn, nhận
  JSON/HTML và trả JSON/Markdown:
  - `catalog.py`: so lệch, ghép, ghi file, render;
  - `digest.py`, `shopdy_blocks.py`, `plan.py`, `compare.py`.

  Test bằng `unittest` không cần trình duyệt. Phần chạy Playwright (`shopdy.py`, `fetch_competitor.py`) chỉ thu dữ
  liệu rồi gọi các module đó. Test cần trình duyệt dùng `skipUnless(playwright)`.
- **Một op chung `set`.** `{"op": "set", "label": "Star size", "value": 18}` tra loại điều khiển trong catalog rồi gọi
  đúng hàm có sẵn (`fill` / `number` / `slider` / `choose` / `toggle` / `color` / `image`). `plan.py draft` chỉ sinh
  `set`. Các op cũ giữ nguyên để plan cũ vẫn chạy.
- **Catalog:**
  - file `catalog/block-catalog.json` ở thư mục gốc của skill đã cài;
  - khoá là loại block, mỗi mục có `fields[]`, `actions[]`, `palette`, `checked`, `sha`;
  - so lệch theo `(group, label đã chuẩn hoá, kind, options, min, max, step)`. Label đánh số như "Review 2" được chuẩn
    hoá thành "Review #", nên không báo lệch giả;
  - ghi an toàn: đọc bản mới nhất → ghép mục của block vừa đọc → ghi file tạm → `os.replace`.
- **Chế độ quét của guard:** `Guard(scan=True)` chặn **mọi** lệnh không phải GET/HEAD/OPTIONS, kể cả PATCH page của
  job, và ghi vào `guard.log`. Quét xong thì tải lại editor, không Save. Theo spec, editor của store page không tự lưu.
- **Lúc nào quét gì:**
  - `create` kết thúc bằng `catalog.ensure()`: chưa có file thì quét toàn bộ; có rồi thì chỉ so danh sách palette và
    quét riêng loại block mới;
  - `Editor.select` / `add` gọi `catalog.check()` trên inspector đang mở (một lần `evaluate`, gần như không tốn thời
    gian);
  - `run_op` bắt lỗi "không thấy label / sai loại", gọi `catalog.check()` cho block hiện tại, rồi chạy lại op một lần.
- **Đối thủ dựng bằng shopdy:** đọc từ `dom.html` bằng `html.parser` của Python, không dùng trình duyệt. CSS gỡ scope
  bằng cách tách các rule có `#sp-bN` trong `<style>`, như lần chạy thật đã làm tay.
- **Digest:**
  - `OUTLINE_JS` lấy thêm chữ bị ẩn (`textContent` của `details` và phần tử đang ẩn), và chạy thêm một lần trên bản
    điện thoại;
  - `digest.py` ghép desktop + mobile + `assets.json` thành `digest.md`;
  - ảnh tổng được vẽ bằng một trang HTML tạm (ảnh base64, đánh số section), rồi chụp thành JPEG.
- **Nối section đối thủ với block đã dựng:**
  - `plan.py draft` ghi `{"op": "note", "section": "s05", "block": "<alias>"}`;
  - `build` lưu map `sections → block id` vào `state.json`;
  - `verify` dùng map đó để so từng cặp.
- **Trình cài:** `KEEP` đổi thành "chỉ tính ở thư mục gốc của skill" cho `_work`, `.env`, `catalog`; riêng
  `__pycache__` vẫn tính ở mọi tầng. Không chép `tests/` sang shopdy-promax.
- **Đo:** `tools/transcript-cost.js` lấy logic của script đo đã dùng khi làm spec:
  - gộp các dòng có cùng `requestId|message.id`;
  - quy đổi chi phí: đọc cache ×0,1, ghi cache ×1,25, viết ra ×5;
  - phân loại lượt gọi theo lệnh của skill, và đếm số lần đọc code shopdy, đọc script, đọc ảnh.

## Danh sách task

### Giai đoạn 0: Đo
- [x] Task 1: `tools/transcript-cost.js` + test

### Giai đoạn 1: Nền
- [x] Task 2: Trình cài giữ `catalog/` (chỉ ở gốc), không chép `tests/`
- [x] Task 3: Guard có chế độ quét + bộ khung test Python
- [x] Task 4: `status.py` + dòng `!` trong SKILL.md (M1)

### Checkpoint A
- [x] `cd tools && npm test` xanh (phần mới); `python -m unittest` xanh
- [x] Đo lại transcript owearfit bằng `transcript-cost.js`: ra đúng số đã ghi trong spec (114 lượt, 3,16 triệu)

### Giai đoạn 2: Catalog (M3)
- [x] Task 5: `catalog.py` phần thuần: so lệch, ghép, ghi an toàn, `changes.log`, render `.md`, đánh dấu MỚI
- [x] Task 6: Đọc inspector đầy đủ (loại điều khiển, lựa chọn, min/max/step, danh sách lồng nhau)
- [x] Task 7: Quét toàn bộ ở chế độ quét + `create` tự gọi + quét riêng loại block mới
- [x] Task 8: Tự sửa khi lệch trong `build`/`inspect`, op `set`, chạy lại op, `catalog --show/--refresh`
- [x] Task 9: `references/block-notes.md` thay `block-catalog.md`

### Checkpoint B (stack local)
- [x] Lần đầu tạo file, lần hai không quét; giả lập lệch thì tự sửa và op chạy được; page trong DB không đổi sau khi quét
- [x] `git status` của shopdy-promax sạch
- [x] **Người dùng xem kết quả trước khi đi tiếp** (2026-11-12: "tiếp tục")

### Giai đoạn 3: Trang đối thủ (M4, M2)
- [ ] Task 10: `shopdy_blocks.py`: tách block của trang dựng bằng shopdy
- [ ] Task 11: `OUTLINE_JS` lấy chữ ẩn + chạy trên điện thoại; `digest.py` → `digest.md`
- [ ] Task 12: Ảnh tổng desktop / mobile có đánh số section; `read_next` mới

### Checkpoint C
- [ ] Chạy `fetch_competitor.py` trên owearfit: có `shopdy-blocks.json` (18 block), `digest.md` < 6 nghìn token, 2 ảnh tổng

### Giai đoạn 4: Plan và op (M6, M5)
- [ ] Task 13: `plan.py layout`: chấm điểm layout
- [ ] Task 14: `plan.py draft`: plan nháp từ shopdy-blocks / digest + catalog
- [ ] Task 15: `inspect --values`, op `item-image`, đầu ra gọn của `options` / `build`, `ops` / `help`

### Checkpoint D
- [ ] Plan nháp cho owearfit build được trên stack local mà Claude không phải sửa tay chỗ nào bắt buộc

### Giai đoạn 5: Verify (M7)
- [ ] Task 16: `compare.py`: so style từng section + báo thẻ HTML bị lọc
- [ ] Task 17: Điểm hình từng section + ảnh ghép chỉ cho section dưới ngưỡng

### Giai đoạn 6: Skill (M8)
- [ ] Task 18: Viết lại SKILL.md (< 160 dòng), `editor-ui.md`, README; version 1.1.0; cài sang shopdy-promax

### Checkpoint E
- [ ] Mọi test xanh; cài lại giữ `_work/`, `catalog/`, `.env`; SKILL.md hiển thị khối trạng thái khi gọi skill

### Giai đoạn 7: Nghiệm thu
- [ ] Task 19: Chạy thật owearfit trong phiên mới, đo (tiêu chí 1, 2, 3, 5)
- [ ] Task 20: Chạy thật một link không dựng bằng shopdy, đo (tiêu chí 4)

### Checkpoint: Xong
- [ ] Mọi tiêu chí của spec đạt; ghi số đo vào spec; báo người dùng

## Rủi ro và cách xử lý

| Rủi ro | Mức | Cách xử lý |
| --- | --- | --- |
| Thêm một số loại block khi quét làm mở dialog, hoặc cần cấu hình trước (Main product, sticky chỉ một cái) | Cao | Đóng dialog theo từng loại. Loại nào không quét được thì ghi `scanFailed` kèm lý do, phần còn lại vẫn ghi; lần dùng đầu tự sửa (Task 8). |
| Lựa chọn của select kiểu Radix chỉ hiện khi mở | Trung bình | Mở → đọc → Escape. Không chọn gì, và quét xong thì tải lại không Save. |
| Báo lệch giả vì label động ("Review 2") hoặc giá trị đổi theo nội dung | Trung bình | Chỉ so thuộc tính ổn định, chuẩn hoá số thứ tự; giá trị mặc định không dùng để so. |
| Dòng `!` lỗi trên Windows (không có `python`) làm huỷ cả skill | Trung bình | Bọc: `python … \|\| py -3 … \|\| echo "status: không chạy được python"`. Thử thật ở Task 18. |
| Hai phiên ghi catalog cùng lúc | Thấp | Ghi an toàn kiểu ghép theo block (Task 5), có test hai lần ghi chen nhau. |
| Đã làm xong mà vẫn không đạt ≤ 30% | Trung bình | Đo ở Task 19 theo từng loại việc. Còn hở thì bổ sung đúng chỗ tốn và đo lại; không hạ chỉ tiêu nếu người dùng chưa đồng ý. |
| Mỗi lần chạy nghiệm thu tốn hạn mức của người dùng (~6% mỗi lần nếu đạt) | Trung bình | Chỉ 2 lần (Task 19, 20), và hỏi trước khi chạy. |
| Khung editor của shopdy đổi trong lúc đang làm | Thấp | Selector tập trung trong `Editor`; test trên stack local mới nhất ở mỗi checkpoint. |

## Ghi chú khi làm (giai đoạn 0–2)

- **Đo:** `transcript-cost.js` ra đúng số của spec: 114 lượt gọi, 3.163.642 đơn vị; đếm được 41 lần đọc code
  shopdy.
- **Escape trong editor bỏ chọn block.** Lần quét đầu đóng ô chọn Radix bằng Escape, nên inspector chuyển sang Page
  settings và mỗi ô chọn sau đó chờ hết 20 giây. Quét mất 756 giây và mất các lựa chọn. Sửa: đóng bằng cách bấm lại
  đúng lựa chọn đang có. Quét lại toàn bộ còn **33 giây**; quét một loại block mới mất 4 giây; khi đã có file thì
  0 giây.
- **Trường hiện ra tuỳ cài đặt của block** (reviews "Photo wall" có nhiều trường hơn "Quote cards"). Vì vậy:
  - lần kiểm tra trong lúc build chỉ **thêm** hoặc **cập nhật**, không xoá (`merge_entry`);
  - chỉ quét toàn bộ (lần đầu hoặc `--refresh`) mới thay hẳn.
- **Lựa chọn mang dữ liệu riêng của store** (`Checkout: <sản phẩm>`, danh sách sản phẩm) được thay bằng chỗ trống
  chung, để store khác không bị báo lệch.
- **Gốc lỗi "Star size" lần trước:** label của `RangeField` nằm trong một hàng riêng, nên `row(label)` không chứa ô
  nhập. `number()` giờ tìm ô qua `get_by_label` trước. `set("Star size", 22)` đã chạy được trên editor thật.
- **Kiểm chứng:** mọi lần quét và thử đều dùng page Draft của job owearfit có sẵn. Mã md5 của `blocks` và
  `updated_at` trong DB không đổi; không có lệnh ghi nào bị chặn; không tạo page hay tài khoản tạm nào.
- **Môi trường:** API local tự khởi động lại nhiều lần trong lúc làm, vì file trong `apps/api/src` bị chạm từ bên
  ngoài. Tôi đã bật lại API (`pnpm --filter @adlux/api dev`); web giữ nguyên.

## Song song được

- **Độc lập với giai đoạn 2:** Task 1, Task 10–12 (phía đối thủ) và Task 13 (chấm layout).
- **Phải tuần tự:** Task 5 → 6 → 7 → 8. Task 14 cần Task 8 (op `set`) và Task 10 / 11. Task 16–17 cần Task 11 và
  Task 14 (map section → block).

## Câu hỏi còn mở

1. **Stack local:** các task 7, 8, 15 và checkpoint B, D cần stack local của shopdy-promax đang chạy (docker postgres,
   API, web) và một admin tạm. Tôi tự bật stack và tạo admin tạm bằng API + SQL trên `:5433`, rồi xoá khi xong như lần
   trước, được không?
2. **Ai chạy nghiệm thu** (Task 19, 20)? Đề xuất:
   - **bạn** mở một phiên Claude Code mới trong shopdy-promax và chạy skill như bình thường, để số đo đúng thực tế;
   - **tôi** đo bằng `transcript-cost.js` và đối chiếu tiêu chí.

   Task 20 cần bạn chọn link.
