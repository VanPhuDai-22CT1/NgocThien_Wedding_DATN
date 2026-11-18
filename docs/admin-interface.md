# Giao diện quản trị Ngọc Thiện Wedding

Các trang quản trị đã đăng nhập dùng chung `src/component/AdminShell`, được bọc tại `src/router.js`. Thanh điều hướng, tìm chức năng, giao diện sáng/tối và menu điện thoại được quản lý tại đây; không thêm thanh bên riêng vào từng trang.

- Nhấn Ctrl/Cmd + K để tìm chức năng; dùng phím mũi tên, Enter và Escape để thao tác.
- Đơn hàng có tìm kiếm theo mã đơn, khách hàng, số điện thoại, dịch vụ và lọc trạng thái. Trạng thái đơn và thanh toán vẫn độc lập: xác nhận đơn không xác nhận đã nhận tiền.
- Khách hàng có tìm kiếm và lọc vai trò; biểu mẫu sửa có nhãn, quản lý focus và đóng bằng Escape khi không đang lưu.
- Biểu mẫu thêm dịch vụ thu gọn mặc định, tự mở khi chỉnh sửa.
- Menu điện thoại đóng sau khi chuyển trang, khi nhấn bên ngoài hoặc Escape. Bảng dữ liệu có vùng cuộn ngang riêng khi cần.
- Giao diện sáng/tối giữ lựa chọn qua localStorage hiện có, đồng bộ với biểu đồ.
- Bốn tổng số người dùng, dịch vụ, đơn hàng và lịch tư vấn lấy cùng API `getDashboardStats` từ cơ sở dữ liệu; không dùng độ dài danh sách tư vấn trên giao diện. Tổng tài khoản bao gồm khách hàng và quản trị viên, có dòng phân loại bên dưới. Tự cập nhật mỗi phút, khi quay lại cửa sổ hoặc nhấn “Làm mới số liệu”. Khi chưa tải được, hiển thị dấu gạch thay vì số 0; nếu làm mới lỗi thì giữ số liệu lần thành công gần nhất kèm thông báo.

Các API, phân quyền, thao tác lưu, lịch tư vấn và luồng xử lý đơn hiện có được giữ lại. CSS cũ được giới hạn trong `.nt-admin-body` và lớp `nt-admin-legacy`; giao diện chung dùng biến `--na-*` trong `AdminShell/style.scss` để tránh ảnh hưởng trang khách hàng.

## Kiểm tra

Đã kiểm tra bản production với Playwright, dữ liệu API giả lập, trên 10 đường dẫn quản trị ở chiều rộng 1440, 768 và 390px. Các kiểm tra gồm điều hướng chung, tìm nhanh bằng bàn phím, lọc đơn và khách hàng, xác nhận đơn vẫn chưa thanh toán, mở biểu mẫu sửa khách hàng, thu/mở biểu mẫu dịch vụ, lưu chế độ tối, menu điện thoại, tràn ngang và lỗi console. Không gửi tin nhắn hay thay đổi dữ liệu thật trong kiểm tra tự động.

Lệnh build: `npm run build`. Khởi động quản trị: `npm run start:admin`, truy cập `http://localhost:3001/dashboard` bằng tài khoản quản trị hiện có.

Kiểm tra tổng số backend: `node backend/scripts/dashboard-count-test.js` sau khi build backend. Kiểm tra này dùng model stub, bao gồm tổng số lớn, dữ liệu trống, tổng đơn khớp cùng danh sách dùng để tính trạng thái và đơn chưa thanh toán không phát sinh doanh thu. Đã đối chiếu thêm số liệu trên giao diện đang chạy với cơ sở dữ liệu thực bằng truy vấn chỉ đọc.

`src/utils/dashboardStats.js` đọc được tổng số dạng số hoặc chuỗi số nguyên. Khi backend cũ chưa trả `total_consultations`, lấy tổng thực từ API lịch tư vấn hiện có; không tự điền 0. Lỗi hết phiên có nút đăng nhập lại; lỗi phân quyền, dữ liệu và kết nối có thông báo riêng. Kiểm tra tương thích: `npm test -- --watchAll=false --runInBand --runTestsByPath src/utils/dashboardStats.test.js`.

## Quản lý đơn hàng

Trang `/qldonhang` dùng danh sách từng dòng có thể mở chi tiết, thay cho thẻ lớn. Tìm kiếm kết hợp trạng thái đơn và thanh toán, các nút lọc nhanh và phân trang 10 đơn/trang. Trên điện thoại, mỗi dòng tự chia lại các thông tin thay vì cuộn bảng ngang. Chi tiết hiển thị thông tin khách, ngày tổ chức, địa điểm, các dịch vụ và thao tác lưu/xóa. API `getOrders` cung cấp thêm các trường đã lưu: `order_code`, `email`, `event_date`, `delivery_address`.

Lỗi tải lại giữ danh sách cũ và có nút thử lại; chưa tải được không hiển thị tổng số bằng 0. Cập nhật trạng thái vẫn độc lập với thanh toán. Đã kiểm tra phân trang, lọc kết hợp, xác nhận đơn chưa thanh toán, hủy/xác nhận xóa bằng API giả lập và đối chiếu giao diện thực bằng truy vấn chỉ đọc. `src/utils/notify.test.js` kiểm tra xác nhận không bị callback đóng thông báo chuyển thành hủy.

## Trang tổng quan

Đường dẫn gốc admin chuyển về `/dashboard` sau đăng nhập để luôn dùng khung điều hướng chung. `dashboard/overview.scss` bố trí bốn tổng số chính, hai thẻ tài chính, biểu đồ doanh thu 12 tháng và biểu đồ vòng trạng thái đơn. Lịch tư vấn và ba yêu cầu mới nằm trước báo cáo CSV; gợi ý dịch vụ có thể thu gọn. Thông báo lịch sắp tới nằm trong nội dung, thay cho nhiều toast che màn hình. Nhãn “Đơn chọn chuyển khoản” phân biệt số đơn chọn phương thức với số tiền đã thanh toán.

Đã kiểm tra chuyển tháng, chọn ngày, trạng thái lỗi lịch, các liên kết nhanh, tải CSV, làm mới số liệu, gợi ý thu/mở, chế độ tối và các chiều rộng 1440/1024/768/390px bằng API giả lập. Kiểm tra dữ liệu thực chỉ đọc, không tạo hoặc sửa đơn hàng.

Biểu đồ doanh thu hỗ trợ xem 6/12 tháng, tổng trong kỳ và bình quân trên các tháng API trả về. Trục dọc dùng triệu đồng, tooltip giữ số tiền đầy đủ. Bảng trạng thái cạnh biểu đồ vòng hiển thị cả số đơn và tỷ lệ trên tổng đơn; dữ liệu trống hiển thị 0%, không tạo tỷ lệ hay xu hướng giả. Đã kiểm tra chuyển kỳ, phép tổng/bình quân, tỷ lệ, dữ liệu trống và bố cục sáng/tối trên máy tính và điện thoại.

## Tải trang và môi trường phát triển

`config-overrides.js` tách cache Webpack của hai máy chủ phát triển vào `node_modules/.cache/webpack/admin` và `user`, tránh hai trình biên dịch ghi chung cache. Sau khi đổi cấu hình Webpack cần khởi động lại máy chủ tương ứng. `npm run start:admin` chạy ở cổng 3001; `npm run start:user` ở 3000.

Mỗi nội dung admin có `Suspense` riêng trong khung chung: menu và thanh đầu trang vẫn hiển thị khi chờ chunk JavaScript của trang mới. Đã kiểm tra với chunk bị trì hoãn có chủ đích. Khi rà lỗi tải trang, từng ghi nhận máy chủ phát triển đứng ở “Compiling…” và HTML/bundle đều quá 8 giây, trong khi API vẫn phản hồi. Sau khởi động lại với cache riêng, đo cục bộ dashboard sẵn sàng số liệu khoảng 583ms, nội dung các mục khác khoảng 38–376ms; API GET khoảng 12–80ms. Đây là số đo trên máy hiện tại, không phải cam kết tốc độ cho môi trường triển khai. Kiểm tra không gửi tin nhắn hay thay đổi dữ liệu đơn hàng.

## Lịch tư vấn khách hàng

`/notification` hiển thị danh sách 8 yêu cầu/trang, tìm không dấu theo tên/điện thoại/email/dịch vụ/mã, kết hợp trạng thái, chưa đọc và khoảng ngày tổ chức (múi giờ Việt Nam). Sắp xếp mới nhất hoặc theo ngày tổ chức. Tổng số không bị đổi khi lọc; lỗi tải lại giữ dữ liệu cũ. Chỉ làm mới nền mỗi 30 giây khi tab đang hiển thị, không chồng yêu cầu tải.

Liên kết `?consultationId=ID` mở bảng chi tiết bên phải ngay cả khi yêu cầu nằm ngoài trang đang xem. Bảng có điện thoại/email, nhu cầu, ghi chú nguyên dòng và chọn trạng thái. Mở chi tiết đánh dấu đã đọc, không tự xác nhận tư vấn. Hủy cần xác nhận ngay trong bảng; hỗ trợ Escape, khóa cuộn nền và giữ focus bàn phím. API cũ được sửa để giữ nguyên `pending`/`confirmed`, thay vì đổi hai trạng thái này thành `processing`.

Kiểm tra backend: `node backend/scripts/consultation-status-test.js` sau build. Kiểm tra trình duyệt dùng dữ liệu giả lập cho tìm kiếm/lọc kết hợp/phân trang/liên kết chi tiết/đánh dấu đã đọc/lưu lỗi và thử lại/xác nhận hủy/focus/điện thoại/chế độ tối. Kiểm tra dữ liệu thực chỉ đọc, chặn POST để không đánh dấu hoặc thay đổi lịch của khách thật trong lúc kiểm tra.

## Biểu mẫu dịch vụ

Phần thêm/chỉnh sửa trong `/qlsanpham` chia thông tin, mô tả, hình ảnh và dấu nổi bật. Giá nhập theo triệu đồng, có dòng quy đổi VNĐ và hỗ trợ phần lẻ (ví dụ 2.25 = 2.250.000đ); số tiền trong danh sách hiển thị chính xác thay vì làm tròn một chữ số. Giá 0 được ghi rõ là liên hệ báo giá.

Ảnh có chọn tệp/kéo thả, tối đa 20 ảnh và 10MB/ảnh ở giao diện. Có phóng to, thay, xóa và chọn ảnh đại diện bằng thứ tự ảnh đầu tiên; dùng lại multipart `images[]` và `slots_order` hiện có. Object URL được thu hồi khi thay/xóa/đặt lại/rời trang. Giữ nguyên số lượng và `service_details` khi sửa hoặc bật/tắt nổi bật, tránh xóa cấu hình tùy chọn đã lưu.

Lỗi hiển thị ngay tại tên/giá; lỗi kết nối giữ biểu mẫu và ảnh để thử lại, khóa gửi trùng. Kiểm tra thêm/sửa và multipart bằng API giả lập, bao gồm giá chính xác, thứ tự ảnh, cấu hình cũ, lỗi/thử lại, điện thoại và chế độ tối. Kiểm tra biểu mẫu với sản phẩm thực chỉ đọc và không gửi thao tác lưu.

## Quản lý người dùng

`/qlnguoidung` dùng danh sách 10 tài khoản/trang, tìm không dấu theo tên/username/email/điện thoại/mã kết hợp lọc vai trò và trạng thái. Các tổng số phân biệt tài khoản, khách hàng, quản trị viên và tạm khóa. Giá trị `is_active` dạng false/0/chuỗi 0 được hiển thị đúng; “Đang mở” là trạng thái tài khoản, không khẳng định người dùng online.

Chỉnh sửa tập trung thông tin cá nhân, vai trò và mở/khóa vào một biểu mẫu. Đổi mật khẩu thu gọn, có hiện/ẩn, yêu cầu tối thiểu 6 ký tự theo API; để trống không thay mật khẩu. Email/tên trùng và lỗi nhập hiển thị tại trường; lỗi mạng giữ nội dung, khóa gửi trùng. Giữ API `updateUserInfo` và `deleteUser` hiện có; vai trò được đổi trong biểu mẫu thay cho select trực tiếp trên từng dòng. Xóa có hộp xác nhận và thông tin ảnh hưởng dữ liệu liên quan; tài khoản đang đăng nhập không có thao tác xóa khả dụng. Không thay đổi phân quyền backend.

Đã kiểm tra lọc/phân trang/trạng thái số 0/chỉnh sửa/đổi vai trò/để trống mật khẩu/lỗi và thử lại/hủy hoặc xác nhận xóa/focus bàn phím/điện thoại/chế độ tối bằng API giả lập. Kiểm tra giao diện với tài khoản thực chỉ đọc, chặn POST để không sửa hoặc xóa tài khoản thật.

## Hộp thư khách hàng

`/qltinnhan` và `/chatadmin` dùng giao diện hai khung: danh sách hội thoại có tìm không dấu/lọc chưa đọc bên trái, lịch sử và ô trả lời bên phải. Giữ tông đỏ đô, avatar chữ, phân ngày, giờ gửi và liên kết trong tin nhắn. Chỉ hiển thị “Đã gửi” cho tin đã có trong dữ liệu hệ thống, không tự hiển thị đã xem/online/gọi điện/đính kèm khi backend chưa hỗ trợ.

Bản nháp giữ riêng theo khách trong lần mở trang. Enter gửi, Shift+Enter xuống dòng trên máy tính; điện thoại Enter xuống dòng và gửi bằng nút. Tin gửi lỗi giữ nội dung và có thử lại; khóa gửi trùng. Chuyển khách trong lúc gửi hoặc tải không làm trộn tin nhắn hay xóa bản nháp của khách khác. Khi đọc lịch sử cũ, giữ vị trí cuộn và có nút tin nhắn mới.

Làm mới mỗi 3 giây khi trang đang hiển thị, không chồng GET và không thay lịch sử bằng spinner mỗi lần làm mới. Điện thoại mở hội thoại toàn màn hình với nút quay lại; khi đang xem danh sách không tải/đánh dấu đọc hội thoại ẩn. Danh mục dịch vụ chỉ tải khi mở mục gợi ý; gửi tên/giá tham khảo/liên kết thật qua API tin nhắn hiện có, giá 0 hiển thị liên hệ báo giá và không xóa bản nháp đang soạn.

Backend giữ xuống dòng riêng cho `sendLiveChatMessage`, tiếp tục lọc markup/ký tự điều khiển và giới hạn 2.000 ký tự. Các payload khác giữ cách xử lý cũ. Kiểm tra: `node backend/scripts/chat-text-test.js` sau build. Các kiểm tra gửi/thử lại/chuyển khách/bản nháp/scroll/gợi ý dịch vụ/điện thoại/chế độ tối dùng API giả lập. Kiểm tra với lịch sử thật chặn toàn bộ POST, không gửi tin và không thay cờ đã đọc của khách thật.

## Công cụ gửi sản phẩm nhanh cho nhân viên

Trong hội thoại, nút “Gửi sản phẩm nhanh” mở danh mục có ảnh, giá, tìm kiếm không dấu và lọc danh mục. Có thể gửi ngay hoặc chọn sản phẩm rồi chèn vào bản nháp để bổ sung lời tư vấn. Chèn giữ nội dung cũ và kiểm tra giới hạn 2.000 ký tự; gửi riêng sản phẩm không xóa bản nháp. Người nhận luôn hiển thị ở đầu công cụ; chuyển khách đóng công cụ và giữ đúng người nhận của yêu cầu đang gửi.

“Hay gửi” và “Gần đây” lưu riêng theo mã tài khoản trong localStorage của trình duyệt (`ntw.staff-products.ID`), chỉ lưu mã sản phẩm, không đồng bộ giữa thiết bị. Gần đây chỉ cập nhật sau khi API xác nhận gửi thành công. Giá và đơn vị lấy từ dữ liệu thật; giá chưa có hiển thị “Liên hệ báo giá”. Tin nhận có tên, giá tham khảo và liên kết bấm mở trang chi tiết. Công cụ không thêm vai trò hay thay đổi phân quyền backend.

Kiểm tra tự động gồm tìm/lọc, danh sách riêng theo tài khoản, gửi lỗi/thử lại, đổi người nhận trong lúc gửi, giữ bản nháp, chèn quá giới hạn, tải lại danh mục, đóng khi bấm ngoài và giao diện máy tính/điện thoại/tối. Các thao tác gửi kiểm tra dùng API giả lập, không gửi tin thử cho khách thật. Kiểm tra tiện ích giá/nội dung và liên kết ở phía khách: `src/utils/quickProducts.test.js`, `src/component/chatbot/ChatMessage.test.js`.
