/**
 * Security Service - Main Entry Point
 * Xavfsizlik xizmati - asosiy kirish nuqtasi
 * 
 * Bu fayl barcha security operatsiyalarini import qilib, bitta interfeys taqdim etadi
 */

const RateLimitService = require('./security/rateLimitService');
const SecurityValidationService = require('./security/validationService');
const SecurityFeaturesService = require('./security/securityFeatures');

/**
 * Security Service Class
 * Xavfsizlik xizmati klassi
 */
class SecurityService {
  // Rate limiting methods
  static createRateLimit(options = {}) {
    return RateLimitService.createRateLimit(options);
  }

  static getAPIRateLimit() {
    return RateLimitService.getAPIRateLimit();
  }

  static getAuthRateLimit() {
    return RateLimitService.getAuthRateLimit();
  }

  static getOrderRateLimit() {
    return RateLimitService.getOrderRateLimit();
  }

  static getAdminRateLimit() {
    return RateLimitService.getAdminRateLimit();
  }

  static getFileUploadRateLimit() {
    return RateLimitService.getFileUploadRateLimit();
  }

  // Validation & sanitization methods
  static validateInput(data, rules) {
    return SecurityValidationService.validateInput(data, rules);
  }

  static sanitizeInput(data) {
    return SecurityValidationService.sanitizeInput(data);
  }

  static validateFileUpload(file) {
    return SecurityValidationService.validateFileUpload(file);
  }

  static validateJWT(token) {
    return SecurityValidationService.validateJWT(token);
  }

  // Security features methods
  static async detectSuspiciousActivity(req, activityType) {
    return SecurityFeaturesService.detectSuspiciousActivity(req, activityType);
  }

  static requestValidator(schema) {
    return SecurityFeaturesService.requestValidator(schema);
  }

  static securityHeaders() {
    return SecurityFeaturesService.securityHeaders();
  }

  static mongoSanitization() {
    return SecurityFeaturesService.mongoSanitization();
  }

  static ipWhitelist(allowedIPs = []) {
    return SecurityFeaturesService.ipWhitelist(allowedIPs);
  }

  static activityLogger() {
    return SecurityFeaturesService.activityLogger();
  }
}

module.exports = SecurityService;