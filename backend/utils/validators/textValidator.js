/**
 * Text Input Validator
 * Matn kiritish validatori
 */

class TextValidator {
  /**
   * Umumiy matn kiritishni tekshirish
   * @param {string} text - matn
   * @param {Object} options - parametrlar
   * @returns {Object} - validation result
   */
  static validateText(text, options = {}) {
    const defaults = {
      minLength: 1,
      maxLength: 1000,
      allowEmpty: false,
      allowSpecialChars: true,
      trimWhitespace: true
    };

    const opts = { ...defaults, ...options };

    try {
      if (!text && !opts.allowEmpty) {
        return { isValid: false, error: 'Matn kiritilmagan' };
      }

      if (!text && opts.allowEmpty) {
        return { isValid: true, formatted: '', original: text };
      }

      if (typeof text !== 'string') {
        return { isValid: false, error: 'Matn string bo\'lishi kerak' };
      }

      const processed = opts.trimWhitespace ? text.trim() : text;

      if (processed.length < opts.minLength) {
        return { 
          isValid: false, 
          error: `Matn kamida ${opts.minLength} ta belgidan iborat bo'lishi kerak` 
        };
      }

      if (processed.length > opts.maxLength) {
        return { 
          isValid: false, 
          error: `Matn maksimal ${opts.maxLength} ta belgidan iborat bo'lishi kerak` 
        };
      }

      // Check for dangerous characters if not allowing special chars
      if (!opts.allowSpecialChars) {
        const dangerousPattern = /[<>\"'&]/;
        if (dangerousPattern.test(processed)) {
          return { 
            isValid: false, 
            error: 'Matndagi ba\'zi belgilar ruxsat etilmagan' 
          };
        }
      }

      return {
        isValid: true,
        formatted: processed,
        original: text
      };
    } catch (error) {
      console.error('Text validation error:', error);
      return { isValid: false, error: 'Matnni tekshirishda xatolik' };
    }
  }

  /**
   * Xavfli HTML/JS kodlarini tozalash
   * @param {string} input - kiritilgan matn
   * @returns {string} - tozalangan matn
   */
  static sanitizeInput(input) {
    if (!input || typeof input !== 'string') return '';
    
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }
}

module.exports = TextValidator;