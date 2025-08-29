// User Catalog Handlers Main Export
const CategoryHandlers = require('./categoryHandlers');
const ProductHandlers = require('./productHandlers');
const BranchHandlers = require('./branchHandlers');
const BaseHandler = require('../../../../utils/BaseHandler');

/**
 * Unified User Catalog Handlers Export
 * Bu fayl eski catalog.js ni almashtiradi
 */
class UserCatalogHandlers extends BaseHandler {
  // ===============================
  // CATEGORY METHODS
  // ===============================
  
  static async showCategories(ctx) {
    return CategoryHandlers.showCategories(ctx);
  }

  static async handleCategorySelection(ctx, categoryId) {
    return CategoryHandlers.handleCategorySelection(ctx, categoryId);
  }

  static async getCategoryStats(categoryId) {
    return CategoryHandlers.getCategoryStats(categoryId);
  }

  static async searchCategories(searchTerm) {
    return CategoryHandlers.searchCategories(searchTerm);
  }

  static async categoryExists(categoryId) {
    return CategoryHandlers.categoryExists(categoryId);
  }

  // ===============================
  // PRODUCT METHODS
  // ===============================
  
  static async showCategoryProducts(ctx, categoryId, page = 1) {
    return ProductHandlers.showCategoryProducts(ctx, categoryId, page);
  }

  static async showProductDetails(ctx, productId) {
    return ProductHandlers.showProductDetails(ctx, productId);
  }

  static async addToCart(ctx, productId) {
    return ProductHandlers.addToCart(ctx, productId);
  }

  static async checkProductAvailability(productId) {
    return ProductHandlers.checkProductAvailability(productId);
  }

  static async searchProducts(searchTerm) {
    return ProductHandlers.searchProducts(searchTerm);
  }

  static async getPriceRange(categoryId = null) {
    return ProductHandlers.getPriceRange(categoryId);
  }

  // ===============================
  // BRANCH METHODS
  // ===============================
  
  static async showBranches(ctx, page = 1) {
    return BranchHandlers.showBranches(ctx, page);
  }

  static async showBranchDetails(ctx, branch, nearby = []) {
    return BranchHandlers.showBranchDetails(ctx, branch, nearby);
  }

  static async findNearestBranch(lat, lon) {
    return BranchHandlers.findNearestBranch(lat, lon);
  }

  static async shareBranchLocation(ctx, branchId) {
    return BranchHandlers.shareBranchLocation(ctx, branchId);
  }

  static async showBranchPhone(ctx) {
    return this.safeExecute(async () => {
      const callbackData = ctx.callbackQuery.data;
      const phoneMatch = callbackData.match(/^branch_phone_(.+)$/);
      
      if (!phoneMatch) {
        return await ctx.answerCbQuery('❌ Telefon ma\'lumoti noto\'g\'ri!');
      }

      const branchId = phoneMatch[1];
      const { Branch } = require('../../../../models');
      const branch = await Branch.findById(branchId).select('phone');
      
      if (!branch) return ctx.answerCbQuery('❌ Filial topilmadi');
      await ctx.reply(`📞 ${branch.phone || 'Telefon raqami topilmadi'}`);
      if (ctx.answerCbQuery) await ctx.answerCbQuery('📞 Telefon');
    }, ctx, '❌ Telefon ko\'rsatishda xatolik!');
  }

  static async searchBranches(searchTerm) {
    return BranchHandlers.searchBranches(searchTerm);
  }

  static checkWorkingStatus(branch) {
    return BranchHandlers.checkWorkingStatus(branch);
  }

  // ===============================
  // UTILITY METHODS
  // ===============================
  
  static formatWorkingHours(branch) {
    return BranchHandlers.formatWorkingHours(branch);
  }

  static buildYandexLink(lat, lon) {
    return BranchHandlers.buildYandexLink(lat, lon);
  }

  static calculateDistance(lat1, lon1, lat2, lon2) {
    return BranchHandlers.calculateDistance(lat1, lon1, lat2, lon2);
  }

  static deg2rad(deg) {
    return BranchHandlers.deg2rad(deg);
  }

  // ===============================
  // LEGACY COMPATIBILITY METHODS
  // ===============================
  
  /**
   * Kategoriya bo'yicha mahsulotlarni ko'rsatish (legacy)
   * @param {Object} ctx - Telegraf context
   */
  static async handleShowCategoryProducts(ctx) {
    return this.safeExecute(async () => {
      const callbackData = ctx.callbackQuery.data;
      const categoryMatch = callbackData.match(/^category_(.+)$/);
      
      if (!categoryMatch) {
        return await ctx.answerCbQuery('❌ Kategoriya ma\'lumoti noto\'g\'ri!');
      }

      const categoryId = categoryMatch[1];
      await ProductHandlers.showCategoryProducts(ctx, categoryId);
    }, ctx, '❌ Kategoriya mahsulotlarini ko\'rsatishda xatolik!');
  }

  /**
   * Filial tanlash (legacy)
   * @param {Object} ctx - Telegraf context
   */
  static async handleBranchSelection(ctx) {
    return this.safeExecute(async () => {
      const callbackData = ctx.callbackQuery.data;
      const branchMatch = callbackData.match(/^branch_(.+)$/);
      
      if (!branchMatch) {
        return await ctx.answerCbQuery('❌ Filial ma\'lumoti noto\'g\'ri!');
      }

      const branchId = branchMatch[1];
      
      if (branchId === 'nearest') {
        // Request location for nearest branch
        await ctx.editMessageText(
          '📍 **Eng yaqin filialni topish**\n\nJoylashuvingizni ulashing:',
          {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: '📍 Joylashuvni ulashish', callback_data: 'request_location' }],
                [{ text: '🔙 Orqaga', callback_data: 'show_branches' }]
              ]
            }
          }
        );
        return;
      }

      if (!this.isValidObjectId(branchId)) {
        return await ctx.answerCbQuery('❌ Filial ID noto\'g\'ri!');
      }

      const { Branch } = require('../../../../models');
      const branch = await Branch.findById(branchId);
      
      if (!branch || !branch.isActive) {
        return await ctx.answerCbQuery('❌ Filial topilmadi!');
      }

      await BranchHandlers.showBranchDetails(ctx, branch);
      if (ctx.answerCbQuery) await ctx.answerCbQuery();
    }, ctx, '❌ Filial tanlashda xatolik!');
  }

  /**
   * Mahsulot qidirish natijalarini ko'rsatish
   * @param {Object} ctx - Telegraf context
   * @param {string} searchTerm - qidiruv atamasi
   */
  static async showSearchResults(ctx, searchTerm) {
    return this.safeExecute(async () => {
      if (!searchTerm || searchTerm.trim().length < 2) {
        return await ctx.reply('❌ Qidiruv uchun kamida 2 ta harf kiriting');
      }

      const [products, categories, branches] = await Promise.all([
        ProductHandlers.searchProducts(searchTerm),
        CategoryHandlers.searchCategories(searchTerm),
        BranchHandlers.searchBranches(searchTerm)
      ]);

      const totalResults = products.length + categories.length + branches.length;

      if (totalResults === 0) {
        return await ctx.reply(
          `🔍 **Qidiruv natijalari**\n\n"${searchTerm}" bo'yicha hech narsa topilmadi.`,
          {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: '🔙 Bosh sahifa', callback_data: 'back_to_main' }]
              ]
            }
          }
        );
      }

      let message = `🔍 **Qidiruv natijalari**\n\n"${searchTerm}" bo'yicha ${totalResults} ta natija topildi:\n\n`;
      const keyboard = { inline_keyboard: [] };

      // Categories
      if (categories.length > 0) {
        message += `📂 **Kategoriyalar (${categories.length}):**\n`;
        categories.forEach((category, index) => {
          message += `${index + 1}. ${category.name}\n`;
          keyboard.inline_keyboard.push([{
            text: `📂 ${category.name}`,
            callback_data: `category_${category._id}`
          }]);
        });
        message += '\n';
      }

      // Products  
      if (products.length > 0) {
        message += `🍽️ **Mahsulotlar (${products.length}):**\n`;
        products.slice(0, 5).forEach((product, index) => {
          message += `${index + 1}. ${product.name} - ${product.price.toLocaleString()} so'm\n`;
          keyboard.inline_keyboard.push([{
            text: `🍽️ ${product.name}`,
            callback_data: `product_details_${product._id}`
          }]);
        });
        if (products.length > 5) {
          message += `... va yana ${products.length - 5} ta\n`;
        }
        message += '\n';
      }

      // Branches
      if (branches.length > 0) {
        message += `🏢 **Filiallar (${branches.length}):**\n`;
        branches.forEach((branch, index) => {
          message += `${index + 1}. ${branch.name}\n`;
          keyboard.inline_keyboard.push([{
            text: `🏢 ${branch.name}`,
            callback_data: `branch_${branch._id}`
          }]);
        });
      }

      keyboard.inline_keyboard.push([{ text: '🔙 Bosh sahifa', callback_data: 'back_to_main' }]);

      await ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    }, ctx, '❌ Qidiruv natijalarini ko\'rsatishda xatolik!');
  }
}

module.exports = UserCatalogHandlers;
