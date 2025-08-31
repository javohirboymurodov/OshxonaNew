// Debug version of auth test
const request = require('supertest');
const express = require('express');
const authRouter = require('../../api/routes/auth');
const { createTestAdmin } = require('../helpers/testHelpers');

// Create test app with error handling
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  // Add error logging middleware for debugging
  app.use((req, res, next) => {
    console.log('🔍 Test request:', req.method, req.path, req.body);
    next();
  });
  
  app.use('/api/auth', authRouter);
  
  // Global error handler for debugging
  app.use((error, req, res, next) => {
    console.error('🚨 Test app error:', error.message);
    console.error('🚨 Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: error.stack
    });
  });
  
  return app;
};

describe('Auth API - DEBUG', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
  });

  test('should debug login process', async () => {
    console.log('🧪 Creating test admin...');
    
    try {
      const { admin, branch } = await createTestAdmin({
        email: 'debug@admin.uz'
      });
      
      console.log('✅ Admin created:', {
        id: admin._id,
        email: admin.email,
        role: admin.role,
        hasPassword: !!admin.password,
        branch: admin.branch
      });
      
      console.log('🧪 Attempting login...');
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'debug@admin.uz',
          password: 'admin123'
        });
      
      console.log('📊 Login response:', {
        status: response.status,
        body: response.body
      });
      
      expect(response.status).toBe(200);
      
    } catch (error) {
      console.error('❌ Test error:', error);
      throw error;
    }
  });
});