// tests/api/auth.test.js - FIXED VERSION
const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const authRouter = require('../../api/routes/auth');
const { User } = require('../../models');
const { mockAuthToken, createTestAdmin, createTestSuperAdmin } = require('../helpers/testHelpers');

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);
  return app;
};

describe('Auth API - FIXED', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
  });

  describe('POST /api/auth/login', () => {
    test('should login admin with correct credentials', async () => {
      // Create test admin with email
      const { admin } = await createTestAdmin({
        email: 'test@admin.uz'
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@admin.uz',
          password: 'admin123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.role).toBe('admin');
      expect(response.body.data.user.password).toBeUndefined();
    });

    test('should fail with incorrect password', async () => {
      const { admin } = await createTestAdmin({
        email: 'test@admin.uz'
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@admin.uz',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('should fail with non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@email.com',
          password: 'anypassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('should validate required fields', async () => {
      // Missing email
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
          email: 'test@admin.uz'
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/auth/me', () => {
    test('should return user info with valid token', async () => {
      const { admin } = await createTestAdmin({
        email: 'test@admin.uz'
      });
      const token = mockAuthToken(admin);

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(admin._id.toString());
      expect(response.body.data.role).toBe('admin');
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
      const { admin } = await createTestAdmin({
        email: 'test@admin.uz'
      });
      const token = mockAuthToken(admin);

      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.token).not.toBe(token); // Should be a new token
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.role).toBe('admin');
    });

    test('should fail with expired/invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Authorization', 'Bearer expired-token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/logout', () => {
    test('should logout successfully with valid token', async () => {
      const { admin } = await createTestAdmin({
        email: 'test@admin.uz'
      });
      const token = mockAuthToken(admin);

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('chiqildi');
    });

    test('should fail without token', async () => {
      const response = await request(app)
        .post('/api/auth/logout');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
});