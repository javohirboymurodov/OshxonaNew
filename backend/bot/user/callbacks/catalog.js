// 📂 CATALOG & CATEGORIES + 📦 PRODUCT HANDLING
const CatalogHandlers = require('../../handlers/user/catalog/index');
const ProductHandlers = require('../../handlers/user/catalog/productHandlers');
const PromotionHandlers = require('../../handlers/user/promotionHandlers');
function registerCatalogCallbacks(bot) {
  // ========================================
  // 📂 CATALOG & CATEGORIES
  // ========================================

  // Categories: Bot ichida kategoriyalar ro'yxati
  bot.action('show_categories', async (ctx) => { 
    await CatalogHandlers.showCategories(ctx); 
  });

  // Catalog: WebApp va bot kategoriyalar o'rtasida tanlov
  bot.action('show_catalog', async (ctx) => {
    try {
      const webAppUrl = `${process.env.WEBAPP_URL}?telegramId=${ctx.from.id}`;
      
      await ctx.reply('🛍️ Katalog turini tanlang:', {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🌐 To\'liq katalog (WebApp)', web_app: { url: webAppUrl } }],
            [{ text: '📂 Oddiy kategoriyalar', callback_data: 'show_categories' }],
            [{ text: '🔙 Orqaga', callback_data: 'back_to_main' }]
          ]
        }
      });
    } catch (error) {
      console.error('❌ show_catalog error:', error);
      // Fallback to categories if WebApp fails
      await CatalogHandlers.showCategories(ctx);
    }
  });

  // Cart
  bot.action('show_cart', async (ctx) => {
    try {
      const { showCart } = require('../../handlers/user/cart');
      await showCart(ctx);
    } catch (error) {
      console.error('❌ show_cart error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  // Branches
  // bot.action('branches', CatalogHandlers.showBranches);
  bot.action('show_branches', async (ctx) => await CatalogHandlers.showBranches(ctx, 1));

  // share_branch_location to'g'ri regex
  bot.action(/^share_branch_location_(.+)$/, async (ctx) => {
    await CatalogHandlers.shareBranchLocation(ctx, ctx.match[1]);
  });
  
  // branch_phone callback
  bot.action(/^branch_phone_(.+)$/, async (ctx) => {
    await CatalogHandlers.showBranchPhone(ctx);
  });

 // Nearest branch - request location
 bot.action('nearest_branch', async (ctx) => {
  try {
    await ctx.editMessageText(
      '📍 **Eng yaqin filialni topish**\n\nJoylashuvingizni ulashing:',
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📍 Joylashuvni ulashish', callback_data: 'request_location' }],
            [{ text: '🔙 Orqaga', callback_data: 'show_branches' }]
          ]
        }
      }
    );
  } catch (error) {
    console.error('❌ nearest_branch error:', error);
    if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
  }
});

// Branch selection and details (nearest/branch_<id>)
bot.action(/^branch_.+$/, async (ctx) => { 
  try {
    await CatalogHandlers.handleBranchSelection(ctx);
    
    // Show promotions after branch selection
    const branchId = ctx.callbackQuery?.data?.replace('branch_', '');
    if (branchId && branchId !== 'nearest') {
      const promoData = await PromotionHandlers.showBranchPromotions(branchId);
      if (promoData) {
        await ctx.reply(promoData.message, {
            parse_mode: 'Markdown',
          reply_markup: promoData.keyboard
        });
      }
    }
  } catch (e) {
    console.error('branch selection error:', e);
  }
});

 // Request location for nearest branch
 bot.action('request_location', async (ctx) => {
  try {
    // Set waiting state for nearest branch
    ctx.session = ctx.session || {};
    ctx.session.waitingFor = 'branch_location';
    
    await ctx.editMessageText('📍 Joylashuvingizni ulashing:', {
      reply_markup: {
        inline_keyboard: [[{ text: '🔙 Orqaga', callback_data: 'show_branches' }]]
      }
    });
    await ctx.reply('📍 Pastdagi tugma orqali joylashuvingizni yuboring:', {
      reply_markup: {
        keyboard: [[{ text: '📍 Joylashuvni yuborish', request_location: true }]],
        resize_keyboard: true,
        one_time_keyboard: true
      }
    });
  } catch (error) {
    console.error('❌ request_location error:', error);
    if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
  }
});

 


  // ========================================
  // 📦 PRODUCT HANDLING
  // ========================================

  // Category products pagination: category_products_<categoryId>_<page> - MUST BE FIRST!
  bot.action(/^category_products_(.+)_(\d+)$/, async (ctx) => {
    try {
      await CatalogHandlers.handleShowCategoryProducts(ctx);
    } catch (error) {
      console.error('❌ category_products error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  // Product details callback (for product_details_* pattern)
  bot.action(/^product_details_(.+)$/, async (ctx) => {
    try {
      const productId = ctx.match[1];
      await ProductHandlers.showProductDetails(ctx, productId);
    } catch (error) {
      console.error('❌ product_details error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  // Generic product callback (for simple product_* pattern)
  bot.action(/^product_(.+)$/, async (ctx) => {
    try {
      const productId = ctx.match[1];
      await ProductHandlers.showProductDetails(ctx, productId);
    } catch (error) {
      console.error('❌ product error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  // Category handling - MUST BE AFTER category_products!
  bot.action(/^category_(.+)$/, async (ctx) => {
    try {
      await CatalogHandlers.handleShowCategoryProducts(ctx);
    } catch (error) {
      console.error('❌ category error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  console.log('✅ Catalog callbacks registered');
}

module.exports = { registerCatalogCallbacks };