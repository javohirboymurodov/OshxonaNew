// Product Handlers Module
const mongoose = require('mongoose');
const { Product, Category, Branch, User } = require('../../../../models');
const BranchProduct = require('../../../../models/BranchProduct');
const { quantityKeyboard, backToMainKeyboard } = require('../../../user/keyboards');
const BaseHandler = require('../../../../utils/BaseHandler');
const fs = require('fs');
const path = require('path');

function buildAbsoluteImageUrl(img) {
  try {
    if (!img) return null;
    const base = process.env.SERVER_URL || `http://localhost:${process.env.API_PORT || 5000}`;
    if (typeof img === 'string') {
      if (/^https?:\/\//.test(img)) return img;
      if (img.startsWith('/')) return `${base}${img}`;
      return `${base}/${img}`;
    }
    if (img.url) {
      const u = img.url;
      if (/^https?:\/\//.test(u)) return u;
      if (u.startsWith('/')) return `${base}${u}`;
      return `${base}/${u}`;
    }
    return null;
  } catch { return null; }
}

/**
 * Product Management Handler - mahsulotlarni boshqarish
 */
class ProductHandlers extends BaseHandler {
  /**
   * Kategoriya mahsulotlarini ko'rsatish
   * @param {Object} ctx - Telegraf context
   * @param {string} categoryId - kategoriya ID
   * @param {number} page - sahifa raqami
   */
  static async showCategoryProducts(ctx, categoryId, page = 1) {
    return this.safeExecute(async () => {
      console.log('🔍 DEBUG: showCategoryProducts called with:', { categoryId, page });
      
      if (!this.isValidObjectId(categoryId)) {
        console.log('❌ Invalid categoryId:', categoryId);
        return await ctx.answerCbQuery('❌ Kategoriya ID noto\'g\'ri!');
      }

      const category = await Category.findById(categoryId);
      console.log('📋 Category found:', category ? { id: category._id, name: category.name } : 'NOT FOUND');
      
      if (!category) {
        return await ctx.answerCbQuery('❌ Kategoriya topilmadi!');
      }

      const limit = 10;
      const skip = (page - 1) * limit;

      // Debug: Check all products first
      const allProducts = await Product.find({ categoryId: categoryId });
      console.log('🔍 All products in category:', allProducts.length);
      console.log('📦 Product details:', allProducts.map(p => ({ 
        name: p.name, 
        isActive: p.isActive, 
        isVisible: p.isVisible,
        categoryId: p.categoryId 
      })));

      // Get user's branch for inventory check
      const user = await User.findOne({ telegramId: ctx.from?.id });
      const userBranch = user?.selectedBranch || user?.branch;
      
      const products = await Product.find({
        categoryId: categoryId,
        isActive: true
      })
      .sort({ sortOrder: 1, name: 1 })
      .skip(skip)
      .limit(limit);
      
      // Filter products by branch availability
      let availableProducts = products;
      if (userBranch) {
        const branchProducts = await BranchProduct.find({
          branch: userBranch,
          product: { $in: products.map(p => p._id) },
          isAvailable: true
        });
        
        const availableProductIds = branchProducts.map(bp => bp.product.toString());
        availableProducts = products.filter(p => availableProductIds.includes(p._id.toString()));
        
        console.log('🏢 Branch filtering:', {
          userBranch,
          totalProducts: products.length,
          availableInBranch: availableProducts.length
        });
      }
      
      console.log('✅ Filtered products:', availableProducts.length);

      if (availableProducts.length === 0) {
        const message = page === 1 ? 
          `🤷‍♂️ **${category.name}** kategoriyasida mahsulotlar mavjud emas` :
          `📄 Bu sahifada mahsulotlar yo'q`;
        
        return await ctx.reply(message, {
          parse_mode: 'Markdown',
          reply_markup: backToMainKeyboard.reply_markup
        });
      }

      // Build products list
      let message = `🛍️ **${category.name}**\n\n`;
      
      const keyboard = { inline_keyboard: [] };

      availableProducts.forEach((product, index) => {
        const number = skip + index + 1;
        message += `${number}. **${product.name}**\n`;
        message += `   💰 ${product.price.toLocaleString()} so'm\n`;
        if (product.description) {
          const shortDesc = product.description.length > 50 ? 
            product.description.substring(0, 50) + '...' : 
            product.description;
          message += `   📝 ${shortDesc}\n`;
        }
        message += '\n';

        // Add product button
        keyboard.inline_keyboard.push([{
          text: `🔍 ${product.name}`,
          callback_data: `product_details_${product._id}`
        }]);
      });

      // Pagination (Product now uses categoryId and no global isVisible)
      const totalProducts = await Product.countDocuments({
        categoryId: categoryId,
        isActive: true
      });

      const totalPages = Math.ceil(totalProducts / limit);
      
      if (totalPages > 1) {
        const paginationRow = [];
        
        if (page > 1) {
          paginationRow.push({
            text: '⬅️ Oldingi',
            callback_data: `category_products_${categoryId}_${page - 1}`
          });
        }
        
        paginationRow.push({
          text: `📄 ${page}/${totalPages}`,
          callback_data: 'noop'
        });
        
        if (page < totalPages) {
          paginationRow.push({
            text: 'Keyingi ➡️',
            callback_data: `category_products_${categoryId}_${page + 1}`
          });
        }
        
        keyboard.inline_keyboard.push(paginationRow);
      }

      // Navigation buttons
      keyboard.inline_keyboard.push(
        [{ text: '🔙 Kategoriyalar', callback_data: 'show_categories' }],
        [{ text: '🏠 Bosh sahifa', callback_data: 'back_to_main' }]
      );

      if (ctx.callbackQuery) {
        await ctx.editMessageText(message, {
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });
      } else {
        await ctx.reply(message, {
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });
      }
    }, ctx, '❌ Mahsulotlarni ko\'rsatishda xatolik!');
  }

  /**
   * Mahsulot tafsilotlarini ko'rsatish
   * @param {Object} ctx - Telegraf context
   * @param {string} productId - mahsulot ID
   */
  static async showProductDetails(ctx, productId) {
    return this.safeExecute(async () => {
      console.log('🔍 DEBUG: showProductDetails called with productId:', productId);
      
      if (!this.isValidObjectId(productId)) {
        console.log('❌ Invalid productId:', productId);
        return await ctx.answerCbQuery('❌ Mahsulot ID noto\'g\'ri!');
      }

      const product = await Product.findById(productId).populate('categoryId', 'name');
      console.log('📦 Product found:', product ? { id: product._id, name: product.name, isActive: product.isActive } : 'NOT FOUND');
      
      if (!product || !product.isActive) {
        return await ctx.answerCbQuery('❌ Mahsulot topilmadi yoki mavjud emas!');
      }

      let message = `🍽️ **${product.name}**\n\n`;
      
      if (product.description) {
        message += `📝 **Ta'rif:**\n${product.description}\n\n`;
      }
      
      message += `💰 **Narxi:** ${product.price.toLocaleString()} so'm\n`;
      
      if (product.categoryId?.name) {
        message += `📂 **Kategoriya:** ${product.categoryId.name}\n`;
      }

      // Check availability in branches
      const availability = await this.checkProductAvailability(productId);
      if (availability.available) {
        message += `✅ **Mavjud:** ${availability.availableBranches} ta filialda\n`;
      } else {
        message += `❌ **Hozirda mavjud emas**\n`;
      }

      // Nutritional info if available
      if (product.nutritionalInfo) {
        message += '\n🔢 **Ozuqaviy ma\'lumot:**\n';
        if (product.nutritionalInfo.calories) {
          message += `⚡ Kaloriya: ${product.nutritionalInfo.calories}\n`;
        }
        if (product.nutritionalInfo.protein) {
          message += `🥩 Oqsil: ${product.nutritionalInfo.protein}g\n`;
        }
        if (product.nutritionalInfo.carbs) {
          message += `🍞 Uglevodlar: ${product.nutritionalInfo.carbs}g\n`;
        }
        if (product.nutritionalInfo.fat) {
          message += `🧈 Yog': ${product.nutritionalInfo.fat}g\n`;
        }
      }

      const keyboard = {
        inline_keyboard: [
          [{ text: '➕ Savatga qo\'shish', callback_data: `add_to_cart_${productId}` }],
          // Back to category list for this category
          [{ text: '🔙 Orqaga', callback_data: `category_${product.categoryId._id || product.categoryId}` }],
          [{ text: '🏠 Bosh sahifa', callback_data: 'back_to_main' }]
        ]
      };

      // Send product image if available
      const photoUrl = buildAbsoluteImageUrl(product.image || product.imagePath || (product.images && product.images[0]));
      if (photoUrl && !/localhost(:\d+)?/.test(photoUrl)) {
        try {
          await ctx.replyWithPhoto(photoUrl, {
            caption: message,
            parse_mode: 'Markdown',
            reply_markup: keyboard
          });
          return;
        } catch (photoError) {
          console.warn('Product photo send error:', photoError);
          // Continue with text message
        }
      }

      // Local file fallback (/uploads/*)
      try {
        let fileName = null;
        if (typeof product.image === 'string' && product.image.startsWith('/uploads/')) fileName = product.image.replace('/uploads/', '');
        else if (product.imageFileName) fileName = product.imageFileName;
        if (fileName) {
          const filePath = path.join(__dirname, '../../../../uploads', fileName);
          if (fs.existsSync(filePath)) {
            await ctx.replyWithPhoto({ source: fs.createReadStream(filePath) }, {
              caption: message,
              parse_mode: 'Markdown',
              reply_markup: keyboard
            });
            return;
          }
        }
      } catch (localErr) {
        console.warn('Local photo send error:', localErr);
      }

      if (ctx.callbackQuery) {
        await ctx.editMessageText(message, {
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });
      } else {
        await ctx.reply(message, {
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });
      }
    }, ctx, '❌ Mahsulot tafsilotlarini ko\'rsatishda xatolik!');
  }

  /**
   * Mahsulotni savatga qo'shish
   * @param {Object} ctx - Telegraf context
   * @param {string} productId - mahsulot ID
   */
  static async addToCart(ctx, productId) {
    return this.safeExecute(async () => {
      if (!this.isValidObjectId(productId)) {
        return await ctx.answerCbQuery('❌ Mahsulot ID noto\'g\'ri!');
      }

      const product = await Product.findById(productId);
      // Product no longer has global isVisible flag
      if (!product || !product.isActive) {
        return await ctx.answerCbQuery('❌ Mahsulot mavjud emas!');
      }

      // Store product ID in session for quantity selection
      ctx.session.selectedProduct = productId;

      const message = `🛒 **Savatga qo'shish**\n\n🍽️ **${product.name}**\n💰 ${product.price.toLocaleString()} so'm\n\nNechtasini qo'shmoqchisiz?`;

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: quantityKeyboard(productId).reply_markup
      });

      if (ctx.answerCbQuery) await ctx.answerCbQuery();
    }, ctx, '❌ Savatga qo\'shishda xatolik!');
  }

  /**
   * Mahsulot mavjudligini tekshirish
   * @param {string} productId - mahsulot ID
   * @returns {Object} - mavjudlik ma'lumotlari
   */
  static async checkProductAvailability(productId) {
    try {
      if (!this.isValidObjectId(productId)) {
        return { available: false, availableBranches: 0 };
      }

      // Check in BranchProduct collection
      const branchProducts = await BranchProduct.find({
        product: productId,
        isAvailable: true
      }).populate('branch', 'name isActive');

      const availableBranches = branchProducts.filter(bp => 
        bp.branch && bp.branch.isActive
      ).length;

      return {
        available: availableBranches > 0,
        availableBranches,
        branches: branchProducts
      };
    } catch (error) {
      console.error('Check product availability error:', error);
      return { available: false, availableBranches: 0 };
    }
  }

  /**
   * Mahsulot qidirish
   * @param {string} searchTerm - qidiruv atamasi
   * @returns {Array} - topilgan mahsulotlar
   */
  static async searchProducts(searchTerm) {
    try {
      if (!searchTerm || searchTerm.trim().length < 2) {
        return [];
      }

      const products = await Product.find({
        isActive: true,
        isVisible: true,
        $or: [
          { name: { $regex: searchTerm.trim(), $options: 'i' } },
          { description: { $regex: searchTerm.trim(), $options: 'i' } }
        ]
      })
      .populate('category', 'name')
      .sort({ name: 1 })
      .limit(20);

      return products;
    } catch (error) {
      console.error('Search products error:', error);
      return [];
    }
  }

  /**
   * Mahsulot narx oraliqini olish
   * @param {string} categoryId - kategoriya ID (ixtiyoriy)
   * @returns {Object} - narx oralig'i
   */
  static async getPriceRange(categoryId = null) {
    try {
      const matchCondition = {
        isActive: true,
        isVisible: true
      };

      if (categoryId && this.isValidObjectId(categoryId)) {
        matchCondition.category = new mongoose.Types.ObjectId(categoryId);
      }

      const priceStats = await Product.aggregate([
        { $match: matchCondition },
        {
          $group: {
            _id: null,
            minPrice: { $min: '$price' },
            maxPrice: { $max: '$price' },
            avgPrice: { $avg: '$price' },
            count: { $sum: 1 }
          }
        }
      ]);

      return priceStats[0] || {
        minPrice: 0,
        maxPrice: 0,
        avgPrice: 0,
        count: 0
      };
    } catch (error) {
      console.error('Get price range error:', error);
      return { minPrice: 0, maxPrice: 0, avgPrice: 0, count: 0 };
    }
  }
}

module.exports = ProductHandlers;
