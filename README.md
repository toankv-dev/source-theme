# source-theme

Repo này dựng theme cửa hàng cho Shopdy. Mọi theme đều đi từ `base-theme/`, kết quả là một file `.zip` để upload lên
admin.

## Cài đặt (một lần)

```
node tools/link-agent-skills.js
cd tools && npm install && npx playwright install chromium
```

Lệnh đầu nối bộ [agent-skills](https://github.com/addyosmani/agent-skills) (cần clone sẵn ở `D:\agent-skills`,
hoặc truyền đường dẫn khác làm tham số) vào `.claude/`: các skill kỹ thuật và lệnh `/spec`, `/plan`, `/build`,
`/test`, `/review`, `/code-simplify`, `/ship`. Khi `git pull` agent-skills có thêm hoặc bớt skill, chạy lại lệnh này.

Mở Claude Code ở thư mục gốc của repo.

## Dùng skill nào?

- **Có link trang gốc** → `/theme-from-link`
- **Chỉ có ảnh chụp** → `/new-theme`
- **Sửa một theme đã có** → `/theme-edit`, xem [mục bên dưới](#theme-edit-sửa-theme-đã-có)
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
- Mã nguồn theme trong `themes/<tên>/`, kèm **design map** của theme trong `_map/` (xem [bên dưới](#design-map-của-theme)).
- Báo cáo tiếng Việt: phần đã khớp, phần còn khác, và **các ô ảnh / video để trống mà chủ shop cần tự upload**.

Xem thử trên máy: `node tools/preview-server.js themes/<tên> --port 8091` rồi mở `http://localhost:8091`.

## Giống nhau

- Dựng từ `base-theme`, giữ nguyên giỏ hàng, checkout, pixel.
- Font và màu đúng y bản gốc.
- Ảnh sản phẩm (gallery) là dữ liệu của sản phẩm, không gắn cứng vào theme.
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
| Ảnh, video | Để ô trống, chủ shop tự upload | Tải hết ảnh, video của trang gốc vào theme làm mặc định; chủ shop thay sau |
| Khi site chặn bot | Không ảnh hưởng, vì không cần vào site | Không tải được thì Claude xin ảnh chụp và chuyển sang `/new-theme` |

**Tóm lại:** có link thì dùng `/theme-from-link`, vì theme giống bản gốc hơn và bạn đỡ việc hơn. Chỉ dùng `/new-theme`
khi không có link, hoặc link bị chặn không tải được.

## `/theme-edit`: sửa theme đã có

Mở Claude Code ở `D:\source-theme`, mỗi yêu cầu một phiên (gõ `/clear` trước):

```
/theme-edit lunara---vesnacharm: footer đổi sang màu chủ đạo, chữ trắng; nút Add to cart bo tròn hơn.
/theme-edit lunara---vesnacharm: thêm phần video giống phần "See them in motion" ở https://doi-thu.com/products/x
/theme-edit lunara---vesnacharm: làm sao để đưa phần Questions lên trước You Will Also Love?
```

Claude tự phân loại yêu cầu:

| Loại | Ví dụ | Claude làm gì |
| --- | --- | --- |
| Sửa code theme | màu, bố cục, mobile, thêm chức năng | Đọc design map, sửa đúng chỗ, kiểm tra 1440 + 360 bằng một lệnh, tạo zip |
| Giống một phần của link khác | "làm giống phần … ở link này" | Chỉ lấy đúng phần đó (chữ, font, màu, bố cục, ảnh, video), dựng lại, so với bản gốc |
| Bạn tự làm được trong admin | giảm giá, đổi thứ tự section, chọn template, duyệt review | Hướng dẫn từng bước, không sửa code |
| Cần sửa cả shopdy | logic giá, giỏ hàng, API | Dừng lại, trình bày phần shopdy làm / theme làm để bạn duyệt, làm phần theme, viết spec + nháp ticket Jira cho shopdy |

Xong mỗi yêu cầu: zip mới trong `dist/`, design map được cập nhật, một dòng ghi vào `themes/<tên>/_map/edit-log.md`.

## Dùng ít token hơn

### Mỗi yêu cầu một phiên

Mỗi lần trả lời, Claude đọc lại cả cuộc trò chuyện, nên phiên càng dài càng tốn. Phiên sửa theme vesnacharm có 38 yêu
cầu trong một ngày; nếu tách mỗi yêu cầu thành một phiên riêng thì đỡ khoảng **60%**.

- Xong một việc thì gõ `/clear` rồi mới đưa yêu cầu tiếp theo.
- Sửa theme thì mở Claude Code ở `D:\source-theme`, không mở ở shopdy-promax.

### Design map của theme

Mỗi theme có một "bản đồ" ngắn ở `themes/<tên>/_map/design-map.md`: trang nào gồm những section nào, mỗi phần nằm ở
file nào, màu và font chỉnh ở setting nào. Claude đọc bản đồ này thay vì đọc lại code mỗi lần sửa.

- Bạn không phải làm gì: theme mới tạo là có map, và Claude cập nhật map sau mỗi lần sửa.
- Map không nằm trong file zip.
- Xem chi tiết một phần: `node tools/theme-map.js themes/<tên> --part <tên section>`.
- Kiểm tra map còn đúng không: `node tools/theme-map.js themes/<tên> --check` (`pack.js` cũng báo khi map đã cũ).

Script dựng hoặc sửa theme để trong `themes/<tên>/_src/` (có lên git). `_work/` chỉ chứa dữ liệu tải về và không lên
git.

### Tải ảnh, video từ link đối thủ

```
node tools/media-grab.js https://doi-thu.com/products/san-pham
```

Lệnh này tải hết ảnh và video của đúng trang đó vào `downloads/<site>-<sản phẩm>/`. File được chia sẵn theo thư mục:
ảnh sản phẩm, ảnh biến thể, ảnh trong mô tả, ảnh các phần khác, ảnh review, icon, logo. Danh sách đầy đủ nằm trong
`media.json`.

- Đưa thẳng vào theme: thêm `--to-theme themes/<tên> --prefix <2 chữ cái>`.
- Chỉ lấy vài nhóm: `--only gallery,variants`. Muốn nhanh hơn: `--desktop-only`.
- Trang bị chặn:
  - báo **HTTP 429**: site đang giới hạn máy bạn, lệnh tự chờ rồi thử lại một lần; vẫn bị thì đợi vài phút rồi chạy lại.
  - báo **bot check**: chạy lại với `--headed`. Một cửa sổ trình duyệt mở ra, **bạn tự bấm qua bước xác minh**, lệnh
    chờ tối đa 3 phút rồi tải tiếp. Lệnh không bao giờ tự lách bot check.

### Lấy đúng một phần của trang đối thủ

```
node tools/section-grab.js https://doi-thu.com/products/x --heading "See them in motion"
```

Lệnh tìm phần có tiêu đề đó và ghi lại `section.md`: chữ, font, màu, cỡ chữ trên điện thoại, nút, số item mỗi hàng,
cuộn ngang, slider. Kèm theo là ảnh chụp phần đó ở desktop và điện thoại, cùng ảnh và video của riêng phần đó. Không
thấy tiêu đề thì lệnh liệt kê các tiêu đề có trên trang.

### Kiểm tra một chỗ vừa sửa

```
node tools/edit-check.js themes/<tên> --page /product --selector "#addToCart"
```

Một lệnh đo phần tử ở 1440 và 360 (cỡ, font, màu, viền), báo cuộn ngang, nút quá nhỏ, lỗi console, rồi chạy pack.
`--ref <link gốc>` để chỉ ra chỗ khác bản gốc. Server xem thử được giữ chạy, sửa xong không cần bật lại.

### Đo token đã dùng

```
node tools/transcript-cost.js --project D:\source-theme --latest --by-request --fresh
```

Lệnh in ra mỗi yêu cầu tốn bao nhiêu, và số token sẽ tiết kiệm được nếu tách mỗi yêu cầu thành một phiên. Muốn tìm
phiên theo tên thì dùng `--title "<tên phiên>"` thay cho `--latest`.

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

1. Tải đúng trang đó về: ảnh, video, HTML/CSS/JS, ảnh chụp bản desktop và bản điện thoại. Script tóm tắt trang
   thành `digest.md` và 2 ảnh tổng có đánh số từng phần. Nếu trang đối thủ cũng dựng bằng Shopdy, script tách luôn
   từng block của nó.
2. Mở trình duyệt, đăng nhập Shopdy, tạo page mới ở `/store-pages`, rồi dựng lại từng phần bằng các block có sẵn.
   Script chọn layout và soạn sẵn plan dựng page; Claude chỉ xem lại những chỗ script đánh dấu. Chữ và ảnh lấy từ
   trang đối thủ; ảnh được upload vào mục Media.
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
phiên bản cũ → mới và các file đã thêm, sửa, xoá. Nó giữ nguyên trên máy bạn:
- `_work/`: các page đang làm và phiên đăng nhập;
- `catalog/`: catalog block;
- `.env`: tài khoản.

### Catalog block (tự động, không phải làm gì)

Catalog block là bảng ghi mọi block của trình tạo page Shopdy: các ô, loại ô, lựa chọn, giới hạn. Claude đọc bảng
này thay cho việc đọc code Shopdy, nên đỡ tốn token. Bảng nằm ở
`D:\shopdy-promax\.claude\skills\store-page-from-link\catalog\`, thư mục mà git của shopdy bỏ qua.

- **Lần đầu:** `create` tự quét editor và tạo bảng, mất khoảng 30 giây.
- **Các lần sau:** dùng lại bảng. Nếu thấy editor khác bảng (ô mới, đổi tên, đổi giới hạn, block mới), skill tự ghi
  lại đúng phần đó và thêm một dòng vào `catalog/changes.log`. Shopdy đổi hằng ngày cũng không cần dựng lại hay pull.
- **Muốn quét lại từ đầu:** `python -I .claude/skills/store-page-from-link/scripts/shopdy.py catalog --job <job> --refresh`.

Những điều editor không tự cho biết (block tự vẽ gì, luật của HTML block, block nào hợp với phần nào của trang đối
thủ) nằm trong `references/block-notes.md` của skill. Muốn bổ sung thì sửa ở repo này rồi phát hành cùng bản skill
kế tiếp. Claude ghi những điều mới gặp vào `_work/<job>/catalog-gaps.md`.

Đo token của một lần chạy: `node tools/transcript-cost.js --project D:\shopdy-promax --latest`.

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
