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
    const base = process.env.SERVER_URL || `http://localhost:${process.env.API_PORT || 5000}`;
    if (typeof img === 'string') {
      if (/^https?:\/\//.test(img)) return img;
      if (img.startsWith('/')) return `${base}${img}`;
      return `${base}/${img}`;
    }
    if (img.url) {
      const u = img.url;
      if (/^https?:\/\//.test(u)) return u;
      if (u.startsWith('/')) return `${base}${u}`;
      return `${base}/${u}`;
    }
    return null;
  } catch { 
    return null; 
  }
}

module.exports = {
  buildAbsoluteImageUrl
};