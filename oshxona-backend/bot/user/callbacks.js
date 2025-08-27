// User callback handlers - Refactored and optimized
const CatalogHandlers = require('../handlers/user/catalog/index');
const ProductHandlers = require('../handlers/user/catalog/productHandlers');

const {
  addToCart,
  updateQuantity,
  removeFromCart,
  showCart,
  clearCart
} = require('../handlers/user/cart');

// const UserOrderHandlers = require('../handlers/user/order/index'); // Temporarily commented due to legacy syntax issue
const { showMyOrders, myOrdersCallbackHandler } = require('../handlers/user/myOrders');
const loyaltyHandlers = require('../handlers/user/loyalty/loyaltyHandlers');
const trackingHandlers = require('../handlers/user/tracking/trackingHandlers');
const quickOrderHandlers = require('../handlers/user/ux/quickOrderHandlers');

// Import organized handler modules
const NavigationHandlers = require('../handlers/user/navigationHandlers');
const ContactAndAboutHandlers = require('../handlers/user/contactAndAboutHandlers');
const PromotionHandlers = require('../handlers/user/promotionHandlers');
const RatingHandlers = require('../handlers/user/ratingHandlers');
const CourierCallbacks = require('../handlers/user/courierCallbacks');

const { User } = require('../../models');
const UXImprovements = require('../../improvements/ux-improvements');

/**
 * User callback handlers ni bot instance ga ulash
 * @param {Telegraf} bot - Telegraf bot instance
 */
function registerUserCallbacks(bot) {
  // Debug logger for all callback queries
  bot.use(async (ctx, next) => {
    if (ctx.updateType === 'callback_query') {
      try {
        const data = String(ctx.callbackQuery?.data || '');
        console.log('🎯 callback_query received:', data, '| from:', ctx.from?.id);
      } catch (e) {
        console.error('🎯 callback_query log error:', e);
      }
    }
    return next();
  });
  // Apply phone guard middleware
  bot.use(NavigationHandlers.phoneGuardMiddleware);

  // Register organized handler modules
  NavigationHandlers.registerCallbacks(bot);
  ContactAndAboutHandlers.registerCallbacks(bot);
  PromotionHandlers.registerCallbacks(bot);
  RatingHandlers.registerCallbacks(bot);
  CourierCallbacks.registerCallbacks(bot);

  // ========================================
  // 📂 CATALOG & CATEGORIES
  // ========================================

  bot.action('show_categories', async (ctx) => { await CatalogHandlers.showCategories(ctx); });
  bot.action('show_catalog', async (ctx) => { await CatalogHandlers.showCategories(ctx); });

  // Cart
  bot.action('show_cart', async (ctx) => {
    try {
      const { showCart } = require('../handlers/user/cart');
      await showCart(ctx);
    } catch (e) {
      console.error('show_cart error', e);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Savatni ochib bo\'lmadi');
    }
  });

  // Branches
  bot.action('show_branches', async (ctx) => { await CatalogHandlers.showBranches(ctx, 1); });
  
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

  // Branch location sharing
  bot.action(/^share_branch_location_(.+)$/, async (ctx) => {
    try { await CatalogHandlers.shareBranchLocation(ctx, ctx.match[1]); } catch (e) { console.error('share_branch_location error', e); }
  });

  // Branch phone display
  bot.action(/^branch_phone_([0-9a-fA-F]{24})$/, async (ctx) => {
    try {
      const { Branch } = require('../../models');
      const id = ctx.match && ctx.match[1] ? ctx.match[1] : (ctx.callbackQuery?.data || '').replace('branch_phone_', '');
      const b = await Branch.findById(id).select('phone');
      if (!b) return ctx.answerCbQuery('❌ Filial topilmadi');
      await ctx.reply(`📞 ${b.phone || 'Telefon raqami topilmadi'}`);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('📞 Telefon');
    } catch (e) { console.error('branch_phone error', e); }
  });

  // Location request for nearest branch
  bot.action('request_location', async (ctx) => {
    try {
      ctx.session.waitingFor = 'branch_location';
      await ctx.editMessageText('📍 Joylashuvingizni ulashing:', {
        reply_markup: {
          inline_keyboard: [[{ text: '🔙 Orqaga', callback_data: 'show_branches' }]]
        }
      });
      try {
        await ctx.reply('📍 Pastdagi tugma orqali joylashuvingizni yuboring:', {
          reply_markup: {
            keyboard: [[{ text: '📍 Joylashuvni yuborish', request_location: true }]],
            resize_keyboard: true,
            one_time_keyboard: true
          }
        });
      } catch {}
    } catch (e) {
      console.error('request_location error', e);
    }
  });

  // Category handling
  bot.action(/^category_(.+)$/, async (ctx) => {
    console.log('🔥 CATEGORY CALLBACK TRIGGERED:', ctx.match);
    const categoryId = ctx.match[1];
    console.log('📋 Category ID extracted:', categoryId);
    try {
      await ProductHandlers.showCategoryProducts(ctx, categoryId);
      console.log('✅ Category products shown successfully');
    } catch (error) {
      console.error('❌ Category products error:', error);
      await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  // Profile
  bot.action('my_profile', async (ctx) => {
    try {
      const { showProfile } = require('../handlers/user/profile');
      await showProfile(ctx);
    } catch (e) {
      console.error('my_profile error:', e);
    }
  });

  // ========================================
  // 📦 PRODUCT HANDLING
  // ========================================

  // Product details callback (for product_details_* pattern) - MUST BE FIRST!
  bot.action(/^product_details_(.+)$/, async (ctx) => {
    console.log('🔥 PRODUCT DETAILS CALLBACK TRIGGERED:', {
      callbackData: ctx.callbackQuery?.data,
      match: ctx.match,
      matchLength: ctx.match?.length,
      extractedId: ctx.match?.[1]
    });
    let productId = ctx.match?.[1];
    if (!productId && ctx.callbackQuery?.data) {
      const manualMatch = ctx.callbackQuery.data.match(/^product_details_(.+)$/);
      productId = manualMatch?.[1];
      console.log('📦 Manual ProductId extraction:', productId);
    }
    console.log('📦 Final Product Details ID:', productId);
    if (!productId) {
      console.error('❌ ProductId extraction failed from callback:', ctx.callbackQuery?.data);
      return await ctx.answerCbQuery('❌ Mahsulot ID noto\'g\'ri!');
    }
    try {
      await ProductHandlers.showProductDetails(ctx, productId);
      console.log('✅ Product details shown successfully');
    } catch (error) {
      console.error('❌ Product details error:', error);
      await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  // Generic product callback (for simple product_* pattern)
  bot.action(/^product_(.+)$/, async (ctx) => {
    console.log('🔥 GENERIC PRODUCT CALLBACK TRIGGERED:', ctx.match);
    const productId = ctx.match[1];
    console.log('📦 Generic Product ID extracted:', productId);
    try {
      await ProductHandlers.showProductDetails(ctx, productId);
      console.log('✅ Generic product details shown successfully');
    } catch (error) {
      console.error('❌ Generic product details error:', error);
      await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  // Category products pagination: category_products_<categoryId>_<page>
  bot.action(/^category_products_([0-9a-fA-F]{24})_(\d+)$/, async (ctx) => {
    try {
      const [, categoryId, pageStr] = ctx.callbackQuery.data.match(/^category_products_([0-9a-fA-F]{24})_(\d+)$/) || [];
      const page = parseInt(pageStr, 10) || 1;
      await ProductHandlers.showCategoryProducts(ctx, categoryId, page);
    } catch (e) {
      console.error('category_products pagination error', e);
    }
  });

  // ========================================
  // 🛒 CART ACTIONS
  // ========================================

  // Support both add_to_cart_<productId> and add_cart_<productId>_<qty>
  bot.action(/^add_to_cart_.+$/, async (ctx) => { await addToCart(ctx); });
  bot.action(/^add_cart_.+$/, async (ctx) => { await addToCart(ctx); });

  // Support change_qty_ and cart_qty_ patterns
  bot.action(/^(change_qty|cart_qty)_.+_(-?\d+)$/, async (ctx) => { await updateQuantity(ctx); });

  bot.action(/^remove_from_cart_(.+)$/, async (ctx) => {
    await removeFromCart(ctx);
  });



  bot.action('clear_cart', async (ctx) => {
    await clearCart(ctx);
  });

  // ========================================
  // 📋 ORDER FLOW (lightweight fallback)
  // ========================================

  // Fallback: start_order -> open categories to let user choose items
  bot.action('start_order', async (ctx) => {
    try {
      await CatalogHandlers.showCategories(ctx);
    } catch (e) {
      console.error('start_order fallback error:', e);
      await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  // Fallback: checkout -> start order process
  bot.action('checkout', async (ctx) => {
    try {
      const UserOrderHandlers = require('../handlers/user/order/index');
      await UserOrderHandlers.startOrder(ctx);
    } catch (e) {
      console.error('checkout fallback error:', e);
      await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  // ========================================
  // 📝 ORDER TYPE HANDLERS
  // ========================================

  // Order type selection handlers
  bot.action('order_type_delivery', async (ctx) => {
    try {
      const UserOrderHandlers = require('../handlers/user/order/index');
      await UserOrderHandlers.handleOrderType(ctx);
    } catch (e) {
      console.error('order_type_delivery error:', e);
      await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  bot.action('order_type_pickup', async (ctx) => {
    try {
      const UserOrderHandlers = require('../handlers/user/order/index');
      await UserOrderHandlers.handleOrderType(ctx);
    } catch (e) {
      console.error('order_type_pickup error:', e);
      await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  bot.action('order_type_dine_in', async (ctx) => {
    try {
      const UserOrderHandlers = require('../handlers/user/order/index');
      await UserOrderHandlers.handleOrderType(ctx);
    } catch (e) {
      console.error('order_type_dine_in error:', e);
      await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  // Branch selection handlers
  bot.action(/^choose_branch_(pickup|dine)_[0-9a-fA-F]{24}$/, async (ctx) => {
    try {
      const OrderFlow = require('../handlers/user/order/orderFlow');
      await OrderFlow.handleChooseBranch(ctx);
    } catch (e) {
      console.error('choose_branch error:', e);
      await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  // Arrival time handlers
  bot.action(/^arrival_time_.+$/, async (ctx) => {
    try {
      const UserOrderHandlers = require('../handlers/user/order/index');
      await UserOrderHandlers.handleArrivalTime(ctx);
    } catch (e) {
      console.error('arrival_time error:', e);
      await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  // Order step back handler
  bot.action('order_step_back', async (ctx) => {
    try {
      const UserOrderHandlers = require('../handlers/user/order/index');
      await UserOrderHandlers.startOrder(ctx);
    } catch (e) {
      console.error('order_step_back error:', e);
      await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  // ========================================
  // 📋 MY ORDERS
  // ========================================

  bot.action('my_orders', async (ctx) => {
    try {
      await showMyOrders(ctx);
    } catch (error) {
      console.error('❌ my_orders error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  // Pagination and details for "My Orders"
  bot.action(/^orders_page_\d+$/, async (ctx) => {
    try {
      await myOrdersCallbackHandler(ctx);
    } catch (error) {
      console.error('❌ my_orders pagination error:', error);
    }
  });

  bot.action(/^order_detail_.+$/, async (ctx) => {
    try {
      await myOrdersCallbackHandler(ctx);
    } catch (error) {
      console.error('❌ my_orders detail error:', error);
    }
  });

  bot.action('back_to_my_orders', async (ctx) => {
    try {
      await myOrdersCallbackHandler(ctx);
    } catch (error) {
      console.error('❌ back_to_my_orders error:', error);
    }
  });

  // ========================================
  // 💎 LOYALTY PROGRAM
  // ========================================

  // Loyalty level
  bot.action('my_loyalty_level', async (ctx) => {
    try {
      await loyaltyHandlers.showMyLevel(ctx);
    } catch (error) {
      console.error('❌ my_loyalty_level error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  // Bonuses
  bot.action('my_bonuses', async (ctx) => {
    try {
      await loyaltyHandlers.showMyBonuses(ctx);
    } catch (error) {
      console.error('❌ my_bonuses error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  // Referral program
  bot.action('referral_program', async (ctx) => {
    try {
      await loyaltyHandlers.showReferralProgram(ctx);
    } catch (error) {
      console.error('❌ referral_program error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  // Use points
  bot.action('use_points', async (ctx) => {
    try {
      await loyaltyHandlers.usePoints(ctx);
    } catch (error) {
      console.error('❌ use_points error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  // Use points - amounts
  bot.action(/^use_points_(\d+)$/, async (ctx) => {
    try {
      const amount = parseInt(ctx.match[1]);
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
  });

  // My stats
  bot.action('my_stats', async (ctx) => {
    try {
      await loyaltyHandlers.showMyStats(ctx);
    } catch (error) {
      console.error('❌ my_stats error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  // ========================================
  // 📍 ORDER TRACKING
  // ========================================

  // Track order
  bot.action(/^track_(.+)$/, async (ctx) => {
    try {
      await trackingHandlers.trackOrder(ctx);
    } catch (error) {
      console.error('❌ track_order error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  // Courier location
  bot.action(/^courier_location_(.+)$/, async (ctx) => {
    try {
      await trackingHandlers.showCourierLocation(ctx);
    } catch (error) {
      console.error('❌ courier_location error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  // Reorder
  bot.action(/^reorder_(.+)$/, async (ctx) => {
    try {
      await trackingHandlers.reorderItem(ctx);
    } catch (error) {
      console.error('❌ reorder error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  // Confirm reorder
  bot.action(/^confirm_reorder_(.+)$/, async (ctx) => {
    try {
      await trackingHandlers.confirmReorder(ctx);
    } catch (error) {
      console.error('❌ confirm_reorder error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  // Manual address entry
  bot.action('enter_address_text', async (ctx) => {
    try {
      await ctx.editMessageText(
        '✍️ **Manzilni yozing**\n\nMisol: Toshkent, Chilonzor tumani, Bunyodkor 1-tor...',
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔙 Orqaga', callback_data: 'start_order' }]
            ]
          }
        }
      );
      
      ctx.session.waitingFor = 'delivery_address_text';
      ctx.session.step = 'awaiting_address_text';
    } catch (error) {
      console.error('❌ enter_address_text error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

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

  console.log('✅ User callbacks registered (optimized)');
}

module.exports = { registerUserCallbacks };
