// 🛒 CART ACTIONS
const {
  addToCart,
  updateQuantity,
  removeFromCart,
  showCart,
  clearCart
} = require('../../handlers/user/cart');

function registerCartCallbacks(bot) {
  // ========================================
  // 🛒 CART ACTIONS
  // ========================================

  // Support both add_to_cart_<productId> and add_cart_<productId>_<qty>
  bot.action(/^add_to_cart_(.+)$/, addToCart);
  bot.action(/^add_cart_(.+)_(\d+)$/, addToCart);

  // Support change_qty_ and cart_qty_ patterns
  bot.action(/^change_qty_(.+)_([+-])$/, updateQuantity);
  bot.action(/^cart_qty_(.+)_([+-])$/, updateQuantity);
  bot.action(/^remove_(.+)$/, removeFromCart);
  bot.action('clear_cart', clearCart);

  console.log('✅ Cart callbacks registered');
}

module.exports = { registerCartCallbacks };