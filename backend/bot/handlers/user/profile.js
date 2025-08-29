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
    let msg = `👤 <b>Profilingiz</b>\n\n`;
    msg += `Ism: <b>${user.firstName || '-'}</b>\n`;
    msg += `Familiya: <b>${user.lastName || '-'}</b>\n`;
    msg += `Username: <b>${user.username ? '@' + user.username : '-'}</b>\n`;
    msg += `Telefon: <b>${user.phone || '-'}</b>\n`;
    await ctx.reply(msg, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [ { text: '🔙 Orqaga', callback_data: 'back_to_main' } ]
        ]
      }
    });
  } catch (error) {
    console.error('Show profile error:', error);
    await ctx.reply("❌ Profilni ko'rsatishda xatolik!");
  }
}

async function getWelcomeStats() {
  try {
    const { Product, Category } = require('../../models');
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

module.exports = {
  startHandler,
  showProfile,
  getWelcomeStats
};
