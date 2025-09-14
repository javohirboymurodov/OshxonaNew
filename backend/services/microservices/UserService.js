/**
 * User Microservice
 * Foydalanuvchi microservice'i
 */

const express = require('express');
const serviceRegistry = require('../ServiceRegistry');
const { User } = require('../../models');

class UserService {
  constructor() {
    this.app = express();
    this.port = process.env.USER_SERVICE_PORT || 3002;
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
        service: 'user-service',
        status: 'healthy',
        timestamp: new Date().toISOString()
      });
    });

    // Get user by Telegram ID
    this.app.get('/users/telegram/:telegramId', async (req, res) => {
      try {
        const user = await User.findOne({ 
          telegramId: req.params.telegramId 
        }).select('-password').lean();
        
        if (!user) {
          return res.status(404).json({
            success: false,
            error: 'User not found'
          });
        }
        
        res.json({
          success: true,
          data: user
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Get user by ID
    this.app.get('/users/:id', async (req, res) => {
      try {
        const user = await User.findById(req.params.id)
          .select('-password')
          .lean();
        
        if (!user) {
          return res.status(404).json({
            success: false,
            error: 'User not found'
          });
        }
        
        res.json({
          success: true,
          data: user
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Update user
    this.app.patch('/users/:id', async (req, res) => {
      try {
        const user = await User.findByIdAndUpdate(
          req.params.id,
          { 
            ...req.body,
            updatedAt: new Date()
          },
          { new: true }
        ).select('-password');
        
        if (!user) {
          return res.status(404).json({
            success: false,
            error: 'User not found'
          });
        }
        
        res.json({
          success: true,
          data: user
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Get couriers
    this.app.get('/couriers', async (req, res) => {
      try {
        const { branch, isOnline, isAvailable } = req.query;
        
        let query = { role: 'courier' };
        if (branch) query.branch = branch;
        if (isOnline !== undefined) query['courierInfo.isOnline'] = isOnline === 'true';
        if (isAvailable !== undefined) query['courierInfo.isAvailable'] = isAvailable === 'true';
        
        const couriers = await User.find(query)
          .select('firstName lastName phone courierInfo telegramId')
          .lean();
        
        res.json({
          success: true,
          data: couriers
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Get courier by ID
    this.app.get('/couriers/:id', async (req, res) => {
      try {
        const courier = await User.findOne({
          _id: req.params.id,
          role: 'courier'
        }).select('firstName lastName phone courierInfo telegramId').lean();
        
        if (!courier) {
          return res.status(404).json({
            success: false,
            error: 'Courier not found'
          });
        }
        
        res.json({
          success: true,
          data: courier
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Update courier location
    this.app.patch('/couriers/:id/location', async (req, res) => {
      try {
        const { latitude, longitude } = req.body;
        
        const courier = await User.findByIdAndUpdate(
          req.params.id,
          {
            'courierInfo.currentLocation': {
              latitude,
              longitude,
              updatedAt: new Date()
            }
          },
          { new: true }
        ).select('firstName lastName phone courierInfo telegramId');
        
        if (!courier) {
          return res.status(404).json({
            success: false,
            error: 'Courier not found'
          });
        }
        
        res.json({
          success: true,
          data: courier
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
      
      switch (type) {
        case 'user_created':
          this.handleUserCreated(data);
          break;
        case 'user_updated':
          this.handleUserUpdated(data);
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
      description: 'User management microservice',
      version: '1.0.0',
      endpoints: [
        'GET /health',
        'GET /users/telegram/:telegramId',
        'GET /users/:id',
        'PATCH /users/:id',
        'GET /couriers',
        'GET /couriers/:id',
        'PATCH /couriers/:id/location',
        'POST /events'
      ]
    };

    serviceRegistry.register('user-service', serviceInfo);
    
    // Health check
    serviceRegistry.setHealthCheck('user-service', async (service) => {
      try {
        const response = await fetch(`${service.url}/health`);
        return response.ok;
      } catch (error) {
        return false;
      }
    });
  }

  handleUserCreated(data) {
    console.log('👤 User created event received:', data);
  }

  handleUserUpdated(data) {
    console.log('👤 User updated event received:', data);
  }

  start() {
    this.app.listen(this.port, () => {
      console.log(`🚀 User Service started on port ${this.port}`);
    });
  }
}

module.exports = UserService;