/**
 * Rate Limit Service
 * Rate limiting xizmati
 */

class RateLimitService {
    /**
     * Umumiy rate limit yaratish
     * @param {Object} options - rate limit parametrlari
     * @returns {Function} - rate limit middleware
     */
    static createRateLimit(options = {}) {
      const rateLimit = require('express-rate-limit');
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
  
    /**
     * API uchun rate limit
     * @returns {Function} - rate limit middleware
     */
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
  
    /**
     * Autentifikatsiya uchun rate limit
     * @returns {Function} - rate limit middleware
     */
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
  
    /**
     * Buyurtma uchun rate limit
     * @returns {Function} - rate limit middleware
     */
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
  
    /**
     * Admin uchun rate limit (ko'proq ruxsat)
     * @returns {Function} - rate limit middleware
     */
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
  
    /**
     * Fayl yuklash uchun rate limit
     * @returns {Function} - rate limit middleware
     */
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
  }
  
  module.exports = RateLimitService;