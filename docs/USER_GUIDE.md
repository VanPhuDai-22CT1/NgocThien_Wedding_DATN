# Hướng dẫn sử dụng NgocThien Wedding

Tài liệu này hướng dẫn hai nhóm người dùng: khách hàng đặt dịch vụ cưới và nhân viên quản trị website. Giao diện có thể khác đôi chút tùy dữ liệu và cấu hình của từng môi trường.

## 1. Bắt đầu sử dụng

### Mở website

Khi chạy local theo hướng dẫn trong README:

- Website khách hàng: `http://localhost:3000`
- Trang quản trị: `http://localhost:3001`
- API backend: `http://localhost:5000`

Trong GitHub Codespaces, mở tab **Ports** và dùng URL Codespaces cấp cho cổng 3000 hoặc 3001. Cần khởi động backend và MySQL để các thao tác đọc, ghi dữ liệu hoạt động.

### Tạo tài khoản khách hàng

1. Mở trang khách hàng, chọn **Đăng nhập** rồi chọn **Đăng ký** (hoặc mở `/dangky`).
2. Nhập tên người dùng, email hợp lệ, mật khẩu, xác nhận mật khẩu, số điện thoại và địa chỉ.
3. Mật khẩu cần tối thiểu 6 ký tự; hai ô mật khẩu phải trùng nhau.
4. Gửi biểu mẫu. Khi đăng ký thành công, website chuyển về trang đăng nhập.

Đăng ký thông thường tạo tài khoản khách hàng. Để vào trang quản trị cần tài khoản có quyền `admin` được cấp bởi người quản lý hệ thống. Không có tài khoản/mật khẩu quản trị mặc định được công bố trong tài liệu này.

### Đăng nhập và khôi phục mật khẩu

1. Nhập email/tên đăng nhập và mật khẩu tại trang **Đăng nhập**.
2. Nếu quên mật khẩu, chọn **Quên mật khẩu**, nhập email và làm theo hướng dẫn xác minh OTP.
3. Nhập OTP còn hiệu lực, đặt mật khẩu mới rồi đăng nhập lại.

Việc gửi OTP cần backend được cấu hình SMTP. Nếu email không đến, kiểm tra thư rác và nhờ người vận hành kiểm tra cấu hình SMTP của backend.

## 2. Hướng dẫn dành cho khách hàng

### Tìm và xem dịch vụ

1. Tại trang chủ, xem dịch vụ nổi bật, ảnh giới thiệu và các lối tắt theo danh mục.
2. Mở **Dịch vụ** để xem danh sách; dùng ô tìm kiếm hoặc danh mục để thu hẹp kết quả.
3. Chọn một thẻ dịch vụ để mở trang chi tiết. Kiểm tra mô tả, hình ảnh, giá và thông tin liên quan.
4. Chọn số lượng nếu có, sau đó nhấn **Thêm vào giỏ hàng**. Bạn có thể tiếp tục xem dịch vụ khác hoặc mở giỏ hàng để rà soát.

### Quản lý giỏ hàng

1. Mở **Gói đã chọn/Giỏ hàng** từ thanh điều hướng.
2. Kiểm tra từng dịch vụ, số lượng và tổng tiền tạm tính.
3. Điều chỉnh số lượng hoặc bỏ dịch vụ không còn cần.
4. Khi đã sẵn sàng, chọn tiếp tục đặt dịch vụ.

Hãy đăng nhập trước khi thanh toán để lưu đơn vào tài khoản và xem lại lịch sử đặt dịch vụ.

### Gửi thông tin đặt dịch vụ

1. Điền họ tên, số điện thoại và ngày cưới dự kiến. Email, địa điểm tổ chức và ghi chú có thể dùng để bổ sung yêu cầu.
2. Ngày tổ chức phải cách ngày hiện tại ít nhất 2 ngày.
3. Website kiểm tra số lịch đã ghi nhận cho ngày đó; giao diện báo khi ngày đã đủ suất. Nếu ngày không còn chỗ, chọn ngày khác.
4. Kiểm tra giỏ hàng và thông tin liên hệ trước khi chuyển sang bước thanh toán.

Nếu cần đổi dữ liệu, quay lại bước trước và chỉnh sửa trước khi xác nhận đơn.

### Chọn hình thức thanh toán

Ở bước thanh toán, kiểm tra lại thông tin đặt dịch vụ và chọn một phương thức:

- **Thanh toán trực tiếp**: tổng đơn được thanh toán khi gặp nhân viên để tư vấn/chốt đơn.
- **Chuyển khoản**: website hiển thị mã QR và thông tin chuyển khoản để thanh toán tiền cọc 10% giá trị đơn; phần còn lại thanh toán sau.

Đọc lại số tiền và nội dung chuyển khoản trên màn hình/ngân hàng trước khi xác nhận. Sau khi gửi đơn thành công, website mở trang hóa đơn để xem mã đơn, thông tin và trạng thái hiện tại.

### Theo dõi đơn hàng và lịch tư vấn

- Mở **Đơn hàng** khi đã đăng nhập để xem các đơn thuộc tài khoản và trạng thái xử lý.
- Mở **Thông báo** để xem lịch tư vấn/đặt tiệc và thông tin trạng thái. Chọn một mục để xem chi tiết; một số lịch ở trạng thái chờ có thể được chỉnh sửa hoặc hủy trong giao diện.
- Nếu vừa đặt đơn nhưng chưa thấy dữ liệu, tải lại trang sau khi kiểm tra kết nối mạng và trạng thái đăng nhập.

## 3. Hướng dẫn dành cho quản trị viên

Đăng nhập bằng tài khoản có quyền quản trị tại `http://localhost:3001` (hoặc cổng admin của môi trường đã triển khai). Nếu tài khoản không có vai trò `admin`, hệ thống sẽ chuyển về khu vực khách hàng. Thanh bên là nơi mở các màn hình quản trị.

### Tổng quan và báo cáo

- Trang **Tổng quan** hiển thị các số liệu về dịch vụ, đơn hàng và lịch sắp tới dựa trên dữ liệu backend.
- Dùng phần xuất dữ liệu để chọn kỳ báo cáo có sẵn (ngày, tháng, quý hoặc năm) rồi tải tệp được tạo về máy.
- Số liệu chỉ đầy đủ khi backend và cơ sở dữ liệu kết nối được.

### Người dùng

1. Mở **Người dùng** để xem và tìm tài khoản.
2. Chọn tài khoản để sửa thông tin hồ sơ, vai trò hoặc trạng thái hoạt động theo quyền được cấp.
3. Xác nhận kỹ trước khi xóa. Không thể xóa tài khoản đang đăng nhập.

Chỉ cấp vai trò quản trị cho người thực sự cần quyền quản lý website.

### Dịch vụ

1. Mở **Dịch vụ**, tìm dịch vụ cần cập nhật hoặc bắt đầu tạo mục mới.
2. Điền tên, mô tả, giá, số lượng/trạng thái kho, danh mục và tùy chọn nổi bật.
3. Chọn ảnh cần thêm hoặc thay, kiểm tra hình xem trước rồi lưu.
4. Mở lại mục đã lưu ở phía khách hàng để kiểm tra nội dung hiển thị.

Giá nhập trên biểu mẫu được chuyển đổi theo đơn vị hiển thị của giao diện; hãy kiểm tra đơn vị tiền và giá cuối trước khi lưu.

### Ảnh trang chủ

Trong **Ảnh trang chủ**, quản trị viên có thể cập nhật ảnh cho các vùng như slider đầu trang, ảnh nền, thư viện và ảnh tư vấn. Chọn ảnh mới, xem trước rồi lưu cấu hình. Các ảnh đã thay có thể xuất hiện trong lịch sử để chọn khôi phục. Sau khi lưu, tải lại trang khách hàng để xác nhận.

### Đơn hàng

1. Mở **Đơn hàng**, tìm đơn theo danh sách và kiểm tra thông tin khách, dịch vụ, giá trị và phương thức thanh toán.
2. Chọn trạng thái phù hợp rồi lưu cập nhật. Các trạng thái chính gồm đang xử lý, đang giao/bàn giao sự kiện, đã bàn giao và đã hủy.
3. Xóa đơn chỉ khi đã kiểm tra kỹ và theo đúng quy trình nội bộ; thao tác xóa cần xác nhận.

Hãy xác minh khoản chuyển khoản thực tế trước khi ghi nhận tình trạng thanh toán qua quy trình vận hành của đơn vị.

### Tin nhắn, lịch tư vấn và lịch làm việc

- **Tin nhắn**: chọn phiên trò chuyện, đọc nội dung của khách, trả lời trong khung hội thoại; có thể chọn dịch vụ để gửi gợi ý khi chức năng đó hiển thị.
- **Lịch tư vấn**: mở một lịch để xem thông tin và cập nhật trạng thái xử lý phù hợp; khách hàng có thể xem trạng thái này trong mục Thông báo.
- **Lịch làm việc**: xem lịch theo tháng, chọn ngày để xem các lịch/sự kiện đã ghi nhận trong ngày.

### Lịch sử hoạt động

Mở **Lịch sử** để tra cứu các hoạt động được hệ thống ghi nhận, lọc theo mã người dùng và xem nhóm hoạt động của từng tài khoản. Dữ liệu được tải lại định kỳ.

## 4. Xử lý sự cố thường gặp

| Hiện tượng | Cách kiểm tra |
|---|---|
| Trang hiển thị nhưng danh sách rỗng hoặc báo lỗi tải dữ liệu | Kiểm tra backend có đang chạy ở cổng cấu hình hay không, MySQL có hoạt động và thông tin DB có đúng không. |
| Không thể đăng nhập hoặc bị chuyển khỏi trang quản trị | Kiểm tra email/mật khẩu và xác nhận tài khoản đã được cấp vai trò `admin` nếu truy cập khu vực quản trị. |
| Không nhận OTP đặt lại mật khẩu | Kiểm tra cấu hình SMTP, thư rác và địa chỉ email đã nhập. |
| Không tải được ảnh vừa chọn | Kiểm tra kích thước/định dạng tệp và quyền ghi của thư mục upload trên máy chủ. |
| Ngày cưới không thể chọn/xác nhận | Chọn ngày cách hiện tại ít nhất 2 ngày và kiểm tra thông báo số lịch còn nhận trong ngày. |
| Giỏ hàng hoặc đơn không cập nhật | Đăng nhập lại, tải mới trang và kiểm tra kết nối API/backend. Không gửi lặp nhiều lần nếu chưa biết đơn đầu đã được ghi nhận chưa. |

## 5. Bảo vệ tài khoản và dữ liệu

- Không chia sẻ mật khẩu, OTP, JWT secret, mật khẩu cơ sở dữ liệu hoặc cấu hình SMTP.
- Không đưa dữ liệu khách hàng thật lên môi trường demo/công khai nếu chưa được phép.
- Sao lưu cơ sở dữ liệu và ảnh tải lên trước khi bảo trì hoặc xóa dữ liệu.
- Dùng nút đăng xuất sau khi thao tác trên máy dùng chung.

