const { backToMainKeyboard, mainMenuKeyboard } = require('../../user/keyboards');
const { startHandler } = require('./profile');

async function backToMain(ctx) {
  try {
    if (ctx.session) {
      delete ctx.session.currentCategory;
      delete ctx.session.currentProduct;
      delete ctx.session.orderStep;
      delete ctx.session.waitingFor;
      delete ctx.session.orderData;
      delete ctx.session.adminAction;
    }
    
    // Reply keyboard'ni tozalash (location tugmasi yo'qolishi uchun)
    try {
      await ctx.reply('', { reply_markup: { remove_keyboard: true } });
    } catch {}
    
    // Telefon bo'yicha jarayon bo'lsa ham to'xtatamiz (bo'sh xabar yubormaymiz)
    // Har safar to'liq welcome matn + main menyu ko'rsatamiz
    await startHandler(ctx);
  } catch (error) {
    console.error('Back to main error:', error);
    await ctx.reply('❌ Asosiy menyuga qaytishda xatolik', {
      reply_markup: backToMainKeyboard.reply_markup
    });
  }
}

module.exports = { backToMain };
