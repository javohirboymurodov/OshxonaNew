const { User, Product, Cart } = require('../../models');
const { cartKeyboard } = require('../../keyboards/userKeyboards');

async function addToCart(ctx) {
  try {
    const data = ctx.callbackQuery.data.split('_');
    let productId = '';
    let quantity = 1;

    // Supported callback formats:
    // - add_cart_<productId>_<qty>
    // - add_to_cart_<productId>
    if (data[0] === 'add' && data[1] === 'cart') {
      productId = data[2];
      quantity = parseInt(data[3], 10) || 1;
    } else if (data[0] === 'add' && data[1] === 'to' && data[2] === 'cart') {
      productId = data[3];
      quantity = 1;
    } else {
      // Fallback: last segment as productId
      productId = data[data.length - 1];
      quantity = 1;
    }

    // Foydalanuvchini bazadan olish
    const telegramId = ctx.from.id;
    const user = await User.findOne({ telegramId });
    if (!user) {
      return await ctx.answerCbQuery('Foydalanuvchi topilmadi!');
    }

    const product = await Product.findById(productId);
    if (!product) {
      return await ctx.answerCbQuery('Mahsulot topilmadi!');
    }

    if (!product.isAvailable) {
      return await ctx.answerCbQuery('❌ Mahsulot hozirda mavjud emas!');
    }

    let cart = await Cart.findOne({ user: user._id, isActive: true });

    if (!cart) {
      cart = new Cart({
        user: user._id,
        items: [],
        isActive: true
      });
    }

    // Savatda mahsulot bor-yo'qligini tekshirish
    const existingItemIndex = cart.items.findIndex(item => 
      item.product.toString() === productId
    );

    if (existingItemIndex !== -1) {
      cart.items[existingItemIndex].quantity += quantity;
      cart.items[existingItemIndex].totalPrice = cart.items[existingItemIndex].quantity * cart.items[existingItemIndex].price;
    } else {
      cart.items.push({
        product: productId,
        productName: product.name,
        quantity: quantity,
        price: product.price,
        totalPrice: product.price * quantity
      });
    }

    // Umumiy narxni hisoblash
    cart.total = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);
    cart.updatedAt = new Date();

    await cart.save();

    await ctx.answerCbQuery(`✅ ${product.name} savatga qo'shildi!`);

    // Savatni ko'rsatish
    await showCart(ctx);

  } catch (error) {
    console.error('Add to cart error:', error);
    await ctx.answerCbQuery('❌ Savatga qo\'shishda xatolik!');
  }
}

async function updateQuantity(ctx) {
  try {
    const parts = ctx.callbackQuery.data.split('_');
    // change_qty_<productId>_<qty> yoki cart_qty_<productId>_<qty>
    const productId = parts[2];
    let newQty = parseInt(parts[3], 10);
    if (!Number.isFinite(newQty)) newQty = 1;

    const telegramId = ctx.from.id;
    const user = await User.findOne({ telegramId });
    if (!user) {
      return await ctx.answerCbQuery('Foydalanuvchi topilmadi!');
    }

    const cart = await Cart.findOne({ user: user._id, isActive: true });
    if (!cart) {
      return await ctx.answerCbQuery('Savat topilmadi!');
    }

    const itemIndex = cart.items.findIndex((it) => it.product.toString() === productId);
    if (itemIndex === -1) {
      return await ctx.answerCbQuery('Mahsulot savatda topilmadi!');
    }

    if (newQty <= 0) {
      cart.items.splice(itemIndex, 1);
    } else {
      cart.items[itemIndex].quantity = newQty;
      cart.items[itemIndex].totalPrice = newQty * cart.items[itemIndex].price;
    }

    cart.total = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);
    cart.updatedAt = new Date();
    await cart.save();

    await showCart(ctx);
    await ctx.answerCbQuery('✅ Miqdor yangilandi');
  } catch (error) {
    console.error('Update quantity error:', error);
    await ctx.answerCbQuery('❌ Miqdorni yangilashda xatolik!');
  }
}

async function removeFromCart(ctx) {
  try {
    const productId = ctx.callbackQuery.data.split('_').pop();
    const telegramId = ctx.from.id;
    const user = await User.findOne({ telegramId });
    if (!user) {
      return await ctx.answerCbQuery('Foydalanuvchi topilmadi!');
    }

    const cart = await Cart.findOne({ user: user._id, isActive: true });
    if (!cart) {
      return await ctx.answerCbQuery('Savat topilmadi!');
    }

    cart.items = cart.items.filter((it) => it.product.toString() !== productId);
    cart.total = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);
    cart.updatedAt = new Date();
    await cart.save();

    await showCart(ctx);
    await ctx.answerCbQuery('🗑️ Mahsulot o\'chirildi');
  } catch (error) {
    console.error('Remove from cart error:', error);
    await ctx.answerCbQuery('❌ Mahsulotni o\'chirishda xatolik!');
  }
}

async function showCart(ctx) {
  try {
    const telegramId = ctx.from.id;
    const user = await User.findOne({ telegramId });
    if (!user) {
      return await ctx.reply('❌ Foydalanuvchi topilmadi!');
    }
    const cart = await Cart.findOne({ user: user._id, isActive: true })
      .populate('items.product', 'name price isAvailable');

    if (!cart || cart.items.length === 0) {
      const message = '🛒 **Savat bo\'sh**\n\nMahsulot qo\'shish uchun kategoriyalarni ko\'ring';
      const keyboard = {
        inline_keyboard: [
          [{ text: '🍽️ Kategoriyalar', callback_data: 'show_categories' }],
          [{ text: '🔙 Asosiy menyu', callback_data: 'back_to_main' }]
        ]
      };

      if (ctx.callbackQuery) {
        return await ctx.editMessageText(message, {
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });
      } else {
        return await ctx.reply(message, {
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });
      }
    }

    let message = '🛒 **Sizning savatangiz:**\n\n';
    let total = 0;

    cart.items.forEach((item, index) => {
      const itemTotal = item.quantity * item.price;
      total += itemTotal;

      message += `${index + 1}. **${item.productName}**\n`;
      message += `   ${item.quantity} x ${item.price.toLocaleString()} = ${itemTotal.toLocaleString()} so'm\n\n`;
    });

    message += `💰 **Jami:** ${total.toLocaleString()} so'm`;

    if (ctx.callbackQuery) {
      // Agar xabar rasmli bo'lsa, yangi xabar yuboriladi
      if (ctx.callbackQuery.message.photo) {
        await ctx.reply(message, {
          parse_mode: 'Markdown',
          reply_markup: cartKeyboard(cart).reply_markup
        });
      } else {
        await ctx.editMessageText(message, {
          parse_mode: 'Markdown',
          reply_markup: cartKeyboard(cart).reply_markup
        });
      }
    } else {
      await ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: cartKeyboard(cart).reply_markup
      });
    }

  } catch (error) {
    console.error('Show cart error:', error);
    await ctx.reply('❌ Savatni ko\'rsatishda xatolik!');
  }
}

async function clearCart(ctx) {
  try {
    const telegramId = ctx.from.id;
    const user = await User.findOne({ telegramId });
    if (!user) {
      return await ctx.answerCbQuery('Foydalanuvchi topilmadi!');
    }
    await Cart.findOneAndUpdate(
      { user: user._id, isActive: true },
      { $set: { items: [], total: 0 } }
    );

    await ctx.answerCbQuery('🗑️ Savat tozalandi!');
    await showCart(ctx);

  } catch (error) {
    console.error('Clear cart error:', error);
    await ctx.answerCbQuery('❌ Savatni tozalashda xatolik!');
  }
}

module.exports = {
  addToCart,
  showCart,
  clearCart,
  updateQuantity,
  removeFromCart
};
