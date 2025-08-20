// Message handlers (text, contact, location)
const { User } = require('../../models');
const { handleTextMessage, handlePhoneInput } = require('./user/input');
const UserOrderHandlers = require('./user/order/index');

/**
 * Message handlers ni bot instance ga ulash
 * @param {Telegraf} bot - Telegraf bot instance
 */
function registerMessageHandlers(bot) {
  // ========================================
  // 📞 CONTACT HANDLING
  // ========================================

  // Reply keyboard orqali kelgan kontaktni saqlash va keyboardni yopish (user va courier onboarding)
  bot.on('contact', async (ctx) => {
    try {
      const contact = ctx.message && ctx.message.contact;
      const phone = contact && contact.phone_number ? contact.phone_number : '';
      if (!phone) return;
      
      // If courier binding flow
      if (ctx.session?.courierBind) {
        const { bindByPhone } = require('./courier/handlers');
        const bound = await bindByPhone(ctx, phone);
        if (bound) return;
      }
      
      // First notify user, then proceed to save and show menu
      try { await ctx.reply('✅ Telefon raqamingiz qabul qilindi.', { reply_markup: { remove_keyboard: true } }); } catch {}
      await handlePhoneInput(ctx, phone);
    } catch (error) {
      console.error('❌ contact handler error:', error);
    }
  });

  // ========================================
  // 📍 LOCATION HANDLING
  // ========================================

  bot.on('location', async (ctx) => {
    try {
      const user = await User.findOne({ telegramId: ctx.from.id });
      if (!user) return;
      const { latitude, longitude, live_period } = ctx.message.location || {};
      
      // Agar bu foydalanuvchi buyurtma (delivery) oqimida bo'lsa — lokatsiyani buyurtma uchun qabul qilamiz
      if (user.role !== 'courier' && ctx.session?.waitingFor === 'delivery_location') {
        // Avval foydalanuvchiga tasdiq xabari va keyboardni yopish
        try { await ctx.reply('✅ Joylashuv qabul qilindi.', { reply_markup: { remove_keyboard: true } }); } catch {}
        const Orders = require('./user/order/index');
        await Orders.processLocation(ctx, latitude, longitude);
        ctx.session.waitingFor = null;
        return;
      }
      
      // Kuryerlar uchun: faqat live location qabul qilamiz
      if (user.role !== 'courier') return; // user delivery holati yuqorida qayta ishlangan
      
      // 🔧 FIX: Live location tekshirish - static location qabul qilinmasin
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

      // ✅ Live location qabul qilindi - saqlash
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
        const SocketManager = require('../config/socketConfig');
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
      
      // 🎉 Foydalanuvchiga muvaffaqiyat xabari
      try {
        const { replyKeyboardMain } = require('../courier/keyboards');
        await ctx.reply('🎉 **Jonli lokatsiya muvaffaqiyatli ulandi!**\n\n📍 Lokatsiyangiz adminlarga yuborilmoqda\n⏰ Translatsiya davom etmoqda', { 
          parse_mode: 'Markdown',
          reply_markup: replyKeyboardMain() 
        });
      } catch {
        await ctx.reply('🎉 Jonli lokatsiya muvaffaqiyatli ulandi!');
      }
    } catch (error) {
      console.error('❌ Location update error (courier):', error);
    }
  });

  // Live location yangilanishlari (edited_message)
  bot.on('edited_message', async (ctx) => {
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
        const SocketManager = require('../config/socketConfig');
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
  });

  // ========================================
  // 💬 TEXT MESSAGE HANDLING
  // ========================================

  bot.on('text', async (ctx) => {
    try {
      const text = ctx.message.text;
      const user = await User.findOne({ telegramId: ctx.from.id });
      
      if (!user) return;
      
      // Feedback yozish jarayoni
      if (ctx.session?.waitingFor === 'feedback' && ctx.session?.feedbackOrderId) {
        try {
          const { Order } = require('../../models');
          const orderId = ctx.session.feedbackOrderId;
          
          // Order ni topish va tekshirish
          const order = await Order.findById(orderId);
          if (!order || order.user?.toString() !== user._id.toString()) {
            await ctx.reply('❌ Buyurtma topilmadi yoki ruxsat yo\'q');
            return;
          }
          
          // Feedback ni saqlash
          order.feedback = text;
          order.updatedAt = new Date();
          await order.save();
          
          // Session ni tozalash
          ctx.session.waitingFor = null;
          ctx.session.feedbackOrderId = null;
          
          await ctx.reply('✅ Izohingiz saqlandi! Rahmat!', {
            reply_markup: {
              inline_keyboard: [
                [{ text: '🏠 Asosiy sahifa', callback_data: 'back_to_main' }]
              ]
            }
          });
          
        } catch (error) {
          console.error('Feedback save error:', error);
          await ctx.reply('❌ Izoh saqlashda xatolik yuz berdi');
        }
        return;
      }
      
      // Boshqa text message handlerlar
      await handleTextMessage(ctx, text);
    } catch (error) {
      console.error('❌ text handler error:', error);
    }
  });
}

module.exports = { registerMessageHandlers };
