/**
 * Courier Status Updates
 * Kuryer buyurtma holatini yangilash
 */

const { User, Order, Branch } = require('../../../../models');
const SocketManager = require('../../../../config/socketConfig');
const { calculateDistance } = require('../../../../api/controllers/orders/courier/locationController');

/**
 * Kuryer yo'lda
 * @param {Object} ctx - Telegraf context
 */
async function onWay(ctx) {
  const { user, allowed } = await ensureCourierByTelegram(ctx);
  
  if (!allowed) {
    return ctx.answerCbQuery('❌ Ruxsat yo\'q');
  }
  
  const callbackData = ctx.callbackQuery?.data;
  const orderId = callbackData?.replace('courier_onway_', '');
  
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
    
    if (order.status !== 'ready') {
      await ctx.answerCbQuery('❌ Buyurtma hali tayyor emas');
      return;
    }
    
    // Restoranga yaqinlikni tekshirish
    const locationCheck = await checkLocationDistance(order, user);
    if (locationCheck.warning) {
      await ctx.answerCbQuery(locationCheck.message);
      return;
    }
    
    // Status yangilash
    order.status = 'on_delivery';
    order.courierFlow = order.courierFlow || {};
    order.courierFlow.pickedUpAt = new Date();
    
    await order.save();
    
    // Real-time yangilash
    SocketManager.emitOrderStatusUpdateToBranch(order.branch, {
      orderId: order._id,
      status: 'on_delivery',
      courierOnWay: true,
      courierName: `${user.firstName} ${user.lastName}`,
      updatedAt: new Date()
    });
    
    // Mijozga xabar
    await notifyCustomer(order, user, 'on_delivery');
    
    await ctx.answerCbQuery('🚗 Yo\'lda!');
    
    // Keyboard yangilash
    const keyboard = {
      inline_keyboard: [
        [{ text: '✅ Yetkazildi', callback_data: `courier_delivered_${orderId}` }],
        [{ text: '❌ Bekor qilish', callback_data: `courier_cancel_${orderId}` }],
        [{ text: '📍 Lokatsiya', callback_data: `courier_location_${orderId}` }]
      ]
    };
    
    await ctx.editMessageReplyMarkup(keyboard);
    
  } catch (error) {
    console.error('❌ On way error:', error);
    await ctx.answerCbQuery('❌ Xatolik yuz berdi');
  }
}

/**
 * Kuryer yetkazdi
 * @param {Object} ctx - Telegraf context
 */
async function delivered(ctx) {
  const { user, allowed } = await ensureCourierByTelegram(ctx);
  
  if (!allowed) {
    return ctx.answerCbQuery('❌ Ruxsat yo\'q');
  }
  
  const callbackData = ctx.callbackQuery?.data;
  const orderId = callbackData?.replace('courier_delivered_', '');
  
  if (!orderId) {
    await ctx.answerCbQuery('❌ Buyurtma ID topilmadi');
    return;
  }
  
  try {
    const order = await Order.findById(orderId)
      .populate('user', 'firstName lastName phone telegramId');
    
    if (!order) {
      await ctx.answerCbQuery('❌ Buyurtma topilmadi');
      return;
    }
    
    if (order.status !== 'on_delivery') {
      await ctx.answerCbQuery('❌ Buyurtma hali yo\'lda emas');
      return;
    }
    
    // Mijozga yaqinlikni tekshirish
    const locationCheck = await checkCustomerDistance(order, user);
    if (locationCheck.warning) {
      await ctx.answerCbQuery(locationCheck.message);
      return;
    }
    
    // Status yangilash
    order.status = 'delivered';
    order.deliveryInfo = order.deliveryInfo || {};
    order.deliveryInfo.deliveredAt = new Date();
    
    await order.save();
    
    // Real-time yangilash
    SocketManager.emitOrderStatusUpdateToBranch(order.branch, {
      orderId: order._id,
      status: 'delivered',
      deliveredAt: new Date(),
      courierName: `${user.firstName} ${user.lastName}`,
      updatedAt: new Date()
    });
    
    // Mijozga xabar
    await notifyCustomer(order, user, 'delivered');
    
    await ctx.answerCbQuery('✅ Yetkazildi!');
    
    // Final keyboard
    const keyboard = {
      inline_keyboard: [
        [{ text: '🏠 Bosh sahifa', callback_data: 'courier_main' }]
      ]
    };
    
    await ctx.editMessageReplyMarkup(keyboard);
    
  } catch (error) {
    console.error('❌ Delivered error:', error);
    await ctx.answerCbQuery('❌ Xatolik yuz berdi');
  }
}

/**
 * Buyurtmani bekor qilish
 * @param {Object} ctx - Telegraf context
 */
async function cancelOrder(ctx) {
  const { user, allowed } = await ensureCourierByTelegram(ctx);
  
  if (!allowed) {
    return ctx.answerCbQuery('❌ Ruxsat yo\'q');
  }
  
  const callbackData = ctx.callbackQuery?.data;
  const orderId = callbackData?.replace('courier_cancel_', '');
  
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
    
    if (['delivered', 'completed', 'cancelled'].includes(order.status)) {
      await ctx.answerCbQuery('❌ Buyurtma allaqachon yakunlangan');
      return;
    }
    
    // Status yangilash
    order.status = 'cancelled';
    order.courierFlow = order.courierFlow || {};
    order.courierFlow.cancelledAt = new Date();
    order.courierFlow.cancelledBy = 'courier';
    
    await order.save();
    
    // Real-time yangilash
    SocketManager.emitOrderStatusUpdateToBranch(order.branch, {
      orderId: order._id,
      status: 'cancelled',
      cancelledBy: 'courier',
      courierName: `${user.firstName} ${user.lastName}`,
      updatedAt: new Date()
    });
    
    await ctx.answerCbQuery('❌ Buyurtma bekor qilindi');
    
    // Keyboard yangilash
    const keyboard = {
      inline_keyboard: [
        [{ text: '🏠 Bosh sahifa', callback_data: 'courier_main' }]
      ]
    };
    
    await ctx.editMessageReplyMarkup(keyboard);
    
  } catch (error) {
    console.error('❌ Cancel order error:', error);
    await ctx.answerCbQuery('❌ Xatolik yuz berdi');
  }
}

/**
 * Telegram orqali kuryerni tekshirish (import)
 */
async function ensureCourierByTelegram(ctx) {
  const telegramId = ctx.from?.id;
  let user = await User.findOne({ telegramId });
  if (!user) return { user: null, allowed: false };
  return { user, allowed: user.role === 'courier' };
}

/**
 * Restoranga masofani tekshirish
 */
async function checkLocationDistance(order, user) {
  try {
    if (!user.courierInfo?.currentLocation) {
      return {
        warning: true,
        message: '❌ Sizning lokatsiyangiz topilmadi. Iltimos, lokatsiyani yuboring.'
      };
    }
    
    const branch = await Branch.findById(order.branch);
    if (branch?.address?.coordinates?.latitude && branch?.address?.coordinates?.longitude) {
      const distance = calculateDistance(
        user.courierInfo.currentLocation.latitude,
        user.courierInfo.currentLocation.longitude,
        branch.address.coordinates.latitude,
        branch.address.coordinates.longitude
      );
      
      if (distance > 0.2) { // 200 metr
        return {
          warning: true,
          message: `❌ Restoranga juda uzoqdasiz! ${(distance * 1000).toFixed(0)} metr uzoqda.`
        };
      }
    }
    
    return { warning: false };
  } catch (error) {
    console.error('❌ Check location distance error:', error);
    return { warning: false };
  }
}

/**
 * Mijozga masofani tekshirish
 */
async function checkCustomerDistance(order, user) {
  try {
    if (!user.courierInfo?.currentLocation) {
      return {
        warning: true,
        message: '❌ Sizning lokatsiyangiz topilmadi.'
      };
    }
    
    if (order.deliveryInfo?.location?.latitude && order.deliveryInfo?.location?.longitude) {
      const distance = calculateDistance(
        user.courierInfo.currentLocation.latitude,
        user.courierInfo.currentLocation.longitude,
        order.deliveryInfo.location.latitude,
        order.deliveryInfo.location.longitude
      );
      
      if (distance > 0.1) { // 100 metr
        return {
          warning: true,
          message: `❌ Mijozga juda uzoqdasiz! ${(distance * 1000).toFixed(0)} metr uzoqda.`
        };
      }
    }
    
    return { warning: false };
  } catch (error) {
    console.error('❌ Check customer distance error:', error);
    return { warning: false };
  }
}

/**
 * Mijozga xabar yuborish
 */
async function notifyCustomer(order, courier, status) {
  try {
    if (!order.user?.telegramId) return;
    
    let message = '';
    
    switch (status) {
      case 'on_delivery':
        message = `🚗 **Buyurtmangiz yo'lda!**\n\n`;
        message += `👨‍💼 Kuryer: ${courier.firstName} ${courier.lastName}\n`;
        message += `📱 Telefon: ${courier.phone || 'Noma\'lum'}\n\n`;
        message += `⏰ Tez orada yetkaziladi!`;
        break;
        
      case 'delivered':
        message = `✅ **Buyurtma yetkazildi!**\n\n`;
        message += `🙏 Xizmatimizdan foydalanganingiz uchun rahmat!\n`;
        message += `⭐ Agar mamnun bo'lsangiz, baho bering!`;
        break;
    }
    
    if (message) {
      const SingletonManager = require('../../../../utils/SingletonManager');
      const bot = SingletonManager.getBotInstance();
      if (bot) {
        await bot.telegram.sendMessage(order.user.telegramId, message, { parse_mode: 'Markdown' });
      }
    }
    
  } catch (error) {
    console.error('❌ Notify customer error:', error);
  }
}

module.exports = {
  onWay,
  delivered,
  cancelOrder
};