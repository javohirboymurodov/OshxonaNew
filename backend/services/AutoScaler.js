/**
 * Auto Scaler
 * Avtomatik scaling tizimi
 */

const EventEmitter = require('events');
const performanceMonitor = require('./PerformanceMonitor');

class AutoScaler extends EventEmitter {
  constructor() {
    super();
    this.isEnabled = true;
    this.scalingRules = {
      cpu: { threshold: 80, scaleUp: true, scaleDown: 30 },
      memory: { threshold: 500, scaleUp: true, scaleDown: 200 },
      responseTime: { threshold: 2000, scaleUp: true, scaleDown: 500 },
      requests: { threshold: 1000, scaleUp: true, scaleDown: 100 }
    };
    
    this.currentInstances = {
      api: 1,
      'order-service': 1,
      'user-service': 1
    };
    
    this.maxInstances = {
      api: 5,
      'order-service': 3,
      'user-service': 3
    };
    
    this.minInstances = {
      api: 1,
      'order-service': 1,
      'user-service': 1
    };
    
    this.scalingHistory = [];
    this.lastScalingTime = {};
    this.scalingCooldown = 60000; // 1 minute
  }

  /**
   * Auto-scaling'ni ishga tushirish
   */
  start(intervalMs = 30000) {
    console.log('🚀 Auto-scaling started');
    
    // Performance monitor events'larini kuzatish
    performanceMonitor.on('alerts', (alerts) => {
      this.handleAlerts(alerts);
    });
    
    // Regular scaling check
    setInterval(() => {
      this.checkScalingNeeds();
    }, intervalMs);
  }

  /**
   * Alert'larni boshqarish
   */
  handleAlerts(alerts) {
    for (const alert of alerts) {
      if (this.shouldScale(alert)) {
        this.performScaling(alert);
      }
    }
  }

  /**
   * Scaling kerakligini tekshirish
   */
  checkScalingNeeds() {
    if (!this.isEnabled) return;

    const metrics = performanceMonitor.getMetrics();
    const scalingActions = [];

    // CPU-based scaling
    if (metrics.cpu.usage > this.scalingRules.cpu.threshold) {
      scalingActions.push({
        type: 'scale_up',
        reason: 'high_cpu',
        metric: metrics.cpu.usage,
        threshold: this.scalingRules.cpu.threshold,
        service: 'api'
      });
    } else if (metrics.cpu.usage < this.scalingRules.cpu.scaleDown) {
      scalingActions.push({
        type: 'scale_down',
        reason: 'low_cpu',
        metric: metrics.cpu.usage,
        threshold: this.scalingRules.cpu.scaleDown,
        service: 'api'
      });
    }

    // Memory-based scaling
    if (metrics.memory.used > this.scalingRules.memory.threshold) {
      scalingActions.push({
        type: 'scale_up',
        reason: 'high_memory',
        metric: metrics.memory.used,
        threshold: this.scalingRules.memory.threshold,
        service: 'api'
      });
    } else if (metrics.memory.used < this.scalingRules.memory.scaleDown) {
      scalingActions.push({
        type: 'scale_down',
        reason: 'low_memory',
        metric: metrics.memory.used,
        threshold: this.scalingRules.memory.scaleDown,
        service: 'api'
      });
    }

    // Response time-based scaling
    if (metrics.requests.averageResponseTime > this.scalingRules.responseTime.threshold) {
      scalingActions.push({
        type: 'scale_up',
        reason: 'slow_response',
        metric: metrics.requests.averageResponseTime,
        threshold: this.scalingRules.responseTime.threshold,
        service: 'api'
      });
    } else if (metrics.requests.averageResponseTime < this.scalingRules.responseTime.scaleDown) {
      scalingActions.push({
        type: 'scale_down',
        reason: 'fast_response',
        metric: metrics.requests.averageResponseTime,
        threshold: this.scalingRules.responseTime.scaleDown,
        service: 'api'
      });
    }

    // Execute scaling actions
    for (const action of scalingActions) {
      if (this.canScale(action.service, action.type)) {
        this.performScalingAction(action);
      }
    }
  }

  /**
   * Scaling mumkinligini tekshirish
   */
  canScale(service, action) {
    const now = Date.now();
    const lastScaling = this.lastScalingTime[service] || 0;
    
    // Cooldown check
    if (now - lastScaling < this.scalingCooldown) {
      console.log(`⏳ Scaling cooldown for ${service}`);
      return false;
    }

    // Instance limits check
    const current = this.currentInstances[service];
    const min = this.minInstances[service];
    const max = this.maxInstances[service];

    if (action === 'scale_down' && current <= min) {
      console.log(`📉 Cannot scale down ${service}: already at minimum (${min})`);
      return false;
    }

    if (action === 'scale_up' && current >= max) {
      console.log(`📈 Cannot scale up ${service}: already at maximum (${max})`);
      return false;
    }

    return true;
  }

  /**
   * Scaling action'ni bajarish
   */
  async performScalingAction(action) {
    const { type, reason, metric, threshold, service } = action;
    
    console.log(`🔄 Scaling ${type} ${service}: ${reason} (${metric} vs ${threshold})`);
    
    try {
      if (type === 'scale_up') {
        await this.scaleUp(service);
      } else if (type === 'scale_down') {
        await this.scaleDown(service);
      }
      
      // Record scaling action
      this.recordScalingAction(action);
      
      // Update last scaling time
      this.lastScalingTime[service] = Date.now();
      
      // Emit event
      this.emit('scaling', {
        service,
        type,
        reason,
        metric,
        threshold,
        newInstances: this.currentInstances[service]
      });
      
    } catch (error) {
      console.error(`❌ Scaling failed for ${service}:`, error);
      this.emit('scalingError', { service, action, error });
    }
  }

  /**
   * Service'ni scale up qilish
   */
  async scaleUp(service) {
    const current = this.currentInstances[service];
    const max = this.maxInstances[service];
    
    if (current >= max) {
      throw new Error(`Already at maximum instances for ${service}`);
    }
    
    const newInstances = Math.min(current + 1, max);
    this.currentInstances[service] = newInstances;
    
    console.log(`📈 Scaled up ${service}: ${current} → ${newInstances}`);
    
    // In a real implementation, this would start new instances
    // For now, we'll simulate the scaling
    await this.simulateScaling(service, newInstances);
  }

  /**
   * Service'ni scale down qilish
   */
  async scaleDown(service) {
    const current = this.currentInstances[service];
    const min = this.minInstances[service];
    
    if (current <= min) {
      throw new Error(`Already at minimum instances for ${service}`);
    }
    
    const newInstances = Math.max(current - 1, min);
    this.currentInstances[service] = newInstances;
    
    console.log(`📉 Scaled down ${service}: ${current} → ${newInstances}`);
    
    // In a real implementation, this would stop instances
    await this.simulateScaling(service, newInstances);
  }

  /**
   * Scaling'ni simulyatsiya qilish
   */
  async simulateScaling(service, instances) {
    console.log(`🔄 Scaling ${service} to ${instances} instances...`);
    
    // Simulate scaling time
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log(`✅ ${service} scaled to ${instances} instances`);
  }

  /**
   * Scaling action'ni qayd etish
   */
  recordScalingAction(action) {
    const record = {
      ...action,
      timestamp: new Date().toISOString(),
      instances: this.currentInstances[action.service]
    };
    
    this.scalingHistory.push(record);
    
    // Keep only last 100 records
    if (this.scalingHistory.length > 100) {
      this.scalingHistory.shift();
    }
  }

  /**
   * Scaling rules'ni yangilash
   */
  updateScalingRules(newRules) {
    this.scalingRules = { ...this.scalingRules, ...newRules };
    console.log('📊 Scaling rules updated:', this.scalingRules);
  }

  /**
   * Instance limits'ni yangilash
   */
  updateInstanceLimits(service, limits) {
    this.minInstances[service] = limits.min;
    this.maxInstances[service] = limits.max;
    console.log(`📊 Instance limits updated for ${service}:`, limits);
  }

  /**
   * Auto-scaling'ni yoqish/o'chirish
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
    console.log(`📊 Auto-scaling ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Scaling statistics
   */
  getScalingStats() {
    const stats = {
      isEnabled: this.isEnabled,
      currentInstances: this.currentInstances,
      scalingRules: this.scalingRules,
      scalingHistory: this.scalingHistory.slice(-10), // Last 10 actions
      lastScalingTimes: this.lastScalingTime
    };
    
    return stats;
  }

  /**
   * Scaling history
   */
  getScalingHistory(limit = 50) {
    return this.scalingHistory.slice(-limit);
  }

  /**
   * Manual scaling
   */
  async manualScale(service, targetInstances) {
    if (!this.isEnabled) {
      throw new Error('Auto-scaling is disabled');
    }
    
    const current = this.currentInstances[service];
    const min = this.minInstances[service];
    const max = this.maxInstances[service];
    
    if (targetInstances < min || targetInstances > max) {
      throw new Error(`Target instances must be between ${min} and ${max}`);
    }
    
    if (targetInstances === current) {
      console.log(`📊 ${service} already at ${current} instances`);
      return;
    }
    
    const action = {
      type: targetInstances > current ? 'scale_up' : 'scale_down',
      reason: 'manual',
      metric: current,
      threshold: targetInstances,
      service
    };
    
    // Scale to target
    while (this.currentInstances[service] !== targetInstances) {
      await this.performScalingAction(action);
    }
    
    console.log(`✅ Manually scaled ${service} to ${targetInstances} instances`);
  }
}

// Singleton instance
const autoScaler = new AutoScaler();

module.exports = autoScaler;