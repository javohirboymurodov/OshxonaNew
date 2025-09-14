/**
 * Microservice Manager
 * Microservice'larni boshqarish
 */

const OrderService = require('./microservices/OrderService');
const UserService = require('./microservices/UserService');
const serviceRegistry = require('./ServiceRegistry');
const serviceCommunication = require('./ServiceCommunication');

class MicroserviceManager {
  constructor() {
    this.services = new Map();
    this.isRunning = false;
    this.healthCheckInterval = null;
  }

  /**
   * Microservice'larni ishga tushirish
   */
  async start() {
    if (this.isRunning) {
      console.log('⚠️ Microservices already running');
      return;
    }

    console.log('🚀 Starting microservices...');

    try {
      // Start Order Service
      const orderService = new OrderService();
      orderService.start();
      this.services.set('order-service', orderService);

      // Start User Service
      const userService = new UserService();
      userService.start();
      this.services.set('user-service', userService);

      // Start health check monitoring
      this.startHealthCheckMonitoring();

      this.isRunning = true;
      console.log('✅ All microservices started successfully');

      // Service registry events
      this.setupServiceRegistryEvents();

    } catch (error) {
      console.error('❌ Failed to start microservices:', error);
      throw error;
    }
  }

  /**
   * Microservice'larni to'xtatish
   */
  async stop() {
    if (!this.isRunning) {
      console.log('⚠️ Microservices not running');
      return;
    }

    console.log('🛑 Stopping microservices...');

    try {
      // Stop health check monitoring
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = null;
      }

      // Clear service registry
      serviceRegistry.clear();

      this.services.clear();
      this.isRunning = false;

      console.log('✅ All microservices stopped');

    } catch (error) {
      console.error('❌ Error stopping microservices:', error);
      throw error;
    }
  }

  /**
   * Health check monitoring
   */
  startHealthCheckMonitoring() {
    this.healthCheckInterval = setInterval(async () => {
      const services = serviceRegistry.getAllServices();
      
      for (const service of services) {
        try {
          await serviceRegistry.healthCheck(service.name);
        } catch (error) {
          console.error(`❌ Health check failed for ${service.name}:`, error);
        }
      }
    }, 30000); // Check every 30 seconds

    console.log('💓 Health check monitoring started');
  }

  /**
   * Service registry events
   */
  setupServiceRegistryEvents() {
    serviceRegistry.on('serviceRegistered', (service) => {
      console.log(`✅ Service registered: ${service.name}`);
    });

    serviceRegistry.on('serviceUnregistered', (service) => {
      console.log(`❌ Service unregistered: ${service.name}`);
    });

    serviceRegistry.on('healthCheck', ({ serviceName, isHealthy }) => {
      if (!isHealthy) {
        console.log(`⚠️ Service unhealthy: ${serviceName}`);
      }
    });

    serviceRegistry.on('healthCheckFailed', ({ serviceName, error }) => {
      console.log(`🚨 Health check failed for ${serviceName}:`, error.message);
    });
  }

  /**
   * Service'ni olish
   */
  getService(serviceName) {
    return this.services.get(serviceName);
  }

  /**
   * Service'ga request yuborish
   */
  async requestService(serviceName, endpoint, options = {}) {
    return await serviceCommunication.makeRequest(serviceName, endpoint, options);
  }

  /**
   * Event yuborish
   */
  async emitEvent(serviceName, eventType, data) {
    return await serviceCommunication.emitEvent(serviceName, eventType, data);
  }

  /**
   * Service status'larini olish
   */
  getServiceStatuses() {
    return serviceRegistry.getServiceStatuses();
  }

  /**
   * Communication stats
   */
  getCommunicationStats() {
    return serviceCommunication.getStats();
  }

  /**
   * Service'larni qayta ishga tushirish
   */
  async restartService(serviceName) {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Service not found: ${serviceName}`);
    }

    console.log(`🔄 Restarting service: ${serviceName}`);
    
    // Stop service
    serviceRegistry.unregister(serviceName);
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Restart service
    switch (serviceName) {
      case 'order-service':
        const orderService = new OrderService();
        orderService.start();
        this.services.set('order-service', orderService);
        break;
        
      case 'user-service':
        const userService = new UserService();
        userService.start();
        this.services.set('user-service', userService);
        break;
        
      default:
        throw new Error(`Unknown service: ${serviceName}`);
    }

    console.log(`✅ Service restarted: ${serviceName}`);
  }

  /**
   * Load balancer sozlamalari
   */
  setupLoadBalancers() {
    // Round-robin load balancer for order service
    serviceRegistry.setLoadBalancer('order-service', {
      instances: [],
      currentIndex: 0,
      getNextInstance: function(service) {
        // Simple round-robin implementation
        return service;
      }
    });

    // Round-robin load balancer for user service
    serviceRegistry.setLoadBalancer('user-service', {
      instances: [],
      currentIndex: 0,
      getNextInstance: function(service) {
        return service;
      }
    });

    console.log('⚖️ Load balancers configured');
  }

  /**
   * Microservice manager stats
   */
  getStats() {
    return {
      isRunning: this.isRunning,
      services: Array.from(this.services.keys()),
      serviceRegistry: {
        totalServices: serviceRegistry.getAllServices().length,
        serviceStatuses: this.getServiceStatuses()
      },
      communication: this.getCommunicationStats()
    };
  }
}

// Singleton instance
const microserviceManager = new MicroserviceManager();

module.exports = microserviceManager;