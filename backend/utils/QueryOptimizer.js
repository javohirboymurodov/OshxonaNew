// Query Optimizer - Database query'larni optimizatsiya qilish
const { memoryCache, CacheKeys, CacheTTL } = require('./cache');
const logger = require('./logger');

class QueryOptimizer {
  /**
   * Optimized user lookup with caching
   */
  static async findUserByTelegramId(telegramId, useCache = true) {
    const cacheKey = CacheKeys.USER_PROFILE(telegramId);
    
    if (useCache) {
      const cached = memoryCache.get(cacheKey);
      if (cached) {
        logger.debug('User cache hit', { telegramId });
        return cached;
      }
    }

    try {
      const { User } = require('../models');
      const user = await User.findOne({ telegramId }).lean();
      
      if (user && useCache) {
        memoryCache.set(cacheKey, user, CacheTTL.USER_DATA);
      }
      
      return user;
    } catch (error) {
      logger.error('User lookup error', { telegramId, error: error.message });
      return null;
    }
  }

  /**
   * Optimized cart lookup with caching
   */
  static async findActiveCartByUser(userId, useCache = true) {
    const cacheKey = `cart:active:${userId}`;
    
    if (useCache) {
      const cached = memoryCache.get(cacheKey);
      if (cached) {
        logger.debug('Cart cache hit', { userId });
        return cached;
      }
    }

    try {
      const { Cart } = require('../models');
      const cart = await Cart.findOne({ user: userId, isActive: true })
        .populate('items.productId', 'name price image')
        .lean();
      
      if (cart && useCache) {
        memoryCache.set(cacheKey, cart, CacheTTL.SHORT);
      }
      
      return cart;
    } catch (error) {
      logger.error('Cart lookup error', { userId, error: error.message });
      return null;
    }
  }

  /**
   * Optimized products lookup with caching
   */
  static async findActiveProducts(branchId, categoryId = null, useCache = true) {
    const cacheKey = categoryId 
      ? CacheKeys.PRODUCTS_BY_CATEGORY(branchId, categoryId)
      : CacheKeys.PRODUCTS_BY_BRANCH(branchId);
    
    if (useCache) {
      const cached = memoryCache.get(cacheKey);
      if (cached) {
        logger.debug('Products cache hit', { branchId, categoryId });
        return cached;
      }
    }

    try {
      const { Product } = require('../models');
      let query = { isActive: true };
      
      if (categoryId) {
        query.categoryId = categoryId;
      }
      
      const products = await Product.find(query)
        .populate('categoryId', 'name')
        .lean()
        .limit(50); // Limit for performance
      
      if (products && useCache) {
        memoryCache.set(cacheKey, products, CacheTTL.PRODUCTS);
      }
      
      return products;
    } catch (error) {
      logger.error('Products lookup error', { branchId, categoryId, error: error.message });
      return [];
    }
  }

  /**
   * Optimized orders lookup with caching
   */
  static async findOrdersByStatus(status, branchId = null, limit = 20, useCache = true) {
    const cacheKey = branchId 
      ? CacheKeys.BRANCH_ORDERS(branchId, status, 1)
      : `orders:${status}:${limit}`;
    
    if (useCache) {
      const cached = memoryCache.get(cacheKey);
      if (cached) {
        logger.debug('Orders cache hit', { status, branchId });
        return cached;
      }
    }

    try {
      const { Order } = require('../models');
      let query = { status };
      
      if (branchId) {
        query.branch = branchId;
      }
      
      const orders = await Order.find(query)
        .populate('user', 'firstName lastName phone')
        .populate('deliveryInfo.courier', 'firstName lastName phone')
        .lean()
        .limit(limit)
        .sort({ createdAt: -1 });
      
      if (orders && useCache) {
        memoryCache.set(cacheKey, orders, CacheTTL.ORDERS);
      }
      
      return orders;
    } catch (error) {
      logger.error('Orders lookup error', { status, branchId, error: error.message });
      return [];
    }
  }

  /**
   * Clear cache for specific user
   */
  static clearUserCache(userId, telegramId) {
    memoryCache.delete(CacheKeys.USER_PROFILE(userId));
    memoryCache.delete(CacheKeys.USER_PROFILE(telegramId));
    memoryCache.delete(`cart:active:${userId}`);
    logger.debug('User cache cleared', { userId, telegramId });
  }

  /**
   * Clear cache for specific order
   */
  static clearOrderCache(orderId, branchId, userId) {
    memoryCache.delete(CacheKeys.ORDER_DETAILS(orderId));
    memoryCache.delete(CacheKeys.USER_ORDERS(userId, 1));
    
    if (branchId) {
      memoryCache.delete(CacheKeys.BRANCH_ORDERS(branchId, 'pending', 1));
      memoryCache.delete(CacheKeys.BRANCH_ORDERS(branchId, 'confirmed', 1));
    }
    
    logger.debug('Order cache cleared', { orderId, branchId, userId });
  }

  /**
   * Clear cache for specific product
   */
  static clearProductCache(productId, branchId, categoryId) {
    memoryCache.delete(CacheKeys.PRODUCT_DETAILS(productId));
    memoryCache.delete(CacheKeys.PRODUCTS_BY_BRANCH(branchId));
    
    if (categoryId) {
      memoryCache.delete(CacheKeys.PRODUCTS_BY_CATEGORY(branchId, categoryId));
    }
    
    logger.debug('Product cache cleared', { productId, branchId, categoryId });
  }

  /**
   * Get cache statistics
   */
  static getCacheStats() {
    return {
      ...memoryCache.getStats(),
      cacheKeys: Object.keys(CacheKeys).length,
      cacheTTL: Object.keys(CacheTTL).length
    };
  }
}

module.exports = QueryOptimizer;