const { User, Order, Product, Cart } = require('../../../../../models');
const Favorite = require('../../../../../models/Favorite');

/**
 * Mobile Data Service
 * Mobil ma'lumotlar xizmati
 */

class MobileDataService {
  /**
   * Oxirgi buyurtmalarni olish
   * @param {string} userId - foydalanuvchi ID
   * @param {number} limit - cheklov
   * @returns {Array} - oxirgi buyurtmalar
   */
  static async getRecentOrders(userId, limit = 2) {
    try {
      const orders = await Order.find({ 
        user: userId,
        status: { $in: ['delivered', 'completed'] }
      })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('items.product', 'name')
        .lean();
      
      return orders.map(order => ({
        _id: order._id,
        orderId: order.orderId,
        total: order.total || 0,
        name: this.getOrderDisplayName(order)
      }));
    } catch (error) {
      console.error('Get recent orders error:', error);
      return [];
    }
  }

  /**
   * Sevimli mahsulotlarni olish
   * @param {string} userId - foydalanuvchi ID
   * @param {number} limit - cheklov
   * @returns {Array} - sevimli mahsulotlar
   */
  static async getFavoriteProducts(userId, limit = 3) {
    try {
      const favorites = await Favorite.find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('product', 'name price isActive isAvailable')
        .lean();
      
      return favorites
        .map(fav => fav.product)
        .filter(product => {
          const isAvailable = product?.isAvailable !== false;
          return product && product.isActive && isAvailable;
        });
    } catch (error) {
      console.error('Get favorite products error:', error);
      return [];
    }
  }

  /**
   * Mashhur mahsulotlarni olish
   * @param {number} limit - cheklov
   * @returns {Array} - mashhur mahsulotlar
   */
  static async getPopularProducts(limit = 5) {
    try {
      // Get most ordered products
      const popularProducts = await Order.aggregate([
        { $match: { status: { $in: ['delivered', 'completed'] } } },
        { $unwind: '$items' },
        { 
          $group: { 
            _id: '$items.product', 
            orderCount: { $sum: '$items.quantity' },
            productName: { $first: '$items.productName' }
          } 
        },
        { $sort: { orderCount: -1 } },
        { $limit: limit },
        {
          $lookup: {
            from: 'products',
            localField: '_id',
            foreignField: '_id',
            as: 'product'
          }
        },
        { $unwind: '$product' },
        { 
          $match: { 
            'product.isActive': true,
            $or: [
              { 'product.isAvailable': true },
              { 'product.isAvailable': { $exists: false } }
            ]
          } 
        }
      ]);

      return popularProducts.map(item => ({
        _id: item._id,
        name: item.product.name,
        price: item.product.price,
        orderCount: item.orderCount
      }));
    } catch (error) {
      console.error('Get popular products error:', error);
      return [];
    }
  }

  /**
   * Tez tayyor mahsulotlarni olish
   * @param {number} limit - cheklov
   * @returns {Array} - tez tayyor mahsulotlar
   */
  static async getFastProducts(limit = 5) {
    try {
      // Get products marked as fast or from fast categories
      const fastProducts = await Product.find({
        isActive: true,
        $or: [
          { isAvailable: true },
          { isAvailable: { $exists: false } }
        ],
        $and: [
          {
            $or: [
              { preparationTime: { $lte: 15 } }, // 15 minutes or less
              { tags: { $in: ['fast', 'quick', 'tez'] } }
            ]
          }
        ]
      })
        .limit(limit)
        .sort({ preparationTime: 1, createdAt: -1 })
        .lean();

      return fastProducts;
    } catch (error) {
      console.error('Get fast products error:', error);
      return [];
    }
  }

  /**
   * Buyurtma nomini formatlash
   * @param {Object} order - buyurtma obyekti
   * @returns {string} - formatli nom
   */
  static getOrderDisplayName(order) {
    if (!order.items || order.items.length === 0) {
      return `Buyurtma #${order.orderId || 'N/A'}`;
    }

    const firstItem = order.items[0];
    const itemName = firstItem.productName || firstItem.product?.name || 'Mahsulot';
    
    if (order.items.length === 1) {
      return `${itemName} x${firstItem.quantity}`;
    } else {
      return `${itemName} +${order.items.length - 1} ta`;
    }
  }
}

module.exports = MobileDataService;