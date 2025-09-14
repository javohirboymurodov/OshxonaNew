// 📋 PROFILE CALLBACKS - MODULAR STRUCTURE
const profileHandlers = require('../../../handlers/user/profile');
const { registerOrdersCallbacks } = require('./orders');
const { registerLoyaltyCallbacks } = require('./loyalty');
const { registerRatingCallbacks } = require('./rating');
const { registerTrackingCallbacks } = require('./tracking');

function registerProfileCallbacks(bot) {
  // ========================================
  // 👤 PROFILE MAIN
  // ========================================
  
  // Profile (main entry point)
  bot.action('my_profile', async (ctx) => {
    try {
      await profileHandlers.showProfile(ctx);
    } catch (e) {
      console.error('my_profile error:', e);
    }
  });

  // Edit profile
  bot.action('edit_profile', async (ctx) => {
    try {
      await profileHandlers.editProfile(ctx);
    } catch (error) {
      console.error('❌ edit_profile error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  // Save profile
  bot.action('save_profile', async (ctx) => {
    try {
      await profileHandlers.saveProfile(ctx);
    } catch (error) {
      console.error('❌ save_profile error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  // ========================================
  // MODULAR CALLBACKS
  // ========================================
  
  // Register all modular callbacks
  registerOrdersCallbacks(bot);
  registerLoyaltyCallbacks(bot);
  registerRatingCallbacks(bot);
  registerTrackingCallbacks(bot);
}

module.exports = { registerProfileCallbacks };