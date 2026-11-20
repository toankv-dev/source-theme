# Spec: `cost-meter` — đo chi phí theo từng yêu cầu

Trạng thái: **xong ngày 2026-11-20** (T1, T2). Plan: [plan-theme-token-cost.md](plan-theme-token-cost.md).
Đo trên phiên A: 710 lượt, 42 375 383 đơn vị, `--fresh` 17 128 814 (40%), 38 yêu cầu (5 bị ngắt). Bản đồ module: [SPEC-theme-token-cost.md](SPEC-theme-token-cost.md) (quy ước
chung ở đó).

## Mục tiêu

Mọi mục tiêu của dự án ("2.1 ≤ 10 lượt, context ≤ 150k", "một ngày sửa ≤ 25% của phiên A"…) cần đo được bằng một lệnh,
không phải viết script tạm như lúc nghiên cứu. `tools/transcript-cost.js` hiện chỉ đo cả phiên và chia theo bước của
skill `store-page-from-link`. Module này thêm phép đo theo **từng yêu cầu** của người dùng và các bước của việc làm
theme.

## Lệnh

```
node tools/transcript-cost.js <session.jsonl> [--by-request] [--fresh] [--prompts] [--json] [--since <iso>]
node tools/transcript-cost.js --project <dir> --latest …
node tools/transcript-cost.js --project <dir> --title "<một phần tên phiên>" …
```

- `--by-request`: mỗi yêu cầu một dòng, gồm số thứ tự, giờ, slash command nếu có (`/theme-edit`), lượt gọi, % chi phí,
  context đầu → cuối, ảnh đọc, lần đọc code theme, lần đọc code shopdy, compact. Chỉ in số và tên lệnh, không in lời
  người dùng hay nội dung file (giữ nguyên tắc của tool).
- `--prompts`: thêm 60 ký tự đầu của mỗi yêu cầu, để người dùng nhận ra yêu cầu nào.
- `--fresh`: ước tính chi phí nếu mỗi yêu cầu là một phiên mới (giữ nguyên các lượt gọi, context mỗi yêu cầu bắt đầu
  lại từ context nền của phiên).
- `--title`: tìm phiên theo tên (`aiTitle` / `customTitle` trong transcript) trong thư mục project. Nhiều phiên trùng
  thì in danh sách.

Ví dụ (lượt, chi phí, context là số thật của phiên A; cột img / theme / shopdy chỉ minh hoạ):

```
requests (38, 5 interrupted) · fresh-session estimate 17.1M of 42.4M (40%)
 #   time         cmd       calls  cost   context      img  theme  shopdy
 0   11-19 04:38  /spec-d…     30  1.6%   71k→160k      3    12      0
 10  11-19 06:45  —           3  0.5%   613k→617k     0     1      0
 ...
```

## Bước mới cho việc làm theme

Thêm vào `classify()` (các bước cũ của store-page-from-link giữ nguyên tên):

| Bước | Nhận ra bằng |
|---|---|
| `tool <tên>` | `node tools/<tên>.js` |
| `theme script` | `node themes/<slug>/_work/*.js` / `_src/*.js` |
| `temp script` | chạy script trong thư mục scratchpad / Temp |
| `read theme code` | Read / Grep / cat / sed / head / `node -e` đọc file trong `themes/*` hay `base-theme` (trừ `_map/`) |
| `read design map` | đọc `_map/design-map.md` hay `theme-map.js --part` |
| `fetch web` | curl / wget tới `http(s)://` không phải localhost |
| `read image` | như cũ, thêm đếm ảnh người dùng dán |

## Kiểm thử

Thêm vào `tools/test/transcript-cost.test.js`, dùng transcript giả nhỏ (như test hiện có):
1. `--by-request` tách đúng yêu cầu: lời người dùng là một yêu cầu; tool result, `<task-notification>`, lệnh nội bộ
   và tin bị ngắt thì không. Đếm đúng lượt, ảnh, compact.
2. `--fresh`: phép tính đúng trên transcript giả có context biết trước.
3. `classify` cho từng dòng của bảng trên; các bước cũ giữ tên.
4. Mặc định không in chữ nào của người dùng; `--prompts` in tối đa 60 ký tự.
5. `--title` tìm đúng phiên; trùng tên thì liệt kê.

## Ranh giới

- Luôn: output cũ (không cờ mới) giữ nguyên từng dòng; test cũ xanh không đổi.
- Không bao giờ: in nội dung tool result hay file; gửi transcript đi đâu.

## Tiêu chí hoàn thành

1. Trên phiên A (`d--shopdy-promax/1c0d32c8…`): 710 lượt, 42,4M đơn vị, `--fresh` ≈ 17,1M (sai số ≤ 1%), bảng
   `--by-request` khớp số lúc nghiên cứu.
2. `--title "vesnacharm"` trong `D:\shopdy-promax` tìm ra phiên A.
3. Mọi test xanh; `cd tools && npm test` xanh.
4. Mỗi module sau dùng lệnh này để ghi số trước / sau vào spec của nó.

## Câu hỏi mở

Không có.
