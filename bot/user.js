// Registers all user-facing bot commands and actions
module.exports = function registerUserBot(bot) {
  const { User } = require('../models');
  const {
    showCategories,
    showCategoryProducts,
    showProductDetails,
    changeProductQuantity,
  } = require('../handlers/user/catalog');
  const {
    startOrder,
    handleOrderType,
    handleDineInPreorder,
    handleArrivalTime,
    askForPaymentMethod,
    handlePaymentMethod,
    finalizeOrder,
    handleDineInArrived,
    handleDineInTableInput,
  } = require('../handlers/user/order');
  const {
    addToCart,
    updateQuantity,
    removeFromCart,
    showCart,
    clearCart,
  } = require('../handlers/user/cart');
  const { handleTextMessage, handlePhoneInput } = require('../handlers/user/input');
  const { mainMenuKeyboard } = require('../keyboards/userKeyboards');
  const { showBranches } = require('../handlers/user/catalog');
  const { showMyOrders, myOrdersCallbackHandler } = require('../handlers/user/myOrders');
  const UXImprovements = require('../improvements/ux-improvements');

  // /start and /menu
  bot.start(async (ctx) => {
    try {
      const telegramId = ctx.from.id;
      const firstName = ctx.from.first_name;
      const lastName = ctx.from.last_name || '';
      const username = ctx.from.username || '';

      let user = await User.findOne({ telegramId });
      if (!user) {
        user = new User({ telegramId, firstName, lastName, username, role: 'user' });
        await user.save();
      } else {
        user.firstName = firstName;
        user.lastName = lastName;
        user.username = username;
        await user.save();
      }

      // Agar foydalanuvchi roli kuryer bo'lsa, darhol kuryer paneliga yo'naltiramiz
      if (user.role === 'courier') {
        try {
          const { start } = require('../bot/courier/handlers');
          await start(ctx);
          return;
        } catch (e) {
          // agar modul yuklanmasa, odatiy menyuni ko'rsatamiz
        }
      }

      // Parse /start payload: table_{number}_b_{branchId}
      const text = ctx.message?.text || '';
      const payload = text.split(' ').slice(1).join(' ');
      const match = /^table_(\d+)_b_([0-9a-fA-F]{24})$/.exec(payload || '');
      if (match) {
        const tableNumber = match[1];
        const branchId = match[2];
        const { handleDineInQR } = require('../handlers/user/order');
        await handleDineInQR(ctx, tableNumber, branchId);
        return;
      }

      const welcomeMessage = `\n🍽️ **${firstName}, Oshxona botiga xush kelibsiz!**\n\n🥘 Eng mazali taomlarni buyurtma qiling\n🚚 Tez va sifatli yetkazib berish\n💳 Qulay to'lov usullari\n\nQuyidagi tugmalardan birini tanlang:`;
      await ctx.replyWithHTML(welcomeMessage, { reply_markup: mainMenuKeyboard.reply_markup });
    } catch (error) {
      await ctx.reply('❌ Botni ishga tushirishda xatolik yuz berdi!');
    }
  });

  bot.command('menu', async (ctx) => {
    await ctx.replyWithHTML('🏠 **Bosh sahifa**\n\nKerakli bo\'limni tanlang:', {
      reply_markup: mainMenuKeyboard.reply_markup,
    });
  });

  // Quick order
  bot.action(/^quick_order$/, async (ctx) => {
    const keyboard = await UXImprovements.quickOrderKeyboard(ctx.from.id);
    try {
      await ctx.editMessageText('⚡ Tezkor buyurtma:', { reply_markup: keyboard, parse_mode: 'Markdown' });
    } catch {
      await ctx.reply('⚡ Tezkor buyurtma:', { reply_markup: keyboard, parse_mode: 'Markdown' });
    }
    if (ctx.answerCbQuery) await ctx.answerCbQuery();
  });
  bot.action('quick_popular', async (ctx) => {
    const keyboard = await UXImprovements.popularProductsKeyboard();
    try {
      await ctx.editMessageText('🔥 Eng mashhur mahsulotlar:', { reply_markup: keyboard });
    } catch {
      await ctx.reply('🔥 Eng mashhur mahsulotlar:', { reply_markup: keyboard });
    }
    if (ctx.answerCbQuery) await ctx.answerCbQuery();
  });
  bot.action('quick_fast', async (ctx) => {
    const keyboard = await UXImprovements.fastProductsKeyboard();
    try {
      await ctx.editMessageText('⚡ Tez tayyorlanadiganlar:', { reply_markup: keyboard });
    } catch {
      await ctx.reply('⚡ Tez tayyorlanadiganlar:', { reply_markup: keyboard });
    }
    if (ctx.answerCbQuery) await ctx.answerCbQuery();
  });
  bot.action(/^reorder_[0-9a-fA-F]{24}$/, async (ctx) => {
    const orderId = ctx.callbackQuery.data.split('_')[1];
    await UXImprovements.reorderPrevious(ctx, orderId);
    if (ctx.answerCbQuery) await ctx.answerCbQuery();
  });
  bot.action(/^quick_add_[0-9a-fA-F]{24}$/, async (ctx) => {
    const productId = ctx.callbackQuery.data.split('_')[2];
    ctx.callbackQuery.data = `add_cart_${productId}_1`;
    await addToCart(ctx);
    if (ctx.answerCbQuery) await ctx.answerCbQuery('✅ Qo\'shildi');
  });

  // User navigation
  bot.action('main_menu', async (ctx) => {
    await ctx.editMessageText('🏠 **Bosh sahifa**\n\nKerakli bo\'limni tanlang:', {
      parse_mode: 'Markdown',
      reply_markup: mainMenuKeyboard.reply_markup,
    });
  });
  bot.action('back_to_main', async (ctx) => {
    const { backToMain } = require('../handlers/user/backToMain');
    await backToMain(ctx);
  });

  // Reply keyboarddagi "Asosiy menyu" faqat user paneli uchun (kuryer uchun alohida matn bor)
  bot.hears('⬅️ Asosiy menyu', async (ctx) => {
    try {
      // Agar foydalanuvchi kuryer bo'lsa, bu matnga javob bermaymiz
      const { User } = require('../models');
      const u = await User.findOne({ telegramId: ctx.from?.id });
      if (u?.role === 'courier') return; 
      const { backToMain } = require('../handlers/user/backToMain');
      await backToMain(ctx);
    } catch {}
  });

  // Branches navigation
  const catalogHandlers = require('../handlers/user/catalog');
  bot.action('show_branches', async (ctx) => { await catalogHandlers.showBranches(ctx, 1); });
  bot.action(/^branches_page_(\d+)$/, async (ctx) => { const page = parseInt(ctx.match[1], 10) || 1; await catalogHandlers.showBranches(ctx, page); });
  bot.action(/^branch_([0-9a-fA-F]{24})$/, async (ctx) => { await catalogHandlers.showBranchDetailsById(ctx, ctx.match[1]); });
  bot.action('nearest_branch', async (ctx) => {
    try {
      console.log('[nearest_branch] action');
      await ctx.reply('Eng yaqin filialni aniqlash uchun lokatsiyangizni yuboring', {
        reply_markup: {
          keyboard: [[{ text: '📍 Geo-joylashuvni yuborish', request_location: true }], [{ text: '⬅️ Orqga' }]],
          resize_keyboard: true,
          one_time_keyboard: true,
        }
      });
      ctx.session = ctx.session || {}; ctx.session.waitingFor = 'nearest_branch';
    } catch {}
  });

  // Orders (user)
  bot.action(/^my_orders$|^orders_page_\d+$|^order_detail_[0-9a-fA-F]{24}$|^back_to_my_orders$/, async (ctx) => {
    const data = ctx.callbackQuery.data;
    if (data === 'my_orders') {
      await showMyOrders(ctx);
    } else {
      await myOrdersCallbackHandler(ctx);
    }
  });

  // Categories/products
  bot.action('show_categories', async (ctx) => { await showCategories(ctx); });
  bot.action(/^category_(.+)$/, async (ctx) => { await showCategoryProducts(ctx); });
  bot.action(/^product_(.+)$/, async (ctx) => { await showProductDetails(ctx); });

  // Cart
  bot.action(/^(add_to_cart_[0-9a-fA-F]{24}|add_cart_[0-9a-fA-F]{24}_\d+)$/, async (ctx) => { await addToCart(ctx); });
  bot.action(/^change_qty_[0-9a-fA-F]{24}_-?\d+$/, async (ctx) => { await changeProductQuantity(ctx); });
  bot.action(/^cart_qty_[0-9a-fA-F]{24}_\d+$/, async (ctx) => { await updateQuantity(ctx); });
  bot.action(/^remove_from_cart_(.+)$/, async (ctx) => { await removeFromCart(ctx); });
  bot.action('show_cart', async (ctx) => { await showCart(ctx); });
  bot.action('clear_cart', async (ctx) => { await clearCart(ctx); });

  // Order processing
  bot.action('start_order', async (ctx) => { await startOrder(ctx); });
  // Avvaldan buyurtma uchun alias: preorder → dine_in oqimi
  bot.action(/^order_type_(delivery|pickup|dine_in|preorder)$/, async (ctx) => { await handleOrderType(ctx); });
  bot.action('dine_in_preorder', async (ctx) => { await handleDineInPreorder(ctx); });
  const orderHandlers = require('../handlers/user/order');
  bot.action(/^choose_branch_(pickup|dine)_[0-9a-fA-F]{24}$/, async (ctx) => {
    try {
      await orderHandlers.handleChooseBranch(ctx);
    } catch (e) {
      console.error('choose_branch handler error:', e);
      await ctx.answerCbQuery('❌ Xatolik');
    }
  });
  bot.action(/^arrival_time_(\d+|1_hour(?:_30)?|2_hours)$/, async (ctx) => { await handleArrivalTime(ctx); });
  bot.action(/^payment_(cash|card|click|payme)$/, async (ctx) => { await handlePaymentMethod(ctx, ctx.match[1]); });
  bot.action('confirm_order', async (ctx) => { await finalizeOrder(ctx); });
  bot.action('finalize_order', async (ctx) => { await finalizeOrder(ctx); });
  bot.action(/^dinein_arrived_(.+)$/, async (ctx) => { await handleDineInArrived(ctx); });

  // Profile
  bot.action('my_profile', async (ctx) => {
    try {
      const user = await User.findOne({ telegramId: ctx.from.id });
      if (!user) return await ctx.answerCbQuery('❌ Foydalanuvchi topilmadi!');
      const profileText = `\n👤 **Profil ma'lumotlari**\n\n📝 **Ism:** ${user.firstName} ${user.lastName || ''}\n📞 **Telefon:** ${user.phone || 'Kiritilmagan'}\n🌐 **Til:** ${user.language}\n📊 **Umumiy buyurtmalar:** ${user.stats.totalOrders}\n💰 **Umumiy xarajat:** ${user.stats.totalSpent.toLocaleString()} so'm`;
      await ctx.editMessageText(profileText, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [[{ text: '🔙 Bosh sahifa', callback_data: 'main_menu' }]] },
      });
    } catch {}
  });

  // About & Contact
  bot.action('about', async (ctx) => {
    const info = `\nℹ️ <b>Ma'lumot</b>\n\n🏪 <b>Oshxona</b> — mazali taomlar va tez yetkazib berish xizmati.\n\n🕒 Ish vaqti: 10:00 – 23:00\n📞 Telefon: +998 90 123 45 67\n📍 Manzil: Toshkent shahri\n🌐 Sayt: https://example.uz\n\nHar qanday taklif va mulohazalaringizni kutamiz!`;
    await ctx.editMessageText(info, { parse_mode: 'HTML', reply_markup: { inline_keyboard: [[{ text: '🔙 Asosiy menyu', callback_data: 'back_to_main' }]] } });
  });
  bot.action('contact', async (ctx) => {
    const text = `\n📞 <b>Bog'lanish</b>\n\nTelefon: +998 90 123 45 67\nTelegram: @oshxona_support\nEmail: support@oshxona.uz\nManzil: Toshkent shahri, Chilonzor\nIjtimoiy tarmoqlar: instagram.com/oshxona`;
    await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: { inline_keyboard: [
      [{ text: '📞 Telefon', callback_data: 'contact_phone' }, { text: '📍 Manzil', callback_data: 'contact_address' }],
      [{ text: '📱 Telegram', callback_data: 'contact_telegram' }, { text: '🌐 Website', callback_data: 'contact_website' }],
      [{ text: '🔙 Asosiy menyu', callback_data: 'back_to_main' }]
    ] } });
  });

  // Admin quick action: picked_up (only for pickup)
  bot.action(/^admin_quick_picked_up_([0-9a-fA-F]{24})$/, async (ctx) => {
    try {
      const orderId = ctx.match[1];
      const { Order } = require('../models');
      const order = await Order.findById(orderId);
      if (!order) return await ctx.answerCbQuery('❌ Buyurtma topilmadi');
      if (order.orderType !== 'pickup') return await ctx.answerCbQuery('❌ Bu amal faqat olib ketish uchun');
      order.status = 'picked_up';
      await order.save();
      // 10 soniyadan so'ng avtomatik completed
      setTimeout(async () => {
        try {
          const fresh = await Order.findById(orderId);
          if (fresh && fresh.status === 'picked_up') {
            fresh.status = 'completed';
            await fresh.save();
          }
        } catch {}
      }, 10000);
      await ctx.answerCbQuery('✅ Olib ketdi');
    } catch {
      await ctx.answerCbQuery('❌ Xatolik');
    }
  });
  bot.action('contact_phone', async (ctx) => { await ctx.answerCbQuery('📞 +998 90 123 45 67'); });
  bot.action('contact_address', async (ctx) => { await ctx.answerCbQuery('📍 Toshkent shahri'); });
  bot.action('contact_telegram', async (ctx) => { await ctx.answerCbQuery('📱 @oshxona_support'); });
  bot.action('contact_website', async (ctx) => { await ctx.answerCbQuery('🌐 https://example.uz'); });

  // Order history (user)
  bot.action('order_history', async (ctx) => {
    try {
      const { Order } = require('../models');
      const orders = await Order.find({ user: ctx.from.id })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('items.product', 'name price');
      if (orders.length === 0) {
        return await ctx.editMessageText(
          '📋 **Buyurtmalar tarixi**\n\nHozircha buyurtmalaringiz yo\'q.',
          {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: [
              [{ text: '🛍️ Buyurtma berish', callback_data: 'show_categories' }],
              [{ text: '🔙 Bosh sahifa', callback_data: 'main_menu' }]
            ] }
          }
        );
      }
      let historyText = '📋 **Buyurtmalar tarixi**\n\n';
      orders.forEach((order, index) => {
        const date = order.createdAt.toLocaleDateString('uz-UZ');
        const status = order.status === 'completed' ? '✅' : order.status === 'pending' ? '⏳' : order.status === 'preparing' ? '👨‍🍳' : '🚚';
        historyText += `${index + 1}. ${status} **#${order.orderId}**\n`;
        historyText += `📅 ${date} | 💰 ${order.totalPrice?.toLocaleString?.() || order.total?.toLocaleString?.() || 0} so'm\n\n`;
      });
      await ctx.editMessageText(historyText, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [[{ text: '🔙 Bosh sahifa', callback_data: 'main_menu' }]] }
      });
    } catch (error) {}
  });

  // Location & Text handlers
  // Faqat user (non-courier) uchun: eng yaqin filial va delivery manzil oqimlari
  bot.on('location', async (ctx) => {
    try {
      console.log('[location] received');
      const user = await User.findOne({ telegramId: ctx.from.id });
      if (!user) return;
      if (user.role === 'courier') return; // kuryer lokatsiyasi global handlerda qayta ishlanadi
      const { latitude, longitude } = ctx.message.location || {};
      // If user requested nearest branch, show details and nearby list (no order flow)
      if (ctx.session?.waitingFor === 'nearest_branch') {
        console.log('[location] mode=nearest_branch');
        await catalogHandlers.handleNearestBranchLocation(ctx, latitude, longitude);
        ctx.session.waitingFor = null;
        return;
      }
      // Delivery address flow
      if (ctx.session?.waitingFor === 'address' && ctx.session.orderType === 'delivery') {
        console.log('[location] mode=delivery');
        ctx.session.orderData = ctx.session.orderData || {};
        ctx.session.orderData.location = { latitude, longitude };

        // Find nearest branch and validate radius
        try {
          const { Branch } = require('../models');
          const geoService = require('../services/geoService');
          const branches = await Branch.find({ isActive: true });
          let nearest = null;
          let bestDist = Infinity;
          for (const b of branches) {
            const bl = b.address?.coordinates?.latitude;
            const bo = b.address?.coordinates?.longitude;
            if (typeof bl === 'number' && typeof bo === 'number') {
              const d = geoService.calculateDistance(bl, bo, latitude, longitude);
              if (d < bestDist) { bestDist = d; nearest = b; }
            }
          }
          if (nearest) {
            const maxKm = Number(nearest.settings?.maxDeliveryDistance ?? 15);
            if (bestDist > maxKm) {
              await ctx.reply(
                `❌ Manzil yetkazib berish radiusidan tashqarida.\n\nEng yaqin filial: ${nearest.name}\nMasofa: ${bestDist.toFixed(2)} km\nLimit: ${maxKm} km\n\nIltimos, boshqa manzil yuboring yoki "Olib ketish" turini tanlang.`
              );
              // keep waitingFor='address' to let user resend location
              return;
            }
            // within radius → bind branch
            ctx.session.orderData.branch = String(nearest._id);
          }
        } catch (e) {
          // If anything fails, continue without blocking the flow
          console.error('Nearest branch/radius validation error:', e?.message || e);
        }
        // close reply keyboard and continue
        try { await ctx.reply('✅ Lokatsiya qabul qilindi', { reply_markup: { remove_keyboard: true } }); } catch {}
        ctx.session.waitingFor = null;
        if (user.phone) await askForPaymentMethod(ctx); else await require('../handlers/user/order').askForPhone(ctx);
      }
      // Fallback: if no specific waitingFor flag, treat as nearest-branch lookup (faqat userlar uchun)
      else {
        console.log('[location] mode=fallback-nearest');
        await catalogHandlers.handleNearestBranchLocation(ctx, latitude, longitude);
        if (ctx.session) ctx.session.waitingFor = null;
      }
    } catch {}
  });
  bot.on('contact', async (ctx) => {
    try {
      const contact = ctx.message && ctx.message.contact;
      const phone = contact && contact.phone_number ? contact.phone_number : '';
      if (!phone) return;
      await handlePhoneInput(ctx, phone);
    } catch {}
  });
  bot.on('text', async (ctx) => {
    try {
      if (ctx.message.text.startsWith('/')) return;
      if (ctx.session.waitingFor === 'phone') {
        const phone = ctx.message.text.trim();
        if (!/^\+998\d{9}$/.test(phone)) return await ctx.reply('❌ Telefon raqamni to\'g\'ri formatda kiriting! (+998901234567)');
        ctx.session.phone = phone;
        ctx.session.waitingFor = null;
        await User.findOneAndUpdate({ telegramId: ctx.from.id }, { phone });
        await ctx.reply('✅ Telefon raqami saqlandi!');
        return;
      }
      if (ctx.session.waitingFor && ctx.session.waitingFor.startsWith('dinein_table_')) {
        const handled = await handleDineInTableInput(ctx);
        if (handled) return;
      }
      await handleTextMessage(ctx);
    } catch {}
  });
};


