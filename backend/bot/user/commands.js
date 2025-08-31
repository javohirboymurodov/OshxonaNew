// User module - /start, basic commands
const { User } = require('../../models');
const { mainMenuKeyboard, askPhoneInlineKeyboard, requestPhoneReplyKeyboard } = require('./keyboards');
const LoyaltyService = require('../../services/loyaltyService');

/**
 * User module ni bot instance ga ulash
 * @param {Telegraf} bot - Telegraf bot instance
 */
function registerUserModule(bot) {
  // /start command
  bot.command('start', async (ctx) => {
    console.log('🚀 /start command received from:', ctx.from.first_name);
    try {
      const telegramId = ctx.from.id;
      const firstName = ctx.from.first_name;
      const lastName = ctx.from.last_name || '';
      const username = ctx.from.username || '';

      // Faqat mavjud userni o'qiymiz; telefon berilmaguncha saqlamaymiz
      const user = await User.findOne({ telegramId });

      // Agar kuryer bo'lsa, kuryer paneliga yo'naltiramiz
      if (user && user.role === 'courier') {
        try {
          const CourierHandlers = require('../handlers/courier/handlers.js.backup');
          await CourierHandlers.start(ctx);
          return;
        } catch (e) {
          console.warn('Courier handlers not found:', e.message);
          console.error('Courier handlers error:', e);
        }
      }

      // User mavjud emas yoki telefon yo'q → telefonni majburiy so'raymiz
      if (!user || !user.phone) {
        const msg = `📱 Telefon raqamingiz kerak.\nSiz buyurtma qilishingiz va siz bilan bog'lanishimiz uchun telefon raqamingizni ulashing.`;
        await ctx.reply(msg, askPhoneInlineKeyboard());
        try {
          await ctx.reply('👇 Pastdagi tugma orqali telefon raqamingizni ulashing:', requestPhoneReplyKeyboard());
        } catch {}
        return;
      }

      // Mavjud user ma'lumotlarini sinxron yangilash (saqlash shart emas)
      try {
        let needUpdate = false;
        if (user.firstName !== firstName) { user.firstName = firstName; needUpdate = true; }
        if (user.lastName !== lastName) { user.lastName = lastName; needUpdate = true; }
        if (user.username !== username) { user.username = username; needUpdate = true; }
        if (needUpdate) await user.save();
      } catch {}

      // Parse /start payload
      const text = ctx.message?.text || '';
      const payload = text.split(' ').slice(1).join(' ');
      
      // Handle table QR: table_{number}_b_{branchId}
      const tableMatch = /^table_(\d+)_b_([0-9a-fA-F]{24})$/.exec(payload || '');
      if (tableMatch) {
        const tableNumber = tableMatch[1];
        const branchId = tableMatch[2];
        const { handleDineInQR } = require('../handlers/user/order/index');
        await handleDineInQR(ctx, tableNumber, branchId);
        return;
      }

      // Handle referral: ref_{userId}
      const referralMatch = /^ref_([0-9a-fA-F]{24})$/.exec(payload || '');
      if (referralMatch && user && user.phone) {
        const referrerId = referralMatch[1];
        try {
          // Check if user already has a referrer
          if (!user.referrals.referredBy) {
            const success = await LoyaltyService.processReferral(referrerId, user._id);
            if (success) {
              await ctx.reply(
                '🎉 **Tabriklaymiz!**\n\n' +
                '👥 Siz referral orqali qo\'shildingiz!\n' +
                '🎁 Sizga 5,000 bonus ball berildi\n' +
                '💎 Do\'stingiz ham 3,000 ball oldi\n\n' +
                '🛒 Endi buyurtma berishingiz mumkin!',
                { parse_mode: 'Markdown' }
              );
            }
          }
        } catch (error) {
          console.error('Referral processing error:', error);
        }
      }

      const welcomeMessage = `\n🍽️ **${firstName}, Oshxona botiga xush kelibsiz!**\n\n🥘 Eng mazali taomlarni buyurtma qiling\n🚚 Tez va sifatli yetkazib berish\n💳 Qulay to'lov usullari\n\nQuyidagi tugmalardan birini tanlang:`;
      await ctx.replyWithHTML(welcomeMessage, { reply_markup: mainMenuKeyboard.reply_markup });
    } catch (error) {
      console.error('Start handler xatosi:', error);
      await ctx.reply('❌ Xatolik yuz berdi!');
    }
  });

  // /menu command
  bot.command('menu', async (ctx) => {
    const welcomeMessage = `🍽️ **Asosiy menyu**\n\nKerakli bo'limni tanlang:`;
    await ctx.replyWithHTML(welcomeMessage, { reply_markup: mainMenuKeyboard.reply_markup });
  });

  console.log('✅ User module registered');
}

module.exports = { registerUserModule };
