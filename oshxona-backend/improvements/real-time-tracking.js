// Real-time order tracking
const EventEmitter = require('events');

class OrderTracker extends EventEmitter {
  constructor() {
    super();
    this.activeOrders = new Map();
  }

  // Buyurtma holatini real-time kuzatish
  trackOrder(orderId, userId) {
    this.activeOrders.set(orderId, {
      userId,
      startTime: new Date(),
      events: []
    });

    this.emit('orderStarted', { orderId, userId });
  }

  // Holat o'zgarishini broadcast qilish
  async updateOrderStatus(orderId, newStatus, details = {}) {
    const order = await Order.findById(orderId).populate('user');
    if (!order) return;

    const tracking = this.activeOrders.get(orderId);
    if (tracking) {
      tracking.events.push({
        status: newStatus,
        timestamp: new Date(),
        details
      });
    }

    // Mijozga xabar yuborish
    await this.notifyCustomer(order, newStatus, details);
    
    // Admin panelni yangilash
    this.emit('statusChanged', { orderId, newStatus, details });
  }

  // Mijozga push notification
  async notifyCustomer(order, status, details) {
    const bot = global.botInstance;
    if (!bot) return;

    const messages = {
      confirmed: {
        text: '✅ Buyurtmangiz qabul qilindi!\n\n📋 Buyurtma: #{orderId}\n⏱️ Tayyorlash vaqti: ~{prepTime} daqiqa',
        action: { text: '📍 Kuzatish', callback_data: `track_${order._id}` }
      },
      preparing: {
        text: '👨‍🍳 Buyurtmangiz tayyorlanmoqda\n\n🔥 Oshpazlarimiz ishlamoqda!\n⏰ Taxminiy vaqt: {remainingTime} daqiqa',
        action: { text: '⏱️ Vaqtni ko\'rish', callback_data: `time_${order._id}` }
      },
      ready: {
        text: '🎯 Buyurtmangiz tayyor!\n\n{deliveryMessage}\n📞 Aloqa: {phone}',
        action: { text: '📱 Qo\'ng\'iroq qilish', url: `tel:${process.env.RESTAURANT_PHONE}` }
      },
      on_delivery: {
        text: '🚚 Buyurtmangiz yo\'lda!\n\n🏃‍♂️ Kuryer: {courierName}\n📱 Telefon: {courierPhone}\n📍 Live location',
        action: { text: '📍 Kuryer location', callback_data: `courier_${order._id}` }
      },
      delivered: {
        text: '✅ Buyurtma yetkazildi!\n\n🙏 Xizmatimizdan mamnun bo\'ldingizmi?\n⭐ Baho va fikr bildiring',
        action: { text: '⭐ Baho berish', callback_data: `rate_${order._id}` }
      }
    };

    const messageData = messages[status];
    if (!messageData) return;

    let text = messageData.text
      .replace('{orderId}', order.orderId)
      .replace('{prepTime}', details.prepTime || 20)
      .replace('{remainingTime}', details.remainingTime || 15)
      .replace('{courierName}', details.courierName || 'Kuryer')
      .replace('{courierPhone}', details.courierPhone || 'Noma\'lum')
      .replace('{phone}', process.env.RESTAURANT_PHONE || '+998901234567');

    if (status === 'ready') {
      const deliveryMessage = order.orderType === 'delivery' 
        ? '🚚 Kuryer tez orada jo\'naydi'
        : '🏃 Olib ketish uchun tayyor';
      text = text.replace('{deliveryMessage}', deliveryMessage);
    }

    const keyboard = {
      inline_keyboard: [
        [messageData.action],
        [{ text: '🏠 Bosh menyu', callback_data: 'back_to_main' }]
      ]
    };

    try {
      await bot.telegram.sendMessage(order.user.telegramId, text, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });
    } catch (error) {
      console.error('Customer notification error:', error);
    }
  }

  // Live order tracking interface
  async getTrackingInfo(orderId) {
    const order = await Order.findById(orderId);
    const tracking = this.activeOrders.get(orderId);
    
    if (!order || !tracking) return null;

    const statusSteps = [
      { key: 'confirmed', name: '✅ Qabul qilindi', time: null },
      { key: 'preparing', name: '👨‍🍳 Tayyorlanmoqda', time: null },
      { key: 'ready', name: '🎯 Tayyor', time: null },
      { key: 'on_delivery', name: '🚚 Yo\'lda', time: null },
      { key: 'delivered', name: '✅ Yetkazildi', time: null }
    ];

    // Event vaqtlarini to'ldirish
    tracking.events.forEach(event => {
      const step = statusSteps.find(s => s.key === event.status);
      if (step) step.time = event.timestamp;
    });

    const currentStepIndex = statusSteps.findIndex(s => s.key === order.status);
    
    return {
      orderId: order.orderId,
      currentStatus: order.status,
      steps: statusSteps,
      progress: Math.round((currentStepIndex + 1) / statusSteps.length * 100),
      estimatedTime: this.calculateRemainingTime(order, tracking),
      courierInfo: order.deliveryInfo?.courier
    };
  }

  // Qolgan vaqtni hisoblash
  calculateRemainingTime(order, tracking) {
    const now = new Date();
    const orderTime = tracking.startTime;
    const elapsed = (now - orderTime) / 1000 / 60; // minutes

    const estimatedTimes = {
      confirmed: 5,
      preparing: 20,
      ready: 25,
      on_delivery: 40,
      delivered: 45
    };

    const targetTime = estimatedTimes[order.status] || 45;
    const remaining = Math.max(0, targetTime - elapsed);
    
    return Math.round(remaining);
  }

  // Kuryer lokatsiyasini kuzatish
  async trackCourierLocation(orderId, latitude, longitude) {
    const order = await Order.findById(orderId);
    if (!order || order.status !== 'on_delivery') return;

    // Lokatsiyani saqlash
    order.deliveryInfo.courierLocation = {
      latitude,
      longitude,
      timestamp: new Date()
    };
    await order.save();

    // Mijozga yangilangan lokatsiya yuborish
    if (order.user) {
      const bot = global.botInstance;
      await bot.telegram.sendLocation(
        order.user.telegramId,
        latitude,
        longitude,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '📞 Kuryer bilan bog\'lanish', url: `tel:${order.deliveryInfo.courier?.phone}` }]
            ]
          }
        }
      );
    }
  }
}

// Notification scheduler
class NotificationScheduler {
  constructor() {
    this.scheduledNotifications = new Map();
  }

  // Eslatma o'rnatish
  scheduleReminder(userId, message, delay) {
    const timeoutId = setTimeout(async () => {
      const bot = global.botInstance;
      if (bot) {
        try {
          await bot.telegram.sendMessage(userId, message);
        } catch (error) {
          console.error('Scheduled notification error:', error);
        }
      }
      this.scheduledNotifications.delete(userId);
    }, delay);

    this.scheduledNotifications.set(userId, timeoutId);
  }

  // Marketing notifications
  async sendPromotionalMessage(userIds, message, keyboard = null) {
    const bot = global.botInstance;
    if (!bot) return;

    const results = { sent: 0, failed: 0 };

    for (const userId of userIds) {
      try {
        await bot.telegram.sendMessage(userId, message, {
          parse_mode: 'HTML',
          reply_markup: keyboard
        });
        results.sent++;
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        results.failed++;
        console.error(`Failed to send to ${userId}:`, error);
      }
    }

    return results;
  }

  // Abandoned cart recovery
  async sendAbandonedCartReminder(userId, cartId) {
    const cart = await Cart.findById(cartId).populate('items.product');
    if (!cart || !cart.isActive) return;

    const message = `🛒 Savatingizda mahsulotlar qoldi!\n\n${cart.items.map(item => 
      `• ${item.productName} x${item.quantity}`
    ).join('\n')}\n\n💰 Jami: ${cart.total.toLocaleString()} so'm\n\n⏰ Buyurtma bermaysizmi?`;

    const keyboard = {
      inline_keyboard: [
        [{ text: '🛒 Savat', callback_data: 'show_cart' }],
        [{ text: '📝 Buyurtma berish', callback_data: 'start_order' }]
      ]
    };

    const bot = global.botInstance;
    try {
      await bot.telegram.sendMessage(userId, message, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });
    } catch (error) {
      console.error('Abandoned cart reminder error:', error);
    }
  }
}

module.exports = {
  OrderTracker: new OrderTracker(),
  NotificationScheduler: new NotificationScheduler()
};
