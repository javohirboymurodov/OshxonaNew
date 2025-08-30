const { handlePhoneInput } = require('../user/input');

/**
 * Contact Message Handler
 * Kontakt xabar handleri
 */

/**
 * Kontakt xabarini qayta ishlash
 * @param {Object} ctx - Telegraf context
 */
async function handleContact(ctx) {
  try {
    const contact = ctx.message && ctx.message.contact;
    const phone = contact && contact.phone_number ? contact.phone_number : '';
    if (!phone) return;
    
    // If courier binding flow
    if (ctx.session?.courierBind) {
      const { bindByPhone } = require('../courier/handlers');
      const bound = await bindByPhone(ctx, phone);
      if (bound) return;
    }
    
    // First notify user, then proceed to save and show menu
    try { 
      await ctx.reply('✅ Telefon raqamingiz qabul qilindi.', { 
        reply_markup: { remove_keyboard: true } 
      }); 
    } catch {}
    
    await handlePhoneInput(ctx, phone);
  } catch (error) {
    console.error('❌ contact handler error:', error);
  }
}

/**
 * Kontakt handleri ni bot ga ulash
 * @param {Object} bot - Telegraf bot instance
 */
function registerContactHandler(bot) {
  bot.on('contact', handleContact);
}

module.exports = {
  handleContact,
  registerContactHandler
};