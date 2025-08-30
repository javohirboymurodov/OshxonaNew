const { User } = require('../../../../../models');
const MobileDataService = require('./dataService');

/**
 * Mobile Keyboard Service
 * Mobil klaviatura xizmati
 */

class MobileKeyboardService {
  /**
   * Tezkor buyurtma klaviaturasini olish
   * @param {number} telegramId - Telegram ID
   * @returns {Object} - klaviatura obyekti
   */
  static async getQuickOrderKeyboard(telegramId) {
    try {
      const user = await User.findOne({ telegramId });
      if (!user) {
        return this.getDefaultQuickOrderKeyboard();
      }

      const recentOrders = await MobileDataService.getRecentOrders(user._id, 2);
      const favoriteProducts = await MobileDataService.getFavoriteProducts(user._id, 3);
      
      const keyboard = {
        inline_keyboard: [
          // Quick actions - larger touch targets
          [
            { text: '🔥 Eng mashhur', callback_data: 'quick_popular' },
            { text: '⚡ Tez tayyor', callback_data: 'quick_fast' }
          ]
        ]
      };

      // Recent orders (max 2 for mobile)
      if (recentOrders.length > 0) {
        keyboard.inline_keyboard.push([
          { text: '📋 Oxirgi buyurtmalar:', callback_data: 'noop' }
        ]);
        
        recentOrders.forEach(order => {
          keyboard.inline_keyboard.push([
            { 
              text: `🔄 ${order.name} - ${order.total.toLocaleString()} so'm`, 
              callback_data: `reorder_${order._id}` 
            }
          ]);
        });
      }

      // Favorite products (max 3 for mobile)
      if (favoriteProducts.length > 0) {
        keyboard.inline_keyboard.push([
          { text: '❤️ Sevimli mahsulotlar:', callback_data: 'noop' }
        ]);
        
        favoriteProducts.forEach(product => {
          keyboard.inline_keyboard.push([
            { 
              text: `❤️ ${product.name} - ${product.price.toLocaleString()} so'm`, 
              callback_data: `quick_add_${product._id}` 
            }
          ]);
        });
      }

      // Navigation buttons
      keyboard.inline_keyboard.push([
        { text: '🛍️ To\'liq katalog', callback_data: 'show_categories' }
      ]);
      keyboard.inline_keyboard.push([
        { text: '🔙 Asosiy menyu', callback_data: 'back_to_main' }
      ]);
      
      return keyboard;
    } catch (error) {
      console.error('Quick order keyboard error:', error);
      return this.getDefaultQuickOrderKeyboard();
    }
  }

  /**
   * Standart tezkor buyurtma klaviaturasi
   * @returns {Object} - klaviatura obyekti
   */
  static getDefaultQuickOrderKeyboard() {
    return {
      inline_keyboard: [
        [
          { text: '🔥 Eng mashhur', callback_data: 'quick_popular' },
          { text: '⚡ Tez tayyor', callback_data: 'quick_fast' }
        ],
        [{ text: '🛍️ To\'liq katalog', callback_data: 'show_categories' }],
        [{ text: '🔙 Asosiy menyu', callback_data: 'back_to_main' }]
      ]
    };
  }

  /**
   * Mobil kategoriyalar klaviaturasi
   * @param {Array} categories - kategoriyalar ro'yxati
   * @returns {Object} - klaviatura obyekti
   */
  static getMobileCategoriesKeyboard(categories) {
    const keyboard = {
      inline_keyboard: []
    };

    // Group categories in pairs for mobile screens
    for (let i = 0; i < categories.length; i += 2) {
      const row = [];
      
      const category1 = categories[i];
      row.push({
        text: `${category1.emoji || '📂'} ${category1.name}`,
        callback_data: `category_${category1.id || category1._id}`
      });
      
      if (categories[i + 1]) {
        const category2 = categories[i + 1];
        row.push({
          text: `${category2.emoji || '📂'} ${category2.name}`,
          callback_data: `category_${category2.id || category2._id}`
        });
      }
      
      keyboard.inline_keyboard.push(row);
    }

    // Quick actions row
    keyboard.inline_keyboard.push([
      { text: '🛒 Savat', callback_data: 'show_cart' },
      { text: '⚡ Tezkor', callback_data: 'quick_order' }
    ]);

    // Navigation
    keyboard.inline_keyboard.push([
      { text: '🔙 Asosiy menyu', callback_data: 'back_to_main' }
    ]);

    return keyboard;
  }

  /**
   * Mobil mahsulot klaviaturasi
   * @param {Object} product - mahsulot obyekti
   * @param {string} categoryId - kategoriya ID
   * @param {string} userId - foydalanuvchi ID
   * @returns {Object} - klaviatura obyekti
   */
  static getMobileProductKeyboard(product, categoryId, userId = null) {
    const keyboard = {
      inline_keyboard: [
        // Quick add buttons with different quantities
        [
          { text: '➕ 1 ta', callback_data: `add_cart_${product._id}_1` },
          { text: '➕ 2 ta', callback_data: `add_cart_${product._id}_2` },
          { text: '➕ 3 ta', callback_data: `add_cart_${product._id}_3` }
        ],
        [
          { text: '🛒 Savatga qo\'shish', callback_data: `add_to_cart_${product._id}` }
        ]
      ]
    };

    // Add to favorites button if user is available
    if (userId) {
      keyboard.inline_keyboard.push([
        { text: '❤️ Sevimlilarga qo\'shish', callback_data: `add_favorite_${product._id}` }
      ]);
    }

    // Navigation
    keyboard.inline_keyboard.push([
      { text: '🔙 Kategoriyaga qaytish', callback_data: `category_${categoryId}` }
    ]);

    return keyboard;
  }

  /**
   * Mobil savat klaviaturasi
   * @param {Object} cart - savat obyekti
   * @returns {Object} - klaviatura obyekti
   */
  static getMobileCartKeyboard(cart) {
    const keyboard = {
      inline_keyboard: []
    };

    // Cart items (simplified for mobile)
    cart.items.forEach((item, index) => {
      if (index < 5) { // Limit items shown for mobile
        const productId = typeof item.product === 'object' ? item.product._id : item.product;
        keyboard.inline_keyboard.push([
          { text: '➖', callback_data: `cart_qty_${productId}_${item.quantity - 1}` },
          { text: `${item.quantity} x ${item.productName}`, callback_data: 'noop' },
          { text: '➕', callback_data: `cart_qty_${productId}_${item.quantity + 1}` }
        ]);
      }
    });

    if (cart.items.length > 5) {
      keyboard.inline_keyboard.push([
        { text: `... va yana ${cart.items.length - 5} ta mahsulot`, callback_data: 'noop' }
      ]);
    }

    // Action buttons
    keyboard.inline_keyboard.push([
      { text: '📝 Buyurtma berish', callback_data: 'checkout' }
    ]);

    keyboard.inline_keyboard.push([
      { text: '🛍️ Davom etish', callback_data: 'show_categories' },
      { text: '🗑️ Tozalash', callback_data: 'clear_cart' }
    ]);

    keyboard.inline_keyboard.push([
      { text: '🔙 Asosiy menyu', callback_data: 'back_to_main' }
    ]);

    return keyboard;
  }

  /**
   * Sahifa navigatsiya klaviaturasi
   * @param {number} currentPage - joriy sahifa
   * @param {number} totalPages - jami sahifalar
   * @param {string} baseCallback - asosiy callback
   * @returns {Object} - klaviatura obyekti
   */
  static getOrderNavigationKeyboard(currentPage, totalPages, baseCallback) {
    const keyboard = {
      inline_keyboard: []
    };

    if (totalPages > 1) {
      const nav = [];
      
      if (currentPage > 1) {
        nav.push({ text: '⬅️ Oldingi', callback_data: `${baseCallback}_${currentPage - 1}` });
      }
      
      nav.push({ text: `${currentPage}/${totalPages}`, callback_data: 'noop' });
      
      if (currentPage < totalPages) {
        nav.push({ text: 'Keyingi ➡️', callback_data: `${baseCallback}_${currentPage + 1}` });
      }
      
      keyboard.inline_keyboard.push(nav);
    }

    return keyboard;
  }

  /**
   * Tasdiqlash klaviaturasi
   * @param {string} confirmCallback - tasdiqlash callback
   * @param {string} cancelCallback - bekor qilish callback
   * @param {string} confirmText - tasdiqlash matni
   * @param {string} cancelText - bekor qilish matni
   * @returns {Object} - klaviatura obyekti
   */
  static getConfirmationKeyboard(confirmCallback, cancelCallback, confirmText = '✅ Tasdiqlash', cancelText = '❌ Bekor qilish') {
    return {
      inline_keyboard: [
        [
          { text: confirmText, callback_data: confirmCallback },
          { text: cancelText, callback_data: cancelCallback }
        ]
      ]
    };
  }
}

module.exports = MobileKeyboardService;