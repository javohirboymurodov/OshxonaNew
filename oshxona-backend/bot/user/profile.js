// Profile-specific actions (change phone, change language)
module.exports = function registerProfile(bot) {
  const { User } = require('../../models');

  // Start profile view
  bot.action('my_profile', async (ctx) => {
    try {
      const user = await User.findOne({ telegramId: ctx.from.id });
      if (!user) {
        await ctx.answerCbQuery('❌ Foydalanuvchi topilmadi!', { show_alert: true });
        return;
      }
      
      const stats = user.stats || { totalOrders: 0, totalSpent: 0 };
      const loyalty = user.loyaltyPoints || 0;
      const level = user.loyaltyLevel || 'STARTER';
      
      const profileText = `👤 **Profil ma'lumotlari**\n\n` +
        `📝 **Ism:** ${user.firstName} ${user.lastName || ''}\n` +
        `📞 **Telefon:** ${user.phone || 'Kiritilmagan'}\n` +
        `🌐 **Til:** ${user.language || 'uz'}\n\n` +
        `📊 **Statistika:**\n` +
        `   🛒 Buyurtmalar: ${stats.totalOrders}\n` +
        `   💰 Xarajat: ${stats.totalSpent.toLocaleString()} so'm\n` +
        `   💎 Loyalty: ${loyalty.toLocaleString()} ball\n` +
        `   🏆 Daraja: ${level}`;
        
      await ctx.editMessageText(profileText, {
        parse_mode: 'Markdown',
        reply_markup: { 
          inline_keyboard: [
            [{ text: '📞 Telefon o\'zgartirish', callback_data: 'change_phone' }],
            [{ text: '🌐 Tilni o\'zgartirish', callback_data: 'change_language' }],
            [{ text: '💎 Loyalty dasturi', callback_data: 'my_loyalty_level' }],
            [{ text: '🔙 Bosh sahifa', callback_data: 'back_to_main' }]
          ] 
        }
      });
    } catch (error) {
      console.error('❌ Profile view error:', error);
      await ctx.answerCbQuery('❌ Xatolik yuz berdi!', { show_alert: true });
    }
  });

  // Change phone (asks via reply keyboard handled elsewhere)
  bot.action('change_phone', async (ctx) => {
    try {
      // Profil orqali telefon o'zgartirish uchun maxsus flag
      ctx.session.phoneRequested = false;
      ctx.session.waitingFor = 'phone';
      ctx.session.changingPhone = true;
      
      await ctx.editMessageText(
        '📱 **Telefon raqamini o\'zgartirish**\n\n' +
        'Yangi telefon raqamingizni pastdagi tugma orqali ulashing:',
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '📞 Telefon ulashish', callback_data: 'req_phone' }],
              [{ text: '🔙 Profilga qaytish', callback_data: 'my_profile' }]
            ]
          }
        }
      );
      
      // Send reply keyboard for phone sharing
      await ctx.reply('👇 Pastdagi tugma orqali telefon raqamingizni ulashing:', {
        reply_markup: {
          keyboard: [[{ text: '📞 Telefonni ulashish', request_contact: true }]],
          resize_keyboard: true,
          one_time_keyboard: true
        }
      });
      
    } catch (error) {
      console.error('❌ Change phone error:', error);
      await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
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
      
      const langNames = { uz: 'O\'zbekcha', ru: 'Русский', en: 'English' };
      await ctx.answerCbQuery(`✅ Til o'zgartirildi: ${langNames[lang]}`);
      
      // Return to profile
      setTimeout(async () => {
        try {
          const user = await User.findOne({ telegramId: ctx.from.id });
          if (user) {
            const stats = user.stats || { totalOrders: 0, totalSpent: 0 };
            const loyalty = user.loyaltyPoints || 0;
            const level = user.loyaltyLevel || 'STARTER';
            
            const profileText = `👤 **Profil ma'lumotlari**\n\n` +
              `📝 **Ism:** ${user.firstName} ${user.lastName || ''}\n` +
              `📞 **Telefon:** ${user.phone || 'Kiritilmagan'}\n` +
              `🌐 **Til:** ${langNames[user.language] || 'O\'zbekcha'}\n\n` +
              `📊 **Statistika:**\n` +
              `   🛒 Buyurtmalar: ${stats.totalOrders}\n` +
              `   💰 Xarajat: ${stats.totalSpent.toLocaleString()} so'm\n` +
              `   💎 Loyalty: ${loyalty.toLocaleString()} ball\n` +
              `   🏆 Daraja: ${level}`;
              
            await ctx.editMessageText(profileText, {
              parse_mode: 'Markdown',
              reply_markup: { 
                inline_keyboard: [
                  [{ text: '📞 Telefon o\'zgartirish', callback_data: 'change_phone' }],
                  [{ text: '🌐 Tilni o\'zgartirish', callback_data: 'change_language' }],
                  [{ text: '💎 Loyalty dasturi', callback_data: 'my_loyalty_level' }],
                  [{ text: '🔙 Bosh sahifa', callback_data: 'back_to_main' }]
                ] 
              }
            });
          }
        } catch (error) {
          console.error('❌ Profile refresh error:', error);
        }
      }, 1000);
      
    } catch (error) {
      console.error('❌ Language change error:', error);
      await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });
};


