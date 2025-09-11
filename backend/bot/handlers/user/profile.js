const { User } = require('../../../models');
const { mainMenuKeyboard } = require('../../user/keyboards');

async function startHandler(ctx) {
  try {
    const telegramId = ctx.from.id;
    let user = await User.findOne({ telegramId });
    if (!user) {
      user = new User({
        telegramId: ctx.from.id,
        firstName: ctx.from.first_name || null,
        lastName: ctx.from.last_name || null,
        username: ctx.from.username || null,
        language: ctx.from.language_code || 'uz',
        phone: null
      });
      await user.save();
    } else {
      // updateLastActivity metodi yo'q bo'lishi mumkin; updatedAt ni yangilaymiz
      user.updatedAt = new Date();
      await user.save();
    }
    ctx.session.user = user;
    // Keraksiz bo'sh xabar yuborilmasin (ikkita nuqta ko'rinishini oldini olamiz)
    if (!user.firstName) {
      ctx.session.waitingFor = 'first_name';
      return await ctx.reply('Ismingizni kiriting:');
    }
    // Telefon raqami yo'q bo'lsa so'raymiz, bo'lmasa davom etamiz
    if (!user.phone) {
      try { await ctx.reply('📱 Telefon raqamingizni ilova orqali ulashing:', { reply_markup: { keyboard: [[{ text: '📱 Telefon raqamni ulashish', request_contact: true }]], resize_keyboard: true } }); } catch {}
    }
    const stats = await getWelcomeStats();
    const welcomeHtml = `
🎉 <b>Xush kelibsiz, ${user.firstName || ''}!</b>

🍽️ <b>Oshxona Professional Bot</b>ga xush kelibsiz!

Bu yerda siz:
• 🛍️ Oson buyurtma bera olasiz
• 🚚 Yetkazib berish xizmatidan foydalanasiz
• 🏃 Olib ketish imkoniyati
• 🍽️ Restoranda ovqatlanish
• 💳 Turli to'lov usullari
${stats}

Boshlash uchun quyidagi tugmalardan foydalaning!`;

    // Send welcome message with inline keyboard only
    try {
      const { mainMenuKeyboard } = require('../../user/keyboards');
      await ctx.replyWithHTML(welcomeHtml, mainMenuKeyboard);
    } catch (error) {
      console.error('Welcome message error:', error);
      await ctx.reply(welcomeHtml.replace(/<[^>]*>/g, ''));
    }
  } catch (error) {
    console.error('Start handler error:', error);
    await ctx.reply('❌ Boshlashda xatolik yuz berdi. Qaytadan urinib ko\'ring.');
  }
}

async function showProfile(ctx) {
  try {
    const user = ctx.session.user || await User.findOne({ telegramId: ctx.from.id });
    if (!user) {
      await ctx.answerCbQuery('❌ Foydalanuvchi topilmadi!', { show_alert: true });
      return;
    }
    
    const stats = user.stats || { totalOrders: 0 };
    const loyalty = user.loyaltyPoints || 0;
    const level = user.loyaltyLevel || 'STARTER';
    
    const profileText = `👤 **Profil ma'lumotlari**\n\n` +
      `📝 **Ism:** ${user.firstName} ${user.lastName || ''}\n` +
      `📞 **Telefon:** ${user.phone || 'Kiritilmagan'}\n` +
      `🌐 **Til:** ${user.language || 'uz'}\n\n` +
      `📊 **Statistika:**\n` +
      `   🛒 Buyurtmalar: ${stats.totalOrders}\n` +
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
}

async function getWelcomeStats() {
  try {
    const { Product, Category } = require('../../../models');
    let totalProducts = 0;
    let totalCategories = 0;
    try {
      totalProducts = await Product.countDocuments({ isActive: true });
    } catch (error) {
      totalProducts = 0;
    }
    try {
      totalCategories = await Category.countDocuments({ isActive: true });
    } catch (error) {
      totalCategories = 0;
    }
    return `\n📊 <b>Bizda mavjud:</b>\n• 🍽️ ${totalCategories} kategoriya\n• 🥘 ${totalProducts} mahsulot\n• 🚚 Tez yetkazib berish\n• 💳 Qulay to'lov`;
  } catch (error) {
    return `\n📊 <b>Bizda mavjud:</b>\n• 🍽️ Ko'plab kategoriyalar\n• 🥘 Turli xil mahsulotlar\n• 🚚 Tez yetkazib berish\n• 💳 Qulay to'lov`;
  }
}

async function showProfileMenu(ctx) {
  try {
    const message = `👤 Mening profilim\n\n` +
      `📊 Statistika\n💎 Loyalty\n📋 Buyurtmalarim\n⚙️ Sozlamalar`;
    
    await ctx.editMessageText(message, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '📋 Buyurtmalarim', callback_data: 'my_orders' }],
          [{ text: '💎 Loyalty dasturi', callback_data: 'my_loyalty_level' }],
          [{ text: '📊 Statistikam', callback_data: 'my_stats' }],
          [{ text: '🔙 Bosh sahifa', callback_data: 'main_menu' }]
        ]
      }
    });
  } catch (error) {
    console.error('❌ Profile menu error:', error);
    await ctx.answerCbQuery('❌ Xatolik yuz berdi!', { show_alert: true });
  }
}

async function changePhone(ctx) {
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
}

async function changeLanguage(ctx) {
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
  } catch (error) {
    console.error('❌ Change language error:', error);
    await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
  }
}

async function setLanguage(ctx, lang) {
  try {
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
}

async function usePointsAmount(ctx, amount) {
  try {
    ctx.session.pointsToUse = amount;
    
    const user = await User.findOne({ telegramId: ctx.from.id });
    if (!user || user.loyaltyPoints < amount) {
      await ctx.answerCbQuery('❌ Yetarli ball yo\'q!', { show_alert: true });
      return;
    }

    await ctx.answerCbQuery(`✅ ${amount.toLocaleString()} ball tanlandi`);
    await ctx.editMessageText(
      `✅ <b>${amount.toLocaleString()} ball tanlandi</b>\n\n💡 Keyingi buyurtmangizda avtomatik qo'llaniladi.\n\n🛒 Buyurtma berishni boshlaysizmi?`,
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🛒 Buyurtma berish', callback_data: 'start_order' }],
            [{ text: '🔙 Orqaga', callback_data: 'my_bonuses' }]
          ]
        }
      }
    );
  } catch (error) {
    console.error('❌ use_points_amount error:', error);
    if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
  }
}

module.exports = {
  startHandler,
  showProfile,
  showProfileMenu,
  changePhone,
  changeLanguage,
  setLanguage,
  usePointsAmount,
  getWelcomeStats
};
