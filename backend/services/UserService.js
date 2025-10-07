const BaseService = require('./BaseService');
const bcrypt = require('bcryptjs');

/**
 * User service for handling user-related database operations
 */
class UserService extends BaseService {
  constructor() {
    super('users');
  }

  /**
   * Find user by name
   * @param {string} name 
   * @returns {Promise<Object|null>}
   */
  async findByName(name) {
    const sql = 'SELECT * FROM users WHERE name = ?';
    return await this.get(sql, [name]);
  }

  /**
   * Verify user PIN
   * @param {string} name 
   * @param {string} pin 
   * @returns {Promise<Object|null>}
   */
  async verifyPin(name, pin) {
    const user = await this.findByName(name);
    if (!user) return null;

    const isValid = await bcrypt.compare(pin, user.pin_hash);
    if (!isValid) return null;

    // Return user without sensitive data
    const { pin_hash, ...userWithoutHash } = user;
    return userWithoutHash;
  }

  /**
   * Create user with hashed PIN
   * @param {Object} userData 
   * @returns {Promise<{id: number, changes: number}>}
   */
  async createUser(userData) {
    const { pin, ...otherData } = userData;
    const pin_hash = await bcrypt.hash(pin, 10);
    
    return await this.create({
      ...otherData,
      pin_hash
    });
  }

  /**
   * Update user PIN
   * @param {number} userId 
   * @param {string} newPin 
   * @returns {Promise<{id: number, changes: number}>}
   */
  async updatePin(userId, newPin) {
    const pin_hash = await bcrypt.hash(newPin, 10);
    return await this.updateById(userId, { pin_hash });
  }

  /**
   * Get all users (without sensitive data)
   * @returns {Promise<Array>}
   */
  async getAllUsers() {
    const sql = 'SELECT id, name, rate, role, created_at FROM users ORDER BY name';
    return await this.query(sql);
  }

  /**
   * Check if user exists by name (case insensitive)
   * @param {string} name 
   * @returns {Promise<boolean>}
   */
  async existsByName(name) {
    const sql = 'SELECT COUNT(*) as count FROM users WHERE LOWER(name) = LOWER(?)';
    const result = await this.get(sql, [name]);
    return result.count > 0;
  }

  /**
   * Update user rate
   * @param {number} userId 
   * @param {number} rate 
   * @returns {Promise<{id: number, changes: number}>}
   */
  async updateRate(userId, rate) {
    return await this.updateById(userId, { rate });
  }

  /**
   * Update user role
   * @param {number} userId 
   * @param {string} role 
   * @returns {Promise<{id: number, changes: number}>}
   */
  async updateRole(userId, role) {
    return await this.updateById(userId, { role });
  }
}

module.exports = new UserService();