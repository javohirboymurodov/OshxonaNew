/**
 * Product Modules - Central Export
 * Mahsulot modullari - markaziy export
 * 
 * Bu fayl barcha mahsulot modullarini bitta joydan export qiladi
 */

const ProductDisplay = require('./productDisplay');
const ProductCart = require('./productCart');
const ProductSearch = require('./productSearch');
const utils = require('./utils');

module.exports = {
  // Display operations - ko'rsatish operatsiyalari
  showCategoryProducts: ProductDisplay.showCategoryProducts,
  showProductDetails: ProductDisplay.showProductDetails,
  
  // Cart operations - savat operatsiyalari
  addToCart: ProductCart.addToCart,
  checkProductAvailability: ProductCart.checkProductAvailability,
  
  // Search operations - qidiruv operatsiyalari
  searchProducts: ProductSearch.searchProducts,
  getPriceRange: ProductSearch.getPriceRange,
  
  // Utility functions - yordamchi funksiyalar
  buildAbsoluteImageUrl: utils.buildAbsoluteImageUrl,
  
  // Direct access to classes - to'g'ridan-to'g'ri kirish
  Display: ProductDisplay,
  Cart: ProductCart,
  Search: ProductSearch,
  utils: utils
};