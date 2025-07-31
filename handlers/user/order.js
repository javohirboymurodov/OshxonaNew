const { User, Product, Category, Order, Cart } = require('../../models');
const { orderTypeKeyboard, paymentMethodKeyboard, orderConfirmKeyboard, mainMenuKeyboard } = require('../../keyboards/userKeyboards');
const SocketManager = require('../../config/socketConfig');
const Helpers = require('../../utils/helpers');

async function startOrder(ctx) {
  try {
    const telegramId = ctx.from.id;
    const user = await User.findOne({ telegramId });
    if (!user) {
      return await ctx.answerCbQuery('Foydalanuvchi topilmadi!');
    }
    const cart = await Cart.findOne({ user: user._id, isActive: true });
    if (!cart || cart.items.length === 0) {
      return await ctx.answerCbQuery('❌ Savat bo\'sh!');
    }
    if (ctx.session.orderType === 'dine_in_qr' && ctx.session.orderData?.tableCode) {
      await handleDineInQR(ctx, ctx.session.orderData);
      return;
    }
    const message = `\n📝 **Buyurtma berish**\n\nBuyurtma turini tanlang:`;
    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: orderTypeKeyboard.reply_markup
    });
  } catch (error) {
    console.error('Start order error:', error);
    await ctx.answerCbQuery('❌ Buyurtma boshlashda xatolik!');
  }
}

async function handleOrderType(ctx) {
  try {
    let orderType = ctx.callbackQuery.data.split('_')[2];
    if (orderType === 'dine') orderType = 'dine_in';
    if (orderType === 'dine_in') {
      await handleDineInPreorder(ctx);
    } else {
      await startOrderFlow(ctx, orderType);
    }
  } catch (error) {
    console.error('Handle order type error:', error);
    await ctx.answerCbQuery('Buyurtma turini tanlashda xatolik!');
  }
}

async function handleDineInPreorder(ctx) {
  try {
    ctx.session.orderType = 'dine_in';
    const { arrivalTimeKeyboard } = require('../../keyboards/userKeyboards');
    await ctx.editMessageText(
      "⏰ Necha daqiqadan so'ng restoranga kelasiz?\n\n" +
      "Vaqtingizni tanlang:",
      {
        parse_mode: 'Markdown',
        reply_markup: arrivalTimeKeyboard().reply_markup
      }
    );
  } catch (error) {
    console.error('Handle dine in preorder error:', error);
    await ctx.answerCbQuery('Vaqt tanlashda xatolik!');
  }
}

async function handleArrivalTime(ctx) {
  try {
    const data = ctx.callbackQuery.data.split('_');
    let minutes;
    if (data[2].includes('hour')) {
      if (data[2] === '1_hour') minutes = 60;
      else if (data[2] === '1_hour_30') minutes = 90;
      else if (data[2] === '2_hours') minutes = 120;
    } else {
      minutes = parseInt(data[2]);
    }
    ctx.session.orderData = ctx.session.orderData || {};
    ctx.session.orderData.arrivalTime = minutes;
    // Telefon raqami sessionda yo'q bo'lsa, bazadan tekshiramiz
    let user = ctx.session.user;
    if (!user) {
      const telegramId = ctx.from.id;
      user = await User.findOne({ telegramId });
      ctx.session.user = user;
    }
    if (user && user.phone) {
      await askForPaymentMethod(ctx);
    } else {
      await askForPhone(ctx);
    }
  } catch (error) {
    console.error('Handle arrival time error:', error);
    await ctx.answerCbQuery('Vaqtni saqlashda xatolik!');
  }
}

async function handleDineInQR(ctx, tableCode) {
  try {
    const telegramId = ctx.from.id;
    let user = await User.findOne({ telegramId });
    if (!user) {
      user = new User({
        telegramId: ctx.from.id,
        firstName: ctx.from.first_name,
        lastName: ctx.from.last_name,
        username: ctx.from.username,
        language: ctx.from.language_code || 'uz'
      });
      await user.save();
    } else {
      await user.updateLastActivity();
    }
    ctx.session.user = user;
    ctx.session.orderType = 'dine_in_qr';
    ctx.session.orderData = {
      tableCode: tableCode
    };
    await ctx.reply(`\n🍽️ **Stol ${tableCode} uchun buyurtma**\n\nSiz stol ${tableCode} uchun buyurtma berasiz.\nMahsulotlarni tanlang va buyurtma bering!\n      `, {
      parse_mode: 'Markdown',
      reply_markup: mainMenuKeyboard.reply_markup
    });
  } catch (error) {
    console.error('Handle dine in QR error:', error);
    await ctx.reply('❌ Stol kodini qayta ishlashda xatolik!');
  }
}

async function startOrderFlow(ctx, orderType, orderData = {}) {
  try {
    ctx.session.orderType = orderType;
    ctx.session.orderData = { ...ctx.session.orderData, ...orderData };
    if (orderType === 'delivery') {
      ctx.session.waitingFor = 'address';
      return await ctx.reply('📍 Yetkazib berish manzilini kiriting yoki lokatsiya yuboring:');
    }
    if (orderType === 'pickup') {
      ctx.session.waitingFor = 'arrival_time';
      const { arrivalTimeKeyboard } = require('../../keyboards/userKeyboards');
      return await ctx.reply(
        "⏰ Necha daqiqadan so'ng buyurtmani olib ketasiz?\n\nVaqtingizni tanlang:",
        { reply_markup: arrivalTimeKeyboard().reply_markup }
      );
    }
    // Telefon raqami sessionda yo'q bo'lsa, bazadan tekshiramiz
    let user = ctx.session.user;
    if (!user) {
      const telegramId = ctx.from.id;
      user = await User.findOne({ telegramId });
      ctx.session.user = user;
    }
    if (user && user.phone) {
      await askForPaymentMethod(ctx);
    } else {
      await askForPhone(ctx);
    }
  } catch (error) {
    console.error('Start order flow error:', error);
    await ctx.answerCbQuery('Buyurtma jarayonini boshlashda xatolik!');
  }
}

async function askForPhone(ctx) {
  try {
    ctx.session.waitingFor = 'phone';
    const text = "📞 Telefon raqamingizni yuboring yoki kiriting:";
    const keyboard = {
      keyboard: [
        [{ text: "📲 Telefon raqamni yuborish", request_contact: true }]
      ],
      resize_keyboard: true,
      one_time_keyboard: true
    };
    await ctx.reply(text, { reply_markup: keyboard });
  } catch (error) {
    console.error('Ask for phone error:', error);
    if (ctx.answerCbQuery) await ctx.answerCbQuery('Telefon so\'rashda xatolik!');
  }
}

async function askForPaymentMethod(ctx) {
  try {
    ctx.session.waitingFor = 'payment_method';
    const text = "💳 To'lov turini tanlang:\nQanday to'lov usulini tanlaysiz?";
    if (ctx.updateType === 'callback_query') {
      await ctx.editMessageText(text, {
        parse_mode: 'Markdown',
        reply_markup: paymentMethodKeyboard.reply_markup
      });
    } else {
      await ctx.reply(text, {
        parse_mode: 'Markdown',
        reply_markup: paymentMethodKeyboard.reply_markup
      });
    }
  } catch (error) {
    console.error('Ask for payment method error:', error);
    if (ctx.answerCbQuery) await ctx.answerCbQuery('To\'lov turini so\'rashda xatolik!');
  }
}

async function handlePaymentMethod(ctx, paymentMethod) {
  try {
    ctx.session.orderData = ctx.session.orderData || {};
    ctx.session.orderData.paymentMethod = paymentMethod;
    ctx.session.waitingFor = null;
    await confirmOrder(ctx);
  } catch (error) {
    console.error('Handle payment method error:', error);
    await ctx.answerCbQuery('To\'lov turini saqlashda xatolik!');
  }
}

async function confirmOrder(ctx) {
  try {
    const user = ctx.session.user || await User.findOne({ telegramId: ctx.from.id });
    if (!user) {
      await ctx.reply('Foydalanuvchi topilmadi!');
      return;
    }
    const cart = await Cart.findOne({ 
      user: user._id, 
      isActive: true 
    }).populate('items.product');
    if (!cart || cart.items.length === 0) {
      await ctx.editMessageText('❌ Savatingiz bo\'sh!');
      return;
    }
    let message = '📋 <b>Buyurtma ma\'lumotlari</b>\n\n';
    cart.items.forEach((item, index) => {
      message += `${index + 1}. ${item.productName} x${item.quantity} = ${item.totalPrice.toLocaleString()} so'm\n`;
    });
    message += `\n💰 <b>Jami:</b> ${cart.total.toLocaleString()} so'm\n`;
    if (ctx.session.orderType === 'delivery') {
      let manzilText = 'Kiritilmagan';
      if (ctx.session.orderData.address) {
        manzilText = ctx.session.orderData.address;
      } else if (
        ctx.session.orderData.location &&
        ctx.session.orderData.location.latitude &&
        ctx.session.orderData.location.longitude
      ) {
        manzilText = `<a href="https://maps.google.com/?q=${ctx.session.orderData.location.latitude},${ctx.session.orderData.location.longitude}">Lokatsiya</a>`;
      }
      message += `📍 <b>Manzil:</b> ${manzilText}\n`;
    }
    if (ctx.session.orderType === 'dine_in' && ctx.session.orderData && ctx.session.orderData.arrivalTime) {
      message += `⏰ <b>Kelish vaqti:</b> ${ctx.session.orderData.arrivalTime} daqiqa\n`;
    }
    message += `📞 <b>Telefon:</b> ${user.phone}\n`;
    message += `💳 <b>To'lov:</b> ${ctx.session.orderData.paymentMethod}\n`;
    await ctx.replyWithHTML(message, {
      reply_markup: orderConfirmKeyboard.reply_markup
    });
  } catch (error) {
    console.error('Confirm order error:', error);
    await ctx.answerCbQuery('Buyurtmani tasdiqlashda xatolik!');
  }
}

async function finalizeOrder(ctx) {
  try {
    const user = ctx.session.user || await User.findOne({ telegramId: ctx.from.id });
    if (!user) {
      await ctx.reply('Foydalanuvchi topilmadi!');
      return;
    }
    const cart = await Cart.findOne({ 
      user: user._id, 
      isActive: true 
    }).populate('items.product');
    if (!cart || cart.items.length === 0) {
      await ctx.editMessageText('❌ Savatingiz bo\'sh!');
      return;
    }
    const orderType = ctx.session.orderType;
    console.log('DEBUG: session.orderType =', orderType);
    const orderData = ctx.session.orderData || {};
    const subtotal = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);
    const order = new Order({
      orderId: 'ORD' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase(),
      user: user._id,
      items: cart.items.map(item => ({
        product: item.product._id,
        productName: item.productName,
        quantity: item.quantity,
        price: item.price,
        totalPrice: item.totalPrice
      })),
      orderType,
      subtotal,
      total: subtotal,
      paymentMethod: orderData.paymentMethod,
      status: 'pending',
      customerInfo: {
        name: user.firstName,
        phone: user.phone
      },
      deliveryInfo: orderType === 'delivery' ? {
        address: orderData.address || '',
        location: orderData.location || undefined
      } : undefined,
      dineInInfo: (orderType === 'dine_in' || orderType === 'pickup') ? {
        arrivalTime: orderData.arrivalTime ? String(orderData.arrivalTime) : undefined
      } : undefined
    });
    console.log('DEBUG: order.orderType =', order.orderType);
    await order.save();
    
    // SOCKET.IO: Adminlarga yangi buyurtma haqida xabar berish
    try {
      const orderForSocket = {
        id: order._id,
        orderId: order.orderId,
        customer: {
          name: user.firstName,
          phone: user.phone,
          telegramId: user.telegramId
        },
        items: order.items,
        total: order.total,
        orderType: order.orderType,
        paymentMethod: order.paymentMethod,
        status: order.status,
        createdAt: order.createdAt,
        deliveryInfo: order.deliveryInfo,
        dineInInfo: order.dineInInfo
      };
      
      // Asosiy filialga yuborish (kelajakda branch ID bo'yicha)
      const branchId = user.branch || 'main';
      SocketManager.emitNewOrder(branchId, orderForSocket);
      
      // Foydalanuvchiga buyurtma holati haqida xabar
      SocketManager.emitStatusUpdate(user._id, {
        orderId: order._id,
        orderNumber: order.orderId,
        status: 'pending',
        message: 'Buyurtmangiz qabul qilindi va ko\'rib chiqilmoqda',
        estimatedTime: order.orderType === 'delivery' ? '30-45 daqiqa' : '15-25 daqiqa'
      });
      
      console.log(`📡 Socket events sent for order ${order.orderId}`);
    } catch (socketError) {
      console.error('Socket.IO event error:', socketError);
      // Socket xatosi buyurtma jarayonini to'xtatmasin
    }
    
    cart.isActive = false;
    await cart.save();
    ctx.session.orderType = null;
    ctx.session.orderData = null;
    ctx.session.waitingFor = null;
    let confirmMsg = `✅ <b>Buyurtma muvaffaqiyatli yaratildi!</b>\n\n📋 <b>Buyurtma №:</b> ${order.orderId}\n💰 <b>Jami:</b> ${order.total.toLocaleString()} so'm\n📅 <b>Sana:</b> ${new Date().toLocaleString('uz-UZ')}`;
    if (order.orderType === 'dine_in' && order.dineInInfo && order.dineInInfo.arrivalTime) {
      confirmMsg += `\n⏰ <b>Kelish vaqti:</b> ${order.dineInInfo.arrivalTime} daqiqa`;
    }
    // Olib ketish uchun ham vaqtni ko'rsatamiz
    if (order.orderType === 'pickup' && order.dineInInfo && order.dineInInfo.arrivalTime) {
      confirmMsg += `\n⏰ <b>Olib ketish vaqti:</b> ${order.dineInInfo.arrivalTime} daqiqa`;
    }
    confirmMsg += `\n\nBuyurtmangiz qabul qilindi va tez orada tayyorlanadi!`;
    
    // TUZATILDI: Dine-in uchun "Keldim" tugmasi
    if (order.orderType === 'dine_in') {
      const { Markup } = require('telegraf');
      
      // Buyurtma ma'lumotlari bilan xabar
      await ctx.replyWithHTML(confirmMsg, {
        reply_markup: mainMenuKeyboard.reply_markup
      });
      
      // "Keldim" tugmasi alohida xabar sifatida
      await ctx.replyWithHTML(
        '🚪 <b>Restoranga kelganingizda "Keldim" tugmasini bosing:</b>',
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '✅ Keldim', callback_data: `dinein_arrived_${order._id}` }]
            ]
          }
        }
      );
    } else {
      await ctx.replyWithHTML(confirmMsg, {
        reply_markup: mainMenuKeyboard.reply_markup
      });
    }
    
    await notifyAdmins(order);
    
  } catch (error) {
    console.error('Finalize order error:', error);
    await ctx.answerCbQuery('Buyurtmani yakunlashda xatolik!');
  }
}

async function notifyAdmins(order) {
  try {
    const admins = await User.find({ role: 'admin' });
    const OrderModel = require('../../models/Order');
    const populatedOrder = await OrderModel.findById(order._id).populate('user');
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
        message += `🍽️ **Mahsulotlar:**\n`;
        populatedOrder.items.forEach((item, index) => {
          message += `${index + 1}. ${item.productName} x${item.quantity} = ${item.totalPrice.toLocaleString()} so'm\n`;
        });
        message += `\n📝 **Buyurtma turi:** ${Helpers.getOrderTypeText(populatedOrder.orderType, 'uz')}`;
        if (populatedOrder.orderType === 'dine_in') {
          message += `\n⏰ **Kelish vaqti:** ${(populatedOrder.dineInInfo && populatedOrder.dineInInfo.arrivalTime) ? populatedOrder.dineInInfo.arrivalTime + ' daqiqa' : 'Kiritilmagan'}`;
        } else if (populatedOrder.orderType === 'pickup') {
          message += `\n⏰ **Olib ketish vaqti:** ${(populatedOrder.dineInInfo && populatedOrder.dineInInfo.arrivalTime) ? populatedOrder.dineInInfo.arrivalTime + ' daqiqa' : 'Kiritilmagan'}`;
        } else if (populatedOrder.orderType === 'dine_in_qr') {
          message += `\n🍽️ **Stol:** ${(populatedOrder.dineInInfo && populatedOrder.dineInInfo.tableNumber) ? populatedOrder.dineInInfo.tableNumber : ''}`;
        } else if (populatedOrder.orderType === 'delivery') {
          let manzilText = 'Kiritilmagan';
          if (populatedOrder.deliveryInfo && populatedOrder.deliveryInfo.address) {
            manzilText = populatedOrder.deliveryInfo.address;
          } else if (
            populatedOrder.deliveryInfo &&
            populatedOrder.deliveryInfo.location &&
            populatedOrder.deliveryInfo.location.latitude &&
            populatedOrder.deliveryInfo.location.longitude
          ) {
            manzilText = `https://maps.google.com/?q=${populatedOrder.deliveryInfo.location.latitude},${populatedOrder.deliveryInfo.location.longitude}`;
          }
          message += `\n📍 **Manzil:** ${manzilText}`;
        }
        message += `\n💳 **To'lov:** ${Helpers.getPaymentMethodText(populatedOrder.paymentMethod, 'uz') || 'Kiritilmagan'}`;
        await bot.telegram.sendMessage(admin.telegramId, message, {
          parse_mode: 'Markdown'
        });
      } catch (error) {
        console.error(`Admin ${admin.telegramId} ga xabar yuborishda xatolik:`, error);
      }
    }
  } catch (error) {
    console.error('Notify admins error:', error);
  }
}

async function continueOrderProcess(ctx) {
  try {
    await ctx.reply('📝 Buyurtma ma\'lumotlari to\'ldirilmoqda...', {
      reply_markup: require('../../keyboards/userKeyboards').backToMainKeyboard.reply_markup
    });
  } catch (error) {
    console.error('Continue order process error:', error);
    await ctx.reply('❌ Buyurtma jarayonida xatolik!');
  }
}

async function handleDineInArrived(ctx) {
  try {
    const orderId = ctx.match[1];
    ctx.session.waitingFor = `dinein_table_${orderId}`;
    await ctx.reply('Iltimos, kelgan stol raqamingizni kiriting:');
  } catch (error) {
    console.error('Keldim tugmasi bosilganda xatolik:', error);
    await ctx.reply('❌ Xatolik yuz berdi.');
  }
}

async function handleDineInTableInput(ctx) {
  try {
    const waitingFor = ctx.session.waitingFor;
    if (!waitingFor || !waitingFor.startsWith('dinein_table_')) return false;
    
    const orderId = waitingFor.replace('dinein_table_', '');
    const tableNumber = ctx.message.text.trim();
    
    // Raqam tekshirish
    if (!/^\d+$/.test(tableNumber)) {
      await ctx.reply('❌ Iltimos, faqat raqam kiriting! (masalan: 5, 12)');
      return false;
    }

    // Buyurtmani yangilash
    const order = await Order.findOneAndUpdate(
      { _id: orderId },
      { 
        $set: { 
          'dineInInfo.tableNumber': tableNumber, 
          status: 'arrived' 
        } 
      },
      { new: true }
    ).populate('user');

    if (!order) {
      await ctx.reply('❌ Buyurtma topilmadi!');
      return false;
    }

    // Session ni tozalash
    ctx.session.waitingFor = null;

    // Mijozga tasdiqlash xabari
    const message = `✅ **Stol raqamingiz qabul qilindi!**\n\n🪑 **Stol:** ${tableNumber}\n📝 **Buyurtma:** #${order.orderId}\n\n🍽️ **Buyurtmangiz tez orada tayyor bo'ladi!**\n\nOfitsiant sizga xizmat ko'rsatadi.`;

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: require('../../keyboards/userKeyboards').mainMenuKeyboard.reply_markup
    });

    // Adminlarga xabar yuborish - TUZATILDI
    const admins = await User.find({ role: 'admin' });

    for (const admin of admins) {
      try {
        let msg = `🍽️ **MIJOZ STOLGA O'TIRDI**\n\n`;
        msg += `👤 **Mijoz:** ${order.user?.firstName || 'Noma\'lum'}\n`;
        msg += `📞 **Telefon:** ${order.customerInfo?.phone || 'Kiritilmagan'}\n`;
        msg += `📋 **Buyurtma №:** ${order.orderId}\n`;
        msg += `🪑 **Stol raqami:** ${tableNumber}\n\n`;
        msg += `🍽️ **Buyurtmani stolga olib boring!**`;

        // TUZATILDI: bot emas, ctx.telegram
        await ctx.telegram.sendMessage(admin.telegramId, msg, { 
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '✅ Yetkazildi', callback_data: `order_delivered_${order._id}` }]
            ]
          }
        });
      } catch (error) {
        console.error(`Admin ${admin.telegramId} ga xabar yuborishda xatolik:`, error);
      }
    }

    return true;
    
  } catch (error) {
    console.error('Stol raqami kiritishda xatolik:', error);
    await ctx.reply('❌ Stol raqamini saqlashda xatolik!');
    return false;
  }
}

module.exports = {
  startOrder,
  handleOrderType,
  handleDineInPreorder,
  handleArrivalTime,
  handleDineInQR,
  startOrderFlow,
  askForPhone,
  askForPaymentMethod,
  handlePaymentMethod,
  confirmOrder,
  finalizeOrder,
  notifyAdmins,
  continueOrderProcess,
  handleDineInArrived,
  handleDineInTableInput
};
