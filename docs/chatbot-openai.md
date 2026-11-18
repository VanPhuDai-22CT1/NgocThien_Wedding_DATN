# Trợ lý Ngọc Thiện Wedding

Chatbot dùng giao diện React hiện có và API Express. Widget có trên các trang khách hàng sử dụng `MasterLayout`; không thêm vào các trang xác thực và quản trị.

## Chế độ hiện tại

Khi chưa có khóa OpenAI, bot hiển thị **Tư vấn cưới hỏi**, dùng bộ hướng dẫn biên soạn sẵn trong `backend/src/services/weddingKnowledge.ts`. Nội dung gồm kế hoạch, ngân sách, nghi lễ, khách mời, thực đơn, trang trí, hoa, trang phục, ảnh/phim, MC, âm nhạc, vận chuyển và sau cưới. Có mẫu lời mời, lời thề, lời cảm ơn, checklist và câu hỏi tiếp theo có thể bấm. Một số câu tiếp nối được nhận biết theo lịch sử; đây chưa phải khả năng hiểu ngôn ngữ linh hoạt của mô hình AI.

Bot đồng thời tìm sản phẩm từ cơ sở dữ liệu, dự toán số bàn dựa trên giá thực đơn và gửi tin nhắn vào hộp thư nhân viên. Câu hỏi kiến thức được gắn nhãn riêng và không kèm thẻ sản phẩm thiếu liên quan. Giá, đơn hàng và lịch phục vụ được xử lý riêng; bot không tự xác nhận còn lịch hoặc thông báo đã ghi dữ liệu khi thất bại. Khi có khóa OpenAI, phần hội thoại sử dụng mô hình để hỗ trợ linh hoạt và chi tiết hơn.

## Bật OpenAI

Điền trực tiếp trong `backend/.env`:

```dotenv
OPENAI_API_KEY=
OPENAI_MODEL=gpt-6-luna
OPENAI_WEB_SEARCH=false
```

Khởi động lại backend sau khi thay đổi. Khóa nằm ở máy chủ, không đặt trong biến `REACT_APP_*`, không đưa vào frontend hay commit. Model có thể thay theo quyền truy cập tài khoản. Khi bật `OPENAI_WEB_SEARCH=true`, cần model hỗ trợ công cụ tìm kiếm; kết quả sẽ có liên kết nguồn ngay trong câu trả lời. Tìm kiếm có mức sử dụng riêng của nhà cung cấp.

Ứng dụng gọi [Responses API](https://developers.openai.com/api/reference/resources/responses/methods/create), lấy câu trả lời từ các mục `output_text`, truyền lịch sử có giới hạn và đặt `store: false`. Cấu trúc tìm kiếm và trích dẫn theo [hướng dẫn web search](https://developers.openai.com/api/docs/guides/tools-web-search). Tham khảo [danh mục model](https://developers.openai.com/api/docs/models/all) khi thay cấu hình. Không gọi OpenAI nếu khóa đang trống.

## Dữ liệu và hội thoại

- Danh mục công khai được truy xuất từ database; không lấy giá do người dùng khai trong câu hỏi làm giá chính thức.
- Câu hỏi đơn hàng được xử lý tại backend theo JWT và chỉ truy vấn tài khoản hiện tại. Phản hồi chứa đơn hàng được đánh dấu riêng và loại khỏi lịch sử tự động gửi cho OpenAI.
- Lịch sử và bản nháp AI nằm trong `sessionStorage`, tách theo tài khoản. Không lưu toàn bộ hội thoại AI vào hộp thư nhân viên.
- Nhắn nhân viên dùng phiên UUID ngẫu nhiên và bảng `live_chat_sessions`, `live_chat_messages` hiện có. Phiên đăng nhập có kiểm tra chủ sở hữu. Phiên khách sử dụng UUID như mã truy cập; không công khai hoặc chia sẻ mã phiên.
- Hộp thư quản trị hiện có vẫn đọc và trả lời được các phiên này. Nội dung chỉ được thông báo đã gửi sau khi API ghi nhận.
- “Cuộc trò chuyện mới” tạo một hội thoại khác, giữ tin nhắn và bản nháp của các hội thoại cũ trong `sessionStorage`, tách theo tài khoản. Thanh bên cho phép mở lại từng hội thoại; trên điện thoại thanh bên là ngăn lịch sử. Dữ liệu này chỉ tồn tại trong phiên trình duyệt, không phải lịch sử đồng bộ trên máy chủ. Tin nhắn nhân viên vẫn lưu bằng API hiện có.
- Mỗi yêu cầu tối đa 4.000 ký tự, lịch sử tối đa 16 lượt và 24.000 ký tự. Bot gửi tối đa 12 lượt gần nhất trong phạm vi 22.000 ký tự và bỏ các lượt thất bại.
- API tư vấn giới hạn 20 yêu cầu/phút theo IP và tài khoản, mỗi nhóm chỉ có một yêu cầu đang xử lý. Câu trả lời OpenAI giới hạn 1.800 token đầu ra, thời gian chờ 25 giây. Ngắt yêu cầu trình duyệt cũng hủy lệnh gọi đang chờ tại máy chủ.
- Nếu OpenAI lỗi, bot chuyển về dữ liệu website và báo rõ chế độ thay thế. Câu hỏi ngoài dữ liệu cục bộ cần kết nối AI; không có cam kết “trả lời chính xác mọi thứ”.

## Kiểm tra

```powershell
cd backend
npm run build
node scripts/assistant-test.js
```

Bộ kiểm tra dùng API/database thật với dữ liệu QA riêng; toàn bộ lệnh gọi OpenAI được mô phỏng, không tốn phí API. Dữ liệu QA được dọn trong `finally`. Kiểm tra trình duyệt được lưu trong `.cache/assistant-ui-check.cjs` cho môi trường phát triển hiện tại.
