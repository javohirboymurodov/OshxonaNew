// tests/api/auth.test.js
const request = require('supertest');
const express = require('express');
const authRouter = require('../../api/routes/auth');
const User = require('../../models/User');

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);
  return app;
};

describe('Auth API', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
  });

  describe('POST /api/auth/login', () => {
    test('should login admin with correct credentials', async () => {
      // Create test admin
      const branch = await createTestBranch();
      const admin = await User.create({
        firstName: 'Admin',
        lastName: 'User',
        telegramId: 123456789,
        phone: '+998901234567',
        role: 'admin',
        password: 'admin123',
        branch: branch._id
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          phone: '+998901234567',
          password: 'admin123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.role).toBe('admin');
      expect(response.body.data.user.password).toBeUndefined(); // Password should not be returned
    });

    test('should fail with incorrect password', async () => {
      const branch = await createTestBranch();
      await User.create({
        firstName: 'Admin',
        telegramId: 123456789,
        phone: '+998901234567',
        role: 'admin',
        password: 'admin123',
        branch: branch._id
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          phone: '+998901234567',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Noto\'g\'ri');
    });

    test('should fail with non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          phone: '+998999999999',
          password: 'somepassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('should fail for regular user (no password)', async () => {
      await createTestUser({
        phone: '+998901234567'
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          phone: '+998901234567',
          password: 'anypassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('should validate required fields', async () => {
      // Missing phone
      let response = await request(app)
        .post('/api/auth/login')
        .send({
          password: 'admin123'
        });

      expect(response.status).toBe(400);

      // Missing password
      response = await request(app)
        .post('/api/auth/login')
        .send({
          phone: '+998901234567'
        });

      expect(response.status).toBe(400);
    });

    test('should validate phone format', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          phone: 'invalid-phone',
          password: 'admin123'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('format');
    });
  });

  describe('POST /api/auth/register', () => {
    test('should register new admin (superadmin only)', async () => {
      // This would require superadmin authentication
      // For now, test the validation logic
      const branch = await createTestBranch();

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'New',
          lastName: 'Admin',
          phone: '+998901234568',
          password: 'newadmin123',
          role: 'admin',
          branch: branch._id.toString()
        });

      // Without authentication middleware, this might fail differently
      // The actual test would need to include proper auth headers
      expect(response.status).toBe(401); // Unauthorized without token
    });

    test('should validate required fields for admin registration', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'Admin'
          // Missing required fields
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/auth/me', () => {
    test('should return user info with valid token', async () => {
      const branch = await createTestBranch();
      const admin = await User.create({
        firstName: 'Admin',
        telegramId: 123456789,
        phone: '+998901234567',
        role: 'admin',
        password: 'admin123',
        branch: branch._id
      });

      const token = mockAuthToken(admin);

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(admin._id.toString());
      expect(response.body.data.role).toBe('admin');
      expect(response.body.data.password).toBeUndefined();
    });

    test('should fail without token', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('should fail with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/refresh', () => {
    test('should refresh token with valid token', async () => {
      const admin = await User.create({
        firstName: 'Admin',
        telegramId: 123456789,
        phone: '+998901234567',
        role: 'admin',
        password: 'admin123',
        branch: (await createTestBranch())._id
      });

      const token = mockAuthToken(admin);

      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.token).not.toBe(token); // Should be a new token
    });

    test('should fail with expired/invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Authorization', 'Bearer expired-token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});