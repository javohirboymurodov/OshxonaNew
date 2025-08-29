// 📂 CATALOG & CATEGORIES + 📦 PRODUCT HANDLING
const CatalogHandlers = require('../../handlers/user/catalog/index');
const ProductHandlers = require('../../handlers/user/catalog/productHandlers');

function registerCatalogCallbacks(bot) {
  // ========================================
  // 📂 CATALOG & CATEGORIES
  // ========================================

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
  bot.action('branches', CatalogHandlers.showBranches);

  // Nearest branch - request location
  bot.action('nearest_branch', async (ctx) => {
    try {
      if (!ctx.from?.id) {
        return await ctx.answerCbQuery('❌ Noto\'g\'ri so\'rov');
      }
      
      await ctx.editMessageText('📍 Eng yaqin filialimizni topish uchun lokatsiyangizni yuboring:', {
        reply_markup: {
          inline_keyboard: [
            [{ text: '📍 Lokatsiya yuborish', callback_data: 'request_location_nearest' }],
            [{ text: '🔙 Ortga', callback_data: 'branches' }]
          ]
        }
      });
      await ctx.answerCbQuery();
    } catch (error) {
      console.error('❌ nearest_branch error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  // Branch selection and details (nearest/branch_<id>)
  bot.action(/^branch_(.+)$/, async (ctx) => {
    try {
      await CatalogHandlers.showBranchDetails(ctx);
      // Show promotions after branch selection
      const UXImprovements = require('../../../improvements/ux-improvements');
      setTimeout(() => {
        UXImprovements.showPromotions(ctx).catch(console.error);
      }, 1000);
    } catch (error) {
      console.error('❌ branch selection error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  // Request location for nearest branch
  bot.action('request_location_nearest', async (ctx) => {
    try {
      // Set waiting state for nearest branch
      const { User } = require('../../../models');
      await User.findOneAndUpdate(
        { telegramId: ctx.from.id },
        { 
          $set: { 
            'session.waitingForLocation': true,
            'session.locationType': 'nearest_branch'
          }
        },
        { upsert: true, new: true }
      );
      
      await ctx.reply('📍 Iltimos, quyidagi tugma orqali lokatsiyangizni yuboring:', {
        reply_markup: {
          keyboard: [
            [{ text: '📍 Lokatsiyani yuborish', request_location: true }]
          ],
          resize_keyboard: true,
          one_time_keyboard: true
        }
      });
      await ctx.answerCbQuery();
    } catch (error) {
      console.error('❌ request_location_nearest error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  // Branch location sharing
  bot.action(/^branch_location_(.+)$/, CatalogHandlers.shareBranchLocation);

  // Branch phone display
  bot.action(/^branch_phone_(.+)$/, async (ctx) => {
    try {
      await CatalogHandlers.showBranchPhone(ctx);
    } catch (error) {
      console.error('❌ branch_phone error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  // Location request for nearest branch
  bot.action('location_request_nearest', async (ctx) => {
    try {
      await ctx.reply('📍 Lokatsiyangizni yuboring:', {
        reply_markup: {
          keyboard: [
            [{ text: '📍 Lokatsiya yuborish', request_location: true }]
          ],
          resize_keyboard: true,
          one_time_keyboard: true
        }
      });
      await ctx.answerCbQuery();
    } catch (error) {
      console.error('❌ location_request_nearest error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  // Category handling
  bot.action(/^category_(.+)$/, async (ctx) => {
    try {
      await CatalogHandlers.showCategoryProducts(ctx);
    } catch (error) {
      console.error('❌ category error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  // Profile
  bot.action('profile', async (ctx) => {
    try {
      const { showMyOrders } = require('../../handlers/user/myOrders');
      await showMyOrders(ctx);
    } catch (error) {
      console.error('❌ profile error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  // ========================================
  // 📦 PRODUCT HANDLING
  // ========================================

  // Product details callback (for product_details_* pattern) - MUST BE FIRST!
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

  // Category products pagination: category_products_<categoryId>_<page>
  bot.action(/^category_products_(.+)_(\d+)$/, async (ctx) => {
    try {
      await CatalogHandlers.showCategoryProducts(ctx);
    } catch (error) {
      console.error('❌ category_products error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  console.log('✅ Catalog callbacks registered');
}

module.exports = { registerCatalogCallbacks };