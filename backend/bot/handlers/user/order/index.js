// User Order Handlers Main Export
const OrderFlow = require('./orderFlow');
const PaymentFlow = require('./paymentFlow');
const BaseHandler = require('../../../../utils/BaseHandler');
const { askPhoneInlineKeyboard, requestPhoneReplyKeyboard } = require('../../../user/keyboards');

// Import modules
const orderModules = require('./modules');

/**
 * Unified User Order Handlers Export
 * Bu fayl eski order.js ni almashtiradi
 */
class UserOrderHandlers extends BaseHandler {
  // ===============================
  // ORDER FLOW METHODS
  // ===============================
  
  static async startOrder(ctx) {
    return OrderFlow.startOrder(ctx);
  }

  // ===============================
  // PHONE REQUEST (shared)
  // ===============================

  static async askForPhone(ctx) {
    return orderModules.askForPhone(ctx);
  }

  static async handleOrderType(ctx) {
    return OrderFlow.handleOrderType(ctx);
  }

  static async handleDineInPreorder(ctx) {
    return OrderFlow.handleDineInPreorder(ctx);
  }

  static async askForBranchSelection(ctx, forType) {
    return OrderFlow.askForBranchSelection(ctx, forType);
  }

  static async handleChooseBranch(ctx) {
    return OrderFlow.handleChooseBranch(ctx);
  }

  // ===============================
  // PAYMENT FLOW METHODS
  // ===============================
  
  static async askForPaymentMethod(ctx) {
    return PaymentFlow.askForPaymentMethod(ctx);
  }

  static async handlePaymentMethod(ctx, method) {
    return PaymentFlow.handlePaymentMethod(ctx, method);
  }

  static async finalizeOrder(ctx) {
    return PaymentFlow.finalizeOrder(ctx);
  }

  static async confirmOrder(ctx) {
    return PaymentFlow.finalizeOrder(ctx);
  }

  // ===============================
  // TIME SELECTION METHODS
  // ===============================
  
  static async handleArrivalTime(ctx) {
    return orderModules.handleArrivalTime(ctx);
  }

  // ===============================
  // DINE-IN METHODS
  // ===============================
  
  static async handleDineInQR(ctx, tableNumber, branchId) {
    try {
      console.log('🍽️ Processing QR table order:', { tableNumber, branchId });
      
      const telegramId = ctx.from.id;
      const { User, Branch, Table } = require('../../../../models');
      
      // User ma'lumotlarini olish
      const user = await User.findOne({ telegramId });
      if (!user) {
        console.log('❌ User not found for telegramId:', telegramId);
        return ctx.reply('❌ Avval ro\'yxatdan o\'ting!');
      }

      // Telefon raqami tekshiruvi
      if (!user.phone) {
        console.log('❌ User has no phone number');
        const { askPhoneInlineKeyboard, requestPhoneReplyKeyboard } = require('../../../user/keyboards');
        const msg = `📱 QR kod orqali buyurtma berish uchun telefon raqamingiz kerak.\nTelefon raqamingizni ulashing.`;
        await ctx.reply(msg, askPhoneInlineKeyboard());
        try {
          await ctx.reply('👇 Pastdagi tugma orqali telefon raqamingizni ulashing:', requestPhoneReplyKeyboard());
        } catch {}
        return;
      }

      // Filial mavjudligini tekshirish
      const branch = await Branch.findById(branchId);
      if (!branch) {
        console.log('❌ Branch not found:', branchId);
        return ctx.reply('❌ Filial topilmadi!');
      }

      // Stol mavjudligini tekshirish
      const table = await Table.findOne({ 
        number: parseInt(tableNumber), 
        branch: branchId,
        isActive: true 
      });
      
      if (!table) {
        console.log('❌ Table not found:', { tableNumber, branchId });
        // Stol mavjud bo'lmasa ham davom etamiz, chunki ba'zi joylar stolni dinamik yaratadi
        console.log('⚠️ Table not in database, continuing with dynamic table handling');
      }

      // Session ma'lumotlarini saqlash
      ctx.session = ctx.session || {};
      ctx.session.orderType = 'table'; // QR kod orqali stol buyurtmasi
      ctx.session.orderData = {
        orderType: 'table',
        branchId: branchId,
        tableNumber: tableNumber,
        userId: user._id,
        tableQR: true, // QR kod orqali kelganini belgilash
        branch: branchId // Branch ma'lumotini ham saqlaymiz
      };

      console.log('✅ QR session data saved:', ctx.session.orderData);

      // QR kod orqali kelganda to'g'ridan-to'g'ri kategoriyalarni ko'rsatamiz
      const welcomeMsg = `🍽️ **${branch.name || branch.title}** filialiga xush kelibsiz!\n\n` +
        `🪑 **Stol:** ${tableNumber}\n` +
        `👋 **Salom, ${user.firstName}!**\n\n`;

      // Xush kelibsiz xabari yuboramiz
      await ctx.reply(welcomeMsg, { parse_mode: 'Markdown' });

      // To'g'ridan-to'g'ri kategoriyalarni ko'rsatamiz
      try {
        const CatalogHandlers = require('../catalog/index');
        await CatalogHandlers.showCategories(ctx);
      } catch (catalogError) {
        console.error('❌ Error showing categories:', catalogError);
        // Fallback - agar kategoriya ko'rsatish ishlamasa, asl tugmalarni ko'rsatamiz
        await ctx.reply('Mahsulotlarni tanlang:', {
          reply_markup: {
            inline_keyboard: [
              [{ text: '🍽️ Tezkor buyurtma', callback_data: 'quick_order' }],
              [
                { text: '🛒 Katalog', callback_data: 'show_catalog' },
                { text: '🎉 Aksiyalar', callback_data: 'show_promotions' }
              ],
              [{ text: '🛒 Savat', callback_data: 'show_cart' }],
              [{ text: '📋 Mening buyurtmalarim', callback_data: 'my_orders' }],
              [{ text: '🏠 Bosh sahifa', callback_data: 'back_to_main' }]
            ]
          }
        });
      }

      console.log('✅ QR categories shown successfully');
      
    } catch (error) {
      console.error('❌ handleDineInQR error:', error);
      await ctx.reply('❌ QR kod orqali buyurtma berishda xatolik yuz berdi! Qaytadan urinib ko\'ring.');
    }
  }

  static async handleDineInTableInput(ctx) {
    return orderModules.handleDineInTableInput(ctx);
  }

  static async handleDineInArrived(ctx) {
    return orderModules.handleDineInArrived(ctx);
  }

  // ===============================
  // LOCATION METHODS
  // ===============================
  
  static async processLocation(ctx, latitude, longitude) {
    return orderModules.processLocation(ctx, latitude, longitude);
  }

  static async findNearestBranch(lat, lon) {
    return orderModules.findNearestBranch(lat, lon);
  }

  // ===============================
  // ORDER TRACKING METHODS
  // ===============================
  
  static async trackOrder(ctx, orderId) {
    try {
      const { Order } = require('../../../../models');
      const order = await Order.findById(orderId)
        .populate('user', 'firstName lastName phone telegramId')
        .populate('deliveryInfo.courier', 'firstName lastName phone')
        .populate('branch', 'name title address');
      
      if (!order) {
        return ctx.reply('❌ Buyurtma topilmadi!');
      }

      const statusMessages = {
        'pending': '⏳ Kutilmoqda',
        'confirmed': '✅ Tasdiqlandi',
        'ready': '🍽️ Tayyor',
        'assigned': '🚚 Kuryer tayinlandi',
        'on_delivery': '🚗 Yetkazilmoqda',
        'delivered': '✅ Yetkazildi',
        'picked_up': '📦 Olib ketildi',
        'completed': '🎉 Yakunlandi',
        'cancelled': '❌ Bekor qilindi'
      };

      const statusText = statusMessages[order.status] || order.status;
      const orderTypeText = {
        'delivery': 'Yetkazib berish',
        'pickup': 'Olib ketish',
        'dine_in': 'Restoranda',
        'table': 'Stol buyurtmasi'
      }[order.orderType] || order.orderType;

      let message = `📋 **Buyurtma kuzatuvi**\n\n`;
      message += `🆔 **Raqam:** #${order.orderId}\n`;
      message += `📊 **Holat:** ${statusText}\n`;
      message += `🍽️ **Turi:** ${orderTypeText}\n`;
      message += `💰 **Jami:** ${order.total.toLocaleString()} so'm\n`;
      message += `📅 **Sana:** ${order.createdAt.toLocaleString('uz-UZ')}\n\n`;

      if (order.orderType === 'delivery' && order.deliveryInfo?.courier) {
        message += `🚚 **Kuryer:** ${order.deliveryInfo.courier.firstName} ${order.deliveryInfo.courier.lastName}\n`;
        message += `📞 **Telefon:** ${order.deliveryInfo.courier.phone}\n`;
      }

      if (order.branch) {
        message += `🏪 **Filial:** ${order.branch.name || order.branch.title}\n`;
      }

      message += `\n🛒 **Buyurtma tarkibi:**\n`;
      if (order.items && order.items.length > 0) {
        order.items.forEach((item, index) => {
          message += `${index + 1}. ${item.productName || 'Mahsulot'} x ${item.quantity} = ${item.totalPrice.toLocaleString()} so'm\n`;
        });
      }

      await ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔄 Yangilash', callback_data: `track_order_${orderId}` }],
            [{ text: '📋 Barcha buyurtmalar', callback_data: 'my_orders' }],
            [{ text: '🔙 Orqaga', callback_data: 'start_order' }]
          ]
        }
      });

    } catch (error) {
      console.error('❌ Track order error:', error);
      await ctx.reply('❌ Buyurtmani kuzatishda xatolik yuz berdi!');
    }
  }

  // ===============================
  // UTILITY METHODS
  // ===============================
  
  static calculateDistance(lat1, lon1, lat2, lon2) {
    return orderModules.calculateDistance(lat1, lon1, lat2, lon2);
  }

  static deg2rad(deg) {
    return orderModules.deg2rad(deg);
  }
}

module.exports = UserOrderHandlers;