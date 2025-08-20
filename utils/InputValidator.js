// Input Validation Utility
const { ErrorHandler, ERROR_TYPES } = require('./ErrorHandler');

/**
 * Centralized Input Validation System
 * Barcha user inputlarini tekshirish va tozalash uchun
 */
class InputValidator {
  
  // ===============================
  // USER DATA VALIDATION
  // ===============================
  
  /**
   * Telefon raqamini tekshirish va formatlash
   * @param {string} phone - telefon raqami
   * @returns {Object} - validation result
   */
  static validatePhone(phone) {
    try {
      if (!phone || typeof phone !== 'string') {
        return { isValid: false, error: 'Telefon raqami kiritilmagan' };
      }

      // Remove all non-digit characters
      const cleaned = phone.replace(/\D/g, '');
      
      // Uzbekistan phone number patterns
      const patterns = [
        /^998\d{9}$/, // +998XXXXXXXXX
        /^998\d{8}$/,  // +998XXXXXXXX (landline)
        /^\d{9}$/,     // XXXXXXXXX (mobile without country code)
        /^\d{8}$/,     // XXXXXXXX (landline without country code)
        /^\d{7}$/      // XXXXXXX (short landline)
      ];

      const isValid = patterns.some(pattern => pattern.test(cleaned));
      
      if (!isValid) {
        return { 
          isValid: false, 
          error: 'Telefon raqami noto\'g\'ri formatda. Misol: +998901234567' 
        };
      }

      // Format to standard international format
      let formatted = cleaned;
      if (cleaned.length === 9) {
        formatted = '998' + cleaned;
      } else if (cleaned.length === 8) {
        formatted = '998' + cleaned;
      } else if (cleaned.length === 7) {
        formatted = '998' + cleaned;
      }

      return {
        isValid: true,
        formatted: '+' + formatted,
        cleaned: cleaned,
        original: phone
      };
    } catch (error) {
      console.error('Phone validation error:', error);
      return { isValid: false, error: 'Telefon raqamini tekshirishda xatolik' };
    }
  }

  /**
   * Ismni tekshirish
   * @param {string} name - ism
   * @param {number} minLength - minimal uzunlik
   * @param {number} maxLength - maksimal uzunlik
   * @returns {Object} - validation result
   */
  static validateName(name, minLength = 2, maxLength = 50) {
    try {
      if (!name || typeof name !== 'string') {
        return { isValid: false, error: 'Ism kiritilmagan' };
      }

      const trimmed = name.trim();
      
      if (trimmed.length < minLength) {
        return { 
          isValid: false, 
          error: `Ism kamida ${minLength} ta belgidan iborat bo'lishi kerak` 
        };
      }

      if (trimmed.length > maxLength) {
        return { 
          isValid: false, 
          error: `Ism maksimal ${maxLength} ta belgidan iborat bo'lishi kerak` 
        };
      }

      // Check for valid characters (letters, spaces, apostrophes, hyphens)
      const namePattern = /^[a-zA-ZÀ-ÿА-Яа-яЎўҚқҒғҲҳӨөҤ\s'-]+$/;
      if (!namePattern.test(trimmed)) {
        return { 
          isValid: false, 
          error: 'Ismda faqat harflar, bo\'sh joy va \'-\' belgilar bo\'lishi mumkin' 
        };
      }

      // Capitalize first letter of each word
      const formatted = trimmed.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());

      return {
        isValid: true,
        formatted: formatted,
        original: name
      };
    } catch (error) {
      console.error('Name validation error:', error);
      return { isValid: false, error: 'Ismni tekshirishda xatolik' };
    }
  }

  /**
   * Manzilni tekshirish
   * @param {string} address - manzil
   * @returns {Object} - validation result
   */
  static validateAddress(address) {
    try {
      if (!address || typeof address !== 'string') {
        return { isValid: false, error: 'Manzil kiritilmagan' };
      }

      const trimmed = address.trim();
      
      if (trimmed.length < 5) {
        return { 
          isValid: false, 
          error: 'Manzil kamida 5 ta belgidan iborat bo\'lishi kerak' 
        };
      }

      if (trimmed.length > 200) {
        return { 
          isValid: false, 
          error: 'Manzil maksimal 200 ta belgidan iborat bo\'lishi kerak' 
        };
      }

      // Basic address pattern (letters, numbers, common punctuation)
      const addressPattern = /^[a-zA-ZÀ-ÿА-Яа-яЎўҚқҒғҲҳӨөҤ0-9\s,.-\/№]+$/;
      if (!addressPattern.test(trimmed)) {
        return { 
          isValid: false, 
          error: 'Manzilda noto\'g\'ri belgilar mavjud' 
        };
      }

      return {
        isValid: true,
        formatted: trimmed,
        original: address
      };
    } catch (error) {
      console.error('Address validation error:', error);
      return { isValid: false, error: 'Manzilni tekshirishda xatolik' };
    }
  }

  // ===============================
  // PRODUCT DATA VALIDATION
  // ===============================
  
  /**
   * Mahsulot nomini tekshirish
   * @param {string} productName - mahsulot nomi
   * @returns {Object} - validation result
   */
  static validateProductName(productName) {
    try {
      if (!productName || typeof productName !== 'string') {
        return { isValid: false, error: 'Mahsulot nomi kiritilmagan' };
      }

      const trimmed = productName.trim();
      
      if (trimmed.length < 2) {
        return { 
          isValid: false, 
          error: 'Mahsulot nomi kamida 2 ta belgidan iborat bo\'lishi kerak' 
        };
      }

      if (trimmed.length > 100) {
        return { 
          isValid: false, 
          error: 'Mahsulot nomi maksimal 100 ta belgidan iborat bo\'lishi kerak' 
        };
      }

      return {
        isValid: true,
        formatted: trimmed,
        original: productName
      };
    } catch (error) {
      console.error('Product name validation error:', error);
      return { isValid: false, error: 'Mahsulot nomini tekshirishda xatolik' };
    }
  }

  /**
   * Narxni tekshirish
   * @param {number|string} price - narx
   * @returns {Object} - validation result
   */
  static validatePrice(price) {
    try {
      if (price === null || price === undefined || price === '') {
        return { isValid: false, error: 'Narx kiritilmagan' };
      }

      const numPrice = Number(price);
      
      if (isNaN(numPrice)) {
        return { isValid: false, error: 'Narx raqam bo\'lishi kerak' };
      }

      if (numPrice < 0) {
        return { isValid: false, error: 'Narx manfiy bo\'lishi mumkin emas' };
      }

      if (numPrice > 10000000) { // 10 million som max
        return { isValid: false, error: 'Narx juda katta (maksimal 10,000,000 so\'m)' };
      }

      return {
        isValid: true,
        formatted: Math.round(numPrice), // Round to nearest integer
        original: price
      };
    } catch (error) {
      console.error('Price validation error:', error);
      return { isValid: false, error: 'Narxni tekshirishda xatolik' };
    }
  }

  /**
   * Miqdorni tekshirish
   * @param {number|string} quantity - miqdor
   * @returns {Object} - validation result
   */
  static validateQuantity(quantity) {
    try {
      if (quantity === null || quantity === undefined || quantity === '') {
        return { isValid: false, error: 'Miqdor kiritilmagan' };
      }

      const numQuantity = Number(quantity);
      
      if (isNaN(numQuantity)) {
        return { isValid: false, error: 'Miqdor raqam bo\'lishi kerak' };
      }

      if (numQuantity < 1) {
        return { isValid: false, error: 'Miqdor kamida 1 bo\'lishi kerak' };
      }

      if (numQuantity > 100) {
        return { isValid: false, error: 'Miqdor maksimal 100 ta bo\'lishi mumkin' };
      }

      if (!Number.isInteger(numQuantity)) {
        return { isValid: false, error: 'Miqdor butun son bo\'lishi kerak' };
      }

      return {
        isValid: true,
        formatted: numQuantity,
        original: quantity
      };
    } catch (error) {
      console.error('Quantity validation error:', error);
      return { isValid: false, error: 'Miqdorni tekshirishda xatolik' };
    }
  }

  // ===============================
  // LOCATION VALIDATION
  // ===============================
  
  /**
   * Koordinatalarni tekshirish
   * @param {number} latitude - kenglik
   * @param {number} longitude - uzunlik
   * @returns {Object} - validation result
   */
  static validateCoordinates(latitude, longitude) {
    try {
      if (latitude === null || latitude === undefined || 
          longitude === null || longitude === undefined) {
        return { isValid: false, error: 'Koordinatalar kiritilmagan' };
      }

      const lat = Number(latitude);
      const lon = Number(longitude);

      if (isNaN(lat) || isNaN(lon)) {
        return { isValid: false, error: 'Koordinatalar raqam bo\'lishi kerak' };
      }

      // Valid latitude range: -90 to 90
      if (lat < -90 || lat > 90) {
        return { isValid: false, error: 'Kenglik -90 va 90 oralig\'ida bo\'lishi kerak' };
      }

      // Valid longitude range: -180 to 180  
      if (lon < -180 || lon > 180) {
        return { isValid: false, error: 'Uzunlik -180 va 180 oralig\'ida bo\'lishi kerak' };
      }

      // Approximate Uzbekistan bounds check
      const uzbekistanBounds = {
        north: 45.6,
        south: 37.2,
        east: 73.2,
        west: 56.0
      };

      if (lat < uzbekistanBounds.south || lat > uzbekistanBounds.north ||
          lon < uzbekistanBounds.west || lon > uzbekistanBounds.east) {
        return { 
          isValid: false, 
          error: 'Koordinatalar O\'zbekiston hududidan tashqarida',
          warning: true // This is a warning, not a strict error
        };
      }

      return {
        isValid: true,
        latitude: lat,
        longitude: lon,
        original: { latitude, longitude }
      };
    } catch (error) {
      console.error('Coordinates validation error:', error);
      return { isValid: false, error: 'Koordinatalarni tekshirishda xatolik' };
    }
  }

  // ===============================
  // TEXT INPUT VALIDATION
  // ===============================
  
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

  // ===============================
  // UTILITY METHODS
  // ===============================
  
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

module.exports = InputValidator;
