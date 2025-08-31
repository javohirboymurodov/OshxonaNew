/**
 * Mobile UX Service - Main Entry Point
 * Mobil UX xizmati - asosiy kirish nuqtasi
 * 
 * Bu fayl barcha mobil UX operatsiyalarini import qilib, bitta interfeys taqdim etadi
 */

const MobileDataService = require('./modules/dataService');
const MobileKeyboardService = require('./modules/keyboardService');
const MobileUIUtils = require('./modules/uiUtils');

/**
 * Mobile UX Service Class
 * Mobil foydalanuvchi tajribasi xizmati
 */
class MobileUXService {
  // Data services - ma'lumot xizmatlari
  static async getRecentOrders(userId, limit = 2) {
    return MobileDataService.getRecentOrders(userId, limit);
  }

  static async getFavoriteProducts(userId, limit = 3) {
    return MobileDataService.getFavoriteProducts(userId, limit);
  }

  static async getPopularProducts(limit = 5) {
    return MobileDataService.getPopularProducts(limit);
  }

  static async getFastProducts(limit = 5) {
    return MobileDataService.getFastProducts(limit);
  }

  static getOrderDisplayName(order) {
    return MobileDataService.getOrderDisplayName(order);
  }

  // Keyboard services - klaviatura xizmatlari
  static async getQuickOrderKeyboard(telegramId) {
    return MobileKeyboardService.getQuickOrderKeyboard(telegramId);
  }

  static getDefaultQuickOrderKeyboard() {
    return MobileKeyboardService.getDefaultQuickOrderKeyboard();
  }

  static getMobileCategoriesKeyboard(categories) {
    return MobileKeyboardService.getMobileCategoriesKeyboard(categories);
  }

  static getMobileProductKeyboard(product, categoryId, userId = null) {
    return MobileKeyboardService.getMobileProductKeyboard(product, categoryId, userId);
  }

  static getMobileCartKeyboard(cart) {
    return MobileKeyboardService.getMobileCartKeyboard(cart);
  }

  static getOrderNavigationKeyboard(currentPage, totalPages, baseCallback) {
    return MobileKeyboardService.getOrderNavigationKeyboard(currentPage, totalPages, baseCallback);
  }

  static getConfirmationKeyboard(confirmCallback, cancelCallback, confirmText = '✅ Tasdiqlash', cancelText = '❌ Bekor qilish') {
    return MobileKeyboardService.getConfirmationKeyboard(confirmCallback, cancelCallback, confirmText, cancelText);
  }

  // UI utilities - UI yordamchi funksiyalar
  static formatMobileText(text, maxLineLength = 35) {
    return MobileUIUtils.formatMobileText(text, maxLineLength);
  }

  static getProgressIndicator(currentStep, totalSteps, labels = []) {
    return MobileUIUtils.getProgressIndicator(currentStep, totalSteps, labels);
  }
}

module.exports = MobileUXService;