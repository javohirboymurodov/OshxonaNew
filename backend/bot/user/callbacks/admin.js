// 👨‍💼 ADMIN QUICK ACTIONS (from Telegram notifications)

function registerAdminCallbacks(bot) {
  // ========================================
  // 👨‍💼 ADMIN QUICK ACTIONS (from Telegram notifications)
  // ========================================

  // Admin quick status updates
  bot.action(/^admin_quick_confirmed_(.+)$/, async (ctx) => {
    try {
      const orderId = ctx.match[1];
      const OrderStatusService = require('../../../services/orderStatusService');
      await OrderStatusService.updateStatus(orderId, 'confirmed', {
        message: 'Admin tomonidan tasdiqlandi',
        updatedBy: ctx.from.id
      });
      await ctx.answerCbQuery('✅ Buyurtma tasdiqlandi');
    } catch (error) {
      console.error('❌ admin_quick_confirmed error:', error);
      await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  bot.action(/^admin_quick_preparing_(.+)$/, async (ctx) => {
    try {
      const orderId = ctx.match[1];
      const OrderStatusService = require('../../../services/orderStatusService');
      await OrderStatusService.updateStatus(orderId, 'preparing', {
        message: 'Buyurtma tayyorlanmoqda',
        updatedBy: ctx.from.id
      });
      await ctx.answerCbQuery('✅ Tayyorlash boshlandi');
    } catch (error) {
      console.error('❌ admin_quick_preparing error:', error);
      await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  bot.action(/^admin_quick_ready_(.+)$/, async (ctx) => {
    try {
      const orderId = ctx.match[1];
      const OrderStatusService = require('../../../services/orderStatusService');
      await OrderStatusService.updateStatus(orderId, 'ready', {
        message: 'Buyurtma tayyor',
        updatedBy: ctx.from.id
      });
      await ctx.answerCbQuery('✅ Buyurtma tayyor');
    } catch (error) {
      console.error('❌ admin_quick_ready error:', error);
      await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  bot.action(/^admin_quick_delivered_(.+)$/, async (ctx) => {
    try {
      const orderId = ctx.match[1];
      const Order = require('../../../models/Order');
      const order = await Order.findById(orderId);
      
      if (!order) {
        await ctx.answerCbQuery('❌ Buyurtma topilmadi');
        return;
      }

      const OrderStatusService = require('../../../services/orderStatusService');
      
      // PICKUP uchun 'picked_up', DELIVERY uchun 'delivered'
      const finalStatus = order.orderType === 'pickup' ? 'picked_up' : 'delivered';
      
      await OrderStatusService.updateStatus(orderId, finalStatus, {
        message: order.orderType === 'pickup' ? 'Mijoz buyurtmani olib ketdi' : 'Buyurtma yetkazildi',
        updatedBy: ctx.from.id
      });
      
      await ctx.answerCbQuery(order.orderType === 'pickup' ? '✅ Olib ketildi' : '✅ Yetkazildi');
    } catch (error) {
      console.error('❌ admin_quick_delivered error:', error);
      await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  bot.action(/^admin_quick_picked_up_(.+)$/, async (ctx) => {
    try {
      const orderId = ctx.match[1];
      const OrderStatusService = require('../../../services/orderStatusService');
      await OrderStatusService.updateStatus(orderId, 'picked_up', {
        message: 'Mijoz buyurtmani olib ketdi',
        updatedBy: ctx.from.id
      });
      await ctx.answerCbQuery('✅ Olib ketildi');
    } catch (error) {
      console.error('❌ admin_quick_picked_up error:', error);
      await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  bot.action(/^admin_quick_cancelled_(.+)$/, async (ctx) => {
    try {
      const orderId = ctx.match[1];
      const OrderStatusService = require('../../../services/orderStatusService');
      await OrderStatusService.updateStatus(orderId, 'cancelled', {
        message: 'Admin tomonidan bekor qilindi',
        updatedBy: ctx.from.id
      });
      await ctx.answerCbQuery('✅ Buyurtma bekor qilindi');
    } catch (error) {
      console.error('❌ admin_quick_cancelled error:', error);
      await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  console.log('✅ Admin callbacks registered');
}

module.exports = { registerAdminCallbacks };
