const { User, Order } = require('../../../../models');
const SocketManager = require('../../../../config/socketConfig');

/**
 * Courier Order Handlers
 * Kuryer buyurtma handlerlari
 */

/**
 * Telegram orqali kuryerni tekshirish (import qilinadi)
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
    const order = await Order.findById(orderId);
    if (!order) {
      await ctx.answerCbQuery('❌ Buyurtma topilmadi');
      return;
    }
    
    // Buyurtma statusini tekshirish - assigned bo'lishi kerak
    if (order.status !== 'assigned') {
      await ctx.answerCbQuery('❌ Buyurtma allaqachon boshqa holatda');
      return;
    }
    
    // Kuryer allaqachon tayinlanganmi tekshirish
    if (order.deliveryInfo?.courier?.toString() !== user._id.toString()) {
      await ctx.answerCbQuery('❌ Bu buyurtma sizga tayinlanmagan');
      return;
    }
    
    // Use centralized status service
    const OrderStatusService = require('../../../../services/orderStatusService');
    await OrderStatusService.updateStatus(orderId, 'on_delivery', {
      message: `Kuryer buyurtmani qabul qildi: ${user.firstName} ${user.lastName}`,
      updatedBy: user._id
    });
    
    // Kuryer statusini yangilash
    user.courierInfo.isAvailable = false;
    await user.save();
    
    // Javob berish
    await ctx.answerCbQuery('✅ Buyurtma qabul qilindi!');
    
    // Yangi keyboard ko'rsatish
    const keyboard = {
      inline_keyboard: [
        [
          { text: '🚗 Yo\'ldaman', callback_data: `courier_on_way_${orderId}` },
          { text: '✅ Yetkazdim', callback_data: `courier_delivered_${orderId}` }
        ],
        [
          { text: '❌ Bekor qilish', callback_data: `courier_cancel_${orderId}` }
        ],
        [
          { text: '🔙 Kuryer paneli', callback_data: 'courier_main_menu' }
        ]
      ]
    };
    
    // Xabarni yangilash
    try {
      await ctx.editMessageReplyMarkup(keyboard);
    } catch (error) {
      // Agar edit qilishda xatolik bo'lsa, yangi xabar yuborish
      await ctx.reply('✅ Buyurtma qabul qilindi! Endi yetkazib bering.', { reply_markup: keyboard });
    }
    
    // Adminlarga real-time xabar yuborish
    try {
      const branchId = order.branch;
      if (branchId) {
        SocketManager.emitOrderStatusUpdateToBranch(branchId, {
          orderId: order._id,
          status: 'on_delivery',
          courierId: user._id,
          courierName: `${user.firstName} ${user.lastName}`,
          updatedAt: new Date()
        });
      }
    } catch (error) {
      console.error('Socket error:', error);
    }
    
  } catch (error) {
    console.error('Accept order error:', error);
    await ctx.answerCbQuery('❌ Xatolik yuz berdi');
  }
}

/**
 * Yo'lda ekanligini belgilash
 * @param {Object} ctx - Telegraf context
 */
async function onWay(ctx) {
  const { user, allowed } = await ensureCourierByTelegram(ctx);
  if (!allowed) return ctx.answerCbQuery('❌ Ruxsat yo\'q');
  
  const callbackData = ctx.callbackQuery?.data;
  const orderId = callbackData?.replace('courier_on_way_', '');
  
  if (!orderId) {
    await ctx.answerCbQuery('❌ Buyurtma ID topilmadi');
    return;
  }
  
  try {
    const order = await Order.findById(orderId);
    if (!order || order.deliveryInfo?.courier?.toString() !== user._id.toString()) {
      await ctx.answerCbQuery('❌ Buyurtma topilmadi yoki ruxsat yo\'q');
      return;
    }
    
    // Status on_delivery bo'lishi kerak
    if (order.status !== 'on_delivery') {
      await ctx.answerCbQuery('❌ Buyurtma hali qabul qilinmagan');
      return;
    }
    
    await ctx.answerCbQuery('🚗 Yo\'lda ekanligingiz belgilandi');
    
    // Yangi keyboard - faqat "Yetkazdim" va "Bekor qilish" tugmalari
    const keyboard = {
      inline_keyboard: [
        [
          { text: '✅ Yetkazdim', callback_data: `courier_delivered_${orderId}` }
        ],
        [
          { text: '❌ Bekor qilish', callback_data: `courier_cancel_${orderId}` }
        ],
        [
          { text: '🔙 Kuryer paneli', callback_data: 'courier_main_menu' }
        ]
      ]
    };
    
    // Xabarni yangilash
    try {
      await ctx.editMessageReplyMarkup(keyboard);
    } catch (error) {
      // Agar edit qilishda xatolik bo'lsa, yangi xabar yuborish
      await ctx.reply('🚗 Yo\'lda ekansiz! Yetkazib bergandan keyin tugmani bosing.', { reply_markup: keyboard });
    }
    
    // Adminlarga real-time xabar
    try {
      const branchId = order.branch;
      if (branchId) {
        SocketManager.emitOrderStatusUpdateToBranch(branchId, {
          orderId: order._id,
          status: 'on_delivery',
          courierStatus: 'on_way',
          courierId: user._id,
          updatedAt: new Date()
        });
      }
    } catch (error) {
      console.error('Socket error:', error);
    }
    
  } catch (error) {
    console.error('On way error:', error);
    await ctx.answerCbQuery('❌ Xatolik yuz berdi');
  }
}

/**
 * Buyurtmani yetkazdi
 * @param {Object} ctx - Telegraf context
 */
async function delivered(ctx) {
  const { user, allowed } = await ensureCourierByTelegram(ctx);
  if (!allowed) return ctx.answerCbQuery('❌ Ruxsat yo\'q');
  
  const callbackData = ctx.callbackQuery?.data;
  const orderId = callbackData?.replace('courier_delivered_', '');
  
  if (!orderId) {
    await ctx.answerCbQuery('❌ Buyurtma ID topilmadi');
    return;
  }
  
  try {
    const order = await Order.findById(orderId);
    if (!order || order.deliveryInfo?.courier?.toString() !== user._id.toString()) {
      await ctx.answerCbQuery('❌ Buyurtma topilmadi yoki ruxsat yo\'q');
      return;
    }
    
    // Status on_delivery bo'lishi kerak
    if (order.status !== 'on_delivery') {
      await ctx.answerCbQuery('❌ Buyurtma hali qabul qilinmagan');
      return;
    }
    
    // Use centralized status service
    const OrderStatusService = require('../../../../services/orderStatusService');
    await OrderStatusService.updateStatus(orderId, 'delivered', {
      message: `Kuryer buyurtmani yetkazdi: ${user.firstName} ${user.lastName}`,
      updatedBy: user._id
    });
    
    // Kuryer statusini yangilash
    user.courierInfo.isAvailable = true;
    user.courierInfo.totalDeliveries = (user.courierInfo.totalDeliveries || 0) + 1;
    await user.save();
    
    await ctx.answerCbQuery('✅ Buyurtma yetkazildi!');
    
    // Kuryer paneliga qaytish
    await ctx.reply('✅ Buyurtma muvaffaqiyatli yetkazildi!', {
      reply_markup: { inline_keyboard: [[{ text: '🔙 Kuryer paneli', callback_data: 'courier_main_menu' }]] }
    });
    
    // Adminlarga real-time xabar
    try {
      const branchId = order.branch;
      if (branchId) {
        SocketManager.emitOrderStatusUpdateToBranch(branchId, {
          orderId: order._id,
          status: 'delivered',
          courierId: user._id,
          deliveredAt: new Date(),
          updatedAt: new Date()
        });
      }
    } catch (error) {
      console.error('Socket error:', error);
    }
    
  } catch (error) {
    console.error('Delivered error:', error);
    await ctx.answerCbQuery('❌ Xatolik yuz berdi');
  }
}

/**
 * Buyurtmani bekor qilish
 * @param {Object} ctx - Telegraf context
 */
async function cancelOrder(ctx) {
  const { user, allowed } = await ensureCourierByTelegram(ctx);
  if (!allowed) return ctx.answerCbQuery('❌ Ruxsat yo\'q');
  
  const callbackData = ctx.callbackQuery?.data;
  const orderId = callbackData?.replace('courier_cancel_', '');
  
  if (!orderId) {
    await ctx.answerCbQuery('❌ Buyurtma ID topilmadi');
    return;
  }
  
  try {
    const order = await Order.findById(orderId);
    if (!order || order.deliveryInfo?.courier?.toString() !== user._id.toString()) {
      await ctx.answerCbQuery('❌ Buyurtma topilmadi yoki ruxsat yo\'q');
      return;
    }
    
    // Status assigned yoki on_delivery bo'lishi kerak
    if (order.status !== 'assigned' && order.status !== 'on_delivery') {
      await ctx.answerCbQuery('❌ Buyurtma hali qabul qilinmagan');
      return;
    }
    
    // Buyurtma statusini qaytarish
    order.status = 'assigned';
    order.deliveryInfo.courier = null;
    
    // Status history ga qo'shish
    order.statusHistory = order.statusHistory || [];
    order.statusHistory.push({
      status: 'assigned',
      message: `Kuryer buyurtmani bekor qildi: ${user.firstName} ${user.lastName}`,
      timestamp: new Date(),
      updatedBy: user._id
    });
    
    await order.save();
    
    // Kuryer statusini yangilash
    user.courierInfo.isAvailable = true;
    await user.save();
    
    await ctx.answerCbQuery('❌ Buyurtma bekor qilindi');
    
    // Kuryer paneliga qaytish
    await ctx.reply('❌ Buyurtma bekor qilindi. Boshqa buyurtmalarni ko\'rishingiz mumkin.', {
      reply_markup: { inline_keyboard: [[{ text: '🔙 Kuryer paneli', callback_data: 'courier_main_menu' }]] }
    });
    
    // Adminlarga real-time xabar
    try {
      const branchId = order.branch;
      if (branchId) {
        SocketManager.emitOrderStatusUpdateToBranch(branchId, {
          orderId: order._id,
          status: 'assigned',
          courierId: null,
          updatedAt: new Date()
        });
      }
    } catch (error) {
      console.error('Socket error:', error);
    }
    
  } catch (error) {
    console.error('Cancel order error:', error);
    await ctx.answerCbQuery('❌ Xatolik yuz berdi');
  }
}

/**
 * Buyurtma tafsilotlarini ko'rsatish
 * @param {Object} ctx - Telegraf context
 */
async function orderDetails(ctx) {
  const { user, allowed } = await ensureCourierByTelegram(ctx);
  if (!allowed) return ctx.answerCbQuery('❌ Ruxsat yo\'q');
  
  const callbackData = ctx.callbackQuery?.data;
  const orderId = callbackData?.replace('courier_order_details_', '');
  
  if (!orderId) {
    await ctx.answerCbQuery('❌ Buyurtma ID topilmadi');
    return;
  }
  
  try {
    const order = await Order.findById(orderId)
      .populate('user', 'firstName lastName phone')
      .populate('items.product', 'name');
    
    if (!order || order.deliveryInfo?.courier?.toString() !== user._id.toString()) {
      await ctx.answerCbQuery('❌ Buyurtma topilmadi yoki ruxsat yo\'q');
      return;
    }
    
    const customerName = order.user ? `${order.user.firstName || ''} ${order.user.lastName || ''}`.trim() : 'Mijoz';
    const customerPhone = order.user?.phone || order.customerInfo?.phone || 'Noma\'lum';
    
    let text = `📋 Buyurtma tafsilotlari\n\n`;
    text += `🆔 Raqam: #${order.orderId}\n`;
    text += `👤 Mijoz: ${customerName}\n`;
    text += `📞 Telefon: ${customerPhone}\n`;
    text += `💰 Jami: ${Number(order.total || 0).toLocaleString()} so'm\n`;
    text += `📊 Holat: ${order.status === 'assigned' ? 'Tayinlangan' : 'Yetkazilmoqda'}\n`;
    
    if (order.deliveryInfo?.address) {
      text += `📍 Manzil: ${order.deliveryInfo.address}\n`;
    }
    
    if (order.deliveryInfo?.instructions) {
      text += `📝 Izoh: ${order.deliveryInfo.instructions}\n`;
    }
    
    text += `\n🛒 Buyurtma tarkibi:\n`;
    if (order.items && order.items.length > 0) {
      order.items.forEach((item, index) => {
        const productName = item.product?.name || item.productName || 'Mahsulot';
        text += `${index + 1}. ${productName} x ${item.quantity} = ${Number(item.totalPrice || 0).toLocaleString()} so'm\n`;
      });
    }
    
    const keyboard = [];
    
    // Status ga qarab tugmalar
    if (order.status === 'assigned') {
      keyboard.push([
        { text: '✅ Qabul qilish', callback_data: `courier_accept_${orderId}` }
      ]);
    } else if (order.status === 'on_delivery') {
      keyboard.push([
        { text: '🚗 Yo\'ldaman', callback_data: `courier_on_way_${orderId}` },
        { text: '✅ Yetkazdim', callback_data: `courier_delivered_${orderId}` }
      ]);
      keyboard.push([
        { text: '❌ Bekor qilish', callback_data: `courier_cancel_${orderId}` }
      ]);
    }
    
    keyboard.push([{ text: '🔙 Ortga', callback_data: 'courier_active_orders' }]);
    
    await ctx.reply(text, { reply_markup: { inline_keyboard: keyboard } });
    await ctx.answerCbQuery();
    
  } catch (error) {
    console.error('Order details error:', error);
    await ctx.answerCbQuery('❌ Xatolik yuz berdi');
  }
}

module.exports = {
  ensureCourierByTelegram, // Helper function
  acceptOrder,
  onWay,
  delivered,
  cancelOrder,
  orderDetails
};