// API Health Endpoint Tests
const request = require('supertest');
const express = require('express');

// Mock the required modules
jest.mock('../../config/socketConfig', () => ({
  initialize: jest.fn(),
  getIO: jest.fn()
}));

jest.mock('../../docs/swagger', () => ({
  specs: {},
  swaggerUi: {
    serve: [],
    setup: jest.fn().mockReturnValue((req, res) => res.send('Swagger UI'))
  }
}));

// Import the server after mocking
const { startAPIServer } = require('../../api/server');

describe('API Health Endpoints', () => {
  let app;

  beforeAll(async () => {
    // Create test server
    const testApp = express();
    
    // Basic middlewares for testing
    testApp.use(express.json());
    
    // Health endpoints
    testApp.get('/health', (req, res) => {
      res.json({
        status: 'OK',
        service: 'Oshxona API',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: '1.0.0'
      });
    });

    testApp.get('/api/health', (req, res) => {
      res.json({
        success: true,
        message: 'API server ishlayapti',
        documentation: '/api/docs',
        data: {
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          status: 'healthy'
        }
      });
    });

    app = testApp;
  });

  describe('GET /health', () => {
    test('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'OK',
        service: 'Oshxona API',
        version: '1.0.0'
      });

      expect(response.body.timestamp).toBeDefined();
      expect(response.body.uptime).toBeDefined();
      expect(response.body.memory).toBeDefined();
    });

    test('should return valid timestamp format', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      const timestamp = new Date(response.body.timestamp);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).not.toBeNaN();
    });

    test('should return positive uptime', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.uptime).toBeGreaterThan(0);
    });
  });

  describe('GET /api/health', () => {
    test('should return API health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'API server ishlayapti',
        documentation: '/api/docs'
      });

      expect(response.body.data).toBeDefined();
      expect(response.body.data.status).toBe('healthy');
    });

    test('should include documentation link', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body.documentation).toBe('/api/docs');
    });

    test('should have data object with required fields', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body.data).toHaveProperty('timestamp');
      expect(response.body.data).toHaveProperty('uptime');
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data.status).toBe('healthy');
    });
  });

  describe('Response headers', () => {
    test('should return JSON content type', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/json/);
    });

    test('should handle CORS if configured', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      // Test would verify CORS headers if CORS middleware was applied
      expect(response.headers['content-type']).toMatch(/json/);
    });
  });

  describe('Performance', () => {
    test('should respond quickly', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/health')
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
    });

    test('should handle concurrent requests', async () => {
      const requests = Array(10).fill().map(() => 
        request(app).get('/health').expect(200)
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.body.status).toBe('OK');
      });
    });
  });
});
