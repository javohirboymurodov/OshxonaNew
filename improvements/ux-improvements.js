// Yaxshilangan foydalanuvchi interfeysi
const mongoose = require('mongoose');
const { mainMenuKeyboard } = require('../keyboards/userKeyboards');
const { Order, Product, Cart, User } = require('../models');
const Favorite = require('../models/Favorite');

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
        [{ text: '🔙 Asosiy menyu', callback_data: 'back_to_main' }]
      ]
    };
    
    return keyboard;
  }

  static async getRecentOrders(telegramId, limit = 3) {
    try {
      const user = await User.findOne({ telegramId });
      if (!user) return [];
      const orders = await Order.find({ user: user._id })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
      // Enrich with display name
      return orders.map((o) => ({
        _id: o._id,
        orderId: o.orderId,
        total: o.total || o.subtotal || 0,
        name: (o.items && o.items.length > 0)
          ? `${o.items[0].productName}${o.items.length > 1 ? ' +' + (o.items.length - 1) : ''}`
          : `Buyurtma ${o.orderId}`
      }));
    } catch (e) {
      return [];
    }
  }

  static async getFavoriteProducts(telegramId, limit = 5) {
    try {
      const user = await User.findOne({ telegramId });
      if (!user) return [];
      const favs = await Favorite.find({ user: user._id })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('product', 'name price isActive isAvailable')
        .lean();
      return favs
        .map((f) => f.product)
        .filter(Boolean);
    } catch (e) {
      return [];
    }
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
    const user = await User.findById(userId).lean();
    const preferences = { favoriteProducts: [] };
    
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

  static async popularProductsKeyboard(limit = 8) {
    const products = await Product.aggregate([
      { $match: { isActive: true, isAvailable: true } },
      { $addFields: { score: { $add: [
        { $multiply: [{ $ifNull: ['$stats.orderCount', 0] }, 0.6] },
        { $multiply: [{ $ifNull: ['$stats.viewCount', 0] }, 0.3] },
        { $multiply: [{ $ifNull: ['$rating', 0] }, 0.1] }
      ] } } },
      { $sort: { score: -1 } },
      { $limit: limit }
    ]);
    const keyboard = {
      inline_keyboard: products.map(p => ([
        { text: `${p.name} – ${Number(p.price || 0).toLocaleString()} so'm`, callback_data: `quick_add_${p._id}` }
      ])).concat([[{ text: '🔙 Asosiy menyu', callback_data: 'back_to_main' }]])
    };
    return keyboard;
  }

  static async fastProductsKeyboard(limit = 8, maxMinutes = 15) {
    const products = await Product.find({
      isActive: true, isAvailable: true,
      preparationTime: { $lte: maxMinutes }
    }).sort({ preparationTime: 1, createdAt: -1 }).limit(limit).lean();
    const keyboard = {
      inline_keyboard: products.map(p => ([
        { text: `${p.name} – ${Number(p.price || 0).toLocaleString()} so'm (${p.preparationTime || 10} daq)`, callback_data: `quick_add_${p._id}` }
      ])).concat([[{ text: '🔙 Asosiy menyu', callback_data: 'back_to_main' }]])
    };
    return keyboard;
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
