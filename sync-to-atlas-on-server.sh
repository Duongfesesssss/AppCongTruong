#!/bin/bash
# Run this directly on production server via SSH

ATLAS_URI="mongodb+srv://MyNewDB:Dao0948173074%40@my-project-3.oai5wu6.mongodb.net/AppCongTruong?retryWrites=true&w=majority"

echo "🔄 Switching to MongoDB Atlas..."
echo ""

# Backup
echo "💾 Creating backup..."
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)

# Update MONGO_URI
echo "✏️  Updating MONGO_URI..."
sed -i "s|^MONGO_URI=.*|MONGO_URI=$ATLAS_URI|" .env

echo "📋 New MONGO_URI:"
grep MONGO_URI .env | head -1

echo ""
echo "🔄 Restarting server..."
sudo docker-compose down
sudo docker-compose up -d server

echo ""
echo "⏳ Waiting 30s for server to start..."
sleep 30

echo ""
echo "📋 Server logs:"
sudo docker-compose logs --tail=20 server

echo ""
echo "✅ Done! Now using MongoDB Atlas."
echo "Test: curl http://localhost/health"
