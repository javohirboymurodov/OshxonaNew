const { User, Order } = require('../../models');
const { buildMainText, mainMenuKeyboard, replyKeyboard, replyKeyboardMain } = require('./keyboards');

async function ensureCourierByTelegram(ctx) {
  const telegramId = ctx.from?.id;
  let user = await User.findOne({ telegramId });
  if (!user) return { user: null, allowed: false };
  return { user, allowed: user.role === 'courier' };
}

async function start(ctx) {
  const { user, allowed } = await ensureCourierByTelegram(ctx);
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
  // Inline + Reply keyboard: ishni boshlashda lokatsiya so'raladi, keyin Asosiy menyu reply qoladi
  await ctx.reply(buildMainText(user), { reply_markup: mainMenuKeyboard(user) });
  const hasLocation = Boolean(user?.courierInfo?.currentLocation?.latitude) && Boolean(user?.courierInfo?.currentLocation?.longitude);
  try {
    await ctx.reply('📍 Joylashuvni yuboring:', { reply_markup: hasLocation ? replyKeyboardMain() : replyKeyboard() });
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
      await ctx.reply('📍 Live lokatsiyani yoqing: pastdagi “📍 Joylashuvni yuborish” tugmasidan 15 daqiqa davomida jonli joylashuvni ulashing. Biz lokatsiyani vaqti-vaqti bilan yangilab boramiz.', { reply_markup: replyKeyboard() });
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
  try { await ctx.answerCbQuery('✅ Ish boshlandi'); } catch {}
  try { await ctx.editMessageReplyMarkup(mainMenuKeyboard(user)); } catch {}
  try { await ctx.reply('📍 Live lokatsiyani yoqing va ulashishni to\'xtatmaguncha ish holati davom etadi.', { reply_markup: replyKeyboard() }); } catch {}
  // Adminlarga statusni yuborish
  try {
    const SocketManager = require('../../config/socketConfig');
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
  try { await ctx.reply('🔕 Lokatsiya ulashishni to\'xtating.', { reply_markup: replyKeyboardMain() }); } catch {}
  // Adminlarga statusni yuborish
  try {
    const SocketManager = require('../../config/socketConfig');
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
    orders = await Order.find({ 'deliveryInfo.courier': user._id, status: { $in: ['assigned', 'on_delivery'] } }).sort({ createdAt: -1 }).limit(10);
  } catch {}
  if (!orders || orders.length === 0) return ctx.answerCbQuery('📭 Faol buyurtmalar yo\'q');
  let text = '📋 Faol buyurtmalar:\n\n';
  orders.forEach((o, i) => { text += `${i + 1}. #${o.orderId} – ${o.status}\n`; });
  await ctx.reply(text, { reply_markup: { inline_keyboard: [[{ text: '🔙 Ortga', callback_data: 'courier_back' }]] } });
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
  await ctx.reply(text, { reply_markup: { inline_keyboard: [[{ text: '🔙 Ortga', callback_data: 'courier_back' }]] } });
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
  await ctx.reply(text, { reply_markup: { inline_keyboard: [[{ text: '🔙 Ortga', callback_data: 'courier_back' }]] } });
  await ctx.answerCbQuery();
}

module.exports = { start, toggleShift, toggleAvailable, activeOrders, earnings, profile };

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


