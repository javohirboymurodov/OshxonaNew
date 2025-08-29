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

  // Fallback: checkout -> start order process
  bot.action('checkout', async (ctx) => {
    try {
      await ctx.answerCbQuery('🛒 Avval mahsulotlarni tanlang');
      const CatalogHandlers = require('../../handlers/user/catalog/index');
      await CatalogHandlers.showCategories(ctx);
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
      await orderHandlers.handleBranchSelection(ctx);
    } catch (error) {
      console.error('❌ choose_branch error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  // Arrival time handlers
  bot.action(/^arrival_time_(.+)$/, async (ctx) => {
    try {
      const orderHandlers = require('../../handlers/user/order/orderFlow');
      await orderHandlers.handleArrivalTime(ctx);
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
      const paymentHandlers = require('../../handlers/user/order/paymentFlow');
      await paymentHandlers.handlePaymentMethod(ctx);
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
      await ctx.editMessageText('🏁 Restoranmizdagi stolingiz raqamini kiriting:', {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '1', callback_data: 'table_number_1' },
              { text: '2', callback_data: 'table_number_2' },
              { text: '3', callback_data: 'table_number_3' }
            ],
            [
              { text: '4', callback_data: 'table_number_4' },
              { text: '5', callback_data: 'table_number_5' },
              { text: '6', callback_data: 'table_number_6' }
            ],
            [{ text: '🔙 Ortga', callback_data: 'back_to_main' }]
          ]
        }
      });
      await ctx.answerCbQuery();
    } catch (error) {
      console.error('❌ dinein_arrived_preview error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  // Enter table number handler
  bot.action(/^table_number_(\d+)$/, async (ctx) => {
    try {
      const tableNumber = ctx.match[1];
      const orderHandlers = require('../../handlers/user/order/orderFlow');
      await orderHandlers.handleTableArrival(ctx, tableNumber);
    } catch (error) {
      console.error('❌ table_number error:', error);
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
