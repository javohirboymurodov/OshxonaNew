/**
 * Mobile UI Utilities
 * Mobil UI yordamchi funksiyalari
 */

class MobileUIUtils {
  /**
   * Mobil uchun matnni formatlash
   * @param {string} text - formatlash kerak bo'lgan matn
   * @param {number} maxLineLength - maksimal qator uzunligi
   * @returns {string} - formatli matn
   */
  static formatMobileText(text, maxLineLength = 35) {
    if (!text || text.length <= maxLineLength) return text;
    
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    for (const word of words) {
      if ((currentLine + ' ' + word).length <= maxLineLength) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    
    if (currentLine) lines.push(currentLine);
    return lines.join('\n');
  }

  /**
   * Ko'p bosqichli jarayonlar uchun progress ko'rsatkich
   * @param {number} currentStep - joriy bosqich
   * @param {number} totalSteps - jami bosqichlar
   * @param {Array} labels - bosqich nomlari
   * @returns {string} - progress ko'rsatkich
   */
  static getProgressIndicator(currentStep, totalSteps, labels = []) {
    const progress = [];
    
    for (let i = 1; i <= totalSteps; i++) {
      if (i < currentStep) {
        progress.push('✅');
      } else if (i === currentStep) {
        progress.push('🔄');
      } else {
        progress.push('⭕');
      }
      
      if (labels[i - 1]) {
        progress.push(labels[i - 1]);
      }
    }
    
    return progress.join(' ');
  }
}

module.exports = MobileUIUtils;