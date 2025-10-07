const BaseService = require('./BaseService');

/**
 * Invoice service for handling invoice-related database operations
 */
class InvoiceService extends BaseService {
  constructor() {
    super('invoices');
  }

  /**
   * Get invoices for a user
   * @param {number} userId 
   * @param {Object} options 
   * @returns {Promise<Array>}
   */
  async getInvoicesForUser(userId, options = {}) {
    const { status, startDate, endDate } = options;
    
    let whereClause = 'WHERE user_id = ?';
    const params = [userId];
    
    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }
    
    if (startDate) {
      whereClause += ' AND period_start >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      whereClause += ' AND period_end <= ?';
      params.push(endDate);
    }
    
    const sql = `
      SELECT * FROM invoices 
      ${whereClause}
      ORDER BY period_start DESC
    `;
    
    return await this.query(sql, params);
  }

  /**
   * Get all invoices with user information
   * @param {Object} options 
   * @returns {Promise<Array>}
   */
  async getAllInvoicesWithUser(options = {}) {
    const { status, startDate, endDate } = options;
    
    let whereClause = '';
    const params = [];
    const conditions = [];
    
    if (status) {
      conditions.push('i.status = ?');
      params.push(status);
    }
    
    if (startDate) {
      conditions.push('i.period_start >= ?');
      params.push(startDate);
    }
    
    if (endDate) {
      conditions.push('i.period_end <= ?');
      params.push(endDate);
    }
    
    if (conditions.length > 0) {
      whereClause = 'WHERE ' + conditions.join(' AND ');
    }
    
    const sql = `
      SELECT i.*, u.name as user_name, u.rate 
      FROM invoices i 
      JOIN users u ON i.user_id = u.id 
      ${whereClause}
      ORDER BY i.period_start DESC, u.name
    `;
    
    return await this.query(sql, params);
  }

  /**
   * Get invoice by ID with user information
   * @param {number} invoiceId 
   * @returns {Promise<Object|null>}
   */
  async getInvoiceWithUser(invoiceId) {
    const sql = `
      SELECT i.*, u.name as user_name, u.rate 
      FROM invoices i 
      JOIN users u ON i.user_id = u.id 
      WHERE i.id = ?
    `;
    
    return await this.get(sql, [invoiceId]);
  }

  /**
   * Check if invoice exists for user and period
   * @param {number} userId 
   * @param {string} periodStart 
   * @param {string} periodEnd 
   * @returns {Promise<Object|null>}
   */
  async findByUserAndPeriod(userId, periodStart, periodEnd) {
    const sql = `
      SELECT * FROM invoices 
      WHERE user_id = ? AND period_start = ? AND period_end = ?
    `;
    
    return await this.get(sql, [userId, periodStart, periodEnd]);
  }

  /**
   * Create a new invoice
   * @param {Object} invoiceData 
   * @returns {Promise<{id: number, changes: number}>}
   */
  async createInvoice(invoiceData) {
    const {
      user_id,
      period_start,
      period_end,
      total_hours,
      total_amount,
      status = 'submitted',
      submitted_at = new Date().toISOString()
    } = invoiceData;
    
    return await this.create({
      user_id,
      period_start,
      period_end,
      total_hours: parseFloat(total_hours),
      total_amount: parseFloat(total_amount),
      status,
      submitted_at
    });
  }

  /**
   * Update invoice status
   * @param {number} invoiceId 
   * @param {string} status 
   * @param {Object} additionalData 
   * @returns {Promise<{id: number, changes: number}>}
   */
  async updateStatus(invoiceId, status, additionalData = {}) {
    const updateData = { status, ...additionalData };
    
    if (status === 'paid' && !additionalData.paid_at) {
      updateData.paid_at = new Date().toISOString();
    }
    
    return await this.updateById(invoiceId, updateData);
  }

  /**
   * Get invoice statistics
   * @param {number} userId 
   * @returns {Promise<Object>}
   */
  async getInvoiceStats(userId = null) {
    let whereClause = '';
    const params = [];
    
    if (userId) {
      whereClause = 'WHERE user_id = ?';
      params.push(userId);
    }
    
    const sql = `
      SELECT 
        COUNT(*) as total_invoices,
        SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) as submitted_count,
        SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid_count,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_count,
        SUM(total_hours) as total_hours,
        SUM(total_amount) as total_amount,
        SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END) as paid_amount
      FROM invoices 
      ${whereClause}
    `;
    
    return await this.get(sql, params);
  }

  /**
   * Get recent invoices
   * @param {number} limit 
   * @param {number} userId 
   * @returns {Promise<Array>}
   */
  async getRecentInvoices(limit = 10, userId = null) {
    let whereClause = '';
    const params = [];
    
    if (userId) {
      whereClause = 'WHERE i.user_id = ?';
      params.push(userId);
    }
    
    params.push(limit);
    
    const sql = `
      SELECT i.*, u.name as user_name, u.rate 
      FROM invoices i 
      JOIN users u ON i.user_id = u.id 
      ${whereClause}
      ORDER BY i.submitted_at DESC 
      LIMIT ?
    `;
    
    return await this.query(sql, params);
  }

  /**
   * Check if invoice belongs to user
   * @param {number} invoiceId 
   * @param {number} userId 
   * @returns {Promise<boolean>}
   */
  async belongsToUser(invoiceId, userId) {
    const sql = 'SELECT COUNT(*) as count FROM invoices WHERE id = ? AND user_id = ?';
    const result = await this.get(sql, [invoiceId, userId]);
    return result.count > 0;
  }

  /**
   * Delete invoice and detach entries
   * @param {number} invoiceId 
   * @returns {Promise<{id: number, changes: number}>}
   */
  async deleteInvoice(invoiceId) {
    // First detach all entries from this invoice
    await this.run('UPDATE entries SET invoice_id = NULL WHERE invoice_id = ?', [invoiceId]);
    
    // Then delete the invoice
    return await this.deleteById(invoiceId);
  }

  /**
   * Get pending invoices (submitted but not paid)
   * @returns {Promise<Array>}
   */
  async getPendingInvoices() {
    const sql = `
      SELECT i.*, u.name as user_name, u.rate 
      FROM invoices i 
      JOIN users u ON i.user_id = u.id 
      WHERE i.status = 'submitted'
      ORDER BY i.submitted_at ASC
    `;
    
    return await this.query(sql);
  }
}

module.exports = new InvoiceService();