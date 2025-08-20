// Category Handlers Module
const { Category } = require('../../../../models');
const { categoriesKeyboard, backToMainKeyboard } = require('../../../user/keyboards');
const BaseHandler = require('../../../../utils/BaseHandler');

/**
 * Category Management Handler - kategoriyalarni boshqarish
 */
class CategoryHandlers extends BaseHandler {
  /**
   * Kategoriyalarni ko'rsatish
   * @param {Object} ctx - Telegraf context
   */
  static async showCategories(ctx) {
    return this.safeExecute(async () => {
      const categories = await Category.find({ 
        isActive: true, 
        isVisible: true 
      }).sort({ sortOrder: 1 });

      if (categories.length === 0) {
        return await ctx.reply('🤷‍♂️ Hozircha kategoriyalar mavjud emas', {
          reply_markup: backToMainKeyboard.reply_markup
        });
      }

      const message = `🍽️ **Kategoriyalar**\n\nQaysi kategoriyadan buyurtma bermoqchisiz?`;

      const replyOptions = {
        parse_mode: 'Markdown',
        reply_markup: categoriesKeyboard(categories).reply_markup
      };

      if (ctx.callbackQuery) {
        await ctx.reply(message, replyOptions);
      } else {
        await ctx.reply(message, replyOptions);
      }
    }, ctx, '❌ Kategoriyalarni ko\'rsatishda xatolik');
  }

  /**
   * Kategoriya tanlanishi
   * @param {Object} ctx - Telegraf context
   * @param {string} categoryId - kategoriya ID
   */
  static async handleCategorySelection(ctx, categoryId) {
    return this.safeExecute(async () => {
      if (!this.isValidObjectId(categoryId)) {
        return await ctx.answerCbQuery('❌ Kategoriya ID noto\'g\'ri!');
      }

      const category = await Category.findById(categoryId);
      if (!category || !category.isActive || !category.isVisible) {
        return await ctx.answerCbQuery('❌ Kategoriya topilmadi yoki faol emas!');
      }

      console.log('=== Category selected ===');
      console.log('Category:', category.name);

      // Show products in this category
      const ProductHandlers = require('./productHandlers');
      await ProductHandlers.showCategoryProducts(ctx, categoryId);
      
      if (ctx.answerCbQuery) await ctx.answerCbQuery(`✅ ${category.name} tanlandi`);
    }, ctx, '❌ Kategoriyani tanlashda xatolik!');
  }

  /**
   * Kategoriya statistikasini olish
   * @param {string} categoryId - kategoriya ID
   * @returns {Object} - statistika ma'lumotlari
   */
  static async getCategoryStats(categoryId) {
    try {
      if (!this.isValidObjectId(categoryId)) {
        return null;
      }

      const { Product } = require('../../../../models');
      
      const stats = await Product.aggregate([
        { 
          $match: { 
            categoryId: new mongoose.Types.ObjectId(categoryId),
            isActive: true
          }
        },
        {
          $group: {
            _id: null,
            totalProducts: { $sum: 1 },
            minPrice: { $min: '$price' },
            maxPrice: { $max: '$price' },
            avgPrice: { $avg: '$price' }
          }
        }
      ]);

      return stats[0] || {
        totalProducts: 0,
        minPrice: 0,
        maxPrice: 0,
        avgPrice: 0
      };
    } catch (error) {
      console.error('Get category stats error:', error);
      return null;
    }
  }

  /**
   * Kategoriya ma'lumotlarini formatlash
   * @param {Object} category - kategoriya obyekti
   * @returns {string} - formatli ma'lumot
   */
  static formatCategoryInfo(category) {
    if (!category) return 'Ma\'lumot yo\'q';
    
    let info = `📂 **${category.name}**\n`;
    
    if (category.description) {
      info += `📝 ${category.description}\n`;
    }
    
    if (category.icon) {
      info += `${category.icon} `;
    }
    
    return info;
  }

  /**
   * Kategoriya bo'yicha qidiruv
   * @param {string} searchTerm - qidiruv atamasi
   * @returns {Array} - topilgan kategoriyalar
   */
  static async searchCategories(searchTerm) {
    try {
      if (!searchTerm || searchTerm.trim().length < 2) {
        return [];
      }

      const categories = await Category.find({
        isActive: true,
        isVisible: true,
        $or: [
          { name: { $regex: searchTerm.trim(), $options: 'i' } },
          { description: { $regex: searchTerm.trim(), $options: 'i' } }
        ]
      }).sort({ sortOrder: 1 }).limit(10);

      return categories;
    } catch (error) {
      console.error('Search categories error:', error);
      return [];
    }
  }

  /**
   * Kategoriya mavjudligini tekshirish
   * @param {string} categoryId - kategoriya ID
   * @returns {boolean} - mavjudlik holati
   */
  static async categoryExists(categoryId) {
    try {
      if (!this.isValidObjectId(categoryId)) {
        return false;
      }

      const category = await Category.findOne({
        _id: categoryId,
        isActive: true,
        isVisible: true
      });

      return !!category;
    } catch (error) {
      console.error('Category exists check error:', error);
      return false;
    }
  }
}

module.exports = CategoryHandlers;
