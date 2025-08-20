const { User } = require('../../../models');
const { mainMenuKeyboard, backToMainKeyboard } = require('../../user/keyboards');
const { askForPhone, askForPaymentMethod, continueOrderProcess } = require('./order');

async function handleTextMessage(ctx, text) {
  try {
    const waitingFor = ctx.session.waitingFor;
    const messageText = text || ctx.message?.text;

    // Stol raqami kutilayotgan bo'lsa (old format)
    if (waitingFor && waitingFor.startsWith('dinein_table_')) {
      const { handleDineInTableInput } = require('./order');
      const handled = await handleDineInTableInput(ctx);
      if (handled) return;
    }

    // Handle table number input (new format)
    if (waitingFor === 'table_number') {
      const { handleDineInTableInput } = require('./order');
      const handled = await handleDineInTableInput(ctx);
      if (handled) return;
    }

    // 🔧 FIX: Feedback yozish jarayoni
    if (waitingFor === 'feedback' && ctx.session?.feedbackOrderId) {
      try {
        const { Order } = require('../../../models');
        const orderId = ctx.session.feedbackOrderId;
        const user = ctx.session.user;
        
        // Order ni topish va tekshirish
        const order = await Order.findById(orderId);
        if (!order || order.user?.toString() !== user._id.toString()) {
          await ctx.reply('❌ Buyurtma topilmadi yoki ruxsat yo\'q');
          return;
        }
        
        // Feedback ni saqlash
        order.feedback = messageText;
        order.updatedAt = new Date();
        await order.save();
        
        // Session ni tozalash
        ctx.session.waitingFor = null;
        ctx.session.feedbackOrderId = null;
        
        await ctx.reply('✅ Izohingiz saqlandi! Rahmat!', {
          reply_markup: {
            inline_keyboard: [
              [{ text: '🏠 Asosiy sahifa', callback_data: 'back_to_main' }]
            ]
          }
        });
        
      } catch (error) {
        console.error('Feedback save error:', error);
        await ctx.reply('❌ Izoh saqlashda xatolik yuz berdi');
      }
      return;
    }

    const user = ctx.session.user;
    if (!user || !user.phone) {
      // Phone required before any free text flow
      // Agar telefon raqam allaqachon so'ralgan bo'lsa, qayta so'ramaymiz
      if (ctx.session.phoneRequested) {
        console.log('Phone already requested, skipping...');
        return;
      }
      return await require('./order').askForPhone(ctx);
    }
    // 🔧 Reply keyboard matnlarini boshqarish (main menu)
    const plain = (messageText || '').replace(/\s+/g, ' ').trim();
    if (plain) {
      const isHome = /Asosiy sahifa/i.test(plain);
      const isMyOrders = /Mening buyurtmalarim/i.test(plain) || /Buyurtmalarim/i.test(plain);
      const isProfile = /Profil/i.test(plain);
      if (isHome) {
        const { startHandler } = require('./profile');
        await startHandler(ctx);
        return;
      }
      if (isMyOrders) {
        const { showMyOrders } = require('./myOrders');
        await showMyOrders(ctx);
        return;
      }
      if (isProfile) {
        const { showProfile } = require('./profile');
        await showProfile(ctx);
        return;
      }
    }

    if (waitingFor) {
      switch (waitingFor) {
        case 'first_name':
          user.firstName = messageText;
          await user.save();
          ctx.session.waitingFor = null;
          // Skip asking phone by text; phone must be shared via contact
          if (!user.phone) return await require('./order').askForPhone(ctx);
          return await require('./profile').startHandler(ctx);
        // Manual phone entry is disabled
        case 'address':
          await handleAddressInput(ctx, messageText);
          break;
        case 'order_notes':
          await handleOrderNotes(ctx, messageText);
          break;
        default:
          ctx.session.waitingFor = null;
      }
    } else {
      await ctx.reply('🤔 Tushunmadim. Iltimos, tugmalardan foydalaning.');
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
    // Persist phone directly to database (create or update)
    const telegramId = ctx.from.id;
    let user = await User.findOne({ telegramId });
    if (!user) {
      user = new User({
        telegramId,
        firstName: ctx.from.first_name || null,
        lastName: ctx.from.last_name || null,
        username: ctx.from.username || null,
        role: 'user',
        phone: formattedPhone
      });
    } else {
      user.firstName = ctx.from.first_name || user.firstName;
      user.lastName = ctx.from.last_name || user.lastName;
      user.username = ctx.from.username || user.username;
      user.phone = formattedPhone;
    }
    await user.save();
    ctx.session.user = user;
    ctx.session.orderData = ctx.session.orderData || {};
    ctx.session.orderData.phone = formattedPhone;
    ctx.session.waitingFor = null;
    // Keraksiz bo'sh xabar yubormaymiz; to'g'ridan-to'g'ri startHandler
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
