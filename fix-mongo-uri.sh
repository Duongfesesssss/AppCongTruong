#!/bin/bash
# Fix MongoDB URI on production server

echo "🔧 Fixing MongoDB URI..."

# Correct Atlas URI (properly escaped)
cat > .env.tmp << 'ENVEOF'
NODE_ENV=production
PORT=4000
MONGO_URI=mongodb+srv://MyNewDB:Dao0948173074%40@my-project-3.oai5wu6.mongodb.net/AppCongTruong?retryWrites=true&w=majority
JWT_SECRET=Vm42te1kQZPLriQ1a0nyPK48bSEEiGWfBd79NnVzlaI=
JWT_REFRESH_SECRET=sV9iM/9B8P3DNc1phRhYzUksF+tkKANoy2//XFXZ4xc=
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL=7d
UPLOAD_MAX_IMAGE_MB=20
UPLOAD_MAX_PDF_MB=100
AWS_ACCESS_KEY_ID=not_used
AWS_SECRET_ACCESS_KEY=not_used
AWS_REGION=ap-southeast-1
AWS_S3_BUCKET=appcongtruong-uploads
STORAGE_TYPE=local
NUXT_PUBLIC_API_BASE=/api
ENVEOF

echo "💾 Backing up old .env..."
cp .env .env.broken.backup

echo "✏️  Replacing with correct .env..."
mv .env.tmp .env

echo "📋 New .env content:"
cat .env

echo ""
echo "🔄 Restarting containers..."
sudo docker-compose down
sudo docker-compose up -d

echo ""
echo "⏳ Waiting 30s..."
sleep 30

echo ""
echo "📋 Server logs:"
sudo docker-compose logs --tail=20 server

echo ""
echo "✅ Done!"
