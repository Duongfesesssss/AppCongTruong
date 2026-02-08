# 🚀 HƯỚNG DẪN DEPLOY LÊN VPS/CLOUD

## 📋 **YÊU CẦU**

- VPS/Cloud server (Ubuntu 20.04+, Debian 11+, hoặc tương đương)
- Docker & Docker Compose installed
- Git installed
- Domain (optional, cho SSL)
- AWS Account (cho S3 storage)

---

## 🔧 **BƯỚC 1: SETUP AWS S3**

### 1.1. Tạo S3 Bucket

```bash
# Login vào AWS Console -> S3
# Hoặc dùng AWS CLI:
aws s3 mb s3://appcongtruong-uploads --region ap-southeast-1
```

**Settings:**
- **Bucket name**: `appcongtruong-uploads` (hoặc tên khác)
- **Region**: `ap-southeast-1` (Singapore) hoặc gần bạn nhất
- **Block public access**: ✅ ENABLE (giữ private, dùng signed URLs)
- **Versioning**: Optional
- **Encryption**: S3-SSE (default)

### 1.2. Tạo IAM User với quyền S3

```bash
# AWS Console -> IAM -> Users -> Add user
# Hoặc dùng AWS CLI:
aws iam create-user --user-name appcongtruong-s3-user
```

**Permissions Policy:**
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

**Tạo Access Key:**
```bash
aws iam create-access-key --user-name appcongtruong-s3-user
```

Lưu lại:
- `AWS_ACCESS_KEY_ID`: AKIAIOSFODNN7EXAMPLE
- `AWS_SECRET_ACCESS_KEY`: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

---

## 💻 **BƯỚC 2: SETUP VPS**

### 2.1. SSH vào VPS

```bash
ssh root@your-server-ip
# Hoặc:
ssh your-username@your-server-ip
```

### 2.2. Install Docker & Docker Compose

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify
docker --version
docker-compose --version
```

### 2.3. Install Git

```bash
sudo apt install git -y
git --version
```

---

## 📦 **BƯỚC 3: CLONE & SETUP PROJECT**

### 3.1. Clone Repository

```bash
# Tạo folder cho app
sudo mkdir -p /var/www/appcongtruong
cd /var/www/appcongtruong

# Clone code
sudo git clone https://github.com/Duongfesesssss/AppCongTruong.git .

# Set permissions
sudo chown -R $USER:$USER /var/www/appcongtruong
```

### 3.2. Tạo .env File

```bash
# Copy template
cp .env.example .env

# Edit với nano hoặc vim
nano .env
```

**Điền thông tin:**

```bash
# MongoDB Password (generate strong password!)
MONGO_ROOT_PASSWORD=YourStrongMongoPasswordHere123!

# JWT Secrets (generate với: openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_SECRET=$(openssl rand -base64 32)

# AWS S3 Configuration (từ BƯỚC 1)
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_REGION=ap-southeast-1
AWS_S3_BUCKET=appcongtruong-uploads

# API URL
NUXT_PUBLIC_API_BASE=http://your-server-ip:4000
# Hoặc nếu có domain:
# NUXT_PUBLIC_API_BASE=https://api.yourdomain.com
```

Lưu file: `Ctrl+X`, `Y`, `Enter`

### 3.3. Generate Secrets

```bash
# Generate JWT secrets
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env
echo "JWT_REFRESH_SECRET=$(openssl rand -base64 32)" >> .env
```

---

## 🐳 **BƯỚC 4: CHẠY DOCKER**

### 4.1. Build & Start Containers

```bash
# Build images
docker-compose build

# Start containers
docker-compose up -d

# Check status
docker-compose ps
```

Expected output:
```
NAME                          STATUS          PORTS
appcongtruong-mongodb         Up 10 seconds   0.0.0.0:27017->27017/tcp
appcongtruong-server          Up 5 seconds    0.0.0.0:4000->4000/tcp
appcongtruong-client          Up 3 seconds    0.0.0.0:3000->3000/tcp
appcongtruong-nginx           Up 1 second     0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
```

### 4.2. Check Logs

```bash
# All containers
docker-compose logs -f

# Specific container
docker-compose logs -f server
docker-compose logs -f client
docker-compose logs -f mongodb
```

### 4.3. Seed Admin User (First Time Only)

```bash
# SSH vào server container
docker-compose exec server sh

# Run seed script
node dist/auth/seed-admin.js

# Exit
exit
```

---

## 🔥 **BƯỚC 5: CONFIGURE FIREWALL**

```bash
# Allow HTTP (80) and HTTPS (443)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow SSH (if not already allowed)
sudo ufw allow 22/tcp

# Enable firewall
sudo ufw enable
sudo ufw status
```

---

## 🌐 **BƯỚC 6: SETUP DOMAIN & SSL (OPTIONAL)**

### 6.1. Point Domain to VPS

Vào DNS provider (Cloudflare, Namecheap, etc.):

```
Type: A
Name: @
Value: your-server-ip
TTL: Auto

Type: A
Name: api
Value: your-server-ip
TTL: Auto
```

### 6.2. Install Certbot (Let's Encrypt SSL)

```bash
# Install certbot
sudo apt install certbot -y

# Stop nginx temporarily
docker-compose stop nginx

# Get certificate
sudo certbot certonly --standalone -d yourdomain.com -d api.yourdomain.com

# Certificates saved at:
# /etc/letsencrypt/live/yourdomain.com/

# Copy to nginx folder
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/

# Update nginx/nginx.conf - uncomment HTTPS section and replace 'your-domain.com'

# Restart nginx
docker-compose start nginx
```

### 6.3. Auto-renew SSL

```bash
# Add cron job
sudo crontab -e

# Add this line (runs at 3 AM daily):
0 3 * * * certbot renew --quiet --post-hook "docker-compose -f /var/www/appcongtruong/docker-compose.yml restart nginx"
```

---

## ✅ **BƯỚC 7: VERIFY DEPLOYMENT**

### 7.1. Check Services

```bash
# MongoDB
docker-compose exec mongodb mongosh -u admin -p yourpassword

# Backend API
curl http://your-server-ip:4000/api/health
# Should return: {"success": true}

# Frontend
curl http://your-server-ip:3000
# Should return HTML
```

### 7.2. Access App

```
Frontend: http://your-server-ip
# Or: https://yourdomain.com

Backend API: http://your-server-ip:4000
# Or: https://api.yourdomain.com
```

### 7.3. Test Upload to S3

1. Login với admin account
2. Create project > building > floor > discipline > drawing
3. Upload PDF drawing
4. Create task/pin
5. Upload photo

Check AWS S3 Console để verify files đã upload thành công.

---

## 🔄 **UPDATE & MAINTENANCE**

### Update Code

```bash
cd /var/www/appcongtruong

# Pull latest code
git pull origin main

# Rebuild & restart
docker-compose down
docker-compose build
docker-compose up -d
```

### Backup MongoDB

```bash
# Create backup
docker-compose exec mongodb mongodump --username admin --password yourpassword --authenticationDatabase admin --out /data/backup

# Copy to host
docker cp appcongtruong-mongodb:/data/backup ./mongodb-backup-$(date +%Y%m%d)

# Upload to S3 (optional)
tar -czf mongodb-backup.tar.gz mongodb-backup-*
aws s3 cp mongodb-backup.tar.gz s3://your-backup-bucket/
```

### View Logs

```bash
# Tail logs
docker-compose logs -f --tail=100

# Specific service
docker-compose logs server -f

# Save logs to file
docker-compose logs > app.log
```

### Restart Services

```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart server
docker-compose restart client
```

---

## 🐛 **TROUBLESHOOTING**

### Container won't start

```bash
# Check logs
docker-compose logs server

# Common issues:
# - Missing .env file
# - Wrong MongoDB password
# - Port already in use
```

### Can't connect to MongoDB

```bash
# Check MongoDB is running
docker-compose ps mongodb

# Check logs
docker-compose logs mongodb

# Test connection
docker-compose exec mongodb mongosh -u admin -p yourpassword
```

### S3 Upload fails

```bash
# Check AWS credentials in .env
cat .env | grep AWS

# Test AWS credentials
docker-compose exec server sh
node -e "console.log(process.env.AWS_ACCESS_KEY_ID)"

# Check S3 permissions in AWS IAM Console
```

### Out of disk space

```bash
# Check disk usage
df -h

# Clean Docker
docker system prune -a --volumes

# Remove old images
docker-compose down --rmi all
```

---

## 📊 **MONITORING**

### Check Resource Usage

```bash
# Docker stats
docker stats

# Disk usage
df -h

# Memory usage
free -h
```

### Setup Monitoring (Optional)

- **Portainer**: Docker GUI management
- **Grafana + Prometheus**: Metrics & monitoring
- **Uptime Kuma**: Uptime monitoring

---

## 🎯 **PRODUCTION CHECKLIST**

- [ ] S3 bucket created với correct permissions
- [ ] IAM user created với S3 access
- [ ] Strong MongoDB password set
- [ ] JWT secrets generated (32+ characters)
- [ ] .env configured correctly
- [ ] Docker containers running
- [ ] Admin user seeded
- [ ] Firewall configured (only 80, 443, 22 open)
- [ ] Domain pointed to server (if using domain)
- [ ] SSL certificate installed (if using HTTPS)
- [ ] Backup strategy in place
- [ ] Monitoring setup (optional but recommended)

---

## 📞 **SUPPORT**

Issues? Check:
1. Docker logs: `docker-compose logs -f`
2. GitHub issues: https://github.com/Duongfesesssss/AppCongTruong/issues
3. Server logs in `/var/log/`
