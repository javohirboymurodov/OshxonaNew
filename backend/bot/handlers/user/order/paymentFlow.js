// Payment Flow Module
const { User, Cart, Order } = require('../../../../models');
const { paymentMethodKeyboard, orderConfirmKeyboard } = require('../../../user/keyboards');
const BaseHandler = require('../../../../utils/BaseHandler');
const LoyaltyService = require('../../../../services/loyaltyService');
const orderTracker = require('../../../../services/orderTrackingService');

/**
 * Payment Flow Handler - to'lov jarayonini boshqarish
 */
class PaymentFlow extends BaseHandler {
  /**
   * To'lov usulini so'rash
   * @param {Object} ctx - Telegraf context
   */
  static async askForPaymentMethod(ctx) {
    return BaseHandler.safeExecute(async () => {
      console.log('=== askForPaymentMethod called ===');
      
      const user = await User.findOne({ telegramId: ctx.from.id });
      if (!user) {
        return await ctx.answerCbQuery('Foydalanuvchi topilmadi!');
      }

      // Check if phone is provided
      // 🔧 FIX: QR kod orqali kelganda telefon so'rash shart emas
      const isQROrder = ctx.session.orderType === 'table' && ctx.session.orderData?.tableQR;
      const skipPhoneCheck = ctx.session.orderType === 'dine_in_qr' || isQROrder;
      
      if (!user.phone && !skipPhoneCheck) {
        // Agar telefon raqam allaqachon so'ralgan bo'lsa, qayta so'ramaymiz
        if (ctx.session.phoneRequested) {
          console.log('Phone already requested, skipping...');
          return;
        }
        
        const UserOrderHandlers = require('./index');
        return await UserOrderHandlers.askForPhone(ctx);
      }

      const QueryOptimizer = require('../../../../utils/QueryOptimizer');
      const cart = await QueryOptimizer.findActiveCartByUser(user._id)
        .populate('items.product', 'name price');

      if (!cart || cart.items.length === 0) {
        return await ctx.answerCbQuery('❌ Savat bo\'sh!');
      }

      // Calculate total
      let total = 0;
      let cartSummary = '🛒 **Buyurtma tafsilotlari:**\n\n';

      cart.items.forEach((item, index) => {
        const itemTotal = item.product.price * item.quantity;
        total += itemTotal;
        cartSummary += `${index + 1}. ${item.product.name}\n`;
        cartSummary += `   ${item.quantity} x ${item.product.price.toLocaleString()} = ${itemTotal.toLocaleString()} so'm\n\n`;
      });

      // Add delivery fee if applicable
      let deliveryFee = 0;
      if (ctx.session.orderType === 'delivery') {
        deliveryFee = await this.calculateDeliveryFee(ctx);
        if (deliveryFee > 0) {
          cartSummary += `🚚 Yetkazib berish: ${deliveryFee.toLocaleString()} so'm\n\n`;
          total += deliveryFee;
        }
      }

      cartSummary += `💰 **Jami: ${total.toLocaleString()} so'm**\n\n`;
      cartSummary += `💳 To'lov usulini tanlang:`;

      ctx.session.orderData = ctx.session.orderData || {};
      ctx.session.orderData.total = total;
      ctx.session.orderData.deliveryFee = deliveryFee;

      // Agar hozirgi xabarni tahrirlab bo'lmasa (masalan, u rasm bo'lsa), yangi xabar yuboramiz
      const opts = { parse_mode: 'Markdown', reply_markup: paymentMethodKeyboard.reply_markup };
      try {
        if (ctx.callbackQuery && !ctx.callbackQuery.message.photo) {
          await ctx.editMessageText(cartSummary, opts);
        } else {
          await ctx.reply(cartSummary, opts);
        }
      } catch {
        await ctx.reply(cartSummary, opts);
      }
    }, ctx, '❌ To\'lov usulini so\'rashda xatolik!');
  }

  /**
   * To'lov usuli tanlanishi
   * @param {Object} ctx - Telegraf context
   * @param {string} method - to'lov usuli
   */
  static async handlePaymentMethod(ctx, method) {
    return BaseHandler.safeExecute(async () => {
      console.log('=== handlePaymentMethod ===');
      console.log('Payment method:', method);

      if (!['cash', 'card', 'click', 'payme'].includes(method)) {
        return await ctx.answerCbQuery('❌ Noto\'g\'ri to\'lov usuli!');
      }

      ctx.session.orderData = ctx.session.orderData || {};
      ctx.session.orderData.paymentMethod = method;

      const paymentNames = {
        cash: '💵 Naqd pul',
        card: '💳 Plastik karta',
        click: '📱 Click',
        payme: '🔵 Payme'
      };

      // Buyurtma xulosasi
      await this.showOrderSummary(ctx, paymentNames[method]);
    }, ctx, '❌ To\'lov usulini tanlashda xatolik!');
  }

  /**
   * Buyurtma xulosasini ko'rsatish
   * @param {Object} ctx - Telegraf context
   * @param {string} paymentMethodName - to'lov usuli nomi
   */
  static async showOrderSummary(ctx, paymentMethodName) {
    try {
      const user = await User.findOne({ telegramId: ctx.from.id });
      const QueryOptimizer = require('../../../../utils/QueryOptimizer');
      const cart = await QueryOptimizer.findActiveCartByUser(user._id)
        .populate('items.product', 'name price');

      const orderData = ctx.session.orderData;
      const orderType = ctx.session.orderType;

      let message = '📋 **Buyurtma tasdiqlanishi**\n\n';
      
      // Order type
      const orderTypeNames = {
        delivery: '🚚 Yetkazib berish',
        pickup: '🛍️ Olib ketish', 
        dine_in: '🍽️ Avvaldan buyurtma',
        dine_in_qr: '🪑 Stol buyurtmasi'
      };
      message += `📦 Tur: ${orderTypeNames[orderType] || orderType}\n`;

      // Customer info
      message += `👤 Mijoz: ${user.firstName} ${user.lastName || ''}\n`;
      if (user.phone) {
        message += `📱 Telefon: ${user.phone}\n`;
      }

      // Branch info (if applicable)
      if (orderData.branch && (orderType === 'pickup' || orderType === 'dine_in')) {
        try {
          const { Branch } = require('../../../../models');
          const branch = await Branch.findById(orderData.branch);
          if (branch) {
            message += `🏢 Filial: ${branch.name}\n`;
          }
        } catch (err) {
          console.warn('Branch fetch error:', err);
        }
      }

      // Delivery info
      if (orderType === 'delivery' && orderData.address) {
        message += `📍 Manzil: ${orderData.address}\n`;
      }

      // Arrival time
      if (orderData.arrivalTime && (orderType === 'pickup' || orderType === 'dine_in')) {
        message += `⏰ Kelish vaqti: ${orderData.arrivalTime}\n`;
      }

      // Table info
      if (orderType === 'dine_in_qr' && orderData.tableCode) {
        message += `🪑 Stol: ${orderData.tableCode}\n`;
      }

      message += `💳 To'lov: ${paymentMethodName}\n\n`;

      // Items
      message += '🛒 **Buyurtma:**\n';
      cart.items.forEach((item, index) => {
        const itemTotal = item.product.price * item.quantity;
        message += `${index + 1}. ${item.product.name}\n`;
        message += `   ${item.quantity} x ${item.product.price.toLocaleString()} = ${itemTotal.toLocaleString()} so'm\n`;
      });

      // Total calculation
      if (orderData.deliveryFee > 0) {
        message += `\n🚚 Yetkazib berish: ${orderData.deliveryFee.toLocaleString()} so'm`;
      }
      message += `\n\n💰 **Jami: ${orderData.total.toLocaleString()} so'm**`;

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: orderConfirmKeyboard.reply_markup
      });
    } catch (error) {
      console.error('Show order summary error:', error);
      await ctx.answerCbQuery('❌ Buyurtma xulosasini ko\'rsatishda xatolik!');
    }
  }

  /**
   * Yetkazib berish to'lovini hisoblash
   * @param {Object} ctx - Telegraf context
   * @returns {number} - delivery fee
   */
  static async calculateDeliveryFee(ctx) {
    try {
      const DeliveryService = require('../../../../services/deliveryService');
      
      // Get location from session
      const location = ctx.session.orderData?.location;
      if (!location) {
        return 0; // Default free delivery
      }

      // Calculate based on distance and branch
      const feeObj = await DeliveryService.calculateDeliveryFee(location);
      const fee = typeof feeObj === 'object' ? (feeObj.fee || 0) : (feeObj || 0);

      return fee || 0;
    } catch (error) {
      console.error('Calculate delivery fee error:', error);
      return 0; // Default to free delivery on error
    }
  }

  /**
   * Buyurtmani yakunlash
   * @param {Object} ctx - Telegraf context
   */
  static async finalizeOrder(ctx) {
    return BaseHandler.safeExecute(async () => {
      console.log('=== finalizeOrder called ===');

      const user = await User.findOne({ telegramId: ctx.from.id });
      if (!user) {
        return await ctx.answerCbQuery('Foydalanuvchi topilmadi!');
      }

      const QueryOptimizer = require('../../../../utils/QueryOptimizer');
      const cart = await QueryOptimizer.findActiveCartByUser(user._id)
        .populate('items.product', 'name price');

      if (!cart || cart.items.length === 0) {
        return await ctx.answerCbQuery('❌ Savat bo\'sh!');
      }

      const orderData = ctx.session.orderData;
      if (!orderData || !orderData.paymentMethod) {
        return await ctx.answerCbQuery('❌ To\'lov usuli tanlanmagan!');
      }

      // Create order (inline basic creation if helper missing)
      let order;
      try {
        const OrderCreation = require('./orderCreation');
        order = await OrderCreation.createOrder(user, cart, orderData, ctx.session.orderType);
      } catch (e) {
        // Fallback inline creation
        const items = cart.items.map(i => ({
          product: i.product._id || i.product,
          productName: i.product.name || i.productName,
          quantity: i.quantity,
          price: i.price,
          totalPrice: i.price * i.quantity
        }));
        const subtotal = items.reduce((s, it) => s + it.totalPrice, 0);
        order = new Order({
          user: user._id,
          items,
          subtotal,
          deliveryFee: orderData.deliveryFee || 0,
          total: orderData.total || (subtotal + (orderData.deliveryFee || 0)),
          orderType: ctx.session.orderType,
          paymentMethod: orderData.paymentMethod,
          status: 'pending',
          deliveryInfo: orderData.location ? { 
            address: orderData.address, 
            location: orderData.location,
            instructions: orderData.addressNotes 
          } : undefined,
          dineInInfo: (ctx.session.orderType === 'dine_in' || ctx.session.orderType === 'table') ? {
            arrivalTime: orderData.arrivalTime,
            tableNumber: orderData.tableNumber
          } : undefined,
          branch: orderData.branch || null,
          customerInfo: { name: [user.firstName, user.lastName].filter(Boolean).join(' '), phone: user.phone }
        });
        await order.save();
      }

      // Clear cart
      cart.isActive = false;
      await cart.save();

      // Notification will be sent via notifyAdmins() function below


      // Start order tracking
      orderTracker.trackOrder(order._id.toString(), user._id.toString());
      
      // Order tracking started - Admin will manually confirm the order
      // No automatic status updates - waiting for admin confirmation

      // Loyalty points will be awarded on payment confirmation webhook/endpoint
      let loyaltyUpdate = null;

      // Prepare flags before clearing session
      const isDineInOrder = String(order.orderType) === 'dine_in' || String(order.orderType) === 'table';
      const needsArrivalButton = String(order.orderType) === 'dine_in'; // Faqat avvaldan buyurtma uchun "Keldim" kerak

      // Clear session
      ctx.session.orderData = null;
      ctx.session.orderType = null;
      ctx.session.waitingFor = null;

      // Success message
      let message = `✅ **Buyurtma qabul qilindi!**\n\n📦 Buyurtma raqami: ${order.orderId}\n💰 Jami: ${order.total.toLocaleString()} so'm`;
      message += `\n\n💳 To'lov tasdiqlangach, ball va bonuslar avtomatik qo'llanadi.`;
      
      message += `\n\nTez orada sizga aloqaga chiqamiz!`;

      const extraButtons = needsArrivalButton
        ? [[{ text: '🏁 Keldim (stol raqami)', callback_data: 'dinein_arrived_preview' }]]
        : [];
      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            ...extraButtons,
            [{ text: '🏠 Bosh sahifa', callback_data: 'back_to_main' }],
            [{ text: '📋 Mening buyurtmalarim', callback_data: 'my_orders' }]
          ]
        }
      });

      // Notify admins (Socket + Telegram)
      try {

        const { notifyAdmins } = require('./notify');
        await notifyAdmins(order);

      } catch (notifyError) {
        console.error('Admin notification error:', notifyError);
      }

    }, ctx, '❌ Buyurtmani yakunlashda xatolik!');
  }
}

module.exports = PaymentFlow;
