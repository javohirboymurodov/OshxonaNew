const { User, Order } = require('../../../models');
const { buildMainText, mainMenuKeyboard, replyKeyboard, replyKeyboardMain } = require('../../courier/keyboards');

async function ensureCourierByTelegram(ctx) {
  const telegramId = ctx.from?.id;
  let user = await User.findOne({ telegramId });
  if (!user) return { user: null, allowed: false };
  return { user, allowed: user.role === 'courier' };
}

async function start(ctx) {
  console.log(`🎯 COURIER START COMMAND:`, {
    from: ctx.from?.id,
    username: ctx.from?.username,
    timestamp: new Date().toISOString()
  });
  
  const { user, allowed } = await ensureCourierByTelegram(ctx);
  console.log(`🔍 Courier start auth:`, { 
    userId: user?._id, 
    role: user?.role,
    allowed,
    telegramId: user?.telegramId 
  });
  
  if (!allowed) {
    // Ask to bind by phone
    ctx.session = ctx.session || {};
    ctx.session.courierBind = true;
    return ctx.reply('📱 Kuryer profilini bog\'lash uchun telefon raqamingizni yuboring:', {
      reply_markup: {
        keyboard: [[{ text: '📞 Telefonni yuborish', request_contact: true }]],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    });
  }
  user.courierInfo = user.courierInfo || { isOnline: false, isAvailable: true, rating: 5.0, totalDeliveries: 0 };
  // 🔧 FIX: Start'dan keyin lokatsiya so'ralmasin, shunchaki profil ko'rsatilsin
  await ctx.reply(buildMainText(user), { reply_markup: mainMenuKeyboard(user) });
  // Reply keyboard ham qo'shamiz kuryer menyusiga qaytish uchun
  try {
    await ctx.reply('Kuryer panelidan foydalaning:', { reply_markup: replyKeyboardMain() });
  } catch {}
}

async function toggleShift(ctx) {
  const { user, allowed } = await ensureCourierByTelegram(ctx);
  if (!allowed) return ctx.answerCbQuery('❌ Ruxsat yo\'q');
  user.courierInfo = user.courierInfo || {};
  user.courierInfo.isOnline = !user.courierInfo.isOnline;
  await user.save();
  await ctx.answerCbQuery(user.courierInfo.isOnline ? '✅ Online' : '❌ Offline');
  try { await ctx.editMessageReplyMarkup(mainMenuKeyboard(user)); } catch {}
  // Online bo'lganda live location ko'rsatmasi
  try {
    if (user.courierInfo.isOnline) {
      await ctx.reply('📍 **Jonli lokatsiya** yuboring:\n\n"📍 Joylashuvni yuborish" tugmasini bosib, "Live Location" (jonli joylashuv) ni tanlang va "Poka ya ne otklyuchu" (to\'xtatmaguncha) ni belgilang.', { 
        parse_mode: 'Markdown',
        reply_markup: replyKeyboard() 
      });
    } else {
      await ctx.reply('🔕 Offline: lokatsiya yuborish talab etilmaydi.', { reply_markup: replyKeyboardMain() });
    }
  } catch {}
}

// Ishni boshlash tugmasi
async function startWork(ctx) {
  const { user, allowed } = await ensureCourierByTelegram(ctx);
  if (!allowed) return ctx.answerCbQuery('❌ Ruxsat yo\'q');
  user.courierInfo = user.courierInfo || {};
  user.courierInfo.isOnline = true;
  await user.save();
  try { await ctx.answerCbQuery('✅ Ish boshlandi! Endi jonli lokatsiya yuboring.'); } catch {}
  try { await ctx.editMessageReplyMarkup(mainMenuKeyboard(user)); } catch {}
  // 🔧 FIX: Ishni boshlaganda jonli lokatsiya so'raladi
  try { 
    await ctx.reply('📍 **JONLI LOKATSIYA yuborish MAJBURIY:**\n\n🔹 **Attachment (📎)** tugmasini bosing\n🔹 **"Location"** ni tanlang\n🔹 **"Live Location"** ni tanlang\n🔹 **"Poka ya ne otklyuchu"** ni belgilang\n🔹 **"Send"** tugmasini bosing\n\n⚠️ **Ishni boshlash uchun jonli lokatsiya MAJBURIY!**', { 
      parse_mode: 'Markdown',
      reply_markup: {
        keyboard: [
          [ { text: '⬅️ Kuryer menyusi' } ]
        ],
        resize_keyboard: true
      }
    }); 
  } catch {}
  // Adminlarga statusni yuborish
  try {
    const SocketManager = require('../../../config/socketConfig');
    const branchId = user.branch || user.courierInfo?.branch;
    if (branchId) {
      SocketManager.emitCourierLocationToBranch(branchId, {
        courierId: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        location: user.courierInfo?.currentLocation ? {
          latitude: user.courierInfo.currentLocation.latitude,
          longitude: user.courierInfo.currentLocation.longitude
        } : null,
        isOnline: true,
        isAvailable: Boolean(user.courierInfo?.isAvailable),
        updatedAt: user.courierInfo?.currentLocation?.updatedAt || new Date()
      });
    }
  } catch {}
}

// Ishni tugatish tugmasi
async function stopWork(ctx) {
  const { user, allowed } = await ensureCourierByTelegram(ctx);
  if (!allowed) return ctx.answerCbQuery('❌ Ruxsat yo\'q');
  user.courierInfo = user.courierInfo || {};
  user.courierInfo.isOnline = false;
  await user.save();
  try { await ctx.answerCbQuery('🛑 Ish tugatildi'); } catch {}
  try { await ctx.editMessageReplyMarkup(mainMenuKeyboard(user)); } catch {}
  try { await ctx.reply('🛑 **Ish tugatildi!**\n\n📍 **Jonli lokatsiya translatsiyasini to\'xtating:**\n1️⃣ Yuqoridagi xaritadan "Остановить трансляцию" ni bosing\n2️⃣ Yoki telefon sozlamalaridan lokatsiya ulashishni o\'chiring\n\n✅ Ish yakunlandi', { 
    parse_mode: 'Markdown',
    reply_markup: replyKeyboardMain() 
  }); } catch {}
  // Adminlarga statusni yuborish
  try {
    const SocketManager = require('../../../config/socketConfig');
    const branchId = user.branch || user.courierInfo?.branch;
    if (branchId) {
      SocketManager.emitCourierLocationToBranch(branchId, {
        courierId: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        location: user.courierInfo?.currentLocation ? {
          latitude: user.courierInfo.currentLocation.latitude,
          longitude: user.courierInfo.currentLocation.longitude
        } : null,
        isOnline: false,
        isAvailable: Boolean(user.courierInfo?.isAvailable),
        updatedAt: user.courierInfo?.currentLocation?.updatedAt || new Date()
      });
    }
  } catch {}
}

async function toggleAvailable(ctx) {
  const { user, allowed } = await ensureCourierByTelegram(ctx);
  if (!allowed) return ctx.answerCbQuery('❌ Ruxsat yo\'q');
  user.courierInfo = user.courierInfo || {};
  user.courierInfo.isAvailable = !user.courierInfo.isAvailable;
  await user.save();
  await ctx.answerCbQuery(user.courierInfo.isAvailable ? '✅ Mavjud' : '❌ Band');
  try { await ctx.editMessageReplyMarkup(mainMenuKeyboard(user)); } catch {}
}

async function activeOrders(ctx) {
  const { user, allowed } = await ensureCourierByTelegram(ctx);
  if (!allowed) return ctx.answerCbQuery('❌ Ruxsat yo\'q');
  let orders = [];
  try {
    orders = await Order.find({ 'deliveryInfo.courier': user._id, status: { $in: ['assigned', 'on_delivery'] } })
      .populate('user', 'firstName lastName phone')
      .sort({ createdAt: -1 }).limit(10);
  } catch {}
  if (!orders || orders.length === 0) return ctx.answerCbQuery('📭 Faol buyurtmalar yo\'q');
  
  let text = '📋 Faol buyurtmalar:\n\n';
  const keyboard = [];
  
  orders.forEach((order, index) => {
    const statusEmoji = {
      'assigned': '🆕',
      'on_delivery': '🚗'
    };
    
    const customerName = order.user ? `${order.user.firstName || ''} ${order.user.lastName || ''}`.trim() : 'Mijoz';
    const statusText = order.status === 'assigned' ? 'Tayinlangan' : 'Yetkazilmoqda';
    
    text += `${index + 1}. ${statusEmoji[order.status] || '📦'} #${order.orderId}\n`;
    text += `   👤 ${customerName}\n`;
    text += `   💰 ${Number(order.total || 0).toLocaleString()} so'm\n`;
    text += `   📊 ${statusText}\n\n`;
    
    // Har bir buyurtma uchun inline tugma
    keyboard.push([{ 
      text: `📋 #${order.orderId} - ${statusText}`, 
      callback_data: `courier_order_details_${order._id}` 
    }]);
  });
  
  keyboard.push([{ text: '🔙 Ortga', callback_data: 'courier_main_menu' }]);
  
  await ctx.reply(text, { reply_markup: { inline_keyboard: keyboard } });
  await ctx.answerCbQuery();
}

async function earnings(ctx) {
  const { user, allowed } = await ensureCourierByTelegram(ctx);
  if (!allowed) return ctx.answerCbQuery('❌ Ruxsat yo\'q');
  const startToday = new Date(); startToday.setHours(0,0,0,0);
  const deliveredToday = await Order.find({ 'deliveryInfo.courier': user._id, status: { $in: ['delivered', 'completed'] }, updatedAt: { $gte: startToday } }).select('total');
  const deliveredAll = await Order.find({ 'deliveryInfo.courier': user._id, status: { $in: ['delivered', 'completed'] } }).select('total');
  const sum = arr => arr.reduce((s,o)=> s + (o.total || 0), 0);
  const text = `💰 Daromad\n\nBugun: ${sum(deliveredToday).toLocaleString()} so'm\nJami: ${sum(deliveredAll).toLocaleString()} so'm`;
  await ctx.reply(text, { reply_markup: { inline_keyboard: [[{ text: '🔙 Ortga', callback_data: 'courier_main_menu' }]] } });
  await ctx.answerCbQuery();
}

async function profile(ctx) {
  const { user, allowed } = await ensureCourierByTelegram(ctx);
  if (!allowed) return ctx.answerCbQuery('❌ Ruxsat yo\'q');
  const startToday = new Date(); startToday.setHours(0,0,0,0);
  const [todayCount, totalCount] = await Promise.all([
    Order.countDocuments({ 'deliveryInfo.courier': user._id, status: { $in: ['delivered', 'completed'] }, updatedAt: { $gte: startToday } }),
    Order.countDocuments({ 'deliveryInfo.courier': user._id, status: { $in: ['delivered', 'completed'] } }),
  ]);
  const recent = await Order.find({ 'deliveryInfo.courier': user._id, status: { $in: ['delivered', 'completed'] } }).select('orderId total updatedAt').sort({ updatedAt: -1 }).limit(10);
  const rating = user.courierInfo?.rating != null ? Number(user.courierInfo.rating).toFixed(1) : '—';
  let text = `👤 Profil\n\n⭐ Reyting: ${rating}\n📦 Bugun: ${todayCount} ta\n📦 Jami: ${totalCount} ta\n\nOxirgi 10 buyurtma:\n`;
  if (recent.length === 0) text += '—\n';
  else recent.forEach((o, i) => { text += `${i+1}. #${o.orderId} • ${Number(o.total||0).toLocaleString()} so'm\n`; });
  await ctx.reply(text, { reply_markup: { inline_keyboard: [[{ text: '🔙 Ortga', callback_data: 'courier_main_menu' }]] } });
  await ctx.answerCbQuery();
}

// Buyurtma qabul qilish
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
    
    // 🔧 FIX: Buyurtma statusini tekshirish - assigned bo'lishi kerak
    if (order.status !== 'assigned') {
      await ctx.answerCbQuery('❌ Buyurtma allaqachon boshqa holatda');
      return;
    }
    
    // Kuryer allaqachon tayinlanganmi tekshirish
    if (order.deliveryInfo?.courier?.toString() !== user._id.toString()) {
      await ctx.answerCbQuery('❌ Bu buyurtma sizga tayinlanmagan');
      return;
    }
    
    // 🔧 FIX: Use centralized status service
    const OrderStatusService = require('../../../services/orderStatusService');
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
    
    // 🔧 FIX: Adminlarga real-time xabar yuborish
    try {
      const SocketManager = require('../../../config/socketConfig');
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

// Yo'lda ekanligini belgilash
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
    
    // 🔧 FIX: Status on_delivery bo'lishi kerak
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
    
    // 🔧 FIX: Adminlarga real-time xabar
    try {
      const SocketManager = require('../../../config/socketConfig');
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

// Yetkazib berildi
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
    
    // 🔧 FIX: Status on_delivery bo'lishi kerak
    if (order.status !== 'on_delivery') {
      await ctx.answerCbQuery('❌ Buyurtma hali qabul qilinmagan');
      return;
    }
    
    // 🔧 FIX: Use centralized status service
    const OrderStatusService = require('../../../services/orderStatusService');
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
    
    // 🔧 FIX: Adminlarga real-time xabar
    try {
      const SocketManager = require('../../../config/socketConfig');
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

// Buyurtmani bekor qilish
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
    
    // 🔧 FIX: Status assigned yoki on_delivery bo'lishi kerak
    if (order.status !== 'assigned' && order.status !== 'on_delivery') {
      await ctx.answerCbQuery('❌ Buyurtma hali qabul qilinmagan');
      return;
    }
    
    // Buyurtma statusini qaytarish
    order.status = 'assigned';
    order.deliveryInfo.courier = null;
    
    // 🔧 FIX: Status history ga qo'shish
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
    
    // 🔧 FIX: Adminlarga real-time xabar
    try {
      const SocketManager = require('../../../config/socketConfig');
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

// Buyurtma tafsilotlari
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
        { text: '✅ Qabul qildim', callback_data: `courier_accept_${orderId}` }
      ]);
    } else if (order.status === 'on_delivery') {
      keyboard.push([
        { text: '🚗 Yo\'ldaman', callback_data: `courier_on_way_${orderId}` },
        { text: '✅ Yetkazdim', callback_data: `courier_delivered_${orderId}` }
      ]);
    }
    
    keyboard.push([
      { text: '❌ Bekor qilish', callback_data: `courier_cancel_${orderId}` }
    ]);
    keyboard.push([
      { text: '🔙 Faol buyurtmalar', callback_data: 'courier_active_orders' }
    ]);
    
    await ctx.reply(text, { reply_markup: { inline_keyboard: keyboard } });
    await ctx.answerCbQuery();
    
  } catch (error) {
    console.error('Order details error:', error);
    await ctx.answerCbQuery('❌ Xatolik yuz berdi');
  }
}

module.exports = { 
  start, 
  toggleShift, 
  toggleAvailable, 
  activeOrders, 
  earnings, 
  profile, 
  startWork, 
  stopWork,
  acceptOrder,
  onWay,
  delivered,
  cancelOrder,
  orderDetails
};

function normalizePhone(p) {
  if (!p) return '';
  const digits = String(p).replace(/\D+/g, '');
  if (digits.startsWith('998')) return `+${digits}`;
  if (digits.length === 9) return `+998${digits}`;
  if (digits.startsWith('0') && digits.length === 10) return `+998${digits.slice(1)}`;
  if (digits.startsWith('998') && digits.length === 12) return `+${digits}`;
  return `+${digits}`;
}

async function bindByPhone(ctx, phoneRaw) {
  const phone = normalizePhone(phoneRaw);
  const courier = await User.findOne({ role: 'courier', phone });
  if (!courier) {
    await ctx.reply('❌ Ushbu telefon raqam bo\'yicha kuryer topilmadi. Admin bilan bog\'laning.');
    return false;
  }
  courier.telegramId = ctx.from?.id;
  courier.courierInfo = courier.courierInfo || { isOnline: false, isAvailable: true };
  await courier.save();
  try { ctx.session.courierBind = false; } catch {}
  await ctx.reply('✅ Profil bog\'landi!', { reply_markup: { remove_keyboard: true } });
  await ctx.reply(buildMainText(courier), { reply_markup: mainMenuKeyboard(courier) });
  return true;
}

module.exports.bindByPhone = bindByPhone;


