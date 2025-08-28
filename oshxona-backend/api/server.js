const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');

const SocketManager = require('../config/socketConfig');
const Database = require('../config/database');
const { specs, swaggerUi } = require('../docs/swagger');
const logger = require('../utils/logger');
const { errorHandler, notFoundHandler } = require('../utils/errorHandler');
const requestLogger = require('../middleware/requestLogger');
const SecurityService = require('../middleware/security');

// Express app yaratish
const app = express();

// 🛡️ MIDDLEWARES

// Helmet configuration - static files uchun CORS ruxsat berish
app.use(helmet({
  crossOriginResourcePolicy: { 
    policy: "cross-origin" 
  },
  contentSecurityPolicy: false // Development uchun CSP o'chirish
}));

// CORS configuration - kengaytirilgan (dinamik allowlist)
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3001',
  'http://localhost:3003', // Vite default port
  process.env.ADMIN_PANEL_URL,
  process.env.USER_FRONTEND_URL,
  process.env.WEBAPP_URL,
  'https://oshxona-new.vercel.app'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Mobile apps yoki server-to-server uchun origin yo'q bo'lishi mumkin
    if (!origin) return callback(null, true);
    const isAllowed =
      allowedOrigins.includes(origin) ||
      /\.vercel\.app$/i.test(origin); // Preview deploymentlar uchun
    if (isAllowed) return callback(null, true);
    return callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Preflight OPTIONS ga tezkor javob
app.options('*', cors());

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 🛡️ ENHANCED SECURITY MIDDLEWARE
app.use(SecurityService.securityHeaders());
app.use(SecurityService.mongoSanitization());
app.use(SecurityService.activityLogger());

// Global rate limiting
app.use('/api', SecurityService.getAPIRateLimit());

// Specific rate limits for sensitive endpoints
app.use('/api/auth', SecurityService.getAuthRateLimit());
app.use('/api/orders', SecurityService.getOrderRateLimit());

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  next();
});

// 📂 STATIC FILES - CORS headers bilan
app.use('/uploads', (req, res, next) => {
  // Manual CORS headers for static files
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(__dirname, '../uploads')));

// 🌐 API ROUTES

// Debug: Route'lar yuklanganini tekshirish
console.log('🔍 Loading API routes...');

// Bot webhook endpoint
app.post('/webhook', (req, res) => {
  console.log('📥 Webhook received:', req.body);
  // Bot update'ni qayta ishlash
  try {
    const bot = global.botInstance;
    if (bot && bot.handleUpdate) {
      bot.handleUpdate(req.body, res);
    } else {
      console.warn('⚠️ Bot instance topilmadi yoki tayyor emas');
      res.sendStatus(200);
    }
  } catch (error) {
    console.error('Webhook error:', error);
    res.sendStatus(200);
  }
});

// Friendly GET for webhook (for human checks)
app.get('/webhook', (req, res) => {
  res.status(405).json({
    success: false,
    message: 'Webhook faqat POST orqali ishlaydi',
    method: 'GET'
  });
});

// =============================
// Telegram diagnostics endpoints
// =============================
app.get('/api/telegram/webhook-info', async (req, res) => {
  try {
    const { bot } = require('../index');
    if (!bot) return res.status(503).json({ success: false, message: 'Bot hali yuklanmagan' });
    const info = await bot.telegram.getWebhookInfo();
    res.json({ success: true, info });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.post('/api/telegram/reset-webhook', async (req, res) => {
  try {
    const { bot } = require('../index');
    if (!bot) return res.status(503).json({ success: false, message: 'Bot hali yuklanmagan' });
    const baseUrl = (process.env.WEBHOOK_URL || process.env.RENDER_EXTERNAL_URL || '').replace(/\/+$/, '');
    if (!baseUrl || !/^https:\/\//i.test(baseUrl)) {
      return res.status(400).json({ success: false, message: 'Webhook URL noto\'g\'ri yoki yo\'q (WEBHOOK_URL/RENDER_EXTERNAL_URL)' });
    }
    const url = `${baseUrl}/webhook`;
    await bot.telegram.setWebhook(url, { drop_pending_updates: true });
    const info = await bot.telegram.getWebhookInfo();
    res.json({ success: true, message: 'Webhook reset qildi', info });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Auth routes
app.use('/api/auth', require('./routes/auth'));

// Admin routes
app.use('/api/admin', require('./routes/admin'));
app.use('/api/admin/users', require('./routes/users'));

// SuperAdmin routes
app.use('/api/superadmin', require('./routes/superadmin'));

// Public routes
console.log('🔍 Loading public routes...');
app.use('/api/public', require('./routes/public'));
console.log('✅ Public routes loaded');

console.log('🔍 Loading other routes...');
app.use('/api/orders', require('./routes/orders'));
app.use('/api/couriers', require('./routes/couriers'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/products', require('./routes/products'));
app.use('/api/users', require('./routes/users'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/tables', require('./routes/tables'));
console.log('✅ All routes loaded');

// 📚 API DOCUMENTATION (Swagger)
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(specs, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Oshxona API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'none',
    filter: true,
    showCommonExtensions: true,
    tryItOutEnabled: true
  }
}));

// 🏥 HEALTH CHECK

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Oshxona API',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Test route - API ishlayotganini tekshirish uchun
app.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Test route ishlayapti!',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'API test route ishlayapti!',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'API server ishlayapti',
    documentation: '/api/docs',
    data: {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      status: 'healthy'
    }
  });
});

// DB status diagnostics (temporary)
app.get('/api/db/status', (req, res) => {
  try {
    const status = Database.getConnectionStatus();
    res.json({ success: true, status });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 🚫 ERROR HANDLING

// 404 handler
app.use('*', (req, res) => {
  console.log('❌ 404 Not Found:', {
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
  
  res.status(404).json({
    success: false,
    message: 'API endpoint topilmadi',
    path: req.originalUrl,
    method: req.method
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('🚨 API Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Production da stack trace ko'rsatmaslik
  const isDev = process.env.NODE_ENV !== 'production';
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Serverda xatolik yuz berdi!',
    ...(isDev && { 
      stack: err.stack,
      details: err 
    })
  });
});

// 🚀 SERVER INITIALIZATION

const createServer = () => {
  // HTTP server yaratish
  const server = http.createServer(app);
  
  // Socket.IO initialization
  SocketManager.init(server);
  console.log('✅ Socket.IO server initialized');
  
  return server;
};

const startAPIServer = (port = 5000) => {
  return new Promise((resolve, reject) => {
    try {
      const server = createServer();
      
      server.listen(port, () => {
        console.log(`🌐 API Server: http://localhost:${port}`);
        console.log(`📊 Health Check: http://localhost:${port}/health`);
        console.log(`📋 API Docs: http://localhost:${port}/api/health`);
        console.log(`🔌 Socket.IO: Ready`);
        resolve(server);
      });

      server.on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
          console.error(`❌ Port ${port} band. Boshqa port sinab ko'ring.`);
        } else {
          console.error('❌ Server xatosi:', error.message);
        }
        reject(error);
      });

    } catch (error) {
      console.error('❌ Server yaratishda xatolik:', error);
      reject(error);
    }
  });
};

module.exports = {
  app,
  createServer,
  startAPIServer,
  SocketManager
};