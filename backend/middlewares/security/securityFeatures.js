const { User } = require('../../models');

/**
 * Security Features Service
 * Xavfsizlik xususiyatlari xizmati
 */

class SecurityFeaturesService {
  /**
   * Shubhali faoliyatni aniqlash
   * @param {Object} req - Request object
   * @param {string} activityType - faoliyat turi
   * @returns {boolean} - shubhali faoliyat aniqlandi yoki yo'q
   */
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

  /**
   * So'rov validatsiya middleware
   * @param {Object} schema - validatsiya sxemasi
   * @returns {Function} - middleware funksiya
   */
  static requestValidator(schema) {
    const SecurityValidationService = require('./validationService');
    
    return (req, res, next) => {
      try {
        const validation = SecurityValidationService.validateInput(req.body, schema);
        
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
        req.body = SecurityValidationService.sanitizeInput(req.body);
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

  /**
   * Security headers middleware
   * @returns {Function} - middleware funksiya
   */
  static securityHeaders() {
    const helmet = require('helmet');
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

  /**
   * MongoDB sanitization middleware
   * @returns {Function} - middleware funksiya
   */
  static mongoSanitization() {
    const mongoSanitize = require('express-mongo-sanitize');
    return mongoSanitize({
      replaceWith: '_',
      onSanitize: ({ req, key }) => {
        console.warn(`🚨 Potential NoSQL injection attempt: ${key} from ${req.ip}`);
        this.detectSuspiciousActivity(req, 'nosql_injection');
      }
    });
  }

  /**
   * IP whitelist middleware (admin endpointlar uchun)
   * @param {Array} allowedIPs - ruxsat etilgan IP lar
   * @returns {Function} - middleware funksiya
   */
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

  /**
   * Foydalanuvchi faoliyat logi
   * @returns {Function} - middleware funksiya
   */
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

module.exports = SecurityFeaturesService;