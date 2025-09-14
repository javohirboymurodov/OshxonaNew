// Bot Manager - Clean and organized bot initialization
/**
 * Bot ni to'liq sozlash
 * @param {Telegraf} bot - Telegraf bot instance
 */
function initializeBot(bot) {
  const isDebug = process.env.NODE_ENV === 'development' || process.env.BOT_DEBUG === 'true';
  
  if (isDebug) console.log('🤖 Bot handlerlarini ulash...');

  // ========================================
  // 🌐 WEBAPP DATA HANDLER (PRIORITY)
  // ========================================

  // WebApp dan kelayotgan ma'lumotlarni qayta ishlash
  try {
    const { handleWebAppData } = require('./handlers/user/webAppHandler');
    
    // WebApp data handler - bu eng yuqori prioritetga ega
    bot.on('web_app_data', async (ctx) => {
      if (isDebug) console.log('🌐 WebApp data update received');
      await handleWebAppData(ctx);
    });
    
    // Fallback: message.web_app_data uchun ham handler
    bot.on('message', async (ctx, next) => {
      if (ctx.message?.web_app_data) {
        if (isDebug) console.log('🌐 WebApp data in message received');
        await handleWebAppData(ctx);
        return; // Don't pass to next middleware
      }
      return next();
    });
    
    if (isDebug) console.log('✅ WebApp data handlers loaded');
  } catch (error) {
    console.warn('⚠️ WebApp data handlers load failed:', error.message);
  }

  // ========================================
  // 👤 USER MODULE
  // ========================================

  // 1. User commands (/start, /menu)
  try {
    const { registerUserModule } = require('./user/commands');
    registerUserModule(bot);
    if (isDebug) console.log('✅ User commands loaded');
  } catch (error) {
    console.warn('⚠️ User commands load failed:', error.message);
  }

  // 2. User callbacks (buttons, actions)
  try {
    const { registerUserCallbacks } = require('./user/callbacks');
    registerUserCallbacks(bot);
    if (isDebug) console.log('✅ User callbacks loaded');
  } catch (error) {
    console.warn('⚠️ User callbacks load failed:', error.message);
    if (isDebug) console.error('⚠️ Full error:', error);
  }

  // ========================================
  // 🚚 COURIER MODULE
  // ========================================

  // 3. Courier commands (/courier, /start for couriers)
  try {
    const { registerCourierModule } = require('./courier/commands');
    registerCourierModule(bot);
    if (isDebug) console.log('✅ Courier commands loaded');
  } catch (error) {
    console.warn('⚠️ Courier commands load failed:', error.message);
  }

  // 4. Courier callbacks (buttons, actions)
  try {
    const { registerCourierCallbacks } = require('./courier/callbacks');
    registerCourierCallbacks(bot);
    if (isDebug) console.log('✅ Courier callbacks loaded');
    
    // Debug: Log all courier-related callback queries (only in debug mode)
    if (isDebug) {
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
    }
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
    if (isDebug) console.log('✅ Message handlers loaded');
  } catch (error) {
    console.warn('⚠️ Message handlers load failed:', error.message);
  }

  // 3. User profile module
  try {
    const { registerProfileCallbacks } = require('./user/callbacks/profile');
    registerProfileCallbacks(bot);
    if (isDebug) console.log('✅ User profile loaded');
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

  if (isDebug) console.log('✅ Bot handlarlari muvaffaqiyatli ulandi');
}

// Bot instance ni global saqlash
let botInstance = null;

function setBotInstance(bot) {
  botInstance = bot;
}

function getBotInstance() {
  return botInstance;
}

module.exports = { 
  initializeBot, 
  setBotInstance, 
  getBotInstance,
  bot: () => botInstance
};