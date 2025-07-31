# Oshxonabot Deployment Guide

## 🚀 Production Deployment

### Prerequisites
- Ubuntu 20.04+ server
- Node.js 18+
- MongoDB 6.0+
- Nginx
- PM2
- SSL Certificate (Let's Encrypt)

### Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo apt install nginx -y
```

### Application Deployment

```bash
# Clone repository
git clone https://github.com/yourusername/oshxonabot.git
cd oshxonabot

# Install dependencies
npm install
cd oshxona-admin && npm install && cd ..
cd user-frontend && npm install && cd ..

# Build applications
cd oshxona-admin && npm run build && cd ..
cd user-frontend && npm run build && cd ..

# Create production environment
cp .env.example .env
nano .env
```

### Environment Configuration

```env
# Production Environment
NODE_ENV=production

# Bot Configuration
BOT_TOKEN=your_production_bot_token
ADMIN_CHAT_ID=your_admin_chat_id

# Database
MONGODB_URI=mongodb://localhost:27017/oshxonabot_prod

# JWT
JWT_SECRET=your_super_secure_production_jwt_secret

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Server Configuration
PORT=5000
API_PORT=5001

# Cache
CACHE_TTL=600000
CACHE_CLEANUP_INTERVAL=1800000
```

### PM2 Configuration

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: 'oshxona-bot',
      script: 'index.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      error_file: './logs/bot-error.log',
      out_file: './logs/bot-out.log',
      log_file: './logs/bot-combined.log',
      time: true
    },
    {
      name: 'oshxona-api',
      script: 'api/server.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 5001
      },
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      log_file: './logs/api-combined.log',
      time: true
    }
  ]
};
```

Start with PM2:
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Nginx Configuration

Create `/etc/nginx/sites-available/oshxonabot`:

```nginx
# Bot API Server
server {
    listen 80;
    server_name api.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# Admin Panel
server {
    listen 80;
    server_name admin.yourdomain.com;
    root /path/to/oshxonabot/oshxona-admin/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# User Frontend
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    root /path/to/oshxonabot/user-frontend/.next;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable sites:
```bash
sudo ln -s /etc/nginx/sites-available/oshxonabot /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### SSL Certificate

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get certificates
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
sudo certbot --nginx -d admin.yourdomain.com
sudo certbot --nginx -d api.yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Monitoring & Backup

#### PM2 Monitoring
```bash
# Monitor processes
pm2 monit

# View logs
pm2 logs

# Restart apps
pm2 restart all
```

#### Database Backup
```bash
# Create backup script
cat > /opt/backup-db.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mongodump --db oshxonabot_prod --out /opt/backups/mongodb_$DATE
tar -czf /opt/backups/mongodb_$DATE.tar.gz /opt/backups/mongodb_$DATE
rm -rf /opt/backups/mongodb_$DATE
find /opt/backups -name "*.tar.gz" -mtime +7 -delete
EOF

chmod +x /opt/backup-db.sh

# Add to crontab
echo "0 2 * * * /opt/backup-db.sh" | crontab -
```

### Performance Optimization

#### Nginx Caching
```nginx
http {
    proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m max_size=10g inactive=60m use_temp_path=off;
    
    server {
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
        
        location /api {
            proxy_cache my_cache;
            proxy_cache_valid 200 1m;
            proxy_cache_use_stale error timeout invalid_header updating http_500 http_502 http_503 http_504;
        }
    }
}
```

#### MongoDB Optimization
```javascript
// Create indexes
db.users.createIndex({ chatId: 1 }, { unique: true })
db.products.createIndex({ category: 1, isAvailable: 1 })
db.orders.createIndex({ userId: 1, createdAt: -1 })
db.orders.createIndex({ status: 1, createdAt: -1 })
```

### Security

#### Firewall Setup
```bash
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw deny 27017  # MongoDB (only local access)
```

#### Rate Limiting (Nginx)
```nginx
http {
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    
    server {
        location /api {
            limit_req zone=api burst=20 nodelay;
        }
    }
}
```

### Troubleshooting

#### Common Issues
```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs oshxona-bot
pm2 logs oshxona-api

# Check Nginx
sudo nginx -t
sudo systemctl status nginx

# Check MongoDB
sudo systemctl status mongod
mongo --eval "db.runCommand('ping')"

# Check disk space
df -h

# Check memory usage
free -h
```

### Update Deployment

```bash
# Pull latest changes
git pull origin main

# Install new dependencies
npm install
cd oshxona-admin && npm install && npm run build && cd ..
cd user-frontend && npm install && npm run build && cd ..

# Restart services
pm2 restart all
sudo systemctl reload nginx
```

---

## 📊 Monitoring Dashboard

Consider using:
- **PM2 Plus** - Process monitoring
- **MongoDB Compass** - Database monitoring  
- **Nginx Amplify** - Web server monitoring
- **Uptime Robot** - Uptime monitoring

## 🔐 Security Checklist

- [ ] Strong passwords and JWT secrets
- [ ] SSL certificates installed
- [ ] Firewall configured
- [ ] Rate limiting enabled
- [ ] Regular security updates
- [ ] Database access restricted
- [ ] Environment variables secured
- [ ] Log monitoring setup

---

**Production Ready!** 🚀
