// User Order Handlers Main Export
const OrderFlow = require('./orderFlow');
const PaymentFlow = require('./paymentFlow');
const BaseHandler = require('../../../../utils/BaseHandler');
const { askPhoneInlineKeyboard, requestPhoneReplyKeyboard } = require('../../../user/keyboards');

/**
 * Unified User Order Handlers Export
 * Bu fayl eski order.js ni almashtiradi
 */
class UserOrderHandlers extends BaseHandler {
  // ===============================
  // ORDER FLOW METHODS
  // ===============================
  
  static async startOrder(ctx) {
    return OrderFlow.startOrder(ctx);
  }

  // ===============================
  // PHONE REQUEST (shared)
  // ===============================

  static async askForPhone(ctx) {
    return this.safeExecute(async () => {
      // Agar telefon raqam allaqachon so'ralgan bo'lsa va bu profil orqali emas, qayta so'ramaymiz
      if (ctx.session.phoneRequested && ctx.session.waitingFor !== 'phone') {
        console.log('Phone already requested, skipping...');
        return;
      }

      // Telefon raqam so'ralganini belgilaymiz
      ctx.session.phoneRequested = true;
      ctx.session.waitingFor = 'phone';

      const msg = "📱 Telefon raqamingiz kerak.\nSiz buyurtma qilishingiz va siz bilan bog'lanishimiz uchun telefon raqamingizni ulashing.";
      await ctx.reply(msg, askPhoneInlineKeyboard());
      try {
        await ctx.reply('👇 Pastdagi tugma orqali telefon raqamingizni ulashing:', requestPhoneReplyKeyboard());
      } catch {}
    }, ctx, "❌ Telefon raqamini so'rashda xatolik!");
  }

  static async handleOrderType(ctx) {
    return OrderFlow.handleOrderType(ctx);
  }

  static async handleDineInPreorder(ctx) {
    return OrderFlow.handleDineInPreorder(ctx);
  }

  static async askForBranchSelection(ctx, forType) {
    return OrderFlow.askForBranchSelection(ctx, forType);
  }

  static async handleChooseBranch(ctx) {
    return OrderFlow.handleChooseBranch(ctx);
  }

  // ===============================
  // PAYMENT FLOW METHODS
  // ===============================
  
  static async askForPaymentMethod(ctx) {
    return PaymentFlow.askForPaymentMethod(ctx);
  }

  static async handlePaymentMethod(ctx, method) {
    return PaymentFlow.handlePaymentMethod(ctx, method);
  }

  static async finalizeOrder(ctx) {
    return PaymentFlow.finalizeOrder(ctx);
  }

  static async confirmOrder(ctx) {
    return PaymentFlow.finalizeOrder(ctx);
  }

  // ===============================
  // TIME SELECTION METHODS
  // ===============================
  
  static async handleArrivalTime(ctx) {
    return this.safeExecute(async () => {
      const callbackData = ctx.callbackQuery.data;
      const timeMatch = callbackData.match(/^arrival_time_(.+)$/);
      
      if (!timeMatch) {
        return await ctx.answerCbQuery('❌ Vaqt ma\'lumoti noto\'g\'ri!');
      }

      const timeValue = timeMatch[1];
      let arrivalTime;

      // Parse time values
      if (timeValue === '1_hour') {
        arrivalTime = '1 soat';
      } else if (timeValue === '1_hour_30') {
        arrivalTime = '1 soat 30 daqiqa';
      } else if (timeValue === '2_hours') {
        arrivalTime = '2 soat';
      } else if (!isNaN(timeValue)) {
        arrivalTime = `${timeValue} daqiqa`;
      } else {
        return await ctx.answerCbQuery('❌ Noto\'g\'ri vaqt formati!');
      }

      ctx.session.orderData = ctx.session.orderData || {};
      ctx.session.orderData.arrivalTime = arrivalTime;

      console.log('=== Arrival time selected ===');
      console.log('Time:', arrivalTime);

      // Keyingi bosqich: mahsulot tanlash uchun menyu
      const nextMenuText = '✅ Vaqt tanlandi! Endi mahsulot tanlang:';
      if (ctx.updateType === 'callback_query') {
        await ctx.editMessageText(nextMenuText, {
          reply_markup: {
            inline_keyboard: [
              [{ text: '🍽️ Tezkor buyurtma', callback_data: 'quick_order' }],
              [
                { text: '🛒 Katalog', callback_data: 'show_catalog' },
                { text: '🎉 Aksiyalar', callback_data: 'show_promotions' }
              ],
              [ { text: '🛒 Savat', callback_data: 'show_cart' } ],
              [ { text: '🔙 Orqaga', callback_data: 'start_order' } ]
            ]
          }
        });
      } else {
        await ctx.reply(nextMenuText, {
          reply_markup: {
            inline_keyboard: [
              [{ text: '🍽️ Tezkor buyurtma', callback_data: 'quick_order' }],
              [
                { text: '🛒 Katalog', callback_data: 'show_catalog' },
                { text: '🎉 Aksiyalar', callback_data: 'show_promotions' }
              ],
              [ { text: '🛒 Savat', callback_data: 'show_cart' } ],
              [ { text: '🔙 Orqaga', callback_data: 'start_order' } ]
            ]
          }
        });
      }
      if (ctx.answerCbQuery) await ctx.answerCbQuery('✅ Vaqt tanlandi');
    }, ctx, '❌ Vaqt tanlashda xatolik!');
  }

  // ===============================
  // LEGACY COMPATIBILITY METHODS
  // ===============================
  
  // Dine-in: after order confirmation, user types table number → mark arrived and notify admins
  static async handleDineInTableInput(ctx) {
    return this.safeExecute(async () => {
      console.log('=== handleDineInTableInput started ===');
      console.log('User ID:', ctx.from.id);
      console.log('Text:', ctx.message.text);
      
      const tableNumber = String(ctx.message.text || '').trim();
      if (!tableNumber || !/^\d+$/.test(tableNumber)) {
        console.log('Invalid table number:', tableNumber);
        await ctx.reply('❌ Stol raqami noto\'g\'ri! Faqat raqam kiriting.');
        return true;
      }

      console.log('Table number validated:', tableNumber);

      const { User, Order } = require('../../../../models');
      const user = await User.findOne({ telegramId: ctx.from.id });
      if (!user) {
        console.log('User not found for telegramId:', ctx.from.id);
        await ctx.reply('❌ Foydalanuvchi topilmadi!');
        return true;
      }

      console.log('User found:', user._id);

      // Userning eng so'nggi dine_in/pending orderini yangilaymiz
      const order = await Order.findOne({ user: user._id }).sort({ createdAt: -1 });
      if (!order) {
        console.log('No order found for user:', user._id);
        await ctx.reply('❌ Buyurtma topilmadi!');
        return true;
      }

      console.log('Order found:', order._id, 'Status:', order.status, 'Type:', order.orderType);

      order.dineInInfo = order.dineInInfo || {};
      order.dineInInfo.tableNumber = tableNumber;
      // Status o'zgartirmaymiz, faqat table number qo'shamiz
      order.statusHistory = order.statusHistory || [];
      order.statusHistory.push({ status: 'customer_arrived', timestamp: new Date(), note: `Mijoz keldi, stol: ${tableNumber}` });
      
      console.log('Saving order with table number:', tableNumber);
      await order.save();
      console.log('Order saved successfully');

      // Session ni tozalaymiz va telefon raqam so'rash oqimini to'xtatamiz
      ctx.session.waitingFor = 'table_completed'; // Stol raqami kiritilganini belgilaymiz
      ctx.session.phoneRequested = false; // Telefon raqam so'rash oqimini to'xtatish

      // Admin panelga real-time xabar
      try {
        console.log('Attempting to notify admins via Socket.IO...');
        const SocketManager = require('../../../../config/socketConfig');
        const items = (order.items || []).map((it) => ({ name: it.productName || (it.product && it.product.name) || '', qty: it.quantity, price: it.price, total: it.totalPrice }));
        
        console.log('Items for notification:', items);
        
        SocketManager.emitOrderUpdate(String(order._id), {
          event: 'dine_in_arrived',
          branchId: String(order.branch || ''),
          tableNumber,
          items,
          total: order.total,
          status: 'customer_arrived'
        });
        
        console.log('Socket.IO notification sent successfully');
      } catch (e) {
        console.error('Socket.IO notification error:', e);
      }

      // Telegram admin notification
      try {
        console.log('Attempting to notify admins via Telegram...');
        const { notifyCustomerArrived } = require('./notify');
        await notifyCustomerArrived(order);
        console.log('Telegram notification sent successfully');
      } catch (e) {
        console.error('Telegram notification error:', e);
      }

      const replyMessage = `✅ Kelganingiz qayd qilindi!
🪑 Stol: ${tableNumber}
Buyurtma №: ${order.orderId}`;
      
      console.log('Sending reply to user:', replyMessage);
      await ctx.reply(replyMessage);
      
      // Foydalanuvchiga boshqa xabar yuborishni oldini olamiz
      await ctx.reply('🏠 Bosh sahifaga qaytish uchun tugmalardan foydalaning:', {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🏠 Bosh sahifa', callback_data: 'back_to_main' }],
            [{ text: '📋 Mening buyurtmalarim', callback_data: 'my_orders' }]
          ]
        }
      });
      
      console.log('=== handleDineInTableInput completed successfully ===');
      
      return true;
    }, ctx, '❌ Stol raqamini saqlashda xatolik!');
  }

  // Dine-in arrived notification  
  static async handleDineInArrived(ctx) {
    return this.safeExecute(async () => {
      const orderId = ctx.callbackQuery.data.replace('dinein_arrived_', '');
      
      if (!this.isValidObjectId(orderId)) {
        return await ctx.answerCbQuery('❌ Buyurtma ID noto\'g\'ri!');
      }

      const { Order } = require('../../../../models');
      const order = await Order.findById(orderId);
      
      if (!order) {
        return await ctx.answerCbQuery('❌ Buyurtma topilmadi!');
      }

      if (order.user.toString() !== ctx.from.id.toString()) {
        return await ctx.answerCbQuery('❌ Bu buyurtma sizga tegishli emas!');
      }

      // Update order status
      order.status = 'customer_arrived';
      order.statusHistory = order.statusHistory || [];
      order.statusHistory.push({
        status: 'customer_arrived',
        timestamp: new Date(),
        note: 'Mijoz keldi (Telegram orqali)'
      });
      await order.save();

      await ctx.answerCbQuery('✅ Kelganingiz qayd qilindi!');
      
      // Notify restaurant
      try {
        const AdminNotification = require('./adminNotification');
        await AdminNotification.notifyCustomerArrived(order);
      } catch (error) {
        console.error('Admin notification error:', error);
      }

      // Update the message
      await ctx.editMessageText(
        `✅ **Kelganingiz qayd qilindi!**\n\nBuyurtma raqami: ${order.orderId}\n\nRestoran xodimlari sizga tez orada kelishadi.`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🏠 Bosh sahifa', callback_data: 'back_to_main' }]
            ]
          }
        }
      );
    }, ctx, '❌ Kelganingizni qayd qilishda xatolik!');
  }

  // Location processing (for delivery)
  static async processLocation(ctx, latitude, longitude) {
    return this.safeExecute(async () => {
      console.log('=== processLocation ===');
      console.log('Lat:', latitude, 'Lon:', longitude);

      try {
        const DeliveryService = require('../../../../services/deliveryService');
        
        // Find nearest branch and check delivery zones
        const result = await DeliveryService.resolveBranchForLocation({ latitude, longitude });
        
        ctx.session.orderData = ctx.session.orderData || {};
        ctx.session.orderData.location = { latitude, longitude };
        
        if (result?.branchId) {
          ctx.session.orderData.branch = result.branchId;
          console.log('✅ Branch found:', result.branchId);
        } else {
          console.log('⚠️ No specific branch found, using default');
        }
        
        ctx.session.orderData.address = result?.address || 'GPS joylashuv';

        console.log('=== Location processed successfully ===');
        
        // Show product selection options with location confirmation
        await ctx.reply('🎯 **Joylashuv qabul qilindi!**\n\nEndi mahsulotlarni tanlang:', {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🛒 Tezkor buyurtma', callback_data: 'quick_order' }],
              [{ text: '📋 Katalog', callback_data: 'show_catalog' }],
              [{ text: '🎉 Aksiyalar', callback_data: 'show_promotions' }],
              [{ text: '🔙 Orqaga', callback_data: 'start_order' }]
            ]
          }
        });
        
      } catch (serviceError) {
        console.error('❌ DeliveryService error:', serviceError);
        
        // Fallback: Save location without service
        ctx.session.orderData = ctx.session.orderData || {};
        ctx.session.orderData.location = { latitude, longitude };
        ctx.session.orderData.address = 'GPS joylashuv';
        
        await ctx.reply('✅ **Joylashuv qabul qilindi!**\n\nEndi mahsulotlarni tanlang:', {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🛒 Tezkor buyurtma', callback_data: 'quick_order' }],
              [{ text: '📋 Katalog', callback_data: 'show_catalog' }],
              [{ text: '🎉 Aksiyalar', callback_data: 'show_promotions' }],
              [{ text: '🔙 Orqaga', callback_data: 'start_order' }]
            ]
          }
        });
      }
    }, ctx, '❌ Joylashuvni qayta ishlashda xatolik!');
  }

  // Find nearest branch utility
  static async findNearestBranch(lat, lon) {
    try {
      const { Branch } = require('../../../../models');
      const branches = await Branch.find({ isActive: true });
      
      let best = null;
      let bestDist = Infinity;
      
      for (const branch of branches) {
        const branchLat = branch.address?.coordinates?.latitude;
        const branchLon = branch.address?.coordinates?.longitude;
        
        if (branchLat && branchLon) {
          const dist = this.calculateDistance(lat, lon, branchLat, branchLon);
          if (dist < bestDist) {
            bestDist = dist;
            best = branch;
          }
        }
      }
      
      return { branch: best, distance: bestDist };
    } catch (error) {
      console.error('Find nearest branch error:', error);
      return null;
    }
  }

  // Calculate distance using Haversine formula
  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  static deg2rad(deg) {
    return deg * (Math.PI/180);
  }
}

module.exports = UserOrderHandlers;
