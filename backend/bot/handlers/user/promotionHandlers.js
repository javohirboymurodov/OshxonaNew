/**
 * Promotion and discount handlers
 */
class PromotionHandlers {
  
  /**
   * Show promotions for the nearest branch or prompt for branch selection
   */
  static async showPromotions(ctx) {
    try {
      const { Product, BranchProduct, Branch } = require('../../../models');
      
      // Find nearest branch based on user location
      let targetBranch = null;
      if (ctx.session && ctx.session.userLocation) {
        const branches = await Branch.find({ isActive: true });
        let nearestBranch = null;
        let minDistance = Infinity;
        
        for (const branch of branches) {
          if (branch.coordinates && branch.coordinates.lat && branch.coordinates.lng) {
            const distance = Math.sqrt(
              Math.pow(branch.coordinates.lat - ctx.session.userLocation.latitude, 2) +
              Math.pow(branch.coordinates.lng - ctx.session.userLocation.longitude, 2)
            );
            if (distance < minDistance) {
              minDistance = distance;
              nearestBranch = branch;
            }
          }
        }
        targetBranch = nearestBranch;
      }
      
      // If no branch found, ask user to select branch
      if (!targetBranch) {
        await ctx.reply('📍 Aksiyalarni ko\'rish uchun avval filialni tanlang yoki joylashuvingizni ulashing:', {
          reply_markup: {
            inline_keyboard: [
              [{ text: '🏪 Filiallarni ko\'rish', callback_data: 'show_branches' }],
              [{ text: '📍 Joylashuvni ulashish', callback_data: 'request_location' }],
              [{ text: '🔙 Orqaga', callback_data: 'main_menu' }]
            ]
          }
        });
        return;
      }
      
      // Find active promotions for the branch
      const now = new Date();
      const branchProducts = await BranchProduct.find({
        branch: targetBranch._id,
        isPromoActive: true,
        $or: [
          { promoStart: { $lte: now } },
          { promoStart: null }
        ],
        $or: [
          { promoEnd: { $gte: now } },
          { promoEnd: null }
        ]
      }).populate('product', 'name price image categoryId');
      
      if (!branchProducts.length) {
        await ctx.reply(`🎉 ${targetBranch.name} filialida hozircha faol aksiyalar mavjud emas.`, {
          reply_markup: {
            inline_keyboard: [
              [{ text: '🏪 Boshqa filiallarni ko\'rish', callback_data: 'show_branches' }],
              [{ text: '🔙 Orqaga', callback_data: 'main_menu' }]
            ]
          }
        });
        return;
      }
      
      // Show promotion products
      let message = `🎉 **${targetBranch.name} filialidagi aksiyalar:**\n\n`;
      
      for (const bp of branchProducts) {
        const product = bp.product;
        const originalPrice = product.price;
        let discountedPrice = originalPrice;
        
        if (bp.discountType === 'percent') {
          discountedPrice = Math.max(Math.round(originalPrice * (1 - bp.discountValue / 100)), 0);
        } else if (bp.discountType === 'amount') {
          discountedPrice = Math.max(originalPrice - bp.discountValue, 0);
        }
        
        message += `🍽️ **${product.name}**\n`;
        message += `💰 ~~${originalPrice.toLocaleString()} so'm~~ → **${discountedPrice.toLocaleString()} so'm**\n`;
        if (bp.discountType === 'percent') {
          message += `🎯 **-${bp.discountValue}%** chegirma\n`;
        } else {
          message += `🎯 **-${bp.discountValue.toLocaleString()} so'm** chegirma\n`;
        }
        message += `\n`;
      }
      
      message += `📍 Filial: ${targetBranch.name}\n`;
      if (targetBranch.address) message += `🏠 Manzil: ${targetBranch.address}\n`;
      
      await ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🛒 Katalogga o\'tish', callback_data: 'show_catalog' }],
            [{ text: '🏪 Boshqa filiallarni ko\'rish', callback_data: 'show_branches' }],
            [{ text: '🔙 Orqaga', callback_data: 'main_menu' }]
          ]
        }
      });
      
      if (ctx.answerCbQuery) await ctx.answerCbQuery('🎉 Aksiyalar ko\'rsatildi!');
      
    } catch (e) {
      console.error('show_promotions error', e);
      await ctx.reply('❌ Aksiyalarni yuklashda xatolik yuz berdi. Iltimos, qaytadan urinib ko\'ring.');
      if (ctx.answerCbQuery) await ctx.answerCbQuery('❌ Xatolik!');
    }
  }

  /**
   * Show promotions for a specific branch after branch selection
   */
  static async showBranchPromotions(branchId) {
    try {
      const { Branch, BranchProduct } = require('../../../models');
      const branch = await Branch.findById(branchId);
      if (!branch) return null;

      // Find active promotions for the branch
      const now = new Date();
      const branchProducts = await BranchProduct.find({
        branch: branch._id,
        isPromoActive: true,
        $or: [
          { promoStart: { $lte: now } },
          { promoStart: null }
        ],
        $or: [
          { promoEnd: { $gte: now } },
          { promoEnd: null }
        ]
      }).populate('product', 'name price image categoryId');
      
      if (branchProducts.length === 0) {
        return null;
      }

      let promoMessage = `🎉 **${branch.name} filialidagi aksiyalar:**\n\n`;
      
      for (const bp of branchProducts) {
        const product = bp.product;
        const originalPrice = product.price;
        let discountedPrice = originalPrice;
        
        if (bp.discountType === 'percent') {
          discountedPrice = Math.max(Math.round(originalPrice * (1 - bp.discountValue / 100)), 0);
        } else if (bp.discountType === 'amount') {
          discountedPrice = Math.max(originalPrice - bp.discountValue, 0);
        }
        
        promoMessage += `🍽️ **${product.name}**\n`;
        promoMessage += `💰 ~~${originalPrice.toLocaleString()} so'm~~ → **${discountedPrice.toLocaleString()} so'm**\n`;
        if (bp.discountType === 'percent') {
          promoMessage += `🎯 **-${bp.discountValue}%** chegirma\n`;
        } else {
          promoMessage += `🎯 **-${bp.discountValue.toLocaleString()} so'm** chegirma\n`;
        }
        promoMessage += `\n`;
      }
      
      promoMessage += `📍 Filial: ${branch.name}\n`;
      if (branch.address) promoMessage += `🏠 Manzil: ${branch.address}\n`;
      
      return {
        message: promoMessage,
        keyboard: {
          inline_keyboard: [
            [{ text: '🛒 Katalogga o\'tish', callback_data: 'show_catalog' }],
            [{ text: '🔙 Orqaga', callback_data: 'show_branches' }]
          ]
        }
      };
    } catch (e) {
      console.error('showBranchPromotions error:', e);
      return null;
    }
  }

  /**
   * Register promotion callbacks
   */
  static registerCallbacks(bot) {
    // Show promotions
    bot.action('show_promotions', PromotionHandlers.showPromotions);

    console.log('✅ Promotion handlers registered');
  }
}

module.exports = PromotionHandlers;
