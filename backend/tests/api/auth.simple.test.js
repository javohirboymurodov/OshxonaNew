// Simple auth test without security middleware
const request = require('supertest');
const express = require('express');
const authRouter = require('../../api/routes/auth');
const { createTestAdmin } = require('../helpers/testHelpers');

// Create minimal test app without security middleware
const createSimpleTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);
  return app;
};

describe('Auth API - SIMPLE', () => {
  let app;

  beforeEach(() => {
    app = createSimpleTestApp();
  });

  test('should test refresh endpoint exists', async () => {
    const { admin } = await createTestAdmin({
      email: 'simple@admin.uz'
    });

    // Test that refresh endpoint exists (even if it fails due to no token)
    const response = await request(app)
      .post('/api/auth/refresh');

    // Should return 401 (not 404), meaning endpoint exists
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('Token');
  });

  test('should test logout endpoint exists', async () => {
    // Test that logout endpoint exists
    const response = await request(app)
      .post('/api/auth/logout');

    // Should return 401 (not 404), meaning endpoint exists
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  test('should test me endpoint exists', async () => {
    // Test that /me endpoint exists
    const response = await request(app)
      .get('/api/auth/me');

    // Should return 401 (not 404), meaning endpoint exists
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});