/**
 * Order Microservice
 * Buyurtma microservice'i
 */

const express = require('express');
const serviceRegistry = require('../ServiceRegistry');
const serviceCommunication = require('../ServiceCommunication');
const { Order } = require('../../models');

class OrderService {
  constructor() {
    this.app = express();
    this.port = process.env.ORDER_SERVICE_PORT || 3001;
    this.setupMiddleware();
    this.setupRoutes();
    this.registerService();
  }

  setupMiddleware() {
    this.app.use(express.json());
    
    // Service-to-service authentication
    this.app.use((req, res, next) => {
      const serviceName = req.headers['x-service-name'];
      if (serviceName && serviceName !== 'main-api') {
        return res.status(401).json({ error: 'Unauthorized service' });
      }
      next();
    });
  }

  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        service: 'order-service',
        status: 'healthy',
        timestamp: new Date().toISOString()
      });
    });

    // Create order
    this.app.post('/orders', async (req, res) => {
      try {
        const orderData = req.body;
        const order = new Order(orderData);
        await order.save();
        
        res.json({
          success: true,
          data: order
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Get order by ID
    this.app.get('/orders/:id', async (req, res) => {
      try {
        const order = await Order.findById(req.params.id)
          .populate('user', 'firstName lastName phone')
          .populate('branch', 'name address')
          .lean();
        
        if (!order) {
          return res.status(404).json({
            success: false,
            error: 'Order not found'
          });
        }
        
        res.json({
          success: true,
          data: order
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Update order status
    this.app.patch('/orders/:id/status', async (req, res) => {
      try {
        const { status, updatedBy } = req.body;
        
        const order = await Order.findByIdAndUpdate(
          req.params.id,
          { 
            status,
            updatedAt: new Date()
          },
          { new: true }
        );
        
        if (!order) {
          return res.status(404).json({
            success: false,
            error: 'Order not found'
          });
        }
        
        res.json({
          success: true,
          data: order
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Get orders by status
    this.app.get('/orders', async (req, res) => {
      try {
        const { status, branch, limit = 20, page = 1 } = req.query;
        
        let query = {};
        if (status) query.status = status;
        if (branch) query.branch = branch;
        
        const skip = (page - 1) * limit;
        
        const [orders, total] = await Promise.all([
          Order.find(query)
            .populate('user', 'firstName lastName phone')
            .populate('branch', 'name address')
            .lean()
            .skip(skip)
            .limit(parseInt(limit))
            .sort({ createdAt: -1 }),
          Order.countDocuments(query)
        ]);
        
        res.json({
          success: true,
          data: orders,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          }
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Event handling
    this.app.post('/events', (req, res) => {
      const { type, data } = req.body;
      
      // Handle different event types
      switch (type) {
        case 'order_created':
          this.handleOrderCreated(data);
          break;
        case 'order_updated':
          this.handleOrderUpdated(data);
          break;
        default:
          console.log(`Unknown event type: ${type}`);
      }
      
      res.json({ success: true });
    });
  }

  registerService() {
    const serviceInfo = {
      url: `http://localhost:${this.port}`,
      description: 'Order management microservice',
      version: '1.0.0',
      endpoints: [
        'GET /health',
        'POST /orders',
        'GET /orders/:id',
        'PATCH /orders/:id/status',
        'GET /orders',
        'POST /events'
      ]
    };

    serviceRegistry.register('order-service', serviceInfo);
    
    // Health check
    serviceRegistry.setHealthCheck('order-service', async (service) => {
      try {
        const response = await fetch(`${service.url}/health`);
        return response.ok;
      } catch (error) {
        return false;
      }
    });
  }

  handleOrderCreated(data) {
    console.log('📦 Order created event received:', data);
    // Handle order created logic
  }

  handleOrderUpdated(data) {
    console.log('📦 Order updated event received:', data);
    // Handle order updated logic
  }

  start() {
    this.app.listen(this.port, () => {
      console.log(`🚀 Order Service started on port ${this.port}`);
    });
  }
}

module.exports = OrderService;