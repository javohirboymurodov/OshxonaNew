/**
 * Courier Cancel Order
 */

const { User, Order, Branch } = require('../../../../../models');
const SocketManager = require('../../../../../config/socketConfig');

async function ensureCourierByTelegram(ctx) {
  const user = await User.findOne({ telegramId: ctx.from.id });
  
  if (!user) {
    await ctx.answerCbQuery('❌ Foydalanuvchi topilmadi');
    return { user: null, allowed: false };
  }
  
  if (!user.isCourier) {
    await ctx.answerCbQuery('❌ Siz kuryer emassiz');
    return { user, allowed: false };
  }
  
  return { user, allowed: true };
}

/**
 * Kuryer buyurtmani bekor qildi
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
    
    if (['delivered', 'cancelled'].includes(order.status)) {
      await ctx.answerCbQuery('❌ Buyurtma allaqachon yakunlangan!');
      return;
    }
    
    // Status yangilash
    order.status = 'cancelled';
    order.cancelledAt = new Date();
    order.statusHistory.push({
      status: 'cancelled',
      timestamp: new Date(),
      updatedBy: user._id,
      note: 'Kuryer bekor qildi',
      cancelledBy: 'courier'
    });
    
    await order.save();
    
    // Socket orqali admin'larni xabardor qilish
    SocketManager.io.to(`branch:${order.branch}`).emit('orderStatusUpdate', {
      orderId: order._id,
      status: 'cancelled',
      courier: {
        id: user._id,
        name: user.firstName + ' ' + user.lastName,
        phone: user.phone
      },
      cancelledAt: new Date(),
      cancelledBy: 'courier',
      timestamp: new Date()
    });
    
    await ctx.answerCbQuery('❌ Buyurtma bekor qilindi');
    
    // Kuryer uchun yangi keyboard
    const keyboard = {
      inline_keyboard: [
        [
          { text: '🏠 Bosh menyuga qaytish', callback_data: 'back_to_main' }
        ]
      ]
    };
    
    await ctx.editMessageReplyMarkup(keyboard);
    
  } catch (error) {
    console.error('❌ Cancel order error:', error);
    await ctx.answerCbQuery('❌ Xatolik yuz berdi');
  }
}

module.exports = { cancelOrder };