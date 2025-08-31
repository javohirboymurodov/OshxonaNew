const { User, Order } = require('../../../../../models');
const SocketManager = require('../../../../../config/socketConfig');
const BaseHandler = require('../../../../../utils/BaseHandler');

/**
 * Dine-In Handlers Module
 * Restoranda ovqatlanish operatsiyalari moduli
 */

class DineInHandlers extends BaseHandler {
  /**
   * Vaqt tanlashni qayta ishlash
   * @param {Object} ctx - Telegraf context
   */
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

      // Check if user has items in cart
      const { Cart } = require('../../../../../models');
      const telegramId = ctx.from.id;
      const user = await User.findOne({ telegramId });
      let cart = null;
      
      if (user) {
        cart = await Cart.findOne({ user: user._id, isActive: true });
      }

      // If cart has items, proceed to payment
      if (cart && cart.items && cart.items.length > 0) {
        console.log('✅ Cart has items, proceeding to payment flow');
        const PaymentFlow = require('../paymentFlow');
        await PaymentFlow.askForPaymentMethod(ctx);
        if (ctx.answerCbQuery) await ctx.answerCbQuery('✅ Vaqt tanlandi');
        return;
      }

      // If no items in cart, show product selection menu
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

  /**
   * Stol raqamini qayta ishlash (dine-in)
   * @param {Object} ctx - Telegraf context
   */
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
      order.statusHistory.push({ 
        status: 'customer_arrived', 
        timestamp: new Date(), 
        note: `Mijoz keldi, stol: ${tableNumber}` 
      });
      
      console.log('Saving order with table number:', tableNumber);
      await order.save();
      console.log('Order saved successfully');

      // Session ni tozalaymiz va telefon raqam so'rash oqimini to'xtatamiz
      ctx.session.waitingFor = 'table_completed'; // Stol raqami kiritilganini belgilaymiz
      ctx.session.phoneRequested = false; // Telefon raqam so'rash oqimini to'xtatish

      // Admin panelga real-time xabar
      try {
        console.log('Attempting to notify admins via Socket.IO...');
        const items = (order.items || []).map((it) => ({ 
          name: it.productName || (it.product && it.product.name) || '', 
          qty: it.quantity, 
          price: it.price, 
          total: it.totalPrice 
        }));
        
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
        const { notifyCustomerArrived } = require('../notify');
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

  /**
   * Dine-in kelganini qayta ishlash
   * @param {Object} ctx - Telegraf context
   */
  static async handleDineInArrived(ctx) {
    return this.safeExecute(async () => {
      const orderId = ctx.callbackQuery.data.replace('dinein_arrived_', '');
      
      if (!this.isValidObjectId(orderId)) {
        return await ctx.answerCbQuery('❌ Buyurtma ID noto\'g\'ri!');
      }

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
      
      // Notify restaurant via Socket.io
      try {
        SocketManager.emitOrderUpdate(order._id, {
          event: 'dine_in_arrived',
          orderId: order._id,
          orderNumber: order.orderId,
          customer: order.customerInfo,
          tableNumber: order.dineInInfo?.tableNumber,
          total: order.total,
          items: order.items,
          branchId: order.branch,
          timestamp: new Date()
        });
        console.log('✅ Customer arrival notification sent to admin panel');
      } catch (error) {
        console.error('❌ Socket notification error:', error);
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
}

module.exports = DineInHandlers;