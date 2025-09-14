// 📍 TRACKING CALLBACKS
const trackingHandlers = require('../../../handlers/user/tracking/trackingHandlers');

function registerTrackingCallbacks(bot) {
  // Track order
  bot.action(/^track_order_/, async (ctx) => {
    try {
      await trackingHandlers.trackOrder(ctx);
    } catch (error) {
      console.error('❌ track_order error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  // Live tracking
  bot.action(/^live_tracking_/, async (ctx) => {
    try {
      await trackingHandlers.startLiveTracking(ctx);
    } catch (error) {
      console.error('❌ live_tracking error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  // Stop tracking
  bot.action(/^stop_tracking_/, async (ctx) => {
    try {
      await trackingHandlers.stopLiveTracking(ctx);
    } catch (error) {
      console.error('❌ stop_tracking error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });
}

module.exports = { registerTrackingCallbacks };