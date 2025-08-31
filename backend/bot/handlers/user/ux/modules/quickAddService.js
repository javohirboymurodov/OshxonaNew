const { User, Product, Cart } = require('../../../../../models');

/**
 * Quick Add Service
 * Tezkor qo'shish xizmati
 */

class QuickAddService {
  /**
   * Mahsulotni tezkor qo'shish
   * @param {Object} ctx - Telegraf context
   */
  static async quickAddProduct(ctx) {
    try {
      const callbackData = ctx.callbackQuery?.data || '';
      console.log('🔍 Quick add product callback:', callbackData);
      
      const productIdMatch = callbackData.match(/^quick_add_(.+)$/);
      
      if (!productIdMatch) {
        return ctx.answerCbQuery('❌ Mahsulot ID topilmadi');
      }

      const productId = productIdMatch[1];
      const telegramId = ctx.from.id;
      
      console.log('🔍 Quick add - ProductID:', productId, 'User:', telegramId);
      
      const user = await User.findOne({ telegramId });
      if (!user) {
        return ctx.answerCbQuery('❌ Foydalanuvchi topilmadi');
      }

      const product = await Product.findById(productId);
      console.log('🔍 Product found:', product ? {
        id: product._id,
        name: product.name,
        isActive: product.isActive,
        isAvailable: product.isAvailable,
        price: product.price
      } : 'null');
      
      // Check availability - if isAvailable is undefined, treat as true
      const isAvailable = product.isAvailable !== false;
      
      if (!product || !product.isActive || !isAvailable) {
        console.log('❌ Product not available:', {
          exists: !!product,
          isActive: product?.isActive,
          isAvailable: product?.isAvailable,
          computed_isAvailable: isAvailable
        });
        return ctx.answerCbQuery('❌ Mahsulot mavjud emas', { show_alert: true });
      }

      // Add to cart
      let cart = await Cart.findOne({ user: user._id, isActive: true });
      console.log('🔍 Cart before:', cart ? `${cart.items.length} items` : 'new cart');
      
      if (!cart) {
        cart = new Cart({ user: user._id, items: [], isActive: true });
      }

      const existingItem = cart.items.find(item => 
        item.product.toString() === productId
      );

      if (existingItem) {
        existingItem.quantity += 1;
        existingItem.totalPrice = existingItem.price * existingItem.quantity;
        console.log('🔍 Updated existing item quantity:', existingItem.quantity);
      } else {
        cart.items.push({
          product: productId,
          productName: product.name,
          quantity: 1,
          price: product.price,
          totalPrice: product.price * 1
        });
        console.log('🔍 Added new item to cart:', product.name);
      }

      await cart.save();
      console.log('🔍 Cart saved. Total items:', cart.items.length);

      await ctx.answerCbQuery(`✅ ${product.name} savatga qo'shildi!`);

      // Update message with cart info
      const cartTotal = cart.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
      const cartCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

      const message = `✅ <b>Mahsulot qo'shildi!</b>\n\n` +
        `🛒 Savatda: ${cartCount} ta mahsulot\n` +
        `💰 Jami: ${cartTotal.toLocaleString()} so'm\n\n` +
        `Davom etasizmi yoki buyurtma berasizmi?`;

      const keyboard = {
        inline_keyboard: [
          [
            { text: '🛒 Savatni ko\'rish', callback_data: 'show_cart' },
            { text: '📝 Buyurtma berish', callback_data: 'checkout' }
          ],
          [
            { text: '➕ Yana qo\'shish', callback_data: 'quick_order' },
            { text: '🛍️ Katalog', callback_data: 'show_categories' }
          ],
          [
            { text: '🔙 Asosiy menyu', callback_data: 'back_to_main' }
          ]
        ]
      };

      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });

    } catch (error) {
      console.error('Quick add product error:', error);
      ctx.answerCbQuery('❌ Xatolik yuz berdi');
    }
  }
}

module.exports = QuickAddService;