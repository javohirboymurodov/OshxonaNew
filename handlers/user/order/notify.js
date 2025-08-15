const { User } = require('../../../models');
const Helpers = require('../../../utils/helpers');

async function notifyAdmins(order) {
  try {
    const branchId = order.branch ? String(order.branch) : null;
    const admins = await User.find(
      branchId ? { role: 'admin', branch: branchId } : { role: 'admin' }
    );

    const OrderModel = require('../../../models/Order');
    const populatedOrder = await OrderModel.findById(order._id).populate('user');

    // Emit to web admin panel (Socket.IO)
    try {
      const SocketManager = require('../../config/socketConfig');
      const bId = (order.branch && order.branch.toString) ? order.branch.toString() : 'default';
      SocketManager.emitNewOrder(bId, {
        id: order._id,
        orderId: order.orderId,
        status: order.status,
        total: order.total,
        customer: { name: (populatedOrder.user && populatedOrder.user.firstName) ? populatedOrder.user.firstName : 'Mijoz' },
        orderType: populatedOrder.orderType,
        tableNumber: populatedOrder?.dineInInfo?.tableNumber
      });
    } catch (emitErr) {
      console.error('Emit new order error:', emitErr?.message || emitErr);
    }

    for (const admin of admins) {
      try {
        const bot = global.botInstance;
        if (!bot) {
          console.error('Bot instance topilmadi!');
          return;
        }
        if (!admin.telegramId || isNaN(Number(admin.telegramId))) {
          console.error(`Admin telegramId noto'g'ri yoki yo'q:`, admin.telegramId);
          continue;
        }
        let message = `\n🆕 **Yangi buyurtma!**\n\n`;
        message += `📋 **Buyurtma №:** ${populatedOrder.orderId}\n`;
        message += `👤 **Foydalanuvchi:** ${populatedOrder.user && populatedOrder.user.firstName ? populatedOrder.user.firstName : "Noma'lum"}\n`;
        message += `📞 **Telefon:** ${populatedOrder.customerInfo && populatedOrder.customerInfo.phone ? populatedOrder.customerInfo.phone : 'Kiritilmagan'}\n`;
        message += `💰 **Jami:** ${populatedOrder.total.toLocaleString()} so'm\n`;
        message += `📅 **Sana:** ${populatedOrder.createdAt.toLocaleString('uz-UZ')}\n\n`;
        message += `🍽️ **Buyurtma turi:** ${Helpers.getOrderTypeText(populatedOrder.orderType, 'uz')}`;
        if (populatedOrder.orderType === 'dine_in') {
          message += `\n⏰ **Kelish vaqti:** ${(populatedOrder.dineInInfo && populatedOrder.dineInInfo.arrivalTime) ? populatedOrder.dineInInfo.arrivalTime + ' daqiqa' : 'Kiritilmagan'}`;
        } else if (populatedOrder.orderType === 'pickup') {
          message += `\n⏰ **Olib ketish vaqti:** ${(populatedOrder.dineInInfo && populatedOrder.dineInInfo.arrivalTime) ? populatedOrder.dineInInfo.arrivalTime + ' daqiqa' : 'Kiritilmagan'}`;
        } else if (populatedOrder.orderType === 'table') {
          message += `\n🪑 **Stol:** ${populatedOrder.dineInInfo?.tableNumber || ''}`;
        } else if (populatedOrder.orderType === 'delivery') {
          let manzilText = 'Kiritilmagan';
          if (populatedOrder.deliveryInfo && populatedOrder.deliveryInfo.address) {
            manzilText = populatedOrder.deliveryInfo.address;
          } else if (populatedOrder.deliveryInfo && populatedOrder.deliveryInfo.location && populatedOrder.deliveryInfo.location.latitude && populatedOrder.deliveryInfo.location.longitude) {
            manzilText = `https://maps.google.com/?q=${populatedOrder.deliveryInfo.location.latitude},${populatedOrder.deliveryInfo.location.longitude}`;
          }
          message += `\n📍 **Manzil:** ${manzilText}`;
        }
        message += `\n💳 **To'lov:** ${Helpers.getPaymentMethodText(populatedOrder.paymentMethod, 'uz') || 'Kiritilmagan'}`;
        await bot.telegram.sendMessage(admin.telegramId, message, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '✅ Tasdiqlash', callback_data: `admin_quick_confirmed_${populatedOrder._id}` },
                { text: '👨‍🍳 Tayyorlash', callback_data: `admin_quick_preparing_${populatedOrder._id}` }
              ],
              [
                { text: '🎯 Tayyor', callback_data: `admin_quick_ready_${populatedOrder._id}` },
                { text: '🚚 Yetkazildi', callback_data: `admin_quick_delivered_${populatedOrder._id}` }
              ],
              ...(populatedOrder.orderType === 'pickup' ? [[{ text: '🛍️ Olib ketdi', callback_data: `admin_quick_picked_up_${populatedOrder._id}` }]] : []),
              [
                { text: '❌ Bekor', callback_data: `admin_quick_cancelled_${populatedOrder._id}` }
              ]
            ]
          }
        });
      } catch (error) {
        console.error(`Admin ${admin.telegramId} ga xabar yuborishda xatolik:`, error);
      }
    }
  } catch (error) {
    console.error('Notify admins error:', error);
  }
}

module.exports = { notifyAdmins };


