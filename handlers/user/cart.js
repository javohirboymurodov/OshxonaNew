const { User, Product, Cart } = require('../../models');
const { mainMenuKeyboard } = require('../../keyboards/userKeyboards');

// Add to cart function
const addToCart = async (ctx) => {
  try {
    await ctx.answerCbQuery('🛒 Savatga qo\'shilmoqda...');
    
    const match = ctx.callbackQuery.data.match(/^add_to_cart_(.+)_(\d+)$/);
    if (!match) {
      return await ctx.answerCbQuery('❌ Noto\'g\'ri format!');
    }

    const [, productId, quantity] = match;
    const quantityNum = parseInt(quantity);

    // Get product
    const product = await Product.findById(productId);
    if (!product) {
      return await ctx.answerCbQuery('❌ Mahsulot topilmadi!');
    }

    // Check availability
    if (!product.isAvailable) {
      return await ctx.answerCbQuery('❌ Mahsulot mavjud emas!');
    }

    // Get or create user cart
    let cart = await Cart.findOne({ user: ctx.from.id });
    if (!cart) {
      cart = new Cart({
        user: ctx.from.id,
        items: []
      });
    }

    // Check if product already in cart
    const existingItem = cart.items.find(item => 
      item.product.toString() === productId
    );

    if (existingItem) {
      existingItem.quantity += quantityNum;
      existingItem.totalPrice = existingItem.quantity * product.price;
    } else {
      cart.items.push({
        product: productId,
        quantity: quantityNum,
        price: product.price,
        totalPrice: quantityNum * product.price
      });
    }

    // Update cart total
    cart.totalPrice = cart.items.reduce((total, item) => total + item.totalPrice, 0);
    cart.totalItems = cart.items.reduce((total, item) => total + item.quantity, 0);

    await cart.save();

    // Update session cart
    ctx.session.cart = cart.items;

    await ctx.answerCbQuery(`✅ ${product.name} savatga qo'shildi!`);

    // Show updated product with success message
    const updatedText = `
🍽️ **${product.name}**

📝 ${product.description}
💰 **Narx:** ${product.price.toLocaleString()} so'm

✅ **Savatga qo'shildi!**
    `;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '➖', callback_data: `quantity_${productId}_${quantityNum > 1 ? quantityNum - 1 : 1}` },
          { text: `${quantityNum} ta`, callback_data: `quantity_info_${productId}` },
          { text: '➕', callback_data: `quantity_${productId}_${quantityNum + 1}` }
        ],
        [
          { text: '🛒 Savatga qo\'shish', callback_data: `add_to_cart_${productId}_${quantityNum}` },
          { text: '📋 Savatni ko\'rish', callback_data: 'show_cart' }
        ],
        [
          { text: '🔙 Orqaga', callback_data: `category_${product.category}` },
          { text: '🏠 Bosh sahifa', callback_data: 'main_menu' }
        ]
      ]
    };

    await ctx.editMessageText(updatedText, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });

  } catch (error) {
    console.error('Add to cart error:', error);
    await ctx.answerCbQuery('❌ Savatga qo\'shishda xatolik!');
  }
};

// Show cart function
const showCart = async (ctx) => {
  try {
    await ctx.answerCbQuery('🛒 Savat ochilmoqda...');

    const cart = await Cart.findOne({ user: ctx.from.id })
      .populate('items.product', 'name price images');

    if (!cart || cart.items.length === 0) {
      return await ctx.editMessageText(
        '🛒 **Savatdagi mahsulotlar**\n\n📭 Savatingiz bo\'sh!\n\nMahsulotlarni ko\'rish uchun kategoriyalardan birini tanlang.',
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🛍️ Xarid qilish', callback_data: 'show_categories' }],
              [{ text: '🏠 Bosh sahifa', callback_data: 'main_menu' }]
            ]
          }
        }
      );
    }

    let cartText = '🛒 **Savatdagi mahsulotlar**\n\n';
    
    cart.items.forEach((item, index) => {
      cartText += `${index + 1}. **${item.product.name}**\n`;
      cartText += `   📦 Miqdori: ${item.quantity} ta\n`;
      cartText += `   💰 Narxi: ${item.price.toLocaleString()} so'm\n`;
      cartText += `   💵 Jami: ${item.totalPrice.toLocaleString()} so'm\n\n`;
    });

    cartText += `💰 **Umumiy summa: ${cart.totalPrice.toLocaleString()} so'm**\n`;
    cartText += `📦 **Jami mahsulotlar: ${cart.totalItems} ta`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🚀 Buyurtma berish', callback_data: 'start_order' },
          { text: '🗑️ Savatni tozalash', callback_data: 'clear_cart' }
        ],
        [
          { text: '🛍️ Xarid davom etish', callback_data: 'show_categories' },
          { text: '🏠 Bosh sahifa', callback_data: 'main_menu' }
        ]
      ]
    };

    await ctx.editMessageText(cartText, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });

  } catch (error) {
    console.error('Show cart error:', error);
    await ctx.answerCbQuery('❌ Savatni ko\'rsatishda xatolik!');
  }
};

// Update quantity function
const updateQuantity = async (ctx) => {
  try {
    const match = ctx.callbackQuery.data.match(/^quantity_(.+)_(\d+)$/);
    if (!match) {
      return await ctx.answerCbQuery('❌ Noto\'g\'ri format!');
    }

    const [, productId, newQuantity] = match;
    const quantity = parseInt(newQuantity);

    if (quantity < 1) {
      return await ctx.answerCbQuery('❌ Miqdor 1 dan kam bo\'lishi mumkin emas!');
    }

    // Update product display with new quantity
    const product = await Product.findById(productId);
    if (!product) {
      return await ctx.answerCbQuery('❌ Mahsulot topilmadi!');
    }

    const productText = `
🍽️ **${product.name}**

📝 ${product.description}
💰 **Narx:** ${product.price.toLocaleString()} so'm
💵 **Jami:** ${(product.price * quantity).toLocaleString()} so'm
    `;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '➖', callback_data: `quantity_${productId}_${Math.max(1, quantity - 1)}` },
          { text: `${quantity} ta`, callback_data: `quantity_info_${productId}` },
          { text: '➕', callback_data: `quantity_${productId}_${quantity + 1}` }
        ],
        [
          { text: '🛒 Savatga qo\'shish', callback_data: `add_to_cart_${productId}_${quantity}` },
          { text: '📋 Savatni ko\'rish', callback_data: 'show_cart' }
        ],
        [
          { text: '🔙 Orqaga', callback_data: `category_${product.category}` },
          { text: '🏠 Bosh sahifa', callback_data: 'main_menu' }
        ]
      ]
    };

    await ctx.editMessageText(productText, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });

    await ctx.answerCbQuery(`Miqdor: ${quantity} ta`);

  } catch (error) {
    console.error('Update quantity error:', error);
    await ctx.answerCbQuery('❌ Miqdorni yangilashda xatolik!');
  }
};

// Remove from cart function
const removeFromCart = async (ctx) => {
  try {
    const match = ctx.callbackQuery.data.match(/^remove_from_cart_(.+)$/);
    if (!match) {
      return await ctx.answerCbQuery('❌ Noto\'g\'ri format!');
    }

    const [, productId] = match;

    const cart = await Cart.findOne({ user: ctx.from.id });
    if (!cart) {
      return await ctx.answerCbQuery('❌ Savat topilmadi!');
    }

    // Remove item from cart
    cart.items = cart.items.filter(item => 
      item.product.toString() !== productId
    );

    // Update cart totals
    cart.totalPrice = cart.items.reduce((total, item) => total + item.totalPrice, 0);
    cart.totalItems = cart.items.reduce((total, item) => total + item.quantity, 0);

    await cart.save();

    await ctx.answerCbQuery('✅ Mahsulot savatdan olib tashlandi!');

    // Show updated cart
    await showCart(ctx);

  } catch (error) {
    console.error('Remove from cart error:', error);
    await ctx.answerCbQuery('❌ Savatdan olib tashlanmadi!');
  }
};

// Clear cart function  
const clearCart = async (ctx) => {
  try {
    await Cart.deleteOne({ user: ctx.from.id });
    ctx.session.cart = [];

    await ctx.answerCbQuery('✅ Savat tozalandi!');

    await ctx.editMessageText(
      '🗑️ **Savat tozalandi!**\n\nBarcha mahsulotlar savatdan olib tashlandi.',
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🛍️ Xarid qilish', callback_data: 'show_categories' }],
            [{ text: '🏠 Bosh sahifa', callback_data: 'main_menu' }]
          ]
        }
      }
    );

  } catch (error) {
    console.error('Clear cart error:', error);
    await ctx.answerCbQuery('❌ Savatni tozalashda xatolik!');
  }
};

module.exports = {
  addToCart,
  showCart,
  updateQuantity,
  removeFromCart,
  clearCart
};
