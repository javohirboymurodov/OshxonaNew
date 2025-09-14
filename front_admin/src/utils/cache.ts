/**
 * Advanced Caching Utilities for Front Admin
 * Implements multiple caching strategies for optimal performance
 */

export interface CacheItem<T = any> {
  data: T;
  timestamp: number;
  expiresAt: number;
  accessCount: number;
  lastAccessed: number;
}

export interface CacheConfig {
  maxSize: number;
  defaultTTL: number; // Time to live in milliseconds
  maxAge: number; // Maximum age before cleanup
  strategy: 'LRU' | 'LFU' | 'FIFO';
}

export type CacheKey = string | number;

class AdvancedCache {
  private cache = new Map<CacheKey, CacheItem>();
  private config: CacheConfig;
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    evictions: 0
  };

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: config.maxSize || 1000,
      defaultTTL: config.defaultTTL || 5 * 60 * 1000, // 5 minutes
      maxAge: config.maxAge || 30 * 60 * 1000, // 30 minutes
      strategy: config.strategy || 'LRU'
    };

    // Cleanup expired items every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Get item from cache
   */
  get<T>(key: CacheKey): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update access info
    item.accessCount++;
    item.lastAccessed = Date.now();
    this.stats.hits++;

    return item.data;
  }

  /**
   * Set item in cache
   */
  set<T>(key: CacheKey, data: T, ttl?: number): void {
    const now = Date.now();
    const expiresAt = now + (ttl || this.config.defaultTTL);

    const item: CacheItem<T> = {
      data,
      timestamp: now,
      expiresAt,
      accessCount: 1,
      lastAccessed: now
    };

    // Check if we need to evict
    if (this.cache.size >= this.config.maxSize && !this.cache.has(key)) {
      this.evict();
    }

    this.cache.set(key, item);
    this.stats.sets++;
  }

  /**
   * Delete item from cache
   */
  delete(key: CacheKey): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.deletes++;
    }
    return deleted;
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: CacheKey): boolean {
    const item = this.cache.get(key);
    return item ? Date.now() <= item.expiresAt : false;
  }

  /**
   * Clear all items
   */
  clear(): void {
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0
    };
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      hitRate: total > 0 ? (this.stats.hits / total * 100).toFixed(2) + '%' : '0%',
      size: this.cache.size,
      maxSize: this.config.maxSize
    };
  }

  /**
   * Evict items based on strategy
   */
  private evict(): void {
    if (this.cache.size === 0) return;

    let keyToEvict: CacheKey;

    switch (this.config.strategy) {
      case 'LRU':
        keyToEvict = this.getLRUKey();
        break;
      case 'LFU':
        keyToEvict = this.getLFUKey();
        break;
      case 'FIFO':
        keyToEvict = this.getFIFOKey();
        break;
      default:
        keyToEvict = this.getLRUKey();
    }

    this.cache.delete(keyToEvict);
    this.stats.evictions++;
  }

  private getLRUKey(): CacheKey {
    let oldestKey: CacheKey = '';
    let oldestTime = Date.now();

    for (const [key, item] of this.cache) {
      if (item.lastAccessed < oldestTime) {
        oldestTime = item.lastAccessed;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  private getLFUKey(): CacheKey {
    let leastFrequentKey: CacheKey = '';
    let leastFrequent = Infinity;

    for (const [key, item] of this.cache) {
      if (item.accessCount < leastFrequent) {
        leastFrequent = item.accessCount;
        leastFrequentKey = key;
      }
    }

    return leastFrequentKey;
  }

  private getFIFOKey(): CacheKey {
    let oldestKey: CacheKey = '';
    let oldestTime = Date.now();

    for (const [key, item] of this.cache) {
      if (item.timestamp < oldestTime) {
        oldestTime = item.timestamp;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  /**
   * Cleanup expired items
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: CacheKey[] = [];

    for (const [key, item] of this.cache) {
      if (now > item.expiresAt || (now - item.timestamp) > this.config.maxAge) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
  }
}

// Specialized caches for different data types
export const apiCache = new AdvancedCache({
  maxSize: 500,
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  strategy: 'LRU'
});

export const componentCache = new AdvancedCache({
  maxSize: 100,
  defaultTTL: 10 * 60 * 1000, // 10 minutes
  strategy: 'LFU'
});

export const userDataCache = new AdvancedCache({
  maxSize: 200,
  defaultTTL: 15 * 60 * 1000, // 15 minutes
  strategy: 'LRU'
});

// React Query cache configuration
export const queryCacheConfig = {
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      retry: (failureCount: number, error: any) => {
        // Don't retry on 4xx errors
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false;
        }
        return failureCount < 3;
      }
    },
    mutations: {
      retry: false
    }
  }
};

// Local Storage wrapper with expiration
export class LocalStorageCache {
  private prefix: string;

  constructor(prefix = 'oshxona_admin_') {
    this.prefix = prefix;
  }

  set<T>(key: string, value: T, ttl?: number): void {
    const item = {
      data: value,
      timestamp: Date.now(),
      expiresAt: ttl ? Date.now() + ttl : undefined
    };

    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(item));
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  }

  get<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(this.prefix + key);
      if (!item) return null;

      const parsed = JSON.parse(item);
      
      // Check expiration
      if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
        this.remove(key);
        return null;
      }

      return parsed.data;
    } catch (error) {
      console.warn('Failed to read from localStorage:', error);
      return null;
    }
  }

  remove(key: string): void {
    localStorage.removeItem(this.prefix + key);
  }

  clear(): void {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(this.prefix)) {
        localStorage.removeItem(key);
      }
    });
  }
}

export const localStorageCache = new LocalStorageCache();

// Session Storage wrapper
export class SessionStorageCache {
  private prefix: string;

  constructor(prefix = 'oshxona_session_') {
    this.prefix = prefix;
  }

  set<T>(key: string, value: T): void {
    try {
      sessionStorage.setItem(this.prefix + key, JSON.stringify(value));
    } catch (error) {
      console.warn('Failed to save to sessionStorage:', error);
    }
  }

  get<T>(key: string): T | null {
    try {
      const item = sessionStorage.getItem(this.prefix + key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.warn('Failed to read from sessionStorage:', error);
      return null;
    }
  }

  remove(key: string): void {
    sessionStorage.removeItem(this.prefix + key);
  }

  clear(): void {
    const keys = Object.keys(sessionStorage);
    keys.forEach(key => {
      if (key.startsWith(this.prefix)) {
        sessionStorage.removeItem(key);
      }
    });
  }
}

export const sessionStorageCache = new SessionStorageCache();

// Cache utilities
export const cacheUtils = {
  // Generate cache key from object
  generateKey: (prefix: string, params: Record<string, any>): string => {
    const sorted = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|');
    return `${prefix}:${sorted}`;
  },

  // Invalidate cache by pattern
  invalidatePattern: (cache: AdvancedCache, pattern: string): void => {
    // This would need to be implemented based on your key structure
    console.log(`Invalidating cache pattern: ${pattern}`);
  },

  // Preload cache
  preload: async <T>(
    cache: AdvancedCache,
    key: CacheKey,
    loader: () => Promise<T>,
    ttl?: number
  ): Promise<T> => {
    const cached = cache.get<T>(key);
    if (cached) return cached;

    const data = await loader();
    cache.set(key, data, ttl);
    return data;
  }
};

export default AdvancedCache;