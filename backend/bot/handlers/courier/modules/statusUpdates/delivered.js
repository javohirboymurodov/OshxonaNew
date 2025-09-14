/**
 * Courier Delivered Status Update
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
 * Kuryer yetkazib berdi
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
    const order = await Order.findById(orderId);
    
    if (!order) {
      await ctx.answerCbQuery('❌ Buyurtma topilmadi');
      return;
    }
    
    if (order.status !== 'on_way') {
      await ctx.answerCbQuery('❌ Buyurtma hali yo\'lda emas');
      return;
    }
    
    // Status yangilash
    order.status = 'delivered';
    order.deliveredAt = new Date();
    order.statusHistory.push({
      status: 'delivered',
      timestamp: new Date(),
      updatedBy: user._id,
      note: 'Kuryer tomonidan yetkazib berildi'
    });
    
    await order.save();
    
    // Socket orqali admin'larni xabardor qilish
    SocketManager.io.to(`branch:${order.branch}`).emit('orderStatusUpdate', {
      orderId: order._id,
      status: 'delivered',
      courier: {
        id: user._id,
        name: user.firstName + ' ' + user.lastName,
        phone: user.phone
      },
      deliveredAt: new Date(),
      timestamp: new Date()
    });
    
    await ctx.answerCbQuery('✅ Buyurtma yetkazib berildi!');
    
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
    console.error('❌ Delivered error:', error);
    await ctx.answerCbQuery('❌ Xatolik yuz berdi');
  }
}

module.exports = { delivered };