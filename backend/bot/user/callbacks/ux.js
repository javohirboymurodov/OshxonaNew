// ⚡ QUICK ORDER & MOBILE UX
const quickOrderHandlers = require('../../handlers/user/ux/quickOrderHandlers');

function registerUXCallbacks(bot) {
  // ========================================
  // ⚡ QUICK ORDER & MOBILE UX
  // ========================================

  // Quick order menu
  bot.action('quick_order', async (ctx) => {
    try {
      await quickOrderHandlers.showQuickOrder(ctx);
    } catch (error) {
      console.error('❌ quick_order error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  // Quick popular products
  bot.action('quick_popular', async (ctx) => {
    try {
      await quickOrderHandlers.showPopularProducts(ctx);
    } catch (error) {
      console.error('❌ quick_popular error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  // Quick fast products
  bot.action('quick_fast', async (ctx) => {
    try {
      await quickOrderHandlers.showFastProducts(ctx);
    } catch (error) {
      console.error('❌ quick_fast error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  // Quick add product
  bot.action(/^quick_add_(.+)$/, async (ctx) => {
    try {
      await quickOrderHandlers.quickAddProduct(ctx);
    } catch (error) {
      console.error('❌ quick_add error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  // Add to favorites
  bot.action(/^add_favorite_(.+)$/, async (ctx) => {
    try {
      await quickOrderHandlers.addToFavorites(ctx);
    } catch (error) {
      console.error('❌ add_favorite error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  // Show favorites
  bot.action('show_favorites', async (ctx) => {
    try {
      await quickOrderHandlers.showFavorites(ctx);
    } catch (error) {
      console.error('❌ show_favorites error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  // Remove from favorites
  bot.action(/^remove_favorite_(.+)$/, async (ctx) => {
    try {
      await quickOrderHandlers.removeFromFavorites(ctx);
    } catch (error) {
      console.error('❌ remove_favorite error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  console.log('✅ UX callbacks registered');
}

module.exports = { registerUXCallbacks };