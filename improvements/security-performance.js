// Advanced Security va Performance
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const validator = require('validator');

class SecurityService {
  // Advanced rate limiting
  static createRateLimit(options = {}) {
    return rateLimit({
      windowMs: options.windowMs || 15 * 60 * 1000, // 15 minutes
      max: options.max || 100,
      message: options.message || {
        error: 'Juda ko\'p urinish. Keyinroq qaytadan urining.',
        retryAfter: Math.ceil(options.windowMs / 1000)
      },
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => {
        // Admin IP larni skip qilish
        const adminIPs = process.env.ADMIN_IPS?.split(',') || [];
        return adminIPs.includes(req.ip);
      }
    });
  }

  // Input validation
  static validateInput(data, rules) {
    const errors = [];

    for (const field in rules) {
      const value = data[field];
      const rule = rules[field];

      if (rule.required && (!value || value.toString().trim() === '')) {
        errors.push(`${field} maydoni majburiy`);
        continue;
      }

      if (value && rule.type) {
        switch (rule.type) {
          case 'email':
            if (!validator.isEmail(value)) {
              errors.push(`${field} email formati noto'g'ri`);
            }
            break;
          case 'phone':
            if (!validator.isMobilePhone(value, 'uz-UZ')) {
              errors.push(`${field} telefon raqami noto'g'ri`);
            }
            break;
          case 'number':
            if (!validator.isNumeric(value.toString())) {
              errors.push(`${field} raqam bo'lishi kerak`);
            }
            break;
          case 'string':
            if (typeof value !== 'string') {
              errors.push(`${field} matn bo'lishi kerak`);
            }
            break;
        }
      }

      if (value && rule.min && value.toString().length < rule.min) {
        errors.push(`${field} kamida ${rule.min} ta belgi bo'lishi kerak`);
      }

      if (value && rule.max && value.toString().length > rule.max) {
        errors.push(`${field} ko'pi bilan ${rule.max} ta belgi bo'lishi kerak`);
      }

      if (value && rule.pattern && !rule.pattern.test(value)) {
        errors.push(`${field} formati noto'g'ri`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // SQL/NoSQL injection himoyasi
  static sanitizeInput(data) {
    if (typeof data === 'string') {
      return validator.escape(data);
    }
    
    if (typeof data === 'object' && data !== null) {
      const sanitized = {};
      for (const key in data) {
        if (data.hasOwnProperty(key)) {
          sanitized[key] = this.sanitizeInput(data[key]);
        }
      }
      return sanitized;
    }
    
    return data;
  }

  // File upload xavfsizligi
  static validateFileUpload(file) {
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp'
    ];

    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedMimeTypes.includes(file.mimetype)) {
      return {
        isValid: false,
        error: 'Faqat rasm fayllari ruxsat etilgan'
      };
    }

    if (file.size > maxSize) {
      return {
        isValid: false,
        error: 'Fayl hajmi 5MB dan oshmasligi kerak'
      };
    }

    return { isValid: true };
  }

  // JWT token validation
  static validateJWT(token) {
    try {
      const jwt = require('jsonwebtoken');
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return null;
    }
  }

  // Suspicious activity detection
  static async detectSuspiciousActivity(userId, activity) {
    const redis = require('redis').createClient();
    const key = `suspicious:${userId}`;
    
    const suspiciousActivities = [
      'rapid_requests',
      'invalid_inputs',
      'unauthorized_access',
      'unusual_patterns'
    ];

    if (suspiciousActivities.includes(activity)) {
      const count = await redis.incr(key);
      await redis.expire(key, 3600); // 1 hour

      if (count > 10) {
        // Auto-ban yoki admin ga xabar
        await this.notifySecurityTeam(userId, activity, count);
        return true;
      }
    }

    return false;
  }

  static async notifySecurityTeam(userId, activity, count) {
    // Admin larga security alert yuborish
    console.log(`SECURITY ALERT: User ${userId} - ${activity} (${count} times)`);
  }
}

class PerformanceOptimizer {
  // Database query optimization
  static optimizeQuery(model, query, options = {}) {
    let mongoQuery = model.find(query);

    // Indexlardan foydalanish
    if (options.sort) {
      mongoQuery = mongoQuery.sort(options.sort);
    }

    // Pagination
    if (options.limit) {
      mongoQuery = mongoQuery.limit(options.limit);
    }

    if (options.skip) {
      mongoQuery = mongoQuery.skip(options.skip);
    }

    // Projection (faqat kerakli fieldlar)
    if (options.select) {
      mongoQuery = mongoQuery.select(options.select);
    }

    // Population optimization
    if (options.populate) {
      if (Array.isArray(options.populate)) {
        options.populate.forEach(pop => {
          mongoQuery = mongoQuery.populate(pop);
        });
      } else {
        mongoQuery = mongoQuery.populate(options.populate);
      }
    }

    return mongoQuery;
  }

  // Memory usage monitoring
  static monitorMemoryUsage() {
    const used = process.memoryUsage();
    const usage = {};
    
    for (let key in used) {
      usage[key] = Math.round(used[key] / 1024 / 1024 * 100) / 100 + ' MB';
    }

    console.log('Memory Usage:', usage);

    // Memory leak warning
    if (used.heapUsed > 100 * 1024 * 1024) { // 100MB
      console.warn('HIGH MEMORY USAGE DETECTED!');
    }

    return usage;
  }

  // Response compression
  static setupCompression(app) {
    const compression = require('compression');
    
    app.use(compression({
      filter: (req, res) => {
        if (req.headers['x-no-compression']) {
          return false;
        }
        return compression.filter(req, res);
      },
      level: 6,
      threshold: 1024
    }));
  }

  // Database connection pooling
  static optimizeMongoConnection() {
    return {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferMaxEntries: 0,
      useNewUrlParser: true,
      useUnifiedTopology: true
    };
  }

  // Caching strategy
  static async cacheManager(key, dataFunction, ttl = 300) {
    const redis = require('redis').createClient();
    
    // Try to get from cache
    const cached = await redis.get(key);
    if (cached) {
      return JSON.parse(cached);
    }

    // Get fresh data
    const data = await dataFunction();
    
    // Cache the result
    await redis.setex(key, ttl, JSON.stringify(data));
    
    return data;
  }
}

// Monitoring va Alerting
class MonitoringService {
  // Health check
  static async healthCheck() {
    const health = {
      status: 'ok',
      timestamp: new Date(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      services: {}
    };

    // MongoDB check
    try {
      await mongoose.connection.db.admin().ping();
      health.services.mongodb = 'ok';
    } catch (error) {
      health.services.mongodb = 'error';
      health.status = 'degraded';
    }

    // Redis check
    try {
      const redis = require('redis').createClient();
      await redis.ping();
      health.services.redis = 'ok';
    } catch (error) {
      health.services.redis = 'error';
      health.status = 'degraded';
    }

    // Bot API check
    try {
      const bot = global.botInstance;
      await bot.telegram.getMe();
      health.services.telegram = 'ok';
    } catch (error) {
      health.services.telegram = 'error';
      health.status = 'error';
    }

    return health;
  }

  // Performance metrics
  static async getMetrics() {
    const metrics = {
      timestamp: new Date(),
      requests: {
        total: 0,
        success: 0,
        errors: 0,
        avgResponseTime: 0
      },
      orders: {
        today: await Order.countDocuments({
          createdAt: { $gte: new Date().setHours(0, 0, 0, 0) }
        }),
        pending: await Order.countDocuments({ status: 'pending' }),
        completed: await Order.countDocuments({ status: 'completed' })
      },
      users: {
        total: await User.countDocuments(),
        active: await User.countDocuments({
          lastActivity: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        })
      }
    };

    return metrics;
  }
}

module.exports = {
  SecurityService,
  PerformanceOptimizer,
  MonitoringService
};
