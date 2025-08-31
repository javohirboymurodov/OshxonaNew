/**
 * Catalog Utility Functions
 * Katalog yordamchi funksiyalari
 */

/**
 * Rasm URL ni to'liq formatda yaratish
 * @param {string|Object} img - rasm ma'lumoti
 * @returns {string|null} - to'liq URL yoki null
 */
function buildAbsoluteImageUrl(img) {
  try {
    if (!img) return null;
    
    // Check if file exists first
    const fs = require('fs');
    const path = require('path');
    
    let imagePath = '';
    if (typeof img === 'string') {
      if (/^https?:\/\//.test(img)) return img; // External URL
      imagePath = img.startsWith('/') ? img.substring(1) : img;
    } else if (img.url) {
      imagePath = img.url.startsWith('/') ? img.url.substring(1) : img.url;
    } else {
      return null;
    }
    
    // Check if file exists
    const fullPath = path.join(__dirname, '../../../../../uploads', imagePath.replace('uploads/', ''));
    if (!fs.existsSync(fullPath)) {
      console.log('❌ Image file not found:', fullPath);
      return null; // Return null if file doesn't exist
    }
    
    const base = process.env.SERVER_URL || `http://localhost:${process.env.PORT || 5000}`;
    return `${base}/${imagePath}`;
  } catch (error) { 
    console.error('❌ buildAbsoluteImageUrl error:', error);
    return null; 
  }
}

module.exports = {
  buildAbsoluteImageUrl
};