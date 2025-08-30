/**
 * Security Modules - Central Export
 * Xavfsizlik modullari - markaziy export
 * 
 * Bu fayl barcha security operatsiyalarini bitta joydan export qiladi
 */

const RateLimitService = require('./rateLimitService');
const SecurityValidationService = require('./validationService');
const SecurityFeaturesService = require('./securityFeatures');

module.exports = {
  // Rate limiting - so'rov cheklash
  createRateLimit: RateLimitService.createRateLimit,
  getAPIRateLimit: RateLimitService.getAPIRateLimit,
  getAuthRateLimit: RateLimitService.getAuthRateLimit,
  getOrderRateLimit: RateLimitService.getOrderRateLimit,
  getAdminRateLimit: RateLimitService.getAdminRateLimit,
  getFileUploadRateLimit: RateLimitService.getFileUploadRateLimit,
  
  // Validation & sanitization - validatsiya va tozalash
  validateInput: SecurityValidationService.validateInput,
  sanitizeInput: SecurityValidationService.sanitizeInput,
  validateFileUpload: SecurityValidationService.validateFileUpload,
  validateJWT: SecurityValidationService.validateJWT,
  
  // Security features - xavfsizlik xususiyatlari
  detectSuspiciousActivity: SecurityFeaturesService.detectSuspiciousActivity,
  requestValidator: SecurityFeaturesService.requestValidator,
  securityHeaders: SecurityFeaturesService.securityHeaders,
  mongoSanitization: SecurityFeaturesService.mongoSanitization,
  ipWhitelist: SecurityFeaturesService.ipWhitelist,
  activityLogger: SecurityFeaturesService.activityLogger,
  
  // Direct access to services - to'g'ridan-to'g'ri kirish
  RateLimit: RateLimitService,
  Validation: SecurityValidationService,
  Features: SecurityFeaturesService
};