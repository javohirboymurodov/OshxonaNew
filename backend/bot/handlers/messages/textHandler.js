const { User, Order, Cart, Branch, Product } = require('../../../models');
const { handleTextMessage } = require('../user/input');

/**
 * Text Message Handler
 * Matn xabar handleri
 */

/**
 * Matn xabarini qayta ishlash
 * @param {Object} ctx - Telegraf context
 */
async function handleText(ctx) {
  try {
    const text = ctx.message.text;
    console.log(`📝 Text message received: "${text}" from ${ctx.from.id}`);
    console.log(`🔍 Session waitingFor: ${ctx.session?.waitingFor}`);
    console.log(`🔍 Session object:`, JSON.stringify(ctx.session, null, 2));
    
    // Test message - always respond to "test"
    if (text.toLowerCase() === 'test') {
      await ctx.reply('✅ Message handlers are working! Session working too.');
      return;
    }
    
    const user = await User.findOne({ telegramId: ctx.from.id });
    
    if (!user) {
      console.log('❌ User not found for text message');
      return;
    }
    
    // Table number input for dine-in arrival
    if (ctx.session?.waitingFor === 'table_number') {
      await handleTableNumber(ctx, user, text);
      return;
    }

    // Delivery address text input
    if (ctx.session?.waitingFor === 'delivery_address_text') {
      await handleDeliveryAddress(ctx, user, text);
      return;
    }

    // Feedback yozish jarayoni
    if (ctx.session?.waitingFor === 'feedback' && ctx.session?.feedbackOrderId) {
      await handleFeedback(ctx, user, text);
      return;
    }
    
    // Boshqa text message handlerlar
    await handleTextMessage(ctx, text);
  } catch (error) {
    console.error('❌ text handler error:', error);
  }
}

/**
 * Stol raqamini qayta ishlash
 * @param {Object} ctx - Telegraf context
 * @param {Object} user - User object
 * @param {string} text - stol raqami
 */
async function handleTableNumber(ctx, user, text) {
  try {
    console.log('🎯 Processing table number:', text);
    const tableNumber = text.trim();
    
    // Validation
    if (!tableNumber) {
      await ctx.reply('❌ Stol raqamini kiriting');
      return;
    }
    
    // Check if it's a valid number or alphanumeric (A1, B5, etc.)
    if (!/^[A-Za-z]?\d+[A-Za-z]?$/.test(tableNumber)) {
      await ctx.reply('❌ Stol raqami noto\'g\'ri formatda!\n\nMisol: 15, A5, 23B, 101');
      return;
    }
    
    // Check reasonable range (1-999)
    const numericPart = tableNumber.replace(/[A-Za-z]/g, '');
    if (parseInt(numericPart) > 999 || parseInt(numericPart) < 1) {
      await ctx.reply('❌ Stol raqami 1 dan 999 gacha bo\'lishi kerak!');
      return;
    }
    
    ctx.session.waitingFor = null;
    
    // Find the user's latest dine-in order and update table number
    let latestOrder = null;
    try {
      latestOrder = await Order.findOne({ 
        user: user._id, 
        orderType: 'dine_in',
        status: { $in: ['pending', 'confirmed', 'preparing', 'ready'] }
      }).sort({ createdAt: -1 });
      
      if (latestOrder) {
        latestOrder.dineInInfo = latestOrder.dineInInfo || {};
        latestOrder.dineInInfo.tableNumber = tableNumber;
        await latestOrder.save();
        console.log(`✅ Table number ${tableNumber} saved to order ${latestOrder.orderId}`);
      }
    } catch (orderError) {
      console.error('❌ Order update error:', orderError);
    }
    
    // Notify admins about customer arrival
    const message = `🏁 **Mijoz keldi!**\n\n👤 ${user.firstName || 'Mijoz'}\n📱 ${user.phone || 'Telefon yo\'q'}\n🪑 Stol: ${tableNumber}\n⏰ ${new Date().toLocaleTimeString('uz-UZ')}`;
    
    // Send to admin panel via socket
    try {
      const SocketManager = require('../../../config/socketConfig');
      if (SocketManager.io) {
        SocketManager.io.emit('customer_arrived', {
          customer: {
            name: user.firstName || 'Mijoz',
            phone: user.phone,
            telegramId: user.telegramId
          },
          tableNumber,
          timestamp: new Date(),
          orderId: latestOrder?.orderId
        });
      }
    } catch (socketError) {
      console.error('❌ Socket notification error:', socketError);
    }
    
    await ctx.reply(
      `✅ **Kelganingiz tasdiqlandi!**\n\n🪑 Stol raqami: ${tableNumber}\n⏰ Vaqt: ${new Date().toLocaleTimeString('uz-UZ')}\n\n🎉 Administratorga xabar berildi!\nTez orada sizga xizmat ko'rsatiladi.`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🏠 Bosh sahifa', callback_data: 'back_to_main' }],
            [{ text: '📋 Mening buyurtmalarim', callback_data: 'my_orders' }]
          ]
        }
      }
    );
    
    console.log(`✅ Customer arrived: ${user.firstName} at table ${tableNumber}`);
  } catch (error) {
    console.error('❌ Table number processing error:', error);
    await ctx.reply('❌ Stol raqamini qayta ishlashda xatolik');
  }
}

/**
 * Yetkazib berish manzilini qayta ishlash
 * @param {Object} ctx - Telegraf context
 * @param {Object} user - User object
 * @param {string} text - manzil matni
 */
async function handleDeliveryAddress(ctx, user, text) {
  try {
    if (text === '🔙 Bekor qilish') {
      ctx.session.waitingFor = null;
      await ctx.reply('❌ Buyurtma bekor qilindi', {
        reply_markup: { remove_keyboard: true }
      });
      return;
    }
    
    // Save address text
    ctx.session.orderData = ctx.session.orderData || {};
    ctx.session.orderData.address = text;
    ctx.session.waitingFor = null;
    
    // Check if user has items in cart
    const telegramId = ctx.from.id;
    const userWithCart = await User.findOne({ telegramId });
    let cart = null;
    
    if (userWithCart) {
      cart = await Cart.findOne({ user: userWithCart._id, isActive: true });
    }

    // If cart has items, proceed to payment
    if (cart && cart.items && cart.items.length > 0) {
      console.log('✅ Cart has items, proceeding to payment flow');
      await ctx.reply('✅ Manzil qabul qilindi!\n\nTo\'lov usulini tanlang:', {
        reply_markup: { remove_keyboard: true }
      });
      const PaymentFlow = require(require.resolve('../user/order/paymentFlow'));
      await PaymentFlow.askForPaymentMethod(ctx);
      return;
    }

    // If no items in cart, show product selection
    await ctx.reply('✅ Manzil qabul qilindi!\n\nEndi mahsulotlarni tanlang:', {
      reply_markup: {
        remove_keyboard: true,
        inline_keyboard: [
          [{ text: '🛒 Tezkor buyurtma', callback_data: 'quick_order' }],
          [{ text: '📋 Katalog', callback_data: 'show_catalog' }],
          [{ text: '🎉 Aksiyalar', callback_data: 'show_promotions' }],
          [{ text: '🔙 Orqaga', callback_data: 'start_order' }]
        ]
      }
    });
    
    console.log('✅ Address text processed:', text);
  } catch (error) {
    console.error('❌ Address text processing error:', error);
    await ctx.reply('❌ Manzilni qayta ishlashda xatolik');
  }
}

/**
 * Feedback ni qayta ishlash
 * @param {Object} ctx - Telegraf context
 * @param {Object} user - User object
 * @param {string} text - feedback matni
 */
async function handleFeedback(ctx, user, text) {
  try {
    const orderId = ctx.session.feedbackOrderId;
    
    // Order ni topish va tekshirish
    const order = await Order.findById(orderId);
    if (!order || order.user?.toString() !== user._id.toString()) {
      await ctx.reply('❌ Buyurtma topilmadi yoki ruxsat yo\'q');
      return;
    }
    
    // Feedback ni saqlash
    order.feedback = text;
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
}

/**
 * WebApp data ni qayta ishlash
 * @param {Object} ctx - Telegraf context
 */
async function handleWebAppData(ctx) {
  try {
    console.log('🎯 WebApp data handler called!');
    console.log('📱 Full context:', JSON.stringify(ctx.message, null, 2));
    
    const webAppData = ctx.message.web_app_data;
    console.log('📱 WebApp data received:', webAppData);
    
    let cartData;
    try {
      cartData = JSON.parse(webAppData.data);
      console.log('📦 Parsed cart data:', cartData);
    } catch (e) {
      console.error('❌ Failed to parse WebApp data:', e);
      return ctx.reply('❌ WebApp ma\'lumotini o\'qishda xatolik!');
    }
    
    const { telegramId, items } = cartData;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return ctx.reply('🛒 Savat bo\'sh! Iltimos, mahsulot tanlang.');
    }
    
    // Mahsulotlarni olish va savatga qo'shish (branch'siz)
    let totalAmount = 0;
    const cartItems = [];
    
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product || !product.isActive || !product.isAvailable) {
        console.log(`⚠️ Product ${item.productId} not available`);
        continue;
      }
      
      const price = product.price;
      const itemTotal = price * item.quantity;
      totalAmount += itemTotal;
      
      cartItems.push({
        product: product._id,
        productName: product.name,
        quantity: item.quantity,
        price: price,
        totalPrice: itemTotal
      });
    }
    
    if (cartItems.length === 0) {
      return ctx.reply('❌ Hech qanday mavjud mahsulot topilmadi!');
    }
    

    // User'ni topish
    const user = await User.findOne({ telegramId: ctx.from.id });
    if (!user) {
      return ctx.reply('❌ Foydalanuvchi topilmadi! /start buyrug\'ini yuboring.');
    }
    
    // Savatni yaratish yoki yangilash (branch'siz)
    let cart = await Cart.findOne({ user: user._id });
    if (!cart) {
      cart = new Cart({
        user: user._id,
        items: cartItems,
        total: totalAmount
      });
    } else {
      cart.items = cartItems;
      cart.total = totalAmount;
    }
    
    await cart.save();
    
    // Buyurtma turini tanlash
    const orderTypeMessage = `🛒 <b>Savat yangilandi!</b>\n\n` +
      `📦 Mahsulotlar: ${cartItems.length} ta\n` +
      `💰 Jami: ${totalAmount.toLocaleString()} so'm\n\n` +
      `🎯 <b>Buyurtma turini tanlang:</b>`;
    
    await ctx.reply(orderTypeMessage, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🚚 Yetkazib berish', callback_data: 'start_delivery' }],
          [{ text: '🏃 Olib ketish', callback_data: 'start_pickup' }],
          [{ text: '🍽️ Restoranda ovqatlanish', callback_data: 'start_dine_in' }],
          [{ text: '🛒 Savatni ko\'rish', callback_data: 'show_cart' }]
        ]
      }
    });
    
  } catch (error) {
    console.error('❌ WebApp data handler error:', error);
    await ctx.reply('❌ Xatolik yuz berdi! Iltimos, qaytadan urinib ko\'ring.');
  }
}

/**
 * Text handlerlarini bot ga ulash
 * @param {Object} bot - Telegraf bot instance
 */
function registerTextHandlers(bot) {
  bot.on('text', handleText);
  bot.on('web_app_data', handleWebAppData);
}

module.exports = {
  handleText,
  handleTableNumber,
  handleDeliveryAddress,
  handleFeedback,
  handleWebAppData,
  registerTextHandlers
};git 