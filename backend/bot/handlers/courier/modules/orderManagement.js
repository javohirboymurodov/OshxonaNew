/**
 * Courier Order Management
 * Kuryer buyurtma boshqaruvi
 */

const { User, Order } = require('../../../../models');
const SocketManager = require('../../../../config/socketConfig');

/**
 * Telegram orqali kuryerni tekshirish
 */
async function ensureCourierByTelegram(ctx) {
  const telegramId = ctx.from?.id;
  let user = await User.findOne({ telegramId });
  if (!user) return { user: null, allowed: false };
  return { user, allowed: user.role === 'courier' };
}

/**
 * Buyurtmani qabul qilish
 * @param {Object} ctx - Telegraf context
 */
async function acceptOrder(ctx) {
  console.log(`🎯 COURIER ACCEPT CALLBACK TRIGGERED:`, {
    from: ctx.from?.id,
    callbackData: ctx.callbackQuery?.data,
    timestamp: new Date().toISOString()
  });
  
  const { user, allowed } = await ensureCourierByTelegram(ctx);
  console.log(`🔍 Courier auth check:`, { userId: user?._id, allowed });
  
  if (!allowed) {
    console.log(`❌ Courier not allowed:`, ctx.from?.id);
    return ctx.answerCbQuery('❌ Ruxsat yo\'q');
  }
  
  // Callback data dan order ID ni olish
  const callbackData = ctx.callbackQuery?.data;
  const orderId = callbackData?.replace('courier_accept_', '');
  console.log(`📦 Processing order:`, { callbackData, orderId });
  
  if (!orderId) {
    await ctx.answerCbQuery('❌ Buyurtma ID topilmadi');
    return;
  }
  
  try {
    // Buyurtmani topish
    const order = await Order.findById(orderId)
      .populate('user', 'firstName lastName phone telegramId')
      .populate('branch', 'name address phone');
    
    if (!order) {
      await ctx.answerCbQuery('❌ Buyurtma topilmadi');
      return;
    }
    
    // Buyurtma holatini tekshirish
    if (order.status !== 'assigned') {
      await ctx.answerCbQuery('❌ Buyurtma hali tayinlanmagan');
      return;
    }
    
    // Kuryer allaqachon tayinlanganligini tekshirish
    if (order.deliveryInfo?.courier && String(order.deliveryInfo.courier) !== String(user._id)) {
      await ctx.answerCbQuery('❌ Bu buyurtma boshqa kuryerga tayinlangan');
      return;
    }
    
    // Kuryer tayinlash
    order.deliveryInfo = order.deliveryInfo || {};
    order.deliveryInfo.courier = user._id;
    order.courierFlow = order.courierFlow || {};
    order.courierFlow.acceptedAt = new Date();
    
    await order.save();
    
    // Real-time yangilash
    SocketManager.emitOrderStatusUpdateToBranch(order.branch, {
      orderId: order._id,
      status: 'assigned',
      courierAccepted: true,
      courierName: `${user.firstName} ${user.lastName}`,
      updatedAt: new Date()
    });
    
    // Mijozga xabar
    if (order.user?.telegramId) {
      const message = `🚚 Kuryer tayinlandi!\n\n👨‍💼 ${user.firstName} ${user.lastName}\n📱 ${user.phone || 'Noma\'lum'}\n\n⏰ Buyurtma tez orada olib ketiladi.`;
      
      const SingletonManager = require('../../../../utils/SingletonManager');
      const bot = SingletonManager.getBotInstance();
      if (bot) {
        await bot.telegram.sendMessage(order.user.telegramId, message);
      }
    }
    
    await ctx.answerCbQuery('✅ Buyurtma qabul qilindi!');
    
    // Keyboard yangilash
    const keyboard = {
      inline_keyboard: [
        [{ text: '📦 Olib ketish', callback_data: `courier_pickup_${orderId}` }],
        [{ text: '❌ Rad etish', callback_data: `courier_reject_${orderId}` }],
        [{ text: '📋 Tafsilotlar', callback_data: `courier_details_${orderId}` }]
      ]
    };
    
    await ctx.editMessageReplyMarkup(keyboard);
    
  } catch (error) {
    console.error('❌ Accept order error:', error);
    await ctx.answerCbQuery('❌ Xatolik yuz berdi');
  }
}

/**
 * Buyurtmani rad etish
 * @param {Object} ctx - Telegraf context
 */
async function rejectOrder(ctx) {
  const { user, allowed } = await ensureCourierByTelegram(ctx);
  
  if (!allowed) {
    return ctx.answerCbQuery('❌ Ruxsat yo\'q');
  }
  
  const callbackData = ctx.callbackQuery?.data;
  const orderId = callbackData?.replace('courier_reject_', '');
  
  if (!orderId) {
    await ctx.answerCbQuery('❌ Buyurtma ID topilmadi');
    return;
  }
  
  try {
    const order = await Order.findById(orderId);
    
    if (!order) {
      await ctx.answerCbQuery('❌ Buyurtma topilmadi');
      return;
    }
    
    // Kuryer tayinlashni olib tashlash
    if (order.deliveryInfo?.courier && String(order.deliveryInfo.courier) === String(user._id)) {
      order.deliveryInfo.courier = null;
      order.status = 'ready'; // Tayyor holatga qaytarish
      await order.save();
      
      // Real-time yangilash
      SocketManager.emitOrderStatusUpdateToBranch(order.branch, {
        orderId: order._id,
        status: 'ready',
        courierRejected: true,
        updatedAt: new Date()
      });
    }
    
    await ctx.answerCbQuery('❌ Buyurtma rad etildi');
    
    // Keyboard yangilash
    const keyboard = {
      inline_keyboard: [
        [{ text: '✅ Qabul qilish', callback_data: `courier_accept_${orderId}` }],
        [{ text: '📋 Tafsilotlar', callback_data: `courier_details_${orderId}` }]
      ]
    };
    
    await ctx.editMessageReplyMarkup(keyboard);
    
  } catch (error) {
    console.error('❌ Reject order error:', error);
    await ctx.answerCbQuery('❌ Xatolik yuz berdi');
  }
}

/**
 * Buyurtma tafsilotlarini ko'rish
 * @param {Object} ctx - Telegraf context
 */
async function orderDetails(ctx) {
  const { user, allowed } = await ensureCourierByTelegram(ctx);
  
  if (!allowed) {
    return ctx.answerCbQuery('❌ Ruxsat yo\'q');
  }
  
  const callbackData = ctx.callbackQuery?.data;
  const orderId = callbackData?.replace('courier_details_', '');
  
  if (!orderId) {
    await ctx.answerCbQuery('❌ Buyurtma ID topilmadi');
    return;
  }
  
  try {
    const order = await Order.findById(orderId)
      .populate('user', 'firstName lastName phone')
      .populate('branch', 'name address phone')
      .populate('items.productId', 'name price');
    
    if (!order) {
      await ctx.answerCbQuery('❌ Buyurtma topilmadi');
      return;
    }
    
    // Buyurtma ma'lumotlarini tayyorlash
    let message = `📋 **Buyurtma Tafsilotlari**\n\n`;
    message += `🆔 ID: ${order.orderId}\n`;
    message += `👤 Mijoz: ${order.user.firstName} ${order.user.lastName}\n`;
    message += `📱 Telefon: ${order.user.phone}\n`;
    message += `🏪 Filial: ${order.branch.name}\n`;
    message += `📍 Manzil: ${order.deliveryInfo?.address || 'Noma\'lum'}\n`;
    message += `💰 Jami: ${order.total?.toLocaleString() || 0} so'm\n`;
    message += `📦 Holat: ${getStatusText(order.status)}\n\n`;
    
    if (order.items && order.items.length > 0) {
      message += `**Mahsulotlar:**\n`;
      order.items.forEach((item, index) => {
        message += `${index + 1}. ${item.productId?.name || 'Noma\'lum'} x${item.quantity}\n`;
      });
    }
    
    await ctx.answerCbQuery('📋 Tafsilotlar');
    await ctx.reply(message, { parse_mode: 'Markdown' });
    
  } catch (error) {
    console.error('❌ Order details error:', error);
    await ctx.answerCbQuery('❌ Xatolik yuz berdi');
  }
}

/**
 * Buyurtma holatini matn ko'rinishida olish
 */
function getStatusText(status) {
  const statusMap = {
    'pending': '⏳ Kutilmoqda',
    'confirmed': '✅ Tasdiqlandi',
    'assigned': '🚚 Kuryer tayinlandi',
    'preparing': '👨‍🍳 Tayyorlanmoqda',
    'ready': '🎯 Tayyor',
    'on_delivery': '🚗 Yetkazilmoqda',
    'delivered': '✅ Yetkazildi',
    'cancelled': '❌ Bekor qilindi'
  };
  
  return statusMap[status] || status;
}

module.exports = {
  ensureCourierByTelegram,
  acceptOrder,
  rejectOrder,
  orderDetails
};