#!/bin/bash

echo "🚀 Oshxona Bot Deployment Script"
echo "================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   log_error "Bu script root foydalanuvchi sifatida ishga tushmasligi kerak!"
   exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    log_error "Docker o'rnatilmagan!"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    log_error "Docker Compose o'rnatilmagan!"
    exit 1
fi

# Check environment file
if [ ! -f ".env.production" ]; then
    log_error ".env.production fayli mavjud emas!"
    exit 1
fi

log_info "Environment tekshirilmoqda..."

# Load environment variables
source .env.production

# Check required variables
required_vars=("BOT_TOKEN" "MONGODB_URI" "ADMIN_ID")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        log_error "Environment variable $var o'rnatilmagan!"
        exit 1
    fi
done

log_info "Pre-deployment tekshiruvlar..."

# Run tests
log_info "Testlar ishga tushirilmoqda..."
npm test
if [ $? -ne 0 ]; then
    log_error "Testlar muvaffaqiyatsiz!"
    exit 1
fi

# Build Docker images
log_info "Docker images yaratilmoqda..."
docker-compose build --no-cache

if [ $? -ne 0 ]; then
    log_error "Docker build muvaffaqiyatsiz!"
    exit 1
fi

# Stop existing containers
log_info "Mavjud containerlar to'xtatilmoqda..."
docker-compose down

# Create necessary directories
log_info "Kerakli kataloglar yaratilmoqda..."
mkdir -p logs uploads backups stats nginx/ssl

# Set permissions
chmod 755 logs uploads backups stats
chmod 600 .env.production

# Start services
log_info "Xizmatlar ishga tushirilmoqda..."
docker-compose up -d

if [ $? -ne 0 ]; then
    log_error "Xizmatlarni ishga tushirishda xatolik!"
    exit 1
fi

# Wait for services to be ready
log_info "Xizmatlar tayyor bo'lishini kutish..."
sleep 30

# Health check
log_info "Health check..."
for i in {1..10}; do
    if curl -f http://localhost:3000/health &> /dev/null; then
        log_info "Xizmat tayyor!"
        break
    fi
    
    if [ $i -eq 10 ]; then
        log_error "Xizmat tayyor bo'lmadi!"
        docker-compose logs
        exit 1
    fi
    
    sleep 5
done

# Set webhook
log_info "Webhook o'rnatilmoqda..."
node scripts/setWebhook.js set

# Database seeding (if needed)
if [ "$1" == "--seed" ]; then
    log_info "Database seed..."
    docker-compose exec oshxona-bot node scripts/seed.js
fi

# Show status
log_info "Deployment status:"
docker-compose ps

log_info "✅ Deployment muvaffaqiyatli yakunlandi!"
log_info "🌐 Bot: https://yourdomain.com/webhook"
log_info "📊 Admin panel: http://localhost:3000"

# Show logs
echo ""
read -p "Loglarni ko'rmoqchimisiz? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker-compose logs -f oshxona-bot
fi