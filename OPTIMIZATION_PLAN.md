# 🚀 OSHXONABOT OPTIMIZATSIYA REJASI

## 📋 **1. BACKEND OPTIMIZATSIYALARI**

### **A. Socket.IO Integratsiyasi**
```javascript
// config/socketConfig.js - yangi fayl
const socketIo = require('socket.io');

class SocketManager {
  static io = null;
  
  static init(server) {
    this.io = socketIo(server, {
      cors: {
        origin: [
          process.env.ADMIN_PANEL_URL,
          process.env.USER_FRONTEND_URL
        ],
        credentials: true
      }
    });
    
    this.setupEventHandlers();
    return this.io;
  }
  
  static setupEventHandlers() {
    this.io.on('connection', (socket) => {
      // Admin panelga qo'shilish
      socket.on('join-admin', (branchId) => {
        socket.join(`branch:${branchId}`);
      });
      
      // User tracking
      socket.on('join-user', (userId) => {
        socket.join(`user:${userId}`);
      });
    });
  }
  
  // Yangi buyurtma eventini yuborish
  static emitNewOrder(branchId, orderData) {
    this.io.to(`branch:${branchId}`).emit('new-order', orderData);
  }
  
  // Buyurtma holati o'zgarishi
  static emitStatusUpdate(userId, status) {
    this.io.to(`user:${userId}`).emit('status-updated', status);
  }
}

module.exports = SocketManager;
```

### **B. Cloudinary Integratsiyasi**
```javascript
// config/cloudinaryConfig.js - yangi fayl
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'oshxona',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [
      { width: 800, height: 600, crop: 'limit', quality: 'auto' }
    ]
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

module.exports = { cloudinary, upload };
```

### **C. MongoDB Optimizatsiya**
```javascript
// config/database.js - yangilash
class Database {
  static async connect() {
    const options = {
      maxPoolSize: 15, // Connection pool o'sadi
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 60000,
      bufferMaxEntries: 0,
      // SSL va production optimizatsiya
      ssl: process.env.NODE_ENV === 'production',
      retryWrites: true,
      writeConcern: { w: 'majority' }
    };
    
    const connection = await mongoose.connect(process.env.MONGODB_URI, options);
    
    // Indexlar yaratish
    await this.createIndexes();
    
    return connection;
  }
  
  static async createIndexes() {
    // Performance uchun muhim indexlar
    await mongoose.model('User').collection.createIndex(
      { telegramId: 1 }, 
      { unique: true, sparse: true }
    );
    
    await mongoose.model('Order').collection.createIndex(
      { user: 1, createdAt: -1 }
    );
    
    await mongoose.model('Product').collection.createIndex(
      { categoryId: 1, isActive: 1, isAvailable: 1 }
    );
    
    // Text search uchun
    await mongoose.model('Product').collection.createIndex(
      { name: 'text', description: 'text' }
    );
  }
}
```

## 📋 **2. REDIS NI OLIB TASHLASH**

### **A. Memory Cache Sistemi**
```javascript
// services/cacheService.js - yangi fayl
class MemoryCache {
  constructor() {
    this.cache = new Map();
    this.maxSize = 1000;
    this.ttl = 5 * 60 * 1000; // 5 minut
  }
  
  set(key, value, customTTL = null) {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    const expireAt = Date.now() + (customTTL || this.ttl);
    this.cache.set(key, { value, expireAt });
  }
  
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expireAt) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }
  
  invalidate(pattern) {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}

const cache = new MemoryCache();
module.exports = cache;
```

### **B. Session boshqaruvi yaxshilash**
```javascript
// middlewares/session.js - yangilash
const session = require('express-session');
const MongoStore = require('connect-mongo');

const sessionConfig = {
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    touchAfter: 24 * 3600 // 24 soat
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 kun
  }
};

module.exports = sessionConfig;
```

## 📋 **3. FRONTEND YARATISH**

### **A. User Frontend (Next.js)**
```
user-frontend/
├── pages/
│   ├── index.js          # Asosiy sahifa - mahsulotlar
│   ├── category/[id].js  # Kategoriya sahifasi
│   ├── product/[id].js   # Mahsulot tafsilotlari
│   ├── cart.js           # Savatcha
│   ├── orders.js         # Buyurtmalar tarixi
│   └── track/[id].js     # Buyurtma kuzatuvi
├── components/
│   ├── ProductCard.js
│   ├── CategoryList.js
│   ├── Cart.js
│   └── OrderTracking.js
├── hooks/
│   ├── useSocket.js      # Socket.io hook
│   ├── useCart.js        # Savatcha hook
│   └── useOrders.js      # Buyurtmalar hook
└── services/
    └── api.js            # API calls
```

### **B. Admin Panel Yaxshilash**
```
oshxona-admin/
├── src/
│   ├── pages/
│   │   ├── Dashboard/
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── RealTimeOrders.tsx  # Real-time buyurtmalar
│   │   │   └── Analytics.tsx       # Statistika
│   │   ├── Orders/
│   │   │   ├── OrdersPage.tsx
│   │   │   ├── OrderDetails.tsx
│   │   │   └── OrderTracking.tsx
│   │   └── Products/
│   │       ├── ProductsPage.tsx
│   │       ├── ProductForm.tsx
│   │       └── ImageUpload.tsx     # Cloudinary upload
│   ├── hooks/
│   │   ├── useSocket.tsx
│   │   ├── useOrders.tsx
│   │   └── useRealTime.tsx
│   └── services/
│       ├── api.ts
│       ├── socket.ts
│       └── cloudinary.ts
```

## 📋 **4. REAL-TIME FUNKTIONALLAR**

### **A. Buyurtma Real-time Updates**
```javascript
// handlers/user/order.js - yangilash
const SocketManager = require('../../config/socketConfig');

async function finalizeOrder(ctx) {
  // ... mavjud kod ...
  
  const order = new Order(orderData);
  await order.save();
  
  // Real-time adminlarga yuborish
  SocketManager.emitNewOrder(order.branch, {
    id: order._id,
    customer: order.user.firstName,
    items: order.items,
    total: order.total,
    type: order.orderType,
    createdAt: order.createdAt
  });
  
  // User frontend uchun
  SocketManager.emitStatusUpdate(order.user._id, {
    orderId: order._id,
    status: 'pending',
    message: 'Buyurtmangiz qabul qilindi'
  });
}
```

### **B. Admin buyurtma holati o'zgartirish**
```javascript
// api/routes/orders.js - yangilash
router.put('/:id/status', auth, async (req, res) => {
  const { status, message } = req.body;
  const order = await Order.findById(req.params.id).populate('user');
  
  order.status = status;
  order.statusHistory.push({
    status,
    message,
    timestamp: new Date(),
    updatedBy: req.user._id
  });
  
  await order.save();
  
  // User'ga real-time yuborish
  SocketManager.emitStatusUpdate(order.user._id, {
    orderId: order._id,
    status,
    message: message || getStatusMessage(status)
  });
  
  // Telegram bot orqali ham yuborish
  if (order.user.telegramId) {
    bot.telegram.sendMessage(
      order.user.telegramId,
      `📦 Buyurtma #${order.orderId}\n📍 Holat: ${message || getStatusMessage(status)}`
    );
  }
  
  res.json({ success: true, order });
});
```

## 📋 **5. DEPLOYMENT OPTIMIZATSIYA**

### **A. Docker-compose.yml yangilash**
```yaml
version: '3.8'

services:
  oshxona-bot:
    build: .
    container_name: oshxona-bot
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=${MONGODB_URI}
      - CLOUDINARY_CLOUD_NAME=${CLOUDINARY_CLOUD_NAME}
      - CLOUDINARY_API_KEY=${CLOUDINARY_API_KEY}
      - CLOUDINARY_API_SECRET=${CLOUDINARY_API_SECRET}
    volumes:
      - ./logs:/usr/src/app/logs
    networks:
      - oshxona-network

  nginx:
    image: nginx:alpine
    container_name: oshxona-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      - oshxona-bot
    networks:
      - oshxona-network

networks:
  oshxona-network:
    driver: bridge
```

### **B. Nginx konfiguratsiya**
```nginx
# nginx/nginx.conf
upstream backend {
    server oshxona-bot:3000;
}

server {
    listen 80;
    server_name api.oshxona.uz;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.oshxona.uz;
    
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    
    # Socket.IO support
    location /socket.io/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    location / {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 📋 **6. XAVFSIZLIK YAXSHILASHLAR**

### **A. Input Validation**
```javascript
// middleware/validation.js - yangi fayl
const joi = require('joi');

const schemas = {
  order: joi.object({
    items: joi.array().items(
      joi.object({
        productId: joi.string().required(),
        quantity: joi.number().min(1).max(99).required(),
        notes: joi.string().max(200).optional()
      })
    ).min(1).required(),
    orderType: joi.string().valid('delivery', 'pickup', 'dine_in').required(),
    paymentMethod: joi.string().valid('cash', 'card', 'click', 'payme').required()
  }),
  
  product: joi.object({
    name: joi.string().min(2).max(100).required(),
    price: joi.number().min(0).required(),
    categoryId: joi.string().required(),
    description: joi.string().max(500).optional()
  })
};

const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schemas[schema].validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }
    next();
  };
};

module.exports = { validate, schemas };
```

### **B. Rate Limiting yaxshilash**
```javascript
// middleware/advancedRateLimit.js - yangi fayl
const rateLimit = require('express-rate-limit');

// Har xil endpoint uchun turli limitlar
const createRateLimit = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: { success: false, message },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        message: message || 'Too many requests',
        retryAfter: Math.round(windowMs / 1000)
      });
    }
  });
};

// Export qilingan rate limitlar
module.exports = {
  // Umumiy API
  general: createRateLimit(15 * 60 * 1000, 100, 'Juda ko\'p so\'rov!'),
  
  // Login attempts
  auth: createRateLimit(15 * 60 * 1000, 5, 'Juda ko\'p login urinishi!'),
  
  // File upload
  upload: createRateLimit(60 * 1000, 10, 'Juda ko\'p fayl yuklash!'),
  
  // Order creation
  order: createRateLimit(5 * 60 * 1000, 10, 'Juda ko\'p buyurtma!')
};
```

## 📋 **7. MONITORING VA ANALYTICS**

### **A. Advanced Logging**
```javascript
// utils/logger.js - yangilash
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

// Custom format
const customFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.colorize({ all: true })
);

// Transport konfigurasiya
const transports = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }),
  
  new DailyRotateFile({
    filename: 'logs/app-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    format: customFormat
  }),
  
  new DailyRotateFile({
    filename: 'logs/error-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    maxSize: '20m',
    maxFiles: '30d',
    format: customFormat
  })
];

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: customFormat,
  transports,
  exitOnError: false
});

// Request logger middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.originalUrl}`, {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
  });
  
  next();
};

module.exports = { logger, requestLogger };
```

### **B. Business Analytics**
```javascript
// services/analyticsService.js - yangi fayl
const { Order, User, Product } = require('../models');

class AnalyticsService {
  // Kunlik statistika
  static async getDailyStats(date = new Date()) {
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));
    
    const stats = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfDay, $lte: endOfDay }
        }
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$total' },
          avgOrderValue: { $avg: '$total' },
          completedOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          }
        }
      }
    ]);
    
    return stats[0] || {
      totalOrders: 0,
      totalRevenue: 0,
      avgOrderValue: 0,
      completedOrders: 0
    };
  }
  
  // Top mahsulotlar
  static async getTopProducts(days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    return await Order.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          totalSold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      { $sort: { totalSold: -1 } },
      { $limit: 10 }
    ]);
  }
  
  // Peak hours analizi
  static async getPeakHours(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    return await Order.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $hour: '$createdAt' },
          orderCount: { $sum: 1 },
          totalRevenue: { $sum: '$total' }
        }
      },
      { $sort: { '_id': 1 } }
    ]);
  }
}

module.exports = AnalyticsService;
```

## 📋 **8. .ENV KONFIGURATSIYA**

```env
# Bot
BOT_TOKEN=your_bot_token_here

# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/oshxona

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# JWT
JWT_SECRET=your_jwt_secret_very_long_and_secure

# Session
SESSION_SECRET=your_session_secret_very_long_and_secure

# URLs
ADMIN_PANEL_URL=https://admin.oshxona.uz
USER_FRONTEND_URL=https://oshxona.uz
API_BASE_URL=https://api.oshxona.uz

# Company
COMPANY_NAME=Oshxona Professional
COMPANY_PHONE=+998901234567
COMPANY_EMAIL=info@oshxona.uz

# Payment
CLICK_MERCHANT_ID=your_click_merchant
PAYME_MERCHANT_ID=your_payme_merchant

# Logging
LOG_LEVEL=info

# Node
NODE_ENV=production
PORT=3000
```

Bu optimizatsiya rejasi mavjud kodingizni yo'qotmasdan, faqat kerakli qismlarni yangilaydi va qo'shadi. Redis o'rniga memory cache ishlatiladi, real-time funksionallar Socket.IO orqali amalga oshiriladi.
