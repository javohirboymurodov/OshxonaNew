const { User, Branch } = require('../../../models');
const DeliveryService = require('../../../services/deliveryService');
const SocketManager = require('../../../config/socketConfig');

/**
 * Location Message Handler
 * Joylashuv xabar handleri
 */

/**
 * Joylashuv xabarini qayta ishlash
 * @param {Object} ctx - Telegraf context
 */
async function handleLocation(ctx) {
  try {
    const user = await User.findOne({ telegramId: ctx.from.id });
    if (!user) return;
    
    const { latitude, longitude, live_period } = ctx.message.location || {};
    
    // Foydalanuvchi joylashuvi sessionga yozib qo'yiladi (aksiyalar va eng yaqin filial uchun)
    ctx.session = ctx.session || {};
    ctx.session.userLocation = { latitude, longitude };
    
    // Agar bu foydalanuvchi buyurtma (delivery) oqimida bo'lsa — lokatsiyani buyurtma uchun qabul qilamiz
    const wf = ctx.session?.waitingFor;
    if (user.role !== 'courier' && (wf === 'delivery_location' || wf === 'branch_location')) {
      // Remove keyboard first
      try { 
        await ctx.reply('✅ Joylashuv qabul qilindi.', { 
          reply_markup: { remove_keyboard: true } 
        }); 
      } catch {}
      
      if (wf === 'delivery_location') {
        try {
          const Orders = require('../user/order/index');
          await Orders.processLocation(ctx, latitude, longitude);
          // Don't reset waitingFor here - processLocation sets it to 'address_notes' if needed
          return;
        } catch (error) {
          console.error('❌ Location processing error:', error);
          await ctx.reply('❌ Joylashuvni qayta ishlashda xatolik!');
          ctx.session.waitingFor = null;
          return;
        }
      }
      
      // Eng yaqin filialni topish va ko'rsatish (branch_location)
      try {
        const result = await DeliveryService.resolveBranchForLocation({ latitude, longitude });
        if (result && result.branchId) {
          const b = await Branch.findById(result.branchId).select('name title address phone');
          const name = b?.name || b?.title || 'Filial';
          const address = b?.address?.text || result?.address || 'Manzil aniqlanmadi';
          await ctx.reply(`🏪 Eng yaqin filial: ${name}\n📍 ${address}`, {
            reply_markup: {
              inline_keyboard: [
                [{ text: 'Filial tafsiloti', callback_data: `branch_${result.branchId}` }],
                [{ text: '🔙 Orqaga', callback_data: 'show_branches' }]
              ]
            }
          });
        } else {
          await ctx.reply('❌ Eng yaqin filial aniqlanmadi.');
        }
      } catch (e) {
        console.error('nearest branch resolve error', e);
      } finally {
        ctx.session.waitingFor = null;
      }
      return;
    }
    
    // Kuryerlar uchun: joylashuv turini tekshirish
    if (user.role === 'courier') {
      await handleCourierLocation(ctx, user, latitude, longitude, live_period);
      return;
    }
    
  } catch (error) {
    console.error('❌ Location handler error:', error);
  }
}

/**
 * Kuryer joylashuvini qayta ishlash
 * @param {Object} ctx - Telegraf context
 * @param {Object} user - User object
 * @param {number} latitude - latitude
 * @param {number} longitude - longitude
 * @param {number} live_period - live location period
 */
async function handleCourierLocation(ctx, user, latitude, longitude, live_period) {
  try {
    // Kuryer oqimi uchun joylashuv qabul qilish
    const waitingFor = ctx.session?.waitingFor;
    if (waitingFor && waitingFor.startsWith('courier_')) {
      const orderId = ctx.session?.courierOrderId;
      if (!orderId) {
        await ctx.reply('❌ Buyurtma ma\'lumoti topilmadi. Qaytadan urinib ko\'ring.');
        ctx.session.waitingFor = null;
        return;
      }

      // NOTE: Old courier location system is disabled
      // Using new courier/handlers.js callback system instead
      
      // Session'ni tozalash
      ctx.session.waitingFor = null;
      ctx.session.courierOrderId = null;
      return;
    }

    // Live location tekshirish - static location qabul qilinmasin
    if (!live_period) {
      return ctx.reply('❌ Iltimos, **jonli lokatsiya** yuboring!\n\n📍 "Joylashuvni yuborish" tugmasini bosing va "Live Location" (jonli joylashuv) ni tanlang va "Poka ya ne otklyuchu" ni belgilang.', {
        parse_mode: 'Markdown',
        reply_markup: {
          keyboard: [
            [ { text: '📍 Joylashuvni yuborish', request_location: true } ],
            [ { text: '⬅️ Kuryer menyusi' } ],
          ],
          resize_keyboard: true,
        }
      });
    }

    // Live location qabul qilindi - saqlash
    console.log('✅ Live location qabul qilindi:', { latitude, longitude, live_period });
    console.log('📊 User before save:', { 
      userId: user._id, 
      name: user.firstName,
      role: user.role,
      currentLocation: user.courierInfo?.currentLocation 
    });
    
    user.courierInfo = user.courierInfo || {};
    user.courierInfo.currentLocation = { latitude, longitude, updatedAt: new Date() };
    
    console.log('💾 Saving location to database...');
    await user.save();
    console.log('✅ Location saved successfully:', {
      userId: user._id,
      newLocation: user.courierInfo.currentLocation
    });
    
    // Branch adminlariga broadkast
    try {
      const branchId = user.branch || user.courierInfo?.branch;
      if (branchId) {
        SocketManager.emitCourierLocationToBranch(branchId, {
          courierId: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          location: { latitude, longitude },
          isOnline: Boolean(user.courierInfo?.isOnline),
          isAvailable: Boolean(user.courierInfo?.isAvailable),
          updatedAt: new Date()
        });
        
        console.log('📍 Courier live location updated via Socket.IO:', {
          courierId: user._id,
          name: `${user.firstName} ${user.lastName}`,
          location: { lat: latitude, lng: longitude },
          branchId,
          timestamp: new Date().toISOString()
        });
      }
    } catch {}
    
    // Foydalanuvchiga muvaffaqiyat xabari
    try {
      const { replyKeyboardMain } = require('../../courier/keyboards');
      await ctx.reply('🎉 **Jonli lokatsiya muvaffaqiyatli ulandi!**\n\n📍 Lokatsiyangiz adminlarga yuborilmoqda\n⏰ Translatsiya davom etmoqda', { 
        parse_mode: 'Markdown',
        reply_markup: replyKeyboardMain() 
      });
    } catch (e) {
      await ctx.reply('🎉 Jonli lokatsiya muvaffaqiyatli ulandi!');
    }
  } catch (error) {
    console.error('❌ Location update error (courier):', error);
  }
}

/**
 * Live location yangilanishlarini qayta ishlash (edited_message)
 * @param {Object} ctx - Telegraf context
 */
async function handleEditedMessage(ctx) {
  try {
    const msg = ctx.update.edited_message;
    if (!msg || !msg.location) return;
    
    const user = await User.findOne({ telegramId: msg.from.id });
    if (!user || user.role !== 'courier') return;
    
    const { latitude, longitude } = msg.location || {};
    user.courierInfo = user.courierInfo || {};
    user.courierInfo.currentLocation = { latitude, longitude, updatedAt: new Date() };
    await user.save();
    
    // Branch adminlariga broadkast
    try {
      const branchId = user.branch || user.courierInfo?.branch;
      if (branchId) {
        SocketManager.emitCourierLocationToBranch(branchId, {
          courierId: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          location: { latitude, longitude },
          isOnline: Boolean(user.courierInfo?.isOnline),
          isAvailable: Boolean(user.courierInfo?.isAvailable),
          updatedAt: new Date()
        });
      }
    } catch {}
    
    // console.log('🔄 EDITED_MESSAGE: Live location updated:', { latitude, longitude, userId: user._id });
  } catch (error) {
    console.error('❌ Live location update error:', error);
  }
}

/**
 * Location handlerlarini bot ga ulash
 * @param {Object} bot - Telegraf bot instance
 */
function registerLocationHandlers(bot) {
  bot.on('location', handleLocation);
  bot.on('edited_message', handleEditedMessage);
}

module.exports = {
  handleLocation,
  handleCourierLocation,
  handleEditedMessage,
  registerLocationHandlers
};