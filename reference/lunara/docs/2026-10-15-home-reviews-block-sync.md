# Đặc tả: Đồng bộ khối Review trang chủ với trang chi tiết sản phẩm (PDP) & Ưu tiên Review có ảnh

## 1. Mục tiêu cốt lõi
- Thay thế hoàn toàn khối review Trustpilot cũ trên trang chủ (`templates/index.hbs`) bằng khối review chuẩn `<lu-reviews>` (`sections/reviews.hbs`) giống hệt trang PDP.
- Thu thập review của các sản phẩm trong cửa hàng (`#ms-products`).
- **Ưu tiên hiển thị các review có hình ảnh/photo lên đầu**, tiếp theo là các review chỉ có chữ.
- Giữ nguyên toàn bộ tính năng cao cấp của khối review chuẩn:
  - Masonry grid tự co giãn responsive (4 cột desktop, 3 cột tablet, 2 cột mobile, 1 cột small mobile).
  - Khối tóm tắt điểm trung bình & thanh tiến trình sao (`.summary`): **Chỉ hiển thị trên trang chi tiết sản phẩm (PDP)**, trên trang chủ hoàn toàn bỏ khối này để giao diện tinh gọn, tập trung thẳng vào danh sách review trực quan.
  - Modal xem chi tiết (`viewerShell`) hỗ trợ ảnh phóng to, chữ đầy đủ, nút đóng `×` hình tròn nổi bật, phím Esc, nút Prev/Next và cử chỉ vuốt cảm ứng trên thiết bị di động.

## 2. Luồng dữ liệu & Logic nghiệp vụ
1. **Handlebars (`templates/index.hbs` & `sections/reviews.hbs`)**:
   - `templates/index.hbs`: Thay thế khối Trustpilot cũ bằng:
     ```handlebars
     {{#unless (eq settings.show_home_reviews false)}}
     <div class="lu-home-reviews">
       {{> reviews is_home=true}}
     </div>
     {{/unless}}
     ```
   - `sections/reviews.hbs`:
     - Nhận biến context `is_home`: gắn `data-home="true"` vào `<lu-reviews>`.
     - Tiêu đề: Sử dụng `settings.home_reviews_heading` nếu có (mặc định "Join Our Happy Customers." hoặc "What our customers say").
     - **Bỏ khối tóm tắt điểm (`.summary`) trên trang chủ**: Đặt điều kiện `{{#unless is_home}}...{{/unless}}` bọc toàn bộ thẻ `.summary`, đồng thời thêm CSS rule `:host([data-home]) .summary { display: none !important }` và `:host([data-home]) h2 { margin-bottom: 28px }` (mobile: `18px`) để khoảng cách từ tiêu đề tới danh sách review luôn chuẩn đẹp. Khối `.summary` chỉ xuất hiện trên trang chi tiết sản phẩm (PDP).
     - Ẩn nút và modal "Write a review" trên trang chủ (`{{#unless is_home}}...{{/unless}}`), chỉ kích hoạt trên PDP khi có `product.id`.

2. **JavaScript (`lunara-clean/assets/js/theme.js` & `_build/src/lu_theme.js`)**:
   - Trong `luReviewsOne(host)`:
     - Nhận diện `isHome = host.hasAttribute('data-home') || !CFG.productId`.
     - Nếu `isHome`:
       - Đọc danh sách sản phẩm từ `#ms-products`.
       - Lấy ID sản phẩm gọi API review theo batch qua endpoint storefront.
       - Gom và loại bỏ trùng lặp (`seen[name + '|' + content]`).
       - Phân loại:
         - `withImg = all.filter(r => !!(r.photo || r.image || (r.media && r.media.length)))`
         - `noImg = all.filter(r => !(r.photo || r.image || (r.media && r.media.length)))`
       - Ghép danh sách ưu tiên: `allHomeReviews = withImg.concat(noImg)`.
       - Render số lượng ban đầu `STEP = 12` vào lưới masonry `columns()`.
       - An toàn kiểm tra phần tử `.summary` (nếu không tồn tại trên trang chủ thì bỏ qua việc gán text vào DOM).
       - Khi bấm nút `moreBtn`: tải tiếp các review từ `allHomeReviews`, cập nhật lại trạng thái nút.
   - Loại bỏ code Trustpilot cũ trong `luHome()`.

## 3. Tech Stack liên quan
- Handlebars Template engine (`.hbs`)
- Web Components / Shadow DOM với CSS responsive
- Vanilla JavaScript ES5+ tương thích mọi trình duyệt

## 4. Edge-case (Input cụ thể → Output mong đợi)
- **Store chưa có review nào** (`all.length === 0`): Khối `.lu-home-reviews` tự động được ẩn (`hidden = true`) để không xuất hiện vùng trống lỗi.
- **Review từ API dùng field `photo` thay vì `image`**: Logic `photo = r.photo || r.image` nhận diện chính xác và vẫn xếp vào nhóm có ảnh hàng đầu.
- **Có nhiều review có ảnh**: Tất cả review có ảnh được xếp lên đầu lưới 4 cột / 2 cột, tạo ấn tượng thị giác (social proof) mạnh mẽ nhất cho khách ghé trang chủ.
- **Bấm vào review trên mobile**: Mở `reviewDialog`, ảnh và nội dung cuộn mượt mà, bấm nút `×` hoặc vuốt ngang để xem review khác / đóng modal.

## 5. Giả định đã dùng
- Trang chủ gom review từ tối đa 10 sản phẩm đầu tiên trong `#ms-products` để tối ưu thời gian tải trang và số lượng request HTTP.
- Khối `.summary` và nút "Write a review" được ẩn trên trang chủ vì trang chủ đóng vai trò social proof tổng quan, người dùng sẽ viết review và xem bảng phân bổ chi tiết tại trang sản phẩm cụ thể.
