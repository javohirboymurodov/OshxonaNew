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
   * Optimized branch lookup with caching
   */
  static async findBranchById(branchId, useCache = true) {
    const cacheKey = `branch:${branchId}`;
    
    if (useCache) {
      const cached = memoryCache.get(cacheKey);
      if (cached) {
        logger.debug('Branch cache hit', { branchId });
        return cached;
      }
    }

    try {
      const { Branch } = require('../models');
      const branch = await Branch.findById(branchId).lean();
      
      if (branch && useCache) {
        memoryCache.set(cacheKey, branch, CacheTTL.USER_DATA);
      }
      
      return branch;
    } catch (error) {
      logger.error('Branch lookup error', { branchId, error: error.message });
      return null;
    }
  }

  /**
   * Optimized courier lookup with caching
   */
  static async findCourierById(courierId, useCache = true) {
    const cacheKey = `courier:${courierId}`;
    
    if (useCache) {
      const cached = memoryCache.get(cacheKey);
      if (cached) {
        logger.debug('Courier cache hit', { courierId });
        return cached;
      }
    }

    try {
      const { User } = require('../models');
      const courier = await User.findOne({ 
        _id: courierId, 
        role: 'courier' 
      }).select('firstName lastName phone courierInfo telegramId').lean();
      
      if (courier && useCache) {
        memoryCache.set(cacheKey, courier, CacheTTL.USER_DATA);
      }
      
      return courier;
    } catch (error) {
      logger.error('Courier lookup error', { courierId, error: error.message });
      return null;
    }
  }

  /**
   * Optimized category lookup with caching
   */
  static async findCategoriesByBranch(branchId, useCache = true) {
    const cacheKey = `categories:${branchId}`;
    
    if (useCache) {
      const cached = memoryCache.get(cacheKey);
      if (cached) {
        logger.debug('Categories cache hit', { branchId });
        return cached;
      }
    }

    try {
      const { Category } = require('../models');
      const categories = await Category.find({ 
        branch: branchId, 
        isActive: true 
      }).select('name description image').lean();
      
      if (categories && useCache) {
        memoryCache.set(cacheKey, categories, CacheTTL.PRODUCTS);
      }
      
      return categories;
    } catch (error) {
      logger.error('Categories lookup error', { branchId, error: error.message });
      return [];
    }
  }

  /**
   * Batch operations for better performance
   */
  static async batchFindUsers(telegramIds, useCache = true) {
    const results = {};
    const uncachedIds = [];
    
    if (useCache) {
      for (const telegramId of telegramIds) {
        const cached = memoryCache.get(CacheKeys.USER_PROFILE(telegramId));
        if (cached) {
          results[telegramId] = cached;
        } else {
          uncachedIds.push(telegramId);
        }
      }
    } else {
      uncachedIds.push(...telegramIds);
    }

    if (uncachedIds.length > 0) {
      try {
        const { User } = require('../models');
        const users = await User.find({ 
          telegramId: { $in: uncachedIds } 
        }).lean();
        
        users.forEach(user => {
          results[user.telegramId] = user;
          if (useCache) {
            memoryCache.set(CacheKeys.USER_PROFILE(user.telegramId), user, CacheTTL.USER_DATA);
          }
        });
      } catch (error) {
        logger.error('Batch users lookup error', { telegramIds: uncachedIds, error: error.message });
      }
    }

    return results;
  }

  /**
   * Optimized search with pagination
   */
  static async searchProducts(query, branchId, page = 1, limit = 20, useCache = true) {
    const cacheKey = `search:products:${query}:${branchId}:${page}:${limit}`;
    
    if (useCache) {
      const cached = memoryCache.get(cacheKey);
      if (cached) {
        logger.debug('Search cache hit', { query, branchId, page });
        return cached;
      }
    }

    try {
      const { Product } = require('../models');
      const searchQuery = {
        isActive: true,
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } }
        ]
      };

      const skip = (page - 1) * limit;
      
      const [products, total] = await Promise.all([
        Product.find(searchQuery)
          .populate('categoryId', 'name')
          .lean()
          .skip(skip)
          .limit(limit)
          .sort({ name: 1 }),
        Product.countDocuments(searchQuery)
      ]);

      const result = {
        products,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };

      if (useCache) {
        memoryCache.set(cacheKey, result, CacheTTL.SHORT);
      }
      
      return result;
    } catch (error) {
      logger.error('Search products error', { query, branchId, error: error.message });
      return { products: [], pagination: { page, limit, total: 0, pages: 0 } };
    }
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

  /**
   * Clear all cache
   */
  static clearAllCache() {
    memoryCache.clear();
    logger.info('All cache cleared');
  }

  /**
   * Warm up cache with frequently used data
   */
  static async warmUpCache() {
    try {
      logger.info('Starting cache warm-up...');
      
      // Warm up active products
      const { Product } = require('../models');
      const products = await Product.find({ isActive: true })
        .select('name price categoryId')
        .lean()
        .limit(100);
      
      const productCacheKey = 'products:warmup';
      memoryCache.set(productCacheKey, products, CacheTTL.PRODUCTS);
      
      logger.info(`Cache warm-up completed. Cached ${products.length} products.`);
    } catch (error) {
      logger.error('Cache warm-up error', { error: error.message });
    }
  }
}

module.exports = QueryOptimizer;