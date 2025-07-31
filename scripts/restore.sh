#!/bin/bash

if [ $# -eq 0 ]; then
    echo "❌ Foydalanish: ./restore.sh BACKUP_DATE"
    echo "Masalan: ./restore.sh 20231201_143000"
    exit 1
fi

BACKUP_DATE=$1
BACKUP_DIR="/var/backups/oshxona"
BACKUP_NAME="oshxona_backup_$BACKUP_DATE"

echo "🔄 Oshxona Bot Restore Script"
echo "============================="

# Check if backup exists
if [ ! -f "$BACKUP_DIR/${BACKUP_NAME}_db.gz" ]; then
    echo "❌ Backup fayli topilmadi: $BACKUP_DIR/${BACKUP_NAME}_db.gz"
    exit 1
fi

echo "⚠️  DIQQAT: Bu jarayon mavjud ma'lumotlarni o'chiradi!"
read -p "Davom etishni xohlaysizmi? (yes/no): " -r
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "❌ Restore bekor qilindi"
    exit 1
fi

# Stop services
echo "🛑 Xizmatlar to'xtatilmoqda..."
docker-compose down

# Restore database
echo "🗄️  Database restore..."
gunzip -c $BACKUP_DIR/${BACKUP_NAME}_db.gz | docker-compose exec -T mongo mongorestore --archive --gzip --drop

# Restore files
echo "📁 Files restore..."
tar -xzf $BACKUP_DIR/${BACKUP_NAME}_files.tar.gz

# Restore environment
if [ -f "$BACKUP_DIR/${BACKUP_NAME}_env" ]; then
    cp $BACKUP_DIR/${BACKUP_NAME}_env .env.production
    echo "⚙️  Environment restored"
fi

# Start services
echo "🚀 Xizmatlar ishga tushirilmoqda..."
docker-compose up -d

echo "✅ Restore yakunlandi!"