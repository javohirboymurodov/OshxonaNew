const { User } = require('../../../../models');
const Helpers = require('../../../../utils/helpers');

async function notifyAdmins(order) {
  try {
    const branchId = order.branch ? String(order.branch) : null;
    const admins = await User.find(
      branchId ? { role: 'admin', branch: branchId } : { role: 'admin' }
    );

    const OrderModel = require('../../../../models/Order');
    const populatedOrder = await OrderModel.findById(order._id).populate('user');

    // Emit to web admin panel (Socket.IO)
    try {
      console.log('🔔 notifyAdmins: Starting socket notification...');
      const SocketManager = require('../../../../config/socketConfig');
      const branchId = (order.branch && order.branch.toString) ? order.branch.toString() : 'default';
      
      console.log('🔔 notifyAdmins: Processing order:', {
        orderId: order._id,
        orderNumber: order.orderId,
        branchId: branchId,
        orderType: populatedOrder.orderType,
        customerName: populatedOrder.user?.firstName
      });
      
      // 🔧 FIX: Order type ga qarab turli xabarlar
      const getOrderTypeMessage = (orderType, tableNumber) => {
        switch (orderType) {
          case 'table':
            return `🍽️ Stoldan buyurtma keldi! (Stol: ${tableNumber || 'N/A'})`;
          case 'delivery':
            return '🚚 Yetkazib berish uchun buyurtma!';
          case 'pickup':
            return '🛍️ Olib ketish uchun buyurtma!';
          case 'dine_in':
            return '🏪 Avvaldan buyurtma (restorandagi)!';
          default:
            return '🆕 Yangi buyurtma!';
        }
      };

      const orderPayload = {
        _id: order._id,
        orderId: order.orderId,
        status: order.status,
        total: order.total,
        orderType: populatedOrder.orderType,
        orderTypeMessage: getOrderTypeMessage(populatedOrder.orderType, populatedOrder?.dineInInfo?.tableNumber),
        customerInfo: { 
          name: (populatedOrder.user && populatedOrder.user.firstName) ? populatedOrder.user.firstName : 'Mijoz' 
        },
        tableNumber: populatedOrder?.dineInInfo?.tableNumber,
        createdAt: order.createdAt || new Date(),
        items: populatedOrder.items || [],
        paymentMethod: order.paymentMethod || 'cash',
        soundType: populatedOrder.orderType // Kelajakda turli ovozlar uchun
      };
      
      // Send to specific branch only (no superadmin notification)
      console.log('🔔 notifyAdmins: Calling SocketManager.emitNewOrder with:', {
        branchId,
        payloadKeys: Object.keys(orderPayload)
      });
      SocketManager.emitNewOrder(branchId, orderPayload);
      console.log('🔔 notifyAdmins: SocketManager.emitNewOrder completed');
      
    } catch (emitErr) {
      console.error('Emit new order error:', emitErr?.message || emitErr);
    }

    const telegramEnabled = String(process.env.ADMIN_TELEGRAM_ENABLED || 'false').toLowerCase() === 'true';

    if (telegramEnabled) for (const admin of admins) {
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
        const orderTypeMessage = getOrderTypeMessage(populatedOrder.orderType, populatedOrder?.dineInInfo?.tableNumber);
        let message = `\n${orderTypeMessage}\n\n`;
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
                { text: '🍽️ Tayyor', callback_data: `admin_quick_ready_${populatedOrder._id}` }
              ],
              [
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
        if (error && error.response && error.response.error_code === 400 && /chat not found/i.test(error.response.description || '')) {
          console.warn(`Admin ${admin.telegramId} uchun chat topilmadi. Admin botni bir marta /start qilib yoqishi kerak.`);
        } else {
          console.error(`Admin ${admin.telegramId} ga xabar yuborishda xatolik:`, error);
        }
      }
    }
  } catch (error) {
    console.error('Notify admins error:', error);
  }
}

async function notifyCustomerArrived(order) {
  try {
    console.log('=== notifyCustomerArrived started ===');
    const branchId = order.branch ? String(order.branch) : 'default';
    const admins = await User.find(
      branchId ? { role: 'admin', branch: branchId } : { role: 'admin' }
    );

    console.log('Found admins:', admins.length, 'for branch:', branchId);

    const OrderModel = require('../../../../models/Order');
    const populatedOrder = await OrderModel.findById(order._id).populate('user').populate('items.product');
    
    console.log('Populated order:', populatedOrder._id);

    // Emit to web admin panel (Socket.IO)
    try {
      const SocketManager = require('../../../../config/socketConfig');
      SocketManager.emitOrderUpdate(order._id, {
        orderId: order.orderId,
        status: 'customer_arrived',
        message: `Mijoz keldi: ${populatedOrder.user?.firstName || 'Noma\'lum'} - Stol: ${populatedOrder.dineInInfo?.tableNumber || 'N/A'}`,
        customer: { name: populatedOrder.user?.firstName || 'Mijoz' },
        total: populatedOrder.total,
        orderType: populatedOrder.orderType,
        tableNumber: populatedOrder.dineInInfo?.tableNumber,
        branchId: branchId,
        sound: true
      });
      
      if (branchId !== 'default') {
        SocketManager.emitOrderUpdate('default', {
          orderId: order.orderId,
          status: 'customer_arrived',
          message: `Mijoz keldi: ${populatedOrder.user?.firstName || 'Noma\'lum'} - Stol: ${populatedOrder.dineInInfo?.tableNumber || 'N/A'}`,
          customer: { name: populatedOrder.user?.firstName || 'Mijoz' },
          total: populatedOrder.total,
          orderType: populatedOrder.orderType,
          tableNumber: populatedOrder.dineInInfo?.tableNumber,
          branchId: branchId,
          sound: true
        });
      }
      
      console.log('Socket.IO notification sent successfully');
    } catch (emitErr) {
      console.error('Emit customer arrived error:', emitErr?.message || emitErr);
    }

    // Telegram notification (if enabled)
    const telegramEnabled = String(process.env.ADMIN_TELEGRAM_ENABLED || 'false').toLowerCase() === 'true';
    if (telegramEnabled) {
      console.log('Telegram notifications enabled, sending to', admins.length, 'admins');
      
      for (const admin of admins) {
        try {
          const bot = global.botInstance;
          if (!bot) {
            console.error('Bot instance topilmadi!');
            return;
          }
          if (!admin.telegramId || isNaN(Number(admin.telegramId))) {
            console.warn(`Admin telegramId noto'g'ri yoki yo'q:`, admin.telegramId);
            continue;
          }
          
          let message = `🔔 **Mijoz keldi!**\n\n`;
          message += `📋 **Buyurtma №:** ${populatedOrder.orderId}\n`;
          message += `👤 **Foydalanuvchi:** ${populatedOrder.user?.firstName || "Noma'lum"} ${populatedOrder.user?.lastName || ''}\n`;
          message += `📞 **Telefon:** ${populatedOrder.customerInfo?.phone || 'Kiritilmagan'}\n`;
          message += `🪑 **Stol raqami:** ${populatedOrder.dineInInfo?.tableNumber || 'N/A'}\n`;
          message += `💰 **Jami:** ${populatedOrder.total.toLocaleString()} so'm\n`;
          message += `📅 **Sana:** ${populatedOrder.createdAt.toLocaleString('uz-UZ')}\n\n`;
          message += `🛒 **Buyurtma tarkibi:**\n`;
          populatedOrder.items.forEach((item, index) => {
            message += `${index + 1}. ${item.productName} x ${item.quantity} (${item.totalPrice.toLocaleString()} so'm)\n`;
          });
          
          await bot.telegram.sendMessage(admin.telegramId, message, {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: '✅ Buyurtmani ko\'rish', url: `${process.env.ADMIN_PANEL_URL}/orders?focusOrderId=${populatedOrder._id}` }]
              ]
            }
          });
          
          console.log(`Telegram notification sent to admin ${admin.telegramId}`);
        } catch (error) {
          if (error && error.response && error.response.error_code === 400 && /chat not found/i.test(error.response.description || '')) {
            console.warn(`Admin ${admin.telegramId} uchun chat topilmadi. Admin botni bir marta /start qilib yoqishi kerak.`);
          } else {
            console.error(`Admin ${admin.telegramId} ga xabar yuborishda xatolik:`, error);
          }
        }
      }
    } else {
      console.log('Telegram notifications disabled');
    }
    
    console.log('=== notifyCustomerArrived completed successfully ===');
  } catch (error) {
    console.error('Notify customer arrived error:', error);
  }
}

async function notifyCustomerStatusUpdate(order, status, message) {
  try {
    console.log('🔔 notifyCustomerStatusUpdate started:', {
      orderId: order._id,
      status,
      message
    });

    const OrderModel = require('../../../../models/Order');
    const populatedOrder = await OrderModel.findById(order._id).populate('user');
    
    if (!populatedOrder?.user?.telegramId) {
      console.log('❌ User telegramId not found for order:', order._id);
      return;
    }

    const bot = global.botInstance;
    if (!bot) {
      console.error('❌ Bot instance not found!');
      return;
    }

    const statusMessages = {
      'confirmed': '✅ Buyurtmangiz tasdiqlandi va tayyorlanishni boshladi',
      'ready': '🍽️ Buyurtmangiz tayyor! Olib ketishingiz mumkin',
      'assigned': '🚚 Kuryer tayinlandi',
      'on_delivery': '🚗 Buyurtmangiz yetkazilmoqda',
      'delivered': '✅ Buyurtmangiz yetkazildi',
      'picked_up': '📦 Buyurtmangiz olib ketildi',
      'completed': '🎉 Buyurtmangiz yakunlandi',
      'cancelled': '❌ Buyurtmangiz bekor qilindi'
    };

    const statusEmojis = {
      'confirmed': '✅',
      'ready': '🍽️',
      'assigned': '🚚',
      'on_delivery': '🚗',
      'delivered': '✅',
      'picked_up': '📦',
      'completed': '🎉',
      'cancelled': '❌'
    };

    const statusText = statusMessages[status] || message || 'Holat yangilandi';
    const emoji = statusEmojis[status] || '📋';

    let notificationMessage = `${emoji} **${statusText}**\n\n`;
    notificationMessage += `📋 **Buyurtma №:** ${populatedOrder.orderId}\n`;
    notificationMessage += `💰 **Jami:** ${populatedOrder.total.toLocaleString()} so'm\n`;
    notificationMessage += `📅 **Vaqt:** ${new Date().toLocaleString('uz-UZ')}\n\n`;

    if (status === 'ready' && populatedOrder.orderType === 'pickup') {
      notificationMessage += `🕐 **Olib ketish vaqti:** 15-20 daqiqa\n`;
      notificationMessage += `📍 **Filial:** ${populatedOrder.branch?.name || 'Asosiy filial'}\n`;
    } else if (status === 'on_delivery' && populatedOrder.orderType === 'delivery') {
      notificationMessage += `🚚 **Kuryer:** ${populatedOrder.deliveryInfo?.courier?.firstName || 'Tayinlandi'}\n`;
      notificationMessage += `⏰ **Taxminiy vaqt:** 30-45 daqiqa\n`;
    }

    // Send notification to user
    await bot.telegram.sendMessage(populatedOrder.user.telegramId, notificationMessage, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '📋 Buyurtmalarim', callback_data: 'my_orders' }],
          [{ text: '🛒 Yangi buyurtma', callback_data: 'start_order' }]
        ]
      }
    });

    console.log('✅ Customer notification sent successfully');

  } catch (error) {
    console.error('❌ Notify customer status update error:', error);
  }
}

module.exports = { notifyAdmins, notifyCustomerArrived, notifyCustomerStatusUpdate };


