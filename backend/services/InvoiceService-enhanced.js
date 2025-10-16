const { Invoice, Entry, User } = require('../models');
const { ValidationError, NotFoundError, ConflictError } = require('../lib/errors');

/**
 * Enhanced Invoice Service using Objection.js models
 * Handles all business logic for invoice management
 */
class InvoiceService {
  /**
   * Create a new invoice with entries
   * @param {Object} invoiceData 
   * @param {Array} entryIds 
   * @param {number} userId 
   * @returns {Promise<Invoice>}
   */
  async createInvoice(invoiceData, entryIds, userId) {
    this.validateInvoiceData(invoiceData);

    if (!entryIds || entryIds.length === 0) {
      throw new ValidationError('At least one entry must be selected');
    }

    // Verify all entries belong to user and are available for invoicing
    const entries = await Entry.query()
      .whereIn('id', entryIds)
      .where('user_id', userId)
      .where('status', 'open');

    if (entries.length !== entryIds.length) {
      throw new ValidationError('Some entries are not available for invoicing');
    }

    // Calculate totals
    const subtotal = entries.reduce((sum, entry) => {
      const rate = entry.rate || invoiceData.hourlyRate || 0;
      return sum + (entry.hours * rate);
    }, 0);

    const taxRate = invoiceData.taxRate || 0;
    const taxAmount = subtotal * (taxRate / 100);
    const totalAmount = subtotal + taxAmount;

    // Generate invoice number if not provided
    const invoiceNumber = invoiceData.invoiceNumber || 
      await Invoice.getNextInvoiceNumber(userId);

    // Create invoice with entries in a transaction
    const invoice = await Invoice.transaction(async (trx) => {
      // Create invoice
      const newInvoice = await Invoice.query(trx).insert({
        user_id: userId,
        invoice_number: invoiceNumber,
        client_name: invoiceData.clientName,
        client_email: invoiceData.clientEmail,
        client_address: invoiceData.clientAddress,
        subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        currency: invoiceData.currency || 'USD',
        issue_date: invoiceData.issueDate || new Date().toISOString().split('T')[0],
        due_date: invoiceData.dueDate,
        notes: invoiceData.notes,
        status: invoiceData.status || 'draft'
      });

      // Update entries
      await Entry.query(trx)
        .whereIn('id', entryIds)
        .where('user_id', userId)
        .patch({
          status: 'invoiced',
          invoice_id: newInvoice.id
        });

      return newInvoice;
    });

    // Return invoice with entries
    return invoice.$loadRelated('entries');
  }

  /**
   * Get invoices for a user with filters and pagination
   * @param {number} userId 
   * @param {Object} filters 
   * @returns {Promise<{invoices: Invoice[], pagination: Object}>}
   */
  async getUserInvoices(userId, filters = {}) {
    const {
      status,
      client,
      startDate,
      endDate,
      page = 1,
      limit = 20,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = filters;

    let query = Invoice.query()
      .where('user_id', userId);

    // Apply filters
    if (status) {
      query = query.where('status', status);
    }

    if (client) {
      query = query.where('client_name', 'like', `%${client}%`);
    }

    if (startDate) {
      query = query.where('issue_date', '>=', startDate);
    }

    if (endDate) {
      query = query.where('issue_date', '<=', endDate);
    }

    // Apply sorting
    const validSortFields = ['issue_date', 'due_date', 'total_amount', 'client_name', 'created_at'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    const order = ['asc', 'desc'].includes(sortOrder) ? sortOrder : 'desc';
    
    query = query.orderBy(sortField, order);

    // Apply pagination
    const offset = (page - 1) * limit;
    const invoices = await query
      .offset(offset)
      .limit(limit)
      .withGraphFetched('entries(selectBasic)')
      .modifiers({
        selectBasic(builder) {
          builder.select('id', 'description', 'hours', 'project', 'date');
        }
      });

    // Get total count for pagination
    const totalQuery = Invoice.query().where('user_id', userId);
    if (status) totalQuery.where('status', status);
    if (client) totalQuery.where('client_name', 'like', `%${client}%`);
    if (startDate) totalQuery.where('issue_date', '>=', startDate);
    if (endDate) totalQuery.where('issue_date', '<=', endDate);

    const [{ total }] = await totalQuery.count('* as total');
    const totalPages = Math.ceil(total / limit);

    return {
      invoices,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(total),
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Get a single invoice by ID
   * @param {number} invoiceId 
   * @param {number} userId 
   * @returns {Promise<Invoice>}
   */
  async getInvoice(invoiceId, userId) {
    const invoice = await Invoice.query()
      .findById(invoiceId)
      .where('user_id', userId)
      .withGraphFetched('[entries, user(selectBasic)]')
      .modifiers({
        selectBasic(builder) {
          builder.select('id', 'name', 'email');
        }
      });

    if (!invoice) {
      throw new NotFoundError('Invoice not found');
    }

    return invoice;
  }

  /**
   * Update an invoice
   * @param {number} invoiceId 
   * @param {Object} updateData 
   * @param {number} userId 
   * @returns {Promise<Invoice>}
   */
  async updateInvoice(invoiceId, updateData, userId) {
    const invoice = await Invoice.query()
      .findById(invoiceId)
      .where('user_id', userId);

    if (!invoice) {
      throw new NotFoundError('Invoice not found');
    }

    // Prevent updating paid invoices
    if (invoice.status === 'paid') {
      throw new ValidationError('Cannot modify paid invoices');
    }

    this.validateInvoiceData(updateData, true);

    // Recalculate totals if tax rate changed
    if (updateData.taxRate !== undefined && updateData.taxRate !== invoice.tax_rate) {
      const subtotal = invoice.subtotal || 0;
      const taxRate = updateData.taxRate || 0;
      const taxAmount = subtotal * (taxRate / 100);
      const totalAmount = subtotal + taxAmount;

      updateData.tax_rate = taxRate;
      updateData.tax_amount = taxAmount;
      updateData.total_amount = totalAmount;
    }

    const updatedInvoice = await invoice.$query().patchAndFetch(updateData);
    return updatedInvoice;
  }

  /**
   * Delete an invoice
   * @param {number} invoiceId 
   * @param {number} userId 
   * @returns {Promise<boolean>}
   */
  async deleteInvoice(invoiceId, userId) {
    const invoice = await Invoice.query()
      .findById(invoiceId)
      .where('user_id', userId);

    if (!invoice) {
      throw new NotFoundError('Invoice not found');
    }

    // Prevent deleting paid invoices
    if (invoice.status === 'paid') {
      throw new ValidationError('Cannot delete paid invoices');
    }

    // Revert associated entries to open status
    await Entry.query()
      .where('invoice_id', invoiceId)
      .patch({
        status: 'open',
        invoice_id: null
      });

    await invoice.$query().delete();
    return true;
  }

  /**
   * Mark invoice as sent
   * @param {number} invoiceId 
   * @param {number} userId 
   * @returns {Promise<Invoice>}
   */
  async markAsSent(invoiceId, userId) {
    const invoice = await this.getInvoice(invoiceId, userId);

    if (invoice.status !== 'draft') {
      throw new ValidationError('Only draft invoices can be marked as sent');
    }

    const updatedInvoice = await invoice.$query().patchAndFetch({
      status: 'sent',
      sent_date: new Date().toISOString()
    });

    return updatedInvoice;
  }

  /**
   * Mark invoice as paid
   * @param {number} invoiceId 
   * @param {Object} paymentData 
   * @param {number} userId 
   * @returns {Promise<Invoice>}
   */
  async markAsPaid(invoiceId, paymentData, userId) {
    const invoice = await this.getInvoice(invoiceId, userId);

    if (!['sent', 'overdue'].includes(invoice.status)) {
      throw new ValidationError('Only sent or overdue invoices can be marked as paid');
    }

    const updateData = {
      status: 'paid',
      paid_date: paymentData.paidDate || new Date().toISOString().split('T')[0]
    };

    if (paymentData.paymentMethod) {
      updateData.payment_method = paymentData.paymentMethod;
    }

    // Update invoice and associated entries in transaction
    const updatedInvoice = await Invoice.transaction(async (trx) => {
      // Update invoice
      const invoice = await Invoice.query(trx)
        .findById(invoiceId)
        .where('user_id', userId)
        .patchAndFetch(updateData);

      // Mark associated entries as paid
      await Entry.query(trx)
        .where('invoice_id', invoiceId)
        .patch({ status: 'paid' });

      return invoice;
    });

    return updatedInvoice;
  }

  /**
   * Cancel an invoice
   * @param {number} invoiceId 
   * @param {number} userId 
   * @returns {Promise<Invoice>}
   */
  async cancelInvoice(invoiceId, userId) {
    const invoice = await this.getInvoice(invoiceId, userId);

    if (invoice.status === 'paid') {
      throw new ValidationError('Cannot cancel paid invoices');
    }

    // Update invoice and revert entries in transaction
    const updatedInvoice = await Invoice.transaction(async (trx) => {
      // Update invoice status
      const invoice = await Invoice.query(trx)
        .findById(invoiceId)
        .where('user_id', userId)
        .patchAndFetch({ status: 'cancelled' });

      // Revert entries to open status
      await Entry.query(trx)
        .where('invoice_id', invoiceId)
        .patch({
          status: 'open',
          invoice_id: null
        });

      return invoice;
    });

    return updatedInvoice;
  }

  /**
   * Get overdue invoices
   * @param {number} userId 
   * @returns {Promise<Array<Invoice>>}
   */
  async getOverdueInvoices(userId = null) {
    const today = new Date().toISOString().split('T')[0];
    
    let query = Invoice.query()
      .where('status', 'sent')
      .where('due_date', '<', today);

    if (userId) {
      query = query.where('user_id', userId);
    }

    return query.withGraphFetched('user(selectBasic)')
      .modifiers({
        selectBasic(builder) {
          builder.select('id', 'name', 'email');
        }
      });
  }

  /**
   * Auto-mark overdue invoices
   * @returns {Promise<number>}
   */
  async markOverdueInvoices() {
    const today = new Date().toISOString().split('T')[0];
    
    const updatedCount = await Invoice.query()
      .where('status', 'sent')
      .where('due_date', '<', today)
      .patch({ status: 'overdue' });

    return updatedCount;
  }

  /**
   * Get invoice statistics
   * @param {number} userId 
   * @param {Object} filters 
   * @returns {Promise<Object>}
   */
  async getInvoiceStats(userId, filters = {}) {
    const { startDate, endDate } = filters;

    let query = Invoice.query().where('user_id', userId);

    if (startDate) query = query.where('issue_date', '>=', startDate);
    if (endDate) query = query.where('issue_date', '<=', endDate);

    // Status breakdown
    const statusStats = await query.clone()
      .groupBy('status')
      .select('status')
      .count('* as count')
      .sum('total_amount as totalAmount');

    // Revenue by month (if date range spans multiple months)
    const monthlyStats = await query.clone()
      .where('status', 'paid')
      .select(Invoice.raw("DATE_FORMAT(paid_date, '%Y-%m') as month"))
      .sum('total_amount as revenue')
      .count('* as invoiceCount')
      .groupBy('month')
      .orderBy('month', 'asc');

    // Client statistics
    const clientStats = await query.clone()
      .groupBy('client_name')
      .select('client_name')
      .count('* as invoiceCount')
      .sum('total_amount as totalAmount')
      .orderBy('totalAmount', 'desc')
      .limit(10);

    const stats = {
      byStatus: statusStats.reduce((acc, stat) => {
        acc[stat.status] = {
          count: parseInt(stat.count),
          amount: parseFloat(stat.totalAmount) || 0
        };
        return acc;
      }, {}),

      byMonth: monthlyStats.reduce((acc, stat) => {
        acc[stat.month] = {
          revenue: parseFloat(stat.revenue) || 0,
          count: parseInt(stat.invoiceCount)
        };
        return acc;
      }, {}),

      topClients: clientStats.map(stat => ({
        name: stat.client_name,
        invoiceCount: parseInt(stat.invoiceCount),
        totalAmount: parseFloat(stat.totalAmount) || 0
      }))
    };

    // Calculate totals
    const totals = Object.values(stats.byStatus);
    stats.totals = {
      count: totals.reduce((sum, stat) => sum + stat.count, 0),
      amount: totals.reduce((sum, stat) => sum + stat.amount, 0),
      paidAmount: stats.byStatus.paid?.amount || 0,
      pendingAmount: (stats.byStatus.sent?.amount || 0) + (stats.byStatus.overdue?.amount || 0)
    };

    return stats;
  }

  /**
   * Validate invoice data
   * @private
   * @param {Object} invoiceData 
   * @param {boolean} isUpdate 
   */
  validateInvoiceData(invoiceData, isUpdate = false) {
    const errors = [];

    // Client name validation
    if (!isUpdate || invoiceData.clientName !== undefined) {
      if (!invoiceData.clientName || invoiceData.clientName.trim().length === 0) {
        errors.push('Client name is required');
      } else if (invoiceData.clientName.length > 255) {
        errors.push('Client name must be 255 characters or less');
      }
    }

    // Email validation
    if (invoiceData.clientEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(invoiceData.clientEmail)) {
        errors.push('Invalid client email format');
      }
    }

    // Amount validations
    if (invoiceData.totalAmount !== undefined) {
      if (typeof invoiceData.totalAmount !== 'number' || invoiceData.totalAmount < 0) {
        errors.push('Total amount must be a positive number');
      }
    }

    if (invoiceData.taxRate !== undefined) {
      if (typeof invoiceData.taxRate !== 'number' || invoiceData.taxRate < 0 || invoiceData.taxRate > 100) {
        errors.push('Tax rate must be between 0 and 100');
      }
    }

    // Date validations
    if (invoiceData.issueDate) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(invoiceData.issueDate)) {
        errors.push('Issue date must be in YYYY-MM-DD format');
      }
    }

    if (invoiceData.dueDate) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(invoiceData.dueDate)) {
        errors.push('Due date must be in YYYY-MM-DD format');
      } else if (invoiceData.issueDate && invoiceData.dueDate < invoiceData.issueDate) {
        errors.push('Due date must be after issue date');
      }
    }

    // Status validation
    if (invoiceData.status && !['draft', 'sent', 'paid', 'overdue', 'cancelled'].includes(invoiceData.status)) {
      errors.push('Status must be one of: draft, sent, paid, overdue, cancelled');
    }

    // Currency validation
    if (invoiceData.currency && invoiceData.currency.length !== 3) {
      errors.push('Currency must be a 3-letter code (e.g., USD, EUR)');
    }

    if (errors.length > 0) {
      throw new ValidationError(errors.join(', '));
    }
  }
}

module.exports = InvoiceService;