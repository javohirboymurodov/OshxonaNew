/**
 * Mobile UX Modules - Central Export
 * Mobil UX modullari - markaziy export
 * 
 * Bu fayl barcha mobil UX operatsiyalarini bitta joydan export qiladi
 */

const MobileDataService = require('./dataService');
const MobileKeyboardService = require('./keyboardService');
const MobileUIUtils = require('./uiUtils');
const QuickOrderService = require('./quickOrderService');
const QuickAddService = require('./quickAddService');
const FavoritesService = require('./favoritesService');

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
  
  // Quick order services - tezkor buyurtma xizmatlari
  showQuickOrder: QuickOrderService.showQuickOrder,
  showPopularProducts: QuickOrderService.showPopularProducts,
  showFastProducts: QuickOrderService.showFastProducts,
  
  // Quick add services - tezkor qo'shish xizmatlari
  quickAddProduct: QuickAddService.quickAddProduct,
  
  // Favorites services - sevimlilar xizmatlari
  addToFavorites: FavoritesService.addToFavorites,
  showFavorites: FavoritesService.showFavorites,
  removeFromFavorites: FavoritesService.removeFromFavorites,
  
  // Direct access to classes - to'g'ridan-to'g'ri kirish
  Data: MobileDataService,
  Keyboard: MobileKeyboardService,
  UI: MobileUIUtils,
  QuickOrder: QuickOrderService,
  QuickAdd: QuickAddService,
  Favorites: FavoritesService
};