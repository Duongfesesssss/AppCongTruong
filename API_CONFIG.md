# Cấu hình API URL cho Local và Production

## Tổng quan

Ứng dụng sử dụng biến môi trường `NUXT_PUBLIC_API_BASE` để xác định URL của API server.

## Local Development (Máy local)

Khi chạy dev trên máy local:
- Client chạy: `http://localhost:3000`
- Server chạy: `http://localhost:4000`
- API base URL: `http://localhost:4000/api`

### Cấu hình

File `client/.env` đã được cấu hình sẵn:
```
NUXT_PUBLIC_API_BASE=http://localhost:4000/api
```

### Chạy local

```bash
# Terminal 1 - Chạy server
cd server
npm run dev

# Terminal 2 - Chạy client
cd client
npm run dev
```

Client sẽ tự động kết nối tới server local qua `http://localhost:4000/api`

## Production Deployment (Triển khai)

Khi deploy lên server qua Docker:
- Nginx proxy ở port 80
- Client ở `http://13.63.19.184/`
- Server ở `http://13.63.19.184/api`
- API base URL: `/api` (relative URL, nginx sẽ proxy)

### Cấu hình

Trên server production, file `.env` cần có:
```
NUXT_PUBLIC_API_BASE=/api
```

### Deploy steps

```bash
# 1. Trên server, tạo/cập nhật file .env
nano .env

# Thêm dòng này:
NUXT_PUBLIC_API_BASE=/api

# 2. Rebuild và restart containers
sudo docker-compose down
sudo docker-compose build --no-cache client
sudo docker-compose up -d
```

## Kiểm tra cấu hình

Để biết API base URL đang dùng:

**Local:**
```bash
cd client
cat .env
```

**Production (trên server):**
```bash
cat .env | grep NUXT_PUBLIC_API_BASE
```

## Cơ chế hoạt động

1. Nuxt đọc `NUXT_PUBLIC_API_BASE` từ file `.env` khi build hoặc dev
2. Giá trị này được inject vào `useRuntimeConfig().public.apiBase`
3. Composable `useApi()` sử dụng `apiBase` để tạo request URL
4. Mọi API call đều có dạng: `${apiBase}${path}`

Ví dụ:
- Local: `http://localhost:4000/api/auth/me`
- Production: `/api/auth/me` → nginx proxy to `http://server:4000/api/auth/me`
