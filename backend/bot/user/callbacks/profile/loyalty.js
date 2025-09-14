// 💎 LOYALTY CALLBACKS
const loyaltyHandlers = require('../../../handlers/user/loyalty/loyaltyHandlers');

function registerLoyaltyCallbacks(bot) {
  // Loyalty points
  bot.action('loyalty_points', async (ctx) => {
    try {
      await loyaltyHandlers.showLoyaltyPoints(ctx);
    } catch (error) {
      console.error('❌ loyalty_points error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  // Loyalty history
  bot.action('loyalty_history', async (ctx) => {
    try {
      await loyaltyHandlers.showLoyaltyHistory(ctx);
    } catch (error) {
      console.error('❌ loyalty_history error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  // Loyalty rewards
  bot.action('loyalty_rewards', async (ctx) => {
    try {
      await loyaltyHandlers.showLoyaltyRewards(ctx);
    } catch (error) {
      console.error('❌ loyalty_rewards error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });
}

module.exports = { registerLoyaltyCallbacks };