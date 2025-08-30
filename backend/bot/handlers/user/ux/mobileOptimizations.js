/**
 * Mobile UX Service - Main Entry Point
 * Mobil UX xizmati - asosiy kirish nuqtasi
 * 
 * Bu fayl barcha mobil UX operatsiyalarini import qilib, bitta interfeys taqdim etadi
 */

// Import from modules
const mobileModules = require('./modules');

/**
 * Mobile UX Service Class
 * Mobil foydalanuvchi tajribasi xizmati
 */
class MobileUXService {
  // Data services - ma'lumot xizmatlari
  static async getRecentOrders(userId, limit = 2) {
    return mobileModules.getRecentOrders(userId, limit);
  }

  static async getFavoriteProducts(userId, limit = 3) {
    return mobileModules.getFavoriteProducts(userId, limit);
  }

  static async getPopularProducts(limit = 5) {
    return mobileModules.getPopularProducts(limit);
  }

  static async getFastProducts(limit = 5) {
    return mobileModules.getFastProducts(limit);
  }

  static getOrderDisplayName(order) {
    return mobileModules.getOrderDisplayName(order);
  }

  // Keyboard services - klaviatura xizmatlari
  static async getQuickOrderKeyboard(telegramId) {
    return mobileModules.getQuickOrderKeyboard(telegramId);
  }

  static getDefaultQuickOrderKeyboard() {
    return mobileModules.getDefaultQuickOrderKeyboard();
  }

  static getMobileCategoriesKeyboard(categories) {
    return mobileModules.getMobileCategoriesKeyboard(categories);
  }

  static getMobileProductKeyboard(product, categoryId, userId = null) {
    return mobileModules.getMobileProductKeyboard(product, categoryId, userId);
  }

  static getMobileCartKeyboard(cart) {
    return mobileModules.getMobileCartKeyboard(cart);
  }

  static getOrderNavigationKeyboard(currentPage, totalPages, baseCallback) {
    return mobileModules.getOrderNavigationKeyboard(currentPage, totalPages, baseCallback);
  }

  static getConfirmationKeyboard(confirmCallback, cancelCallback, confirmText = '✅ Tasdiqlash', cancelText = '❌ Bekor qilish') {
    return mobileModules.getConfirmationKeyboard(confirmCallback, cancelCallback, confirmText, cancelText);
  }

  // UI utilities - UI yordamchi funksiyalar
  static formatMobileText(text, maxLineLength = 35) {
    return mobileModules.formatMobileText(text, maxLineLength);
  }

  static getProgressIndicator(currentStep, totalSteps, labels = []) {
    return mobileModules.getProgressIndicator(currentStep, totalSteps, labels);
  }
}

module.exports = MobileUXService;