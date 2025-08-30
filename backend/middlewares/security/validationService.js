const validator = require('validator');
const jwt = require('jsonwebtoken');

/**
 * Security Validation Service
 * Xavfsizlik validatsiya xizmati
 */

class SecurityValidationService {
  /**
   * Input validatsiya
   * @param {Object} data - validatsiya qilinadigan ma'lumotlar
   * @param {Object} rules - validatsiya qoidalari
   * @returns {Object} - validatsiya natijasi
   */
  static validateInput(data, rules) {
    const errors = [];

    for (const field in rules) {
      const value = data[field];
      const rule = rules[field];

      if (rule.required && (!value || value.toString().trim() === '')) {
        errors.push(`${field} maydoni majburiy`);
        continue;
      }

      if (value && rule.type) {
        switch (rule.type) {
          case 'email':
            if (!validator.isEmail(value)) {
              errors.push(`${field} email formati noto'g'ri`);
            }
            break;
          case 'phone':
            // Uzbekistan phone number validation
            const phoneRegex = /^\+998[0-9]{9}$/;
            if (!phoneRegex.test(value)) {
              errors.push(`${field} telefon raqami noto'g'ri (+998XXXXXXXXX formatida bo'lishi kerak)`);
            }
            break;
          case 'number':
            if (!validator.isNumeric(value.toString())) {
              errors.push(`${field} raqam bo'lishi kerak`);
            }
            break;
          case 'string':
            if (typeof value !== 'string') {
              errors.push(`${field} matn bo'lishi kerak`);
            }
            break;
          case 'mongoId':
            if (!validator.isMongoId(value)) {
              errors.push(`${field} noto'g'ri ID format`);
            }
            break;
          case 'url':
            if (!validator.isURL(value)) {
              errors.push(`${field} noto'g'ri URL format`);
            }
            break;
        }
      }

      if (value && rule.min && value.toString().length < rule.min) {
        errors.push(`${field} kamida ${rule.min} ta belgi bo'lishi kerak`);
      }

      if (value && rule.max && value.toString().length > rule.max) {
        errors.push(`${field} ko'pi bilan ${rule.max} ta belgi bo'lishi kerak`);
      }

      if (value && rule.pattern && !rule.pattern.test(value)) {
        errors.push(`${field} formati noto'g'ri`);
      }

      if (value && rule.enum && !rule.enum.includes(value)) {
        errors.push(`${field} quyidagi qiymatlardan biri bo'lishi kerak: ${rule.enum.join(', ')}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * SQL/NoSQL injection himoyasi
   * @param {any} data - tozalanishi kerak bo'lgan ma'lumot
   * @returns {any} - tozalangan ma'lumot
   */
  static sanitizeInput(data) {
    if (typeof data === 'string') {
      // Remove dangerous characters
      return data.replace(/[<>\"'%;()&+]/g, '');
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeInput(item));
    }
    
    if (typeof data === 'object' && data !== null) {
      const sanitized = {};
      for (const key in data) {
        if (data.hasOwnProperty(key)) {
          sanitized[key] = this.sanitizeInput(data[key]);
        }
      }
      return sanitized;
    }
    
    return data;
  }

  /**
   * Fayl yuklash xavfsizligi
   * @param {Object} file - yuklangan fayl
   * @returns {Object} - validatsiya natijasi
   */
  static validateFileUpload(file) {
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/webp'
    ];

    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      return {
        isValid: false,
        error: 'Faqat rasm fayllari ruxsat etilgan (JPG, PNG, GIF, WEBP)'
      };
    }

    // Check file extension
    const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
    if (!allowedExtensions.includes(fileExtension)) {
      return {
        isValid: false,
        error: 'Fayl kengaytmasi ruxsat etilmagan'
      };
    }

    if (file.size > maxSize) {
      return {
        isValid: false,
        error: 'Fayl hajmi 5MB dan oshmasligi kerak'
      };
    }

    return { isValid: true };
  }

  /**
   * JWT token validatsiya
   * @param {string} token - JWT token
   * @returns {Object|null} - decode qilingan token yoki null
   */
  static validateJWT(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return null;
    }
  }
}

module.exports = SecurityValidationService;