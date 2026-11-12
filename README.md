# source-theme

Repo này dựng theme cửa hàng cho Shopdy. Mọi theme đều đi từ `base-theme/`, kết quả là một file `.zip` để upload lên
admin.

## Cài đặt (một lần)

```
cd tools && npm install && npx playwright install chromium
```

Mở Claude Code ở thư mục gốc của repo.

## Dùng skill nào?

- **Có link trang gốc** → `/theme-from-link`
- **Chỉ có ảnh chụp** → `/new-theme`
- **Cần một page kéo thả trên Shopdy giống trang đối thủ (không phải theme)** → `/store-page-from-link`, chạy trong
  repo shopdy-promax, xem [mục bên dưới](#store-page-from-link-page-kéo-thả-từ-link-đối-thủ)

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

- File zip trong `dist/`: upload ở admin Shopdy (Themes → upload).
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
/theme-from-link: Thực hiện tải video, ảnh từ trang gốc.

**Tóm lại:** có link thì dùng `/theme-from-link`, vì theme giống bản gốc hơn và bạn đỡ việc hơn. Chỉ dùng `/new-theme`
khi không có link, hoặc link bị chặn không tải được.

## `/store-page-from-link`: page kéo thả từ link đối thủ

Skill này dựng một **page** trong trình tạo page kéo thả của Shopdy (menu Online Stores → Pages, đường dẫn
`/store-pages`). Kết quả là page trên Shopdy, không có file zip.

Mã nguồn skill nằm trong repo này, ở [shopdy-skills/store-page-from-link/](shopdy-skills/store-page-from-link/SKILL.md).
Nhưng skill **chạy trong repo shopdy-promax**, nên phải cài nó sang đó. Repo shopdy-promax không đưa thư mục `.claude`
lên git, vì vậy ai muốn dùng cũng phải kéo repo này về rồi cài.

### Cài đặt (một lần)

1. Kéo repo này về, rồi cài skill sang shopdy-promax. File cài nằm trong repo **này**, nên phải chạy từ thư mục
   của repo này:

   ```
   cd D:\source-theme
   git pull
   node tools/install-shopdy-skill.js D:\shopdy-promax
   ```

   Nếu đang đứng trong thư mục shopdy-promax, hãy ghi đường dẫn đầy đủ tới file cài. Không cần ghi thư mục đích,
   lệnh tự cài vào thư mục đang đứng:

   ```
   node D:\source-theme\tools\install-shopdy-skill.js
   ```

   Gõ `node tools/install-shopdy-skill.js` khi đang ở trong shopdy-promax sẽ báo lỗi `Cannot find module`, vì bên
   đó không có thư mục `tools` này. Nếu shopdy-promax nằm cạnh repo này (`D:\source-theme` và `D:\shopdy-promax`),
   chạy từ source-theme cũng không cần ghi đường dẫn đích.

   Lệnh này chép skill vào `D:\shopdy-promax\.claude\skills\store-page-from-link\`. Nó không đụng đến code của
   shopdy-promax và không làm thay đổi `git status` bên đó. Thêm `--dry` nếu muốn xem trước sẽ chép những gì.
2. Cài Playwright cho Python:

   ```
   pip install playwright
   python -m playwright install chromium
   ```

3. Trong thư mục skill của shopdy-promax, chép `.env.example` thành `.env`, rồi tự điền `SHOPDY_URL` (trang admin), `SHOPDY_EMAIL`,
   `SHOPDY_PASSWORD`. Đừng gửi mật khẩu qua chat. Không điền cũng được: lúc chạy, trình duyệt sẽ mở ra để bạn tự
   đăng nhập. Phiên đăng nhập được giữ cho các lần sau.

### Cách dùng

Mở Claude Code ở thư mục gốc của repo shopdy-promax:

```
/store-page-from-link https://doi-thu.com/products/san-pham
```

Claude chỉ hỏi hai thứ: **Page name** và **Store**. Layout do Claude tự chọn.

Claude sẽ làm như sau:

1. Tải đúng trang đó về: ảnh, video, HTML/CSS/JS, ảnh chụp bản desktop và bản điện thoại. Sau đó chia trang thành
   từng phần.
2. Mở trình duyệt, đăng nhập Shopdy, tạo page mới ở `/store-pages`, rồi dựng lại từng phần bằng các block có sẵn.
   Chữ và ảnh lấy từ trang đối thủ; ảnh được upload vào mục Media.
3. Phần nào block hiện có chưa làm được (ví dụ video YouTube, form đăng ký, slider kéo trước/sau), Claude soạn nội
   dung ticket và xin bạn **mã Jira**. Có mã rồi thì Claude lên spec và plan cho bạn duyệt.
4. Trong lúc chờ, Claude làm hết những phần làm được, rồi dừng lại.
5. Claude kiểm tra lại page: còn ở Draft, nút nào chưa có đích, ảnh nào lỗi, bản điện thoại 360 px có bị cuộn ngang,
   chữ quá nhỏ hay nút quá bé không. Có ảnh chụp để so với trang đối thủ.
6. Claude báo tên page và link mở editor để bạn tự kiểm tra.

Khi phần code còn thiếu đã lên production, gõ lệnh dưới đây để Claude làm nốt (`<job>` có trong báo cáo):

```
/store-page-from-link resume <job>
```

### Cập nhật skill

Có bản mới thì `cd D:\source-theme`, `git pull`, rồi chạy lại `node tools/install-shopdy-skill.js D:\shopdy-promax`
(hoặc `node D:\source-theme\tools\install-shopdy-skill.js` khi đang ở trong shopdy-promax). Lệnh in ra
phiên bản cũ → mới và các file đã thêm, sửa, xoá. Nó giữ nguyên `_work/` (các page đang làm, phiên đăng nhập) và `.env`
(tài khoản) trên máy bạn.

Muốn sửa skill thì sửa trong `shopdy-skills/store-page-from-link/` của repo này, tăng `version` trong `SKILL.md`,
commit, rồi cài lại. Đừng sửa bản đã cài trong shopdy-promax: lần cài sau sẽ ghi đè mất.

### Quy tắc skill luôn giữ

- **Page luôn ở Draft.** Claude không bấm Publish; script chặn luôn mọi lệnh publish gửi lên server. Bạn kiểm tra
  xong thì tự bấm Publish.
- **Không sửa code Shopdy khi chưa có mã ticket Jira và bạn chưa duyệt spec + plan.** Khi đã đủ cả hai, Claude làm
  theo quy trình của team (branch `SHOPDY-items/SHOPDY-<số>`, GATE, PR), được lưu trong
  `references/shopdy-dev-workflow.md` của skill. Claude không merge, không deploy.
- Chỉ đụng vào page của lần chạy đó, không sửa hay xoá page, sản phẩm, store khác.
- Chỉ tải đúng link được gửi. Không mua hàng, không gửi form, không đăng nhập trên trang đối thủ.

### Kết quả và lưu ý

- Page ở trạng thái Draft trên Shopdy, kèm link editor.
- Ticket nháp nằm trong `_work/<job>/tickets/`, báo cáo trong `_work/<job>/report.md` (cả hai trong thư mục skill
  đã cài ở shopdy-promax).
- Page Draft chưa mở được ngoài storefront, nên chỉ xem được trong editor (nút PC / Mobile). Sau khi Publish, hãy mở
  page thật trên điện thoại để kiểm tra lần cuối.
- Chữ và ảnh đang là của đối thủ: thay bằng nội dung của bạn trước khi Publish.
- Nếu page chưa gắn sản phẩm, các nút mua chưa có đích. Gắn sản phẩm trong Page settings trước khi Publish.

## Xem thêm

[CLAUDE.md](CLAUDE.md) (quy tắc chung) · [base-theme/README.md](base-theme/README.md) (base có gì) ·
[new-theme](.claude/skills/new-theme/SKILL.md) và [theme-from-link](.claude/skills/theme-from-link/SKILL.md) (quy tắc
đầy đủ) · [store-page-from-link](shopdy-skills/store-page-from-link/SKILL.md) (quy tắc đầy đủ, quy trình code
Shopdy trong `references/`).
