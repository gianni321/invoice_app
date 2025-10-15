const db = require('../database-loader');

/**
 * Database transaction wrapper for ensuring data integrity
 * Provides ACID compliance for multi-table operations
 */
class DatabaseTransaction {
  /**
   * Execute multiple database operations within a transaction
   * @param {Function} callback - Function containing database operations
   * @returns {Promise<any>} - Result of the callback function
   */
  static async execute(callback) {
    // Begin transaction
    await db.run('BEGIN TRANSACTION');
    
    try {
      // Execute the callback with database operations
      const result = await callback(db);
      
      // Commit transaction if all operations succeed
      await db.run('COMMIT');
      
      return result;
    } catch (error) {
      // Rollback transaction on any error
      try {
        await db.run('ROLLBACK');
      } catch (rollbackError) {
        console.error('Error during rollback:', rollbackError);
      }
      
      // Re-throw the original error
      throw error;
    }
  }

  /**
   * Execute a batch of INSERT/UPDATE operations with transaction safety
   * @param {Array} operations - Array of {sql, params} objects
   * @returns {Promise<Array>} - Array of results
   */
  static async executeBatch(operations) {
    return this.execute(async (db) => {
      const results = [];
      
      for (const operation of operations) {
        const result = await db.run(operation.sql, operation.params || []);
        results.push(result);
      }
      
      return results;
    });
  }

  /**
   * Safely create an invoice with associated entries update
   * Demonstrates transaction usage for invoice submission
   * @param {Object} invoiceData - Invoice data
   * @param {Array} entryIds - Entry IDs to associate with invoice
   * @returns {Promise<Object>} - Created invoice with ID
   */
  static async createInvoiceWithEntries(invoiceData, entryIds) {
    return this.execute(async (db) => {
      // Insert invoice
      const invoiceResult = await db.run(`
        INSERT INTO invoices (
          user_id, period_start, period_end, total, 
          status, submitted_at, declared_at, custom_note
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        invoiceData.user_id,
        invoiceData.period_start,
        invoiceData.period_end,
        invoiceData.total,
        'submitted',
        new Date().toISOString(),
        invoiceData.declared_at || new Date().toISOString(),
        invoiceData.custom_note || null
      ]);

      const invoiceId = invoiceResult.lastID;

      // Update all entries to reference this invoice
      if (entryIds && entryIds.length > 0) {
        const placeholders = entryIds.map(() => '?').join(',');
        await db.run(`
          UPDATE entries 
          SET invoice_id = ?, updated_at = datetime('now')
          WHERE id IN (${placeholders})
        `, [invoiceId, ...entryIds]);
      }

      // Log the action
      await db.run(`
        INSERT INTO audit_log (
          user_id, action, details, created_at
        ) VALUES (?, ?, ?, datetime('now'))
      `, [
        invoiceData.user_id,
        'INVOICE_CREATED',
        `Invoice ${invoiceId} created with ${entryIds?.length || 0} entries`
      ]);

      return {
        id: invoiceId,
        ...invoiceData,
        status: 'submitted',
        entryCount: entryIds?.length || 0
      };
    });
  }

  /**
   * Safely approve an invoice with status update and logging
   * @param {number} invoiceId - Invoice ID to approve
   * @param {number} adminUserId - ID of admin approving
   * @returns {Promise<Object>} - Updated invoice data
   */
  static async approveInvoice(invoiceId, adminUserId) {
    return this.execute(async (db) => {
      const now = new Date().toISOString();

      // Update invoice status
      await db.run(`
        UPDATE invoices 
        SET status = 'approved', approved_at = ?, approved_by = ?
        WHERE id = ? AND status = 'submitted'
      `, [now, adminUserId, invoiceId]);

      // Log the approval
      await db.run(`
        INSERT INTO audit_log (
          user_id, action, details, created_at
        ) VALUES (?, ?, ?, datetime('now'))
      `, [
        adminUserId,
        'INVOICE_APPROVED',
        `Invoice ${invoiceId} approved by admin`
      ]);

      // Return updated invoice
      const invoice = await db.get('SELECT * FROM invoices WHERE id = ?', [invoiceId]);
      return invoice;
    });
  }

  /**
   * Safely mark invoice as paid with complete audit trail
   * @param {number} invoiceId - Invoice ID to mark as paid
   * @param {number} adminUserId - ID of admin marking as paid
   * @returns {Promise<Object>} - Updated invoice data
   */
  static async markInvoicePaid(invoiceId, adminUserId) {
    return this.execute(async (db) => {
      const now = new Date().toISOString();

      // Update invoice status
      const result = await db.run(`
        UPDATE invoices 
        SET status = 'paid', paid_at = ?
        WHERE id = ? AND status = 'approved'
      `, [now, invoiceId]);

      if (result.changes === 0) {
        throw new Error('Invoice not found or not in approved status');
      }

      // Log the payment
      await db.run(`
        INSERT INTO audit_log (
          user_id, action, details, created_at
        ) VALUES (?, ?, ?, datetime('now'))
      `, [
        adminUserId,
        'INVOICE_PAID',
        `Invoice ${invoiceId} marked as paid`
      ]);

      // Return updated invoice
      const invoice = await db.get('SELECT * FROM invoices WHERE id = ?', [invoiceId]);
      return invoice;
    });
  }
}

module.exports = DatabaseTransaction;