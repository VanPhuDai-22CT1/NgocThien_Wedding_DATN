# Kiểm tra chức năng ngày 14/11/2026

## Chạy dự án

Khởi động MySQL trước, sau đó chạy từ thư mục gốc:

```sh
npm run start:all
```

- Khách hàng: http://localhost:3000
- Quản trị: http://localhost:3001
- API: http://localhost:5000/health

Script chạy frontend đặt cổng và chế độ ứng dụng riêng, hoạt động trên Windows và Linux. Backend đọc `backend/.env` ở cả chế độ TypeScript và bản build. Kết nối MySQL qua IPv4 khi DB_HOST là localhost. Khi khởi động, backend bổ sung các cột thiếu trong orders cho tên khách, ngày cưới và ghi chú, không ghi đè các bản ghi cũ.

`init-db` chỉ nhập dữ liệu vào cơ sở dữ liệu rỗng. Nếu đã có bảng, script dừng để tránh các câu DROP TABLE trong file SQL xóa dữ liệu đang dùng.

## Những lỗi đã sửa

- Thống nhất cấu hình API cho đăng nhập, chat, tài khoản, thông báo và khôi phục mật khẩu; dùng proxy `/api` khi không cấu hình URL riêng.
- Lưu số điện thoại, địa chỉ lúc đăng ký; kiểm tra trùng email/tên tài khoản và mật khẩu ở backend.
- Sửa phân trang sản phẩm, đơn hàng, tư vấn và đánh giá; trả lỗi 400 với phân trang không hợp lệ.
- Yêu cầu đăng nhập và kiểm tra quyền sở hữu đơn, hóa đơn, tài khoản, giỏ hàng, lịch tư vấn. Bỏ cơ chế cho phép sửa sản phẩm chỉ dựa vào Origin của trang quản trị.
- Chặn giả mạo tin nhắn quản trị; bảo vệ danh sách phiên chat và dữ liệu quản trị.
- Bổ sung sửa số lượng trong giỏ hàng; giữ các mục chưa đồng bộ nếu chuyển giỏ khách vào tài khoản bị lỗi một phần.
- Lưu tên khách, ngày cưới và ghi chú khi đặt dịch vụ; tạo đơn và chi tiết trong cùng transaction, tính tiền theo giá trong cơ sở dữ liệu.
- Đồng nhất tổng tiền giỏ hàng, thanh toán và hóa đơn theo giá dịch vụ. Bỏ dòng VAT riêng vốn chỉ được cộng ở giỏ hàng, không xuất hiện trong đơn/thanh toán.
- Giữ thông tin đã nhập khi quay lại chỉnh sửa từ bước thanh toán; đọc đúng dữ liệu ngày đã đặt; giới hạn 2 tiệc/ngày ở API tạo đơn.
- Tính chuỗi doanh thu 12 tháng bằng dữ liệu đơn thực tế. Doanh thu chỉ tính đơn đã bàn giao hoặc đã được đánh dấu thanh toán, loại đơn hủy.
- Sửa trạng thái tư vấn, vòng lặp đánh dấu đã đọc, đường dẫn ảnh upload và ảnh thay thế khi ảnh lỗi.
- Khôi phục cuộn tự nhiên trong trang và các vùng cuộn bên trong; bảo vệ điều hướng quản trị; sửa URL chi tiết dịch vụ và định dạng tiền Việt Nam.

## Kiểm chứng

```sh
npm run build
npm --prefix backend run build
npm --prefix backend test
```

- Frontend và backend build thành công; frontend không còn cảnh báo ESLint. Công cụ build vẫn báo dữ liệu Browserslist cũ và một cảnh báo deprecation của Node.
- 62 kiểm tra API thành công, bao gồm đăng ký/đăng nhập, dữ liệu tài khoản, quyền truy cập, phân trang, sản phẩm, giỏ hàng, lưu đơn/hóa đơn, giới hạn lịch, đánh giá, tư vấn, chat và ảnh trang chủ.
- Kiểm thử Chrome: giỏ khách, sửa số lượng, đăng nhập và hợp nhất giỏ, đặt dịch vụ, quay lại chỉnh sửa, hóa đơn, các trang khách hàng và 9 trang quản trị.
- Trang dịch vụ ở kích thước 390 × 844 không bị tràn ngang.
- Tài khoản, sản phẩm và giao dịch dùng để kiểm thử đã được dọn theo ID của riêng lượt kiểm thử.

## Phần chưa xác minh với dịch vụ bên ngoài

- Chưa gửi email OTP thật qua SMTP. Việc có cấu hình SMTP không đảm bảo thông tin xác thực hoặc khả năng gửi thư hợp lệ.
- QR chuyển khoản là hướng dẫn thanh toán; chưa có tích hợp ngân hàng để xác nhận tiền vào tự động. Không có giao dịch ngân hàng thật được thực hiện trong kiểm thử.
- Môi trường trình duyệt trên máy chèn mã Adblock360 vào trang. Lỗi mạng từ mã chèn này có thể làm hiện lớp báo lỗi của webpack khi chạy development. Lượt kiểm thử trình duyệt đã cô lập các yêu cầu đến Adblock360 để đánh giá riêng mã ứng dụng. Nếu gặp lỗi này khi dùng thực tế, cần bỏ lọc/chèn mã cho localhost trong Adblock360.

Kết quả trên xác nhận các luồng đã kiểm tra; không phải cam kết website không còn mọi lỗi trong mọi tình huống.

## Kiểm tra tải trang bổ sung

- Tách mã theo trang bằng React.lazy/Suspense; giao diện khách hàng không tải mã các trang quản trị. Có trạng thái đang tải và nút tải lại khi không tải được tệp trang.
- Ảnh ngoài màn hình được tải khi cuộn tới gần. API dùng chung và đăng nhập có thời gian chờ tối đa 15 giây. Trang dịch vụ hiển thị lỗi và nút thử lại khi API lỗi, thay vì báo danh sách rỗng.
- JavaScript chính của bản build giảm từ khoảng 200,46 kB xuống 82,21 kB gzip.
- Đo development trên Chrome, cửa sổ 1440 × 960, ngữ cảnh mới và đọc tài nguyên sau 1,6 giây: JavaScript trang đăng nhập giảm từ 9720 xuống 2393 KiB; ảnh tải ban đầu trang dịch vụ giảm từ 15248 xuống 5019 KiB. Đây là dung lượng tài nguyên đã giải mã trong lần đo local, không phải cam kết tốc độ trên mạng thực tế.
- Đã kiểm tra chờ tải tệp trang, API dịch vụ trả 503 rồi thử lại thành công, đăng nhập quá thời gian chờ, lỗi tải tệp trang của bản production rồi phục hồi bằng nút tải lại, chuyển trang/quay lại và ảnh tải khi cuộn.
- Chạy lại luồng đặt đơn và 9 trang quản trị thành công sau khi tách mã.
- Lỗi `/sanpham` được báo sau đó có nguyên nhân API cổng 5000 dừng: proxy trả 504. Đã khởi động lại backend ở chế độ nền độc lập, xác nhận API trả 200 với 36 dịch vụ và trang hiển thị bình thường sau tải lại. Khi khởi động lại máy, cần chạy MySQL và `npm run start:all` để mở đủ các dịch vụ.
