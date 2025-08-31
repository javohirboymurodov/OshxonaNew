// Bot Manager - Clean and organized bot initialization
/**
 * Bot ni to'liq sozlash
 * @param {Telegraf} bot - Telegraf bot instance
 */
function initializeBot(bot) {
  console.log('🤖 Bot handlerlarini ulash...');


  // ========================================
  // 👤 USER MODULE
  // ========================================

  // 1. User commands (/start, /menu)
  try {
    const { registerUserModule } = require('./user/commands');
    registerUserModule(bot);
    console.log('✅ User commands loaded');
  } catch (error) {
    console.warn('⚠️ User commands load failed:', error.message);
  }

  // 2. User callbacks (buttons, actions)
  try {
    const { registerUserCallbacks } = require('./user/callbacks');
    registerUserCallbacks(bot);
    console.log('✅ User callbacks loaded');
  } catch (error) {
    console.warn('⚠️ User callbacks load failed:', error.message);
    console.error('⚠️ Full error:', error);
  }

  // ========================================
  // 🚚 COURIER MODULE
  // ========================================

  // 3. Courier commands (/courier, /start for couriers)
  try {
    const { registerCourierModule } = require('./courier/commands');
    registerCourierModule(bot);
    console.log('✅ Courier commands loaded');
  } catch (error) {
    console.warn('⚠️ Courier commands load failed:', error.message);
  }

  // 4. Courier callbacks (buttons, actions)
  try {
    const { registerCourierCallbacks } = require('./courier/callbacks');
    registerCourierCallbacks(bot);
    console.log('✅ Courier callbacks loaded');
    
    // Debug: Log all courier-related callback queries
    bot.use((ctx, next) => {
      if (ctx.updateType === 'callback_query') {
        const data = ctx.callbackQuery?.data;
        if (data && (data.startsWith('courier_') || data.includes('courier'))) {
          console.log(`🔥 COURIER CALLBACK DETECTED:`, {
            from: ctx.from?.id,
            data: data,
            timestamp: new Date().toISOString()
          });
        }
      }
      return next();
    });
  } catch (error) {
    console.warn('⚠️ Courier callbacks load failed:', error.message);
  }

  // ========================================
  // 🔧 SHARED MODULES
  // ========================================

  // 5. Message handlers (text, contact, location)
  try {
    const { registerMessageHandlers } = require('./handlers/messageHandlers');
    registerMessageHandlers(bot);
    console.log('✅ Message handlers loaded');
  } catch (error) {
    console.warn('⚠️ Message handlers load failed:', error.message);
  }

  // 3. User profile module
  try {
    require('./user/callbacks/profile')(bot);
    console.log('✅ User profile loaded');
  } catch (error) {
    console.warn('⚠️ User profile load failed:', error.message);
  }

  // ========================================
  // 🚨 GLOBAL ERROR HANDLING
  // ========================================

  bot.catch((err, ctx) => {
    console.error('❌ Bot error:', err);
    const errorMessage = '❌ Xatolik yuz berdi!';
    
    if (ctx.answerCbQuery) {
      ctx.answerCbQuery(errorMessage).catch(() => {});
    } else if (ctx.reply) {
      ctx.reply(errorMessage).catch(() => {});
    }
  });

  console.log('✅ Bot handlarlari muvaffaqiyatli ulandi');
}

module.exports = { initializeBot };
