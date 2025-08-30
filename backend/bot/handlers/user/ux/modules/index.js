/**
 * Mobile UX Modules - Central Export
 * Mobil UX modullari - markaziy export
 * 
 * Bu fayl barcha mobil UX operatsiyalarini bitta joydan export qiladi
 */

const MobileDataService = require('./dataService');
const MobileKeyboardService = require('./keyboardService');
const MobileUIUtils = require('./uiUtils');

module.exports = {
  // Data services - ma'lumot xizmatlari
  getRecentOrders: MobileDataService.getRecentOrders,
  getFavoriteProducts: MobileDataService.getFavoriteProducts,
  getPopularProducts: MobileDataService.getPopularProducts,
  getFastProducts: MobileDataService.getFastProducts,
  getOrderDisplayName: MobileDataService.getOrderDisplayName,
  
  // Keyboard services - klaviatura xizmatlari
  getQuickOrderKeyboard: MobileKeyboardService.getQuickOrderKeyboard,
  getDefaultQuickOrderKeyboard: MobileKeyboardService.getDefaultQuickOrderKeyboard,
  getMobileCategoriesKeyboard: MobileKeyboardService.getMobileCategoriesKeyboard,
  getMobileProductKeyboard: MobileKeyboardService.getMobileProductKeyboard,
  getMobileCartKeyboard: MobileKeyboardService.getMobileCartKeyboard,
  getOrderNavigationKeyboard: MobileKeyboardService.getOrderNavigationKeyboard,
  getConfirmationKeyboard: MobileKeyboardService.getConfirmationKeyboard,
  
  // UI utilities - UI yordamchi funksiyalar
  formatMobileText: MobileUIUtils.formatMobileText,
  getProgressIndicator: MobileUIUtils.getProgressIndicator,
  
  // Direct access to classes - to'g'ridan-to'g'ri kirish
  Data: MobileDataService,
  Keyboard: MobileKeyboardService,
  UI: MobileUIUtils
};