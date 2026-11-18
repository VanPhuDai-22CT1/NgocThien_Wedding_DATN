# Cấu hình tùy chọn dịch vụ

Trang chi tiết dùng API `/api/products/:id`, giỏ hàng `/api/cart`, đơn hàng `/api/orders` và biểu mẫu `/api/consultations/quote` hiện có.

Trường `products.service_details` hỗ trợ nội dung văn bản cũ hoặc chuỗi JSON sau. Các giá dưới đây **chỉ minh họa cấu trúc**, không phải giá kinh doanh và không được tự động thêm vào dữ liệu:

```json
{
  "unit": "gói",
  "colors": ["Đỏ truyền thống", "Vàng champagne"],
  "packages": [
    { "id": "standard", "name": "Tiêu chuẩn", "price": 3500000, "unit": "gói" },
    { "id": "custom", "name": "Thiết kế theo khảo sát", "price": 0, "unit": "gói" }
  ],
  "shortDescription": "Mô tả ngắn của dịch vụ.",
  "included": ["Các hạng mục đã bao gồm"],
  "excluded": ["Các khoản có thể phát sinh"],
  "terms": "Chính sách thuê, vận chuyển, lắp đặt và thu hồi."
}
```

- Chỉ hiển thị chọn gói khi có `packages`. Giá lấy từ gói được chọn; không có gói thì dùng `products.price`. Giá bằng 0, thiếu hoặc không hợp lệ chuyển sang yêu cầu báo giá.
- `colors` là những màu có thể yêu cầu, không tự cộng thêm chi phí màu sắc.
- Máy chủ tính lại giá từ sản phẩm khi thêm giỏ và khi tạo đơn, bỏ qua giá do trình duyệt gửi.
- `shopping_carts.selection` và `order_items.selection` lưu gói, màu, ngày tổ chức, địa điểm, ghi chú và đơn vị. Chỉ gộp các dòng giỏ có cùng sản phẩm và cùng toàn bộ thông tin lựa chọn.
- `ensureSchema` tự thêm các cột và thay chỉ mục giỏ hàng lúc khởi động, giữ nguyên các dòng hiện có.
- Chính sách đặt hàng sẵn có yêu cầu ngày tổ chức cách hiện tại ít nhất 2 ngày. Yêu cầu báo giá cho phép từ hôm nay. Đơn và yêu cầu mới ở trạng thái chờ, chưa xác nhận lịch phục vụ.

Kiểm tra tích hợp: chạy backend, sau đó `cd backend` và `npm test`. Bộ kiểm tra tạo dữ liệu riêng và xóa đúng dữ liệu của lượt kiểm tra trong khối `finally`.
