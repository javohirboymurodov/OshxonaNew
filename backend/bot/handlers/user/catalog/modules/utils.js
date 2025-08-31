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
    
    // Build file path
    const fileName = imagePath.replace('uploads/', '');
    const fullPath = path.join(__dirname, '../../../../../uploads', fileName);
    
    // Return file stream if exists, null if not
    if (fs.existsSync(fullPath)) {
      return { source: fs.createReadStream(fullPath) }; // Return stream object
    } else {
      console.log('❌ Image file not found:', fullPath);
      return null;
    }
  } catch (error) { 
    console.error('❌ buildAbsoluteImageUrl error:', error);
    return null; 
  }
}

module.exports = {
  buildAbsoluteImageUrl
};