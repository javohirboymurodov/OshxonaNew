/**
 * Performance Middleware
 * Express middleware'lar uchun performance monitoring
 */

const performanceMonitor = require('../services/PerformanceMonitor');

/**
 * Request performance monitoring middleware
 */
function performanceMiddleware(req, res, next) {
  const startTime = Date.now();
  
  // Response end event'ini kuzatish
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    const success = res.statusCode < 400;
    
    // Performance metrics qayd etish
    performanceMonitor.recordRequest(responseTime, success);
    
    // Slow request alert
    if (responseTime > 3000) { // 3 seconds
      console.log(`⚠️ Slow request: ${req.method} ${req.path} - ${responseTime}ms`);
    }
  });
  
  next();
}

/**
 * Database query performance monitoring
 */
function databasePerformanceMiddleware(query, options = {}) {
  const startTime = Date.now();
  
  return function(result) {
    const queryTime = Date.now() - startTime;
    const isSlow = queryTime > 1000; // 1 second
    
    // Database metrics qayd etish
    performanceMonitor.recordQuery(queryTime, isSlow);
    
    // Slow query alert
    if (isSlow) {
      console.log(`⚠️ Slow query: ${query} - ${queryTime}ms`);
    }
    
    return result;
  };
}

/**
 * Cache performance monitoring
 */
function cachePerformanceMiddleware(cacheKey, hit) {
  if (hit) {
    performanceMonitor.recordCacheHit();
  } else {
    performanceMonitor.recordCacheMiss();
  }
}

/**
 * Memory usage monitoring
 */
function memoryMonitoringMiddleware(req, res, next) {
  const memUsage = process.memoryUsage();
  const memoryUsageMB = Math.round(memUsage.heapUsed / 1024 / 1024);
  
  // Memory usage header qo'shish
  res.set('X-Memory-Usage', `${memoryUsageMB}MB`);
  
  // High memory usage alert
  if (memoryUsageMB > 500) {
    console.log(`⚠️ High memory usage: ${memoryUsageMB}MB`);
  }
  
  next();
}

/**
 * Response time monitoring
 */
function responseTimeMiddleware(req, res, next) {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    
    // Response time header qo'shish
    res.set('X-Response-Time', `${responseTime}ms`);
    
    // Response time categories
    if (responseTime < 100) {
      res.set('X-Performance', 'excellent');
    } else if (responseTime < 500) {
      res.set('X-Performance', 'good');
    } else if (responseTime < 1000) {
      res.set('X-Performance', 'fair');
    } else {
      res.set('X-Performance', 'poor');
    }
  });
  
  next();
}

/**
 * API endpoint performance monitoring
 */
function apiPerformanceMiddleware(req, res, next) {
  const startTime = Date.now();
  const endpoint = `${req.method} ${req.path}`;
  
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    const success = res.statusCode < 400;
    
    // Detailed API metrics
    console.log(`📊 API: ${endpoint} - ${responseTime}ms - ${res.statusCode} - ${success ? 'SUCCESS' : 'FAILED'}`);
    
    // Performance categories
    let category = 'unknown';
    if (responseTime < 100) category = 'excellent';
    else if (responseTime < 300) category = 'good';
    else if (responseTime < 1000) category = 'fair';
    else category = 'poor';
    
    res.set('X-Performance-Category', category);
  });
  
  next();
}

/**
 * Bot performance monitoring
 */
function botPerformanceMiddleware(ctx, next) {
  const startTime = Date.now();
  const action = ctx.callbackQuery?.data || ctx.message?.text || 'unknown';
  
  return next().finally(() => {
    const responseTime = Date.now() - startTime;
    const success = !ctx.error;
    
    // Bot performance metrics
    performanceMonitor.recordRequest(responseTime, success);
    
    console.log(`🤖 Bot: ${action} - ${responseTime}ms - ${success ? 'SUCCESS' : 'FAILED'}`);
  });
}

/**
 * Performance stats endpoint
 */
function performanceStatsEndpoint(req, res) {
  try {
    const metrics = performanceMonitor.getMetrics();
    const report = performanceMonitor.generateReport();
    
    res.json({
      success: true,
      data: {
        metrics,
        report,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get performance stats'
    });
  }
}

/**
 * Performance health check
 */
function performanceHealthCheck(req, res) {
  try {
    const metrics = performanceMonitor.getMetrics();
    
    const isHealthy = 
      metrics.memory.used < 500 && // Less than 500MB
      metrics.cpu.usage < 80 &&   // Less than 80% CPU
      metrics.requests.averageResponseTime < 2000; // Less than 2s response time
    
    res.json({
      success: true,
      healthy: isHealthy,
      data: {
        memory: `${metrics.memory.used}MB`,
        cpu: `${metrics.cpu.usage}%`,
        responseTime: `${metrics.requests.averageResponseTime}ms`,
        cacheHitRate: `${metrics.cache.hitRate.toFixed(2)}%`
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      healthy: false,
      error: 'Performance health check failed'
    });
  }
}

module.exports = {
  performanceMiddleware,
  databasePerformanceMiddleware,
  cachePerformanceMiddleware,
  memoryMonitoringMiddleware,
  responseTimeMiddleware,
  apiPerformanceMiddleware,
  botPerformanceMiddleware,
  performanceStatsEndpoint,
  performanceHealthCheck
};