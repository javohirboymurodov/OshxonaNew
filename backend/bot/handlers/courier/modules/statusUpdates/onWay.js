/**
 * Courier On Way Status Update
 */

const { User, Order, Branch } = require('../../../../../models');
const SocketManager = require('../../../../../config/socketConfig');
const { calculateDistance } = require('../../../../../api/controllers/orders/courier/locationController');

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
    
    if (order.status !== 'picked_up') {
      await ctx.answerCbQuery('❌ Buyurtma hali yetkazib berishga tayyor emas');
      return;
    }
    
    // Status yangilash
    order.status = 'on_way';
    order.statusHistory.push({
      status: 'on_way',
      timestamp: new Date(),
      updatedBy: user._id,
      note: 'Kuryer yo\'lda'
    });
    
    await order.save();
    
    // Socket orqali admin'larni xabardor qilish
    SocketManager.io.to(`branch:${order.branch}`).emit('orderStatusUpdate', {
      orderId: order._id,
      status: 'on_way',
      courier: {
        id: user._id,
        name: user.firstName + ' ' + user.lastName,
        phone: user.phone
      },
      timestamp: new Date()
    });
    
    await ctx.answerCbQuery('✅ Status yangilandi: Yo\'lda');
    
    // Kuryer uchun yangi keyboard
    const keyboard = {
      inline_keyboard: [
        [
          { text: '📍 Yetkazib berildi', callback_data: `courier_delivered_${orderId}` },
          { text: '❌ Bekor qilish', callback_data: `courier_cancel_${orderId}` }
        ],
        [
          { text: '🏠 Bosh menyuga qaytish', callback_data: 'back_to_main' }
        ]
      ]
    };
    
    await ctx.editMessageReplyMarkup(keyboard);
    
  } catch (error) {
    console.error('❌ On way error:', error);
    await ctx.answerCbQuery('❌ Xatolik yuz berdi');
  }
}

module.exports = { onWay };