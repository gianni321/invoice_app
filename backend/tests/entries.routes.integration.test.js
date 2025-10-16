const request = require('supertest');
const path = require('path');

// Import app and test helpers
const app = require('../server');
const { 
  setupTestDb, 
  cleanupTestDb, 
  createTestUser, 
  generateAuthToken 
} = require('./helpers/testDb');

describe('Entries API Integration Tests', () => {
  let testUser;
  let authToken;

  beforeAll(async () => {
    await setupTestDb();
    testUser = await createTestUser();
    authToken = generateAuthToken(testUser);
  });

  afterAll(async () => {
    await cleanupTestDb();
  });

  describe('POST /api/entries', () => {
    test('should create a new time entry', async () => {
      const entryData = {
        description: 'Test work session',
        hours: 2.5,
        project: 'Test Project',
        date: '2024-01-15'
      };

      const response = await request(app)
        .post('/api/entries')
        .set('Authorization', `Bearer ${authToken}`)
        .send(entryData)
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(Number),
        description: 'Test work session',
        hours: 2.5,
        project: 'Test Project'
      });
    });

    test('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/entries')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body.error).toContain('required');
    });

    test('should reject negative hours', async () => {
      const entryData = {
        description: 'Test work',
        hours: -1,
        project: 'Test Project',
        date: '2024-01-15'
      };

      const response = await request(app)
        .post('/api/entries')
        .set('Authorization', `Bearer ${authToken}`)
        .send(entryData)
        .expect(400);

      expect(response.body.error).toContain('positive');
    });
  });

  describe('GET /api/entries', () => {
    beforeEach(async () => {
      // Create test entries
      await request(app)
        .post('/api/entries')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: 'Entry 1',
          hours: 1,
          project: 'Project A',
          date: '2024-01-01'
        });

      await request(app)
        .post('/api/entries')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: 'Entry 2',
          hours: 2,
          project: 'Project B',
          date: '2024-01-02'
        });
    });

    test('should return user entries', async () => {
      const response = await request(app)
        .get('/api/entries')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toMatchObject({
        description: expect.any(String),
        hours: expect.any(Number),
        project: expect.any(String)
      });
    });

    test('should filter by date range', async () => {
      const response = await request(app)
        .get('/api/entries?startDate=2024-01-01&endDate=2024-01-01')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].description).toBe('Entry 1');
    });

    test('should filter by project', async () => {
      const response = await request(app)
        .get('/api/entries?project=Project A')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].project).toBe('Project A');
    });
  });

  describe('PUT /api/entries/:id', () => {
    let entryId;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/entries')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: 'Original entry',
          hours: 1,
          project: 'Original Project',
          date: '2024-01-15'
        });
      
      entryId = response.body.id;
    });

    test('should update an entry', async () => {
      const updateData = {
        description: 'Updated entry',
        hours: 3,
        project: 'Updated Project'
      };

      const response = await request(app)
        .put(`/api/entries/${entryId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject(updateData);
    });

    test('should return 404 for non-existent entry', async () => {
      await request(app)
        .put('/api/entries/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ description: 'Updated' })
        .expect(404);
    });

    test('should prevent updating other users entries', async () => {
      const otherUser = await createTestUser({ 
        email: 'other@example.com' 
      });
      const otherToken = generateAuthToken(otherUser);

      await request(app)
        .put(`/api/entries/${entryId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ description: 'Hacked!' })
        .expect(403);
    });
  });

  describe('DELETE /api/entries/:id', () => {
    let entryId;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/entries')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: 'Entry to delete',
          hours: 1,
          project: 'Test Project',
          date: '2024-01-15'
        });
      
      entryId = response.body.id;
    });

    test('should delete an entry', async () => {
      await request(app)
        .delete(`/api/entries/${entryId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);

      // Verify it's deleted
      await request(app)
        .get(`/api/entries/${entryId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    test('should return 404 for non-existent entry', async () => {
      await request(app)
        .delete('/api/entries/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('Batch Operations', () => {
    test('should handle batch entry creation', async () => {
      const batchData = {
        entries: [
          {
            description: 'Batch entry 1',
            hours: 1,
            project: 'Batch Project',
            date: '2024-01-01'
          },
          {
            description: 'Batch entry 2',
            hours: 2,
            project: 'Batch Project',
            date: '2024-01-02'
          }
        ]
      };

      const response = await request(app)
        .post('/api/entries/batch')
        .set('Authorization', `Bearer ${authToken}`)
        .send(batchData)
        .expect(201);

      expect(response.body.created).toBe(2);
      expect(response.body.entries).toHaveLength(2);
    });

    test('should validate batch data', async () => {
      const batchData = {
        entries: [
          {
            description: 'Valid entry',
            hours: 1,
            project: 'Project',
            date: '2024-01-01'
          },
          {
            // Missing required fields
            description: 'Invalid entry'
          }
        ]
      };

      const response = await request(app)
        .post('/api/entries/batch')
        .set('Authorization', `Bearer ${authToken}`)
        .send(batchData)
        .expect(400);

      expect(response.body.error).toContain('validation');
    });
  });
});