# Trang sản phẩm và yêu cầu báo giá

Kiểu chữ: Playfair Display cho tiêu đề và Be Vietnam Pro cho nội dung, điều khiển, giá và biểu mẫu. Các bản WOFF2 Latin/tiếng Việt được lưu trong `src/assets/fonts`, nạp bằng `font-display: swap`; giấy phép OFL nằm cùng thư mục. Trang không cần kết nối Google Fonts khi sử dụng.

## Sử dụng

- Danh mục hiện có: http://localhost:3000/sanpham
- Tám mẫu minh họa: http://localhost:3000/sanpham?source=demo
- Chi tiết mẫu: http://localhost:3000/chitietsanpham/mau-gia-tien-hong

Trang danh sách dùng API hiện có. Tìm kiếm không phân biệt dấu, danh mục, tông màu và khoảng giá hoạt động kết hợp. Các lựa chọn được lưu trong URL, có sắp xếp, phân trang 9 mục/trang, xóa bộ lọc, trạng thái tải và thử lại khi lỗi.

Chi tiết có ảnh chính, ảnh thu nhỏ, phóng to, tùy chọn tông màu/số lượng, nội dung gói, chi phí có thể phát sinh, điều kiện thuê và các mục cùng danh mục. Giữ chức năng thêm giỏ hàng cho dịch vụ có giá và đánh giá từ khách đã hoàn tất đơn.

Danh mục thực tế chưa có các trường riêng cho danh mục chuẩn, đơn vị, tông màu và điều kiện từng gói. Giao diện đọc dữ liệu sẵn có, suy luận nhóm/đơn vị từ tên và ghi rõ đây là thông tin tham khảo; những điều khoản chưa có dữ liệu được yêu cầu xác nhận qua báo giá. Không tự khẳng định còn lịch.

## Dữ liệu minh họa

Tám mẫu nằm trong `src/utils/weddingCatalog.js`. Ảnh tái sử dụng từ thư viện hiện có của dự án và được sao chép sang `public/images/wedding-samples/` để xem được khi API không chạy. Ảnh chỉ minh họa phong cách; mẫu và giá không phải cam kết cung cấp.

Mẫu minh họa có nhãn ở danh sách, thẻ, chi tiết và biểu mẫu. Nút gửi tạo bản xem trước ngay trên giao diện, không gọi API và không lưu yêu cầu thật. Không tự thay dữ liệu thực bằng dữ liệu mẫu khi kết nối thất bại.

## Tiếp nhận yêu cầu thật

`POST /api/consultations/quote` nhận `product_id`, `intent`, `name`, `phone`, `event_date`, `location`, `scale`, `color`, `note`.

- Kiểm tra sản phẩm có trong cơ sở dữ liệu, trường bắt buộc, giới hạn độ dài, số điện thoại Việt Nam và ngày hợp lệ từ hôm nay theo giờ Việt Nam.
- Có thể gửi với tư cách khách; nếu có token đăng nhập thì xác minh và gắn yêu cầu với tài khoản đó.
- Lưu vào bảng `consultations` sẵn có, trạng thái `pending`, chưa đọc. Địa điểm, quy mô, tông màu và mong muốn được ghi vào `note`; quản trị xem trong mục Lịch tư vấn.
- Không tạo đơn hàng, thu tiền hoặc xác nhận lịch. Không gửi email/SMS từ luồng này.
- Khi gửi lỗi, giữ nội dung để thử lại. Lỗi trường hiển thị ngay dưới trường đó.

## Kiểm chứng

- Frontend và backend build thành công.
- Bộ kiểm tra API: 66 kiểm tra đạt, gồm xác thực, các luồng cũ và API báo giá mới.
- Chrome: tìm kiếm kết hợp bộ lọc, sắp xếp, danh sách trống, xóa lọc, phân trang, URL chi tiết, ảnh thu nhỏ/phóng to, đóng hộp thoại bằng Escape, lỗi trường, demo không gọi API, yêu cầu thật được lưu pending, lỗi kết nối vẫn giữ nội dung và gửi lại thành công.
- Kiểm tra menu, bộ lọc và biểu mẫu ở 390 × 844; kiểm tra không tràn ngang ở desktop/mobile.
- Các yêu cầu thử được dọn theo ID riêng của lượt kiểm thử.
