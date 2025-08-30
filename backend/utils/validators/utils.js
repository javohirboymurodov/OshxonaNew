const { ErrorHandler, ERROR_TYPES } = require('../ErrorHandler');

/**
 * Validation Utility Functions
 * Validatsiya yordamchi funksiyalari
 */

class ValidationUtils {
  /**
   * Error obyektini formatlash
   * @param {Object} validationResult - validation natijasi
   * @param {string} fieldName - maydon nomi
   * @returns {Object} - formatli error
   */
  static formatValidationError(validationResult, fieldName = 'Input') {
    if (validationResult.isValid) return null;

    return ErrorHandler.createError(
      ERROR_TYPES.VALIDATION_ERROR,
      `${fieldName}: ${validationResult.error}`,
      {
        field: fieldName,
        originalValue: validationResult.original,
        validationError: validationResult.error
      }
    );
  }

  /**
   * Multiple inputlarni bir vaqtda tekshirish
   * @param {Object} inputs - input obyektlari
   * @param {Object} validationRules - validation qoidalari
   * @returns {Object} - validation natijalari
   */
  static validateMultiple(inputs, validationRules) {
    const results = {};
    const errors = [];
    let hasErrors = false;

    for (const [field, value] of Object.entries(inputs)) {
      if (validationRules[field]) {
        const { validator, options } = validationRules[field];
        const result = validator(value, options);
        
        results[field] = result;
        
        if (!result.isValid) {
          hasErrors = true;
          errors.push({
            field,
            error: result.error,
            value: result.original
          });
        }
      }
    }

    return {
      isValid: !hasErrors,
      results,
      errors,
      hasErrors
    };
  }
}

module.exports = ValidationUtils;