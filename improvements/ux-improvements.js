// Yaxshilangan foydalanuvchi interfeysi
const { mainMenuKeyboard } = require('../keyboards/userKeyboards');

class UXImprovements {
  // Quick order - tezkor buyurtma
  static async quickOrderKeyboard(userId) {
    const recentOrders = await this.getRecentOrders(userId, 3);
    const favoriteProducts = await this.getFavoriteProducts(userId, 5);
    
    const keyboard = {
      inline_keyboard: [
        [{ text: '🔥 Eng mashhur', callback_data: 'quick_popular' }],
        [{ text: '⚡ Tez tayyorlanadigan', callback_data: 'quick_fast' }],
        // Oxirgi buyurtmalar
        ...recentOrders.map(order => ([
          { text: `🔄 ${order.name} (${order.total.toLocaleString()} so'm)`, 
            callback_data: `reorder_${order._id}` }
        ])),
        // Sevimli mahsulotlar
        ...favoriteProducts.map(product => ([
          { text: `❤️ ${product.name}`, callback_data: `quick_add_${product._id}` }
        ])),
        [{ text: '🛍️ To\'liq katalog', callback_data: 'show_categories' }],
        [{ text: '🏠 Bosh menyu', callback_data: 'back_to_main' }]
      ]
    };
    
    return keyboard;
  }

  // One-click reorder
  static async reorderPrevious(ctx, orderId) {
    try {
      const order = await Order.findById(orderId).populate('items.product');
      if (!order || order.user.toString() !== ctx.session.user._id.toString()) {
        return await ctx.answerCbQuery('Buyurtma topilmadi!');
      }

      const cart = new Cart({
        user: ctx.session.user._id,
        items: order.items.map(item => ({
          product: item.product._id,
          productName: item.productName,
          quantity: item.quantity,
          price: item.product.price, // Yangi narx
          totalPrice: item.quantity * item.product.price
        })),
        total: order.items.reduce((sum, item) => 
          sum + (item.quantity * item.product.price), 0)
      });

      await cart.save();
      
      await ctx.editMessageText(
        `✅ Oldingi buyurtma savatga qo'shildi!\n\n💰 Jami: ${cart.total.toLocaleString()} so'm\n\nBuyurtma berasizmi?`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '🛒 Savatni ko\'rish', callback_data: 'show_cart' }],
              [{ text: '📝 Buyurtma berish', callback_data: 'start_order' }],
              [{ text: '🔙 Ortga', callback_data: 'back_to_main' }]
            ]
          }
        }
      );
    } catch (error) {
      console.error('Reorder error:', error);
      await ctx.answerCbQuery('Xatolik yuz berdi!');
    }
  }

  // Smart recommendations
  static async getSmartRecommendations(userId, categoryId = null) {
    const user = await User.findById(userId).populate('orderHistory');
    const preferences = await this.analyzeUserPreferences(user);
    
    // Mashina o'rganish algoritmi (sodda versiya)
    const recommendations = await Product.aggregate([
      {
        $match: {
          isActive: true,
          isAvailable: true,
          ...(categoryId && { categoryId: mongoose.Types.ObjectId(categoryId) })
        }
      },
      {
        $addFields: {
          score: {
            $add: [
              { $multiply: ['$stats.orderCount', 0.4] },
              { $multiply: ['$rating', 0.3] },
              { $multiply: ['$stats.viewCount', 0.2] },
              { $cond: [
                { $in: ['$_id', preferences.favoriteProducts] }, 
                50, 0
              ] }
            ]
          }
        }
      },
      { $sort: { score: -1 } },
      { $limit: 8 }
    ]);

    return recommendations;
  }

  // Breadcrumb navigation
  static breadcrumbKeyboard(currentPath) {
    const paths = {
      'main': '🏠 Bosh sahifa',
      'categories': '📂 Kategoriyalar',
      'products': '🍽️ Mahsulotlar',
      'cart': '🛒 Savat',
      'order': '📝 Buyurtma'
    };

    const keyboard = [];
    const pathArray = currentPath.split('.');
    
    // Breadcrumb qatori
    if (pathArray.length > 1) {
      const breadcrumb = pathArray.map(path => paths[path] || path).join(' > ');
      keyboard.push([{ text: breadcrumb, callback_data: 'noop' }]);
    }

    return keyboard;
  }
}

module.exports = UXImprovements;
