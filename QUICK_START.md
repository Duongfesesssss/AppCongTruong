# ⚡ QUICK START

## 🔄 **ĐỒNG BỘ DATABASE LOCAL ↔ PRODUCTION**

**Mới:** Bây giờ bạn có thể đồng bộ database giữa local và production!

```bash
# Trên Windows
sync-database-to-atlas.bat

# Trên Linux/Mac
./sync-database-to-atlas.sh
```

**Sau khi chạy:**
- ✅ Local và Production dùng CÙNG database trên MongoDB Atlas
- ✅ Mọi thay đổi sync real-time
- ✅ Đăng nhập production với tài khoản local

📖 **Chi tiết:** `DATABASE_SYNC_GUIDE.md`

---

## 🚀 **DEPLOY PRODUCTION - 10 phút**

## 🎯 **TRÊN MÁY ẢO (VPS)**

### Bước 1: Clone code

```bash
ssh root@your-vps-ip

mkdir -p /var/www/appcongtruong
cd /var/www/appcongtruong
git clone https://github.com/Duongfesesssss/AppCongTruong.git .
```

### Bước 2: Tạo .env

```bash
cp .env.example .env
nano .env
```

Điền thông tin:

```env
MONGO_ROOT_PASSWORD=MatKhauManh123!
JWT_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_SECRET=$(openssl rand -base64 32)

# AWS S3 (từ AWS Console)
AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXX
AWS_SECRET_ACCESS_KEY=abc123XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
AWS_REGION=ap-southeast-1
AWS_S3_BUCKET=appcongtruong-uploads

# API URL (thay your-vps-ip)
NUXT_PUBLIC_API_BASE=http://your-vps-ip:4000
```

Lưu: `Ctrl+X`, `Y`, `Enter`

### Bước 3: Chạy Docker

```bash
# Build & Start
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### Bước 4: Seed admin user

```bash
docker-compose exec server sh
node dist/auth/seed-admin.js
exit
```

### Bước 5: Truy cập

```
Frontend: http://your-vps-ip
Backend: http://your-vps-ip:4000
```

---

## 🔧 **TRƯỚC KHI DEPLOY - SETUP AWS S3**

### 1. Tạo S3 Bucket

AWS Console → S3 → Create bucket:

- **Name**: `appcongtruong-uploads`
- **Region**: `ap-southeast-1` (Singapore)
- **Block public access**: ✅ ENABLE ALL
- Click **Create bucket**

### 2. Tạo IAM User

AWS Console → IAM → Users → Add user:

- **Username**: `appcongtruong-s3`
- **Permissions**: Attach policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::appcongtruong-uploads",
        "arn:aws:s3:::appcongtruong-uploads/*"
      ]
    }
  ]
}
```

- **Create Access Key** → Copy `Access Key ID` và `Secret Access Key`

---

## 🛠️ **COMMANDS THƯỜNG DÙNG**

```bash
# View logs
docker-compose logs -f server

# Restart
docker-compose restart

# Stop
docker-compose down

# Update code
git pull origin main
docker-compose down
docker-compose build
docker-compose up -d

# Backup MongoDB
docker-compose exec mongodb mongodump --username admin --password yourpass --out /data/backup
```

---

## ❓ **TROUBLESHOOTING**

### Container không start

```bash
docker-compose logs server
# Check .env file
cat .env
```

### Không connect được MongoDB

```bash
docker-compose logs mongodb
docker-compose restart mongodb
```

### S3 upload fail

```bash
# Check AWS credentials
docker-compose exec server sh
node -e "console.log(process.env.AWS_ACCESS_KEY_ID)"
```

---

📖 **Chi tiết đầy đủ**: Xem `DEPLOYMENT_GUIDE.md`
