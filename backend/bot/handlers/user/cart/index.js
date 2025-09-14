/**
 * Cart Module Index
 * Savat modullarini birlashtirish
 */

const handlers = require('./cartHandlers');

module.exports = {
  // Main handlers
  addToCart: handlers.addToCart,
  updateQuantity: handlers.updateQuantity,
  removeFromCart: handlers.removeFromCart,
  showCart: handlers.showCart,
  clearCart: handlers.clearCart
};