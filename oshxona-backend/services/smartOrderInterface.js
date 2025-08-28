const { Order } = require('../models');
const SocketManager = require('../config/socketConfig');

class SmartOrderInterface {
  // Order tracking phases
  static TRACKING_PHASES = {
    INACTIVE: 'inactive',
    ACTIVE: 'active', 
    HISTORICAL: 'historical'
  };

  // Status categorization
  static ACTIVE_STATUSES = ['pending', 'confirmed', 'preparing', 'ready', 'assigned', 'on_delivery'];
  static COMPLETED_STATUSES = ['delivered', 'completed', 'cancelled'];

  /**
   * Main entry point for showing order details
   * @param {Object} ctx - Telegraf context
   * @param {string} orderId - Order ID
   * @param {Object} options - Display options
   */
  static async showOrder(ctx, orderId, options = {}) {
    try {
      const {
        source = 'main',           // 'tracking' | 'my_orders' | 'main'
        preserveNavigation = true,  // Keep navigation context
        autoRefresh = null         // Auto-refresh interval (null = smart detection)
      } = options;

      console.log('🔍 SmartOrderInterface: Showing order', { orderId, source });

      // Get order with existing tracking data integration
      const orderTracker = require('./orderTrackingService');
      const trackingData = await orderTracker.getOrderTracking(orderId);
      
      const order = await Order.findById(orderId)
        .populate('user', 'firstName lastName phone telegramId')
        .populate('deliveryInfo.courier', 'firstName lastName phone courierInfo');

      if (!order) {
        return await ctx.answerCbQuery('❌ Buyurtma topilmadi');
      }

      // Determine tracking phase
      const trackingPhase = this.getTrackingPhase(order.status);
      console.log('📊 Order tracking phase:', trackingPhase);

      // Preserve navigation context
      if (preserveNavigation) {
        this.preserveNavigationContext(ctx, orderId, source);
      }

      // Render appropriate interface
      const interfaceConfig = this.buildInterfaceConfig(order, trackingPhase, source);
      
      await this.renderInterface(ctx, order, interfaceConfig);

      // Setup real-time tracking if needed
      if (trackingPhase === 'ACTIVE' && source === 'tracking') {
        this.setupRealTimeTracking(ctx, orderId);
      }

    } catch (error) {
      console.error('❌ SmartOrderInterface error:', error);
      await ctx.answerCbQuery('❌ Buyurtmani ko\'rsatishda xatolik');
    }
  }

  /**
   * Determine tracking phase based on order status
   */
  static getTrackingPhase(status) {
    if (this.ACTIVE_STATUSES.includes(status)) {
      return this.TRACKING_PHASES.ACTIVE;
    }
    if (this.COMPLETED_STATUSES.includes(status)) {
      return this.TRACKING_PHASES.HISTORICAL;
    }
    return this.TRACKING_PHASES.INACTIVE;
  }

  /**
   * Build interface configuration based on context
   */
  static buildInterfaceConfig(order, trackingPhase, source) {
    const isActive = trackingPhase === 'ACTIVE';
    const isCompleted = this.COMPLETED_STATUSES.includes(order.status);
    
    return {
      showRealTimeFeatures: isActive && source === 'tracking',
      showRefreshButton: isActive,
      showCourierTracking: isActive && order.orderType === 'delivery' && order.status === 'on_delivery',
      showStatusHistory: true,
      showActions: this.getAvailableActions(order, source),
      navigationContext: source,
      refreshInterval: isActive ? 30000 : null,
      // 🔒 PRIVACY CONTROLS
      showPersonalData: !isCompleted, // Hide personal data for completed orders
      showCourierPersonalData: !isCompleted, // Hide courier personal data for completed orders
      privacyLevel: isCompleted ? 'MINIMAL' : 'FULL'
    };
  }

  /**
   * Get available actions based on order state and context
   */
  static getAvailableActions(order, source) {
    const actions = [];
    
    // Cancel action for active orders
    if (this.ACTIVE_STATUSES.includes(order.status) && ['pending', 'confirmed'].includes(order.status)) {
      actions.push('cancel');
    }
    
    // Reorder action for completed orders
    if (this.COMPLETED_STATUSES.includes(order.status)) {
      actions.push('reorder');
    }
    
    // Rate action for delivered orders (only from my_orders)
    if (order.status === 'delivered' && source === 'my_orders') {
      actions.push('rate');
    }

    return actions;
  }

  /**
   * Render the order interface
   */
  static async renderInterface(ctx, order, config) {
    const message = this.buildMessage(order, config);
    const keyboard = this.buildKeyboard(order, config);

    try {
      if (ctx.callbackQuery) {
        await ctx.editMessageText(message, {
          parse_mode: 'HTML',
          reply_markup: keyboard
        });
      } else {
        await ctx.reply(message, {
          parse_mode: 'HTML', 
          reply_markup: keyboard
        });
      }
    } catch (error) {
      if (error.description?.includes('message is not modified')) {
        console.log('⚠️ Order message unchanged, skipping edit');
        await ctx.answerCbQuery();
      } else {
        console.error('❌ Interface render error:', error);
        await ctx.reply(message, {
          parse_mode: 'HTML',
          reply_markup: keyboard
        });
      }
    }
  }

  /**
   * Build order message content
   */
  static buildMessage(order, config) {
    const statusEmojis = {
      pending: '⏳ Kutilmoqda',
      confirmed: '✅ Tasdiqlandi',
      assigned: '🚚 Kuryer tayinlandi', 
      preparing: '👨‍🍳 Tayyorlanmoqda',
      ready: '🎯 Tayyor',
      on_delivery: '🚗 Yetkazilmoqda',
      delivered: '✅ Yetkazildi',
      completed: '🎉 Yakunlandi',
      cancelled: '❌ Bekor qilindi'
    };

    let message = `📋 <b>Buyurtma ${config.showRealTimeFeatures ? 'kuzatuvi' : 'ma\'lumotlari'}</b>\n\n`;
    message += `🔢 Raqam: #${order.orderId}\n`;
    message += `💰 Jami: ${order.total?.toLocaleString() || 0} so'm\n`;
    message += `📅 Vaqt: ${order.createdAt.toLocaleDateString('uz-UZ', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}\n\n`;

    message += `📊 <b>Hozirgi holat:</b> ${statusEmojis[order.status] || order.status}\n\n`;

    // Estimated time for active orders
    if (config.showRealTimeFeatures && this.ACTIVE_STATUSES.includes(order.status)) {
      const estimatedTime = this.calculateEstimatedTime(order);
      message += `⏰ <b>Tahminy vaqt:</b> ${estimatedTime} daqiqa\n\n`;
    }

    // Courier info for delivery orders (Enhanced with privacy controls)
    if (config.showCourierTracking && order.deliveryInfo?.courier) {
      const courier = order.deliveryInfo.courier;
      
      if (config.showCourierPersonalData) {
        // FULL MODE: Show all courier details during active delivery
        message += `🚚 <b>Kuryer:</b> ${courier.firstName} ${courier.lastName || ''}\n`;
        message += `📱 <b>Telefon:</b> ${courier.phone || 'Mavjud emas'}\n`;
        
        // Show live location info if available
        if (courier.courierInfo?.currentLocation) {
          const lastUpdate = new Date(courier.courierInfo.currentLocation.updatedAt);
          const minutesAgo = Math.floor((new Date() - lastUpdate) / (60 * 1000));
          message += `📍 <b>Lokatsiya:</b> Live tracking (${minutesAgo} daqiqa oldin)\n`;
        }
      } else {
        // MINIMAL MODE: Hide personal data for completed orders
        message += `🚚 <b>Kuryer:</b> Buyurtma yetkazildi\n`;
      }
      message += '\n';
    }

    // Customer info (with privacy controls)
    if (config.showPersonalData && order.user) {
      message += `👤 <b>Mijoz:</b> ${order.user.firstName} ${order.user.lastName || ''}\n`;
      if (order.user.phone) {
        message += `📱 <b>Telefon:</b> ${order.user.phone}\n`;
      }
      message += '\n';
    }

    // User delivery info (with privacy controls)
    if (order.orderType === 'delivery' && order.deliveryInfo) {
      if (config.showPersonalData) {
        // FULL MODE: Show delivery details during active orders
        if (order.deliveryInfo.address) {
          message += `📍 <b>Manzil:</b> ${order.deliveryInfo.address}\n`;
        }
        if (order.deliveryInfo.instructions) {
          message += `📝 <b>Izoh:</b> ${order.deliveryInfo.instructions}\n`;
        }
        message += '\n';
      }
      // MINIMAL MODE: No personal delivery data shown for completed orders
    }

    // Status history
    if (config.showStatusHistory && order.statusHistory?.length > 0) {
      message += `📈 <b>Buyurtma tarixi:</b>\n`;
      order.statusHistory.slice(-5).forEach(history => {
        const time = new Date(history.timestamp).toLocaleTimeString('uz-UZ', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        const statusText = statusEmojis[history.status] || history.status;
        message += `   ${time} - ${statusText}\n`;
      });
    }

    return message;
  }

  /**
   * Build interactive keyboard
   */
  static buildKeyboard(order, config) {
    const keyboard = { inline_keyboard: [] };

    // Real-time features for active orders (with privacy controls)
    if (config.showRealTimeFeatures) {
      if (config.showRefreshButton) {
        keyboard.inline_keyboard.push([
          { text: '🔄 Yangilash', callback_data: `smart_refresh_${order._id}` }
        ]);
      }
      
      if (config.showCourierTracking && config.showCourierPersonalData) {
        keyboard.inline_keyboard.push([
          { text: '📍 Kuryer lokatsiyasi', callback_data: `courier_location_${order._id}` }
        ]);
      }
    }

    // Action buttons
    const actionButtons = [];
    if (config.showActions.includes('cancel')) {
      actionButtons.push({ text: '❌ Bekor qilish', callback_data: `cancel_order_${order._id}` });
    }
    if (config.showActions.includes('reorder')) {
      actionButtons.push({ text: '🔄 Qayta buyurtma', callback_data: `reorder_${order._id}` });
    }
    if (config.showActions.includes('rate')) {
      actionButtons.push({ text: '⭐ Baholash', callback_data: `rate_order_${order._id}` });
    }
    
    if (actionButtons.length > 0) {
      keyboard.inline_keyboard.push(actionButtons);
    }

    // Navigation based on context
    const navigationButtons = [];
    switch (config.navigationContext) {
      case 'my_orders':
        navigationButtons.push({ text: '🔙 Buyurtmalarim', callback_data: 'my_orders' });
        break;
      case 'tracking':
        navigationButtons.push({ text: '🏠 Bosh sahifa', callback_data: 'back_to_main' });
        break;
      default:
        navigationButtons.push({ text: '🔙 Orqaga', callback_data: 'back_to_main' });
    }
    
    keyboard.inline_keyboard.push(navigationButtons);

    return keyboard;
  }

  /**
   * Calculate estimated delivery/preparation time (Real-time aware)
   */
  static calculateEstimatedTime(order) {
    const now = new Date();
    const orderTime = new Date(order.createdAt);
    const elapsedMinutes = Math.floor((now - orderTime) / (1000 * 60));
    
    // Status-based estimation
    switch (order.status) {
      case 'pending':
      case 'confirmed':
        return 25; // Initial preparation time
        
      case 'preparing':
        // Remaining preparation time
        return Math.max(10, 20 - elapsedMinutes);
        
      case 'ready':
        // Ready for pickup/delivery
        return order.orderType === 'delivery' ? 15 : 5;
        
      case 'assigned':
        // Courier assigned, preparing to leave
        return 10;
        
      case 'on_delivery':
        // Active delivery - real-time estimation based on courier
        if (order.deliveryInfo?.courier?.courierInfo?.currentLocation) {
          // TODO: Calculate real distance/time from courier to customer
          return 5; // Default 5 minutes when on delivery
        }
        return 8; // Fallback when no live location
        
      case 'delivered':
      case 'completed':
        return 0; // Order completed
        
      default:
        return 15; // Generic fallback
    }
  }

  /**
   * Preserve navigation context in session
   */
  static preserveNavigationContext(ctx, orderId, source) {
    ctx.session = ctx.session || {};
    ctx.session.orderContext = {
      orderId: orderId,
      source: source,
      timestamp: Date.now(),
      preservedAt: new Date().toISOString()
    };
  }

  /**
   * Setup real-time tracking for active orders (Integration with existing OrderTrackingService)
   */
  static setupRealTimeTracking(ctx, orderId) {
    try {
      // Use existing OrderTrackingService
      const orderTracker = require('./orderTrackingService');
      orderTracker.trackOrder(orderId, ctx.from.id);
      
      // Join order-specific room for real-time updates
      SocketManager.emitToUser(ctx.from.id, 'tracking_started', {
        orderId: orderId,
        message: 'Real-time kuzatuv boshlandi'
      });
      
      console.log('✅ Smart tracking integrated with existing OrderTrackingService:', orderId);
    } catch (error) {
      console.error('❌ Real-time tracking setup error:', error);
    }
  }

  /**
   * Smart refresh functionality
   */
  static async refreshOrder(ctx, orderId) {
    try {
      console.log('🔄 Smart refresh for order:', orderId);
      
      // Get preserved context
      const context = ctx.session?.orderContext;
      const source = context?.source || 'tracking';
      
      // Show order with preserved context
      await this.showOrder(ctx, orderId, { 
        source: source,
        preserveNavigation: false // Don't override existing context
      });
      
      await ctx.answerCbQuery('✅ Yangilandi');
      
    } catch (error) {
      console.error('❌ Smart refresh error:', error);
      await ctx.answerCbQuery('❌ Yangilashda xatolik');
    }
  }
}

module.exports = SmartOrderInterface;