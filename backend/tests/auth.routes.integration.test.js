const request = require('supertest');
const app = require('../server');
const { setupTestDb, cleanupTestDb, createTestUser } = require('./helpers/testDb');

describe('Authentication Routes', () => {
  let server;
  let testUser;

  beforeAll(async () => {
    await setupTestDb();
    server = app.listen(0); // Random port for testing
    testUser = await createTestUser({
      username: 'testuser',
      pin: '1234',
      role: 'user',
      rate: 50
    });
  });

  afterAll(async () => {
    await server.close();
    await cleanupTestDb();
  });

  beforeEach(() => {
    // Clear any authentication state
    jest.clearAllMocks();
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid PIN', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ pin: '1234' })
        .expect(200);

      expect(response.body).toMatchObject({
        user: {
          id: testUser.id,
          name: testUser.name,
          role: 'user'
        }
      });
      expect(response.body.token).toBeDefined();
    });

    it('should reject invalid PIN', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ pin: '9999' })
        .expect(401);

      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should reject malformed PIN', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ pin: '123' })
        .expect(400);

      expect(response.body.error).toContain('PIN format');
    });

    it('should implement rate limiting', async () => {
      // Make multiple failed login attempts
      const promises = Array(10).fill().map(() =>
        request(app)
          .post('/api/auth/login')
          .send({ pin: '9999' })
      );

      const responses = await Promise.all(promises);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should log authentication attempts', async () => {
      const consoleSpy = jest.spyOn(console, 'log');
      
      await request(app)
        .post('/api/auth/login')
        .send({ pin: '1234' });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Authentication attempt')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('GET /api/auth/verify', () => {
    let authToken;

    beforeEach(async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ pin: '1234' });
      
      authToken = loginResponse.body.token;
    });

    it('should verify valid token', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.user).toMatchObject({
        id: testUser.id,
        name: testUser.name,
        role: 'user'
      });
    });

    it('should reject invalid token', async () => {
      await request(app)
        .get('/api/auth/verify')
        .set('Authorization', 'Bearer invalid-token')
        .expect(403);
    });

    it('should reject missing token', async () => {
      await request(app)
        .get('/api/auth/verify')
        .expect(401);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh valid token', async () => {
      // Implementation depends on refresh token system
      // This is a placeholder for when refresh tokens are implemented
    });
  });

  describe('POST /api/auth/logout', () => {
    let authToken;

    beforeEach(async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ pin: '1234' });
      
      authToken = loginResponse.body.token;
    });

    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.message).toContain('Logged out successfully');
    });
  });

  describe('Security Tests', () => {
    it('should prevent SQL injection in login', async () => {
      const maliciousPayload = {
        pin: "' OR '1'='1"
      };

      await request(app)
        .post('/api/auth/login')
        .send(maliciousPayload)
        .expect(400);
    });

    it('should implement timing attack protection', async () => {
      const start1 = Date.now();
      await request(app)
        .post('/api/auth/login')
        .send({ pin: '9999' });
      const time1 = Date.now() - start1;

      const start2 = Date.now();
      await request(app)
        .post('/api/auth/login')
        .send({ pin: '8888' });
      const time2 = Date.now() - start2;

      // Response times should be similar (within 100ms difference)
      expect(Math.abs(time1 - time2)).toBeLessThan(100);
    });

    it('should handle concurrent login attempts', async () => {
      const concurrentLogins = Array(5).fill().map(() =>
        request(app)
          .post('/api/auth/login')
          .send({ pin: '1234' })
      );

      const responses = await Promise.all(concurrentLogins);
      
      // All should succeed (no race conditions)
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.token).toBeDefined();
      });
    });
  });
});