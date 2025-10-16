const BaseModel = require('./BaseModel');

class Entry extends BaseModel {
  static get tableName() {
    return 'entries';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['description', 'hours', 'user_id'],
      properties: {
        id: { type: 'integer' },
        user_id: { type: 'integer' },
        description: { 
          type: 'string', 
          minLength: 1,
          maxLength: 1000 
        },
        hours: { 
          type: 'number',
          minimum: 0.1,
          maximum: 24
        },
        project: { 
          type: ['string', 'null'], 
          maxLength: 255 
        },
        rate: {
          type: ['number', 'null'],
          minimum: 0
        },
        date: { 
          type: 'string', 
          format: 'date' 
        },
        status: {
          type: 'string',
          enum: ['open', 'invoiced', 'paid'],
          default: 'open'
        },
        invoice_id: {
          type: ['integer', 'null']
        },
        tags: {
          type: ['string', 'null'],
          maxLength: 500
        },
        notes: {
          type: ['string', 'null'],
          maxLength: 2000
        },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' }
      }
    };
  }

  static get relationMappings() {
    const User = require('./User');
    const Invoice = require('./Invoice');

    return {
      user: {
        relation: BaseModel.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'entries.user_id',
          to: 'users.id'
        }
      },
      invoice: {
        relation: BaseModel.BelongsToOneRelation,
        modelClass: Invoice,
        join: {
          from: 'entries.invoice_id',
          to: 'invoices.id'
        }
      }
    };
  }

  // Default values
  $beforeInsert(queryContext) {
    super.$beforeInsert(queryContext);
    
    if (!this.date) {
      this.date = new Date().toISOString().split('T')[0];
    }
    
    if (!this.status) {
      this.status = 'open';
    }
  }

  // Instance methods
  calculateAmount(hourlyRate = null) {
    const rate = this.rate || hourlyRate;
    return rate ? this.hours * rate : 0;
  }

  canBeInvoiced() {
    return this.status === 'open';
  }

  markAsInvoiced(invoiceId) {
    return this.$query().patch({
      status: 'invoiced',
      invoice_id: invoiceId
    });
  }

  markAsPaid() {
    return this.$query().patch({
      status: 'paid'
    });
  }

  // Static query methods
  static findByUser(userId, filters = {}) {
    let query = this.query()
      .where('user_id', userId)
      .orderBy('date', 'desc');

    // Apply filters
    if (filters.status) {
      query = query.where('status', filters.status);
    }

    if (filters.project) {
      query = query.where('project', 'like', `%${filters.project}%`);
    }

    if (filters.startDate) {
      query = query.where('date', '>=', filters.startDate);
    }

    if (filters.endDate) {
      query = query.where('date', '<=', filters.endDate);
    }

    if (filters.tags) {
      query = query.where('tags', 'like', `%${filters.tags}%`);
    }

    // Pagination
    if (filters.page && filters.limit) {
      const offset = (filters.page - 1) * filters.limit;
      query = query.offset(offset).limit(filters.limit);
    }

    return query;
  }

  static async getTotalHours(userId, filters = {}) {
    let query = this.query()
      .where('user_id', userId)
      .sum('hours as totalHours');

    if (filters.status) {
      query = query.where('status', filters.status);
    }

    if (filters.startDate) {
      query = query.where('date', '>=', filters.startDate);
    }

    if (filters.endDate) {
      query = query.where('date', '<=', filters.endDate);
    }

    const result = await query.first();
    return parseFloat(result.totalHours) || 0;
  }

  static async getProjectStats(userId, filters = {}) {
    let query = this.query()
      .where('user_id', userId)
      .groupBy('project')
      .select('project')
      .sum('hours as totalHours')
      .count('* as entryCount')
      .orderBy('totalHours', 'desc');

    if (filters.startDate) {
      query = query.where('date', '>=', filters.startDate);
    }

    if (filters.endDate) {
      query = query.where('date', '<=', filters.endDate);
    }

    return query;
  }

  static async findInvoiceable(userId, filters = {}) {
    return this.findByUser(userId, {
      ...filters,
      status: 'open'
    });
  }

  static async createBatch(entries, userId) {
    const entriesWithUser = entries.map(entry => ({
      ...entry,
      user_id: userId
    }));

    return this.query().insert(entriesWithUser);
  }

  static async updateBatch(entryIds, updates, userId) {
    return this.query()
      .whereIn('id', entryIds)
      .where('user_id', userId)
      .patch(updates);
  }

  static async deleteBatch(entryIds, userId) {
    return this.query()
      .whereIn('id', entryIds)
      .where('user_id', userId)
      .delete();
  }
}

module.exports = Entry;