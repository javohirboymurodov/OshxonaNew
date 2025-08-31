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
   * So'rov validatsiya middleware (Joi Schema)
   * @param {Object} schema - Joi validatsiya sxemasi
   * @returns {Function} - middleware funksiya
   */
  static requestValidator(schema) {
    return (req, res, next) => {
      try {
        // Joi schema validation
        const { error, value } = schema.validate(req.body, { 
          abortEarly: false,
          stripUnknown: true,
          allowUnknown: false
        });
        
        if (error) {
          // Log validation errors for debugging
          console.log('❌ Validation failed:', {
            body: req.body,
            errors: error.details.map(d => d.message)
          });
          
          // Log suspicious activity for validation failures
          this.detectSuspiciousActivity(req, 'validation_failure');
          
          const errors = error.details.map(detail => detail.message);
          return res.status(400).json({
            success: false,
            message: 'Ma\'lumotlar formati noto\'g\'ri',
            errors: errors
          });
        }

        // Use validated and sanitized data
        req.body = value;
        console.log('✅ Validation passed:', req.body);
        next();
      } catch (error) {
        console.error('Request validation error:', error);
        res.status(500).json({
          success: false,
          message: 'Server xatosi!'
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
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'self'"],
          scriptSrcAttr: ["'none'"],
          upgradeInsecureRequests: []
        }
      },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" }
    });
  }

  /**
   * MongoDB injection himoyasi
   * @returns {Function} - middleware funksiya
   */
  static mongoSanitization() {
    const mongoSanitize = require('express-mongo-sanitize');
    
    return mongoSanitize({
      replaceWith: '_',
      onSanitize: ({ req, key }) => {
        console.warn(`🚨 MongoDB injection attempt blocked: ${key} from ${req.ip}`);
        this.detectSuspiciousActivity(req, 'mongodb_injection');
      }
    });
  }

  /**
   * IP whitelist middleware
   * @param {Array} allowedIPs - ruxsat etilgan IP manzillar
   * @returns {Function} - middleware funksiya
   */
  static ipWhitelist(allowedIPs = []) {
    return (req, res, next) => {
      const clientIP = req.ip || req.connection.remoteAddress;
      
      if (allowedIPs.length === 0 || allowedIPs.includes(clientIP)) {
        return next();
      }
      
      console.warn(`🚨 IP blocked: ${clientIP}`);
      res.status(403).json({
        success: false,
        message: 'Ruxsat etilmagan IP manzil'
      });
    };
  }

  /**
   * Faoliyat logger middleware
   * @returns {Function} - middleware funksiya
   */
  static activityLogger() {
    return (req, res, next) => {
      const startTime = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        const logData = {
          ip: req.ip,
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          duration,
          userAgent: req.get('User-Agent'),
          timestamp: new Date()
        };
        
        // Log suspicious requests
        if (res.statusCode >= 400) {
          console.log('🔍 Suspicious request:', logData);
        }
        
        // Log slow requests
        if (duration > 1000) {
          console.warn('🐌 Slow request:', logData);
        }
      });
      
      next();
    };
  }
}

module.exports = SecurityFeaturesService;