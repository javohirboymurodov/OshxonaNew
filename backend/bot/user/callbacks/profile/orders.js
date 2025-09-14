// 📋 MY ORDERS CALLBACKS
const { showMyOrders, myOrdersCallbackHandler } = require('../../../handlers/user/myOrders');

function registerOrdersCallbacks(bot) {
  // Main my orders
  bot.action('my_orders', async (ctx) => {
    try {
      await showMyOrders(ctx);
    } catch (error) {
      console.error('❌ my_orders error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  // My orders callback handler
  bot.action(/^my_orders_/, async (ctx) => {
    try {
      await myOrdersCallbackHandler(ctx);
    } catch (error) {
      console.error('❌ my_orders callback error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });
}

module.exports = { registerOrdersCallbacks };