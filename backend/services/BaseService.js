const db = require('../database');

/**
 * Base service class providing common database operations
 */
class BaseService {
  constructor(tableName) {
    this.tableName = tableName;
    this.db = db;
  }

  /**
   * Execute a query and return all results
   * @param {string} sql 
   * @param {Array} params 
   * @returns {Promise<Array>}
   */
  async query(sql, params = []) {
    try {
      return await this.db.query(sql, params);
    } catch (error) {
      throw new Error(`Database query failed: ${error.message}`);
    }
  }

  /**
   * Execute a query and return a single result
   * @param {string} sql 
   * @param {Array} params 
   * @returns {Promise<Object|null>}
   */
  async get(sql, params = []) {
    try {
      return await this.db.get(sql, params);
    } catch (error) {
      throw new Error(`Database get failed: ${error.message}`);
    }
  }

  /**
   * Execute an insert/update/delete query
   * @param {string} sql 
   * @param {Array} params 
   * @returns {Promise<{id: number, changes: number}>}
   */
  async run(sql, params = []) {
    try {
      return await this.db.run(sql, params);
    } catch (error) {
      throw new Error(`Database run failed: ${error.message}`);
    }
  }

  /**
   * Find record by ID
   * @param {number} id 
   * @returns {Promise<Object|null>}
   */
  async findById(id) {
    const sql = `SELECT * FROM ${this.tableName} WHERE id = ?`;
    return await this.get(sql, [id]);
  }

  /**
   * Find all records with optional conditions
   * @param {Object} conditions 
   * @param {string} orderBy 
   * @returns {Promise<Array>}
   */
  async findAll(conditions = {}, orderBy = 'id ASC') {
    let sql = `SELECT * FROM ${this.tableName}`;
    const params = [];

    if (Object.keys(conditions).length > 0) {
      const whereClause = Object.keys(conditions)
        .map(key => `${key} = ?`)
        .join(' AND ');
      sql += ` WHERE ${whereClause}`;
      params.push(...Object.values(conditions));
    }

    if (orderBy) {
      sql += ` ORDER BY ${orderBy}`;
    }

    return await this.query(sql, params);
  }

  /**
   * Create a new record
   * @param {Object} data 
   * @returns {Promise<{id: number, changes: number}>}
   */
  async create(data) {
    const keys = Object.keys(data);
    const placeholders = keys.map(() => '?').join(', ');
    const sql = `INSERT INTO ${this.tableName} (${keys.join(', ')}) VALUES (${placeholders})`;
    
    return await this.run(sql, Object.values(data));
  }

  /**
   * Update a record by ID
   * @param {number} id 
   * @param {Object} data 
   * @returns {Promise<{id: number, changes: number}>}
   */
  async updateById(id, data) {
    const keys = Object.keys(data);
    const setClause = keys.map(key => `${key} = ?`).join(', ');
    const sql = `UPDATE ${this.tableName} SET ${setClause} WHERE id = ?`;
    
    return await this.run(sql, [...Object.values(data), id]);
  }

  /**
   * Delete a record by ID
   * @param {number} id 
   * @returns {Promise<{id: number, changes: number}>}
   */
  async deleteById(id) {
    const sql = `DELETE FROM ${this.tableName} WHERE id = ?`;
    return await this.run(sql, [id]);
  }
}

module.exports = BaseService;