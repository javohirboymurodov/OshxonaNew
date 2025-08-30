const { User } = require('../../../../models');
const { mainMenuKeyboard, replyKeyboard, replyKeyboardMain } = require('../../../courier/keyboards');
const SocketManager = require('../../../../config/socketConfig');

/**
 * Courier Shift Handlers
 * Kuryer ish vaqti handlerlari
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
 * Ish vaqtini o'zgartirish (online/offline)
 * @param {Object} ctx - Telegraf context
 */
async function toggleShift(ctx) {
  const { user, allowed } = await ensureCourierByTelegram(ctx);
  if (!allowed) return ctx.answerCbQuery('❌ Ruxsat yo\'q');
  
  user.courierInfo = user.courierInfo || {};
  user.courierInfo.isOnline = !user.courierInfo.isOnline;
  await user.save();
  await ctx.answerCbQuery(user.courierInfo.isOnline ? '✅ Online' : '❌ Offline');
  
  try { 
    await ctx.editMessageReplyMarkup(mainMenuKeyboard(user)); 
  } catch {}
  
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

/**
 * Ishni boshlash
 * @param {Object} ctx - Telegraf context
 */
async function startWork(ctx) {
  const { user, allowed } = await ensureCourierByTelegram(ctx);
  if (!allowed) return ctx.answerCbQuery('❌ Ruxsat yo\'q');
  
  user.courierInfo = user.courierInfo || {};
  user.courierInfo.isOnline = true;
  await user.save();
  
  try { 
    await ctx.answerCbQuery('✅ Ish boshlandi! Endi jonli lokatsiya yuboring.'); 
  } catch {}
  
  try { 
    await ctx.editMessageReplyMarkup(mainMenuKeyboard(user)); 
  } catch {}
  
  // Ishni boshlaganda jonli lokatsiya so'raladi
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

/**
 * Ishni tugatish
 * @param {Object} ctx - Telegraf context
 */
async function stopWork(ctx) {
  const { user, allowed } = await ensureCourierByTelegram(ctx);
  if (!allowed) return ctx.answerCbQuery('❌ Ruxsat yo\'q');
  
  user.courierInfo = user.courierInfo || {};
  user.courierInfo.isOnline = false;
  await user.save();
  
  try { 
    await ctx.answerCbQuery('🛑 Ish tugatildi'); 
  } catch {}
  
  try { 
    await ctx.editMessageReplyMarkup(mainMenuKeyboard(user)); 
  } catch {}
  
  try { 
    await ctx.reply('🛑 **Ish tugatildi!**\n\n📍 **Jonli lokatsiya translatsiyasini to\'xtating:**\n1️⃣ Yuqoridagi xaritadan "Остановить трансляцию" ni bosing\n2️⃣ Yoki telefon sozlamalaridan lokatsiya ulashishni o\'chiring\n\n✅ Ish yakunlandi', { 
      parse_mode: 'Markdown',
      reply_markup: replyKeyboardMain() 
    }); 
  } catch {}
  
  // Adminlarga statusni yuborish
  try {
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

/**
 * Mavjudlikni o'zgartirish (available/busy)
 * @param {Object} ctx - Telegraf context
 */
async function toggleAvailable(ctx) {
  const { user, allowed } = await ensureCourierByTelegram(ctx);
  if (!allowed) return ctx.answerCbQuery('❌ Ruxsat yo\'q');
  
  user.courierInfo = user.courierInfo || {};
  user.courierInfo.isAvailable = !user.courierInfo.isAvailable;
  await user.save();
  await ctx.answerCbQuery(user.courierInfo.isAvailable ? '✅ Mavjud' : '❌ Band');
  
  try { 
    await ctx.editMessageReplyMarkup(mainMenuKeyboard(user)); 
  } catch {}
}

module.exports = {
  ensureCourierByTelegram, // Helper function
  toggleShift,
  startWork,
  stopWork,
  toggleAvailable
};