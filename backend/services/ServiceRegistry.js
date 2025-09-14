/**
 * Service Registry
 * Microservice registry va discovery
 */

const EventEmitter = require('events');

class ServiceRegistry extends EventEmitter {
  constructor() {
    super();
    this.services = new Map();
    this.healthChecks = new Map();
    this.loadBalancers = new Map();
  }

  /**
   * Service'ni ro'yxatdan o'tkazish
   */
  register(serviceName, serviceInfo) {
    const service = {
      name: serviceName,
      ...serviceInfo,
      registeredAt: new Date(),
      lastHealthCheck: new Date(),
      status: 'healthy'
    };

    this.services.set(serviceName, service);
    this.emit('serviceRegistered', service);
    
    console.log(`✅ Service registered: ${serviceName} at ${serviceInfo.url}`);
    return service;
  }

  /**
   * Service'ni topish
   */
  discover(serviceName) {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Service not found: ${serviceName}`);
    }
    return service;
  }

  /**
   * Load balancer bilan service topish
   */
  discoverWithLoadBalance(serviceName) {
    const service = this.discover(serviceName);
    const loadBalancer = this.loadBalancers.get(serviceName);
    
    if (loadBalancer) {
      return loadBalancer.getNextInstance(service);
    }
    
    return service;
  }

  /**
   * Service health check
   */
  async healthCheck(serviceName) {
    const service = this.services.get(serviceName);
    if (!service) {
      return false;
    }

    try {
      const healthCheckFn = this.healthChecks.get(serviceName);
      if (healthCheckFn) {
        const isHealthy = await healthCheckFn(service);
        service.status = isHealthy ? 'healthy' : 'unhealthy';
        service.lastHealthCheck = new Date();
        
        this.emit('healthCheck', { serviceName, isHealthy });
        return isHealthy;
      }
      
      return true; // Default healthy if no health check
    } catch (error) {
      service.status = 'unhealthy';
      service.lastHealthCheck = new Date();
      this.emit('healthCheckFailed', { serviceName, error });
      return false;
    }
  }

  /**
   * Health check funksiyasini qo'shish
   */
  setHealthCheck(serviceName, healthCheckFn) {
    this.healthChecks.set(serviceName, healthCheckFn);
  }

  /**
   * Load balancer qo'shish
   */
  setLoadBalancer(serviceName, loadBalancer) {
    this.loadBalancers.set(serviceName, loadBalancer);
  }

  /**
   * Service'ni olib tashlash
   */
  unregister(serviceName) {
    const service = this.services.get(serviceName);
    if (service) {
      this.services.delete(serviceName);
      this.healthChecks.delete(serviceName);
      this.loadBalancers.delete(serviceName);
      this.emit('serviceUnregistered', service);
      
      console.log(`❌ Service unregistered: ${serviceName}`);
    }
  }

  /**
   * Barcha service'larni olish
   */
  getAllServices() {
    return Array.from(this.services.values());
  }

  /**
   * Service status'larini olish
   */
  getServiceStatuses() {
    const statuses = {};
    for (const [name, service] of this.services) {
      statuses[name] = {
        status: service.status,
        lastHealthCheck: service.lastHealthCheck,
        registeredAt: service.registeredAt
      };
    }
    return statuses;
  }

  /**
   * Service'lar ro'yxatini tozalash
   */
  clear() {
    this.services.clear();
    this.healthChecks.clear();
    this.loadBalancers.clear();
    this.emit('registryCleared');
  }
}

// Singleton instance
const serviceRegistry = new ServiceRegistry();

module.exports = serviceRegistry;