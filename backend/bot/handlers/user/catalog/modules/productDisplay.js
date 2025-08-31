const mongoose = require('mongoose');
const { Product, Category, User } = require('../../../../../models');
const BranchProduct = require('../../../../../models/BranchProduct');
const { backToMainKeyboard } = require('../../../../user/keyboards');
const BaseHandler = require('../../../../../utils/BaseHandler');
const { buildAbsoluteImageUrl } = require('./utils');

/**
 * Product Display Module
 * Mahsulot ko'rsatish moduli
 */

class ProductDisplay extends BaseHandler {
  /**
   * Kategoriya mahsulotlarini ko'rsatish
   * @param {Object} ctx - Telegraf context
   * @param {string} categoryId - kategoriya ID
   * @param {number} page - sahifa raqami
   */
  static async showCategoryProducts(ctx, categoryId, page = 1) {
    return BaseHandler.safeExecute(async () => {
      console.log('🔍 DEBUG: showCategoryProducts called with:', { categoryId, page });
      
      if (!BaseHandler.isValidObjectId(categoryId)) {
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

      // Get promo prices for products
      const branchProducts = await BranchProduct.find({
        product: { $in: availableProducts.map(p => p._id) },
        isPromoActive: true,
        $or: [
          { promoStart: { $lte: new Date() } },
          { promoStart: null }
        ],
        $or: [
          { promoEnd: { $gte: new Date() } },
          { promoEnd: null }
        ]
      });

      const promoMap = new Map();
      branchProducts.forEach(bp => {
        promoMap.set(bp.product.toString(), bp);
      });

      availableProducts.forEach((product, index) => {
        const number = skip + index + 1;
        message += `${number}. **${product.name}**\n`;
        
        // Check if product has promo
        const promo = promoMap.get(product._id.toString());
        if (promo && promo.isPromoActive) {
          let discountedPrice = product.price;
          if (promo.discountType === 'percent') {
            discountedPrice = Math.max(Math.round(product.price * (1 - promo.discountValue / 100)), 0);
          } else if (promo.discountType === 'amount') {
            discountedPrice = Math.max(product.price - promo.discountValue, 0);
          }
          
          message += `   💰 ~~${product.price.toLocaleString()} so'm~~ → **${discountedPrice.toLocaleString()} so'm**\n`;
          if (promo.discountType === 'percent') {
            message += `   🎯 **-${promo.discountValue}%** chegirma\n`;
          } else {
            message += `   🎯 **-${promo.discountValue.toLocaleString()} so'm** chegirma\n`;
          }
        } else {
          message += `   💰 ${product.price.toLocaleString()} so'm\n`;
        }
        
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
        try {
          await ctx.editMessageText(message, {
            parse_mode: 'Markdown',
            reply_markup: keyboard
          });
        } catch (error) {
          if (error.description && error.description.includes('message is not modified')) {
            console.log('⚠️ Category message content unchanged, skipping edit');
            await ctx.answerCbQuery();
          } else if (error.description && error.description.includes('no text in the message to edit')) {
            console.log('⚠️ No text to edit, sending new message');
            await ctx.reply(message, {
              parse_mode: 'Markdown',
              reply_markup: keyboard
            });
          } else {
            console.error('❌ Category EditMessageText error:', error);
            // Try sending new message instead
            await ctx.reply(message, {
              parse_mode: 'Markdown',
              reply_markup: keyboard
            });
          }
        }
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
    return BaseHandler.safeExecute(async () => {
      console.log('🔍 DEBUG: showProductDetails called with productId:', productId);
      
      if (!BaseHandler.isValidObjectId(productId)) {
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
      const availability = await ProductDisplay.checkProductAvailability(productId);
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

      // Keyboard for actions
      const keyboard = { inline_keyboard: [] };
      
      if (availability.available) {
        keyboard.inline_keyboard.push([
          { text: '🛒 Savatga qo\'shish', callback_data: `add_to_cart_${productId}` }
        ]);
      }
      
      keyboard.inline_keyboard.push(
        [{ text: '🔙 Kategoriya', callback_data: `category_products_${product.categoryId._id}` }],
        [{ text: '🏠 Bosh sahifa', callback_data: 'back_to_main' }]
      );

      // Send with image if available
      const imageUrl = buildAbsoluteImageUrl(product.image);
      
      if (imageUrl) {
        try {
          if (ctx.callbackQuery) {
            await ctx.deleteMessage();
          }
          await ctx.replyWithPhoto(imageUrl, {
            caption: message,
            parse_mode: 'Markdown',
            reply_markup: keyboard
          });
        } catch (photoError) {
          console.error('❌ Photo send error:', photoError);
          // Fallback to text message
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
        }
      } else {
        // No image, send text only
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
      }
    }, ctx, '❌ Mahsulot tafsilotlarini ko\'rsatishda xatolik!');
  }

  /**
   * Mahsulot mavjudligini tekshirish
   * @param {string} productId - mahsulot ID
   * @returns {Object} - mavjudlik ma'lumoti
   */
  static async checkProductAvailability(productId) {
    try {
      if (!BaseHandler.isValidObjectId(productId)) {
        return { available: false, availableBranches: 0 };
      }

      const branchProducts = await BranchProduct.find({
        product: productId,
        isAvailable: true
      }).populate('branch', 'name isActive');

      const activeBranches = branchProducts.filter(bp => bp.branch?.isActive);
      
      return {
        available: activeBranches.length > 0,
        availableBranches: activeBranches.length,
        branches: activeBranches.map(bp => ({
          branchId: bp.branch._id,
          branchName: bp.branch.name,
          price: bp.priceOverride !== null ? bp.priceOverride : null
        }))
      };
    } catch (error) {
      console.error('Check product availability error:', error);
      return { available: false, availableBranches: 0 };
    }
  }
}

module.exports = ProductDisplay;