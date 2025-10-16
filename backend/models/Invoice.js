const BaseModel = require('./BaseModel');

class Invoice extends BaseModel {
  static get tableName() {
    return 'invoices';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['user_id', 'client_name', 'total_amount'],
      properties: {
        id: { type: 'integer' },
        user_id: { type: 'integer' },
        invoice_number: { 
          type: 'string', 
          maxLength: 50 
        },
        client_name: { 
          type: 'string', 
          minLength: 1,
          maxLength: 255 
        },
        client_email: { 
          type: ['string', 'null'], 
          format: 'email',
          maxLength: 255 
        },
        client_address: { 
          type: ['string', 'null'], 
          maxLength: 500 
        },
        total_amount: { 
          type: 'number',
          minimum: 0 
        },
        currency: {
          type: 'string',
          default: 'USD',
          maxLength: 3
        },
        status: {
          type: 'string',
          enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'],
          default: 'draft'
        },
        issue_date: { 
          type: 'string', 
          format: 'date' 
        },
        due_date: { 
          type: ['string', 'null'], 
          format: 'date' 
        },
        paid_date: { 
          type: ['string', 'null'], 
          format: 'date' 
        },
        payment_method: {
          type: ['string', 'null'],
          maxLength: 100
        },
        notes: {
          type: ['string', 'null'],
          maxLength: 2000
        },
        tax_rate: {
          type: ['number', 'null'],
          minimum: 0,
          maximum: 100
        },
        tax_amount: {
          type: ['number', 'null'],
          minimum: 0
        },
        subtotal: {
          type: ['number', 'null'],
          minimum: 0
        },
        file_path: {
          type: ['string', 'null'],
          maxLength: 500
        },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' }
      }
    };
  }

  static get relationMappings() {
    const User = require('./User');
    const Entry = require('./Entry');

    return {
      user: {
        relation: BaseModel.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'invoices.user_id',
          to: 'users.id'
        }
      },
      entries: {
        relation: BaseModel.HasManyRelation,
        modelClass: Entry,
        join: {
          from: 'invoices.id',
          to: 'entries.invoice_id'
        }
      }
    };
  }

  // Default values and calculations
  $beforeInsert(queryContext) {
    super.$beforeInsert(queryContext);
    
    if (!this.issue_date) {
      this.issue_date = new Date().toISOString().split('T')[0];
    }
    
    if (!this.status) {
      this.status = 'draft';
    }

    if (!this.currency) {
      this.currency = 'USD';
    }

    // Generate invoice number if not provided
    if (!this.invoice_number) {
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      this.invoice_number = `INV-${year}${month}-${random}`;
    }
  }

  // Calculate totals
  calculateTotals() {
    const subtotal = this.subtotal || 0;
    const taxRate = this.tax_rate || 0;
    const taxAmount = subtotal * (taxRate / 100);
    const totalAmount = subtotal + taxAmount;

    return {
      subtotal,
      taxRate,
      taxAmount,
      totalAmount
    };
  }

  // Instance methods
  async markAsSent() {
    return this.$query().patch({
      status: 'sent',
      sent_date: new Date().toISOString()
    });
  }

  async markAsPaid(paymentMethod = null, paidDate = null) {
    const updateData = {
      status: 'paid',
      paid_date: paidDate || new Date().toISOString().split('T')[0]
    };

    if (paymentMethod) {
      updateData.payment_method = paymentMethod;
    }

    // Also mark associated entries as paid
    await this.$relatedQuery('entries').patch({ status: 'paid' });

    return this.$query().patch(updateData);
  }

  async markAsOverdue() {
    return this.$query().patch({
      status: 'overdue'
    });
  }

  async cancel() {
    // Revert entries back to open status
    await this.$relatedQuery('entries').patch({ 
      status: 'open',
      invoice_id: null 
    });

    return this.$query().patch({
      status: 'cancelled'
    });
  }

  isOverdue() {
    if (!this.due_date || this.status === 'paid' || this.status === 'cancelled') {
      return false;
    }

    const dueDate = new Date(this.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return dueDate < today;
  }

  getDaysOverdue() {
    if (!this.isOverdue()) return 0;
    
    const dueDate = new Date(this.due_date);
    const today = new Date();
    const diffTime = today - dueDate;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  }

  // Static methods
  static findByUser(userId, filters = {}) {
    let query = this.query()
      .where('user_id', userId)
      .orderBy('created_at', 'desc');

    if (filters.status) {
      query = query.where('status', filters.status);
    }

    if (filters.client) {
      query = query.where('client_name', 'like', `%${filters.client}%`);
    }

    if (filters.startDate) {
      query = query.where('issue_date', '>=', filters.startDate);
    }

    if (filters.endDate) {
      query = query.where('issue_date', '<=', filters.endDate);
    }

    if (filters.page && filters.limit) {
      const offset = (filters.page - 1) * filters.limit;
      query = query.offset(offset).limit(filters.limit);
    }

    return query;
  }

  static async findOverdueInvoices() {
    const today = new Date().toISOString().split('T')[0];
    
    return this.query()
      .where('status', 'sent')
      .where('due_date', '<', today);
  }

  static async getRevenueStats(userId, filters = {}) {
    let query = this.query()
      .where('user_id', userId)
      .where('status', 'paid');

    if (filters.startDate) {
      query = query.where('paid_date', '>=', filters.startDate);
    }

    if (filters.endDate) {
      query = query.where('paid_date', '<=', filters.endDate);
    }

    const result = await query
      .sum('total_amount as totalRevenue')
      .count('* as invoiceCount')
      .first();

    return {
      totalRevenue: parseFloat(result.totalRevenue) || 0,
      invoiceCount: parseInt(result.invoiceCount) || 0
    };
  }

  static async getClientStats(userId) {
    return this.query()
      .where('user_id', userId)
      .groupBy('client_name')
      .select('client_name')
      .sum('total_amount as totalAmount')
      .count('* as invoiceCount')
      .orderBy('totalAmount', 'desc');
  }

  static async createWithEntries(invoiceData, entryIds, userId) {
    const { Entry } = require('../models');
    
    // Start transaction
    return this.transaction(async (trx) => {
      // Create invoice
      const invoice = await this.query(trx).insert({
        ...invoiceData,
        user_id: userId
      });

      // Update entries
      await Entry.query(trx)
        .whereIn('id', entryIds)
        .where('user_id', userId)
        .where('status', 'open')
        .patch({
          status: 'invoiced',
          invoice_id: invoice.id
        });

      // Return invoice with entries
      return invoice.$loadRelated('entries', { transaction: trx });
    });
  }

  static async getNextInvoiceNumber(userId) {
    const lastInvoice = await this.query()
      .where('user_id', userId)
      .orderBy('invoice_number', 'desc')
      .first();

    if (!lastInvoice) {
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      return `INV-${year}${month}-001`;
    }

    // Extract number and increment
    const match = lastInvoice.invoice_number.match(/INV-(\d{6})-(\d{3})/);
    if (match) {
      const [, datePrefix, number] = match;
      const nextNumber = String(parseInt(number) + 1).padStart(3, '0');
      return `INV-${datePrefix}-${nextNumber}`;
    }

    // Fallback
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `INV-${year}${month}-001`;
  }
}

module.exports = Invoice;