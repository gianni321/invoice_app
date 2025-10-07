const request = require('supertest');
const express = require('express');
const authRoutes = require('../routes/auth');
const UserService = require('../services/UserService');

// Create test app
const app = express();
app.use(express.json());
app.use('/auth', authRoutes);

describe('Auth Routes', () => {
  beforeEach(async () => {
    // Clear test users
    try {
      await UserService.run('DELETE FROM users WHERE name LIKE ?', ['Test%']);
    } catch (error) {
      // Ignore errors
    }

    // Create test user
    await UserService.createUser({
      name: 'Test User',
      pin: '1234',
      rate: 75,
      role: 'member'
    });
  });

  describe('POST /auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          name: 'Test User',
          pin: '1234'
        });

      expect(response.status).toBe(200);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.name).toBe('Test User');
      expect(response.body.user.rate).toBe(75);
      expect(response.body.user.role).toBe('member');
      expect(response.body.token).toBeDefined();
      expect(response.body.user.pin_hash).toBeUndefined(); // Should not expose hash
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          name: 'Test User',
          pin: 'wrong'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });

    it('should reject non-existent user', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          name: 'Non Existent',
          pin: '1234'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });

    it('should reject missing name', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          pin: '1234'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it('should reject missing pin', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          name: 'Test User'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it('should trim whitespace from credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          name: '  Test User  ',
          pin: '  1234  '
        });

      expect(response.status).toBe(200);
      expect(response.body.user.name).toBe('Test User');
    });
  });

  describe('GET /auth/me', () => {
    let authToken;

    beforeEach(async () => {
      // Login to get token
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          name: 'Test User',
          pin: '1234'
        });

      authToken = loginResponse.body.token;
    });

    it('should return user info with valid token', async () => {
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Test User');
      expect(response.body.rate).toBe(75);
      expect(response.body.role).toBe('member');
      expect(response.body.pin_hash).toBeUndefined();
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid_token');

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });

    it('should reject request with malformed authorization header', async () => {
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', 'InvalidFormat');

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });
  });
});