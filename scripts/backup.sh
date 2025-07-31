#!/bin/bash

echo "💾 Oshxona Bot Backup Script"
echo "============================"

# Variables
BACKUP_DIR="/var/backups/oshxona"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="oshxona_backup_$DATE"

# Create backup directory
mkdir -p $BACKUP_DIR

echo "📦 Creating backup: $BACKUP_NAME"

# Database backup
echo "🗄️  Backing up MongoDB..."
docker-compose exec -T mongo mongodump --archive --gzip | gzip > $BACKUP_DIR/${BACKUP_NAME}_db.gz

# Files backup
echo "📁 Backing up files..."
tar -czf $BACKUP_DIR/${BACKUP_NAME}_files.tar.gz \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='logs' \
    --exclude='temp' \
    .

# Environment backup
echo "⚙️  Backing up environment..."
cp .env.production $BACKUP_DIR/${BACKUP_NAME}_env

echo "✅ Backup completed: $BACKUP_DIR/$BACKUP_NAME*"

# Cleanup old backups (keep last 7 days)
find $BACKUP_DIR -name "oshxona_backup_*" -mtime +7 -delete
echo "🧹 Old backups cleaned up"