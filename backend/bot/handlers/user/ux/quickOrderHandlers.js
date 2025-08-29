const { User, Cart, Product } = require('../../../../models');
const MobileUXService = require('./mobileOptimizations');
const Favorite = require('../../../../models/Favorite');

const quickOrderHandlers = {
  // Show quick order menu
  async showQuickOrder(ctx) {
    try {
      const telegramId = ctx.from.id;
      const keyboard = await MobileUXService.getQuickOrderKeyboard(telegramId);
      
      const message = `⚡ <b>Tezkor buyurtma</b>\n\n` +
        `🔥 Eng mashhur mahsulotlardan tanlang\n` +
        `📋 Oldingi buyurtmalaringizni takrorlang\n` +
        `❤️ Sevimli mahsulotlaringizni qo'shing`;

      const messageFunction = ctx.callbackQuery ? 'editMessageText' : 'reply';
      await ctx[messageFunction](message, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });

    } catch (error) {
      console.error('Show quick order error:', error);
      ctx.answerCbQuery('❌ Xatolik yuz berdi');
    }
  },

  // Show popular products
  async showPopularProducts(ctx) {
    try {
      const popularProducts = await MobileUXService.getPopularProducts(6);
      
      if (popularProducts.length === 0) {
        return ctx.editMessageText(
          '😔 Hozirda mashhur mahsulotlar mavjud emas\n\nTo\'liq katalogni ko\'ring:',
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: '🛍️ Katalog', callback_data: 'show_categories' }],
                [{ text: '🔙 Orqaga', callback_data: 'quick_order' }]
              ]
            }
          }
        );
      }

      let message = `🔥 <b>Eng mashhur mahsulotlar</b>\n\n`;
      
      const keyboard = {
        inline_keyboard: []
      };

      popularProducts.forEach((product, index) => {
        message += `${index + 1}. <b>${product.name}</b>\n`;
        message += `   💰 ${product.price.toLocaleString()} so'm\n`;
        message += `   📊 ${product.orderCount} marta buyurtma qilingan\n\n`;

        keyboard.inline_keyboard.push([
          { 
            text: `➕ ${product.name}`, 
            callback_data: `quick_add_${product._id}` 
          }
        ]);
      });

      keyboard.inline_keyboard.push([
        { text: '🛍️ To\'liq katalog', callback_data: 'show_categories' }
      ]);
      keyboard.inline_keyboard.push([
        { text: '🔙 Tezkor buyurtma', callback_data: 'quick_order' }
      ]);

      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });

    } catch (error) {
      console.error('Show popular products error:', error);
      ctx.answerCbQuery('❌ Xatolik yuz berdi');
    }
  },

  // Show fast preparation products
  async showFastProducts(ctx) {
    try {
      const fastProducts = await MobileUXService.getFastProducts(6);
      
      if (fastProducts.length === 0) {
        return ctx.editMessageText(
          '😔 Hozirda tez tayyorlanadigan mahsulotlar mavjud emas\n\nTo\'liq katalogni ko\'ring:',
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: '🛍️ Katalog', callback_data: 'show_categories' }],
                [{ text: '🔙 Orqaga', callback_data: 'quick_order' }]
              ]
            }
          }
        );
      }

      let message = `⚡ <b>Tez tayyorlanadigan mahsulotlar</b>\n\n`;
      
      const keyboard = {
        inline_keyboard: []
      };

      fastProducts.forEach((product, index) => {
        message += `${index + 1}. <b>${product.name}</b>\n`;
        message += `   💰 ${product.price.toLocaleString()} so'm\n`;
        if (product.preparationTime) {
          message += `   ⏱️ ${product.preparationTime} daqiqa\n`;
        }
        message += '\n';

        keyboard.inline_keyboard.push([
          { 
            text: `➕ ${product.name}`, 
            callback_data: `quick_add_${product._id}` 
          }
        ]);
      });

      keyboard.inline_keyboard.push([
        { text: '🛍️ To\'liq katalog', callback_data: 'show_categories' }
      ]);
      keyboard.inline_keyboard.push([
        { text: '🔙 Tezkor buyurtma', callback_data: 'quick_order' }
      ]);

      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });

    } catch (error) {
      console.error('Show fast products error:', error);
      ctx.answerCbQuery('❌ Xatolik yuz berdi');
    }
  },

  // Quick add product to cart
  async quickAddProduct(ctx) {
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
  },

  // Add product to favorites
  async addToFavorites(ctx) {
    try {
      const callbackData = ctx.callbackQuery?.data || '';
      const productIdMatch = callbackData.match(/^add_favorite_(.+)$/);
      
      if (!productIdMatch) {
        return ctx.answerCbQuery('❌ Mahsulot ID topilmadi');
      }

      const productId = productIdMatch[1];
      const telegramId = ctx.from.id;
      
      const user = await User.findOne({ telegramId });
      if (!user) {
        return ctx.answerCbQuery('❌ Foydalanuvchi topilmadi');
      }

      const product = await Product.findById(productId);
      if (!product) {
        return ctx.answerCbQuery('❌ Mahsulot topilmadi');
      }

      // Check if already in favorites
      const existingFavorite = await Favorite.findOne({
        user: user._id,
        product: productId
      });

      if (existingFavorite) {
        return ctx.answerCbQuery('❤️ Mahsulot allaqachon sevimlilarda');
      }

      // Add to favorites
      const favorite = new Favorite({
        user: user._id,
        product: productId
      });
      await favorite.save();

      await ctx.answerCbQuery(`❤️ ${product.name} sevimlilarga qo'shildi!`);

    } catch (error) {
      console.error('Add to favorites error:', error);
      ctx.answerCbQuery('❌ Xatolik yuz berdi');
    }
  },

  // Show user's favorites
  async showFavorites(ctx) {
    try {
      const telegramId = ctx.from.id;
      const user = await User.findOne({ telegramId });
      
      if (!user) {
        return ctx.answerCbQuery('❌ Foydalanuvchi topilmadi');
      }

      const favorites = await Favorite.find({ user: user._id })
        .populate('product', 'name price isActive isAvailable')
        .sort({ createdAt: -1 });

      if (favorites.length === 0) {
        return ctx.editMessageText(
          '😔 <b>Sevimli mahsulotlaringiz yo\'q</b>\n\n' +
          'Mahsulotlarni ko\'rib, ❤️ tugmasini bosing!',
          {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [{ text: '🛍️ Katalog', callback_data: 'show_categories' }],
                [{ text: '🔙 Asosiy menyu', callback_data: 'back_to_main' }]
              ]
            }
          }
        );
      }

      let message = `❤️ <b>Sevimli mahsulotlaringiz</b>\n\n`;
      const keyboard = { inline_keyboard: [] };

      favorites.forEach((favorite, index) => {
        const product = favorite.product;
        // Check availability - if isAvailable is undefined, treat as true
        const isAvailable = product.isAvailable !== false;
        if (product && product.isActive && isAvailable) {
          message += `${index + 1}. <b>${product.name}</b>\n`;
          message += `   💰 ${product.price.toLocaleString()} so'm\n\n`;

          keyboard.inline_keyboard.push([
            { 
              text: `➕ ${product.name}`, 
              callback_data: `quick_add_${product._id}` 
            },
            { 
              text: '🗑️', 
              callback_data: `remove_favorite_${product._id}` 
            }
          ]);
        }
      });

      keyboard.inline_keyboard.push([
        { text: '🛍️ Katalog', callback_data: 'show_categories' }
      ]);
      keyboard.inline_keyboard.push([
        { text: '🔙 Asosiy menyu', callback_data: 'back_to_main' }
      ]);

      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });

    } catch (error) {
      console.error('Show favorites error:', error);
      ctx.answerCbQuery('❌ Xatolik yuz berdi');
    }
  },

  // Remove from favorites
  async removeFromFavorites(ctx) {
    try {
      const callbackData = ctx.callbackQuery?.data || '';
      const productIdMatch = callbackData.match(/^remove_favorite_(.+)$/);
      
      if (!productIdMatch) {
        return ctx.answerCbQuery('❌ Mahsulot ID topilmadi');
      }

      const productId = productIdMatch[1];
      const telegramId = ctx.from.id;
      
      const user = await User.findOne({ telegramId });
      if (!user) {
        return ctx.answerCbQuery('❌ Foydalanuvchi topilmadi');
      }

      await Favorite.findOneAndDelete({
        user: user._id,
        product: productId
      });

      await ctx.answerCbQuery('🗑️ Sevimlilardan o\'chirildi');
      
      // Refresh favorites list
      await this.showFavorites(ctx);

    } catch (error) {
      console.error('Remove from favorites error:', error);
      ctx.answerCbQuery('❌ Xatolik yuz berdi');
    }
  }
};

module.exports = quickOrderHandlers;