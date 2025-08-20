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
  bot.action('courier_active_orders', CourierHandlers.activeOrders);
  bot.action('courier_earnings', CourierHandlers.earnings);
  bot.action('courier_profile', CourierHandlers.profile);
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

  // ========================================
  // 🔙 NAVIGATION
  // ========================================

  bot.action('courier_back', CourierHandlers.start);
  bot.action('courier_main_menu', CourierHandlers.start);

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
