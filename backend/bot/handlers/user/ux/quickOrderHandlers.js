/**
 * Quick Order Handlers - Main Entry Point
 * Tezkor buyurtma handlerlari - asosiy kirish nuqtasi
 * 
 * Bu fayl barcha tezkor buyurtma operatsiyalarini import qilib, bitta interfeys taqdim etadi
 */

// Import from modules
const uxModules = require('./modules');

/**
 * Quick Order Handlers Object
 * Tezkor buyurtma handlerlari obyekti
 */
const quickOrderHandlers = {
  // Quick order menu
  async showQuickOrder(ctx) {
    return uxModules.showQuickOrder(ctx);
  },

  // Popular products
  async showPopularProducts(ctx) {
    return uxModules.showPopularProducts(ctx);
  },

  // Fast products
  async showFastProducts(ctx) {
    return uxModules.showFastProducts(ctx);
  },

  // Quick add product
  async quickAddProduct(ctx) {
    return uxModules.quickAddProduct(ctx);
  },

  // Favorites management
  async addToFavorites(ctx) {
    return uxModules.addToFavorites(ctx);
  },

  async showFavorites(ctx) {
    return uxModules.showFavorites(ctx);
  },

  async removeFromFavorites(ctx) {
    return uxModules.removeFromFavorites(ctx);
  }
};

module.exports = quickOrderHandlers;