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
 * Faol buyurtmalarni ko'rsatish
 * @param {Object} ctx - Telegraf context
 */
async function activeOrders(ctx) {
  const { user, allowed } = await ensureCourierByTelegram(ctx);
  if (!allowed) return ctx.answerCbQuery('❌ Ruxsat yo\'q');
  
  let orders = [];
  try {
    orders = await Order.find({ 
      'deliveryInfo.courier': user._id, 
      status: { $in: ['assigned', 'on_delivery'] } 
    })
      .populate('user', 'firstName lastName phone')
      .sort({ createdAt: -1 })
      .limit(10);
  } catch {}
  
  if (!orders || orders.length === 0) {
    return ctx.answerCbQuery('📭 Faol buyurtmalar yo\'q');
  }
  
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
  const { user, allowed } = await ensureCourierByTelegram(ctx);
  if (!allowed) return ctx.answerCbQuery('❌ Ruxsat yo\'q');
  
  const startToday = new Date(); 
  startToday.setHours(0,0,0,0);
  
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
  
  const recent = await Order.find({ 
    'deliveryInfo.courier': user._id, 
    status: { $in: ['delivered', 'completed'] } 
  })
    .select('orderId total updatedAt')
    .sort({ updatedAt: -1 })
    .limit(10);
  
  const rating = user.courierInfo?.rating != null ? Number(user.courierInfo.rating).toFixed(1) : '—';
  
  let text = `👤 Profil\n\n⭐ Reyting: ${rating}\n📦 Bugun: ${todayCount} ta\n📦 Jami: ${totalCount} ta\n\nOxirgi 10 buyurtma:\n`;
  
  if (recent.length === 0) {
    text += '—\n';
  } else {
    recent.forEach((o, i) => { 
      text += `${i+1}. #${o.orderId} • ${Number(o.total||0).toLocaleString()} so'm\n`; 
    });
  }
  
  await ctx.reply(text, { 
    reply_markup: { 
      inline_keyboard: [[{ text: '🔙 Ortga', callback_data: 'courier_main_menu' }]] 
    } 
  });
  await ctx.answerCbQuery();
}

module.exports = {
  ensureCourierByTelegram, // Helper function
  activeOrders,
  earnings,
  profile
};