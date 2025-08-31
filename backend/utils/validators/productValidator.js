/**
 * Product Data Validator
 * Mahsulot ma'lumotlari validatori
 */

class ProductValidator {
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
  }
  
  module.exports = ProductValidator;