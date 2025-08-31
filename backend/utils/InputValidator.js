/**
 * Input Validator - Main Entry Point
 * Input validatori - asosiy kirish nuqtasi
 * 
 * Bu fayl barcha validation operatsiyalarini import qilib, bitta interfeys taqdim etadi
 */

// Import from validators module
const validatorsModule = require('./validators');

/**
 * Centralized Input Validation System
 * Barcha user inputlarini tekshirish va tozalash uchun
 */
class InputValidator {
  // ===============================
  // USER DATA VALIDATION
  // ===============================
  
  static validatePhone(phone) {
    return validatorsModule.validatePhone(phone);
  }

  static validateName(name, minLength = 2, maxLength = 50) {
    return validatorsModule.validateName(name, minLength, maxLength);
  }

  static validateAddress(address) {
    return validatorsModule.validateAddress(address);
  }

  // ===============================
  // PRODUCT DATA VALIDATION
  // ===============================
  
  static validateProductName(productName) {
    return validatorsModule.validateProductName(productName);
  }

  static validatePrice(price) {
    return validatorsModule.validatePrice(price);
  }

  static validateQuantity(quantity) {
    return validatorsModule.validateQuantity(quantity);
  }

  // ===============================
  // LOCATION VALIDATION
  // ===============================
  
  static validateCoordinates(latitude, longitude) {
    return validatorsModule.validateCoordinates(latitude, longitude);
  }

  // ===============================
  // TEXT INPUT VALIDATION
  // ===============================
  
  static validateText(text, options = {}) {
    return validatorsModule.validateText(text, options);
  }

  // ===============================
  // UTILITY METHODS
  // ===============================
  
  static sanitizeInput(input) {
    return validatorsModule.sanitizeInput(input);
  }

  static formatValidationError(validationResult, fieldName = 'Input') {
    return validatorsModule.formatValidationError(validationResult, fieldName);
  }

  static validateMultiple(inputs, validationRules) {
    return validatorsModule.validateMultiple(inputs, validationRules);
  }
}

module.exports = InputValidator;