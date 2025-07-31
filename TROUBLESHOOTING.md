# 🔧 Troubleshooting Guide

## Common Issues and Solutions

### 1. Bot Connection Issues

#### Problem: Bot not responding to commands
```bash
# Check bot status
pm2 status

# Check logs
pm2 logs oshxona-bot

# Common solutions:
# 1. Verify BOT_TOKEN in .env
# 2. Check internet connection
# 3. Verify webhook is not set (if using polling)
```

#### Problem: Webhook errors
```bash
# Clear webhook
node clear-webhook.js

# Set webhook again
node scripts/setWebhook.js
```

### 2. Database Issues

#### Problem: MongoDB connection failed
```bash
# Check MongoDB status
sudo systemctl status mongod

# Check connection string
echo $MONGODB_URI

# Test connection
node -e "
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected'))
  .catch(err => console.log('❌ Error:', err.message));
"
```

#### Problem: Database queries slow
```javascript
// Add indexes in MongoDB
db.users.createIndex({ chatId: 1 })
db.products.createIndex({ category: 1, isAvailable: 1 })
db.orders.createIndex({ userId: 1, createdAt: -1 })
```

### 3. Socket.IO Issues

#### Problem: Real-time updates not working
```javascript
// Check Socket.IO server status
const io = require('socket.io-client');
const socket = io('http://localhost:5000');
socket.on('connect', () => console.log('✅ Socket connected'));
socket.on('disconnect', () => console.log('❌ Socket disconnected'));
```

#### Problem: CORS errors with Socket.IO
```javascript
// Update CORS settings in api/server.js
const io = require('socket.io')(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:3001"],
    methods: ["GET", "POST"]
  }
});
```

### 4. Admin Panel Issues

#### Problem: Admin panel not loading
```bash
# Check if built properly
cd oshxona-admin
npm run build

# Check TypeScript errors
npm run type-check

# Check for missing dependencies  
npm install
```

#### Problem: API calls failing
```javascript
// Check API base URL in src/services/api.ts
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';
```

### 5. User Frontend Issues

#### Problem: Next.js build errors
```bash
cd user-frontend

# Check for TypeScript errors
npm run type-check

# Clean build
rm -rf .next
npm run build
```

#### Problem: Tailwind CSS not working
```bash
# Verify PostCSS config
cat postcss.config.js

# Regenerate Tailwind
npx tailwindcss build src/styles/globals.css -o dist/styles.css
```

### 6. Cloudinary Issues

#### Problem: Image uploads failing
```javascript
// Check Cloudinary credentials
console.log({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET ? '***' : 'missing'
});
```

#### Problem: Images not displaying
```javascript
// Check image URLs in database
db.products.find({}, { images: 1 }).limit(5)

// Verify Cloudinary URLs
const cloudinary = require('cloudinary').v2;
cloudinary.api.resources().then(console.log);
```

### 7. Cache Issues

#### Problem: Cache not working
```javascript
// Check cache service
const cache = require('./services/cacheService');
cache.set('test', 'value');
console.log(cache.get('test')); // Should log 'value'

// Clear cache if needed
cache.clear();
```

### 8. Performance Issues

#### Problem: Slow API responses
```bash
# Check server resources
htop
free -h
df -h

# Check slow queries in logs
grep "slow" logs/*.log

# Add database indexes
node -e "
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI);
// Add your slow query indexes here
"
```

#### Problem: High memory usage
```bash
# Check Node.js memory usage
pm2 monit

# Restart if needed
pm2 restart all
```

### 9. Development Environment

#### Problem: Hot reload not working
```bash
# Check if nodemon is installed
npm list nodemon

# Install if missing
npm install -D nodemon

# Check nodemon.json configuration
```

#### Problem: Environment variables not loading
```bash
# Verify .env file exists
ls -la .env

# Check if dotenv is loaded
node -e "require('dotenv').config(); console.log(process.env.BOT_TOKEN)"
```

### 10. Production Deployment

#### Problem: PM2 process crashes
```bash
# Check PM2 logs
pm2 logs

# Check error logs
pm2 logs --err

# Restart with more memory
pm2 start ecosystem.config.js --max-memory-restart 1G
```

#### Problem: Nginx configuration errors
```bash
# Test Nginx config
sudo nginx -t

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log

# Reload configuration
sudo systemctl reload nginx
```

## Debugging Commands

### Quick Health Check
```bash
#!/bin/bash
echo "🔍 Oshxonabot Health Check"
echo "========================="

# Check processes
echo "📊 PM2 Status:"
pm2 status

# Check ports
echo "🌐 Port Status:"
netstat -tulpn | grep -E ":(3000|3001|5000|5001)"

# Check database
echo "🗄️ Database:"
mongo --eval "db.runCommand('ping')" --quiet

# Check disk space
echo "💾 Disk Space:"
df -h | grep -E "(/$|/opt|/var)"

# Check memory
echo "🧠 Memory:"
free -h

echo "✅ Health check complete"
```

### Log Analysis
```bash
# Recent errors
tail -100 logs/error-$(date +%Y-%m-%d).log

# Socket.IO connections
grep -i "socket" logs/app-$(date +%Y-%m-%d).log | tail -20

# API requests
grep -i "GET\|POST\|PUT\|DELETE" logs/app-$(date +%Y-%m-%d).log | tail -20
```

### Performance Monitoring
```javascript
// Add to your main files for monitoring
const startTime = Date.now();
process.on('exit', () => {
  console.log(`Process ran for ${Date.now() - startTime}ms`);
});

// Memory usage monitoring
setInterval(() => {
  const used = process.memoryUsage();
  console.log('Memory usage:', {
    rss: Math.round(used.rss / 1024 / 1024) + 'MB',
    heapTotal: Math.round(used.heapTotal / 1024 / 1024) + 'MB',
    heapUsed: Math.round(used.heapUsed / 1024 / 1024) + 'MB'
  });
}, 30000);
```

## Getting Help

1. **Check Logs First**: Always start by checking the relevant log files
2. **Search Issues**: Look for similar issues in the project's GitHub issues
3. **Test Isolation**: Try to reproduce the issue in a minimal environment
4. **Document Steps**: Note down the exact steps that caused the issue
5. **Environment Info**: Include OS, Node.js version, and package versions

## Contact Support

- **GitHub Issues**: [Create an issue](https://github.com/yourusername/oshxonabot/issues)
- **Telegram**: @yourusername
- **Email**: support@oshxonabot.com

---

**Remember**: Most issues can be resolved by checking logs and verifying configuration! 🔧
