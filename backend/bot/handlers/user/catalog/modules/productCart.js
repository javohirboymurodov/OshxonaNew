const { Product } = require('../../../../../models');
const BranchProduct = require('../../../../../models/BranchProduct');
const { quantityKeyboard } = require('../../../../user/keyboards');
const BaseHandler = require('../../../../../utils/BaseHandler');

/**
 * Product Cart Module
 * Mahsulot savat moduli
 */

class ProductCart extends BaseHandler {
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

      try {
        await ctx.editMessageText(message, {
          parse_mode: 'Markdown',
          reply_markup: quantityKeyboard(productId).reply_markup
        });
      } catch (error) {
        if (error.description && error.description.includes('message is not modified')) {
          console.log('⚠️ AddToCart message unchanged, skipping edit');
        } else if (error.description && error.description.includes('no text in the message to edit')) {
          console.log('⚠️ No text to edit for addToCart, sending new message');
          await ctx.reply(message, {
            parse_mode: 'Markdown',
            reply_markup: quantityKeyboard(productId).reply_markup
          });
        } else {
          console.error('❌ AddToCart EditMessageText error:', error);
          await ctx.reply(message, {
            parse_mode: 'Markdown',
            reply_markup: quantityKeyboard(productId).reply_markup
          });
        }
      }

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

module.exports = ProductCart;