// User module - /start, basic commands
const { User } = require('../../models');
const { mainMenuKeyboard, askPhoneInlineKeyboard, requestPhoneReplyKeyboard } = require('./keyboards');

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
          const CourierHandlers = require('../handlers/courier/handlers');
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

      // Parse /start payload: table_{number}_b_{branchId}
      const text = ctx.message?.text || '';
      const payload = text.split(' ').slice(1).join(' ');
      const match = /^table_(\d+)_b_([0-9a-fA-F]{24})$/.exec(payload || '');
      if (match) {
        const tableNumber = match[1];
        const branchId = match[2];
        const { handleDineInQR } = require('../handlers/user/order/index');
        await handleDineInQR(ctx, tableNumber, branchId);
        return;
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
