// Redis cache implementatsiyasi
const redis = require('redis');

class CacheService {
  constructor() {
    this.client = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    
    this.client.on('error', (err) => {
      console.error('Redis cache error:', err);
    });
    
    this.client.connect();
  }

  // Mahsulotlar cache
  async getCachedProducts(categoryId = null) {
    const key = categoryId ? `products:category:${categoryId}` : 'products:all';
    const cached = await this.client.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  async setCachedProducts(products, categoryId = null, ttl = 300) {
    const key = categoryId ? `products:category:${categoryId}` : 'products:all';
    await this.client.setEx(key, ttl, JSON.stringify(products));
  }

  // Kategoriyalar cache
  async getCachedCategories() {
    const cached = await this.client.get('categories:active');
    return cached ? JSON.parse(cached) : null;
  }

  async setCachedCategories(categories, ttl = 600) {
    await this.client.setEx('categories:active', ttl, JSON.stringify(categories));
  }

  // Foydalanuvchi sessioni cache
  async cacheUserSession(userId, sessionData, ttl = 3600) {
    await this.client.setEx(`session:${userId}`, ttl, JSON.stringify(sessionData));
  }

  async getUserSession(userId) {
    const cached = await this.client.get(`session:${userId}`);
    return cached ? JSON.parse(cached) : null;
  }

  // Cache invalidation
  async invalidateProductCache() {
    const keys = await this.client.keys('products:*');
    if (keys.length > 0) {
      await this.client.del(keys);
    }
  }

  async invalidateCategoryCache() {
    await this.client.del('categories:active');
  }
}

module.exports = new CacheService();
