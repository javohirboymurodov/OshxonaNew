const { User } = require('../../../models');

/**
 * Courier-related callback handlers
 */
class CourierCallbacks {
  
  /**
   * Handle courier accepting an order
   */
  static async handleCourierAccept(ctx) {
    try {
      const match = ctx.callbackQuery?.data?.match(/^courier_accept_(.+)$/);
      if (!match) {
        await ctx.answerCbQuery('❌ Noto\'g\'ri format!');
        return;
      }

      const orderId = match[1];
      const user = await User.findOne({ telegramId: ctx.from.id });
      
      if (!user || user.role !== 'courier') {
        await ctx.answerCbQuery('❌ Siz kuryer emassiz!');
        return;
      }

      // Request location for order acceptance
      await ctx.reply('📍 Buyurtmani qabul qilish uchun joylashuvingizni yuboring:', {
        reply_markup: {
          keyboard: [[{ text: '📍 Joylashuvni yuborish', request_location: true }]],
          resize_keyboard: true,
          one_time_keyboard: true
        }
      });

      // Save to session
      ctx.session.waitingFor = 'courier_accept_location';
      ctx.session.courierOrderId = orderId;
      
    } catch (error) {
      console.error('Courier accept error:', error);
      await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  }

  /**
   * Handle courier picking up an order
   */
  static async handleCourierPickup(ctx) {
    try {
      const match = ctx.callbackQuery?.data?.match(/^courier_pickup_(.+)$/);
      if (!match) {
        await ctx.answerCbQuery('❌ Noto\'g\'ri format!');
        return;
      }

      const orderId = match[1];
      const user = await User.findOne({ telegramId: ctx.from.id });
      
      if (!user || user.role !== 'courier') {
        await ctx.answerCbQuery('❌ Siz kuryer emassiz!');
        return;
      }

      // Request location for order pickup
      await ctx.reply('📍 Buyurtmani olib ketish uchun joylashuvingizni yuboring:', {
        reply_markup: {
          keyboard: [[{ text: '📍 Joylashuvni yuborish', request_location: true }]],
          resize_keyboard: true,
          one_time_keyboard: true
        }
      });

      // Save to session
      ctx.session.waitingFor = 'courier_pickup_location';
      ctx.session.courierOrderId = orderId;
      
    } catch (error) {
      console.error('Courier pickup error:', error);
      await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  }

  /**
   * Handle courier delivering an order
   */
  static async handleCourierDelivered(ctx) {
    try {
      const match = ctx.callbackQuery?.data?.match(/^courier_delivered_(.+)$/);
      if (!match) {
        await ctx.answerCbQuery('❌ Noto\'g\'ri format!');
        return;
      }

      const orderId = match[1];
      const user = await User.findOne({ telegramId: ctx.from.id });
      
      if (!user || user.role !== 'courier') {
        await ctx.answerCbQuery('❌ Siz kuryer emassiz!');
        return;
      }

      // Request location for order delivery
      await ctx.reply('📍 Buyurtmani yetkazish uchun joylashuvingizni yuboring:', {
        reply_markup: {
          keyboard: [[{ text: '📍 Joylashuvni yuborish', request_location: true }]],
          resize_keyboard: true,
          one_time_keyboard: true
        }
      });

      // Save to session
      ctx.session.waitingFor = 'courier_delivered_location';
      ctx.session.courierOrderId = orderId;
      
    } catch (error) {
      console.error('Courier delivered error:', error);
      await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  }

  /**
   * Process courier location updates
   */
  static async processCourierLocation(ctx, location, actionType, orderId) {
    try {
      const { Order } = require('../../../models');
      const order = await Order.findById(orderId);
      
      if (!order) {
        await ctx.reply('❌ Buyurtma topilmadi');
        return;
      }

      // Update order status and courier location based on action type
      switch (actionType) {
        case 'accept':
          order.status = 'accepted';
          order.courierLocation = {
            latitude: location.latitude,
            longitude: location.longitude,
            timestamp: new Date()
          };
          await ctx.reply('✅ Buyurtma qabul qilindi!');
          break;
          
        case 'pickup':
          order.status = 'picked_up';
          order.courierLocation = {
            latitude: location.latitude,
            longitude: location.longitude,
            timestamp: new Date()
          };
          await ctx.reply('✅ Buyurtma olib ketildi!');
          break;
          
        case 'delivered':
          order.status = 'delivered';
          order.courierLocation = {
            latitude: location.latitude,
            longitude: location.longitude,
            timestamp: new Date()
          };
          order.deliveredAt = new Date();
          await ctx.reply('✅ Buyurtma yetkazildi!');
          break;
      }
      
      await order.save();
      
      // Clear session
      ctx.session.waitingFor = null;
      ctx.session.courierOrderId = null;
      
    } catch (error) {
      console.error('Process courier location error:', error);
      await ctx.reply('❌ Joylashuvni saqlashda xatolik yuz berdi');
    }
  }

  /**
   * Register courier callbacks
   */
  static registerCallbacks(bot) {
    // 🔧 DISABLED: Duplicate courier callbacks - using dedicated courier/callbacks.js instead
    // bot.action(/^courier_accept_(.+)$/, CourierCallbacks.handleCourierAccept);
    // bot.action(/^courier_pickup_(.+)$/, CourierCallbacks.handleCourierPickup);
    // bot.action(/^courier_delivered_(.+)$/, CourierCallbacks.handleCourierDelivered);

    console.log('✅ Courier callbacks registration skipped (using courier/callbacks.js)');
  }
}

module.exports = CourierCallbacks;
