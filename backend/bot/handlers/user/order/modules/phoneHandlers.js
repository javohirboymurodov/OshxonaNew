const { askPhoneInlineKeyboard, requestPhoneReplyKeyboard } = require('../../../../user/keyboards');
const BaseHandler = require('../../../../../utils/BaseHandler');

/**
 * Phone Handlers Module
 * Telefon operatsiyalari moduli
 */

class PhoneHandlers extends BaseHandler {
  /**
   * Telefon raqamini so'rash
   * @param {Object} ctx - Telegraf context
   */
  static async askForPhone(ctx) {
    return BaseHandler.safeExecute(async () => {
      // Agar telefon raqam allaqachon so'ralgan bo'lsa va bu profil orqali emas, qayta so'ramaymiz
      if (ctx.session.phoneRequested && ctx.session.waitingFor !== 'phone') {
        console.log('Phone already requested, skipping...');
        return;
      }

      // Telefon raqam so'ralganini belgilaymiz
      ctx.session.phoneRequested = true;
      ctx.session.waitingFor = 'phone';

      const msg = "📱 Telefon raqamingiz kerak.\nSiz buyurtma qilishingiz va siz bilan bog'lanishimiz uchun telefon raqamingizni ulashing.";
      await ctx.reply(msg, askPhoneInlineKeyboard());
      try {
        await ctx.reply('👇 Pastdagi tugma orqali telefon raqamingizni ulashing:', requestPhoneReplyKeyboard());
      } catch {}
    }, ctx, "❌ Telefon raqamini so'rashda xatolik!");
  }
}

module.exports = PhoneHandlers;