// Profile-specific actions (change phone, change language)
module.exports = function registerProfile(bot) {
  const { User } = require('../../models');

  // Start profile view
  bot.action('my_profile', async (ctx) => {
    try {
      const user = await User.findOne({ telegramId: ctx.from.id });
      if (!user) return await ctx.answerCbQuery('❌ Foydalanuvchi topilmadi!');
      const profileText = `\n👤 **Profil ma'lumotlari**\n\n📝 **Ism:** ${user.firstName} ${user.lastName || ''}\n📞 **Telefon:** ${user.phone || 'Kiritilmagan'}\n🌐 **Til:** ${user.language}\n📊 **Umumiy buyurtmalar:** ${user.stats.totalOrders}\n💰 **Umumiy xarajat:** ${user.stats.totalSpent.toLocaleString()} so'm`;
      await ctx.editMessageText(profileText, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [
          [{ text: '📞 Telefon o\'zgartirish', callback_data: 'change_phone' }],
          [{ text: '🌐 Tilni o\'zgartirish', callback_data: 'change_language' }],
          [{ text: '🔙 Bosh sahifa', callback_data: 'main_menu' }]
        ] },
      });
    } catch {}
  });

  // Change phone (asks via reply keyboard handled elsewhere)
  bot.action('change_phone', async (ctx) => {
    // Profil orqali telefon o'zgartirish uchun maxsus flag
    ctx.session.phoneRequested = false;
    ctx.session.waitingFor = 'phone';
    
    const { askForPhone } = require('../handlers/user/order/index');
    await askForPhone(ctx);
  });

  // Change language
  bot.action('change_language', async (ctx) => {
    try {
      const keyboard = {
        inline_keyboard: [
          [{ text: '🇺🇿 O\'zbekcha', callback_data: 'set_lang_uz' }],
          [{ text: '🇷🇺 Русский', callback_data: 'set_lang_ru' }],
          [{ text: '🇬🇧 English', callback_data: 'set_lang_en' }],
          [{ text: '🔙 Orqaga', callback_data: 'my_profile' }]
        ]
      };
      await ctx.editMessageText('🌐 Tilni tanlang:', { reply_markup: keyboard });
    } catch {}
  });

  bot.action(/^set_lang_(uz|ru|en)$/, async (ctx) => {
    try {
      const lang = ctx.match[1];
      await User.findOneAndUpdate({ telegramId: ctx.from.id }, { language: lang });
      await ctx.answerCbQuery('✅ Til o\'zgartirildi');
      // Return to profile
      ctx.callbackQuery.data = 'my_profile';
      await bot.handleUpdate(ctx.update); // re-dispatch
    } catch {}
  });
};


