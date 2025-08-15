const { User, Product, Category, Order, Cart, Branch } = require('../../models');
const BranchProduct = require('../../models/BranchProduct');
const DeliveryService = require('../../services/deliveryService');
const geoService = require('../../services/geoService');
const { orderTypeKeyboard, paymentMethodKeyboard, orderConfirmKeyboard, mainMenuKeyboard, branchesKeyboard } = require('../../keyboards/userKeyboards');
const Helpers = require('../../utils/helpers');
const { notifyAdmins } = require('./order/notify');

async function startOrder(ctx) {
  try {
    const telegramId = ctx.from.id;
    const user = await User.findOne({ telegramId });
    if (!user) {
      return await ctx.answerCbQuery('Foydalanuvchi topilmadi!');
    }
    const cart = await Cart.findOne({ user: user._id, isActive: true });
    if (!cart || cart.items.length === 0) {
      return await ctx.answerCbQuery('❌ Savat bo\'sh!');
    }
    // Agar QR orqali stolga biriktirilgan bo'lsa, qayta QR xabarini ko'rsatmaymiz.
    // To'g'ridan-to'g'ri to'lov turiga (yoki telefon) o'tamiz.
    if (ctx.session.orderType === 'dine_in_qr' && ctx.session.orderData?.tableCode) {
      // Telefon tekshiruvi
      if (user.phone) {
        await askForPaymentMethod(ctx);
      } else {
        await askForPhone(ctx);
      }
      return;
    }
    const message = `\n📝 **Buyurtma berish**\n\nBuyurtma turini tanlang:`;
    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: orderTypeKeyboard.reply_markup
    });
  } catch (error) {
    console.error('Start order error:', error);
    await ctx.answerCbQuery('❌ Buyurtma boshlashda xatolik!');
  }
}

// Filial tanlash bosqichi (pickup/dine_in uchun)
async function askForBranchSelection(ctx, forType) {
  try {
    const branches = await Branch.find({ isActive: true }).select('name');
    if (!branches || branches.length === 0) {
      await ctx.reply('❌ Faol filial topilmadi.');
      return;
    }
    const typeKey = forType === 'dine_in' ? 'dine' : forType; // callback uchun soddalashtirilgan
    const inline = {
      inline_keyboard: branches.map((b) => ([{ text: b.name, callback_data: `choose_branch_${typeKey}_${b._id}` }]))
    };
    const text = forType === 'pickup' ? '🏪 Qaysi filialdan olib ketasiz?' : '🏢 Qaysi filialga kelasiz?';
    if (ctx.updateType === 'callback_query') {
      await ctx.editMessageText(text, { reply_markup: inline });
    } else {
      await ctx.reply(text, { reply_markup: inline });
    }
  } catch (error) {
    console.error('Ask branch selection error:', error);
    await ctx.reply('❌ Filial tanlashda xatolik!');
  }
}

// Filial tanlanganini qayta ishlash
async function handleChooseBranch(ctx) {
  try {
    const data = String(ctx.callbackQuery?.data || '');
    const branchMatch = data.match(/[0-9a-fA-F]{24}$/);
    const branchId = branchMatch ? branchMatch[0] : '';
    const type = data.includes('choose_branch_pickup_') ? 'pickup' : 'dine';
    ctx.session.orderData = ctx.session.orderData || {};
    ctx.session.orderData.branch = branchId;
    // Filial tanlangach vaqt so'raladi yoki to'lovga o'tiladi
    if (type === 'pickup' || type === 'dine') {
      const normalized = type === 'dine' ? 'dine_in' : type;
      ctx.session.orderType = normalized;
      const { arrivalTimeKeyboard } = require('../../keyboards/userKeyboards');
      await ctx.editMessageText(
        normalized === 'pickup'
          ? "⏰ Necha daqiqadan so'ng buyurtmani olib ketasiz?\n\nVaqtingizni tanlang:"
          : "⏰ Necha daqiqadan so'ng restoranga kelasiz?\n\nVaqtingizni tanlang:",
        { reply_markup: arrivalTimeKeyboard().reply_markup }
      );
    } else {
      await askForPaymentMethod(ctx);
    }
    if (ctx.answerCbQuery) await ctx.answerCbQuery('✅ Filial tanlandi');
  } catch (error) {
    console.error('Handle choose branch error:', error);
    await ctx.answerCbQuery('❌ Filialni tanlashda xatolik!');
  }
}

// Eng yaqin filialni topish (Haversine)
async function findNearestBranch(lat, lon) {
  const branches = await Branch.find({ isActive: true });
  let best = null;
  let bestDist = Infinity;
  for (const b of branches) {
    const bl = b.address?.coordinates?.latitude;
    const bo = b.address?.coordinates?.longitude;
    if (typeof bl === 'number' && typeof bo === 'number') {
      const d = geoService.calculateDistance(bl, bo, lat, lon);
      if (d < bestDist) {
        bestDist = d;
        best = b;
      }
    }
  }
  return best;
}

async function handleOrderType(ctx) {
  try {
    let orderType = ctx.callbackQuery.data.split('_')[2];
    if (orderType === 'dine') orderType = 'dine_in';
    if (orderType === 'preorder') orderType = 'dine_in';
    if (orderType === 'dine_in') {
      await handleDineInPreorder(ctx);
    } else {
      await startOrderFlow(ctx, orderType);
    }
  } catch (error) {
    console.error('Handle order type error:', error);
    await ctx.answerCbQuery('Buyurtma turini tanlashda xatolik!');
  }
}

async function handleDineInPreorder(ctx) {
  try {
    // Agar QR orqali kelingan bo'lsa, to'g'ridan-to'g'ri to'lovga o'tamiz
    if (ctx.session.orderType === 'dine_in_qr' && ctx.session.orderData?.tableCode) {
      const telegramId = ctx.from.id;
      const user = await User.findOne({ telegramId });
      if (user?.phone) {
        await askForPaymentMethod(ctx);
      } else {
        await askForPhone(ctx);
      }
      return;
    }
    ctx.session.orderType = 'dine_in';
    await askForBranchSelection(ctx, 'dine');
  } catch (error) {
    console.error('Handle dine in preorder error:', error);
    await ctx.answerCbQuery('Vaqt tanlashda xatolik!');
  }
}

async function handleArrivalTime(ctx) {
  try {
    const data = ctx.callbackQuery.data.split('_');
    let minutes;
    if (data[2].includes('hour')) {
      if (data[2] === '1_hour') minutes = 60;
      else if (data[2] === '1_hour_30') minutes = 90;
      else if (data[2] === '2_hours') minutes = 120;
    } else {
      const val = parseInt(data[2]);
      // Agar qiymat kichik bo'lsa (masalan, 1,2,3,4,5) bu soat bo'lish ehtimoli yuqori
      // 15/30/45 kabi qiymatlar daqiqa sifatida qabul qilinadi
      if ([15, 30, 45].includes(val)) minutes = val;
      else if (val > 0 && val <= 5) minutes = val * 60; // 1..5 -> soat
      else minutes = val; // fallback
    }
    ctx.session.orderData = ctx.session.orderData || {};
    ctx.session.orderData.arrivalTime = minutes;
    // Telefon raqami sessionda bo'lmasa yoki eskirgan bo'lsa, bazadan yangilaymiz
    let user = ctx.session.user;
    if (!user || !user.phone) {
      const telegramId = ctx.from.id;
      user = await User.findOne({ telegramId });
      ctx.session.user = user;
    }
    if (user && user.phone) {
      await askForPaymentMethod(ctx);
    } else {
      await askForPhone(ctx);
    }
  } catch (error) {
    console.error('Handle arrival time error:', error);
    await ctx.answerCbQuery('Vaqtni saqlashda xatolik!');
  }
}

async function handleDineInQR(ctx, tableCode, branchId) {
  try {
    // Backward-compat: agar tableCode obyekt bo'lsa
    if (tableCode && typeof tableCode === 'object') {
      const maybe = tableCode;
      const code = maybe.tableCode || maybe.number || maybe.tableNumber || '';
      const bId = branchId || maybe.branch || undefined;
      tableCode = code;
      branchId = bId;
    }
    const telegramId = ctx.from.id;
    let user = await User.findOne({ telegramId });
    if (!user) {
      user = new User({
        telegramId: ctx.from.id,
        firstName: ctx.from.first_name,
        lastName: ctx.from.last_name,
        username: ctx.from.username,
        language: ctx.from.language_code || 'uz'
      });
      await user.save();
    } else {
      // Fallback: update last activity timestamp safely
      user.updatedAt = new Date();
      await user.save();
    }
    ctx.session.user = user;
    ctx.session.orderType = 'dine_in_qr';
    ctx.session.orderData = {
      tableCode: tableCode,
      ...(branchId ? { branch: branchId } : {})
    };
    await ctx.reply(`\n🍽️ **Stol ${tableCode} uchun buyurtma**\n\nSiz stol ${tableCode} uchun buyurtma berasiz.\nMahsulotlarni tanlang va buyurtma bering!\n      `, {
      parse_mode: 'Markdown',
      reply_markup: mainMenuKeyboard.reply_markup
    });
  } catch (error) {
    console.error('Handle dine in QR error:', error);
    await ctx.reply('❌ Stol kodini qayta ishlashda xatolik!');
  }
}

async function startOrderFlow(ctx, orderType, orderData = {}) {
  try {
    ctx.session.orderType = orderType;
    ctx.session.orderData = { ...ctx.session.orderData, ...orderData };
    if (orderType === 'delivery') {
      ctx.session.waitingFor = 'address';
      return await ctx.reply('📍 Yetkazib berish manzilini kiriting yoki lokatsiya yuboring:', {
        reply_markup: {
          keyboard: [[{ text: '📍 Geo-joylashuvni yuborish', request_location: true }]],
          resize_keyboard: true,
          one_time_keyboard: true
        }
      });
    }
    if (orderType === 'pickup') {
      await askForBranchSelection(ctx, 'pickup');
      return;
    }
  // Dine-in QR oqimida: telefon/ to'lovga yo'naltirish
  if (orderType === 'dine_in' || orderType === 'dine_in_qr') {
    const telegramId = ctx.from.id;
    const user = await User.findOne({ telegramId });
    if (user?.phone) {
      await askForPaymentMethod(ctx);
    } else {
      await askForPhone(ctx);
    }
    return;
  }
  // Telefon raqami sessionda yo'q bo'lsa yoki eskirgan bo'lsa, bazadan tekshiramiz
    let user = ctx.session.user;
    if (!user || !user.phone) {
      const telegramId = ctx.from.id;
      user = await User.findOne({ telegramId });
      ctx.session.user = user;
    }
    if (user && user.phone) {
      if (ctx.session.orderType === 'pickup' || ctx.session.orderType === 'dine_in') {
        // Vaqt so'rash bosqichi
        const { arrivalTimeKeyboard } = require('../../keyboards/userKeyboards');
        await ctx.reply(
          ctx.session.orderType === 'pickup'
            ? "⏰ Necha daqiqadan so'ng buyurtmani olib ketasiz?\n\nVaqtingizni tanlang:"
            : "⏰ Necha daqiqadan so'ng restoranga kelasiz?\n\nVaqtingizni tanlang:",
          { reply_markup: arrivalTimeKeyboard().reply_markup }
        );
      } else {
        await askForPaymentMethod(ctx);
      }
    } else {
      await askForPhone(ctx);
    }
  } catch (error) {
    console.error('Start order flow error:', error);
    await ctx.answerCbQuery('Buyurtma jarayonini boshlashda xatolik!');
  }
}

async function askForPhone(ctx) {
  try {
    ctx.session.waitingFor = 'phone';
    const text = "📞 Telefon raqamingizni yuboring yoki kiriting:";
    const keyboard = {
      keyboard: [
        [{ text: "📲 Telefon raqamni yuborish", request_contact: true }]
      ],
      resize_keyboard: true,
      one_time_keyboard: true
    };
    await ctx.reply(text, { reply_markup: keyboard });
  } catch (error) {
    console.error('Ask for phone error:', error);
    if (ctx.answerCbQuery) await ctx.answerCbQuery('Telefon so\'rashda xatolik!');
  }
}

async function askForPaymentMethod(ctx) {
  try {
    ctx.session.waitingFor = 'payment_method';
    const text = "💳 To'lov turini tanlang:\nQanday to'lov usulini tanlaysiz?";
    if (ctx.updateType === 'callback_query') {
      await ctx.editMessageText(text, {
        parse_mode: 'Markdown',
        reply_markup: paymentMethodKeyboard.reply_markup
      });
    } else {
      await ctx.reply(text, {
        parse_mode: 'Markdown',
        reply_markup: paymentMethodKeyboard.reply_markup
      });
    }
  } catch (error) {
    console.error('Ask for payment method error:', error);
    if (ctx.answerCbQuery) await ctx.answerCbQuery('To\'lov turini so\'rashda xatolik!');
  }
}

async function handlePaymentMethod(ctx, paymentMethod) {
  try {
    ctx.session.orderData = ctx.session.orderData || {};
    ctx.session.orderData.paymentMethod = paymentMethod;
    ctx.session.waitingFor = null;
    await confirmOrder(ctx);
  } catch (error) {
    console.error('Handle payment method error:', error);
    await ctx.answerCbQuery('To\'lov turini saqlashda xatolik!');
  }
}

async function confirmOrder(ctx) {
  try {
    const user = ctx.session.user || await User.findOne({ telegramId: ctx.from.id });
    if (!user) {
      await ctx.reply('Foydalanuvchi topilmadi!');
      return;
    }
    const cart = await Cart.findOne({ 
      user: user._id, 
      isActive: true 
    }).populate('items.product');
    if (!cart || cart.items.length === 0) {
      await ctx.editMessageText('❌ Savatingiz bo\'sh!');
      return;
    }
    let message = '📋 <b>Buyurtma ma\'lumotlari</b>\n\n';
    cart.items.forEach((item, index) => {
      message += `${index + 1}. ${item.productName} x${item.quantity} = ${item.totalPrice.toLocaleString()} so'm\n`;
    });
    message += `\n💰 <b>Jami:</b> ${cart.total.toLocaleString()} so'm\n`;
    if (ctx.session.orderType === 'delivery') {
      let manzilText = 'Kiritilmagan';
      if (ctx.session.orderData.address) {
        manzilText = ctx.session.orderData.address;
      } else if (
        ctx.session.orderData.location &&
        ctx.session.orderData.location.latitude &&
        ctx.session.orderData.location.longitude
      ) {
        manzilText = `<a href="https://maps.google.com/?q=${ctx.session.orderData.location.latitude},${ctx.session.orderData.location.longitude}">Lokatsiya</a>`;
      }
      message += `📍 <b>Manzil:</b> ${manzilText}\n`;
    }
    if (ctx.session.orderType === 'dine_in' && ctx.session.orderData && ctx.session.orderData.arrivalTime) {
      message += `⏰ <b>Kelish vaqti:</b> ${ctx.session.orderData.arrivalTime} daqiqa\n`;
    }
    message += `📞 <b>Telefon:</b> ${user.phone}\n`;
    message += `💳 <b>To'lov:</b> ${ctx.session.orderData.paymentMethod}\n`;
    await ctx.replyWithHTML(message, {
      reply_markup: orderConfirmKeyboard.reply_markup
    });
  } catch (error) {
    console.error('Confirm order error:', error);
    await ctx.answerCbQuery('Buyurtmani tasdiqlashda xatolik!');
  }
}

async function finalizeOrder(ctx) {
  try {
    const user = ctx.session.user || await User.findOne({ telegramId: ctx.from.id });
    if (!user) {
      await ctx.reply('Foydalanuvchi topilmadi!');
      return;
    }
    const cart = await Cart.findOne({ 
      user: user._id, 
      isActive: true 
    }).populate('items.product');
    if (!cart || cart.items.length === 0) {
      await ctx.editMessageText('❌ Savatingiz bo\'sh!');
      return;
    }
    const orderType = ctx.session.orderType;
    // 4 tur:
    // delivery, pickup, dine_in (avvaldan), table (QR)
    const normalizedOrderType = (orderType === 'dine_in_qr') ? 'table' : orderType;
    console.log('DEBUG: session.orderType =', orderType);
    const orderData = ctx.session.orderData || {};
    const subtotal = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);

    // Calculate delivery fee and ETA for delivery orders
    let deliveryFee = 0;
    let estimatedTimeDate = undefined;
    if (normalizedOrderType === 'delivery' && orderData?.location && orderData.location.latitude && orderData.location.longitude) {
      try {
        const feeInfo = await DeliveryService.calculateDeliveryFee(orderData.location, subtotal);
        deliveryFee = Number(feeInfo?.fee || 0);
        const timeInfo = await DeliveryService.calculateDeliveryTime(orderData.location, cart.items);
        const totalMinutes = Number(timeInfo?.totalTime || 0);
        if (totalMinutes > 0) {
          estimatedTimeDate = new Date(Date.now() + totalMinutes * 60 * 1000);
        }
      } catch (calcErr) {
        console.error('Delivery calculation error:', calcErr);
      }
    }

    // Determine branch by order type
    let branchId = (ctx.session?.orderData?.branch) || user.branch || undefined;
    if (normalizedOrderType === 'delivery' && orderData?.location?.latitude && orderData?.location?.longitude) {
      try {
        const res = await DeliveryService.resolveBranchForLocation(orderData.location);
        if (res.source === 'zone' && res.branchId) {
          branchId = res.branchId;
        } else if (res.source === 'radius' && res.branchId) {
          // radius tekshiruvi (agar branch settings mavjud bo'lsa)
          const b = await Branch.findById(res.branchId);
          const maxKm = Number(b?.settings?.maxDeliveryDistance ?? 15);
          const dist = res.distanceKm ?? 9999;
          if (dist > maxKm) {
            await ctx.reply(`❌ Manzil yetkazib berish radiusidan tashqarida ( ${dist.toFixed(2)} km > ${maxKm} km ).`);
            return;
          }
          branchId = res.branchId;
        } else {
          await ctx.reply('❌ Sizning hududingizda yetkazib berish xizmati mavjud emas.');
          return;
        }
      } catch (e) {
        console.error('Resolve branch error:', e);
      }
    }
    if ((normalizedOrderType === 'pickup' || normalizedOrderType === 'dine_in') && !branchId) {
      await ctx.reply('❌ Filial tanlanmagan. Iltimos filialni tanlang.');
      return;
    }

    const order = new Order({
      orderId: 'ORD' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase(),
      user: user._id,
      branch: branchId,
      items: cart.items.map(item => ({
        product: item.product._id,
        productName: item.productName,
        quantity: item.quantity,
        price: item.price,
        totalPrice: item.totalPrice
      })),
      orderType: normalizedOrderType,
      subtotal,
      deliveryFee,
      total: subtotal + deliveryFee,
      paymentMethod: orderData.paymentMethod,
      status: 'pending',
      customerInfo: {
        name: user.firstName,
        phone: user.phone
      },
      deliveryInfo: normalizedOrderType === 'delivery' ? {
        address: orderData.address || '',
        location: orderData.location || undefined,
        estimatedTime: estimatedTimeDate
      } : undefined,
      dineInInfo: (normalizedOrderType === 'dine_in' || normalizedOrderType === 'pickup' || normalizedOrderType === 'table') ? {
        arrivalTime: orderData.arrivalTime ? String(orderData.arrivalTime) : undefined,
        // QR orqali kelingan bo'lsa, stol raqamini yozib qo'yamiz
        tableNumber: (normalizedOrderType === 'table' && ctx.session.orderData?.tableCode)
          ? String(ctx.session.orderData.tableCode)
          : undefined
      } : undefined
    });
    console.log('DEBUG: order.orderType =', order.orderType);
    await order.save();
    cart.isActive = false;
    await cart.save();

    // Per-filial inventarni yangilash: soldToday va stock (agar mavjud bo'lsa)
    try {
      if (branchId) {
        for (const item of cart.items) {
          const productId = item.product._id || item.product;
          const qty = Number(item.quantity) || 0;
          // soldToday ni oshiramiz (upsert)
          await BranchProduct.findOneAndUpdate(
            { branch: branchId, product: productId },
            { 
              $inc: { soldToday: qty },
              $setOnInsert: { branch: branchId, product: productId, lastResetAt: new Date() }
            },
            { new: true, upsert: true }
          );
          // stock null emas bo'lsa kamaytiramiz
          try {
            const inv = await BranchProduct.findOne({ branch: branchId, product: productId }).select('stock');
            if (inv && inv.stock !== null && inv.stock !== undefined) {
              await BranchProduct.updateOne(
                { _id: inv._id },
                { $inc: { stock: -qty } }
              );
            }
          } catch (e) { /* ignore stock update errors */ }
        }
      }
    } catch (invErr) {
      console.error('Inventory update error:', invErr?.message || invErr);
    }
    ctx.session.orderType = null;
    ctx.session.orderData = null;
    ctx.session.waitingFor = null;
    let confirmMsg = `✅ <b>Buyurtma muvaffaqiyatli yaratildi!</b>\n\n📋 <b>Buyurtma №:</b> ${order.orderId}\n💰 <b>Jami:</b> ${order.total.toLocaleString()} so'm\n📅 <b>Sana:</b> ${new Date().toLocaleString('uz-UZ')}`;
    if (order.orderType === 'dine_in' && order.dineInInfo && order.dineInInfo.arrivalTime) {
      confirmMsg += `\n⏰ <b>Kelish vaqti:</b> ${order.dineInInfo.arrivalTime} daqiqa`;
    }
    // Olib ketish uchun ham vaqtni ko'rsatamiz
    if (order.orderType === 'pickup' && order.dineInInfo && order.dineInInfo.arrivalTime) {
      confirmMsg += `\n⏰ <b>Olib ketish vaqti:</b> ${order.dineInInfo.arrivalTime} daqiqa`;
    }
    confirmMsg += `\n\nBuyurtmangiz qabul qilindi va tez orada tayyorlanadi!`;
    
    // TUZATILDI: Dine-in uchun "Keldim" tugmasi
    // Tasdiqlash xabari hamma holatda yuboriladi
    await ctx.replyWithHTML(confirmMsg, {
      reply_markup: mainMenuKeyboard.reply_markup
    });

    // "Keldim" tugmasi faqat AVVALDAN BUYURTMA (dine_in) uchun
    if (order.orderType === 'dine_in') {
      await ctx.replyWithHTML(
        '🚪 <b>Restoranga kelganingizda "Keldim" tugmasini bosing:</b>',
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '✅ Keldim', callback_data: `dinein_arrived_${order._id}` }]
            ]
          }
        }
      );
    }
    // Pickup: avtomatik completed (10s) agar status 'picked_up' bo'lsa
    if (order.orderType === 'pickup') {
      setTimeout(async () => {
        try {
          const fresh = await Order.findById(order._id);
          if (fresh && fresh.status === 'picked_up') {
            fresh.status = 'completed';
            await fresh.save();
          }
        } catch {}
      }, 10000);
    }
    
    await notifyAdmins(order);
    
  } catch (error) {
    console.error('Finalize order error:', error);
    await ctx.answerCbQuery('Buyurtmani yakunlashda xatolik!');
  }
}

// notifyAdmins moved to handlers/user/order/notify.js

async function continueOrderProcess(ctx) {
  try {
    await ctx.reply('📝 Buyurtma ma\'lumotlari to\'ldirilmoqda...', {
      reply_markup: require('../../keyboards/userKeyboards').backToMainKeyboard.reply_markup
    });
  } catch (error) {
    console.error('Continue order process error:', error);
    await ctx.reply('❌ Buyurtma jarayonida xatolik!');
  }
}

async function handleDineInArrived(ctx) {
  try {
    const orderId = ctx.match[1];
    ctx.session.waitingFor = `dinein_table_${orderId}`;
    await ctx.reply('Iltimos, kelgan stol raqamingizni kiriting:');
  } catch (error) {
    console.error('Keldim tugmasi bosilganda xatolik:', error);
    await ctx.reply('❌ Xatolik yuz berdi.');
  }
}

async function handleDineInTableInput(ctx) {
  try {
    const waitingFor = ctx.session.waitingFor;
    if (!waitingFor || !waitingFor.startsWith('dinein_table_')) return false;
    
    const orderId = waitingFor.replace('dinein_table_', '');
    const tableNumber = ctx.message.text.trim();
    
    // Raqam tekshirish
    if (!/^\d+$/.test(tableNumber)) {
      await ctx.reply('❌ Iltimos, faqat raqam kiriting! (masalan: 5, 12)');
      return false;
    }

    // Buyurtmani yangilash
    const order = await Order.findOneAndUpdate(
      { _id: orderId },
      { 
        $set: { 
          'dineInInfo.tableNumber': tableNumber, 
          status: 'arrived' 
        } 
      },
      { new: true }
    ).populate('user');

    if (!order) {
      await ctx.reply('❌ Buyurtma topilmadi!');
      return false;
    }

    // Session ni tozalash
    ctx.session.waitingFor = null;

    // Mijozga tasdiqlash xabari
    const message = `✅ **Stol raqamingiz qabul qilindi!**\n\n🪑 **Stol:** ${tableNumber}\n📝 **Buyurtma:** #${order.orderId}\n\n🍽️ **Buyurtmangiz tez orada tayyor bo'ladi!**\n\nOfitsiant sizga xizmat ko'rsatadi.`;

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: require('../../keyboards/userKeyboards').mainMenuKeyboard.reply_markup
    });

    // Adminlarga xabar yuborish - TUZATILDI
    const admins = await User.find({ role: 'admin' });

    for (const admin of admins) {
      try {
        let msg = `🍽️ **MIJOZ STOLGA O'TIRDI**\n\n`;
        msg += `👤 **Mijoz:** ${order.user?.firstName || 'Noma\'lum'}\n`;
        msg += `📞 **Telefon:** ${order.customerInfo?.phone || 'Kiritilmagan'}\n`;
        msg += `📋 **Buyurtma №:** ${order.orderId}\n`;
        msg += `🪑 **Stol raqami:** ${tableNumber}\n\n`;
        msg += `🍽️ **Buyurtmani stolga olib boring!**`;

        // Adminlarga Telegram orqali xabar
        await ctx.telegram.sendMessage(admin.telegramId, msg, { 
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '✅ Yetkazildi', callback_data: `order_delivered_${order._id}` }]
            ]
          }
        });
      } catch (error) {
        console.error(`Admin ${admin.telegramId} ga xabar yuborishda xatolik:`, error);
      }
    }

    // Qo'shimcha: .env dagi ADMIN_ID ro'yxati bo'yicha ham xabar yuboramiz (fallback)
    try {
      const ids = process.env.ADMIN_ID ? process.env.ADMIN_ID.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n)) : [];
      for (const tid of ids) {
        try {
          await ctx.telegram.sendMessage(tid, `\n🆕 **Yangi buyurtma!**\n\n📋 **Buyurtma №:** ${populatedOrder.orderId}\n🍽️ **Turi:** ${Helpers.getOrderTypeText(populatedOrder.orderType, 'uz')}${(populatedOrder.dineInInfo && populatedOrder.dineInInfo.tableNumber) ? ` (Stol: ${populatedOrder.dineInInfo.tableNumber})` : ''}\n💰 **Jami:** ${populatedOrder.total.toLocaleString()} so'm`, { parse_mode: 'Markdown' });
        } catch (e) {
          console.error('ADMIN_ID notify error:', e?.message || e);
        }
      }
    } catch (e) {}

    // Web admin panelga real-time event + sound new-order
    try {
      const SocketManager = require('../../config/socketConfig');
      const branchId = (order.branch && order.branch.toString) ? order.branch.toString() : 'default';
      // 1) Update event (modal fokus uchun)
      SocketManager.emitOrderUpdate(order._id.toString(), {
        event: 'dine_in_arrived',
        tableNumber: tableNumber,
        status: 'arrived',
        orderId: order.orderId,
        branchId
      });
      // 2) New-order style ping with sound
      SocketManager.emitNewOrder(branchId, {
        id: order._id.toString(),
        orderId: order.orderId,
        customer: { name: order.user?.firstName || 'Mijoz' },
        total: order.total,
        sound: true,
        orderType: order.orderType,
        tableNumber: tableNumber
      });
    } catch (error) {
      console.error('Emit dine_in_arrived error:', error);
    }

    return true;
    
  } catch (error) {
    console.error('Stol raqami kiritishda xatolik:', error);
    await ctx.reply('❌ Stol raqamini saqlashda xatolik!');
    return false;
  }
}

module.exports = {
  startOrder,
  handleOrderType,
  handleDineInPreorder,
  handleArrivalTime,
  // Filial tanlash oqimi
  askForBranchSelection,
  handleChooseBranch,
  handleDineInQR,
  startOrderFlow,
  askForPhone,
  askForPaymentMethod,
  handlePaymentMethod,
  confirmOrder,
  finalizeOrder,
  notifyAdmins,
  continueOrderProcess,
  handleDineInArrived,
  handleDineInTableInput
};
