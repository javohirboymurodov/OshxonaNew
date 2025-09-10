const { User, Order } = require('../../../../models');

/**
 * Courier Profile Handlers
 * Kuryer profil handlerlari
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
 * Faol buyurtmalarni ko'rsatish (yaxshilangan versiya)
 * @param {Object} ctx - Telegraf context
 * @param {number} page - Sahifa raqami
 */
async function activeOrders(ctx, page = 1) {
  const { user, allowed } = await ensureCourierByTelegram(ctx);
  if (!allowed) return ctx.answerCbQuery('❌ Ruxsat yo\'q');
  
  const LIMIT = 5;
  const skip = (page - 1) * LIMIT;
  
  let orders = [];
  let totalCount = 0;
  
  try {
    // Barcha assigned va on_delivery buyurtmalarni topamiz
    const query = { 
      'deliveryInfo.courier': user._id, 
      status: { $in: ['assigned', 'on_delivery'] } 
    };
    
    [orders, totalCount] = await Promise.all([
      Order.find(query)
        .populate('user', 'firstName lastName phone')
        .populate('branch', 'name title')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(LIMIT),
      Order.countDocuments(query)
    ]);
  } catch (error) {
    console.error('❌ Active orders fetch error:', error);
  }
  
  if (!orders || orders.length === 0) {
    if (page === 1) {
      return ctx.answerCbQuery('📭 Faol buyurtmalar yo\'q');
    } else {
      return ctx.answerCbQuery('❌ Bu sahifada buyurtma yo\'q');
    }
  }
  
  const totalPages = Math.ceil(totalCount / LIMIT);
  let text = `📋 **Faol buyurtmalar**\n\n`;
  
  const keyboard = [];
  
  for (const order of orders) {
    const statusEmoji = {
      'assigned': '🆕',
      'on_delivery': '🚗'
    };
    
    const customerName = order.user ? `${order.user.firstName || ''} ${order.user.lastName || ''}`.trim() : 'Mijoz';
    const statusText = order.status === 'assigned' ? 'Tayinlangan' : 'Yo\'lda';
    const branchName = order.branch?.name || order.branch?.title || 'N/A';
    const activeOrderCreated = order.createdAt ? new Date(order.createdAt).toLocaleString('uz-UZ') : 'N/A';
    
    text += `${statusEmoji[order.status] || '📦'} **#${order.orderId}**\n`;
    text += `👤 **Mijoz:** ${customerName}\n`;
    
    // Customer telefon raqami
    if (order.user?.phone) {
      text += `📞 **Telefon:** ${order.user.phone}\n`;
    }
    
    // Delivery manzil
    if (order.deliveryInfo?.address) {
      const address = order.deliveryInfo.address.length > 40 
        ? order.deliveryInfo.address.substring(0, 40) + '...'
        : order.deliveryInfo.address;
      text += `📍 **Manzil:** ${address}\n`;
    }
    
    text += `💰 **Summa:** ${Number(order.total || 0).toLocaleString()} so'm\n`;
    text += `🏪 **Filial:** ${branchName}\n`;
    text += `📅 **Sana:** ${activeOrderCreated}\n`;
    text += `📊 **Holat:** ${statusText}\n\n`;
    
    // Order actions tugmalari
    const actionButtons = [];
    
    if (order.status === 'assigned') {
      actionButtons.push(
        { text: '🚗 Yo\'ldaman', callback_data: `courier_on_way_${order._id}` }
      );
      actionButtons.push(
        { text: '❌ Rad etish', callback_data: `courier_reject_${order._id}` }
      );
    } else if (order.status === 'on_delivery') {
      actionButtons.push(
        { text: '✅ Yetkazdim', callback_data: `courier_delivered_${order._id}` }
      );
    }
    
    // Status va sana tugmasi
    const activeOrderDate = order.createdAt ? new Date(order.createdAt).toLocaleDateString('uz-UZ') : 'N/A';
    const buttonText = `${statusText} • ${activeOrderDate}`;
    actionButtons.push(
      { text: buttonText, callback_data: `courier_order_details_${order._id}` }
    );
    
    keyboard.push(actionButtons);
  }
  
  // Navigation tugmalari
  const navButtons = [];
  
  if (page > 1) {
    navButtons.push({ text: '⬅️', callback_data: `courier_active_orders_page_${page - 1}` });
  }
  
  // Pagination raqami
  if (totalPages > 1) {
    navButtons.push({ text: `${page}/${totalPages}`, callback_data: 'noop' });
  }
  
  if (page < totalPages) {
    navButtons.push({ text: '➡️', callback_data: `courier_active_orders_page_${page + 1}` });
  }
  
  if (navButtons.length > 0) {
    keyboard.push(navButtons);
  }
  
  // Orqaga tugmasi
  keyboard.push([{ text: '🔙 Ortga', callback_data: 'courier_main_menu' }]);
  
  try {
    if (ctx.callbackQuery) {
      await ctx.editMessageText(text, { 
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard } 
      });
    } else {
      await ctx.reply(text, { 
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard } 
      });
    }
    
    if (ctx.answerCbQuery) await ctx.answerCbQuery();
  } catch (editError) {
    console.error('❌ Edit message error:', editError);
    // Agar edit ishlamasa, yangi xabar yuboramiz
    await ctx.reply(text, { 
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: keyboard } 
    });
    if (ctx.answerCbQuery) await ctx.answerCbQuery();
  }
}

/**
 * Barcha buyurtmalarni ko'rsatish (pagination bilan)
 * @param {Object} ctx - Telegraf context
 * @param {number} page - Sahifa raqami
 */
async function allOrders(ctx, page = 1) {
  const { user, allowed } = await ensureCourierByTelegram(ctx);
  if (!allowed) return ctx.answerCbQuery('❌ Ruxsat yo\'q');
  
  const LIMIT = 5;
  const skip = (page - 1) * LIMIT;
  
  let orders = [];
  let totalCount = 0;
  
  try {
    // Barcha buyurtmalarni topamiz (assigned, on_delivery, delivered, completed)
    const query = { 
      'deliveryInfo.courier': user._id
    };
    
    [orders, totalCount] = await Promise.all([
      Order.find(query)
        .populate('user', 'firstName lastName phone')
        .populate('branch', 'name title')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(LIMIT),
      Order.countDocuments(query)
    ]);
  } catch (error) {
    console.error('❌ All orders fetch error:', error);
  }
  
  if (!orders || orders.length === 0) {
    if (page === 1) {
      return ctx.answerCbQuery('📭 Buyurtmalar yo\'q');
    } else {
      return ctx.answerCbQuery('❌ Bu sahifada buyurtma yo\'q');
    }
  }
  
  const totalPages = Math.ceil(totalCount / LIMIT);
  let text = `📋 **Buyurtmalar**\n\n`;
  
  const keyboard = [];
  
  for (const order of orders) {
    const statusEmoji = {
      'assigned': '🆕',
      'on_delivery': '🚗',
      'delivered': '✅',
      'completed': '🎉',
      'cancelled': '❌'
    };
    
    const statusText = {
      'assigned': 'Tayinlangan',
      'on_delivery': 'Yo\'lda',
      'delivered': 'Yetkazildi', 
      'completed': 'Yakunlandi',
      'cancelled': 'Bekor qilindi'
    };
    
    const customerName = order.user ? `${order.user.firstName || ''} ${order.user.lastName || ''}`.trim() : 'Mijoz';
    const branchName = order.branch?.name || order.branch?.title || 'N/A';
    const allOrderCreated = order.createdAt ? new Date(order.createdAt).toLocaleDateString('uz-UZ') : 'N/A';
    
    text += `${statusEmoji[order.status] || '📦'} **#${order.orderId}**\n`;
    text += `👤 **Mijoz:** ${customerName}\n`;
    text += `💰 **Summa:** ${Number(order.total || 0).toLocaleString()} so'm\n`;
    text += `🏪 **Filial:** ${branchName}\n`;
    text += `📅 **Sana:** ${allOrderCreated}\n`;
    text += `📊 **Holat:** ${statusText[order.status] || order.status}\n\n`;
    
    // Order actions tugmalari (faqat faol buyurtmalar uchun)
    const actionButtons = [];
    
    if (order.status === 'assigned') {
      actionButtons.push({ text: '🚗 Yo\'ldaman', callback_data: `courier_on_way_${order._id}` });
      actionButtons.push({ text: '❌ Rad etish', callback_data: `courier_reject_${order._id}` });
    } else if (order.status === 'on_delivery') {
      actionButtons.push({ text: '✅ Yetkazdim', callback_data: `courier_delivered_${order._id}` });
    }
    
    // Status va sana tugmasi
    const buttonOrderDate = order.createdAt ? new Date(order.createdAt).toLocaleDateString('uz-UZ') : 'N/A';
    const buttonText = `${statusText[order.status] || order.status} • ${buttonOrderDate}`;
    actionButtons.push({ text: buttonText, callback_data: `courier_order_details_${order._id}` });
    
    keyboard.push(actionButtons);
  }
  
  // Navigation tugmalari
  const navButtons = [];
  
  if (page > 1) {
    navButtons.push({ text: '⬅️', callback_data: `courier_all_orders_page_${page - 1}` });
  }
  
  // Pagination raqami
  if (totalPages > 1) {
    navButtons.push({ text: `${page}/${totalPages}`, callback_data: 'noop' });
  }
  
  if (page < totalPages) {
    navButtons.push({ text: '➡️', callback_data: `courier_all_orders_page_${page + 1}` });
  }
  
  if (navButtons.length > 0) {
    keyboard.push(navButtons);
  }
  
  // Orqaga tugmasi
  keyboard.push([{ text: '🔙 Ortga', callback_data: 'courier_main_menu' }]);
  
  try {
    if (ctx.callbackQuery) {
      await ctx.editMessageText(text, { 
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard } 
      });
    } else {
      await ctx.reply(text, { 
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard } 
      });
    }
    
    if (ctx.answerCbQuery) await ctx.answerCbQuery();
  } catch (editError) {
    console.error('❌ Edit message error:', editError);
    // Agar edit ishlamasa, yangi xabar yuboramiz
    await ctx.reply(text, { 
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: keyboard } 
    });
    if (ctx.answerCbQuery) await ctx.answerCbQuery();
  }
}

/**
 * Kuryer daromadini ko'rsatish
 * @param {Object} ctx - Telegraf context
 */
async function earnings(ctx) {
  const { user, allowed } = await ensureCourierByTelegram(ctx);
  if (!allowed) return ctx.answerCbQuery('❌ Ruxsat yo\'q');
  
  const startToday = new Date(); 
  startToday.setHours(0,0,0,0);
  
  const deliveredToday = await Order.find({ 
    'deliveryInfo.courier': user._id, 
    status: { $in: ['delivered', 'completed'] }, 
    updatedAt: { $gte: startToday } 
  }).select('total');
  
  const deliveredAll = await Order.find({ 
    'deliveryInfo.courier': user._id, 
    status: { $in: ['delivered', 'completed'] } 
  }).select('total');
  
  const sum = arr => arr.reduce((s,o)=> s + (o.total || 0), 0);
  const text = `💰 Daromad\n\nBugun: ${sum(deliveredToday).toLocaleString()} so'm\nJami: ${sum(deliveredAll).toLocaleString()} so'm`;
  
  await ctx.reply(text, { 
    reply_markup: { 
      inline_keyboard: [[{ text: '🔙 Ortga', callback_data: 'courier_main_menu' }]] 
    } 
  });
  await ctx.answerCbQuery();
}

/**
 * Kuryer profilini ko'rsatish
 * @param {Object} ctx - Telegraf context
 */
async function profile(ctx) {
  console.log('🔍 Profile function called for user:', ctx.from?.id);
  
  try {
    const { user, allowed } = await ensureCourierByTelegram(ctx);
    console.log('🔍 Profile auth result:', { userId: user?._id, allowed });
    
    if (!allowed) {
      console.log('❌ Profile: User not allowed');
      return ctx.answerCbQuery('❌ Ruxsat yo\'q');
    }
  
    const startToday = new Date(); 
    startToday.setHours(0,0,0,0);
    
    console.log('🔍 Profile: Fetching statistics...');
    
    const [todayCount, totalCount] = await Promise.all([
      Order.countDocuments({ 
        'deliveryInfo.courier': user._id, 
        status: { $in: ['delivered', 'completed'] }, 
        updatedAt: { $gte: startToday } 
      }),
      Order.countDocuments({ 
        'deliveryInfo.courier': user._id, 
        status: { $in: ['delivered', 'completed'] } 
      }),
    ]);
    
    console.log('🔍 Profile: Statistics:', { todayCount, totalCount });
    
    const recent = await Order.find({ 
      'deliveryInfo.courier': user._id, 
      status: { $in: ['delivered', 'completed'] } 
    })
      .select('orderId total updatedAt')
      .sort({ updatedAt: -1 })
      .limit(10);
    
    console.log('🔍 Profile: Recent orders count:', recent.length);
    
    const rating = user.courierInfo?.rating != null ? Number(user.courierInfo.rating).toFixed(1) : '—';
    
    let text = `👤 Profil\n\n⭐ Reyting: ${rating}\n📦 Bugun: ${todayCount} ta\n📦 Jami: ${totalCount} ta`;
    
    console.log('🔍 Profile: Sending reply...');
    
    await ctx.reply(text, { 
      reply_markup: { 
        inline_keyboard: [[{ text: '🔙 Ortga', callback_data: 'courier_main_menu' }]] 
      } 
    });
    
    if (ctx.answerCbQuery) await ctx.answerCbQuery();
    console.log('✅ Profile: Reply sent successfully');
    
  } catch (error) {
    console.error('❌ Profile function error:', error);
    await ctx.reply('❌ Profil ma\'lumotlarini yuklashda xatolik yuz berdi!');
    if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik yuz berdi');
  }
}

module.exports = {
  ensureCourierByTelegram, // Helper function
  activeOrders,
  allOrders,
  earnings,
  profile
};