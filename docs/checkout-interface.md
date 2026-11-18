# Giỏ hàng, đặt dịch vụ, thanh toán và hóa đơn

Các trang `/giohang`, `/dathang`, `/thanhtoan`, `/hoadon/:id` dùng chung thành phần trong `src/component/Checkout`. API giỏ hàng và đơn hàng hiện có được giữ nguyên; giá cuối cùng vẫn được backend tính lại.

- Giỏ hàng hỗ trợ chọn từng dòng, thay đổi số lượng từ 1 đến 999, xóa dịch vụ và giữ các tùy chọn đã chọn. Chỉ cập nhật giao diện sau khi API chấp nhận thay đổi. Lỗi tải có nút thử lại, không bị hiển thị thành giỏ trống.
- Thông tin tổ chức có nhãn, lỗi dưới trường và bản nháp trong `sessionStorage`. Bản nháp phân biệt tài khoản; khách chưa đăng nhập được giữ dữ liệu qua bước đăng nhập rồi quay về thanh toán. Khi tải lại trang, bản nháp mới hơn được ưu tiên nếu cùng danh sách dịch vụ.
- Ngày tổ chức tuân theo quy tắc backend: cách hôm nay ít nhất ba ngày. Không tự khẳng định còn lịch; backend kiểm tra khi tạo đơn.
- Nút gửi có khóa chống gửi nhiều lần khi đang xử lý. Chỉ chuyển đến hóa đơn sau khi API xác nhận mã đơn hợp lệ. Nếu dọn giỏ thất bại sau khi tạo đơn thành công, khách vẫn được dẫn đến hóa đơn với thông báo kiểm tra giỏ, tránh đặt lại do hiểu nhầm.
- Chỉ các dòng đã mua bị xóa hoặc trừ số lượng khỏi giỏ; đặt ngay từ trang sản phẩm không xóa giỏ.
- Hóa đơn tải dữ liệu theo ID từ API có xác thực, dùng tổng tiền và trạng thái thanh toán thực. Không có chữ ký dựng sẵn, chính sách vận chuyển tự thêm hoặc dòng dịch vụ giả. Bản nhỏ gọn giới hạn theo chiều cao màn hình; điện thoại có tổng tiền cố định ở cuối. Khi in, nội dung dài được mở và trải trang đầy đủ.

## Chuyển khoản

Không sử dụng tài khoản ngân hàng ghi sẵn trong mã nguồn. Cấu hình thông tin đã được doanh nghiệp xác nhận trong `.env`, sau đó khởi động lại frontend:

```dotenv
REACT_APP_BANK_BIN=
REACT_APP_BANK_NAME=
REACT_APP_BANK_ACCOUNT=
REACT_APP_BANK_ACCOUNT_NAME=
REACT_APP_BANK_DEPOSIT_PERCENT=
```

BIN, số tài khoản và tên chủ tài khoản cần có để bật QR; tên ngân hàng là nhãn hiển thị tùy chọn. Khi chọn chuyển khoản ở bước thanh toán, giao diện hiện QR và tiền cọc theo tổng tạm tính. Hóa đơn sử dụng tổng tiền đã được backend xác nhận và mã đơn làm nội dung chuyển khoản. Tỷ lệ đặt cọc là tùy chọn, từ 1 đến 100; để trống thì không tự gán tỷ lệ hay số tiền phải chuyển. Những trường này là thông tin thanh toán công khai, không phải khóa bí mật.

Theo yêu cầu của chủ website, cấu hình cục bộ đang dùng TPBank, tài khoản `24122004079`, chủ tài khoản `VAN PHU DAI`, cọc **20%**. BIN TPBank `970423` đối chiếu từ [danh sách ngân hàng của VietQR](https://api.vietqr.io/v2/banks). Thông tin chủ tài khoản do người dùng cung cấp; ứng dụng không có API xác minh chủ sở hữu tài khoản.

Ảnh QR tạo ngay trong trình duyệt bằng thư viện `qrcode` có sẵn, không tải ảnh qua dịch vụ ngoài. Bộ tạo payload nằm tại `src/utils/vietqr.js`: thông tin ngân hàng, số tiền VND, nội dung chuyển khoản và CRC-16/CCITT. Các [mẫu kiểm tra độc lập](https://github.com/subiz/vietqr/blob/master/vietqr_test.go) được dùng để kiểm tra định dạng và checksum. Có nút tải ảnh PNG trên trang thanh toán và hóa đơn. Kiểm tra riêng bằng `npm test -- --watchAll=false --runInBand --runTestsByPath src/utils/vietqr.test.js`.

Khi chưa cấu hình, khách vẫn có thể chọn phương thức chuyển khoản và gửi yêu cầu; giao diện hướng dẫn đợi thông tin từ nhân viên. Chọn phương thức hoặc mở QR không cập nhật trạng thái đã thanh toán. Việc đối soát vẫn theo quy trình của hệ thống hiện tại.

## Kiểm tra

Build frontend bằng `npm run build`. Kiểm tra trình duyệt dùng API mô phỏng: chọn dịch vụ, lượng không hợp lệ và API từ chối, chọn một phần giỏ, dữ liệu qua các bước, giữ bản nháp sau tải lại, lỗi biểu mẫu, tạo đơn thất bại/thành công, khóa nút gửi, chỉ dọn dòng đã mua, hóa đơn tải lại/lỗi/in và màn hình 320–1440px. Các kiểm tra không tạo đơn thật hoặc chuyển tiền thật.
