const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');

const SocketManager = require('../config/socketConfig');
const { specs, swaggerUi } = require('../docs/swagger');

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

// CORS configuration - kengaytirilgan
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5173', // Vite default port
    process.env.ADMIN_PANEL_URL || 'http://localhost:3000',
    process.env.USER_FRONTEND_URL || 'http://localhost:3001'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

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

// Auth routes
app.use('/api/auth', require('./routes/auth'));

// Admin routes
app.use('/api/admin', require('./routes/admin'));
app.use('/api/admin/users', require('./routes/users'));

// SuperAdmin routes
app.use('/api/superadmin', require('./routes/superadmin'));

// Public routes
app.use('/api/orders', require('./routes/orders'));
app.use('/api/couriers', require('./routes/couriers'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/products', require('./routes/products'));
app.use('/api/users', require('./routes/users'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/tables', require('./routes/tables'));

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

// 🚫 ERROR HANDLING

// 404 handler
app.use('*', (req, res) => {
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