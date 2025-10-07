const UserService = require('../services/UserService');
const bcrypt = require('bcryptjs');

describe('UserService', () => {
  beforeEach(async () => {
    // Clear any existing test data
    try {
      await UserService.run('DELETE FROM users WHERE name LIKE ?', ['Test%']);
    } catch (error) {
      // Ignore errors - table might not exist yet
    }
  });

  describe('createUser', () => {
    it('should create a user with hashed PIN', async () => {
      const userData = {
        name: 'Test User',
        pin: '1234',
        rate: 75,
        role: 'member'
      };

      const result = await UserService.createUser(userData);

      expect(result.id).toBeDefined();
      expect(result.changes).toBe(1);

      // Verify user was created
      const user = await UserService.findByName('Test User');
      expect(user.name).toBe('Test User');
      expect(user.rate).toBe(75);
      expect(user.role).toBe('member');
      expect(user.pin_hash).toBeDefined();
      expect(user.pin_hash).not.toBe('1234'); // Should be hashed
    });

    it('should hash the PIN correctly', async () => {
      const userData = {
        name: 'Test User 2',
        pin: 'test123',
        rate: 80,
        role: 'member'
      };

      await UserService.createUser(userData);
      const user = await UserService.findByName('Test User 2');

      // Verify PIN is hashed
      const isValid = await bcrypt.compare('test123', user.pin_hash);
      expect(isValid).toBe(true);

      const isInvalid = await bcrypt.compare('wrong123', user.pin_hash);
      expect(isInvalid).toBe(false);
    });
  });

  describe('verifyPin', () => {
    beforeEach(async () => {
      await UserService.createUser({
        name: 'Test Verify User',
        pin: '5678',
        rate: 90,
        role: 'admin'
      });
    });

    it('should verify correct PIN', async () => {
      const user = await UserService.verifyPin('Test Verify User', '5678');

      expect(user).toBeDefined();
      expect(user.name).toBe('Test Verify User');
      expect(user.rate).toBe(90);
      expect(user.role).toBe('admin');
      expect(user.pin_hash).toBeUndefined(); // Should not include hash
    });

    it('should reject incorrect PIN', async () => {
      const user = await UserService.verifyPin('Test Verify User', 'wrong');

      expect(user).toBeNull();
    });

    it('should reject non-existent user', async () => {
      const user = await UserService.verifyPin('Non Existent', '5678');

      expect(user).toBeNull();
    });
  });

  describe('findByName', () => {
    beforeEach(async () => {
      await UserService.createUser({
        name: 'Test Find User',
        pin: '9999',
        rate: 65,
        role: 'member'
      });
    });

    it('should find existing user by name', async () => {
      const user = await UserService.findByName('Test Find User');

      expect(user).toBeDefined();
      expect(user.name).toBe('Test Find User');
      expect(user.rate).toBe(65);
    });

    it('should return null for non-existent user', async () => {
      const user = await UserService.findByName('Non Existent User');

      expect(user).toBeNull();
    });
  });

  describe('updatePin', () => {
    let userId;

    beforeEach(async () => {
      const result = await UserService.createUser({
        name: 'Test Update User',
        pin: 'old123',
        rate: 70,
        role: 'member'
      });
      userId = result.id;
    });

    it('should update user PIN', async () => {
      await UserService.updatePin(userId, 'new456');

      // Verify old PIN no longer works
      const userWithOldPin = await UserService.verifyPin('Test Update User', 'old123');
      expect(userWithOldPin).toBeNull();

      // Verify new PIN works
      const userWithNewPin = await UserService.verifyPin('Test Update User', 'new456');
      expect(userWithNewPin).toBeDefined();
      expect(userWithNewPin.name).toBe('Test Update User');
    });
  });

  describe('updateRate', () => {
    let userId;

    beforeEach(async () => {
      const result = await UserService.createUser({
        name: 'Test Rate User',
        pin: '1111',
        rate: 75,
        role: 'member'
      });
      userId = result.id;
    });

    it('should update user rate', async () => {
      await UserService.updateRate(userId, 85);

      const user = await UserService.findById(userId);
      expect(user.rate).toBe(85);
    });
  });

  describe('existsByName', () => {
    beforeEach(async () => {
      await UserService.createUser({
        name: 'Test Exists User',
        pin: '2222',
        rate: 75,
        role: 'member'
      });
    });

    it('should return true for existing user', async () => {
      const exists = await UserService.existsByName('Test Exists User');
      expect(exists).toBe(true);
    });

    it('should return false for non-existing user', async () => {
      const exists = await UserService.existsByName('Non Existent User');
      expect(exists).toBe(false);
    });

    it('should be case insensitive', async () => {
      const exists = await UserService.existsByName('test exists user');
      expect(exists).toBe(true);
    });
  });
});