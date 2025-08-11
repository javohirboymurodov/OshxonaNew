require('dotenv').config();
const { Telegraf, session } = require('telegraf');

// Database va models
const Database = require('./config/database');
const { User, Product, Order, Category, Cart, PromoCode, Table, DeliveryZone, Review } = require('./models');

// API Server
const { startAPIServer, SocketManager } = require('./api/server');

// ========================================
// 💾 DATABASE CONNECTION
// ========================================

Database.connect();

// ========================================
// 🤖 BOT INITIALIZATION
// ========================================

const bot = new Telegraf(process.env.BOT_TOKEN);
global.botInstance = bot;

// Session middleware
bot.use(session({
  defaultSession: () => ({
    step: 'idle',
    cart: [],
    orderData: {},
    phone: null,
    address: null,
    waitingFor: null
  })
}));

// ========================================
// 📥 BOT HANDLERS IMPORT
// ========================================

// User handlers
const {
  showCategories,
  showCategoryProducts,
  showProductDetails
} = require('./handlers/user/catalog');

const {
  handleTextMessage,
  handlePhoneInput
} = require('./handlers/user/input');

const {
  startOrder,
  handleOrderType,
  handleDineInPreorder,
  handleArrivalTime,
  askForPaymentMethod,
  handlePaymentMethod,
  confirmOrder,
  finalizeOrder,
  handleDineInArrived,
  handleDineInTableInput
} = require('./handlers/user/order');

const {
  addToCart,
  updateQuantity,
  removeFromCart,
  showCart,
  clearCart
} = require('./handlers/user/cart');
const { changeProductQuantity } = require('./handlers/user/catalog');

// Keyboards
const {
  mainMenuKeyboard,
  backToMainKeyboard
} = require('./keyboards/userKeyboards');
const UXImprovements = require('./improvements/ux-improvements');
const { showMyOrders, myOrdersCallbackHandler } = require('./handlers/user/myOrders');

// Admin handlers
const AdminHandlers = require('./handlers/admin');
const DashboardHandlers = require('./handlers/admin/dashboardHandlers');
const OrderHandlers = require('./handlers/admin/orderHandlers');
const ProductHandlers = require('./handlers/admin/productHandlers');
const CategoryHandlers = require('./handlers/admin/categoryHandlers');
const UserAdminHandlers = require('./handlers/admin/userHandlers');
const StatisticsHandlers = require('./handlers/admin/statisticsHandlers');

// ========================================
// 🎯 BOT COMMANDS (delegated)
// ========================================
require('./bot/user')(bot);
require('./bot/profile')(bot);
require('./bot/courier')(bot);

// ========================================
// 🔘 BOT CALLBACKS
// ========================================

// Admin entry
bot.action('admin_panel', async (ctx) => {
  await DashboardHandlers.adminPanelHandler(ctx);
});

// Admin main sections
bot.action('admin_orders', async (ctx) => {
  await OrderHandlers.orderManagementHandler(ctx);
});
bot.action('admin_products', async (ctx) => {
  await ProductHandlers.productManagementHandler(ctx);
});
bot.action('admin_categories', async (ctx) => {
  await CategoryHandlers.showCategoryManagement(ctx);
});
bot.action('admin_users', async (ctx) => {
  await UserAdminHandlers.userManagementHandler(ctx);
});
bot.action('admin_stats', async (ctx) => {
  await StatisticsHandlers.showStatistics(ctx);
});

// Orders section actions
bot.action('orders_new', async (ctx) => { await OrderHandlers.showNewOrders(ctx); });
bot.action('orders_preparing', async (ctx) => { await OrderHandlers.showPreparingOrders(ctx); });
bot.action('orders_ready', async (ctx) => { await OrderHandlers.showReadyOrders(ctx); });
bot.action('orders_delivering', async (ctx) => { await OrderHandlers.showDeliveringOrders(ctx); });
bot.action('orders_all', async (ctx) => { await OrderHandlers.showAllOrders(ctx); });
bot.action('orders_stats', async (ctx) => { await OrderHandlers.showOrdersStats(ctx); });
bot.action(/^view_order_(.+)$/, async (ctx) => { await OrderHandlers.viewOrderDetails(ctx); });
bot.action(/^confirm_order_(.+)$/, async (ctx) => { await OrderHandlers.confirmOrder(ctx); });
bot.action(/^reject_order_(.+)$/, async (ctx) => { await OrderHandlers.rejectOrder(ctx); });
bot.action(/^prepare_order_(.+)$/, async (ctx) => { await OrderHandlers.prepareOrder(ctx); });
bot.action(/^ready_order_(.+)$/, async (ctx) => { await OrderHandlers.readyOrder(ctx); });
bot.action(/^deliver_order_(.+)$/, async (ctx) => { await OrderHandlers.deliverOrder(ctx); });
bot.action(/^complete_order_(.+)$/, async (ctx) => { await OrderHandlers.completeOrder(ctx); });

// Products section actions
bot.action('product_add', async (ctx) => { await ProductHandlers.createProduct(ctx); });
bot.action(/^product_category_(.+)$/, async (ctx) => { await ProductHandlers.selectProductCategory(ctx); });
bot.action('skip_product_image', async (ctx) => { await ProductHandlers.skipProductImage(ctx); });
bot.action('product_edit', async (ctx) => { await ProductHandlers.editProductSelection(ctx); });
bot.action(/^edit_product_(.+)$/, async (ctx) => { await ProductHandlers.editProduct(ctx); });
bot.action('product_by_category', async (ctx) => { await ProductHandlers.showProductsByCategory(ctx); });
bot.action(/^admin_category_products_(.+)$/, async (ctx) => { /* optional: show list */ await ProductHandlers.showProductsByCategory(ctx); });
bot.action('product_delete', async (ctx) => { await ProductHandlers.deleteProductSelection(ctx); });
bot.action(/^delete_product_(.+)$/, async (ctx) => { await ProductHandlers.deleteProduct(ctx); });
bot.action(/^confirm_delete_product_(.+)$/, async (ctx) => { await ProductHandlers.confirmDeleteProduct(ctx); });
bot.action('products_all', async (ctx) => { await ProductHandlers.showAllProducts(ctx); });
bot.action('product_toggle', async (ctx) => { await ProductHandlers.toggleProductStatus(ctx); });
bot.action(/^toggle_product_(.+)$/, async (ctx) => { await ProductHandlers.toggleProductStatus(ctx); });

// Categories section actions
bot.action('category_add', async (ctx) => { await CategoryHandlers.createCategory(ctx); });
bot.action('categories_all', async (ctx) => { await CategoryHandlers.showAllCategories(ctx); });
bot.action('category_edit', async (ctx) => { await CategoryHandlers.editCategorySelection(ctx); });
bot.action(/^edit_category_(.+)$/, async (ctx) => { await CategoryHandlers.editCategory(ctx); });
bot.action('category_toggle', async (ctx) => { await CategoryHandlers.toggleCategoryStatus(ctx); });
bot.action(/^toggle_status_(.+)$/, async (ctx) => { const id = ctx.callbackQuery.data.split('_').pop(); await CategoryHandlers.toggleCategoryStatusById(ctx, id); });
bot.action('category_delete', async (ctx) => { await CategoryHandlers.deleteCategorySelection(ctx); });
bot.action(/^delete_category_(.+)$/, async (ctx) => { await CategoryHandlers.deleteCategory(ctx); });
bot.action(/^confirm_delete_category_(.+)$/, async (ctx) => { await CategoryHandlers.confirmDeleteCategory(ctx); });
bot.action(/^use_suggested_order_(\d+)$/, async (ctx) => { await CategoryHandlers.useSuggestedOrder(ctx); });

// Users section actions
bot.action('users_search', async (ctx) => { await UserAdminHandlers.searchUsers(ctx); });
bot.action('users_active', async (ctx) => { await UserAdminHandlers.showActiveUsers(ctx); });
bot.action(/^user_details_(.+)$/, async (ctx) => { await UserAdminHandlers.viewUserDetails(ctx); });
bot.action(/^toggle_block_(.+)$/, async (ctx) => { await UserAdminHandlers.toggleUserBlock(ctx); });
bot.action('users_broadcast', async (ctx) => { await UserAdminHandlers.showBroadcast(ctx); });

// Statistics section actions
bot.action('stats_today', async (ctx) => { await StatisticsHandlers.showTodayStats(ctx); });
bot.action('stats_week', async (ctx) => { await StatisticsHandlers.showWeekStats(ctx); });
bot.action('stats_month', async (ctx) => { await StatisticsHandlers.showMonthStats(ctx); });
bot.action('stats_year', async (ctx) => { await StatisticsHandlers.showYearStats(ctx); });

// Admin quick actions from Telegram notification
bot.action(/^admin_quick_(confirmed|preparing|ready|delivered|cancelled)_(.+)$/, async (ctx) => {
  try {
    // Admin check
    const adminIds = process.env.ADMIN_ID ? process.env.ADMIN_ID.split(',').map((id) => parseInt(id.trim())) : [];
    if (!adminIds.includes(ctx.from.id)) {
      return await ctx.answerCbQuery('❌ Sizda admin huquqi yo\'q!');
    }

// Tezkor buyurtma
// Quick order must be registered early as a generic callback
bot.action(/^quick_order$/, async (ctx) => {
  try {
    console.log('⚡ quick_order clicked by', ctx.from?.id);
    const keyboard = await UXImprovements.quickOrderKeyboard(ctx.from.id);
    console.log('⚡ quick_order keyboard built');
    try {
      await ctx.editMessageText('⚡ Tezkor buyurtma:', {
        reply_markup: keyboard,
        parse_mode: 'Markdown'
      });
    } catch (e) {
      console.warn('editMessageText failed in quick_order, falling back to reply:', e?.message || e);
      await ctx.reply('⚡ Tezkor buyurtma:', { reply_markup: keyboard, parse_mode: 'Markdown' });
    }
    if (ctx.answerCbQuery) await ctx.answerCbQuery();
  } catch (error) {
    console.error('❌ quick_order error:', error);
    await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
  }
});

bot.action('quick_popular', async (ctx) => {
  try {
    console.log('🔥 quick_popular clicked by', ctx.from?.id);
    const keyboard = await UXImprovements.popularProductsKeyboard();
    console.log('🔥 quick_popular keyboard prepared');
    try {
      await ctx.editMessageText('🔥 Eng mashhur mahsulotlar:', { reply_markup: keyboard });
    } catch (e) {
      console.warn('editMessageText failed in quick_popular, falling back:', e?.message || e);
      await ctx.reply('🔥 Eng mashhur mahsulotlar:', { reply_markup: keyboard });
    }
    if (ctx.answerCbQuery) await ctx.answerCbQuery();
  } catch (e) {
    console.error('quick_popular error:', e);
    await ctx.answerCbQuery('❌ Xatolik!');
  }
});

bot.action('quick_fast', async (ctx) => {
  try {
    console.log('⚡ quick_fast clicked by', ctx.from?.id);
    const keyboard = await UXImprovements.fastProductsKeyboard();
    console.log('⚡ quick_fast keyboard prepared');
    try {
      await ctx.editMessageText('⚡ Tez tayyorlanadiganlar:', { reply_markup: keyboard });
    } catch (e) {
      console.warn('editMessageText failed in quick_fast, falling back:', e?.message || e);
      await ctx.reply('⚡ Tez tayyorlanadiganlar:', { reply_markup: keyboard });
    }
    if (ctx.answerCbQuery) await ctx.answerCbQuery();
  } catch (e) {
    console.error('quick_fast error:', e);
    await ctx.answerCbQuery('❌ Xatolik!');
  }
});

bot.action(/^reorder_[0-9a-fA-F]{24}$/, async (ctx) => {
  try {
    const orderId = ctx.callbackQuery.data.split('_')[1];
    console.log('🔄 reorder clicked by', ctx.from?.id, 'orderId:', orderId);
    await UXImprovements.reorderPrevious(ctx, orderId);
    if (ctx.answerCbQuery) await ctx.answerCbQuery();
  } catch (e) {
    console.error('reorder error:', e);
    await ctx.answerCbQuery('❌ Xatolik!');
  }
});

bot.action(/^quick_add_[0-9a-fA-F]{24}$/, async (ctx) => {
  try {
    const productId = ctx.callbackQuery.data.split('_')[2];
    console.log('➕ quick_add clicked by', ctx.from?.id, 'productId:', productId);
    // add to cart via existing addToCart pathway
    ctx.callbackQuery.data = `add_cart_${productId}_1`;
    await addToCart(ctx);
    if (ctx.answerCbQuery) await ctx.answerCbQuery('✅ Qo\'shildi');
  } catch (e) {
    console.error('quick_add error:', e);
    await ctx.answerCbQuery('❌ Xatolik!');
  }
});
  
    const status = ctx.match[1];
    const orderId = ctx.match[2];

    const { Order } = require('./models');
    const SocketManager = require('./config/socketConfig');

    const order = await Order.findById(orderId).populate('user', 'telegramId');
    if (!order) {
      return await ctx.answerCbQuery('❌ Buyurtma topilmadi!');
    }

    order.status = status === 'delivered' ? 'delivered' : status; // map directly
    order.updatedAt = new Date();
    order.statusHistory = order.statusHistory || [];
    order.statusHistory.push({
      status: order.status,
      timestamp: new Date(),
      note: 'Admin quick action (Telegram)',
      updatedBy: 'admin'
    });
    await order.save();

    // Real-time update to web clients
    try {
      SocketManager.emitStatusUpdate(order.user?._id, {
        orderId: order._id,
        orderNumber: order.orderId,
        status: order.status,
        message: `Status: ${order.status}`,
        updatedAt: new Date()
      });
    } catch {}

    // Notify user in Telegram
    try {
      if (order.user?.telegramId) {
        const statusText = {
          confirmed: 'Buyurtmangiz tasdiqlandi',
          preparing: 'Buyurtmangiz tayyorlanmoqda',
          ready: 'Buyurtmangiz tayyor',
          delivered: 'Buyurtma yetkazildi',
          cancelled: 'Buyurtma bekor qilindi'
        }[order.status] || 'Status yangilandi';
        await ctx.telegram.sendMessage(
          order.user.telegramId,
          `📦 Buyurtma №${order.orderId}\n${statusText}`,
          { parse_mode: 'Markdown' }
        );
      }
    } catch {}

    await ctx.answerCbQuery('✅ Yangilandi');
    // Optional: refresh admin message
    try {
      await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    } catch {}
  } catch (error) {
    console.error('Admin quick action error:', error);
    await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
  }
});

// Tezkor buyurtma (quick order) handlers
bot.action(/^quick_order$/, async (ctx) => {
  try {
    console.log('⚡ quick_order clicked by', ctx.from?.id);
    const keyboard = await UXImprovements.quickOrderKeyboard(ctx.from.id);
    console.log('⚡ quick_order keyboard built');
    try {
      await ctx.editMessageText('⚡ Tezkor buyurtma:', {
        reply_markup: keyboard,
        parse_mode: 'Markdown'
      });
    } catch (e) {
      console.warn('editMessageText failed in quick_order, falling back to reply:', e?.message || e);
      await ctx.reply('⚡ Tezkor buyurtma:', { reply_markup: keyboard, parse_mode: 'Markdown' });
    }
    if (ctx.answerCbQuery) await ctx.answerCbQuery();
  } catch (error) {
    console.error('❌ quick_order error:', error);
    await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
  }
});

bot.action('quick_popular', async (ctx) => {
  try {
    console.log('🔥 quick_popular clicked by', ctx.from?.id);
    const keyboard = await UXImprovements.popularProductsKeyboard();
    console.log('🔥 quick_popular keyboard prepared');
    try {
      await ctx.editMessageText('🔥 Eng mashhur mahsulotlar:', { reply_markup: keyboard });
    } catch (e) {
      console.warn('editMessageText failed in quick_popular, falling back:', e?.message || e);
      await ctx.reply('🔥 Eng mashhur mahsulotlar:', { reply_markup: keyboard });
    }
    if (ctx.answerCbQuery) await ctx.answerCbQuery();
  } catch (e) {
    console.error('quick_popular error:', e);
    await ctx.answerCbQuery('❌ Xatolik!');
  }
});

bot.action('quick_fast', async (ctx) => {
  try {
    console.log('⚡ quick_fast clicked by', ctx.from?.id);
    const keyboard = await UXImprovements.fastProductsKeyboard();
    console.log('⚡ quick_fast keyboard prepared');
    try {
      await ctx.editMessageText('⚡ Tez tayyorlanadiganlar:', { reply_markup: keyboard });
    } catch (e) {
      console.warn('editMessageText failed in quick_fast, falling back:', e?.message || e);
      await ctx.reply('⚡ Tez tayyorlanadiganlar:', { reply_markup: keyboard });
    }
    if (ctx.answerCbQuery) await ctx.answerCbQuery();
  } catch (e) {
    console.error('quick_fast error:', e);
    await ctx.answerCbQuery('❌ Xatolik!');
  }
});

bot.action(/^reorder_[0-9a-fA-F]{24}$/, async (ctx) => {
  try {
    const orderId = ctx.callbackQuery.data.split('_')[1];
    console.log('🔄 reorder clicked by', ctx.from?.id, 'orderId:', orderId);
    await UXImprovements.reorderPrevious(ctx, orderId);
    if (ctx.answerCbQuery) await ctx.answerCbQuery();
  } catch (e) {
    console.error('reorder error:', e);
    await ctx.answerCbQuery('❌ Xatolik!');
  }
});

bot.action(/^quick_add_[0-9a-fA-F]{24}$/, async (ctx) => {
  try {
    const productId = ctx.callbackQuery.data.split('_')[2];
    console.log('➕ quick_add clicked by', ctx.from?.id, 'productId:', productId);
    ctx.callbackQuery.data = `add_cart_${productId}_1`;
    await addToCart(ctx);
    if (ctx.answerCbQuery) await ctx.answerCbQuery('✅ Qo\'shildi');
  } catch (e) {
    console.error('quick_add error:', e);
    await ctx.answerCbQuery('❌ Xatolik!');
  }
});
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

// Common navigation shortcuts
bot.action('back_to_main', async (ctx) => {
  try {
    const { backToMain } = require('./handlers/user/backToMain');
    await backToMain(ctx);
  } catch (error) {
    console.error('❌ back_to_main error:', error);
    await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
  }
});

// my_profile handler is registered in bot/profile.js

// Buyurtmalarim: ro'yxat, pagination va tafsilotlar
bot.action(/^my_orders$|^orders_page_\d+$|^order_detail_[0-9a-fA-F]{24}$|^back_to_my_orders$/, async (ctx) => {
  try {
    const { showMyOrders, myOrdersCallbackHandler } = require('./handlers/user/myOrders');
    const data = ctx.callbackQuery.data;
    if (data === 'my_orders') {
      await showMyOrders(ctx);
    } else {
      await myOrdersCallbackHandler(ctx);
    }
  } catch (error) {
    console.error('❌ my_orders error:', error);
    await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
  }
});

// Categories
bot.action('show_categories', async (ctx) => {
  await showCategories(ctx);
});

bot.action(/^category_(.+)$/, async (ctx) => {
  await showCategoryProducts(ctx);
});

bot.action(/^product_(.+)$/, async (ctx) => {
  await showProductDetails(ctx);
});

// Navigation shortcuts on user panel
bot.action('back_to_main', async (ctx) => {
  try {
    const { backToMain } = require('./handlers/user/backToMain');
    await backToMain(ctx);
  } catch (error) {
    console.error('❌ back_to_main error:', error);
    if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
  }
});

bot.action('my_orders', async (ctx) => {
  try {
    await showMyOrders(ctx);
  } catch (error) {
    console.error('❌ my_orders error:', error);
    if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
  }
});

// Cart management
// Cart actions (support multiple patterns)
bot.action(/^(add_to_cart_[0-9a-fA-F]{24}|add_cart_[0-9a-fA-F]{24}_\d+)$/, async (ctx) => {
  await addToCart(ctx);
});

// Reply keyboard orqali kelgan kontaktni saqlash va keyboardni yopish
bot.on('contact', async (ctx) => {
  try {
    const contact = ctx.message && ctx.message.contact;
    const phone = contact && contact.phone_number ? contact.phone_number : '';
    if (!phone) return;
    await handlePhoneInput(ctx, phone);
  } catch (error) {
    console.error('❌ contact handler error:', error);
  }
});

// Mahsulot sahifasidagi miqdor tugmalari (manfiy qiymatga ham ruxsat beramiz)
bot.action(/^change_qty_[0-9a-fA-F]{24}_-?\d+$/, async (ctx) => {
  await changeProductQuantity(ctx);
});

// Savatdagi miqdor tugmalari
bot.action(/^cart_qty_[0-9a-fA-F]{24}_\d+$/, async (ctx) => {
  await updateQuantity(ctx);
});

bot.action(/^remove_from_cart_(.+)$/, async (ctx) => {
  await removeFromCart(ctx);
});

bot.action('show_cart', async (ctx) => {
  await showCart(ctx);
});

bot.action('clear_cart', async (ctx) => {
  await clearCart(ctx);
});

// Order processing
bot.action('start_order', async (ctx) => {
  await startOrder(ctx);
});

bot.action(/^order_type_(delivery|pickup|dine_in)$/, async (ctx) => {
  await handleOrderType(ctx);
});

bot.action('dine_in_preorder', async (ctx) => {
  await handleDineInPreorder(ctx);
});

// Vaqt tanlash: 15/30/45 va 1 soat, 1 soat 30 daqiqa, 2 soat
bot.action(/^arrival_time_(\d+|1_hour(?:_30)?|2_hours)$/, async (ctx) => {
  await handleArrivalTime(ctx);
});

bot.action(/^payment_(cash|card|click|payme)$/, async (ctx) => {
  const method = ctx.match[1];
  await handlePaymentMethod(ctx, method);
});

// "Tasdiqlash" tugmasi yakuniy buyurtmani yaratadi
bot.action('confirm_order', async (ctx) => {
  await finalizeOrder(ctx);
});

bot.action('finalize_order', async (ctx) => {
  await finalizeOrder(ctx);
});

bot.action(/^dinein_arrived_(.+)$/, async (ctx) => {
  try {
    const orderId = ctx.match[1];
    console.log('🔔 Keldim tugmasi bosildi, Order ID:', orderId);
    await handleDineInArrived(ctx);
  } catch (error) {
    console.error('❌ Dinein arrived callback error:', error);
    await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
  }
});

// user_profile handler moved to bot/profile.js

// Ma'lumot bo'limi
bot.action('about', async (ctx) => {
  try {
    const info = `
ℹ️ <b>Ma'lumot</b>

🏪 <b>Oshxona</b> — mazali taomlar va tez yetkazib berish xizmati.

🕒 Ish vaqti: 10:00 – 23:00
📞 Telefon: +998 90 123 45 67
📍 Manzil: Toshkent shahri
🌐 Sayt: https://example.uz

Har qanday taklif va mulohazalaringizni kutamiz!`;
    await ctx.editMessageText(info, { parse_mode: 'HTML', reply_markup: { inline_keyboard: [[{ text: '🔙 Asosiy menyu', callback_data: 'back_to_main' }]] } });
  } catch (e) {
    console.error('about error:', e);
    await ctx.answerCbQuery('❌ Xatolik!');
  }
});

// Bog'lanish bo'limi
bot.action('contact', async (ctx) => {
  try {
    const text = `
📞 <b>Bog'lanish</b>

Telefon: +998 90 123 45 67
Telegram: @oshxona_support
Email: support@oshxona.uz
Manzil: Toshkent shahri, Chilonzor
Ijtimoiy tarmoqlar: instagram.com/oshxona`; 
    await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: { inline_keyboard: [
      [{ text: '📞 Telefon', callback_data: 'contact_phone' }, { text: '📍 Manzil', callback_data: 'contact_address' }],
      [{ text: '📱 Telegram', callback_data: 'contact_telegram' }, { text: '🌐 Website', callback_data: 'contact_website' }],
      [{ text: '🔙 Asosiy menyu', callback_data: 'back_to_main' }]
    ] } });
  } catch (e) {
    console.error('contact error:', e);
    await ctx.answerCbQuery('❌ Xatolik!');
  }
});

bot.action('contact_phone', async (ctx) => {
  await ctx.answerCbQuery('📞 +998 90 123 45 67');
});
bot.action('contact_address', async (ctx) => {
  await ctx.answerCbQuery('📍 Toshkent shahri');
});
bot.action('contact_telegram', async (ctx) => {
  await ctx.answerCbQuery('📱 @oshxona_support');
});
bot.action('contact_website', async (ctx) => {
  await ctx.answerCbQuery('🌐 https://example.uz');
});

// Order history
bot.action('order_history', async (ctx) => {
  try {
    const orders = await Order.find({
      user: ctx.from.id
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('items.product', 'name price');

    if (orders.length === 0) {
      return await ctx.editMessageText(
        '📋 **Buyurtmalar tarixi**\n\nHozircha buyurtmalaringiz yo\'q.',
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🛍️ Buyurtma berish', callback_data: 'show_categories' }],
              [{ text: '🔙 Bosh sahifa', callback_data: 'main_menu' }]
            ]
          }
        }
      );
    }

    let historyText = '📋 **Buyurtmalar tarixi**\n\n';

    orders.forEach((order, index) => {
      const date = order.createdAt.toLocaleDateString('uz-UZ');
      const status = order.status === 'completed' ? '✅' :
        order.status === 'pending' ? '⏳' :
          order.status === 'preparing' ? '👨‍🍳' : '🚚';

      historyText += `${index + 1}. ${status} **#${order.orderId}**\n`;
      historyText += `📅 ${date} | 💰 ${order.totalPrice.toLocaleString()} so'm\n\n`;
    });

    await ctx.editMessageText(historyText, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔙 Bosh sahifa', callback_data: 'main_menu' }]
        ]
      }
    });

  } catch (error) {
    console.error('❌ Order history error:', error);
    await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
  }
});


// ========================================
// 📍 LOCATION HANDLING
// ========================================

bot.on('location', async (ctx) => {
  try {
    const user = await User.findOne({ telegramId: ctx.from.id });
    if (!user) return;

    const { latitude, longitude } = ctx.message.location || {};

    // 1) Courier location updates
    if (user.role === 'courier') {
      user.courierInfo.currentLocation = {
        latitude,
        longitude,
        updatedAt: new Date()
      };
      await user.save();
      await ctx.reply('📍 Joylashuv yangilandi!');
      return;
    }

    // 2) User delivery flow: waiting for address/location
    if (ctx.session?.waitingFor === 'address' && ctx.session.orderType === 'delivery') {
      ctx.session.orderData = ctx.session.orderData || {};
      ctx.session.orderData.location = { latitude, longitude };
      ctx.session.waitingFor = null;

      // If user has phone → ask payment; else ask phone
      if (user.phone) {
        await askForPaymentMethod(ctx);
      } else {
        const { askForPhone } = require('./handlers/user/order');
        await askForPhone(ctx);
      }
      return;
    }

    // Otherwise ignore silently
  } catch (error) {
    console.error('❌ Location update error:', error);
    await ctx.reply('❌ Joylashuvni qayta ishlashda xatolik!');
  }
});

// ========================================
// ✉️ TEXT PROCESSING
// ========================================

bot.on('text', async (ctx) => {
  try {
    if (ctx.message.text.startsWith('/')) return;

    if (ctx.session.waitingFor === 'phone') {
      const phone = ctx.message.text.trim();

      if (!/^\+998\d{9}$/.test(phone)) {
        return await ctx.reply('❌ Telefon raqamni to\'g\'ri formatda kiriting! (+998901234567)');
      }

      ctx.session.phone = phone;
      ctx.session.waitingFor = null;

      await User.findOneAndUpdate(
        { telegramId: ctx.from.id },
        { phone: phone }
      );

      await ctx.reply('✅ Telefon raqami saqlandi!');
      return;
    }

    if (ctx.session.waitingFor && ctx.session.waitingFor.startsWith('dinein_table_')) {
      const handled = await handleDineInTableInput(ctx);
      if (handled) return;
    }

    await handleTextMessage(ctx);

  } catch (error) {
    console.error('❌ Text message error:', error);
    await ctx.reply('❌ Xabarni qayta ishlashda xatolik!');
  }
});

// ========================================
// 🚨 ERROR HANDLING
// ========================================

bot.catch((err, ctx) => {
  console.error('❌ Bot error:', err);
  if (ctx.answerCbQuery) {
    ctx.answerCbQuery('❌ Xatolik yuz berdi!');
  } else {
    ctx.reply('❌ Xatolik yuz berdi!');
  }
});

// ========================================
// 🚀 UNIFIED SERVER LAUNCH
// ========================================

const startUnifiedServer = async () => {
  try {
    console.log('🚀 Oshxona Bot va API Server ishga tushirilmoqda...\n');

    // Step 1: API Server ishga tushirish
    console.log('📡 1. API Server ishga tushirilmoqda...');
    const server = await startAPIServer(process.env.API_PORT || 5000);
    
    // Step 2: Webhook tozalash (development rejimida)
    if (process.env.NODE_ENV !== 'production') {
      console.log('🧹 2. Development rejimi: webhook tozalanmoqda...');
      await bot.telegram.deleteWebhook({ drop_pending_updates: true });
      console.log('✅ Webhook tozalandi');
    }

    // Step 3: Bot ishga tushirish
    console.log('🤖 3. Telegram Bot ishga tushirilmoqda...');
    await bot.launch();
    console.log('✅ Telegram Bot muvaffaqiyatli ishga tushdi!');

    console.log('\n🎉 Barcha servislar muvaffaqiyatli ishga tushdi!\n');
    console.log('🔗 Mavjud endpointlar:');
    console.log(`   🌐 API: http://localhost:${process.env.API_PORT || 5000}/api`);
    console.log(`   🏥 Health: http://localhost:${process.env.API_PORT || 5000}/health`);
    console.log(`   🔌 Socket.IO: ws://localhost:${process.env.API_PORT || 5000}`);
    console.log(`   🤖 Bot: @${bot.botInfo?.username || 'oshxona_bot'}\n`);

    return { bot, server, SocketManager };

  } catch (error) {
    console.error('❌ Server ishga tushirishda xatolik:', error.message);

    if (error.response?.error_code === 409) {
      console.log('🔄 409 xatosi: webhook tozalab qayta urinish...');
      try {
        await bot.telegram.deleteWebhook({ drop_pending_updates: true });
        console.log('✅ Webhook tozalandi, 3 soniyadan keyin qayta urinish...');
        setTimeout(() => startUnifiedServer(), 3000);
        return;
      } catch (webhookError) {
        console.error('❌ Webhook tozalashda xatolik:', webhookError.message);
      }
    }

    process.exit(1);
  }
};

// ========================================
// 🛡️ GRACEFUL SHUTDOWN
// ========================================

const gracefulShutdown = (signal) => {
  console.log(`\n🛑 ${signal} signal qabul qilindi. Server to'xtatilmoqda...`);
  
  Promise.all([
    bot.stop(signal),
    // server.close() - server startUnifiedServer dan qaytariladi
  ]).then(() => {
    console.log('✅ Barcha servislar to\'xtatildi');
    process.exit(0);
  }).catch((error) => {
    console.error('❌ Shutdown error:', error);
    process.exit(1);
  });
};

process.once('SIGINT', () => gracefulShutdown('SIGINT'));
process.once('SIGTERM', () => gracefulShutdown('SIGTERM'));

process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled promise rejection:', error);
  gracefulShutdown('unhandledRejection');
});

// ========================================
// 🚀 START THE UNIFIED SERVER
// ========================================

startUnifiedServer();

// Disable deprecated warnings
process.env.NTBA_FIX_319 = 1;
process.env.NTBA_FIX_350 = 1;

// ========================================
// 📤 EXPORTS
// ========================================

module.exports = { bot, SocketManager };