// User callback handlers
const CatalogHandlers = require('../handlers/user/catalog/index');

const ProductHandlers = require('../handlers/user/catalog/productHandlers');

const {
  addToCart,
  updateQuantity,
  removeFromCart,
  showCart,
  clearCart
} = require('../handlers/user/cart');

const UserOrderHandlers = require('../handlers/user/order/index');

const { showMyOrders, myOrdersCallbackHandler } = require('../handlers/user/myOrders');
const { mainMenuKeyboard, askPhoneInlineKeyboard, requestPhoneReplyKeyboard } = require('./keyboards');
const { User } = require('../../models');
const UXImprovements = require('../../improvements/ux-improvements');

/**
 * User callback handlers ni bot instance ga ulash
 * @param {Telegraf} bot - Telegraf bot instance
 */
function registerUserCallbacks(bot) {
  // Guard: require phone for most actions
  bot.use(async (ctx, next) => {
    try {
      // Apply guard only for callback queries so /start and text entry are not blocked
      if (ctx.updateType !== 'callback_query') return next();
      const fromId = ctx.from?.id;
      if (!fromId) return next();
      const user = await User.findOne({ telegramId: fromId }).select('phone');
      const isPhoneProvided = Boolean(user && user.phone);
      const action = ctx.callbackQuery?.data || '';
      const allowedWithoutPhone = ['req_phone', 'noop'];
      if (!isPhoneProvided && !allowedWithoutPhone.some(a => action.startsWith(a))) {
        const msg = '📱 Iltimos, telefon raqamingizni ulashing. Buyurtma qilish va siz bilan bog\'lanish uchun kerak.';
        try { await ctx.answerCbQuery('📱 Telefon raqamingiz kerak', { show_alert: true }); } catch {}
        await ctx.reply(msg, askPhoneInlineKeyboard());
        try { await ctx.reply('👇 Pastdagi tugma orqali telefon raqamingizni ulashing:', requestPhoneReplyKeyboard()); } catch {}
        return;
      }
      return next();
    } catch (e) {
      return next();
    }
  });

  // Phone request inline handlers
  bot.action('req_phone', async (ctx) => {
    try {
      await ctx.reply('👇 Pastdagi tugma orqali telefon raqamingizni ulashing:', requestPhoneReplyKeyboard());
      if (ctx.answerCbQuery) await ctx.answerCbQuery('📞 Telefonni ulashing');
    } catch (e) {
      console.error('req_phone error', e);
    }
  });

  // Manual typing is disabled; only contact sharing allowed
  // ========================================
  // 🏠 MAIN NAVIGATION
  // ========================================

  bot.action('main_menu', async (ctx) => {
    try {
      await ctx.editMessageText(
        '🏠 **Bosh sahifa**\n\nKerakli bo\'limni tanlang:',
        {
          parse_mode: 'Markdown',
          reply_markup: mainMenuKeyboard.reply_markup
        }
      );
    } catch (error) {
      console.error('❌ Main menu callback error:', error);
      await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  bot.action('back_to_main', async (ctx) => {
    try {
      const { backToMain } = require('../handlers/user/backToMain');
      await backToMain(ctx);
    } catch (error) {
      console.error('❌ back_to_main error:', error);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
    }
  });

  // ========================================
  // 📂 CATALOG & CATEGORIES
  // ========================================

  bot.action('show_categories', async (ctx) => { await CatalogHandlers.showCategories(ctx); });

  // Katalog
  bot.action('show_catalog', async (ctx) => { await CatalogHandlers.showCategories(ctx); });

  // Savat va Aksiyalar
  bot.action('show_cart', async (ctx) => {
    try {
      const { showCart } = require('../handlers/user/cart');
      await showCart(ctx);
    } catch (e) {
      console.error('show_cart error', e);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Savatni ochib bo\'lmadi');
    }
  });

  bot.action('show_promotions', async (ctx) => {
    try {
      const { Product } = require('../../models');
      const { BranchProduct } = require('../../models');
      
      // Foydalanuvchining joylashuviga qarab eng yaqin filialni topish
      let targetBranch = null;
      if (ctx.session && ctx.session.userLocation) {
        const { Branch } = require('../../models');
        const branches = await Branch.find({ isActive: true });
        let nearestBranch = null;
        let minDistance = Infinity;
        
        for (const branch of branches) {
          if (branch.coordinates && branch.coordinates.lat && branch.coordinates.lng) {
            const distance = Math.sqrt(
              Math.pow(branch.coordinates.lat - ctx.session.userLocation.latitude, 2) +
              Math.pow(branch.coordinates.lng - ctx.session.userLocation.longitude, 2)
            );
            if (distance < minDistance) {
              minDistance = distance;
              nearestBranch = branch;
            }
          }
        }
        targetBranch = nearestBranch;
      }
      
      // Agar filial topilmagan bo'lsa, foydalanuvchidan so'rash
      if (!targetBranch) {
        await ctx.reply('📍 Aksiyalarni ko\'rish uchun avval filialni tanlang yoki joylashuvingizni ulashing:', {
          reply_markup: {
            inline_keyboard: [
              [{ text: '🏪 Filiallarni ko\'rish', callback_data: 'show_branches' }],
              [{ text: '📍 Joylashuvni ulashish', callback_data: 'request_location' }],
              [{ text: '🔙 Orqaga', callback_data: 'main_menu' }]
            ]
          }
        });
        return;
      }
      
      // Filialdagi aktiv promolar
      const now = new Date();
      const branchProducts = await BranchProduct.find({
        branch: targetBranch._id,
        isPromoActive: true,
        $or: [
          { promoStart: { $lte: now } },
          { promoStart: null }
        ],
        $or: [
          { promoEnd: { $gte: now } },
          { promoEnd: null }
        ]
      }).populate('product', 'name price image categoryId');
      
      if (!branchProducts.length) {
        await ctx.reply(`🎉 ${targetBranch.name} filialida hozircha faol aksiyalar mavjud emas.`, {
          reply_markup: {
            inline_keyboard: [
              [{ text: '🏪 Boshqa filiallarni ko\'rish', callback_data: 'show_branches' }],
              [{ text: '🔙 Orqaga', callback_data: 'main_menu' }]
            ]
          }
        });
        return;
      }
      
      // Promo mahsulotlarni ko'rsatish
      let message = `🎉 **${targetBranch.name} filialidagi aksiyalar:**\n\n`;
      
      for (const bp of branchProducts) {
        const product = bp.product;
        const originalPrice = product.price;
        let discountedPrice = originalPrice;
        
        if (bp.discountType === 'percent') {
          discountedPrice = Math.max(Math.round(originalPrice * (1 - bp.discountValue / 100)), 0);
        } else if (bp.discountType === 'amount') {
          discountedPrice = Math.max(originalPrice - bp.discountValue, 0);
        }
        
        message += `🍽️ **${product.name}**\n`;
        message += `💰 ~~${originalPrice.toLocaleString()} so'm~~ → **${discountedPrice.toLocaleString()} so'm**\n`;
        if (bp.discountType === 'percent') {
          message += `🎯 **-${bp.discountValue}%** chegirma\n`;
        } else {
          message += `🎯 **-${bp.discountValue.toLocaleString()} so'm** chegirma\n`;
        }
        message += `\n`;
      }
      
      message += `📍 Filial: ${targetBranch.name}\n`;
      if (targetBranch.address) message += `🏠 Manzil: ${targetBranch.address}\n`;
      
      await ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🛒 Katalogga o\'tish', callback_data: 'show_catalog' }],
            [{ text: '🏪 Boshqa filiallarni ko\'rish', callback_data: 'show_branches' }],
            [{ text: '🔙 Orqaga', callback_data: 'main_menu' }]
          ]
        }
      });
      
      if (ctx.answerCbQuery) await ctx.answerCbQuery('🎉 Aksiyalar ko\'rsatildi!');
      
    } catch (e) {
      console.error('show_promotions error', e);
      await ctx.reply('❌ Aksiyalarni yuklashda xatolik yuz berdi. Iltimos, qaytadan urinib ko\'ring.');
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik!');
    }
  });
  
  // Filiallar
  bot.action('show_branches', async (ctx) => { await CatalogHandlers.showBranches(ctx, 1); });
  // Branch tanlash va tafsilotlar (nearest/branch_<id>)
  bot.action(/^branch_.+$/, async (ctx) => { await CatalogHandlers.handleBranchSelection(ctx); });
  // Filial joylashuvini ulashish
  bot.action(/^share_branch_location_(.+)$/, async (ctx) => {
    try { await CatalogHandlers.shareBranchLocation(ctx, ctx.match[1]); } catch (e) { console.error('share_branch_location error', e); }
  });
  // Filial telefonini ko'rsatish
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
  // Eng yaqin filial uchun joylashuv so'rash
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

  // Tezkor buyurtma (mavjud oqimga yo'naltirish: kategoriyalarni ochish)
  bot.action('quick_order', async (ctx) => { await CatalogHandlers.showCategories(ctx); });

  // Profil
  bot.action('my_profile', async (ctx) => {
    try {
      const { showProfile } = require('../handlers/user/profile');
      await showProfile(ctx);
    } catch (e) {
      console.error('my_profile error:', e);
    }
  });

  // Bog'lanish
  bot.action('contact', async (ctx) => {
    try {
      const { contactKeyboard } = require('../user/keyboards');
      await ctx.reply('📞 Aloqa maʼlumotlari:', { reply_markup: contactKeyboard.reply_markup || contactKeyboard });
    } catch (e) {
      console.error('contact error:', e);
    }
  });

  // Maʼlumot
  bot.action('about', async (ctx) => {
    try {
      const text = 'ℹ️ Biz haqimizda: Ish vaqti 10:00-22:00. Qoʻllab-quvvatlash: +998 71 200 00 00';
      const keyboard = { inline_keyboard: [
        [{ text: '🔙 Orqaga', callback_data: 'back_to_main' }]
      ] };
      if (ctx.callbackQuery) {
        await ctx.editMessageText(text, { reply_markup: keyboard });
      } else {
        await ctx.reply(text, { reply_markup: keyboard });
      }
    } catch (e) { console.error('about error:', e); }
  });

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

  bot.action('show_cart', async (ctx) => {
    await showCart(ctx);
  });

  bot.action('clear_cart', async (ctx) => {
    await clearCart(ctx);
  });

  // ========================================
  // 📋 ORDER FLOW
  // ========================================

  bot.action('start_order', async (ctx) => {
    await UserOrderHandlers.startOrder(ctx);
  });

  bot.action(/^order_type_(.+)$/, async (ctx) => {
    await UserOrderHandlers.handleOrderType(ctx);
  });

  // Arrival time selection
  bot.action(/^arrival_time_.+$/, async (ctx) => {
    await UserOrderHandlers.handleArrivalTime(ctx);
  });

  // Dine-in arrived flow
  bot.action(/^dinein_arrived_(.+)|dinein_arrived_preview$/, async (ctx) => {
    const data = ctx.callbackQuery?.data || '';
    if (data === 'dinein_arrived_preview') {
      await ctx.reply('🪑 Stol raqamini kiriting (faqat raqam):');
      ctx.session.waitingFor = 'table_number';
      return;
    }
    await UserOrderHandlers.handleDineInArrived(ctx);
  });

  bot.action('confirm_order', async (ctx) => {
    await UserOrderHandlers.finalizeOrder(ctx);
  });

  bot.action('finalize_order', async (ctx) => { await UserOrderHandlers.finalizeOrder(ctx); });
  bot.action('confirm_order', async (ctx) => { await UserOrderHandlers.finalizeOrder(ctx); });

  // Payment method selection
  bot.action('payment_cash', async (ctx) => { await UserOrderHandlers.handlePaymentMethod(ctx, 'cash'); });
  bot.action('payment_card', async (ctx) => { await UserOrderHandlers.handlePaymentMethod(ctx, 'card'); });
  bot.action('payment_click', async (ctx) => { await UserOrderHandlers.handlePaymentMethod(ctx, 'click'); });
  bot.action('payment_payme', async (ctx) => { await UserOrderHandlers.handlePaymentMethod(ctx, 'payme'); });

  // Branch tanlash (pickup/dine_in)
  bot.action(/^choose_branch_.+$/, async (ctx) => {
    await UserOrderHandlers.handleChooseBranch(ctx);
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
  // ⭐ RATING & FEEDBACK
  // ========================================

  // Baholash handleri
  bot.action(/^rate_(.+)_(\d+)$/, async (ctx) => {
    try {
      const orderId = ctx.match[1];
      const rating = parseInt(ctx.match[2]);
      
      // Order ni topish va tekshirish
      const { Order } = require('../../models');
      const order = await Order.findById(orderId);
      
      if (!order) {
        await ctx.answerCbQuery('❌ Buyurtma topilmadi');
        return;
      }
      
      // Foydalanuvchi o'z buyurtmasini baholayotganini tekshirish
      const telegramId = ctx.from.id;
      if (order.user?.toString() !== telegramId.toString()) {
        await ctx.answerCbQuery('❌ Bu buyurtmani baholash huquqingiz yo\'q');
        return;
      }
      
      // Baholashni saqlash
      order.rating = rating;
      order.updatedAt = new Date();
      await order.save();
      
      await ctx.answerCbQuery(`✅ Baholash saqlandi: ${rating} yulduz`);
      
      // Izoh so'rash (ixtiyoriy)
      await ctx.reply('💬 Izoh qoldirmoqchimisiz? (ixtiyoriy)', {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '💬 Ha, izoh yozaman', callback_data: `feedback_${orderId}` },
              { text: '❌ Yo\'q, rahmat', callback_data: 'back_to_main' }
            ]
          ]
        }
      });
      
    } catch (error) {
      console.error('Rating error:', error);
      await ctx.answerCbQuery('❌ Baholashda xatolik yuz berdi');
    }
  });

  // Izoh handleri
  bot.action(/^feedback_(.+)$/, async (ctx) => {
    try {
      const orderId = ctx.match[1];
      ctx.session.waitingFor = 'feedback';
      ctx.session.feedbackOrderId = orderId;
      
      await ctx.reply('💬 Izohingizni yozing:', {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔙 Orqaga', callback_data: 'back_to_main' }]
          ]
        }
      });
      
    } catch (error) {
      console.error('Feedback error:', error);
      await ctx.answerCbQuery('❌ Xatolik yuz berdi');
    }
  });

  // ========================================
  // 🔙 NAVIGATION
  // ========================================

  console.log('✅ User callbacks registered');
}

module.exports = { registerUserCallbacks };
