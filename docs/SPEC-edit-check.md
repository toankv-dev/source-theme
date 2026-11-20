# Spec: `edit-check` — kiểm tra một thay đổi bằng một lệnh

Trạng thái: **xong ngày 2026-11-20** (người dùng bảo làm hết các đợt, không dừng chờ duyệt từng bước). Bản đồ:
[SPEC-theme-token-cost.md](SPEC-theme-token-cost.md).

## Mục tiêu
Phiên sửa 06a2156e: ~1/3 số lần dùng tool là kiểm tra sau khi sửa (shot 22, đọc ảnh 22, bật preview 18 lần, mobile-audit
12, visual-diff / pixel / crop 13, script tạm 15). Một lệnh thay tất cả, in số trước, ảnh chỉ khi được hỏi.

## Lệnh
```
node tools/edit-check.js themes/<slug> [--page /product?template=x] [--selector "<css>"] [--widths 1440,360]
     [--eval "<js>"] [--ref <url> [--ref-selector "<css>"]] [--shot] [--audit] [--zip]
node tools/edit-check.js themes/<slug> --stop
```
- Preview: chạy nền một lần cho mỗi theme (`_work/preview.json`: port, pid), lần sau dùng lại. Preview đọc lại file ở
  mọi request nên **không cần khởi động lại sau khi sửa**.
- Mỗi bề rộng: box, font, màu, viền, bo góc, padding của phần tử; chữ nhỏ nhất và nút dưới 44 px (điện thoại); cuộn
  ngang (so với bề rộng màn hình đặt ra, vì điện thoại nở `innerWidth` khi nội dung tràn); lỗi console.
- `--eval`: biểu thức JS chạy trong trang (thử kéo slider, đọc giá trị). `--ref`: chỉ in các style khác bản gốc.
  `--shot`: một ảnh mỗi bề rộng, có `--ref` thì ảnh ghép cạnh nhau ≤ 1200 px. `--audit`: mobile-audit cho trang đó.
- Cuối cùng chạy `pack.js` (`--zip` để tạo zip), kể cả cảnh báo design map lệch.
- Exit 0 ổn · 1 có vấn đề (không thấy phần tử, cuộn ngang trên điện thoại, lỗi console, `--eval` lỗi, pack lỗi, audit
  lỗi) · 2 sai cách dùng.

## Kiểm thử (`tools/test/edit-check.test.js`, trên bản copy base-theme)
Đo `#addToCart` ở 1440 + 360, dùng lại preview (cùng pid), `--eval`; sửa CSS không cần restart → phát hiện cuộn
ngang, phần tử thiếu → exit 1; `--ref` cùng phần tử → "same styles", khác phần tử → liệt kê khác biệt, `--shot` ra ảnh
ghép; `--stop` tắt server.

## Tiêu chí
Mọi test xanh; output ≤ 25 dòng; phiên sửa sau: số lần dùng shot / preview-server / script tạm giảm (đo bằng cost-meter).
