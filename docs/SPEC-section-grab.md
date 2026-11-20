# Spec: `section-grab` — lấy đúng một phần của trang đối thủ

Trạng thái: **xong ngày 2026-11-20**. Bản đồ: [SPEC-theme-token-cost.md](SPEC-theme-token-cost.md).

## Mục tiêu
"Làm giống phần … của đối thủ" là loại yêu cầu tốn nhất (phiên A: 26%; phiên 06a2156e: 65%). Thay việc tải cả trang và
đọc ảnh bằng một lệnh lấy đúng phần đó, tóm tắt bằng chữ.

## Lệnh
```
node tools/section-grab.js <url> --heading "<chữ tiêu đề>" [--out <dir>] [--desktop-only] [--headed]
                                 [--to-theme <theme> --prefix <xx>] [--refresh] [--max-mb 300]
```
- Tìm phần tử nhỏ nhất chứa chữ tiêu đề (không phân biệt hoa thường), rồi phần bao nó (`section`, `.shopify-section`…,
  nếu không có thì tổ tiên lớn nhất dưới 60% chiều cao trang).
- Ghi `section.md` (đọc trước: chữ + font + màu + cỡ trên điện thoại, nút, số item mỗi hàng, cuộn ngang, tương tác:
  slider, mũi tên, chấm, accordion, thư viện carousel, video autoplay), `desktop.png`, `mobile.png`, `outline.html`
  (DOM rút gọn), `section.json`, `media/` (ảnh + video của phần đó, poster cạnh video, HLS Shopify → MP4), `media.json`,
  `assets.json` (cho `media-library.js --from`).
- Dùng chung `lib/page.js openPage` (429 chờ một lần, `--headed` để người dùng tự qua bot check) và
  `lib/fetch-media.js` với media-grab.
- Exit 0 · 1 sai cách dùng / thư mục đã có · 2 bot check · 3 không thấy tiêu đề (in danh sách tiêu đề của trang).

## Kiểm thử (`tools/test/section-grab.test.js`, fixture `tools/fixtures/media-grab/section.html`)
Đúng phần "See them in motion": chữ, font, nút, 3 item, cuộn ngang có snap (điện thoại), 3 video + poster, không lấy ảnh
phần khác, chỉ mở đúng một trang; tiêu đề không có → exit 3 kèm danh sách.

## Đo thật
tammycharm.com "Don't just take our word for it": 34 giây, 6 video (52 MB), font / màu / cỡ trên điện thoại / 6 item, 1
trên màn hình điện thoại — khoảng 1,5k token để đọc `section.md`.
