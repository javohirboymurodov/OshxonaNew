/**
 * Security Service - Main Entry Point
 * Xavfsizlik xizmati - asosiy kirish nuqtasi
 * 
 * Bu fayl barcha security operatsiyalarini import qilib, bitta interfeys taqdim etadi
 */

// Import from security modules
const securityModules = require('./security/index');

/**
 * Security Service Class
 * Xavfsizlik xizmati klassi
 */
class SecurityService {
  // Rate limiting methods
  static createRateLimit(options = {}) {
    return securityModules.createRateLimit(options);
  }

  static getAPIRateLimit() {
    return securityModules.getAPIRateLimit();
  }

  static getAuthRateLimit() {
    return securityModules.getAuthRateLimit();
  }

  static getOrderRateLimit() {
    return securityModules.getOrderRateLimit();
  }

  static getAdminRateLimit() {
    return securityModules.getAdminRateLimit();
  }

  static getFileUploadRateLimit() {
    return securityModules.getFileUploadRateLimit();
  }

  // Validation & sanitization methods
  static validateInput(data, rules) {
    return securityModules.validateInput(data, rules);
  }

  static sanitizeInput(data) {
    return securityModules.sanitizeInput(data);
  }

  static validateFileUpload(file) {
    return securityModules.validateFileUpload(file);
  }

  static validateJWT(token) {
    return securityModules.validateJWT(token);
  }

  // Security features methods
  static async detectSuspiciousActivity(req, activityType) {
    return securityModules.detectSuspiciousActivity(req, activityType);
  }

  static requestValidator(schema) {
    return securityModules.requestValidator(schema);
  }

  static securityHeaders() {
    return securityModules.securityHeaders();
  }

  static mongoSanitization() {
    return securityModules.mongoSanitization();
  }

  static ipWhitelist(allowedIPs = []) {
    return securityModules.ipWhitelist(allowedIPs);
  }

  static activityLogger() {
    return securityModules.activityLogger();
  }
}

module.exports = SecurityService;