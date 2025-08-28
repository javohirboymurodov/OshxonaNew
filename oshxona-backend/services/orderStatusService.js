// Centralized Order Status Management Service
const { Order } = require('../models');
const SocketManager = require('../config/socketConfig');

class OrderStatusService {
  // Valid status transitions
  static statusFlow = {
    'pending': ['confirmed', 'cancelled'],
    'confirmed': ['assigned', 'preparing', 'cancelled'],
    'assigned': ['on_delivery', 'cancelled'],
    'preparing': ['ready', 'cancelled'], 
    'ready': ['assigned', 'delivered'],
    'on_delivery': ['delivered', 'cancelled'],
    'delivered': [],
    'cancelled': []
  };

  // Status display names in Uzbek
  static statusNames = {
    'pending': '⏳ Kutilmoqda',
    'confirmed': '✅ Tasdiqlandi',
    'assigned': '🚚 Kuryer tayinlandi',
    'preparing': '👨‍🍳 Tayyorlanmoqda',
    'ready': '🎯 Tayyor',
    'on_delivery': '🚗 Yetkazilmoqda',
    'delivered': '✅ Yetkazildi',
    'cancelled': '❌ Bekor qilindi'
  };

  /**
   * Update order status with validation and notifications
   * @param {string} orderId - Order ID
   * @param {string} newStatus - New status
   * @param {Object} details - Additional details (message, updatedBy, etc.)
   * @returns {Promise<Object>} Updated order
   */
  static async updateStatus(orderId, newStatus, details = {}) {
    try {
      console.log(`🔄 STATUS UPDATE: ${orderId} -> ${newStatus}`, details);

      // Find order
      const order = await Order.findById(orderId)
        .populate('user', 'firstName lastName phone telegramId')
        .populate('deliveryInfo.courier', 'firstName lastName phone telegramId')
        .populate('branch', 'name address phone');

      if (!order) {
        throw new Error('Order not found');
      }

      const currentStatus = order.status;

      // Validate transition
      if (!this.isValidTransition(currentStatus, newStatus)) {
        throw new Error(`Invalid status transition: ${currentStatus} -> ${newStatus}`);
      }

      // Update order
      order.status = newStatus;
      order.updatedAt = new Date();

      // Add to status history
      order.statusHistory = order.statusHistory || [];
      order.statusHistory.push({
        status: newStatus,
        message: details.message || this.statusNames[newStatus],
        timestamp: new Date(),
        updatedBy: details.updatedBy || null
      });

      // Save order
      await order.save();

      // Send real-time notifications
      await this.sendNotifications(order, newStatus, details);

      // Real-time tracking lifecycle management
      try {
        const RealTimeTrackingManager = require('./realTimeTrackingManager');
        await RealTimeTrackingManager.onOrderStatusChange(orderId, currentStatus, newStatus, {
          order: order.toObject(),
          total: order.total,
          orderType: order.orderType
        });
      } catch (trackingError) {
        console.error('❌ Real-time tracking update error:', trackingError);
      }

      console.log(`✅ Status updated successfully: ${orderId} -> ${newStatus}`);
      return order;

    } catch (error) {
      console.error('❌ Status update error:', error);
      throw error;
    }
  }

  /**
   * Check if status transition is valid
   */
  static isValidTransition(currentStatus, newStatus) {
    if (!currentStatus || !newStatus) return false;
    if (currentStatus === newStatus) return true; // Allow same status
    
    const allowedTransitions = this.statusFlow[currentStatus] || [];
    return allowedTransitions.includes(newStatus);
  }

  /**
   * Send notifications for status changes
   */
  static async sendNotifications(order, newStatus, details) {
    try {
      // 1. Real-time admin panel notification
      if (order.branch) {
        SocketManager.emitOrderStatusUpdateToBranch(order.branch._id || order.branch, {
          orderId: order._id,
          status: newStatus,
          statusName: this.statusNames[newStatus],
          updatedAt: new Date(),
          details
        });
      }

      // 2. Customer notification via bot
      if (order.user?.telegramId && this.shouldNotifyCustomer(newStatus)) {
        await this.sendCustomerNotification(order, newStatus, details);
      }

      // 3. Courier notification if needed
      if (order.deliveryInfo?.courier?.telegramId && this.shouldNotifyCourier(newStatus)) {
        await this.sendCourierNotification(order, newStatus, details);
      }

    } catch (error) {
      console.error('❌ Notification error:', error);
    }
  }

  /**
   * Check if customer should be notified
   */
  static shouldNotifyCustomer(status) {
    return ['confirmed', 'ready', 'on_delivery', 'delivered'].includes(status);
  }

  /**
   * Check if courier should be notified
   */
  static shouldNotifyCourier(status) {
    return ['assigned'].includes(status);
  }

  /**
   * Send customer notification
   */
  static async sendCustomerNotification(order, status, details) {
    const bot = global.botInstance;
    if (!bot) return;

    const messages = {
      confirmed: `✅ **Buyurtmangiz qabul qilindi!**\n\n📋 Buyurtma: #${order.orderId}\n⏱️ Tayyorlash vaqti: ~${details.prepTime || 20} daqiqa`,
      ready: `🎯 **Buyurtmangiz tayyor!**\n\n📋 Buyurtma: #${order.orderId}`,
      on_delivery: `🚗 **Kuryeringiz yo'lda!**\n\n📋 Buyurtma: #${order.orderId}`,
      delivered: `✅ **Buyurtmangiz yetkazildi!**\n\n📋 Buyurtma: #${order.orderId}\n\n🙏 Xizmatimizdan foydalanganingiz uchun rahmat!`
    };

    const message = messages[status];
    if (message) {
      try {
        await bot.telegram.sendMessage(order.user.telegramId, message, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '📋 Kuzatuv', callback_data: `track_${order._id}` }],
              [{ text: '🏠 Bosh menyu', callback_data: 'back_to_main' }]
            ]
          }
        });
      } catch (error) {
        console.error('Customer notification error:', error);
      }
    }
  }

  /**
   * Send courier notification  
   */
  static async sendCourierNotification(order, status, details) {
    const bot = global.botInstance;
    if (!bot || !order.deliveryInfo?.courier?.telegramId) return;

    if (status === 'assigned') {
      try {
        await bot.telegram.sendMessage(
          order.deliveryInfo.courier.telegramId,
          `🚚 **Yangi buyurtma tayinlandi**\n\n#${order.orderId} – ${order.total?.toLocaleString() || 0} so'm`,
          {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: '✅ Qabul qilaman', callback_data: `courier_accept_${order._id}` }],
                [{ text: '❌ Rad etaman', callback_data: `courier_cancel_${order._id}` }]
              ]
            }
          }
        );
      } catch (error) {
        console.error('Courier notification error:', error);
      }
    }
  }

  /**
   * Get status display name
   */
  static getStatusName(status) {
    return this.statusNames[status] || status;
  }

  /**
   * Get valid next statuses
   */
  static getValidNextStatuses(currentStatus) {
    return this.statusFlow[currentStatus] || [];
  }
}

module.exports = OrderStatusService;