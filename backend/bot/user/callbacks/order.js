// 📋 ORDER FLOW + 📝 ORDER TYPE + 💳 PAYMENT HANDLERS

function registerOrderCallbacks(bot) {
  // ========================================
  // 📋 ORDER FLOW (lightweight fallback)
  // ========================================

  // Fallback: start_order -> open categories to let user choose items
  bot.action('start_order', async (ctx) => {
    try {
      await ctx.answerCbQuery('🛒 Avval mahsulotlarni tanlang');
      const CatalogHandlers = require('../../handlers/user/catalog/index');
      await CatalogHandlers.showCategories(ctx);
    } catch (error) {
      console.error('❌ start_order error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  // Checkout: start order flow with order type selection
  bot.action('checkout', async (ctx) => {
    try {
      // Check if cart has items
      const { User, Cart } = require('../../../models');
      const user = await User.findOne({ telegramId: ctx.from.id });
      
      if (!user) {
        return await ctx.answerCbQuery('❌ Foydalanuvchi topilmadi!');
      }
      
      const cart = await Cart.findOne({ user: user._id, isActive: true });
      
      if (!cart || cart.items.length === 0) {
        return await ctx.answerCbQuery('❌ Savat bo\'sh!');
      }
      
      // 🔧 FIX: QR kod orqali kelganda buyurtma turi tanlash bosqichini o'tkazib yuborish
      const isQROrder = ctx.session?.orderType === 'table' && ctx.session?.orderData?.tableQR;
      
      if (isQROrder) {
        console.log('🍽️ QR order detected, skipping order type selection');
        // QR kod orqali kelganda to'g'ridan-to'g'ri to'lov usulini so'ramiz
        const PaymentFlow = require('../../handlers/user/order/paymentFlow');
        await PaymentFlow.askForPaymentMethod(ctx);
        await ctx.answerCbQuery('💳 To\'lov usulini tanlang');
      } else {
        // Oddiy buyurtma - order type selection
        const OrderFlow = require('../../handlers/user/order/orderFlow');
        await OrderFlow.startOrder(ctx);
        await ctx.answerCbQuery('🛒 Buyurtma turiga o\'tamiz');
      }
    } catch (error) {
      console.error('❌ checkout error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  // ========================================
  // 📝 ORDER TYPE HANDLERS
  // ========================================

  // Order type selection handlers
  bot.action(/^order_type_(.+)$/, async (ctx) => {
    try {
      const orderType = ctx.match[1];
      const orderHandlers = require('../../handlers/user/order/orderFlow');
      await orderHandlers.handleOrderType(ctx, orderType);
    } catch (error) {
      console.error('❌ order_type error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  // Branch selection handlers
  bot.action(/^choose_branch_(.+)_(.+)$/, async (ctx) => {
    try {
      const orderHandlers = require('../../handlers/user/order/orderFlow');
      await orderHandlers.handleChooseBranch(ctx);
    } catch (error) {
      console.error('❌ choose_branch error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  // Arrival time handlers
  bot.action(/^arrival_time_(.+)$/, async (ctx) => {
    try {
      const UserOrderHandlers = require('../../handlers/user/order/index');
      await UserOrderHandlers.handleArrivalTime(ctx);
    } catch (error) {
      console.error('❌ arrival_time error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  // Order step back handler
  bot.action('order_step_back', async (ctx) => {
    try {
      const orderHandlers = require('../../handlers/user/order/orderFlow');
      await orderHandlers.handleStepBack(ctx);
    } catch (error) {
      console.error('❌ order_step_back error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  // ========================================
  // 💳 PAYMENT HANDLERS
  // ========================================

  // Payment method handlers
  bot.action(/^payment_(.+)$/, async (ctx) => {
    try {
      const method = ctx.match[1]; // Extract payment method from callback_data
      const paymentHandlers = require('../../handlers/user/order/paymentFlow');
      await paymentHandlers.handlePaymentMethod(ctx, method);
    } catch (error) {
      console.error('❌ payment error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  // Order confirmation handler
  bot.action('confirm_order', async (ctx) => {
    try {
      const paymentHandlers = require('../../handlers/user/order/paymentFlow');
      await paymentHandlers.finalizeOrder(ctx);
    } catch (error) {
      console.error('❌ confirm_order error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  // Order edit handler (go back to cart)
  bot.action('edit_order', async (ctx) => {
    try {
      const { showCart } = require('../../handlers/user/cart');
      await showCart(ctx);
      await ctx.answerCbQuery('✏️ Buyurtmani tahrirlash');
    } catch (error) {
      console.error('❌ edit_order error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  // Dine-in arrival handler
  bot.action('dinein_arrived_preview', async (ctx) => {
    try {
      // Set session to wait for table number text input
      ctx.session = ctx.session || {};
      ctx.session.waitingFor = 'table_number';
      
      await ctx.editMessageText('🏁 Restoranmizdagi stolingiz raqamini kiriting:', {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔙 Ortga', callback_data: 'back_to_main' }]
          ]
        }
      });
      
      // Ask user to type table number
      await ctx.reply('📝 Stol raqamini yozing (masalan: 15, 23, 101):');
      await ctx.answerCbQuery();
    } catch (error) {
      console.error('❌ dinein_arrived_preview error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  // Skip address notes handler
  bot.action('skip_address_notes', async (ctx) => {
    try {
      const orderHandlers = require('../../handlers/user/order/orderFlow');
      await orderHandlers.handleSkipAddressNotes(ctx);
    } catch (error) {
      console.error('❌ skip_address_notes error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  console.log('✅ Order callbacks registered');
}

module.exports = { registerOrderCallbacks };
