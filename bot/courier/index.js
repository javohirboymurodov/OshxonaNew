const { start, toggleShift, toggleAvailable, activeOrders, earnings, profile, startWork, stopWork } = require('./handlers');

module.exports = function registerCourierModule(bot) {
  bot.command('courier', start);
  // Also allow main /start to route courier if role is courier
  bot.hears(/^\/start$/, async (ctx) => {
    try {
      const { User } = require('../../models');
      const u = await User.findOne({ telegramId: ctx.from?.id });
      if (u?.role === 'courier') return start(ctx);
    } catch {}
  });
  bot.action('courier_shift_toggle', toggleShift);
  bot.action('courier_available_toggle', toggleAvailable);
  bot.action('courier_active_orders', activeOrders);
  bot.action('courier_earnings', earnings);
  bot.action('courier_profile', profile);
  bot.action('courier_start_work', startWork);
  bot.action('courier_stop_work', stopWork);
  // Ortga: qayta asosiy kuryer panelini ko'rsatish
  bot.action('courier_back', async (ctx) => {
    try {
      const { start } = require('./handlers');
      await start(ctx);
    } catch {}
  });
  // Reply keyboarddagi "Kuryer menyusi" matnini ham ushlab olish (user menyusi bilan aralashmasin)
  bot.hears('⬅️ Kuryer menyusi', async (ctx) => {
    try {
      const { start } = require('./handlers');
      await start(ctx);
      await ctx.deleteMessage().catch(() => {});
    } catch {}
  });
};


