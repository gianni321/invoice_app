const BaseService = require('./BaseService');

/**
 * Entry service for handling time entry-related database operations
 */
class EntryService extends BaseService {
  constructor() {
    super('entries');
  }

  /**
   * Get entries for a user with optional filters
   * @param {number} userId 
   * @param {Object} options 
   * @returns {Promise<Array>}
   */
  async getEntriesForUser(userId, options = {}) {
    const { scope, startDate, endDate, invoiceId } = options;
    
    let whereClause = 'WHERE e.user_id = ?';
    const params = [userId];
    
    // Filter for open entries (not attached to any invoice)
    if (scope === 'open') {
      whereClause += ' AND e.invoice_id IS NULL';
    }

    // Filter by date range
    if (startDate) {
      whereClause += ' AND e.date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      whereClause += ' AND e.date <= ?';
      params.push(endDate);
    }

    // Filter by invoice ID
    if (invoiceId !== undefined) {
      if (invoiceId === null) {
        whereClause += ' AND e.invoice_id IS NULL';
      } else {
        whereClause += ' AND e.invoice_id = ?';
        params.push(invoiceId);
      }
    }
    
    const sql = `
      SELECT e.*, u.name as user_name, u.rate, e.user_id as userId 
      FROM entries e 
      JOIN users u ON e.user_id = u.id 
      ${whereClause}
      ORDER BY e.date DESC, e.id DESC
    `;
    
    return await this.query(sql, params);
  }

  /**
   * Get all entries with user information
   * @param {Object} options 
   * @returns {Promise<Array>}
   */
  async getAllEntriesWithUser(options = {}) {
    const { startDate, endDate, invoiceId } = options;
    
    let whereClause = '';
    const params = [];
    
    const conditions = [];
    
    if (startDate) {
      conditions.push('e.date >= ?');
      params.push(startDate);
    }
    if (endDate) {
      conditions.push('e.date <= ?');
      params.push(endDate);
    }
    if (invoiceId !== undefined) {
      if (invoiceId === null) {
        conditions.push('e.invoice_id IS NULL');
      } else {
        conditions.push('e.invoice_id = ?');
        params.push(invoiceId);
      }
    }

    if (conditions.length > 0) {
      whereClause = 'WHERE ' + conditions.join(' AND ');
    }
    
    const sql = `
      SELECT e.*, u.name as user_name, u.rate, e.user_id as userId 
      FROM entries e 
      JOIN users u ON e.user_id = u.id 
      ${whereClause}
      ORDER BY e.date DESC, e.id DESC
    `;
    
    return await this.query(sql, params);
  }

  /**
   * Create a new time entry
   * @param {Object} entryData 
   * @returns {Promise<{id: number, changes: number}>}
   */
  async createEntry(entryData) {
    const { hours, task, notes, date, user_id, invoice_id = null } = entryData;
    
    return await this.create({
      hours: parseFloat(hours),
      task,
      notes: notes || '',
      date,
      user_id,
      invoice_id
    });
  }

  /**
   * Update an entry
   * @param {number} entryId 
   * @param {Object} updateData 
   * @returns {Promise<{id: number, changes: number}>}
   */
  async updateEntry(entryId, updateData) {
    const updates = { ...updateData };
    
    // Parse hours if provided
    if (updates.hours !== undefined) {
      updates.hours = parseFloat(updates.hours);
    }
    
    return await this.updateById(entryId, updates);
  }

  /**
   * Attach entries to an invoice
   * @param {Array} entryIds 
   * @param {number} invoiceId 
   * @returns {Promise<{id: number, changes: number}>}
   */
  async attachToInvoice(entryIds, invoiceId) {
    const placeholders = entryIds.map(() => '?').join(',');
    const sql = `UPDATE entries SET invoice_id = ? WHERE id IN (${placeholders})`;
    return await this.run(sql, [invoiceId, ...entryIds]);
  }

  /**
   * Detach entries from an invoice
   * @param {Array} entryIds 
   * @returns {Promise<{id: number, changes: number}>}
   */
  async detachFromInvoice(entryIds) {
    const placeholders = entryIds.map(() => '?').join(',');
    const sql = `UPDATE entries SET invoice_id = NULL WHERE id IN (${placeholders})`;
    return await this.run(sql, [...entryIds]);
  }

  /**
   * Get entries summary for a period
   * @param {number} userId 
   * @param {string} startDate 
   * @param {string} endDate 
   * @returns {Promise<Object>}
   */
  async getEntriesSummary(userId, startDate, endDate) {
    const sql = `
      SELECT 
        COUNT(*) as total_entries,
        SUM(hours) as total_hours,
        MIN(date) as first_entry_date,
        MAX(date) as last_entry_date
      FROM entries 
      WHERE user_id = ? AND date >= ? AND date <= ?
    `;
    
    return await this.get(sql, [userId, startDate, endDate]);
  }

  /**
   * Delete entries for a user within a date range
   * @param {number} userId 
   * @param {string} startDate 
   * @param {string} endDate 
   * @returns {Promise<{id: number, changes: number}>}
   */
  async deleteEntriesInRange(userId, startDate, endDate) {
    const sql = 'DELETE FROM entries WHERE user_id = ? AND date >= ? AND date <= ?';
    return await this.run(sql, [userId, startDate, endDate]);
  }

  /**
   * Check if entry belongs to user
   * @param {number} entryId 
   * @param {number} userId 
   * @returns {Promise<boolean>}
   */
  async belongsToUser(entryId, userId) {
    const sql = 'SELECT COUNT(*) as count FROM entries WHERE id = ? AND user_id = ?';
    const result = await this.get(sql, [entryId, userId]);
    return result.count > 0;
  }
}

module.exports = new EntryService();