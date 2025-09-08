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
        'preparing': '👨‍🍳 Tayyorlanmoqda',
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