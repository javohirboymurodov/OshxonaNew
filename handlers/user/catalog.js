const mongoose = require('mongoose');
const { Category, Product } = require('../../models');
const { backToMainKeyboard, categoriesKeyboard, quantityKeyboard } = require('../../keyboards/userKeyboards');
const { CacheHelper } = require('../../services/cacheService');

async function showCategories(ctx) {
  try {
    // Cache'dan kategoriyalarni olish
    const categories = await CacheHelper.getCategories(async () => {
      return await Category.find({ 
        isActive: true, 
        isVisible: true 
      }).sort({ sortOrder: 1 });
    });

    if (categories.length === 0) {
      return await ctx.reply('🤷‍♂️ Hozircha kategoriyalar mavjud emas', {
        reply_markup: backToMainKeyboard.reply_markup
      });
    }

    const message = `
🍽️ **Kategoriyalar**

Qaysi kategoriyadan buyurtma bermoqchisiz?
      `;

    if (ctx.callbackQuery) {
      await ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: categoriesKeyboard(categories).reply_markup
      });
    } else {
      await ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: categoriesKeyboard(categories).reply_markup
      });
    }

  } catch (error) {
    console.error('Show categories error:', error);
    await ctx.reply('❌ Kategoriyalarni ko\'rsatishda xatolik');
  }
}

async function showCategoryProducts(ctx) {
  try {
    console.log('=== showCategoryProducts called ===');
    console.log('Callback data:', ctx.callbackQuery?.data);
    
    // TUZATILDI: to'g'ri prefix
    const callbackData = ctx.callbackQuery?.data || '';
    const categoryId = callbackData.replace('category_', ''); // product_category_ emas, category_
    
    console.log('Parsed category ID:', categoryId);
    
    // ObjectId validation
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      console.log('Invalid category ID:', categoryId);
      return await ctx.answerCbQuery('Noto\'g\'ri kategoriya!');
    }
    
    // Cache'dan kategoriya va mahsulotlarni olish
    const category = await Category.findById(categoryId);
    if (!category) {
      console.log('Category not found:', categoryId);
      return await ctx.answerCbQuery('Kategoriya topilmadi!');
    }

    // Cache'dan mahsulotlarni olish
    const products = await CacheHelper.getCategoryProducts(categoryId, async (catId) => {
      return await Product.find({
        categoryId: catId,
        isActive: true,
        isAvailable: true
      }).sort({ sortOrder: 1, createdAt: -1 });
    });

    let message = `${category.emoji || '📂'} **${category.name}**\n\n`;
    const keyboard = [];

    if (products.length === 0) {
      message += '😔 Ushbu kategoriyada hozircha mahsulotlar mavjud emas';
    } else {
      products.forEach((product, index) => {
        const priceText = product.price.toLocaleString() + ' so\'m';
        const statusEmoji = product.isNewProduct ? '🆕 ' : '';
        message += `${index + 1}. ${statusEmoji}**${product.name}**\n`;
        message += `💰 ${priceText}\n`;
        if (product.description) {
          message += `📝 ${product.description.substring(0, 50)}...\n`;
        }
        message += '\n';
        keyboard.push([
          {
            text: `${product.name} - ${priceText}`,
            callback_data: `product_${product._id}`
          }
        ]);
      });
    }

    keyboard.push([{ text: '🔙 Kategoriyalar', callback_data: 'show_categories' }]);

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: keyboard }
    });

  } catch (error) {
    console.error('Show category products error:', error);
    await ctx.answerCbQuery('Mahsulotlarni ko\'rsatishda xatolik!');
  }
}

async function showProductDetails(ctx) {
  try {
    const productId = ctx.callbackQuery.data.split('_')[1];
    
    // ObjectId validatsiyasi
    if (!productId || !productId.match(/^[0-9a-fA-F]{24}$/)) {
      return await ctx.answerCbQuery('Noto\'g\'ri mahsulot ID!');
    }
    
    const product = await Product.findById(productId);

    if (!product) {
      return await ctx.answerCbQuery('Mahsulot topilmadi!');
    }

    if (typeof product.incrementViewCount === 'function') {
      await product.incrementViewCount();
    }

    let message = `
🍽️ **${product.name}**

💰 **Narx:** ${product.price.toLocaleString()} so'm
⏱️ **Tayyorlash vaqti:** ${product.preparationTime || 15} daqiqa
`;

    if (product.description) {
      message += `📝 **Tavsif:** ${product.description}\n`;
    }

    if (product.ingredients && product.ingredients.length > 0) {
      message += `🥘 **Tarkib:** ${product.ingredients.join(', ')}\n`;
    }

    if (product.originalPrice && product.originalPrice > product.price) {
      const discount = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
      message += `🔥 **Chegirma:** ${discount}%\n`;
      message += `~~${product.originalPrice.toLocaleString()} so'm~~\n`;
    }

    if (product.isNewProduct) {
      message += `🆕 **Yangi mahsulot!**\n`;
    }

    // Agar mahsulotda rasm bo'lsa, rasmli xabar yuborish
    if (product.imageFileId) {
      await ctx.deleteMessage(); // Eski xabarni o'chirish
      await ctx.replyWithPhoto(product.imageFileId, {
        caption: message,
        parse_mode: 'Markdown',
        reply_markup: quantityKeyboard(product._id, 1).reply_markup
      });
    } else {
      // Agar rasm bo'lmasa, oddiy matn xabar
      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: quantityKeyboard(product._id, 1).reply_markup
      });
    }

  } catch (error) {
    console.error('Show product details error:', error);
    await ctx.answerCbQuery('Mahsulot tafsilotlarini ko\'rsatishda xatolik!');
  }
}

async function selectCategory(ctx) {
  try {
    // Debug: callback data
    console.log('=== USER SELECT CATEGORY ===');
    console.log('Callback data:', ctx.callbackQuery.data);

    // Kategoriya ID ni to'g'ri parse qilish
    const categoryId = ctx.callbackQuery.data.split('_')[1];
    console.log('Parsed categoryId:', categoryId);

    // Bazadan kategoriya olish
    const category = await Category.findById(categoryId);
    console.log('Category from DB:', category);

    if (!category) {
      await ctx.answerCbQuery('Kategoriya topilmadi!');
      return;
    }

    // Kategoriya ichidagi taomlarni olish
    const products = await Product.find({ categoryId: category._id, isActive: true });
    console.log('Products in category:', products);

    if (products.length === 0) {
      await ctx.reply('Bu kategoriyada taomlar mavjud emas.');
      return;
    }

    // Taomlar ro'yxatini yuborish (oddiy misol)
    let message = `🍽 ${category.name} taomlari:\n`;
    products.forEach((p, i) => {
      message += `${i + 1}. ${p.name}\n`;
    });
    await ctx.reply(message);

  } catch (error) {
    console.error('User selectCategory error:', error);
    await ctx.reply('Kategoriyani ko\'rsatishda xatolik!');
  }
}

module.exports = {
  showCategories,
  showCategoryProducts,
  showProductDetails,
  selectCategory
};
