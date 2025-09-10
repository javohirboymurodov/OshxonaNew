// Courier callback handlers
const CourierHandlers = require('../handlers/courier/handlers');

/**
 * Courier callback handlers ni bot instance ga ulash
 * @param {Telegraf} bot - Telegraf bot instance
 */
function registerCourierCallbacks(bot) {
  // ========================================
  // 🚚 COURIER ACTIONS
  // ========================================

  bot.action('courier_shift_toggle', CourierHandlers.toggleShift);
  bot.action('courier_available_toggle', CourierHandlers.toggleAvailable);
  bot.action('courier_active_orders', (ctx) => CourierHandlers.activeOrders(ctx, 1)); // Faol buyurtmalar
  bot.action('courier_all_orders', (ctx) => CourierHandlers.allOrders(ctx, 1)); // Barcha buyurtmalar
  bot.action('courier_earnings', CourierHandlers.earnings);
  bot.action('courier_profile', async (ctx) => {
    try {
      await CourierHandlers.profile(ctx);
    } catch (error) {
      console.error('❌ courier_profile error:', error);
      await ctx.reply('❌ Profil ma\'lumotlarini yuklashda xatolik yuz berdi!');
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi');
    }
  });
  bot.action('courier_start_work', CourierHandlers.startWork);
  bot.action('courier_stop_work', CourierHandlers.stopWork);

  // ========================================
  // 📦 ORDER MANAGEMENT
  // ========================================

  // Buyurtma qabul qilish
  bot.action(/^courier_accept_(.+)$/, CourierHandlers.acceptOrder);
  
  // Yo'lda ekanligini belgilash
  bot.action(/^courier_on_way_(.+)$/, CourierHandlers.onWay);
  
  // Yetkazib berildi
  bot.action(/^courier_delivered_(.+)$/, CourierHandlers.delivered);
  
  // Buyurtmani bekor qilish
  bot.action(/^courier_cancel_(.+)$/, CourierHandlers.cancelOrder);
  
  // Buyurtmani rad etish (tayinlash paytida)
  bot.action(/^courier_reject_(.+)$/, CourierHandlers.rejectOrder);
  
  // Buyurtma tafsilotlari
  bot.action(/^courier_order_details_(.+)$/, CourierHandlers.orderDetails);
  
  // Faol buyurtmalar pagination
  bot.action(/^courier_active_orders_page_(\d+)$/, async (ctx) => {
    try {
      const page = parseInt(ctx.match[1]) || 1;
      await CourierHandlers.activeOrders(ctx, page);
    } catch (error) {
      console.error('❌ courier_active_orders_page error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });
  
  // Barcha buyurtmalar pagination
  bot.action(/^courier_all_orders_page_(\d+)$/, async (ctx) => {
    try {
      const page = parseInt(ctx.match[1]) || 1;
      await CourierHandlers.allOrders(ctx, page);
    } catch (error) {
      console.error('❌ courier_all_orders_page error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  // ========================================
  // 🔙 NAVIGATION
  // ========================================

  bot.action('courier_back', CourierHandlers.start);
  bot.action('courier_main_menu', CourierHandlers.start);
  
  // No-operation callback (pagination raqami uchun)
  bot.action('noop', (ctx) => {
    if (ctx.answerCbQuery) ctx.answerCbQuery();
  });

  // Reply keyboarddagi "Kuryer menyusi" matnini ham ushlab olish
  bot.hears('⬅️ Kuryer menyusi', async (ctx) => {
    try {
      await CourierHandlers.start(ctx);
      await ctx.deleteMessage().catch(() => {});
    } catch {}
  });

  console.log('✅ Courier callbacks registered');
}

module.exports = { registerCourierCallbacks };
