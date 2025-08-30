/**
 * User Data Validator
 * Foydalanuvchi ma'lumotlari validatori
 */

class UserValidator {
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
}

module.exports = UserValidator;