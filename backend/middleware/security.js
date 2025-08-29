const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const validator = require('validator');
const { User } = require('../models');

class SecurityService {
  // Advanced rate limiting configurations
  static createRateLimit(options = {}) {
    return rateLimit({
      windowMs: options.windowMs || 15 * 60 * 1000, // 15 minutes
      max: options.max || 100,
      message: options.message || {
        success: false,
        error: 'Juda ko\'p urinish. Keyinroq qaytadan urining.',
        retryAfter: Math.ceil((options.windowMs || 15 * 60 * 1000) / 1000)
      },
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => {
        // Admin IP larni skip qilish
        const adminIPs = process.env.ADMIN_IPS?.split(',') || [];
        return adminIPs.includes(req.ip);
      },
      keyGenerator: (req) => {
        // Use IP + user agent for better tracking
        return req.ip + ':' + (req.get('User-Agent') || '').slice(0, 50);
      }
    });
  }

  // Specific rate limits for different endpoints
  static getAPIRateLimit() {
    return this.createRateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 200, // 200 requests per 15 minutes
      message: {
        success: false,
        error: 'API chekloviga yetdingiz. 15 daqiqadan keyin qaytadan urining.'
      }
    });
  }

  static getAuthRateLimit() {
    return this.createRateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 10, // 10 login attempts per 15 minutes
      message: {
        success: false,
        error: 'Juda ko\'p kirish urinishi. 15 daqiqadan keyin qaytadan urining.'
      }
    });
  }

  static getOrderRateLimit() {
    return this.createRateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: 200, // 200 requests per minute (much higher for admin operations)
      message: {
        success: false,
        error: 'Buyurtmalar soni chekloviga yetdingiz. Bir daqiqadan keyin qaytadan urining.'
      }
    });
  }

  // Admin-specific rate limit (more generous)
  static getAdminRateLimit() {
    return this.createRateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: 500, // 500 requests per minute for admin
      message: {
        success: false,
        error: 'Admin panel chekloviga yetdingiz. Bir daqiqadan keyin qaytadan urining.'
      }
    });
  }

  static getFileUploadRateLimit() {
    return this.createRateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: 10, // 10 file uploads per minute
      message: {
        success: false,
        error: 'Fayl yuklash chekloviga yetdingiz. Bir daqiqadan keyin qaytadan urining.'
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
            // Uzbekistan phone number validation
            const phoneRegex = /^\+998[0-9]{9}$/;
            if (!phoneRegex.test(value)) {
              errors.push(`${field} telefon raqami noto'g'ri (+998XXXXXXXXX formatida bo'lishi kerak)`);
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
          case 'mongoId':
            if (!validator.isMongoId(value)) {
              errors.push(`${field} noto'g'ri ID format`);
            }
            break;
          case 'url':
            if (!validator.isURL(value)) {
              errors.push(`${field} noto'g'ri URL format`);
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

      if (value && rule.enum && !rule.enum.includes(value)) {
        errors.push(`${field} quyidagi qiymatlardan biri bo'lishi kerak: ${rule.enum.join(', ')}`);
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
      // Remove dangerous characters
      return data.replace(/[<>\"'%;()&+]/g, '');
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeInput(item));
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
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/webp'
    ];

    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      return {
        isValid: false,
        error: 'Faqat rasm fayllari ruxsat etilgan (JPG, PNG, GIF, WEBP)'
      };
    }

    // Check file extension
    const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
    if (!allowedExtensions.includes(fileExtension)) {
      return {
        isValid: false,
        error: 'Fayl kengaytmasi ruxsat etilmagan'
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
  static async detectSuspiciousActivity(req, activityType) {
    const key = `suspicious:${req.ip}:${activityType}`;
    const maxAttempts = 10;
    const windowMs = 15 * 60 * 1000; // 15 minutes

    try {
      // In-memory store for simplicity (in production, use Redis)
      if (!global.suspiciousStore) {
        global.suspiciousStore = new Map();
      }

      const now = Date.now();
      const existing = global.suspiciousStore.get(key) || { count: 0, firstAttempt: now };

      // Reset if window expired
      if (now - existing.firstAttempt > windowMs) {
        existing.count = 1;
        existing.firstAttempt = now;
      } else {
        existing.count++;
      }

      global.suspiciousStore.set(key, existing);

      if (existing.count > maxAttempts) {
        console.warn(`🚨 Suspicious activity detected: ${activityType} from ${req.ip} (${existing.count} attempts)`);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Suspicious activity detection error:', error);
      return false;
    }
  }

  // Request validation middleware
  static requestValidator(schema) {
    return (req, res, next) => {
      try {
        const validation = this.validateInput(req.body, schema);
        
        if (!validation.isValid) {
          // Log suspicious activity for validation failures
          this.detectSuspiciousActivity(req, 'validation_failure');
          
          return res.status(400).json({
            success: false,
            message: 'Ma\'lumotlar formati noto\'g\'ri',
            errors: validation.errors
          });
        }

        // Sanitize input data
        req.body = this.sanitizeInput(req.body);
        next();
      } catch (error) {
        console.error('Request validation error:', error);
        res.status(500).json({
          success: false,
          message: 'Server xatosi'
        });
      }
    };
  }

  // Security headers middleware
  static securityHeaders() {
    return helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false
    });
  }

  // Mongo sanitization middleware
  static mongoSanitization() {
    return mongoSanitize({
      replaceWith: '_',
      onSanitize: ({ req, key }) => {
        console.warn(`🚨 Potential NoSQL injection attempt: ${key} from ${req.ip}`);
        this.detectSuspiciousActivity(req, 'nosql_injection');
      }
    });
  }

  // IP whitelist middleware (for admin endpoints)
  static ipWhitelist(allowedIPs = []) {
    return (req, res, next) => {
      const clientIP = req.ip || req.connection.remoteAddress;
      
      // In development, allow all IPs
      if (process.env.NODE_ENV === 'development') {
        return next();
      }

      if (allowedIPs.length === 0 || allowedIPs.includes(clientIP)) {
        return next();
      }

      console.warn(`🚨 Unauthorized IP access attempt: ${clientIP}`);
      res.status(403).json({
        success: false,
        message: 'Ruxsat etilmagan IP manzil'
      });
    };
  }

  // User activity logging
  static activityLogger() {
    return (req, res, next) => {
      const startTime = Date.now();
      
      res.on('finish', async () => {
        const duration = Date.now() - startTime;
        const logData = {
          ip: req.ip,
          method: req.method,
          url: req.originalUrl,
          statusCode: res.statusCode,
          duration,
          userAgent: req.get('User-Agent'),
          timestamp: new Date()
        };

        // Log suspicious patterns
        if (res.statusCode >= 400 || duration > 5000) {
          console.warn('🔍 Suspicious request:', logData);
        }

        // In production, save to database or monitoring service
        if (process.env.NODE_ENV === 'production' && req.user) {
          try {
            // Update user's last activity
            await User.findByIdAndUpdate(req.user.id, {
              lastActivity: new Date(),
              lastIP: req.ip
            });
          } catch (error) {
            console.error('Activity logging error:', error);
          }
        }
      });

      next();
    };
  }
}

module.exports = SecurityService;