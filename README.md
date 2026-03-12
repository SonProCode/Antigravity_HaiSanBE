# Deployment Guide (Production)

## 1. Dành cho Backend (NestJS lên Render - Free Tier)
1. Truy cập [Render Dashboard](https://dashboard.render.com).
2. Chọn **New +** -> **Web Service**.
3. Kết nối với tài khoản GitHub và chọn repository `Antigravity_HaiSanBE`.
4. Cấu hình các thông số cơ bản cho Web Service:
   - **Name**: `haisan-backend` (hoặc tuỳ ý)
   - **Environment**: `Node`
   - **Build Command**: `npm install --include=dev && npx prisma generate && npx prisma migrate deploy && npm run seed && npm run build`
   - **Start Command**: `npm run start:prod`
   - **Instance Type**: Chọn gói **Free** ($0/month)
5. Kéo xuống phần **Environment Variables** (hoặc chọn tab Environment), thêm các biến sau:
   - `NODE_ENV`: `production`
   - `PORT`: `3000`
   - `DATABASE_URL`: `postgresql://neondb_owner:npg_SmIdA37HiBlj@ep-little-recipe-a1pz6dbj-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&pgbouncer=true`
   - `DIRECT_URL`: `postgresql://neondb_owner:npg_SmIdA37HiBlj@ep-little-recipe-a1pz6dbj.ap-southeast-1.aws.neon.tech/neondb?sslmode=require` (Lưu ý: Không dùng `-pooler` cho DIRECT_URL)
   - `REDIS_URL`: Bạn cần một Redis Server (Render Free không có sẵn). Hãy đăng ký một tài khoản miễn phí tại [Upstash](https://upstash.com/) và copy chuỗi `redis://...` dán vào đây.
   - `JWT_SECRET`: Một chuỗi bí mật bất kỳ (VD: `super_secret_jwt_key_2026_haisan`).
   - `FRONTEND_URL`: `https://antigravity-haisanfe.vercel.app` (Lưu ý: Không để dấu `/` ở cuối)
6. **Lưu ý về Database (Neon)**:
   - Nếu bạn dùng URL có `-pooler`, hãy thêm `&pgbouncer=true` vào cuối `DATABASE_URL`.
   - Đối với `DIRECT_URL`, tuyệt đối không dùng URL có `-pooler`.
7. Nhấn **Create Web Service** và chờ Render cài đặt.

## 2. Dành cho Frontend (Next.js lên Vercel)
1. Commit toàn bộ thay đổi và push lên nhánh `main` của repository Frontend.
2. Truy cập [Vercel Dashboard](https://vercel.com/dashboard).
3. Chọn **Add New...** -> **Project**.
4. Import repository `Antigravity_HaiSanFe`.
5. Trong phần **Environment Variables**, thêm:
   - `NEXT_PUBLIC_API_URL`: URL mà Render cung cấp cho Backend (ví dụ: `https://haisan-backend-xxxx.onrender.com/api`).
   - `AUTH_SECRET`: Một chuỗi ngẫu nhiên sinh ra bằng lệnh `openssl rand -base64 32` (Đây là yêu cầu bắt buộc của NextAuth v5).
6. Nhấn **Deploy**.

## 3. Quá trình CI/CD
* Cả 2 kho lưu trữ đều đã được cấu hình `.github/workflows/deploy.yml`. Mỗi khi bạn Push code lên nhánh `main`, Github Actions sẽ tự động kiểm tra xem ứng dụng có Build thành công hay không.
* Vercel và Render cũng sẽ tự động build và deploy lên Production mỗi khi có sự thay đổi trên nhánh `main`.

## 4. Kiểm tra sức khoẻ (Health Check)
Sau khi Backend deploy thành công, truy cập `https://haisan-backend-xxxx.onrender.com/api/health` sẽ thấy `{ "status": "ok" }`.
