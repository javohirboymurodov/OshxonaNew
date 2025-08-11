const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { Category, Product } = require('../../models');
const { backToMainKeyboard, categoriesKeyboard, quantityKeyboard } = require('../../keyboards/userKeyboards');

async function showCategories(ctx) {
  try {
    const categories = await Category.find({ 
      isActive: true, 
      isVisible: true 
    }).sort({ sortOrder: 1 });

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
    
    const category = await Category.findById(categoryId);
    if (!category) {
      console.log('Category not found:', categoryId);
      return await ctx.answerCbQuery('Kategoriya topilmadi!');
    }

    const products = await Product.find({
      categoryId: categoryId,
      isActive: true,
      isAvailable: true
    }).sort({ sortOrder: 1, createdAt: -1 });

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

    // Rasm yuborish: Telegram file_id mavjud bo'lsa, o'shani; aks holda URL/path dan foydalanamiz
    const baseUrl = process.env.FILE_BASE_URL || 'http://localhost:5000';
    let pickImagePath = product.image || product.imagePath || (product.images && product.images[0]);
    // Agar image '/uploads/..' emas, faqat fayl nomi bo'lsa, '/uploads' bilan to'ldiramiz
    if (pickImagePath && !pickImagePath.startsWith('http') && !pickImagePath.startsWith('/')) {
      pickImagePath = `/uploads/${pickImagePath}`;
    }

    try {
      await ctx.deleteMessage(); // Eski xabarni o'chirish (agar edit mumkin bo'lmasa, try/catch)
    } catch {}

    if (product.imageFileId) {
      await ctx.replyWithPhoto(product.imageFileId, {
        caption: message,
        parse_mode: 'Markdown',
        reply_markup: quantityKeyboard(product._id, 1).reply_markup
      });
    } else if (pickImagePath) {
      const imageUrl = pickImagePath.startsWith('http')
        ? pickImagePath
        : `${baseUrl}${pickImagePath.startsWith('/') ? '' : '/'}${pickImagePath}`;
      try {
        await ctx.replyWithPhoto(imageUrl, {
          caption: message,
          parse_mode: 'Markdown',
          reply_markup: quantityKeyboard(product._id, 1).reply_markup
        });
      } catch (e) {
        console.warn('Image URL failed, falling back to file if exists:', imageUrl);
        try {
          const localPath = pickImagePath.startsWith('/') ? pickImagePath : `/${pickImagePath}`;
          if (fs.existsSync(path.join(process.cwd(), localPath))) {
            await ctx.replyWithPhoto({ source: path.join(process.cwd(), localPath) }, {
              caption: message,
              parse_mode: 'Markdown',
              reply_markup: quantityKeyboard(product._id, 1).reply_markup
            });
            return;
          }
        } catch {}
        // Agar rasmni yuborib bo'lmasa, matn bilan davom etamiz
        await ctx.reply(message, {
          parse_mode: 'Markdown',
          reply_markup: quantityKeyboard(product._id, 1).reply_markup
        });
      }
    } else {
      // Rasm umuman bo'lmasa, matnli javob
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

// Faqat mahsulot tafsilotidagi miqdor tugmalarini (➖/➕) yangilash
// Callback: change_qty_<productId>_<qty>
async function changeProductQuantity(ctx) {
  try {
    const parts = ctx.callbackQuery.data.split('_');
    const productId = parts[2];
    let qty = parseInt(parts[3], 10);
    if (!Number.isFinite(qty)) qty = 1;
    if (qty < 0) {
      // 0 dan past bo'lsa — kategoriyalarga qaytaramiz va xabar beramiz
      await ctx.answerCbQuery('🗑️ Mahsulot olib tashlandi');
      // mahsulot qaysi kategoriyaga tegishli ekanini topib, ro\'yxatga qaytarish
      try {
        const prod = await Product.findById(productId).select('categoryId');
        if (prod && prod.categoryId) {
          ctx.callbackQuery.data = `category_${prod.categoryId.toString()}`;
          return await showCategoryProducts(ctx);
        }
      } catch (e) {
        // ignore
      }
      // Fallback: kategoriyalar ro'yxatiga qaytish
      return await showCategories(ctx);
    }
    if (qty > 50) qty = 50; // xavfsiz limit

    // Mahsulot mavjudligini tekshiramiz (xavfsizlik uchun)
    if (!productId || !productId.match(/^[0-9a-fA-F]{24}$/)) {
      return await ctx.answerCbQuery('Noto\'g\'ri mahsulot ID!');
    }
    const product = await Product.findById(productId).select('_id');
    if (!product) {
      return await ctx.answerCbQuery('Mahsulot topilmadi!');
    }

    // Matn/caption o'zgartirmaymiz, faqat klaviaturani yangilaymiz
    if (typeof ctx.editMessageReplyMarkup === 'function') {
      await ctx.editMessageReplyMarkup(quantityKeyboard(productId, qty).reply_markup);
    } else {
      // Fallback
      await ctx.editMessageText(undefined, {
        reply_markup: quantityKeyboard(productId, qty).reply_markup,
        parse_mode: 'Markdown'
      });
    }

    await ctx.answerCbQuery(`Miqdor: ${qty}`);
  } catch (error) {
    console.error('changeProductQuantity error:', error);
    await ctx.answerCbQuery('❌ Miqdorni o\'zgartirishda xatolik!');
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
  selectCategory,
  changeProductQuantity
};
