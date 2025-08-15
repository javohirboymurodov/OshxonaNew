// Courier interface handlers
module.exports = function registerCourier(bot) {
  const { User, Order } = require('../models');
  let geoService;
  try { geoService = require('../services/geoService'); } catch {}

  const isCourier = async (telegramId) => {
    const allowList = (process.env.COURIER_IDS || '').split(',').map((s) => parseInt(s.trim(), 10)).filter(Boolean);
    const user = await User.findOne({ telegramId });
    return { user, allowed: user?.role === 'courier' || allowList.includes(telegramId) };
  };

  const renderMenu = async (ctx, user) => {
    const courierMenu = `\n🚚 **Haydovchi paneli**\n\n👋 Salom, ${user.firstName || 'Courier'}!\n\nJoriy holat: ${user.courierInfo?.isOnline ? '🟢 Online' : '🔴 Offline'}\nMavjudlik: ${user.courierInfo?.isAvailable ? '✅ Mavjud' : '❌ Band'}\n`;
    const keyboard = {
      inline_keyboard: [
        [ { text: user.courierInfo?.isOnline ? '🔴 Offline' : '🟢 Online', callback_data: 'courier_toggle_status' } ],
        [ { text: user.courierInfo?.isAvailable ? '❌ Band qilish' : '✅ Mavjud qilish', callback_data: 'courier_toggle_availability' } ],
        [ { text: '📍 Joylashuvni yuborish', callback_data: 'courier_send_location' } ],
        [ { text: '📋 Faol buyurtmalar', callback_data: 'courier_active_orders' } ],
        [ { text: '🔙 Asosiy menyu', callback_data: 'back_to_main' } ],
      ]
    };
    await ctx.reply(courierMenu, { parse_mode: 'Markdown', reply_markup: keyboard });
  };

  bot.command('courier', async (ctx) => {
    try {
      const { user, allowed } = await isCourier(ctx.from.id);
      if (!allowed) return await ctx.reply('❌ Sizda courier huquqi yo\'q!');
      // If user exists but not courier, let them preview but toggle actions may set flags
      user.courierInfo = user.courierInfo || { isOnline: false, isAvailable: true, rating: 5.0, totalDeliveries: 0 };
      await renderMenu(ctx, user);
    } catch (e) {
      await ctx.reply('❌ Xatolik yuz berdi!');
    }
  });

  bot.action('courier_toggle_status', async (ctx) => {
    try {
      const { user, allowed } = await isCourier(ctx.from.id);
      if (!allowed) return await ctx.answerCbQuery('❌ Ruxsat yo\'q');
      user.courierInfo = user.courierInfo || {};
      user.courierInfo.isOnline = !user.courierInfo.isOnline;
      await user.save();
      await ctx.answerCbQuery(user.courierInfo.isOnline ? '✅ Online' : '❌ Offline');
    } catch (e) {
      await ctx.answerCbQuery('❌ Xatolik');
    }
  });

  bot.action('courier_toggle_availability', async (ctx) => {
    try {
      const { user, allowed } = await isCourier(ctx.from.id);
      if (!allowed) return await ctx.answerCbQuery('❌ Ruxsat yo\'q');
      user.courierInfo = user.courierInfo || {};
      user.courierInfo.isAvailable = !user.courierInfo.isAvailable;
      await user.save();
      await ctx.answerCbQuery(user.courierInfo.isAvailable ? '✅ Mavjud' : '❌ Band');
    } catch (e) {
      await ctx.answerCbQuery('❌ Xatolik');
    }
  });

  bot.action('courier_send_location', async (ctx) => {
    try {
      const { allowed } = await isCourier(ctx.from.id);
      if (!allowed) return await ctx.answerCbQuery('❌ Ruxsat yo\'q');
      await ctx.reply('📍 Joylashuvni yuboring:', {
        reply_markup: {
          keyboard: [[{ text: '📍 Joylashuvni ulashish', request_location: true }]],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      });
      await ctx.answerCbQuery();
    } catch (e) {
      await ctx.answerCbQuery('❌ Xatolik');
    }
  });

  bot.action('courier_active_orders', async (ctx) => {
    try {
      const { user, allowed } = await isCourier(ctx.from.id);
      if (!allowed) return await ctx.answerCbQuery('❌ Ruxsat yo\'q');
      // If schema has courier field use it; else show placeholder
      let orders = [];
      try {
        orders = await Order.find({ courier: user._id, status: { $in: ['preparing', 'delivering'] } }).sort({ createdAt: -1 });
      } catch {}
      if (!orders || orders.length === 0) {
        return await ctx.answerCbQuery('📭 Faol buyurtmalar yo\'q');
      }
      let text = '📋 Faol buyurtmalar:\n\n';
      orders.forEach((o, i) => { text += `${i + 1}. #${o.orderId} – ${o.status}\n`; });
      await ctx.reply(text);
      await ctx.answerCbQuery();
    } catch (e) {
      await ctx.answerCbQuery('❌ Xatolik');
    }
  });

  function buildOrderInfoText(prefix, order, customer) {
    const idLine = `#${order.orderId}`;
    const name = `${customer?.firstName || ''} ${customer?.lastName || ''}`.trim() || (order.customerInfo?.name || 'Mijoz');
    const phone = customer?.phone || order.customerInfo?.phone || '';
    let locationLines = '';
    try {
      const loc = order?.deliveryInfo?.location;
      if (loc?.latitude && loc?.longitude) {
        const link = geoService?.generateMapLink
          ? geoService.generateMapLink(loc.latitude, loc.longitude)
          : `https://maps.google.com/?q=${loc.latitude},${loc.longitude}`;
        locationLines = `\n📍 Manzil: ${link}`;
      }
    } catch {}
    return `${prefix} ${idLine}\n👤 ${name}${phone ? `\n📞 ${phone}` : ''}${locationLines}`;
  }

  // Accept assigned order
  bot.action(/^courier_accept_([0-9a-fA-F]{24})$/, async (ctx) => {
    try {
      const { user, allowed } = await isCourier(ctx.from.id);
      if (!allowed) return await ctx.answerCbQuery('❌ Ruxsat yo\'q');
      const orderId = ctx.match[1];
      const order = await Order.findById(orderId).populate('user', 'firstName lastName phone');
      if (!order) return await ctx.answerCbQuery('❌ Buyurtma topilmadi');
      order.deliveryInfo = order.deliveryInfo || {};
      order.deliveryInfo.courier = user._id;
      order.status = 'on_delivery';
      await order.save();
      const text = buildOrderInfoText('✅ Buyurtma qabul qilindi:', order, order.user);
      const keyboard = { inline_keyboard: [[{ text: "🚗 Yo'ldaman", callback_data: `courier_onway_${order._id}` }],[{ text: '📦 Yetkazdim', callback_data: `courier_delivered_${order._id}` }]] };
      try { await ctx.editMessageText(text, { disable_web_page_preview: true, reply_markup: keyboard }); } catch { await ctx.reply(text, { disable_web_page_preview: true, reply_markup: keyboard }); }
    } catch (e) {
      await ctx.answerCbQuery('❌ Xatolik');
    }
  });

  // Mark as on the way
  bot.action(/^courier_onway_([0-9a-fA-F]{24})$/, async (ctx) => {
    try {
      const { allowed } = await isCourier(ctx.from.id);
      if (!allowed) return await ctx.answerCbQuery('❌ Ruxsat yo\'q');
      const orderId = ctx.match[1];
      const order = await Order.findByIdAndUpdate(orderId, { $set: { status: 'on_delivery' } }, { new: true }).populate('user', 'firstName lastName phone');
      if (!order) return await ctx.answerCbQuery('❌ Buyurtma topilmadi');
      const text = buildOrderInfoText("🚗 Yo'ldaman:", order, order.user);
      const keyboard = { inline_keyboard: [[{ text: '📦 Yetkazdim', callback_data: `courier_delivered_${order._id}` }]] };
      try { await ctx.editMessageText(text, { disable_web_page_preview: true, reply_markup: keyboard }); } catch { await ctx.reply(text, { disable_web_page_preview: true, reply_markup: keyboard }); }
    } catch (e) {
      await ctx.answerCbQuery('❌ Xatolik');
    }
  });

  // Mark as delivered
  bot.action(/^courier_delivered_([0-9a-fA-F]{24})$/, async (ctx) => {
    try {
      const { allowed } = await isCourier(ctx.from.id);
      if (!allowed) return await ctx.answerCbQuery('❌ Ruxsat yo\'q');
      const orderId = ctx.match[1];
      const order = await Order.findByIdAndUpdate(orderId, { $set: { status: 'delivered' } }, { new: true }).populate('user', 'firstName lastName phone');
      if (!order) return await ctx.answerCbQuery('❌ Buyurtma topilmadi');
      const text = buildOrderInfoText('✅ Yetkazildi:', order, order.user);
      try { await ctx.editMessageText(text, { disable_web_page_preview: true }); } catch { await ctx.reply(text, { disable_web_page_preview: true }); }
    } catch (e) {
      await ctx.answerCbQuery('❌ Xatolik');
    }
  });
};


