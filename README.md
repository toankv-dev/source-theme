# source-theme

Repo này dựng theme cửa hàng cho Adlux. Mọi theme đều đi từ `base-theme/`, kết quả là một file `.zip` để upload lên
admin.

## Cài đặt (một lần)

```
cd tools && npm install && npx playwright install chromium
```

Mở Claude Code ở thư mục gốc của repo.

## Dùng skill nào?

- **Có link trang gốc** → `/theme-from-link`
- **Chỉ có ảnh chụp** → `/new-theme`

### `/theme-from-link`

```
/theme-from-link Tên theme: Maggies Tanks
https://example-store.com/
https://example-store.com/products/tank-top
```

Mỗi link là một trang, Claude chỉ tải đúng trang đó. Trang nào không gửi link thì dùng bố cục có sẵn của base.

### `/new-theme`

```
/new-theme Tên theme: Club Ritual
Trang sản phẩm: D:\shots\product-desktop.png, D:\shots\product-mobile.png
```

Gửi ảnh chụp nguyên trang, định dạng PNG, cả bản desktop và bản điện thoại. Biết font của trang gốc thì ghi kèm.

## Kết quả

- File zip trong `dist/`: upload ở admin Adlux (Themes → upload).
- Mã nguồn theme trong `themes/<tên>/`.
- Báo cáo tiếng Việt: phần đã khớp, phần còn khác, và **các ô ảnh / video để trống mà chủ shop cần tự upload**.

Xem thử trên máy: `node tools/preview-server.js themes/<tên> --port 8091` rồi mở `http://localhost:8091`.

## Giống nhau

- Dựng từ `base-theme`, giữ nguyên giỏ hàng, checkout, pixel.
- Font và màu đúng y bản gốc.
- Ảnh / video trên trang sản phẩm không đưa vào theme, chủ shop tự upload.
- Không có form viết đánh giá.
- Kiểm tra kỹ bản điện thoại trước khi giao.

## Khác nhau

Hai skill dựng theme theo cùng một cách. Chỗ khác là **Claude lấy thông tin của trang gốc từ đâu**: `/new-theme` chỉ
có ảnh chụp để nhìn, còn `/theme-from-link` tải cả trang thật về máy để đọc.

| Khác ở | `/new-theme` (từ ảnh chụp) | `/theme-from-link` (từ link) |
| --- | --- | --- |
| Bạn phải làm gì | Tự chụp từng trang, cả bản desktop và bản điện thoại | Chỉ dán link. Claude tự tải trang và tự chụp |
| Font chữ | Claude nhìn ảnh để đoán, không nhận ra thì hỏi bạn | Đọc đúng tên font, độ đậm, cỡ chữ từ trang; tải luôn file font |
| Màu | Đo trên điểm ảnh của ảnh chụp, ảnh nén hoặc thu nhỏ sẽ lệch màu | Lấy đúng mã màu trong CSS của trang |
| Chữ | Chép lại chữ thấy trên ảnh. Phần bị ẩn (câu trả lời FAQ, tab chưa mở) không có trong ảnh nên bị thiếu | Lấy nguyên văn mọi chữ, kể cả phần bị ẩn |
| Kích thước, khoảng cách | Ước lượng từ ảnh | Đo chính xác từng khối trên bản tải về |
| Kiểm tra độ giống | Chụp theme rồi đặt cạnh ảnh gốc, so bằng mắt | Tool so từng điểm ảnh với ảnh chụp trang thật và chỉ ra chỗ lệch |
| Khi site chặn bot | Không ảnh hưởng, vì không cần vào site | Không tải được thì Claude xin ảnh chụp và chuyển sang `/new-theme` |

**Tóm lại:** có link thì dùng `/theme-from-link`, vì theme giống bản gốc hơn và bạn đỡ việc hơn. Chỉ dùng `/new-theme`
khi không có link, hoặc link bị chặn không tải được.

## Xem thêm

[CLAUDE.md](CLAUDE.md) (quy tắc chung) · [base-theme/README.md](base-theme/README.md) (base có gì) ·
[new-theme](.claude/skills/new-theme/SKILL.md) và [theme-from-link](.claude/skills/theme-from-link/SKILL.md) (quy tắc
đầy đủ).
