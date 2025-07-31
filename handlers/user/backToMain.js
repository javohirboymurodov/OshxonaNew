const { backToMainKeyboard } = require('../../keyboards/userKeyboards');
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
    await ctx.reply('.', { reply_markup: { remove_keyboard: true } });
    await startHandler(ctx);
  } catch (error) {
    console.error('Back to main error:', error);
    await ctx.reply('❌ Asosiy menyuga qaytishda xatolik', {
      reply_markup: backToMainKeyboard.reply_markup
    });
  }
}

module.exports = { backToMain };
