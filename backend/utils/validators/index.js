/**
 * Validators Module - Central Export
 * Validatorlar moduli - markaziy export
 * 
 * Bu fayl barcha validation operatsiyalarini bitta joydan export qiladi
 */

const UserValidator = require('./userValidator');
const ProductValidator = require('./productValidator');
const LocationValidator = require('./locationValidator');
const TextValidator = require('./textValidator');
const ValidationUtils = require('./utils');

module.exports = {
  // User data validation - foydalanuvchi ma'lumotlari
  validatePhone: UserValidator.validatePhone,
  validateName: UserValidator.validateName,
  validateAddress: UserValidator.validateAddress,
  
  // Product data validation - mahsulot ma'lumotlari
  validateProductName: ProductValidator.validateProductName,
  validatePrice: ProductValidator.validatePrice,
  validateQuantity: ProductValidator.validateQuantity,
  
  // Location validation - joylashuv validatsiyasi
  validateCoordinates: LocationValidator.validateCoordinates,
  
  // Text validation - matn validatsiyasi
  validateText: TextValidator.validateText,
  sanitizeInput: TextValidator.sanitizeInput,
  
  // Utility functions - yordamchi funksiyalar
  formatValidationError: ValidationUtils.formatValidationError,
  validateMultiple: ValidationUtils.validateMultiple,
  
  // Direct access to classes - to'g'ridan-to'g'ri kirish
  User: UserValidator,
  Product: ProductValidator,
  Location: LocationValidator,
  Text: TextValidator,
  Utils: ValidationUtils
};