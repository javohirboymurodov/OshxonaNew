const SocketManager = require('../config/socketConfig');
const { Order } = require('../models');

class RealTimeTrackingManager {
  /**
   * Start real-time tracking for an order (Integrated with existing OrderTrackingService)
   */
  static async startTracking(orderId, userId, options = {}) {
    try {
      const { source = 'tracking', features = ['status', 'courier', 'time'] } = options;
      
      // Use existing OrderTrackingService for core functionality
      const orderTracker = require('./orderTrackingService');
      orderTracker.trackOrder(orderId, userId);
      
      const trackingSession = {
        orderId: orderId,
        userId: userId,
        source: source,
        features: features,
        startTime: Date.now(),
        isActive: true,
        lastActivity: Date.now(),
        integratedWith: 'OrderTrackingService'
      };

      // Store enhanced session data using singleton
      const SingletonManager = require('../utils/SingletonManager');
      const trackingSessions = SingletonManager.getTrackingSessions();
      trackingSessions.set(`${orderId}:${userId}`, trackingSession);

      console.log('✅ Enhanced tracking started (integrated):', { orderId, userId, source });

      // Emit tracking started event
      SocketManager.emitToUser(userId, 'tracking_session_started', {
        orderId: orderId,
        message: 'Real-time kuzatuv faollashtirildi',
        features: features,
        enhanced: true
      });

      return trackingSession;
    } catch (error) {
      console.error('❌ Start tracking error:', error);
      return null;
    }
  }

  /**
   * Stop real-time tracking for an order (Integrated cleanup)
   */
  static async stopTracking(orderId, reason = 'manual_stop') {
    try {
      console.log('🛑 Stopping enhanced tracking for order:', orderId, 'Reason:', reason);

      // Also cleanup from existing OrderTrackingService
      const orderTracker = require('./orderTrackingService');
      if (orderTracker.activeOrders && orderTracker.activeOrders.has(orderId)) {
        orderTracker.activeOrders.delete(orderId);
        console.log('✅ Cleaned up from OrderTrackingService active orders');
      }

      const SingletonManager = require('../utils/SingletonManager');
      const trackingSessions = SingletonManager.getTrackingSessions();
      const sessionsToStop = [];

      // Find all sessions for this order
      for (const [key, session] of trackingSessions.entries()) {
        if (session.orderId === orderId) {
          sessionsToStop.push({ key, session });
        }
      }

      // Stop each session
      for (const { key, session } of sessionsToStop) {
        await this.stopTrackingSession(session, reason);
        trackingSessions.delete(key);
      }

      console.log(`✅ Stopped ${sessionsToStop.length} enhanced tracking sessions for order ${orderId}`);
      return sessionsToStop.length;

    } catch (error) {
      console.error('❌ Stop tracking error:', error);
      return 0;
    }
  }

  /**
   * Stop individual tracking session
   */
  static async stopTrackingSession(session, reason) {
    try {
      const { userId, orderId, source } = session;
      const duration = Date.now() - session.startTime;

      // Notify user about tracking end
      const reasonMessages = {
        'order_completed': 'Buyurtma yakunlandi',
        'order_cancelled': 'Buyurtma bekor qilindi', 
        'order_delivered': 'Buyurtma yetkazildi',
        'manual_stop': 'Kuzatuv to\'xtatildi',
        'session_timeout': 'Sessiya vaqti tugadi'
      };

      SocketManager.emitToUser(userId, 'tracking_session_ended', {
        orderId: orderId,
        reason: reason,
        message: reasonMessages[reason] || 'Kuzatuv tugadi',
        duration: Math.floor(duration / 1000 / 60) // minutes
      });

      // Archive tracking data if needed
      await this.archiveTrackingData(session, reason, duration);

      console.log('✅ Tracking session stopped:', { userId, orderId, reason, duration });

    } catch (error) {
      console.error('❌ Stop tracking session error:', error);
    }
  }

  /**
   * Handle order status changes (Enhanced with UI cleanup)
   */
  static async onOrderStatusChange(orderId, oldStatus, newStatus, orderData = {}) {
    try {
      console.log('📊 Order status changed:', { orderId, oldStatus, newStatus });

      // Check if order is now completed
      const completedStatuses = ['delivered', 'completed', 'cancelled'];
      if (completedStatuses.includes(newStatus)) {
        const reason = newStatus === 'cancelled' ? 'order_cancelled' : 
                      newStatus === 'delivered' ? 'order_delivered' : 'order_completed';
        
        // Stop tracking and cleanup UI
        await this.stopTracking(orderId, reason);
        
        // Send final completion message with cleaned UI
        await this.sendCompletionMessage(orderId, newStatus, orderData);
        return;
      }

      // Update active tracking sessions with new status
      await this.broadcastStatusUpdate(orderId, newStatus, orderData);

    } catch (error) {
      console.error('❌ Order status change handler error:', error);
    }
  }

  /**
   * Broadcast status update to active tracking sessions
   */
  static async broadcastStatusUpdate(orderId, newStatus, orderData = {}) {
    try {
      global.activeTrackingSessions = global.activeTrackingSessions || new Map();
      
      const statusEmojis = {
        pending: '⏳ Kutilmoqda',
        confirmed: '✅ Tasdiqlandi',
        assigned: '🚚 Kuryer tayinlandi',
        preparing: '👨‍🍳 Tayyorlanmoqda', 
        ready: '🎯 Tayyor',
        on_delivery: '🚗 Yetkazilmoqda'
      };

      const statusText = statusEmojis[newStatus] || newStatus;
      const updateMessage = `📊 Buyurtma holati yangilandi: ${statusText}`;

      // Find and notify active sessions
      for (const [key, session] of global.activeTrackingSessions.entries()) {
        if (session.orderId === orderId && session.isActive) {
          // Update last activity
          session.lastActivity = Date.now();

          // Send real-time update
          SocketManager.emitToUser(session.userId, 'order_status_update', {
            orderId: orderId,
            status: newStatus,
            statusText: statusText,
            message: updateMessage,
            timestamp: new Date().toISOString(),
            orderData: orderData
          });

          console.log('📡 Status update sent to user:', session.userId);
        }
      }

    } catch (error) {
      console.error('❌ Broadcast status update error:', error);
    }
  }

  /**
   * Get active tracking sessions
   */
  static getActiveTracking() {
    global.activeTrackingSessions = global.activeTrackingSessions || new Map();
    return Array.from(global.activeTrackingSessions.values()).filter(session => session.isActive);
  }

  /**
   * Cleanup inactive sessions
   */
  static cleanupInactiveSessions() {
    try {
      global.activeTrackingSessions = global.activeTrackingSessions || new Map();
      const now = Date.now();
      const timeoutDuration = 2 * 60 * 60 * 1000; // 2 hours
      
      let cleanedCount = 0;
      
      for (const [key, session] of global.activeTrackingSessions.entries()) {
        if (now - session.lastActivity > timeoutDuration) {
          this.stopTrackingSession(session, 'session_timeout');
          global.activeTrackingSessions.delete(key);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        console.log(`🧹 Cleaned up ${cleanedCount} inactive tracking sessions`);
      }

    } catch (error) {
      console.error('❌ Cleanup inactive sessions error:', error);
    }
  }

  /**
   * Send completion message with clean interface
   */
  static async sendCompletionMessage(orderId, status, orderData) {
    try {
      console.log('📱 Sending completion message:', { orderId, status });

      const { Order } = require('../models');
      const order = await Order.findById(orderId).populate('user', 'telegramId');
      
      if (!order || !order.user?.telegramId) {
        console.log('❌ Order or user not found for completion message');
        return;
      }

      const statusMessages = {
        delivered: {
          title: '✅ Buyurtma yetkazildi!',
          emoji: '🎉',
          message: 'Xizmatimizdan foydalanganingiz uchun rahmat!'
        },
        completed: {
          title: '🎉 Buyurtma yakunlandi!',
          emoji: '✅',
          message: 'Buyurtmangiz muvaffaqiyatli yakunlandi.'
        },
        cancelled: {
          title: '❌ Buyurtma bekor qilindi',
          emoji: '😔',
          message: 'Buyurtmangiz bekor qilindi.'
        }
      };

      const statusInfo = statusMessages[status] || statusMessages.completed;
      
      let message = `${statusInfo.emoji} <b>${statusInfo.title}</b>\n\n`;
      message += `📦 Buyurtma: #${order.orderId}\n`;
      message += `💰 Jami: ${order.total?.toLocaleString() || 0} so'm\n`;
      message += `📅 Yakunlangan: ${new Date().toLocaleString('uz-UZ')}\n\n`;
      message += `${statusInfo.message}`;

      // Clean keyboard - only essential actions
      const keyboard = {
        inline_keyboard: []
      };

      if (status === 'delivered') {
        // Only show rating and reorder for delivered orders
        keyboard.inline_keyboard.push([
          { text: '⭐ Baho berish', callback_data: `rate_order_${orderId}` },
          { text: '🔄 Qayta buyurtma', callback_data: `reorder_${orderId}` }
        ]);
      } else if (status === 'completed') {
        // Show reorder for completed orders
        keyboard.inline_keyboard.push([
          { text: '🔄 Qayta buyurtma', callback_data: `reorder_${orderId}` }
        ]);
      }

      // Always show navigation
      keyboard.inline_keyboard.push([
        { text: '📋 Buyurtmalarim', callback_data: 'my_orders' },
        { text: '🏠 Bosh sahifa', callback_data: 'back_to_main' }
      ]);

      // Send clean completion message
      const bot = global.botInstance;
      if (bot) {
        await bot.telegram.sendMessage(order.user.telegramId, message, {
          parse_mode: 'HTML',
          reply_markup: keyboard
        });

        console.log('✅ Completion message sent with clean interface');
      }

    } catch (error) {
      console.error('❌ Send completion message error:', error);
    }
  }

  /**
   * Archive tracking data for analytics
   */
  static async archiveTrackingData(session, reason, duration) {
    try {
      // This could save to database for analytics
      const archiveData = {
        orderId: session.orderId,
        userId: session.userId,
        source: session.source,
        features: session.features,
        startTime: new Date(session.startTime),
        endTime: new Date(),
        duration: duration,
        endReason: reason,
        archivedAt: new Date()
      };

      // You can save to OrderTrackingLog collection or similar
      console.log('📦 Tracking data archived:', { orderId: session.orderId, duration, reason });

    } catch (error) {
      console.error('❌ Archive tracking data error:', error);
    }
  }

  /**
   * Initialize periodic cleanup
   */
  static startPeriodicCleanup() {
    // Cleanup every 30 minutes
    setInterval(() => {
      this.cleanupInactiveSessions();
    }, 30 * 60 * 1000);

    console.log('🔄 Periodic cleanup started for tracking sessions');
  }
}

module.exports = RealTimeTrackingManager;