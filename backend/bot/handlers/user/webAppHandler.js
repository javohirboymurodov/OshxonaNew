// WebApp Data Handler - backend/bot/handlers/user/webAppHandler.js
const { User, Cart, Product } = require('../../../models');
const { showCart } = require('./cart');

/**
 * WebApp dan kelayotgan ma'lumotlarni qayta ishlash
 * @param {Object} ctx - Telegraf context
 */
async function handleWebAppData(ctx) {
  try {
    console.log('🌐 WebApp data received:', {
      updateType: ctx.updateType,
      webAppData: ctx.webAppData,
      message: ctx.message
    });

    // WebApp dan kelayotgan ma'lumotni olish
    const webAppData = ctx.webAppData || ctx.message?.web_app_data;
    
    if (!webAppData || !webAppData.data) {
      console.warn('⚠️ WebApp data empty or invalid');
      return await ctx.reply('❌ Ma\'lumot topilmadi!');
    }

    let parsedData;
    try {
      parsedData = JSON.parse(webAppData.data);
      console.log('📦 Parsed WebApp data:', parsedData);
    } catch (parseError) {
      console.error('❌ WebApp data parse error:', parseError);
      return await ctx.reply('❌ Ma\'lumotni o\'qishda xatolik!');
    }

    const { telegramId, items } = parsedData;

    // Telegram ID tekshirish
    if (!telegramId || telegramId != ctx.from.id) {
      console.warn('⚠️ Telegram ID mismatch:', { received: telegramId, expected: ctx.from.id });
      return await ctx.reply('❌ Foydalanuvchi ID mos emas!');
    }

    // Items mavjudligini tekshirish
    if (!items || !Array.isArray(items) || items.length === 0) {
      console.warn('⚠️ No items in WebApp data:', items);
      return await ctx.reply('❌ Mahsulotlar ro\'yxati bo\'sh!');
    }

    console.log('🛒 Processing cart items:', items);

    // User ni topish
    const user = await User.findOne({ telegramId });
    if (!user) {
      console.error('❌ User not found:', telegramId);
      return await ctx.reply('❌ Foydalanuvchi topilmadi!');
    }

    // Mavjud savatni topish yoki yangi yaratish
    let cart = await Cart.findOne({ user: user._id, isActive: true });
    if (!cart) {
      cart = new Cart({
        user: user._id,
        items: [],
        isActive: true
      });
    }

    // Savatni yangilash - WebApp'dan kelgan mahsulotlarni qo'shish
    let addedCount = 0;
    let updatedCount = 0;

    for (const item of items) {
      const { productId, quantity } = item;

      // Mahsulot mavjudligini tekshirish
      const product = await Product.findById(productId);
      if (!product || !product.isActive) {
        console.warn('⚠️ Product not found or inactive:', productId);
        continue;
      }

      // Savatda mavjud elementni topish
      const existingItemIndex = cart.items.findIndex(
        cartItem => cartItem.product.toString() === productId
      );

      if (existingItemIndex >= 0) {
        // Mavjud element - miqdorni yangilash (qo'shish emas, to'liq yangilash)
        const oldQuantity = cart.items[existingItemIndex].quantity;
        cart.items[existingItemIndex].quantity = quantity;
        cart.items[existingItemIndex].productName = product.name;
        cart.items[existingItemIndex].price = product.price;
        cart.items[existingItemIndex].updatedAt = new Date();
        updatedCount++;
        
        console.log(`🔄 Updated product in cart: ${product.name} (${oldQuantity} -> ${quantity})`);
      } else {
        // Yangi element - qo'shish
        cart.items.push({
          product: productId,
          productName: product.name,
          quantity: quantity,
          price: product.price,
          addedAt: new Date()
        });
        addedCount++;
        
        console.log(`➕ Added new product to cart: ${product.name} (${quantity})`);
      }
    }

    // Bo'sh miqdorli elementlarni olib tashlash
    cart.items = cart.items.filter(item => item.quantity > 0);

    // Savatni saqlash
    cart.updatedAt = new Date();
    await cart.save();

    console.log('✅ Cart updated successfully:', {
      userId: user._id,
      totalItems: cart.items.length,
      addedCount,
      updatedCount
    });

    // Muvaffaqiyat xabari
    let message = '✅ **Buyurtma WebApp\'dan muvaffaqiyatli qabul qilindi!**\n\n';
    
    if (addedCount > 0) {
      message += `➕ ${addedCount} ta yangi mahsulot qo'shildi\n`;
    }
    
    if (updatedCount > 0) {
      message += `🔄 ${updatedCount} ta mahsulot yangilandi\n`;
    }
    
    message += `\n🛒 Jami savatda: ${cart.items.length} ta mahsulot\n`;
    message += `💰 Umumiy narx: ${cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0).toLocaleString()} so'm\n\n`;
    message += '👇 Savatni ko\'rish va buyurtmani davom ettirish uchun pastdagi tugmani bosing:';

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🛒 Savatni ko\'rish', callback_data: 'show_cart' }],
          [{ text: '📝 Buyurtma berish', callback_data: 'checkout' }],
          [{ text: '🔙 Asosiy menyu', callback_data: 'back_to_main' }]
        ]
      }
    });

  } catch (error) {
    console.error('❌ WebApp data handler error:', error);
    await ctx.reply('❌ Buyurtmani qayta ishlashda xatolik yuz berdi. Qaytadan urinib ko\'ring.');
  }
}

module.exports = {
  handleWebAppData
};