const { EntryService } = require('../services');
const { setupTestDb, cleanupTestDb, createTestUser } = require('./helpers/testDb');

describe('EntryService Unit Tests', () => {
  let entryService;
  let testUser;

  beforeAll(async () => {
    await setupTestDb();
    testUser = await createTestUser();
    entryService = new EntryService();
  });

  afterAll(async () => {
    await cleanupTestDb();
  });

  describe('createEntry', () => {
    test('should create a valid entry', async () => {
      const entryData = {
        description: 'Test work session',
        hours: 2.5,
        project: 'Test Project',
        date: '2024-01-15',
        userId: testUser.id
      };

      const entry = await entryService.createEntry(entryData);

      expect(entry).toMatchObject({
        id: expect.any(Number),
        description: 'Test work session',
        hours: 2.5,
        project: 'Test Project'
      });
    });

    test('should validate required fields', async () => {
      await expect(
        entryService.createEntry({})
      ).rejects.toThrow('description is required');
    });

    test('should validate hours format', async () => {
      const entryData = {
        description: 'Test',
        hours: 'invalid',
        project: 'Project',
        date: '2024-01-15',
        userId: testUser.id
      };

      await expect(
        entryService.createEntry(entryData)
      ).rejects.toThrow('hours must be a number');
    });

    test('should validate positive hours', async () => {
      const entryData = {
        description: 'Test',
        hours: -1,
        project: 'Project',
        date: '2024-01-15',
        userId: testUser.id
      };

      await expect(
        entryService.createEntry(entryData)
      ).rejects.toThrow('hours must be positive');
    });

    test('should validate date format', async () => {
      const entryData = {
        description: 'Test',
        hours: 1,
        project: 'Project',
        date: 'invalid-date',
        userId: testUser.id
      };

      await expect(
        entryService.createEntry(entryData)
      ).rejects.toThrow('Invalid date format');
    });
  });

  describe('getUserEntries', () => {
    beforeEach(async () => {
      // Create test entries
      await entryService.createEntry({
        description: 'Entry 1',
        hours: 1,
        project: 'Project A',
        date: '2024-01-01',
        userId: testUser.id
      });

      await entryService.createEntry({
        description: 'Entry 2',
        hours: 2,
        project: 'Project B',
        date: '2024-01-02',
        userId: testUser.id
      });
    });

    test('should return user entries', async () => {
      const entries = await entryService.getUserEntries(testUser.id);

      expect(entries).toHaveLength(2);
      expect(entries[0]).toMatchObject({
        description: expect.any(String),
        hours: expect.any(Number),
        project: expect.any(String)
      });
    });

    test('should filter by date range', async () => {
      const entries = await entryService.getUserEntries(testUser.id, {
        startDate: '2024-01-01',
        endDate: '2024-01-01'
      });

      expect(entries).toHaveLength(1);
      expect(entries[0].description).toBe('Entry 1');
    });

    test('should filter by project', async () => {
      const entries = await entryService.getUserEntries(testUser.id, {
        project: 'Project A'
      });

      expect(entries).toHaveLength(1);
      expect(entries[0].project).toBe('Project A');
    });

    test('should handle pagination', async () => {
      // Create more entries for pagination test
      for (let i = 3; i <= 15; i++) {
        await entryService.createEntry({
          description: `Entry ${i}`,
          hours: 1,
          project: 'Project',
          date: `2024-01-${i.toString().padStart(2, '0')}`,
          userId: testUser.id
        });
      }

      const entries = await entryService.getUserEntries(testUser.id, {
        page: 1,
        limit: 10
      });

      expect(entries).toHaveLength(10);
    });
  });

  describe('updateEntry', () => {
    let entryId;

    beforeEach(async () => {
      const entry = await entryService.createEntry({
        description: 'Original entry',
        hours: 1,
        project: 'Original Project',
        date: '2024-01-15',
        userId: testUser.id
      });
      entryId = entry.id;
    });

    test('should update an entry', async () => {
      const updateData = {
        description: 'Updated entry',
        hours: 3,
        project: 'Updated Project'
      };

      const updatedEntry = await entryService.updateEntry(
        entryId, 
        updateData, 
        testUser.id
      );

      expect(updatedEntry).toMatchObject(updateData);
    });

    test('should throw error for non-existent entry', async () => {
      await expect(
        entryService.updateEntry(99999, { description: 'Updated' }, testUser.id)
      ).rejects.toThrow('Entry not found');
    });

    test('should validate ownership', async () => {
      const otherUser = await createTestUser({ email: 'other@example.com' });

      await expect(
        entryService.updateEntry(entryId, { description: 'Hacked!' }, otherUser.id)
      ).rejects.toThrow('Entry not found');
    });
  });

  describe('deleteEntry', () => {
    let entryId;

    beforeEach(async () => {
      const entry = await entryService.createEntry({
        description: 'Entry to delete',
        hours: 1,
        project: 'Test Project',
        date: '2024-01-15',
        userId: testUser.id
      });
      entryId = entry.id;
    });

    test('should delete an entry', async () => {
      await entryService.deleteEntry(entryId, testUser.id);

      await expect(
        entryService.getEntryById(entryId, testUser.id)
      ).rejects.toThrow('Entry not found');
    });

    test('should throw error for non-existent entry', async () => {
      await expect(
        entryService.deleteEntry(99999, testUser.id)
      ).rejects.toThrow('Entry not found');
    });
  });

  describe('getTimeStats', () => {
    beforeEach(async () => {
      // Create entries for stats
      await entryService.createEntry({
        description: 'Work 1',
        hours: 8,
        project: 'Project A',
        date: '2024-01-01',
        userId: testUser.id
      });

      await entryService.createEntry({
        description: 'Work 2',
        hours: 6,
        project: 'Project A',
        date: '2024-01-02',
        userId: testUser.id
      });

      await entryService.createEntry({
        description: 'Work 3',
        hours: 4,
        project: 'Project B',
        date: '2024-01-03',
        userId: testUser.id
      });
    });

    test('should calculate total hours', async () => {
      const stats = await entryService.getTimeStats(testUser.id, {
        startDate: '2024-01-01',
        endDate: '2024-01-03'
      });

      expect(stats.totalHours).toBe(18);
    });

    test('should group by project', async () => {
      const stats = await entryService.getTimeStats(testUser.id, {
        startDate: '2024-01-01',
        endDate: '2024-01-03',
        groupBy: 'project'
      });

      expect(stats.byProject).toMatchObject({
        'Project A': 14,
        'Project B': 4
      });
    });

    test('should group by date', async () => {
      const stats = await entryService.getTimeStats(testUser.id, {
        startDate: '2024-01-01',
        endDate: '2024-01-03',
        groupBy: 'date'
      });

      expect(stats.byDate).toMatchObject({
        '2024-01-01': 8,
        '2024-01-02': 6,
        '2024-01-03': 4
      });
    });
  });
});