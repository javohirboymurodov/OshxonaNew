// utils/cache.js
const logger = require('./logger');

class MemoryCache {
  constructor() {
    this.cache = new Map();
    this.ttlMap = new Map();
    this.maxSize = 1000; // Maximum cache entries
    
    // Clean expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  set(key, value, ttlMs = 300000) { // Default 5 minutes TTL
    try {
      // Remove oldest entries if cache is full
      if (this.cache.size >= this.maxSize) {
        const firstKey = this.cache.keys().next().value;
        this.delete(firstKey);
      }

      const expiresAt = Date.now() + ttlMs;
      this.cache.set(key, value);
      this.ttlMap.set(key, expiresAt);
      
      logger.debug('Cache set', { key, ttl: ttlMs });
    } catch (error) {
      logger.error('Cache set error', { key, error: error.message });
    }
  }

  get(key) {
    try {
      const expiresAt = this.ttlMap.get(key);
      
      // Check if expired
      if (!expiresAt || Date.now() > expiresAt) {
        this.delete(key);
        return null;
      }

      const value = this.cache.get(key);
      logger.debug('Cache hit', { key });
      return value;
    } catch (error) {
      logger.error('Cache get error', { key, error: error.message });
      return null;
    }
  }

  delete(key) {
    this.cache.delete(key);
    this.ttlMap.delete(key);
    logger.debug('Cache delete', { key });
  }

  clear() {
    this.cache.clear();
    this.ttlMap.clear();
    logger.info('Cache cleared');
  }

  cleanup() {
    const now = Date.now();
    let expiredCount = 0;

    for (const [key, expiresAt] of this.ttlMap.entries()) {
      if (now > expiresAt) {
        this.delete(key);
        expiredCount++;
      }
    }

    if (expiredCount > 0) {
      logger.info('Cache cleanup', { 
        expiredEntries: expiredCount,
        remainingEntries: this.cache.size 
      });
    }
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      usage: ((this.cache.size / this.maxSize) * 100).toFixed(2) + '%'
    };
  }
}

// Cache utility functions
class CacheUtils {
  static generateKey(...parts) {
    return parts.filter(p => p !== null && p !== undefined).join(':');
  }

  static async getOrSet(cache, key, fetchFunction, ttl = 300000) {
    // Try to get from cache first
    let value = cache.get(key);
    
    if (value === null) {
      try {
        // Cache miss, fetch data
        logger.debug('Cache miss, fetching data', { key });
        value = await fetchFunction();
        
        // Store in cache if value exists
        if (value !== null && value !== undefined) {
          cache.set(key, value, ttl);
        }
      } catch (error) {
        logger.error('Cache fetch error', { key, error: error.message });
        throw error;
      }
    }

    return value;
  }
}

// Predefined cache keys
const CacheKeys = {
  // Products
  PRODUCTS_BY_BRANCH: (branchId) => `products:branch:${branchId}`,
  PRODUCTS_BY_CATEGORY: (branchId, categoryId) => `products:branch:${branchId}:category:${categoryId}`,
  PRODUCT_DETAILS: (productId) => `product:${productId}`,
  BRANCH_PRODUCTS: (branchId) => `branch_products:${branchId}`,
  
  // Categories
  CATEGORIES_ACTIVE: 'categories:active',
  CATEGORIES_ALL: 'categories:all',
  
  // Branches
  BRANCHES_ACTIVE: 'branches:active',
  BRANCH_DETAILS: (branchId) => `branch:${branchId}`,
  
  // Orders
  ORDER_DETAILS: (orderId) => `order:${orderId}`,
  USER_ORDERS: (userId, page = 1) => `user:${userId}:orders:page:${page}`,
  BRANCH_ORDERS: (branchId, status, page = 1) => `branch:${branchId}:orders:${status}:page:${page}`,
  
  // Stats
  DASHBOARD_STATS: (branchId) => `dashboard:stats:${branchId}`,
  ORDER_STATS: (branchId, date) => `order:stats:${branchId}:${date}`,
  
  // User data
  USER_PROFILE: (userId) => `user:${userId}`,
  COURIER_LOCATION: (courierId) => `courier:location:${courierId}`,
  
  // API responses
  API_RESPONSE: (endpoint, params = '') => `api:${endpoint}:${params}`
};

// Cache timeouts (in milliseconds)
const CacheTTL = {
  VERY_SHORT: 30 * 1000,      // 30 seconds
  SHORT: 5 * 60 * 1000,       // 5 minutes
  MEDIUM: 15 * 60 * 1000,     // 15 minutes
  LONG: 60 * 60 * 1000,       // 1 hour
  VERY_LONG: 24 * 60 * 60 * 1000, // 24 hours
  
  // Specific timeouts
  PRODUCTS: 15 * 60 * 1000,    // 15 minutes
  CATEGORIES: 60 * 60 * 1000,  // 1 hour
  BRANCHES: 60 * 60 * 1000,    // 1 hour
  ORDERS: 2 * 60 * 1000,       // 2 minutes
  STATS: 5 * 60 * 1000,        // 5 minutes
  USER_DATA: 10 * 60 * 1000,   // 10 minutes
  COURIER_LOCATION: 30 * 1000  // 30 seconds
};

// Create global cache instance
const memoryCache = new MemoryCache();

// Cache middleware for Express
const cacheMiddleware = (ttl = CacheTTL.SHORT) => {
  return (req, res, next) => {
    const key = CacheKeys.API_RESPONSE(
      req.originalUrl, 
      JSON.stringify(req.query) + JSON.stringify(req.params)
    );

    const cachedResponse = memoryCache.get(key);
    
    if (cachedResponse) {
      logger.debug('API cache hit', { url: req.originalUrl });
      return res.json(cachedResponse);
    }

    // Override res.json to cache the response
    const originalJson = res.json;
    res.json = function(body) {
      // Cache successful responses only
      if (res.statusCode === 200 && body.success !== false) {
        memoryCache.set(key, body, ttl);
        logger.debug('API response cached', { url: req.originalUrl });
      }
      
      return originalJson.call(this, body);
    };

    next();
  };
};

// Cache invalidation helpers
const CacheInvalidation = {
  // Invalidate all product-related cache when product changes
  invalidateProductCache: (productId, branchId) => {
    const patterns = [
      CacheKeys.PRODUCT_DETAILS(productId),
      CacheKeys.PRODUCTS_BY_BRANCH(branchId),
      CacheKeys.BRANCH_PRODUCTS(branchId)
    ];
    
    patterns.forEach(pattern => {
      memoryCache.delete(pattern);
    });
    
    // Invalidate category-specific caches
    for (const [key] of memoryCache.cache.entries()) {
      if (key.includes(`products:branch:${branchId}:category:`)) {
        memoryCache.delete(key);
      }
    }
    
    logger.info('Product cache invalidated', { productId, branchId });
  },

  // Invalidate order-related cache
  invalidateOrderCache: (branchId, userId) => {
    const patterns = [
      CacheKeys.BRANCH_ORDERS(branchId, 'pending', 1),
      CacheKeys.BRANCH_ORDERS(branchId, 'confirmed', 1),
      CacheKeys.USER_ORDERS(userId, 1),
      CacheKeys.DASHBOARD_STATS(branchId)
    ];
    
    patterns.forEach(pattern => {
      memoryCache.delete(pattern);
    });
    
    logger.info('Order cache invalidated', { branchId, userId });
  },

  // Invalidate all cache
  invalidateAll: () => {
    memoryCache.clear();
    logger.info('All cache invalidated');
  }
};

module.exports = {
  memoryCache,
  CacheUtils,
  CacheKeys,
  CacheTTL,
  cacheMiddleware,
  CacheInvalidation
};