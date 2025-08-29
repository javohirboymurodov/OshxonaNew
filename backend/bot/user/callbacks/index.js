// User callbacks - Modular structure
// Import organized handler modules
const NavigationHandlers = require('../../handlers/user/navigationHandlers');
const ContactAndAboutHandlers = require('../../handlers/user/contactAndAboutHandlers');
const PromotionHandlers = require('../../handlers/user/promotionHandlers');

// Import callback modules
const { registerCatalogCallbacks } = require('./catalog');
const { registerCartCallbacks } = require('./cart');
const { registerOrderCallbacks } = require('./order');
const { registerProfileCallbacks } = require('./profile');
const { registerTrackingCallbacks } = require('./tracking');
const { registerUXCallbacks } = require('./ux');
const { registerAdminCallbacks } = require('./admin');

/**
 * User callback handlers ni bot instance ga ulash
 * @param {Telegraf} bot - Telegraf bot instance
 */
function registerUserCallbacks(bot) {
  // Debug logger for all callback queries
  bot.use(async (ctx, next) => {
    if (ctx.updateType === 'callback_query') {
      try {
        const data = String(ctx.callbackQuery?.data || '');
        console.log('🎯 callback_query received:', data, '| from:', ctx.from?.id);
      } catch (e) {
        console.error('🎯 callback_query log error:', e);
      }
    }
    return next();
  });

  // Apply phone guard middleware
  bot.use(NavigationHandlers.phoneGuardMiddleware);

  // Register organized handler modules
  NavigationHandlers.registerCallbacks(bot);
  ContactAndAboutHandlers.registerCallbacks(bot);
  PromotionHandlers.registerCallbacks(bot);

  // Register modular callback handlers
  registerCatalogCallbacks(bot);
  registerCartCallbacks(bot);
  registerOrderCallbacks(bot);
  registerProfileCallbacks(bot);
  registerTrackingCallbacks(bot);
  registerUXCallbacks(bot);
  registerAdminCallbacks(bot);

  console.log('✅ User callbacks registered (modular structure)');
}

module.exports = { registerUserCallbacks };
