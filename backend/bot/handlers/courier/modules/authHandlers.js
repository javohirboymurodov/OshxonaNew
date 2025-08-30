const { User } = require('../../../../models');
const { buildMainText, mainMenuKeyboard, replyKeyboardMain } = require('../../../courier/keyboards');

/**
 * Courier Authentication Handlers
 * Kuryer autentifikatsiya handlerlari
 */

/**
 * Telegram orqali kuryerni tekshirish
 * @param {Object} ctx - Telegraf context
 * @returns {Object} - user va allowed holati
 */
async function ensureCourierByTelegram(ctx) {
  const telegramId = ctx.from?.id;
  let user = await User.findOne({ telegramId });
  if (!user) return { user: null, allowed: false };
  return { user, allowed: user.role === 'courier' };
}

/**
 * Telefon raqamini formatlash
 * @param {string} p - telefon raqami
 * @returns {string} - formatlangan telefon
 */
function normalizePhone(p) {
  if (!p) return '';
  const digits = String(p).replace(/\D+/g, '');
  if (digits.startsWith('998')) return `+${digits}`;
  if (digits.length === 9) return `+998${digits}`;
  if (digits.startsWith('0') && digits.length === 10) return `+998${digits.slice(1)}`;
  if (digits.startsWith('998') && digits.length === 12) return `+${digits}`;
  return `+${digits}`;
}

/**
 * Telefon orqali kuryerni bog'lash
 * @param {Object} ctx - Telegraf context
 * @param {string} phoneRaw - telefon raqami
 * @returns {boolean} - bog'lash muvaffaqiyati
 */
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

/**
 * Kuryer bot ni boshlash
 * @param {Object} ctx - Telegraf context
 */
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
  // Start'dan keyin lokatsiya so'ralmasin, shunchaki profil ko'rsatilsin
  await ctx.reply(buildMainText(user), { reply_markup: mainMenuKeyboard(user) });
  // Reply keyboard ham qo'shamiz kuryer menyusiga qaytish uchun
  try {
    await ctx.reply('Kuryer panelidan foydalaning:', { reply_markup: replyKeyboardMain() });
  } catch {}
}

module.exports = {
  ensureCourierByTelegram,
  normalizePhone,
  bindByPhone,
  start
};