const { User } = require('../../models');
const { mainMenuKeyboard, backToMainKeyboard } = require('../../keyboards/userKeyboards');
const { askForPhone, askForPaymentMethod, continueOrderProcess } = require('./order');

async function handleTextMessage(ctx) {
  try {
    const waitingFor = ctx.session.waitingFor;
    const text = ctx.message.text;

    // Stol raqami kutilayotgan bo'lsa
    if (waitingFor && waitingFor.startsWith('dinein_table_')) {
      const { handleDineInTableInput } = require('./order');
      const handled = await handleDineInTableInput(ctx);
      if (handled) return;
    }

    const user = ctx.session.user;
    if (!user) {
      return await require('./profile').startHandler(ctx);
    }
    if (waitingFor) {
      switch (waitingFor) {
        case 'first_name':
          user.firstName = text;
          await user.save();
          ctx.session.waitingFor = null;
          if (!user.phone) {
            return await askForPhone(ctx);
          }
          return await require('./profile').startHandler(ctx);
        case 'phone':
          await handlePhoneInput(ctx, text);
          break;
        case 'address':
          await handleAddressInput(ctx, text);
          break;
        case 'order_notes':
          await handleOrderNotes(ctx, text);
          break;
        default:
          ctx.session.waitingFor = null;
      }
    } else {
      await ctx.reply('🤔 Tushunmadim. Iltimos, tugmalardan foydalaning.', {
        reply_markup: mainMenuKeyboard.reply_markup
      });
    }
  } catch (error) {
    console.error('Handle text message error:', error);
    await ctx.reply('❌ Xabarni qayta ishlashda xatolik!');
  }
}

async function handlePhoneInput(ctx, phone) {
  try {
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 9) {
      await ctx.reply('❌ Noto\'g\'ri telefon raqam! Iltimos qaytadan kiriting.');
      return;
    }
    let formattedPhone = cleanPhone;
    if (cleanPhone.startsWith('998')) {
      formattedPhone = '+' + cleanPhone;
    } else if (cleanPhone.startsWith('9')) {
      formattedPhone = '+998' + cleanPhone;
    } else {
      formattedPhone = '+998' + cleanPhone;
    }
    if (ctx.session.user) {
      ctx.session.user.phone = formattedPhone;
      await ctx.session.user.save();
    }
    ctx.session.orderData = ctx.session.orderData || {};
    ctx.session.orderData.phone = formattedPhone;
    ctx.session.waitingFor = null;
    await ctx.reply('.', { reply_markup: { remove_keyboard: true } });
    await require('./profile').startHandler(ctx);
  } catch (error) {
    console.error('Handle phone input error:', error);
    await ctx.reply('❌ Telefon raqamni saqlashda xatolik!');
  }
}

async function handleAddressInput(ctx, address) {
  try {
    ctx.session.orderData = ctx.session.orderData || {};
    ctx.session.orderData.address = address;
    ctx.session.waitingFor = null;
    await ctx.reply('✅ Manzil saqlandi!');
    await askForPaymentMethod(ctx);
  } catch (error) {
    console.error('Handle address input error:', error);
    await ctx.reply('❌ Manzilni saqlashda xatolik!');
  }
}

async function handleOrderNotes(ctx, notes) {
  try {
    ctx.session.orderData = ctx.session.orderData || {};
    ctx.session.orderData.notes = notes;
    delete ctx.session.waitingFor;
    await ctx.reply('✅ Izoh saqlandi!');
    await continueOrderProcess(ctx);
  } catch (error) {
    console.error('Handle order notes error:', error);
    await ctx.reply('❌ Izohni saqlashda xatolik!');
  }
}

module.exports = {
  handleTextMessage,
  handlePhoneInput,
  handleAddressInput,
  handleOrderNotes,
  continueOrderProcess
};
