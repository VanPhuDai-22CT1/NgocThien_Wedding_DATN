# NgocThien Wedding

Website đặt dịch vụ cưới gồm giao diện khách hàng, giao diện quản trị và API backend.

**Trang hướng dẫn:** [Mở giao diện HTML](docs/index.html). Để xuất bản thành website công khai, vào **Settings → Pages → Build and deployment**, chọn **GitHub Actions**, rồi chạy lại workflow **Publish user guide**.

**Bản văn bản:** [docs/USER_GUIDE.md](docs/USER_GUIDE.md) — dành cho khách hàng và quản trị viên.

## Công nghệ

- Frontend: React, React Router, SCSS
- Backend: Node.js, Express, TypeScript, Sequelize
- Cơ sở dữ liệu: MySQL

## Chạy local hoặc GitHub Codespaces

Yêu cầu: Node.js 24, npm và MySQL 8 trở lên.

1. Tạo file cấu hình từ mẫu:

   ```sh
   cp .env.example .env
   cp backend/.env.sample backend/.env
   ```

2. Điền thông tin MySQL vào `.env` (và SMTP nếu cần gửi email OTP). Không commit các file `.env` hoặc thông tin đăng nhập thật.

3. Cài dependencies và khởi tạo cơ sở dữ liệu:

   ```sh
   npm install
   npm install --prefix backend
   npm --prefix backend run init-db
   ```

4. Mở hai terminal để chạy frontend khách hàng, quản trị và backend:

   ```sh
   npm run start:user
   ```

   ```sh
   npm run start:admin
   ```

   ```sh
   npm --prefix backend run dev
   ```

Frontend khách hàng chạy ở `http://localhost:3000`, trang quản trị ở `http://localhost:3001`, API ở `http://localhost:5000`.

## Các nhánh

- `main`: nhánh chính
- `user`: giao diện và chức năng khách hàng
- `admin`: giao diện và chức năng quản trị
- `submission-2026-06-20`: nhánh snapshot nộp mã nguồn hiện tại

## Build

```sh
npm run build
npm --prefix backend run build
```

## Kiểm tra chức năng

Sau khi MySQL và backend đang chạy:

```sh
npm --prefix backend test
```

Bộ kiểm thử dùng dữ liệu thử riêng và dọn theo ID của lượt chạy. Xem [báo cáo sửa lỗi và kiểm thử](docs/QA_REPORT.md) để biết phạm vi đã kiểm tra và các phần cần xác minh với dịch vụ bên ngoài.

## GitHub Actions

Workflow CI chạy hai job độc lập trên Node.js 24. Backend khởi tạo MySQL riêng trong runner, build TypeScript, khởi chạy API, đợi `/health` rồi chạy `npm --prefix backend test`. Cấu hình và khóa ký chỉ dùng cho môi trường thử; không cần secrets hay kết nối tới dữ liệu thật. Frontend chạy kiểm thử và build độc lập với kết quả backend.

Workflow `Publish user guide` xuất bản thư mục `docs` lên GitHub Pages. Kho mới cần bật Pages với nguồn **GitHub Actions** một lần trong Settings; token của workflow không tự bật Pages cho kho chưa cấu hình.

## Cấu hình

Các mẫu cấu hình nằm trong `.env.example` và `backend/.env.sample`. Hãy thay `JWT_SECRET`, thông tin cơ sở dữ liệu và SMTP bằng giá trị riêng của môi trường trước khi triển khai. Không sử dụng cấu hình mặc định cho môi trường production.
