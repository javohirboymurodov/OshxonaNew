/**
 * Service Communication
 * Microservice'lar orasida aloqa
 */

const axios = require('axios');
const serviceRegistry = require('./ServiceRegistry');
const ErrorHandler = require('../utils/ErrorHandler');

class ServiceCommunication {
  constructor() {
    this.timeout = 5000; // 5 seconds
    this.retries = 3;
    this.circuitBreakers = new Map();
  }

  /**
   * HTTP request yuborish
   */
  async makeRequest(serviceName, endpoint, options = {}) {
    const service = serviceRegistry.discoverWithLoadBalance(serviceName);
    const url = `${service.url}${endpoint}`;
    
    const requestOptions = {
      method: options.method || 'GET',
      url,
      timeout: options.timeout || this.timeout,
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Name': 'main-api',
        ...options.headers
      },
      ...options
    };

    // Circuit breaker check
    if (this.isCircuitOpen(serviceName)) {
      throw new Error(`Circuit breaker open for service: ${serviceName}`);
    }

    try {
      const response = await this.executeWithRetry(requestOptions);
      
      // Circuit breaker success
      this.recordSuccess(serviceName);
      
      return response.data;
    } catch (error) {
      // Circuit breaker failure
      this.recordFailure(serviceName);
      
      ErrorHandler.log(error, {
        serviceName,
        endpoint,
        url,
        method: requestOptions.method
      });
      
      throw error;
    }
  }

  /**
   * Retry bilan request bajarish
   */
  async executeWithRetry(requestOptions, attempt = 1) {
    try {
      return await axios(requestOptions);
    } catch (error) {
      if (attempt < this.retries && this.isRetryableError(error)) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        await this.sleep(delay);
        return await this.executeWithRetry(requestOptions, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * Retry qilish mumkin bo'lgan xatolikni tekshirish
   */
  isRetryableError(error) {
    if (!error.response) return true; // Network error
    const status = error.response.status;
    return status >= 500 || status === 429; // Server error or rate limit
  }

  /**
   * Circuit breaker - service ochiqligini tekshirish
   */
  isCircuitOpen(serviceName) {
    const breaker = this.circuitBreakers.get(serviceName);
    if (!breaker) return false;
    
    const now = Date.now();
    if (now - breaker.lastFailureTime > breaker.timeout) {
      breaker.isOpen = false;
      breaker.failureCount = 0;
    }
    
    return breaker.isOpen;
  }

  /**
   * Circuit breaker - muvaffaqiyat qayd etish
   */
  recordSuccess(serviceName) {
    const breaker = this.circuitBreakers.get(serviceName);
    if (breaker) {
      breaker.failureCount = 0;
      breaker.isOpen = false;
    }
  }

  /**
   * Circuit breaker - xatolik qayd etish
   */
  recordFailure(serviceName) {
    let breaker = this.circuitBreakers.get(serviceName);
    if (!breaker) {
      breaker = {
        failureCount: 0,
        isOpen: false,
        lastFailureTime: Date.now(),
        timeout: 60000 // 1 minute
      };
      this.circuitBreakers.set(serviceName, breaker);
    }

    breaker.failureCount++;
    breaker.lastFailureTime = Date.now();

    // 5 ta xatolikdan keyin circuit breaker ochish
    if (breaker.failureCount >= 5) {
      breaker.isOpen = true;
      console.log(`🚨 Circuit breaker opened for service: ${serviceName}`);
    }
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Event-driven communication
   */
  emitEvent(serviceName, eventType, data) {
    const service = serviceRegistry.discover(serviceName);
    const url = `${service.url}/events`;
    
    return this.makeRequest(serviceName, '/events', {
      method: 'POST',
      data: {
        type: eventType,
        data,
        timestamp: new Date().toISOString(),
        source: 'main-api'
      }
    });
  }

  /**
   * Batch request yuborish
   */
  async batchRequest(requests) {
    const promises = requests.map(req => 
      this.makeRequest(req.serviceName, req.endpoint, req.options)
        .then(result => ({ success: true, data: result, request: req }))
        .catch(error => ({ success: false, error, request: req }))
    );

    const results = await Promise.allSettled(promises);
    
    return results.map(result => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          success: false,
          error: result.reason,
          request: null
        };
      }
    });
  }

  /**
   * Service discovery cache
   */
  getCachedService(serviceName) {
    return serviceRegistry.discover(serviceName);
  }

  /**
   * Communication statistics
   */
  getStats() {
    const stats = {
      circuitBreakers: {},
      totalServices: serviceRegistry.getAllServices().length
    };

    for (const [serviceName, breaker] of this.circuitBreakers) {
      stats.circuitBreakers[serviceName] = {
        isOpen: breaker.isOpen,
        failureCount: breaker.failureCount,
        lastFailureTime: breaker.lastFailureTime
      };
    }

    return stats;
  }
}

// Singleton instance
const serviceCommunication = new ServiceCommunication();

module.exports = serviceCommunication;