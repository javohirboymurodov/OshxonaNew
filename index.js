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
  handleTextMessage
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

// Keyboards
const {
  mainMenuKeyboard,
  backToMainKeyboard
} = require('./keyboards/userKeyboards');

// ========================================
// 🎯 BOT COMMANDS
// ========================================

bot.start(async (ctx) => {
  try {
    const telegramId = ctx.from.id;
    const firstName = ctx.from.first_name;
    const lastName = ctx.from.last_name || '';
    const username = ctx.from.username || '';

    let user = await User.findOne({ telegramId });

    if (!user) {
      user = new User({
        telegramId,
        firstName,
        lastName,
        username,
        role: 'user'
      });
      await user.save();
      console.log('✅ Yangi foydalanuvchi yaratildi:', telegramId);
    } else {
      user.firstName = firstName;
      user.lastName = lastName;
      user.username = username;
      await user.save();
    }

    const welcomeMessage = `
🍽️ **${firstName}, Oshxona botiga xush kelibsiz!**

🥘 Eng mazali taomlarni buyurtma qiling
🚚 Tez va sifatli yetkazib berish
💳 Qulay to'lov usullari

Quyidagi tugmalardan birini tanlang:
    `;

    await ctx.replyWithHTML(welcomeMessage, {
      reply_markup: mainMenuKeyboard.reply_markup
    });

  } catch (error) {
    console.error('❌ Start command error:', error);
    await ctx.reply('❌ Botni ishga tushirishda xatolik yuz berdi!');
  }
});

bot.command('menu', async (ctx) => {
  try {
    await ctx.replyWithHTML(
      '🏠 **Bosh sahifa**\n\nKerakli bo\'limni tanlang:',
      { reply_markup: mainMenuKeyboard.reply_markup }
    );
  } catch (error) {
    console.error('❌ Menu command error:', error);
    await ctx.reply('❌ Xatolik yuz berdi!');
  }
});

// ========================================
// 🔘 BOT CALLBACKS
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

// Cart management
bot.action(/^add_to_cart_(.+)_(\d+)$/, async (ctx) => {
  await addToCart(ctx);
});

bot.action(/^quantity_(.+)_(\d+)$/, async (ctx) => {
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

bot.action(/^arrival_time_(\d+)$/, async (ctx) => {
  await handleArrivalTime(ctx);
});

bot.action(/^payment_(cash|card|click|payme)$/, async (ctx) => {
  await handlePaymentMethod(ctx);
});

bot.action('confirm_order', async (ctx) => {
  await confirmOrder(ctx);
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

// User profile
bot.action('user_profile', async (ctx) => {
  try {
    const user = await User.findOne({ telegramId: ctx.from.id });

    if (!user) {
      return await ctx.answerCbQuery('❌ Foydalanuvchi topilmadi!');
    }

    const profileText = `
👤 **Profil ma'lumotlari**

📝 **Ism:** ${user.firstName} ${user.lastName || ''}
📞 **Telefon:** ${user.phone || 'Kiritilmagan'}
🌐 **Til:** ${user.language}
📊 **Umumiy buyurtmalar:** ${user.stats.totalOrders}
💰 **Umumiy xarajat:** ${user.stats.totalSpent.toLocaleString()} so'm
    `;

    await ctx.editMessageText(profileText, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '📞 Telefon o\'zgartirish', callback_data: 'change_phone' }],
          [{ text: '🌐 Tilni o\'zgartirish', callback_data: 'change_language' }],
          [{ text: '🔙 Bosh sahifa', callback_data: 'main_menu' }]
        ]
      }
    });

  } catch (error) {
    console.error('❌ User profile error:', error);
    await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
  }
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
// 🚚 COURIER INTERFACE
// ========================================

bot.command('courier', async (ctx) => {
  try {
    const user = await User.findOne({ telegramId: ctx.from.id });

    if (!user || user.role !== 'courier') {
      return await ctx.reply('❌ Sizda courier huquqi yo\'q!');
    }

    const courierMenu = `
🚚 **Haydovchi paneli**

👋 Salom, ${user.firstName}!

Joriy holat: ${user.courierInfo.isOnline ? '🟢 Online' : '🔴 Offline'}
Mavjudlik: ${user.courierInfo.isAvailable ? '✅ Mavjud' : '❌ Band'}

📊 **Statistika:**
⭐ Reyting: ${user.courierInfo.rating}/5.0
🚚 Umumiy yetkazishlar: ${user.courierInfo.totalDeliveries}
    `;

    const keyboard = {
      inline_keyboard: [
        [
          {
            text: user.courierInfo.isOnline ? '🔴 Offline' : '🟢 Online',
            callback_data: 'courier_toggle_status'
          }
        ],
        [
          {
            text: user.courierInfo.isAvailable ? '❌ Band qilish' : '✅ Mavjud qilish',
            callback_data: 'courier_toggle_availability'
          }
        ],
        [
          { text: '📍 Joylashuvni yuborish', callback_data: 'courier_send_location' }
        ],
        [
          { text: '📋 Faol buyurtmalar', callback_data: 'courier_active_orders' }
        ]
      ]
    };

    await ctx.reply(courierMenu, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });

  } catch (error) {
    console.error('❌ Courier command error:', error);
    await ctx.reply('❌ Xatolik yuz berdi!');
  }
});

bot.action('courier_toggle_status', async (ctx) => {
  try {
    const user = await User.findOne({ telegramId: ctx.from.id });

    if (!user || user.role !== 'courier') {
      return await ctx.answerCbQuery('❌ Sizda courier huquqi yo\'q!');
    }

    user.courierInfo.isOnline = !user.courierInfo.isOnline;
    await user.save();

    await ctx.answerCbQuery(
      user.courierInfo.isOnline ?
        '✅ Online holatga o\'tkazildi!' :
        '❌ Offline holatga o\'tkazildi!'
    );

  } catch (error) {
    console.error('❌ Courier toggle status error:', error);
    await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
  }
});

// ========================================
// 📍 LOCATION HANDLING
// ========================================

bot.on('location', async (ctx) => {
  try {
    const user = await User.findOne({ telegramId: ctx.from.id });

    if (!user || user.role !== 'courier') {
      return;
    }

    user.courierInfo.currentLocation = {
      latitude: ctx.message.location.latitude,
      longitude: ctx.message.location.longitude,
      updatedAt: new Date()
    };

    await user.save();
    await ctx.reply('📍 Joylashuv yangilandi!');

  } catch (error) {
    console.error('❌ Location update error:', error);
    await ctx.reply('❌ Joylashuvni yangilashda xatolik!');
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