/**
 * Product Handlers - Main Entry Point
 * Mahsulot handlerlari - asosiy kirish nuqtasi
 * 
 * Bu fayl barcha mahsulot operatsiyalarini import qilib, bitta interfeys taqdim etadi
 */

// Import from modules
const productModules = require('./productModules');

// Re-export as class for backward compatibility
class ProductHandlers {
  // Display operations
  static async showCategoryProducts(ctx, categoryId, page = 1) {
    return productModules.showCategoryProducts(ctx, categoryId, page);
  }

  static async showProductDetails(ctx, productId) {
    return productModules.showProductDetails(ctx, productId);
  }

  // Cart operations
  static async addToCart(ctx, productId) {
    return productModules.addToCart(ctx, productId);
  }

  static async checkProductAvailability(productId) {
    return productModules.checkProductAvailability(productId);
  }

  // Search operations
  static async searchProducts(searchTerm) {
    return productModules.searchProducts(searchTerm);
  }

  static async getPriceRange(categoryId = null) {
    return productModules.getPriceRange(categoryId);
  }
}

// Export class for backward compatibility
module.exports = ProductHandlers;