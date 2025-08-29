// 📋 MY ORDERS + 💎 LOYALTY + ⭐ RATING SYSTEM
const { showMyOrders, myOrdersCallbackHandler } = require('../../handlers/user/myOrders');
const loyaltyHandlers = require('../../handlers/user/loyalty/loyaltyHandlers');
const RatingHandlers = require('../../handlers/user/ratingHandlers');

function registerProfileCallbacks(bot) {
  // ========================================
  // 📋 MY ORDERS
  // ========================================

  // Main my orders
  bot.action('my_orders', async (ctx) => {
    try {
      await showMyOrders(ctx);
    } catch (error) {
      console.error('❌ my_orders error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  // Pagination and details for "My Orders"
  bot.action(/^my_orders_(.+)$/, myOrdersCallbackHandler);

  // ========================================
  // 💎 LOYALTY PROGRAM
  // ========================================

  // Loyalty level
  bot.action('loyalty_level', async (ctx) => {
    try {
      await loyaltyHandlers.showLoyaltyLevel(ctx);
    } catch (error) {
      console.error('❌ loyalty_level error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  // Bonuses
  bot.action('loyalty_bonuses', async (ctx) => {
    try {
      await loyaltyHandlers.showLoyaltyBonuses(ctx);
    } catch (error) {
      console.error('❌ loyalty_bonuses error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  // Referral program
  bot.action('referral_program', async (ctx) => {
    try {
      await loyaltyHandlers.showReferralProgram(ctx);
    } catch (error) {
      console.error('❌ referral_program error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  // Use points
  bot.action('use_points', async (ctx) => {
    try {
      await loyaltyHandlers.showUsePoints(ctx);
    } catch (error) {
      console.error('❌ use_points error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  // Use points - amounts
  bot.action(/^use_points_(\d+)$/, async (ctx) => {
    try {
      const points = parseInt(ctx.match[1]);
      await loyaltyHandlers.usePoints(ctx, points);
    } catch (error) {
      console.error('❌ use_points_amount error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  // My stats
  bot.action('my_stats', async (ctx) => {
    try {
      await loyaltyHandlers.showMyStats(ctx);
    } catch (error) {
      console.error('❌ my_stats error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  // ========================================
  // ⭐ RATING SYSTEM
  // ========================================

  // Order rating (show stars)
  bot.action(/^rate_order_(.+)$/, async (ctx) => {
    try {
      await RatingHandlers.showRatingStars(ctx);
    } catch (error) {
      console.error('❌ rate_order error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  // Star rating selection
  bot.action(/^rating_(\d+)_(.+)$/, async (ctx) => {
    try {
      await RatingHandlers.submitRating(ctx);
    } catch (error) {
      console.error('❌ rating selection error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  // Feedback after rating
  bot.action(/^feedback_(.+)$/, async (ctx) => {
    try {
      await RatingHandlers.handleFeedback(ctx);
    } catch (error) {
      console.error('❌ feedback error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  // Courier location
  bot.action(/^courier_location_(.+)$/, async (ctx) => {
    try {
      const CourierCallbacks = require('../../handlers/user/courierCallbacks');
      await CourierCallbacks.showCourierLocation(ctx);
    } catch (error) {
      console.error('❌ courier_location error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  // Reorder
  bot.action(/^reorder_(.+)$/, async (ctx) => {
    try {
      await RatingHandlers.handleReorder(ctx);
    } catch (error) {
      console.error('❌ reorder error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  // Confirm reorder
  bot.action(/^confirm_reorder_(.+)$/, async (ctx) => {
    try {
      await RatingHandlers.confirmReorder(ctx);
    } catch (error) {
      console.error('❌ confirm_reorder error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  console.log('✅ Profile callbacks registered');
}

module.exports = { registerProfileCallbacks };