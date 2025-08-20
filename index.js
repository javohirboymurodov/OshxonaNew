require('dotenv').config();
const { Telegraf, session } = require('telegraf');

// Database va models
const Database = require('./config/database');

// API Server
const { startAPIServer, SocketManager } = require('./api/server');

// Bot Manager
const { initializeBot } = require('./bot/botManager');

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

// Debug middleware - Bot javob bermaslik muammosini tracking qilish uchun
bot.use((ctx, next) => {
  console.log('📥 Bot update received:', {
    type: ctx.updateType,
    from: ctx.from?.first_name,
    userId: ctx.from?.id,
    text: ctx.message?.text || ctx.callbackQuery?.data,
    chatId: ctx.chat?.id
  });
  return next();
});

// ========================================
// 🔧 BOT SETUP
// ========================================

// Barcha bot handlerlarini ulash
initializeBot(bot);

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
// ⏱️ STALE COURIER CHECKER (5 minutes)
// ========================================

const COURIER_STALE_MS = Number(process.env.COURIER_STALE_MS || 5 * 60 * 1000);
// Har 5 daqiqada tekshirish
const COURIER_CHECK_INTERVAL_MS = Number(process.env.COURIER_CHECK_INTERVAL_MS || 5 * 60 * 1000);
const COURIER_CHECK_LOGS = String(process.env.COURIER_CHECK_LOGS || 'false').toLowerCase() === 'true';

function emitCourierStateToBranch(user, isStaleForced) {
  try {
    const branchId = user.branch || user.courierInfo?.branch;
    if (!branchId) return;
    const loc = user.courierInfo?.currentLocation;
    SocketManager.emitCourierLocationToBranch(branchId, {
      courierId: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      location: loc && loc.latitude && loc.longitude ? { latitude: loc.latitude, longitude: loc.longitude } : null,
      isOnline: Boolean(user.courierInfo?.isOnline),
      isAvailable: Boolean(user.courierInfo?.isAvailable),
      isStale: Boolean(isStaleForced),
      updatedAt: loc?.updatedAt || new Date()
    });
  } catch (e) {
    console.error('emitCourierStateToBranch error:', e?.message || e);
  }
}

setInterval(async () => {
  try {
    const { User } = require('./models');
    const now = Date.now();
    const couriers = await User.find({ role: 'courier', 'courierInfo.isOnline': true }).select('firstName lastName phone branch telegramId courierInfo');
    
    if (COURIER_CHECK_LOGS) {
      console.log('🔍 Checking courier locations...', { totalCouriers: couriers.length, currentTime: new Date().toISOString() });
    }
    
    for (const u of couriers) {
      const ts = u?.courierInfo?.currentLocation?.updatedAt ? new Date(u.courierInfo.currentLocation.updatedAt).getTime() : 0;
      const timeDiff = now - ts;
      const isStale = !ts || timeDiff > COURIER_STALE_MS;
      
      if (COURIER_CHECK_LOGS) {
        console.log('📍 Courier location check:', {
          courierId: u._id,
          name: `${u.firstName} ${u.lastName}`,
          lastUpdate: ts ? new Date(ts).toISOString() : 'never',
          timeDiffMinutes: Math.round(timeDiff / 60000),
          isStale,
          threshold: Math.round(COURIER_STALE_MS / 60000) + ' minutes'
        });
      }
      
      if (isStale) {
        emitCourierStateToBranch(u, true);
        // Eslatma yuborish (spamni cheklash uchun)
        const notifiedAt = u?.courierInfo?.staleNotifiedAt ? new Date(u.courierInfo.staleNotifiedAt).getTime() : 0;
        if (u.telegramId && (!notifiedAt || now - notifiedAt > COURIER_STALE_MS)) {
          try {
            console.log('⚠️ Sending stale location warning to courier:', u.firstName);
            await bot.telegram.sendMessage(u.telegramId, '⚠️ Joylashuvingiz 5 daqiqadan buyon yangilanmadi. Iltimos, live lokatsiyani qayta ulashing yoki "🛑 Ishni tugatish" tugmasini bosing.');
            u.courierInfo.staleNotifiedAt = new Date();
            await u.save();
          } catch (e) {
            console.error('Notify stale courier error:', e?.message || e);
          }
        }
      }
    }
  } catch (e) {
    console.error('Stale courier checker error:', e?.message || e);
  }
}, COURIER_CHECK_INTERVAL_MS);

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
