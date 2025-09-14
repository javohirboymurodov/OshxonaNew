// Singleton Manager - Global variables o'rniga singleton pattern
class SingletonManager {
  static instances = new Map();
  
  /**
   * Bot instance singleton
   */
  static getBotInstance() {
    if (!this.instances.has('botInstance')) {
      this.instances.set('botInstance', null);
    }
    return this.instances.get('botInstance');
  }
  
  static setBotInstance(bot) {
    this.instances.set('botInstance', bot);
  }
  
  /**
   * Tracking sessions singleton
   */
  static getTrackingSessions() {
    if (!this.instances.has('trackingSessions')) {
      this.instances.set('trackingSessions', new Map());
    }
    return this.instances.get('trackingSessions');
  }
  
  static clearTrackingSessions() {
    this.instances.set('trackingSessions', new Map());
  }
  
  /**
   * Suspicious activity store singleton
   */
  static getSuspiciousStore() {
    if (!this.instances.has('suspiciousStore')) {
      this.instances.set('suspiciousStore', new Map());
    }
    return this.instances.get('suspiciousStore');
  }
  
  static clearSuspiciousStore() {
    this.instances.set('suspiciousStore', new Map());
  }
  
  /**
   * Clear all instances (for cleanup)
   */
  static clearAll() {
    this.instances.clear();
  }
  
  /**
   * Get instance count (for monitoring)
   */
  static getInstanceCount() {
    return this.instances.size;
  }
  
  /**
   * Get memory usage info
   */
  static getMemoryInfo() {
    const info = {
      instances: this.instances.size,
      trackingSessions: this.getTrackingSessions().size,
      suspiciousStore: this.getSuspiciousStore().size
    };
    
    // Estimate memory usage
    let totalEntries = 0;
    for (const [key, value] of this.instances.entries()) {
      if (value instanceof Map) {
        totalEntries += value.size;
      }
    }
    info.totalEntries = totalEntries;
    
    return info;
  }
}

module.exports = SingletonManager;