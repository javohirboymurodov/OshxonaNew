// ⭐ RATING CALLBACKS
const RatingHandlers = require('../../../handlers/user/ratingHandlers');

function registerRatingCallbacks(bot) {
  // Rate order
  bot.action(/^rate_order_/, async (ctx) => {
    try {
      await RatingHandlers.rateOrder(ctx);
    } catch (error) {
      console.error('❌ rate_order error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  // Submit rating
  bot.action(/^submit_rating_/, async (ctx) => {
    try {
      await RatingHandlers.submitRating(ctx);
    } catch (error) {
      console.error('❌ submit_rating error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  // View ratings
  bot.action('view_ratings', async (ctx) => {
    try {
      await RatingHandlers.viewRatings(ctx);
    } catch (error) {
      console.error('❌ view_ratings error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });
}

module.exports = { registerRatingCallbacks };