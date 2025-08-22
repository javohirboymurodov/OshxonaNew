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
      // Foydalanuvchi joylashuvi sessionga yozib qo'yiladi (aksiyalar va eng yaqin filial uchun)
      ctx.session = ctx.session || {};
      ctx.session.userLocation = { latitude, longitude };
      
      // Agar bu foydalanuvchi buyurtma (delivery) oqimida bo'lsa — lokatsiyani buyurtma uchun qabul qilamiz
      const wf = ctx.session?.waitingFor;
      if (user.role !== 'courier' && (wf === 'delivery_location' || wf === 'branch_location')) {
        // Avval foydalanuvchiga tasdiq xabari va keyboardni yopish
        try { await ctx.reply('✅ Joylashuv qabul qilindi.', { reply_markup: { remove_keyboard: true } }); } catch {}
        if (wf === 'delivery_location') {
          const Orders = require('./user/order/index');
          await Orders.processLocation(ctx, latitude, longitude);
          ctx.session.waitingFor = null;
          return;
        }
        // Eng yaqin filialni topish va ko'rsatish (branch_location)
        try {
          const DeliveryService = require('../../services/deliveryService');
          const result = await DeliveryService.resolveBranchForLocation({ latitude, longitude });
          if (result && result.branchId) {
            const { Branch } = require('../../models');
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
        // Kuryer oqimi uchun joylashuv qabul qilish
        const waitingFor = ctx.session?.waitingFor;
        if (waitingFor && waitingFor.startsWith('courier_')) {
          const orderId = ctx.session?.courierOrderId;
          if (!orderId) {
            await ctx.reply('❌ Buyurtma ma\'lumoti topilmadi. Qaytadan urinib ko\'ring.');
            ctx.session.waitingFor = null;
            return;
          }

          // Joylashuvni qabul qilish va API'ga yuborish
          try {
            const axios = require('axios');
            const baseUrl = process.env.SERVER_URL || 'http://localhost:5000';
            
            let endpoint = '';
            let action = '';
            
            if (waitingFor === 'courier_accept_location') {
              endpoint = `/api/admin/orders/${orderId}/courier/accept`;
              action = 'qabul qilish';
            } else if (waitingFor === 'courier_pickup_location') {
              endpoint = `/api/admin/orders/${orderId}/courier/pickup`;
              action = 'olib ketish';
            } else if (waitingFor === 'courier_delivered_location') {
              endpoint = `/api/admin/orders/${orderId}/courier/delivered`;
              action = 'yetkazish';
            }

            if (endpoint) {
              const response = await axios.post(`${baseUrl}${endpoint}`, {
                latitude,
                longitude
              }, {
                headers: {
                  'Authorization': `Bearer ${user.token || 'temp'}`,
                  'Content-Type': 'application/json'
                }
              });

              if (response.data.success) {
                await ctx.reply(`✅ Buyurtma ${action} muvaffaqiyatli bajarildi!`, {
                  reply_markup: { remove_keyboard: true }
                });
              } else if (response.data.warning) {
                // Masofa ogohlantirishi
                await ctx.reply(response.data.message, {
                  reply_markup: {
                    keyboard: [[{ text: '📍 Joylashuvni yuborish', request_location: true }]],
                    resize_keyboard: true,
                    one_time_keyboard: true
                  }
                });
                return; // Qayta joylashuv so'rash
              } else {
                await ctx.reply(`❌ ${action} da xatolik: ${response.data.message}`);
              }
            }

            // Session'ni tozalash
            ctx.session.waitingFor = null;
            ctx.session.courierOrderId = null;
            
          } catch (error) {
            console.error('Courier location API error:', error);
            if (error.response?.data?.warning) {
              // Masofa ogohlantirishi
              await ctx.reply(error.response.data.message, {
                reply_markup: {
                  keyboard: [[{ text: '📍 Joylashuvni yuborish', request_location: true }]],
                  resize_keyboard: true,
                  one_time_keyboard: true
                }
              });
              return;
            }
            await ctx.reply('❌ Xatolik yuz berdi. Qaytadan urinib ko\'ring.');
          }
          return;
        }

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
          
          // 🔧 YANGI: Console log qo'shamiz
          console.log('📍 Courier live location updated via Socket.IO:', {
            courierId: user._id,
            name: `${user.firstName} ${user.lastName}`,
            location: { lat: latitude, lng: longitude },
            branchId,
            timestamp: new Date().toISOString()
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

  // WebApp data handler (interactive catalog)
  bot.on('web_app_data', async (ctx) => {
    try {
      const webAppData = ctx.message.web_app_data;
      console.log('📱 WebApp data received:', webAppData);
      
      let cartData;
      try {
        cartData = JSON.parse(webAppData.data);
      } catch (e) {
        console.error('❌ Failed to parse WebApp data:', e);
        return ctx.reply('❌ WebApp ma\'lumotini o\'qishda xatolik!');
      }
      
      const { telegramId, branch, items } = cartData;
      
      if (!items || !Array.isArray(items) || items.length === 0) {
        return ctx.reply('🛒 Savat bo\'sh! Iltimos, mahsulot tanlang.');
      }
      
      if (!branch) {
        return ctx.reply('🏪 Filial tanlanmagan! Iltimos, filialni tanlang.');
      }
      
      // Branch ma'lumotini olish
      const Branch = require('../../models/Branch');
      const branchDoc = await Branch.findById(branch);
      if (!branchDoc) {
        return ctx.reply('❌ Filial topilmadi!');
      }
      
      // Mahsulotlarni olish va savatga qo'shish
      const Product = require('../../models/Product');
      const Cart = require('../../models/Cart');
      
      let totalAmount = 0;
      const cartItems = [];
      
      for (const item of items) {
        const product = await Product.findById(item.productId);
        if (!product) continue;
        
        // BranchProduct orqali narx va mavjudlikni tekshirish
        const BranchProduct = require('../../models/BranchProduct');
        const bp = await BranchProduct.findOne({ branch, product: product._id });
        
        if (!bp || !bp.isAvailable) {
          await ctx.reply(`⚠️ ${product.name} - ${branchDoc.name} filialida mavjud emas`);
          continue;
        }
        
        const price = bp.priceOverride !== null ? bp.priceOverride : product.price;
        const itemTotal = price * item.quantity;
        totalAmount += itemTotal;
        
        cartItems.push({
          product: product._id,
          quantity: item.quantity,
          price: price,
          total: itemTotal
        });
      }
      
      if (cartItems.length === 0) {
        return ctx.reply('❌ Hech qanday mavjud mahsulot topilmadi!');
      }
      
      // Savatni yaratish yoki yangilash
      let cart = await Cart.findOne({ user: ctx.from.id, branch });
      if (!cart) {
        cart = new Cart({
          user: ctx.from.id,
          branch,
          items: cartItems,
          totalAmount
        });
      } else {
        cart.items = cartItems;
        cart.totalAmount = totalAmount;
      }
      
      await cart.save();
      
      // Savat ma'lumotini ko'rsatish
      const cartMessage = `🛒 Savatga qo'shildi!\n\n` +
        `🏪 Filial: ${branchDoc.name}\n` +
        `📦 Mahsulotlar: ${cartItems.length} ta\n` +
        `💰 Jami: ${totalAmount.toLocaleString()} so'm\n\n` +
        `Buyurtma berish uchun "🍽️ Tezkor buyurtma" tugmasini bosing!`;
      
      await ctx.reply(cartMessage, {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🍽️ Tezkor buyurtma', callback_data: 'quick_order' }],
            [{ text: '🛒 Savatni ko\'rish', callback_data: 'show_cart' }],
            [{ text: '🏠 Asosiy sahifa', callback_data: 'main_menu' }]
          ]
        }
      });
      
    } catch (error) {
      console.error('❌ WebApp data handler error:', error);
      await ctx.reply('❌ Xatolik yuz berdi! Iltimos, qaytadan urinib ko\'ring.');
    }
  });
}

module.exports = { registerMessageHandlers };
