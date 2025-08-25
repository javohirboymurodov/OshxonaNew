// Real-time order tracking service
const EventEmitter = require('events');
const { Order, User } = require('../models');
const SocketManager = require('../config/socketConfig');

class OrderTrackingService extends EventEmitter {
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
    console.log(`📋 Order tracking started: ${orderId}`);
  }

  // Holat o'zgarishini broadcast qilish
  async updateOrderStatus(orderId, newStatus, details = {}) {
    try {
      const order = await Order.findById(orderId).populate('user');
      if (!order) {
        console.error(`❌ Order not found: ${orderId}`);
        return;
      }

      // Update order status in database
      order.status = newStatus;
      order.statusHistory = order.statusHistory || [];
      order.statusHistory.push({
        status: newStatus,
        timestamp: new Date(),
        details
      });
      await order.save();

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
      
      // Admin panelni yangilash (Socket.IO)
      this.emit('statusChanged', { orderId, newStatus, details, order });
      
      // Socket.IO orqali real-time yangilanish
      if (SocketManager.io) {
        // Admin panelga yangilanish
        if (order.branch) {
          SocketManager.emitOrderUpdate(orderId, {
            status: newStatus,
            orderId,
            details,
            branchId: order.branch.toString(),
            timestamp: new Date()
          });
        }
        
        // Foydalanuvchiga yangilanish
        if (order.user) {
          SocketManager.emitStatusUpdate(order.user._id.toString(), {
            orderId,
            status: newStatus,
            details,
            timestamp: new Date()
          });
        }
      }

      // If order is completed, remove from active tracking
      if (['delivered', 'completed', 'cancelled'].includes(newStatus)) {
        this.activeOrders.delete(orderId);
        console.log(`✅ Order tracking completed: ${orderId}`);
      }

    } catch (error) {
      console.error('❌ Order status update error:', error);
    }
  }

  // Mijozga push notification
  async notifyCustomer(order, status, details) {
    const bot = global.botInstance;
    if (!bot || !order.user || !order.user.telegramId) return;

    const messages = {
      confirmed: {
        text: '✅ <b>Buyurtmangiz qabul qilindi!</b>\n\n📋 Buyurtma: #{orderId}\n⏱️ Tayyorlash vaqti: ~{prepTime} daqiqa\n\n🔥 Oshpazlarimiz ishni boshladi!',
        buttons: [
          [{ text: '📍 Kuzatish', callback_data: `track_${order._id}` }],
          [{ text: '🏠 Bosh menyu', callback_data: 'back_to_main' }]
        ]
      },
      preparing: {
        text: '👨‍🍳 <b>Buyurtmangiz tayyorlanmoqda</b>\n\n🔥 Oshpazlarimiz ishlamoqda!\n⏰ Taxminiy vaqt: {remainingTime} daqiqa\n\n📦 Buyurtma: #{orderId}',
        buttons: [
          [{ text: '⏱️ Vaqtni ko\'rish', callback_data: `track_${order._id}` }],
          [{ text: '🏠 Bosh menyu', callback_data: 'back_to_main' }]
        ]
      },
      ready: {
        text: '🎯 <b>Buyurtmangiz tayyor!</b>\n\n{deliveryMessage}\n📞 Aloqa: {phone}\n📦 Buyurtma: #{orderId}',
        buttons: [
          [{ text: '📱 Qo\'ng\'iroq qilish', url: `tel:${process.env.RESTAURANT_PHONE || '+998901234567'}` }],
          [{ text: '🏠 Bosh menyu', callback_data: 'back_to_main' }]
        ]
      },
      on_delivery: {
        text: '🚚 <b>Buyurtmangiz yo\'lda!</b>\n\n🏃‍♂️ Kuryer: {courierName}\n📱 Telefon: {courierPhone}\n📍 Live location kuzatishingiz mumkin\n\n📦 Buyurtma: #{orderId}',
        buttons: [
          [{ text: '📍 Kuryer location', callback_data: `courier_location_${order._id}` }],
          [{ text: '📱 Kuryer bilan aloqa', url: `tel:${details.courierPhone || '+998901234567'}` }],
          [{ text: '🏠 Bosh menyu', callback_data: 'back_to_main' }]
        ]
      },
      delivered: {
        text: '✅ <b>Buyurtma yetkazildi!</b>\n\n🙏 Xizmatimizdan mamnun bo\'ldingizmi?\n⭐ Baho va fikr bildiring\n\n📦 Buyurtma: #{orderId}\n💰 Jami: {total} so\'m',
        buttons: [
          [{ text: '⭐ Baho berish', callback_data: `rate_${order._id}` }],
          [{ text: '🛒 Qayta buyurtma', callback_data: 'reorder_' + order._id }],
          [{ text: '🏠 Bosh menyu', callback_data: 'back_to_main' }]
        ]
      },
      cancelled: {
        text: '❌ <b>Buyurtma bekor qilindi</b>\n\n😔 Uzr so\'raymiz!\nAgar to\'lov qilingan bo\'lsa, pul qaytariladi.\n\n📦 Buyurtma: #{orderId}',
        buttons: [
          [{ text: '🆘 Yordam', callback_data: 'contact' }],
          [{ text: '🛒 Yangi buyurtma', callback_data: 'start_order' }],
          [{ text: '🏠 Bosh menyu', callback_data: 'back_to_main' }]
        ]
      }
    };

    const messageData = messages[status];
    if (!messageData) return;

    let text = messageData.text
      .replace('{orderId}', order.orderId || order._id.toString().slice(-6).toUpperCase())
      .replace('{prepTime}', details.prepTime || 20)
      .replace('{remainingTime}', details.remainingTime || 15)
      .replace('{courierName}', details.courierName || 'Kuryer')
      .replace('{courierPhone}', details.courierPhone || 'Noma\'lum')
      .replace('{phone}', process.env.RESTAURANT_PHONE || '+998901234567')
      .replace('{total}', order.total ? order.total.toLocaleString() : '0');

    if (status === 'ready') {
      const deliveryMessage = order.orderType === 'delivery' 
        ? '🚚 Kuryer tez orada jo\'naydi'
        : '🏃 Olib ketish uchun tayyor';
      text = text.replace('{deliveryMessage}', deliveryMessage);
    }

    const keyboard = {
      inline_keyboard: messageData.buttons
    };

    try {
      await bot.telegram.sendMessage(order.user.telegramId, text, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });
      console.log(`📱 Notification sent to user ${order.user.telegramId} for order ${order._id}`);
    } catch (error) {
      console.error('❌ Customer notification error:', error);
    }
  }

  // Kuryer lokatsiyasini yangilash
  async updateCourierLocation(courierId, latitude, longitude) {
    try {
      const courier = await User.findById(courierId);
      if (!courier || courier.role !== 'courier') {
        console.error(`❌ Courier not found or invalid role: ${courierId}`);
        return;
      }

      // Update courier location
      courier.courierInfo.currentLocation = {
        latitude,
        longitude,
        updatedAt: new Date()
      };
      await courier.save();

      // Find active orders for this courier
      const activeOrders = await Order.find({
        courier: courierId,
        status: 'on_delivery'
      }).populate('user');

      // Emit location update for all active orders
      activeOrders.forEach(order => {
        this.emit('courierLocationUpdate', {
          orderId: order._id,
          courierId,
          location: { latitude, longitude },
          timestamp: new Date()
        });
        
        // Socket.IO orqali real-time kuryer lokatsiyasi
        if (SocketManager.io) {
          SocketManager.emitCourierLocation(order._id.toString(), {
            latitude,
            longitude,
            courierId,
            courierName: `${courier.firstName} ${courier.lastName || ''}`.trim(),
            timestamp: new Date()
          });
          
          // Admin panelga kuryer lokatsiyasi
          if (order.branch) {
            SocketManager.emitCourierLocationToBranch(order.branch.toString(), {
              courierId,
              firstName: courier.firstName,
              lastName: courier.lastName,
              phone: courier.phone,
              location: { latitude, longitude },
              isOnline: courier.courierInfo.isOnline,
              isAvailable: courier.courierInfo.isAvailable,
              updatedAt: new Date()
            });
          }
        }
      });

      console.log(`📍 Courier location updated: ${courierId} (${latitude}, ${longitude})`);
    } catch (error) {
      console.error('❌ Courier location update error:', error);
    }
  }

  // Buyurtma tracking ma'lumotlarini olish
  async getOrderTracking(orderId) {
    try {
      const order = await Order.findById(orderId)
        .populate('user', 'firstName lastName phone')
        .populate('courier', 'firstName lastName phone courierInfo')
        .populate('branch', 'name address phone');

      if (!order) return null;

      const tracking = this.activeOrders.get(orderId) || { events: [] };
      
      return {
        orderId: order._id,
        orderNumber: order.orderId,
        status: order.status,
        orderType: order.orderType,
        total: order.total,
        createdAt: order.createdAt,
        customer: {
          name: `${order.user.firstName} ${order.user.lastName || ''}`.trim(),
          phone: order.user.phone
        },
        courier: order.courier ? {
          name: `${order.courier.firstName} ${order.courier.lastName || ''}`.trim(),
          phone: order.courier.phone,
          location: order.courier.courierInfo?.currentLocation
        } : null,
        branch: order.branch ? {
          name: order.branch.name,
          address: order.branch.address,
          phone: order.branch.phone
        } : null,
        timeline: order.statusHistory || [],
        estimatedDelivery: this.calculateEstimatedDelivery(order),
        isActive: ['pending', 'confirmed', 'preparing', 'ready', 'on_delivery'].includes(order.status)
      };
    } catch (error) {
      console.error('❌ Get order tracking error:', error);
      return null;
    }
  }

  // Tahmini yetkazib berish vaqtini hisoblash
  calculateEstimatedDelivery(order) {
    if (!order || order.status === 'delivered' || order.status === 'cancelled') {
      return null;
    }

    const baseTime = {
      pickup: 20, // 20 minutes
      delivery: 35, // 35 minutes
      dine_in: 25, // 25 minutes
      dine_in_qr: 20 // 20 minutes
    };

    const prepTime = baseTime[order.orderType] || 30;
    const estimatedTime = new Date(order.createdAt.getTime() + prepTime * 60 * 1000);
    
    return {
      estimatedMinutes: prepTime,
      estimatedTime,
      remainingMinutes: Math.max(0, Math.ceil((estimatedTime - new Date()) / (60 * 1000)))
    };
  }

  // Admin uchun barcha faol buyurtmalarni olish
  getActiveOrders() {
    return Array.from(this.activeOrders.entries()).map(([orderId, data]) => ({
      orderId,
      ...data
    }));
  }

  // Cleanup function for old orders
  cleanupOldOrders() {
    const now = new Date();
    const cutoff = 24 * 60 * 60 * 1000; // 24 hours

    for (const [orderId, data] of this.activeOrders.entries()) {
      if (now - data.startTime > cutoff) {
        this.activeOrders.delete(orderId);
        console.log(`🧹 Cleaned up old order tracking: ${orderId}`);
      }
    }
  }
}

// Singleton instance
const orderTracker = new OrderTrackingService();

// Cleanup old orders every hour
setInterval(() => {
  orderTracker.cleanupOldOrders();
}, 60 * 60 * 1000);

module.exports = orderTracker;