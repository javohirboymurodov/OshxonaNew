const { mainMenuKeyboard, askPhoneInlineKeyboard, requestPhoneReplyKeyboard } = require('../../user/keyboards');
const { User } = require('../../../models');

/**
 * Navigation handlers for main menu and basic navigation
 */
class NavigationHandlers {
  
  /**
   * Show main menu
   */
  static async showMainMenu(ctx) {
    try {
      await ctx.editMessageText(
        '🏠 **Bosh sahifa**\n\nKerakli bo\'limni tanlang:',
        {
          parse_mode: 'Markdown',
          reply_markup: mainMenuKeyboard.reply_markup
        }
      );
    } catch (error) {
      console.error('❌ Main menu callback error:', error);
      await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  }

  /**
   * Back to main menu
   */
  static async backToMain(ctx) {
    try {
      const { backToMain } = require('./backToMain');
      await backToMain(ctx);
    } catch (error) {
      console.error('❌ back_to_main error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  }

  /**
   * Phone request handler
   */
  static async requestPhone(ctx) {
    try {
      await ctx.reply('👇 Pastdagi tugma orqali telefon raqamingizni ulashing:', requestPhoneReplyKeyboard());
      if (ctx.answerCbQuery) await ctx.answerCbQuery('📞 Telefonni ulashing');
    } catch (e) {
      console.error('req_phone error', e);
    }
  }

  /**
   * Phone guard middleware - require phone for most actions
   */
  static async phoneGuardMiddleware(ctx, next) {
    try {
      // Apply guard only for callback queries so /start and text entry are not blocked
      if (ctx.updateType !== 'callback_query') return next();
      const fromId = ctx.from?.id;
      if (!fromId) return next();
      const user = await User.findOne({ telegramId: fromId }).select('phone');
      const isPhoneProvided = Boolean(user && user.phone);
      const action = ctx.callbackQuery?.data || '';
      console.log('🛰️  phoneGuard | action:', action, '| fromId:', fromId, '| hasPhone:', isPhoneProvided);

      // Allow essential navigation without phone
      const allowedWithoutPhone = [
        'req_phone',
        'noop',
        'main_menu',
        'back_to_main',
        'contact',
        'about',
        'show_catalog',
        'show_categories',
        'show_branches',
        'request_location',
        'share_branch_location_',
        'branch_phone_',
        'show_promotions',
        'quick_order',
        'show_favorites',
        'my_orders',
        'my_loyalty_level',
        'my_bonuses',
        'referral_program',
        'my_stats',
        'show_cart'
      ];

      const isAllowed = allowedWithoutPhone.some(a => action.startsWith(a));
      console.log('🛰️  phoneGuard | allowedWithoutPhone:', isAllowed, '| action:', action);
      if (!isPhoneProvided && !isAllowed) {
        const msg = '📱 Iltimos, telefon raqamingizni ulashing. Buyurtma qilish va siz bilan bog\'lanish uchun kerak.';
        try { await ctx.answerCbQuery('📱 Telefon raqamingiz kerak', { show_alert: true }); } catch {}
        await ctx.reply(msg, askPhoneInlineKeyboard());
        try { await ctx.reply('👇 Pastdagi tugma orqali telefon raqamingizni ulashing:', requestPhoneReplyKeyboard()); } catch {}
        return;
      }
      console.log('🛰️  phoneGuard | passing to next() for action:', action);
      return next();
    } catch (e) {
      console.error('🛑 phoneGuard error:', e);
      return next();
    }
  }

  /**
   * Register navigation callbacks
   */
  static registerCallbacks(bot) {
    // Main menu
    bot.action('main_menu', NavigationHandlers.showMainMenu);
    
    // Back to main
    bot.action('back_to_main', NavigationHandlers.backToMain);
    
    // Phone request
    bot.action('req_phone', NavigationHandlers.requestPhone);

    console.log('✅ Navigation handlers registered');
  }
}

module.exports = NavigationHandlers;
