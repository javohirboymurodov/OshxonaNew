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
  bot.action(/^(change_qty|cart_qty)_(.+)_(-?\d+)$/, updateQuantity);
  
  // FIXED: More specific patterns to avoid hijacking remove_favorite_*
  bot.action(/^remove_cart_(.+)$/, removeFromCart);
  bot.action(/^remove_from_cart_(.+)$/, removeFromCart);
  // REMOVED: bot.action(/^remove_(.+)$/, removeFromCart); // ❌ BU HIJACK QILARDI
  
  bot.action('clear_cart', clearCart);

  console.log('✅ Cart callbacks registered (fixed patterns)');
}

module.exports = { registerCartCallbacks };