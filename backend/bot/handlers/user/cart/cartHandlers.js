/**
 * Cart Handlers
 * Savat handlerlari
 */

const { Product } = require('../../../../models');
const { cartKeyboard } = require('../../../user/keyboards');
const cartOps = require('./cartOperations');

/**
 * Savatga mahsulot qo'shish
 */
async function addToCart(ctx) {
  try {
    const data = ctx.callbackQuery.data.split('_');
    let productId = '';
    let quantity = 1;

    // Callback formatlarini qo'llab-quvvatlash
    if (data[0] === 'add' && data[1] === 'cart') {
      productId = data[2];
      quantity = parseInt(data[3], 10) || 1;
    } else if (data[0] === 'add' && data[1] === 'to' && data[2] === 'cart') {
      productId = data.slice(3).join('_');
      quantity = 1;
    } else {
      productId = data[data.length - 1];
      quantity = 1;
    }

    // Foydalanuvchini topish
    const user = await cartOps.findUserByTelegramId(ctx.from.id);
    if (!user) {
      return await ctx.answerCbQuery('Foydalanuvchi topilmadi!');
    }

    // Mahsulotni tekshirish
    const userBranch = user.selectedBranch || user.branch;
    const { product, error } = await cartOps.findAndValidateProduct(productId, userBranch);
    
    if (error) {
      return await ctx.answerCbQuery(error);
    }

    // Savatni topish yoki yaratish
    const cart = await cartOps.findOrCreateCart(user._id);
    
    // Mahsulotni qo'shish
    await cartOps.addProductToCart(cart, product, quantity);
    
    await ctx.answerCbQuery(`✅ ${product.name} savatga qo'shildi!`);
    
  } catch (error) {
    console.error('❌ Add to cart error:', error);
    await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
  }
}

/**
 * Mahsulot miqdorini yangilash
 */
async function updateQuantity(ctx) {
  try {
    const data = ctx.callbackQuery.data.split('_');
    const productId = data[2];
    const newQuantity = parseInt(data[3], 10);

    const user = await cartOps.findUserByTelegramId(ctx.from.id);
    if (!user) {
      return await ctx.answerCbQuery('Foydalanuvchi topilmadi!');
    }

    const cart = await cartOps.findOrCreateCart(user._id);
    await cartOps.updateProductQuantity(cart, productId, newQuantity);

    const product = await Product.findById(productId);
    const message = newQuantity > 0 
      ? `✅ ${product?.name || 'Mahsulot'} miqdori yangilandi: ${newQuantity}`
      : `🗑️ ${product?.name || 'Mahsulot'} savatdan olib tashlandi`;

    await ctx.answerCbQuery(message);
    
  } catch (error) {
    console.error('❌ Update quantity error:', error);
    await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
  }
}

/**
 * Savatdan mahsulot o'chirish
 */
async function removeFromCart(ctx) {
  try {
    const data = ctx.callbackQuery.data.split('_');
    const productId = data[2];

    const user = await cartOps.findUserByTelegramId(ctx.from.id);
    if (!user) {
      return await ctx.answerCbQuery('Foydalanuvchi topilmadi!');
    }

    const cart = await cartOps.findOrCreateCart(user._id);
    await cartOps.removeProductFromCart(cart, productId);

    const product = await Product.findById(productId);
    await ctx.answerCbQuery(`🗑️ ${product?.name || 'Mahsulot'} olib tashlandi!`);
    
  } catch (error) {
    console.error('❌ Remove from cart error:', error);
    await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
  }
}

/**
 * Savatni ko'rish
 */
async function showCart(ctx) {
  try {
    const user = await cartOps.findUserByTelegramId(ctx.from.id);
    if (!user) {
      return await ctx.reply('Foydalanuvchi topilmadi!');
    }

    const cart = await cartOps.findOrCreateCart(user._id);
    
    if (cart.items.length === 0) {
      return await ctx.reply('🛒 Savat bo\'sh!\n\nMahsulot qo\'shish uchun katalogga o\'ting.', {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🛍️ Katalog', callback_data: 'catalog' }]
          ]
        }
      });
    }

    // Mahsulot ma'lumotlarini olish
    const productIds = cart.items.map(item => item.product);
    const products = await Product.find({ _id: { $in: productIds } });
    
    const message = cartOps.formatCartMessage(cart, products);
    const keyboard = cartKeyboard(cart.items);

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
    
  } catch (error) {
    console.error('❌ Show cart error:', error);
    await ctx.reply('❌ Savatni ko\'rishda xatolik!');
  }
}

/**
 * Savatni tozalash
 */
async function clearCart(ctx) {
  try {
    const user = await cartOps.findUserByTelegramId(ctx.from.id);
    if (!user) {
      return await ctx.answerCbQuery('Foydalanuvchi topilmadi!');
    }

    const cart = await cartOps.findOrCreateCart(user._id);
    
    if (cart.items.length === 0) {
      return await ctx.answerCbQuery('Savat allaqachon bo\'sh!');
    }

    await cartOps.clearCart(cart);
    await ctx.answerCbQuery('🗑️ Savat tozalandi!');
    
  } catch (error) {
    console.error('❌ Clear cart error:', error);
    await ctx.answerCbQuery('❌ Xatolik yuz berdi!');
  }
}

module.exports = {
  addToCart,
  updateQuantity,
  removeFromCart,
  showCart,
  clearCart
};