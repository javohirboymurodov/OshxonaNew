// 📍 ORDER TRACKING + 🚀 SMART ORDER INTERFACE
const trackingHandlers = require('../../handlers/user/tracking/trackingHandlers');

function registerTrackingCallbacks(bot) {
  // ========================================
  // 📍 ORDER TRACKING
  // ========================================

  // Track order (Smart Interface)
  bot.action(/^track_(.+)$/, trackingHandlers.trackOrderSmart);

  // ========================================
  // 🚀 SMART ORDER INTERFACE (Professional)
  // ========================================

  // Smart order refresh with rate limiting
  const refreshRateLimiter = new Map();
  bot.action(/^smart_refresh_(.+)$/, async (ctx) => {
    try {
      const orderId = ctx.match[1];
      const userId = ctx.from.id;
      const rateLimitKey = `refresh_${userId}_${orderId}`;
      
      // Rate limiting: 1 refresh per 3 seconds
      const lastRefresh = refreshRateLimiter.get(rateLimitKey);
      const now = Date.now();
      if (lastRefresh && (now - lastRefresh) < 3000) {
        await ctx.answerCbQuery('⏳ Iltimos, biroz kuting...');
        return;
      }
      
      refreshRateLimiter.set(rateLimitKey, now);
      
      const SmartOrderInterface = require('../../../services/smartOrderInterface');
      await SmartOrderInterface.refreshOrder(ctx, orderId);
      
      // Clean up old entries (older than 10 seconds)
      setTimeout(() => {
        for (const [key, timestamp] of refreshRateLimiter.entries()) {
          if (now - timestamp > 10000) {
            refreshRateLimiter.delete(key);
          }
        }
      }, 1000);
      
    } catch (error) {
      console.error('❌ smart_refresh error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  // Smart order display from tracking
  bot.action(/^smart_order_(.+)$/, async (ctx) => {
    try {
      const orderId = ctx.match[1];
      const SmartOrderInterface = require('../../../services/smartOrderInterface');
      await SmartOrderInterface.showOrder(ctx, orderId, { source: 'tracking' });
    } catch (error) {
      console.error('❌ smart_order error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  console.log('✅ Tracking callbacks registered');
}

module.exports = { registerTrackingCallbacks };
