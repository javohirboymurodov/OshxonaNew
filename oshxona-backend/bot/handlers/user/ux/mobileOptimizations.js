const { User, Order, Product, Cart } = require('../../../../models');
const Favorite = require('../../../../models/Favorite');

class MobileUXService {
  // Quick order - tezkor buyurtma (mobile optimized)
  static async getQuickOrderKeyboard(telegramId) {
    try {
      const user = await User.findOne({ telegramId });
      if (!user) {
        return this.getDefaultQuickOrderKeyboard();
      }

      const recentOrders = await this.getRecentOrders(user._id, 2);
      const favoriteProducts = await this.getFavoriteProducts(user._id, 3);
      
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

  static async getRecentOrders(userId, limit = 2) {
    try {
      const orders = await Order.find({ 
        user: userId,
        status: { $in: ['delivered', 'completed'] }
      })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('items.product', 'name')
        .lean();
      
      return orders.map(order => ({
        _id: order._id,
        orderId: order.orderId,
        total: order.total || 0,
        name: this.getOrderDisplayName(order)
      }));
    } catch (error) {
      console.error('Get recent orders error:', error);
      return [];
    }
  }

  static async getFavoriteProducts(userId, limit = 3) {
    try {
      const favorites = await Favorite.find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('product', 'name price isActive isAvailable')
        .lean();
      
      return favorites
        .map(fav => fav.product)
        .filter(product => product && product.isActive && product.isAvailable);
    } catch (error) {
      console.error('Get favorite products error:', error);
      return [];
    }
  }

  static getOrderDisplayName(order) {
    if (!order.items || order.items.length === 0) {
      return `Buyurtma #${order.orderId || 'N/A'}`;
    }

    const firstItem = order.items[0];
    const itemName = firstItem.productName || firstItem.product?.name || 'Mahsulot';
    
    if (order.items.length === 1) {
      return `${itemName} x${firstItem.quantity}`;
    } else {
      return `${itemName} +${order.items.length - 1} ta`;
    }
  }

  // Mobile-optimized category grid
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

  // Mobile-optimized product display
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

  // Mobile-optimized cart display
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

  // Swipe-like navigation for orders
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

  // Touch-friendly confirmation dialogs
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

  // Popular products for quick order
  static async getPopularProducts(limit = 5) {
    try {
      // Get most ordered products
      const popularProducts = await Order.aggregate([
        { $match: { status: { $in: ['delivered', 'completed'] } } },
        { $unwind: '$items' },
        { 
          $group: { 
            _id: '$items.product', 
            orderCount: { $sum: '$items.quantity' },
            productName: { $first: '$items.productName' }
          } 
        },
        { $sort: { orderCount: -1 } },
        { $limit: limit },
        {
          $lookup: {
            from: 'products',
            localField: '_id',
            foreignField: '_id',
            as: 'product'
          }
        },
        { $unwind: '$product' },
        { $match: { 'product.isActive': true, 'product.isAvailable': true } }
      ]);

      return popularProducts.map(item => ({
        _id: item._id,
        name: item.product.name,
        price: item.product.price,
        orderCount: item.orderCount
      }));
    } catch (error) {
      console.error('Get popular products error:', error);
      return [];
    }
  }

  // Fast preparation products
  static async getFastProducts(limit = 5) {
    try {
      // Get products marked as fast or from fast categories
      const fastProducts = await Product.find({
        isActive: true,
        isAvailable: true,
        $or: [
          { preparationTime: { $lte: 15 } }, // 15 minutes or less
          { tags: { $in: ['fast', 'quick', 'tez'] } }
        ]
      })
        .limit(limit)
        .sort({ preparationTime: 1, createdAt: -1 })
        .lean();

      return fastProducts;
    } catch (error) {
      console.error('Get fast products error:', error);
      return [];
    }
  }

  // Format text for mobile screens (shorter lines)
  static formatMobileText(text, maxLineLength = 35) {
    if (!text || text.length <= maxLineLength) return text;
    
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    for (const word of words) {
      if ((currentLine + ' ' + word).length <= maxLineLength) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    
    if (currentLine) lines.push(currentLine);
    return lines.join('\n');
  }

  // Progress indicator for multi-step processes
  static getProgressIndicator(currentStep, totalSteps, labels = []) {
    const progress = [];
    
    for (let i = 1; i <= totalSteps; i++) {
      if (i < currentStep) {
        progress.push('✅');
      } else if (i === currentStep) {
        progress.push('🔄');
      } else {
        progress.push('⭕');
      }
      
      if (labels[i - 1]) {
        progress.push(labels[i - 1]);
      }
    }
    
    return progress.join(' ');
  }
}

module.exports = MobileUXService;