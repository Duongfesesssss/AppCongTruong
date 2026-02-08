# Hướng dẫn đồng bộ Database Production với MongoDB Atlas

## Vấn đề hiện tại

- **Local:** MongoDB Atlas → database `AppCongTruong`
- **Production:** MongoDB Docker container → database `appcongtruong` (riêng biệt)
- **Kết quả:** Data KHÔNG đồng bộ giữa local và production

## Giải pháp

Chuyển production sang dùng MongoDB Atlas để cả local và production dùng CÙNG 1 database.

## Cách chạy

### Trên Windows:

```bash
cd d:\appcongtruong
sync-database-to-atlas.bat
```

### Trên Linux/Mac:

```bash
cd /path/to/appcongtruong
chmod +x sync-database-to-atlas.sh
./sync-database-to-atlas.sh
```

## Script sẽ làm gì?

1. ✅ Kiểm tra kết nối SSH tới server
2. 💾 Backup file `.env` hiện tại trên server
3. ✏️ Cập nhật `MONGO_URI` từ Docker MongoDB → Atlas
4. 🔄 Restart production container
5. 📋 Hiển thị logs để xác nhận thành công

## Yêu cầu

- SSH key đã được config để kết nối tới `ubuntu@13.63.19.184`
- Server production đang chạy

## Kiểm tra kết nối SSH

```bash
ssh ubuntu@13.63.19.184 "echo OK"
```

Nếu không kết nối được, cần:

1. **Thêm SSH key:**
   ```bash
   ssh-copy-id ubuntu@13.63.19.184
   ```

2. **Hoặc dùng password:**
   ```bash
   ssh ubuntu@13.63.19.184
   # Nhập password khi được hỏi
   ```

## Sau khi chạy script

### Test production:

```bash
curl http://13.63.19.184/health
```

Hoặc mở browser: http://13.63.19.184

### Đăng nhập production:

Bây giờ có thể dùng tài khoản từ local:
- Email: `daoduongg3@gmail.com`
- Password: `Abc@123`

### Rollback nếu có vấn đề:

SSH vào server:
```bash
ssh ubuntu@13.63.19.184
cd ~/appcongtruong
cp .env.backup.* .env
sudo docker-compose down && sudo docker-compose up -d server
```

## MongoDB Atlas Connection

Cả local và production sẽ dùng:
- **Cluster:** `my-project-3.oai5wu6.mongodb.net`
- **Database:** `AppCongTruong`
- **User:** `MyNewDB`

## Lưu ý bảo mật

⚠️ **Quan trọng:** File script chứa MongoDB password. Đừng commit lên git!

File `.gitignore` đã có:
```
sync-database-to-atlas.*
```

## Data migration

Script KHÔNG tự động migrate data từ MongoDB Docker sang Atlas.

Nếu cần migrate data hiện có:

```bash
# 1. Export từ MongoDB Docker
ssh ubuntu@13.63.19.184
sudo docker-compose exec mongodb mongodump --uri="mongodb://admin:password@localhost:27017/appcongtruong?authSource=admin" --out=/tmp/backup

# 2. Import vào Atlas
mongorestore --uri="mongodb+srv://MyNewDB:password@cluster.mongodb.net/AppCongTruong" /tmp/backup/appcongtruong
```

## Troubleshooting

### Script báo "Cannot connect to server"

Kiểm tra:
- Server có đang chạy? `ping 13.63.19.184`
- SSH config đúng? `ssh ubuntu@13.63.19.184`

### Production không start sau khi chạy script

Xem logs:
```bash
ssh ubuntu@13.63.19.184
cd ~/appcongtruong
sudo docker-compose logs --tail=50 server
```

### Atlas connection refused

Kiểm tra MongoDB Atlas:
- Network Access: Cho phép IP `0.0.0.0/0` (hoặc IP server)
- Database User: `MyNewDB` có quyền đọc/ghi

## Hỗ trợ

Nếu có vấn đề, liên hệ với team hoặc kiểm tra:
- Server logs: `sudo docker-compose logs server`
- MongoDB Atlas dashboard: https://cloud.mongodb.com
