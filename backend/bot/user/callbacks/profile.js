// 📋 MY ORDERS + 💎 LOYALTY + ⭐ RATING SYSTEM
const { showMyOrders, myOrdersCallbackHandler } = require('../../handlers/user/myOrders');
const loyaltyHandlers = require('../../handlers/user/loyalty/loyaltyHandlers');
const RatingHandlers = require('../../handlers/user/ratingHandlers');
const profileHandlers = require('../../handlers/user/profile');
const trackingHandlers = require('../../handlers/user/tracking/trackingHandlers');
const User = require('../../../models/User');

function registerProfileCallbacks(bot) {
  // ========================================
  // 📋 MY ORDERS
  // ========================================

  // Profile (main entry point)
  bot.action('my_profile', async (ctx) => {
    try {
      await profileHandlers.showProfile(ctx);
    } catch (e) {
      console.error('my_profile error:', e);
    }
  });

  // Main my orders
  bot.action('my_orders', async (ctx) => {
    try {
      await showMyOrders(ctx);
    } catch (error) {
      console.error('❌ my_orders error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  // Profile menu
  bot.action('profile_menu', async (ctx) => {
    try {
      await profileHandlers.showProfileMenu(ctx);
    } catch (error) {
      console.error('❌ profile_menu error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  // Change phone
  bot.action('change_phone', async (ctx) => {
    try {
      await profileHandlers.changePhone(ctx);
    } catch (error) {
      console.error('❌ change_phone error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  // Change language
  bot.action('change_language', async (ctx) => {
    try {
      await profileHandlers.changeLanguage(ctx);
    } catch (error) {
      console.error('❌ change_language error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  // Set language
  bot.action(/^set_lang_(uz|ru|en)$/, async (ctx) => {
    try {
      const lang = ctx.match[1];
      await profileHandlers.setLanguage(ctx, lang);
    } catch (error) {
      console.error('❌ set_language error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  // Pagination and details for "My Orders"
  bot.action(/^my_orders_(.+)$/, myOrdersCallbackHandler);
  bot.action(/^orders_page_\d+$/, myOrdersCallbackHandler);
  bot.action(/^order_detail_.+$/, myOrdersCallbackHandler);
  bot.action('back_to_my_orders', async (ctx) => {
    try {
      await showMyOrders(ctx);
    } catch (error) {
      console.error('❌ back_to_my_orders error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

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
  
  bot.action('my_loyalty_level', async (ctx) => {
    try {
      await loyaltyHandlers.showMyLevel(ctx);
    } catch (error) {
      console.error('❌ loyalty_level error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  // Bonuses
  bot.action('my_bonuses', async (ctx) => {
    try {
      await loyaltyHandlers.showMyBonuses(ctx);
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
      await loyaltyHandlers.usePoints(ctx);
    } catch (error) {
      console.error('❌ use_points error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  // Use points - amounts
  bot.action(/^use_points_(\d+)$/, async (ctx) => {
    try {
      const amount = parseInt(ctx.match[1]);
      await profileHandlers.usePointsAmount(ctx, amount);
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
      const orderId = ctx.match[1];
      await RatingHandlers.showRatingOptions(ctx, orderId);
    } catch (error) {
      console.error('❌ rate_order error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  // Star rating selection
  bot.action(/^rate_(.+)_(\d+)$/, async (ctx) => {
    try {
      await RatingHandlers.handleRating(ctx);
    } catch (error) {
      console.error('❌ rate star error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  // Feedback after rating
  bot.action(/^feedback_(.+)$/, async (ctx) => {
    try {
      const orderId = ctx.match[1];
      await RatingHandlers.requestFeedback(ctx, orderId);
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
 // Reorder
 bot.action(/^reorder_(.+)$/, async (ctx) => {
  try {
    await trackingHandlers.reorderItem(ctx);
  } catch (error) {
    console.error('❌ reorder error:', error);
    if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
  }
});

 // Confirm reorder
 bot.action(/^confirm_reorder_(.+)$/, async (ctx) => {
  try {
    await trackingHandlers.confirmReorder(ctx);
  } catch (error) {
    console.error('❌ confirm_reorder error:', error);
    if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
  }
});

  console.log('✅ Profile callbacks registered');
}

module.exports = { registerProfileCallbacks };