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

// Global bot instance
let bot = null;

// Database connection ready bo'lguncha kutish
const initializeApp = async () => {
  try {
    console.log('🔌 Database connection o\'rnatilmoqda...');
    await Database.connect();
    const dbStatus = Database.getConnectionStatus();
    if (!dbStatus.isConnected || dbStatus.readyState !== 1) {
      console.error('❌ Database not connected. Status:', dbStatus);
      // Productionda fail-fast
      if (process.env.NODE_ENV === 'production') {
        process.exit(1);
      }
    }
    
    // Database ready bo'lgandan keyin botni ishga tushirish
    console.log('✅ Database ready, bot ishga tushirilmoqda...');
    
    // ========================================
    // 🤖 BOT INITIALIZATION
    // ========================================
    
    bot = new Telegraf(process.env.BOT_TOKEN);
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

    // Optimized user hydration with caching
    const userCache = new Map();
    const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache
    
    bot.use(async (ctx, next) => {
      try {
        if (!ctx.from) return next();
        
        ctx.session = ctx.session || {};
        const telegramId = ctx.from.id;
        const cacheKey = `user_${telegramId}`;
        const cached = userCache.get(cacheKey);
        
        // Check cache first
        if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
          ctx.session.user = cached.user;
          return next();
        }
        
        // Only query DB if not in session and not in cache
        if (!ctx.session.user) {
          const { User } = require('./models');
          const user = await User.findOne({ telegramId }).lean(); // Use lean() for better performance
          if (user) {
            ctx.session.user = user;
            // Cache the user
            userCache.set(cacheKey, {
              user,
              timestamp: Date.now()
            });
          }
        }
      } catch (e) {
        console.error('hydrateUser middleware error:', e.message);
      }
      return next();
    });
    
    // Optimized debug middleware - only in development or when needed
    if (process.env.NODE_ENV === 'development' || process.env.BOT_DEBUG === 'true') {
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
    }
    
    // ========================================
    // 🔧 BOT SETUP
    // ========================================
    
    // Barcha bot handlerlarini ulash
    initializeBot(bot);
    
    // Bot ready bo'lgandan keyin server ishga tushirish
    startUnifiedServer(bot);
    
  } catch (error) {
    console.error('❌ App initialization error:', error);
    process.exit(1);
  }
};

// ========================================
// 🚀 UNIFIED SERVER LAUNCH
// ========================================

const startUnifiedServer = async (bot) => {
  try {
    console.log('🚀 Oshxona Bot va API Server ishga tushirilmoqda...\n');

    // Step 1: API Server ishga tushirish
    console.log('📡 1. API Server ishga tushirilmoqda...');
    const apiPort = Number(process.env.PORT || process.env.API_PORT || 5000);
    const server = await startAPIServer(apiPort);
    
    // Step 2: Bot ishga tushirish (development yoki production)
    console.log('🤖 2. Telegram Bot ishga tushirilmoqda...');
    
    const isProd = process.env.NODE_ENV === 'production';
    if (isProd) {
      const baseUrl = (process.env.WEBHOOK_URL || process.env.RENDER_EXTERNAL_URL || '').replace(/\/+$/, '');
      if (!baseUrl || !/^https:\/\//i.test(baseUrl)) {
        console.warn(`⚠️  Webhook bazaviy URL topilmadi yoki noto'g'ri: "${baseUrl}". Polling rejimiga o'tiladi.`);
        await bot.telegram.deleteWebhook({ drop_pending_updates: true });
        await bot.launch();
        console.log('✅ Bot polling rejimida ishga tushdi (fallback)');
      } else {
        const webhookUrl = `${baseUrl}/webhook`;
        console.log(`🔗 Webhook URL: ${webhookUrl}`);
        await bot.telegram.setWebhook(webhookUrl, { drop_pending_updates: true });
        console.log('✅ Webhook o\'rnatildi');
      }
    } else {
      // Development: Polling mode
      console.log('🧹 Development rejimi: webhook tozalanmoqda...');
      await bot.telegram.deleteWebhook({ drop_pending_updates: true });
      console.log('✅ Webhook tozalandi');
      await bot.launch();
      console.log('✅ Bot polling rejimida ishga tushdi');
    }
    
    console.log('✅ Telegram Bot muvaffaqiyatli ishga tushdi!');

    console.log('\n🎉 Barcha servislar muvaffaqiyatli ishga tushdi!\n');
    console.log('🔗 Mavjud endpointlar:');
    console.log(`   🌐 API: http://localhost:${apiPort}/api`);
    console.log(`   🏥 Health: http://localhost:${apiPort}/health`);
    console.log(`   🔌 Socket.IO: ws://localhost:${apiPort}`);
    console.log(`   🤖 Bot: @${bot.botInfo?.username || 'oshxona_bot'}\n`);

    return { bot, server, SocketManager };

  } catch (error) {
    console.error('❌ Server ishga tushirishda xatolik:', error.message);

    if (error.response?.error_code === 409) {
      console.log('🔄 409 xatosi: webhook tozalab qayta urinish...');
      try {
        await bot.telegram.deleteWebhook({ drop_pending_updates: true });
        console.log('✅ Webhook tozalandi, 3 soniyadan keyin qayta urinish...');
        // ⚠️ Muhim: mavjud bot instansiyasini qayta ishlatamiz
        setTimeout(() => startUnifiedServer(bot), 3000);
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
  
  const shutdownPromises = [];
  
  if (bot) {
    shutdownPromises.push(bot.stop(signal));
  }
  
  Promise.all(shutdownPromises).then(() => {
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

// 🔧 OPTIMIZED: Kuryer lokatsiyasini 5 daqiqada yangilash (stale check bilan birga)
const COURIER_UPDATE_INTERVAL_MS = Number(process.env.COURIER_UPDATE_INTERVAL_MS || 5 * 60 * 1000);
const COURIER_UPDATE_LOGS = String(process.env.COURIER_UPDATE_LOGS || 'false').toLowerCase() === 'true';

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

// 🔧 OPTIMIZED: Birlashtirilgan kuryer lokatsiyasi va stale check (5 daqiqada)
setInterval(async () => {
  try {
    // Bot ready bo'lmaguncha kutish
    if (!bot) return;
    
    const { User } = require('./models');
    const now = Date.now();
    const onlineCouriers = await User.find({ 
      role: 'courier', 
      'courierInfo.isOnline': true 
    }).select('firstName lastName phone branch telegramId courierInfo');
    
    if (COURIER_UPDATE_LOGS) {
      console.log('📍 Courier location update & stale check:', { 
        totalOnlineCouriers: onlineCouriers.length, 
        currentTime: new Date().toISOString() 
      });
    }
    
    for (const courier of onlineCouriers) {
      const loc = courier.courierInfo?.currentLocation;
      const ts = loc?.updatedAt ? new Date(loc.updatedAt).getTime() : 0;
      const timeDiff = now - ts;
      const isStale = !ts || timeDiff > COURIER_STALE_MS;
      
      // Har doim lokatsiyani yangilash (real-time uchun)
      if (loc && loc.latitude && loc.longitude) {
        emitCourierStateToBranch(courier, isStale);
        
        if (COURIER_UPDATE_LOGS) {
          console.log('📍 Courier location updated:', {
            courierId: courier._id,
            name: `${courier.firstName} ${courier.lastName}`,
            location: { lat: loc.latitude, lng: loc.longitude },
            isStale,
            timeDiffMinutes: Math.round(timeDiff / 60000),
            lastUpdate: ts ? new Date(ts).toISOString() : 'never'
          });
        }
      }
      
      // Stale location uchun ogohlantirish - faqat online va available kuryerlar uchun
      // 🔧 FIX: Faqat lokatsiya yuborgan kuryerlarga xabar yuborish (yangilanmagan bo'lsa)
      if (isStale && courier.telegramId && courier.courierInfo?.isOnline && courier.courierInfo?.isAvailable) {
        // Agar kuryer hech qachon lokatsiya yuborgan bo'lmasa, xabar yubormaymiz (1-marta ishni boshlagan kuryer)
        if (!loc || (!loc.latitude && !loc.longitude) || ts === 0) {
          if (COURIER_CHECK_LOGS) {
            console.log('⚡ Skipping stale warning for courier without location:', courier.firstName);
          }
          continue;
        }
        
        const notifiedAt = courier?.courierInfo?.staleNotifiedAt ? new Date(courier.courierInfo.staleNotifiedAt).getTime() : 0;
        if (!notifiedAt || now - notifiedAt > COURIER_STALE_MS) {
          try {
            console.log('⚠️ Sending stale location warning to courier:', courier.firstName);
            await bot.telegram.sendMessage(courier.telegramId, '⚠️ Joylashuvingiz 5 daqiqadan buyon yangilanmadi. Iltimos, live lokatsiyani qayta ulashing yoki "🛑 Ishni tugatish" tugmasini bosing.');
            courier.courierInfo.staleNotifiedAt = new Date();
            await courier.save();
          } catch (e) {
            console.error('Notify stale courier error:', e?.message || e);
          }
        }
      }
    }
  } catch (e) {
    console.error('Courier location update & stale check error:', e?.message || e);
  }
}, COURIER_UPDATE_INTERVAL_MS);

// 🔧 Eski interval o'chirildi - birlashtirildi yuqorida

// ========================================
// 🚀 START THE UNIFIED SERVER
// ========================================

// Database connection ready bo'lgandan keyin appni ishga tushirish
initializeApp();

// Initialize Real-Time Tracking Manager
const RealTimeTrackingManager = require('./services/realTimeTrackingManager');
RealTimeTrackingManager.startPeriodicCleanup();
console.log('✅ Real-Time Tracking Manager initialized');

// Disable deprecated warnings
process.env.NTBA_FIX_319 = 1;
process.env.NTBA_FIX_350 = 1;

// ========================================
// 📤 EXPORTS
// ========================================

module.exports = { bot, SocketManager, startUnifiedServer };
