/**
 * Performance Monitor
 * Dastur performance'ini monitoring qilish
 */

const EventEmitter = require('events');
const os = require('os');

class PerformanceMonitor extends EventEmitter {
  constructor() {
    super();
    this.metrics = {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        averageResponseTime: 0
      },
      memory: {
        used: 0,
        total: 0,
        free: 0
      },
      cpu: {
        usage: 0,
        loadAverage: [0, 0, 0]
      },
      database: {
        queries: 0,
        slowQueries: 0,
        averageQueryTime: 0
      },
      cache: {
        hits: 0,
        misses: 0,
        hitRate: 0
      }
    };
    
    this.responseTimes = [];
    this.queryTimes = [];
    this.isMonitoring = false;
    this.monitoringInterval = null;
  }

  /**
   * Monitoring'ni ishga tushirish
   */
  start(intervalMs = 30000) {
    if (this.isMonitoring) {
      console.log('⚠️ Performance monitoring already running');
      return;
    }

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, intervalMs);

    console.log(`📊 Performance monitoring started (interval: ${intervalMs}ms)`);
  }

  /**
   * Monitoring'ni to'xtatish
   */
  stop() {
    if (!this.isMonitoring) {
      console.log('⚠️ Performance monitoring not running');
      return;
    }

    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    console.log('📊 Performance monitoring stopped');
  }

  /**
   * Metrics'ni yig'ish
   */
  collectMetrics() {
    try {
      // Memory metrics
      const memUsage = process.memoryUsage();
      this.metrics.memory = {
        used: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
        total: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
        free: Math.round((memUsage.heapTotal - memUsage.heapUsed) / 1024 / 1024) // MB
      };

      // CPU metrics
      const cpus = os.cpus();
      this.metrics.cpu = {
        usage: this.calculateCPUUsage(),
        loadAverage: os.loadavg()
      };

      // Response time metrics
      if (this.responseTimes.length > 0) {
        this.metrics.requests.averageResponseTime = 
          this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length;
      }

      // Database metrics
      if (this.queryTimes.length > 0) {
        this.metrics.database.averageQueryTime = 
          this.queryTimes.reduce((a, b) => a + b, 0) / this.queryTimes.length;
      }

      // Cache metrics
      if (this.metrics.cache.hits + this.metrics.cache.misses > 0) {
        this.metrics.cache.hitRate = 
          (this.metrics.cache.hits / (this.metrics.cache.hits + this.metrics.cache.misses)) * 100;
      }

      // Emit metrics event
      this.emit('metricsCollected', this.metrics);

      // Alert if metrics exceed thresholds
      this.checkAlerts();

    } catch (error) {
      console.error('❌ Error collecting metrics:', error);
    }
  }

  /**
   * CPU usage hisoblash
   */
  calculateCPUUsage() {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });

    return Math.round(100 - (totalIdle / totalTick) * 100);
  }

  /**
   * Request metrics qayd etish
   */
  recordRequest(responseTime, success = true) {
    this.metrics.requests.total++;
    
    if (success) {
      this.metrics.requests.successful++;
    } else {
      this.metrics.requests.failed++;
    }

    this.responseTimes.push(responseTime);
    
    // Keep only last 100 response times
    if (this.responseTimes.length > 100) {
      this.responseTimes.shift();
    }
  }

  /**
   * Database query metrics qayd etish
   */
  recordQuery(queryTime, isSlow = false) {
    this.metrics.database.queries++;
    
    if (isSlow) {
      this.metrics.database.slowQueries++;
    }

    this.queryTimes.push(queryTime);
    
    // Keep only last 100 query times
    if (this.queryTimes.length > 100) {
      this.queryTimes.shift();
    }
  }

  /**
   * Cache metrics qayd etish
   */
  recordCacheHit() {
    this.metrics.cache.hits++;
  }

  recordCacheMiss() {
    this.metrics.cache.misses++;
  }

  /**
   * Alert'larni tekshirish
   */
  checkAlerts() {
    const alerts = [];

    // Memory alert
    if (this.metrics.memory.used > 500) { // 500MB
      alerts.push({
        type: 'memory',
        message: `High memory usage: ${this.metrics.memory.used}MB`,
        severity: 'warning'
      });
    }

    // CPU alert
    if (this.metrics.cpu.usage > 80) {
      alerts.push({
        type: 'cpu',
        message: `High CPU usage: ${this.metrics.cpu.usage}%`,
        severity: 'warning'
      });
    }

    // Response time alert
    if (this.metrics.requests.averageResponseTime > 2000) { // 2 seconds
      alerts.push({
        type: 'response_time',
        message: `Slow response time: ${this.metrics.requests.averageResponseTime}ms`,
        severity: 'warning'
      });
    }

    // Database alert
    if (this.metrics.database.slowQueries > 10) {
      alerts.push({
        type: 'database',
        message: `Too many slow queries: ${this.metrics.database.slowQueries}`,
        severity: 'error'
      });
    }

    // Cache alert
    if (this.metrics.cache.hitRate < 50) {
      alerts.push({
        type: 'cache',
        message: `Low cache hit rate: ${this.metrics.cache.hitRate.toFixed(2)}%`,
        severity: 'warning'
      });
    }

    // Emit alerts
    if (alerts.length > 0) {
      this.emit('alerts', alerts);
    }
  }

  /**
   * Metrics'ni olish
   */
  getMetrics() {
    return {
      ...this.metrics,
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    };
  }

  /**
   * Performance report yaratish
   */
  generateReport() {
    const metrics = this.getMetrics();
    
    const report = {
      summary: {
        uptime: Math.round(metrics.uptime),
        totalRequests: metrics.requests.total,
        successRate: metrics.requests.total > 0 
          ? ((metrics.requests.successful / metrics.requests.total) * 100).toFixed(2)
          : 0,
        averageResponseTime: Math.round(metrics.requests.averageResponseTime),
        memoryUsage: `${metrics.memory.used}MB / ${metrics.memory.total}MB`,
        cpuUsage: `${metrics.cpu.usage}%`,
        cacheHitRate: `${metrics.cache.hitRate.toFixed(2)}%`
      },
      details: metrics,
      recommendations: this.generateRecommendations(metrics)
    };

    return report;
  }

  /**
   * Tavsiyalar yaratish
   */
  generateRecommendations(metrics) {
    const recommendations = [];

    if (metrics.memory.used > 400) {
      recommendations.push('Consider optimizing memory usage or increasing server memory');
    }

    if (metrics.cpu.usage > 70) {
      recommendations.push('Consider scaling horizontally or optimizing CPU-intensive operations');
    }

    if (metrics.requests.averageResponseTime > 1000) {
      recommendations.push('Consider optimizing database queries or adding caching');
    }

    if (metrics.database.slowQueries > 5) {
      recommendations.push('Review and optimize slow database queries');
    }

    if (metrics.cache.hitRate < 60) {
      recommendations.push('Consider increasing cache TTL or improving cache strategy');
    }

    return recommendations;
  }

  /**
   * Metrics'ni tozalash
   */
  resetMetrics() {
    this.metrics = {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        averageResponseTime: 0
      },
      memory: {
        used: 0,
        total: 0,
        free: 0
      },
      cpu: {
        usage: 0,
        loadAverage: [0, 0, 0]
      },
      database: {
        queries: 0,
        slowQueries: 0,
        averageQueryTime: 0
      },
      cache: {
        hits: 0,
        misses: 0,
        hitRate: 0
      }
    };

    this.responseTimes = [];
    this.queryTimes = [];
    
    console.log('📊 Metrics reset');
  }
}

// Singleton instance
const performanceMonitor = new PerformanceMonitor();

module.exports = performanceMonitor;