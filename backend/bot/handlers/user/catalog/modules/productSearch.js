const mongoose = require('mongoose');
const { Product } = require('../../../../../models');
const BaseHandler = require('../../../../../utils/BaseHandler');

/**
 * Product Search Module
 * Mahsulot qidiruv moduli
 */

class ProductSearch extends BaseHandler {
  /**
   * Mahsulotlarni qidirish
   * @param {string} searchTerm - qidiruv so'zi
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

module.exports = ProductSearch;