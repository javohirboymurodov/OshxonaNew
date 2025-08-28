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
   * Show phone contact
   */
  static async showContactPhone(ctx) {
    try {
      const text = `📞 **Telefon raqamlarimiz:**\n\n` +
        `📱 Buyurtma berish: +998 71 200 00 00\n` +
        `📞 Qo'llab-quvvatlash: +998 71 200 00 01\n` +
        `📲 WhatsApp: +998 90 123 45 67\n\n` +
        `🕐 Ish vaqti: 09:00 - 23:00 (har kuni)`;
      
      const keyboard = { inline_keyboard: [
        [{ text: '📞 Qo\'ng\'iroq qilish', url: 'tel:+998712000000' }],
        [{ text: '📱 WhatsApp', url: 'https://wa.me/998901234567' }],
        [{ text: '🔙 Orqaga', callback_data: 'contact' }]
      ] };
      
      await ctx.editMessageText(text, { parse_mode: 'Markdown', reply_markup: keyboard });
    } catch (e) { 
      console.error('contact_phone error:', e); 
    }
  }

  /**
   * Show address contact
   */
  static async showContactAddress(ctx) {
    try {
      const text = `📍 **Manzillarimiz:**\n\n` +
        `🏪 **Asosiy filial:**\n` +
        `Toshkent sh., Yunusobod tumani,\n` +
        `Amir Temur ko'chasi 108-uy\n\n` +
        `🏪 **2-filial:**\n` +
        `Toshkent sh., Chilonzor tumani,\n` +
        `Bunyodkor ko'chasi 45-uy\n\n` +
        `🕐 Ish vaqti: 09:00 - 23:00`;
      
      const keyboard = { inline_keyboard: [
        [{ text: '🗺️ Xaritada ko\'rish', url: 'https://maps.google.com/?q=41.2856,69.2034' }],
        [{ text: '🔙 Orqaga', callback_data: 'contact' }]
      ] };
      
      await ctx.editMessageText(text, { parse_mode: 'Markdown', reply_markup: keyboard });
    } catch (e) { 
      console.error('contact_address error:', e); 
    }
  }

  /**
   * Show Telegram contact
   */
  static async showContactTelegram(ctx) {
    try {
      const text = `📱 **Telegram kanallarimiz:**\n\n` +
        `📢 Asosiy kanal: @oshxona_official\n` +
        `💬 Guruh: @oshxona_chat\n` +
        `🤖 Bot: @oshxona_bot\n` +
        `👨‍💼 Admin: @oshxona_admin\n\n` +
        `Bizni kuzatib boring va yangiliklar haqida birinchi bo'lib xabardor bo'ling!`;
      
      const keyboard = { inline_keyboard: [
        [{ text: '📢 Kanalga obuna', url: 'https://t.me/oshxona_official' }],
        [{ text: '💬 Guruhga qo\'shilish', url: 'https://t.me/oshxona_chat' }],
        [{ text: '🔙 Orqaga', callback_data: 'contact' }]
      ] };
      
      await ctx.editMessageText(text, { parse_mode: 'Markdown', reply_markup: keyboard });
    } catch (e) { 
      console.error('contact_telegram error:', e); 
    }
  }

  /**
   * Show website contact
   */
  static async showContactWebsite(ctx) {
    try {
      const text = `🌐 **Ijtimoiy tarmoqlar:**\n\n` +
        `💻 Website: https://oshxona.uz\n` +
        `📘 Facebook: @oshxonauz\n` +
        `📷 Instagram: @oshxona_uz\n` +
        `🐦 Twitter: @oshxona_uz\n` +
        `📺 YouTube: Oshxona Channel\n\n` +
        `Bizni kuzatib boring!`;
      
      const keyboard = { inline_keyboard: [
        [{ text: '💻 Website', url: 'https://oshxona.uz' }],
        [{ text: '📷 Instagram', url: 'https://instagram.com/oshxona_uz' }],
        [{ text: '📘 Facebook', url: 'https://facebook.com/oshxonauz' }],
        [{ text: '🔙 Orqaga', callback_data: 'contact' }]
      ] };
      
      await ctx.editMessageText(text, { parse_mode: 'Markdown', reply_markup: keyboard });
    } catch (e) { 
      console.error('contact_website error:', e); 
    }
  }

  /**
   * Show about information
   */
  static async showAbout(ctx) {
    try {
      const text = `ℹ️ **Biz haqimizda:**\n\n` +
        `🍕 "Oshxona" - eng mazali va sifatli taomlar!\n\n` +
        `✨ **Bizning xizmatlarimiz:**\n` +
        `• Tez yetkazib berish (30 daqiqada)\n` +
        `• Sifatli ingredientlar\n` +
        `• 24/7 onlayn buyurtma\n` +
        `• Qulay narxlar\n\n` +
        `🕐 **Ish vaqti:** 09:00 - 23:00 (har kuni)\n` +
        `📞 **Qo'llab-quvvatlash:** +998 71 200 00 00\n\n` +
        `📅 **Ochilgan sana:** 2020-yil\n` +
        `👥 **Mijozlar soni:** 10,000+`;
      
      const keyboard = { inline_keyboard: [
        [{ text: '🔙 Orqaga', callback_data: 'back_to_main' }]
      ] };
      if (ctx.callbackQuery) {
        await ctx.editMessageText(text, { parse_mode: 'Markdown', reply_markup: keyboard });
      } else {
        await ctx.reply(text, { parse_mode: 'Markdown', reply_markup: keyboard });
      }
    } catch (e) { 
      console.error('about error:', e); 
    }
  }

  /**
   * Register contact and about callbacks
   */
  static registerCallbacks(bot) {
    // Main contact
    bot.action('contact', ContactAndAboutHandlers.showContact);
    
    // Contact details
    bot.action('contact_phone', ContactAndAboutHandlers.showContactPhone);
    bot.action('contact_address', ContactAndAboutHandlers.showContactAddress);
    bot.action('contact_telegram', ContactAndAboutHandlers.showContactTelegram);
    bot.action('contact_website', ContactAndAboutHandlers.showContactWebsite);
    
    // About
    bot.action('about', ContactAndAboutHandlers.showAbout);

    console.log('✅ Contact and About handlers registered');
  }
}

module.exports = ContactAndAboutHandlers;
