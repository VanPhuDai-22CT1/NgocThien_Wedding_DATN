# NgocThien Wedding

Website đặt dịch vụ cưới gồm giao diện khách hàng, giao diện quản trị và API backend.

**Cẩm nang trực tuyến:** [Mở trang hướng dẫn](https://vanphudai-22ct1.github.io/NgocThien_Wedding_DATN/).

**Bản văn bản:** [docs/USER_GUIDE.md](docs/USER_GUIDE.md) — dành cho khách hàng và quản trị viên.

## Công nghệ

- Frontend: React, React Router, SCSS
- Backend: Node.js, Express, TypeScript, Sequelize
- Cơ sở dữ liệu: MySQL

## Chạy local hoặc GitHub Codespaces

Yêu cầu: Node.js 18 trở lên, npm và MySQL 8 trở lên.

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

## Cấu hình

Các mẫu cấu hình nằm trong `.env.example` và `backend/.env.sample`. Hãy thay `JWT_SECRET`, thông tin cơ sở dữ liệu và SMTP bằng giá trị riêng của môi trường trước khi triển khai. Không sử dụng cấu hình mặc định cho môi trường production.
