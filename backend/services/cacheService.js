class MemoryCache {
  constructor(options = {}) {
    this.cache = new Map();
    this.maxSize = options.maxSize || 1000;
    this.defaultTTL = options.defaultTTL || 5 * 60 * 1000; // 5 minut
    this.cleanupInterval = options.cleanupInterval || 60 * 1000; // 1 minut
    
    // Avtomatik tozalash
    this.startCleanupTimer();
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`💾 Memory Cache initialized (max: ${this.maxSize} items, TTL: ${this.defaultTTL}ms)`);
    }
  }
  
  // Ma'lumot saqlash
  set(key, value, customTTL = null) {
    // Agar cache to'lib ketgan bo'lsa, eng eski elementni o'chirish
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
      if (process.env.CACHE_DEBUG === 'true') {
        console.log(`🗑️ Cache cleaned: removed ${firstKey}`);
      }
    }
    
    const ttl = customTTL || this.defaultTTL;
    const expireAt = Date.now() + ttl;
    
    this.cache.set(key, {
      value,
      expireAt,
      createdAt: Date.now(),
      accessCount: 0
    });
    
    if (process.env.CACHE_DEBUG === 'true') {
      console.log(`💾 Cache set: ${key} (TTL: ${ttl}ms)`);
    }
    return true;
  }
  
  // Ma'lumot olish
  get(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }
    
    // Vaqti o'tgan bo'lsa o'chirish
    if (Date.now() > item.expireAt) {
      this.cache.delete(key);
      if (process.env.CACHE_DEBUG === 'true') {
        console.log(`⏰ Cache expired: ${key}`);
      }
      return null;
    }
    
    // Access count'ni oshirish (statistika uchun)
    item.accessCount++;
    item.lastAccessed = Date.now();
    
    return item.value;
  }
  
  // Ma'lumot mavjudligini tekshirish
  has(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      return false;
    }
    
    // Vaqti o'tgan bo'lsa false qaytarish
    if (Date.now() > item.expireAt) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }
  
  // Ma'lumotni o'chirish
  delete(key) {
    const deleted = this.cache.delete(key);
    if (deleted) {
      console.log(`🗑️ Cache deleted: ${key}`);
    }
    return deleted;
  }
  
  // Pattern bo'yicha o'chirish
  invalidate(pattern) {
    let deletedCount = 0;
    
    for (const key of this.cache.keys()) {
      if (this.matchesPattern(key, pattern)) {
        this.cache.delete(key);
        deletedCount++;
      }
    }
    
    console.log(`🗑️ Cache invalidated: ${deletedCount} items matching "${pattern}"`);
    return deletedCount;
  }
  
  // Pattern matching
  matchesPattern(key, pattern) {
    // Wildcard support: products:* -> products:123, products:456
    if (pattern.includes('*')) {
      const regex = pattern.replace(/\*/g, '.*');
      return new RegExp(`^${regex}$`).test(key);
    }
    
    // Exact match or includes
    return key.includes(pattern);
  }
  
  // TTL ni yangilash
  updateTTL(key, newTTL) {
    const item = this.cache.get(key);
    
    if (!item) {
      return false;
    }
    
    item.expireAt = Date.now() + newTTL;
    console.log(`⏰ Cache TTL updated: ${key} (new TTL: ${newTTL}ms)`);
    return true;
  }
  
  // Cache'ni tozalash
  clear() {
    const size = this.cache.size;
    this.cache.clear();
    console.log(`🗑️ Cache cleared: ${size} items removed`);
    return size;
  }
  
  // Statistika olish
  getStats() {
    let totalAccessCount = 0;
    let expiredCount = 0;
    const now = Date.now();
    
    for (const [key, item] of this.cache.entries()) {
      totalAccessCount += item.accessCount;
      
      if (now > item.expireAt) {
        expiredCount++;
      }
    }
    
    return {
      totalItems: this.cache.size,
      maxSize: this.maxSize,
      usage: ((this.cache.size / this.maxSize) * 100).toFixed(2) + '%',
      totalAccessCount,
      expiredCount,
      hitRate: totalAccessCount > 0 ? ((totalAccessCount - expiredCount) / totalAccessCount * 100).toFixed(2) + '%' : '0%'
    };
  }
  
  // Barcha kalitlarni olish
  keys() {
    return Array.from(this.cache.keys());
  }
  
  // Barcha qiymatlarni olish (debug uchun)
  values() {
    const values = [];
    for (const [key, item] of this.cache.entries()) {
      values.push({
        key,
        value: item.value,
        expireAt: new Date(item.expireAt),
        createdAt: new Date(item.createdAt),
        accessCount: item.accessCount,
        lastAccessed: item.lastAccessed ? new Date(item.lastAccessed) : null
      });
    }
    return values;
  }
  
  // Vaqti o'tgan elementlarni tozalash
  cleanup() {
    let cleanedCount = 0;
    const now = Date.now();
    
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expireAt) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`🧹 Cache cleanup: ${cleanedCount} expired items removed`);
    }
    
    return cleanedCount;
  }
  
  // Avtomatik tozalash taymer
  startCleanupTimer() {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
    
    console.log(`⏰ Cache cleanup timer started (interval: ${this.cleanupInterval}ms)`);
  }
  
  // Tozalash taymerini to'xtatish
  stopCleanupTimer() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      console.log('⏰ Cache cleanup timer stopped');
    }
  }
  
  // Graceful shutdown
  destroy() {
    this.stopCleanupTimer();
    this.clear();
    console.log('💾 Memory Cache destroyed');
  }
}

// Predefined cache instances
const cache = new MemoryCache({
  maxSize: 1000,
  defaultTTL: 5 * 60 * 1000, // 5 minut
  cleanupInterval: 2 * 60 * 1000 // 2 minut
});

// Kategoriyalar uchun alohida cache (uzoq TTL)
const categoryCache = new MemoryCache({
  maxSize: 100,
  defaultTTL: 15 * 60 * 1000, // 15 minut
  cleanupInterval: 5 * 60 * 1000 // 5 minut
});

// Mahsulotlar uchun cache
const productCache = new MemoryCache({
  maxSize: 500,
  defaultTTL: 10 * 60 * 1000, // 10 minut
  cleanupInterval: 3 * 60 * 1000 // 3 minut
});

// Cache helper funksiyalari
const CacheHelper = {
  // Kategoriyalar
  async getCategories(fetchFunction) {
    const key = 'categories:all';
    let categories = categoryCache.get(key);
    
    if (!categories) {
      categories = await fetchFunction();
      categoryCache.set(key, categories, 15 * 60 * 1000); // 15 minut
    }
    
    return categories;
  },
  
  // Mahsulotlar kategoriya bo'yicha
  async getCategoryProducts(categoryId, fetchFunction) {
    const key = `products:category:${categoryId}`;
    let products = productCache.get(key);
    
    if (!products) {
      products = await fetchFunction(categoryId);
      productCache.set(key, products, 10 * 60 * 1000); // 10 minut
    }
    
    return products;
  },
  
  // Bitta mahsulot
  async getProduct(productId, fetchFunction) {
    const key = `product:${productId}`;
    let product = productCache.get(key);
    
    if (!product) {
      product = await fetchFunction(productId);
      if (product) {
        productCache.set(key, product, 10 * 60 * 1000); // 10 minut
      }
    }
    
    return product;
  },
  
  // User ma'lumotlari
  async getUserData(userId, fetchFunction) {
    const key = `user:${userId}`;
    let user = cache.get(key);
    
    if (!user) {
      user = await fetchFunction(userId);
      if (user) {
        cache.set(key, user, 5 * 60 * 1000); // 5 minut
      }
    }
    
    return user;
  },
  
  // Cache invalidation
  invalidateUser(userId) {
    cache.delete(`user:${userId}`);
  },
  
  invalidateProduct(productId) {
    productCache.delete(`product:${productId}`);
    // Kategoriya cache'ni ham tozalash (chunki mahsulot o'zgargan)
    productCache.invalidate('products:category:');
  },
  
  invalidateCategory(categoryId) {
    categoryCache.delete('categories:all');
    productCache.delete(`products:category:${categoryId}`);
  },
  
  // Global cache stats
  getAllStats() {
    return {
      main: cache.getStats(),
      categories: categoryCache.getStats(),
      products: productCache.getStats()
    };
  }
};

// Process exit da cache'larni tozalash
process.on('SIGINT', () => {
  console.log('🛑 Shutting down cache...');
  cache.destroy();
  categoryCache.destroy();
  productCache.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('🛑 Shutting down cache...');
  cache.destroy();
  categoryCache.destroy();
  productCache.destroy();
  process.exit(0);
});

module.exports = {
  MemoryCache,
  cache,
  categoryCache,
  productCache,
  CacheHelper
};
