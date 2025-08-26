/**
 * Contact and About handlers
 */
class ContactAndAboutHandlers {
  
  /**
   * Show contact information
   */
  static async showContact(ctx) {
    try {
      const { contactKeyboard } = require('../../user/keyboards');
      await ctx.reply('📞 Aloqa maʼlumotlari:', { reply_markup: contactKeyboard.reply_markup || contactKeyboard });
    } catch (e) {
      console.error('contact error:', e);
    }
  }

  /**
   * Show about information
   */
  static async showAbout(ctx) {
    try {
      const text = 'ℹ️ Biz haqimizda: Ish vaqti 10:00-22:00. Qoʻllab-quvvatlash: +998 71 200 00 00';
      const keyboard = { inline_keyboard: [
        [{ text: '🔙 Orqaga', callback_data: 'back_to_main' }]
      ] };
      if (ctx.callbackQuery) {
        await ctx.editMessageText(text, { reply_markup: keyboard });
      } else {
        await ctx.reply(text, { reply_markup: keyboard });
      }
    } catch (e) { 
      console.error('about error:', e); 
    }
  }

  /**
   * Register contact and about callbacks
   */
  static registerCallbacks(bot) {
    // Contact
    bot.action('contact', ContactAndAboutHandlers.showContact);
    
    // About
    bot.action('about', ContactAndAboutHandlers.showAbout);

    console.log('✅ Contact and About handlers registered');
  }
}

module.exports = ContactAndAboutHandlers;
