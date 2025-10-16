const { Entry, User, Invoice } = require('../models');
const { ValidationError, NotFoundError, UnauthorizedError } = require('../lib/errors');

/**
 * Enhanced Entry Service using Objection.js models
 * Handles all business logic for time entries
 */
class EntryService {
  /**
   * Create a new time entry
   * @param {Object} entryData - Entry data
   * @param {number} userId - User ID
   * @returns {Promise<Entry>}
   */
  async createEntry(entryData, userId) {
    this.validateEntryData(entryData);
    
    const entry = await Entry.query().insert({
      ...entryData,
      user_id: userId
    });

    return entry;
  }

  /**
   * Get entries for a user with filters and pagination
   * @param {number} userId 
   * @param {Object} filters 
   * @returns {Promise<{entries: Entry[], pagination: Object}>}
   */
  async getUserEntries(userId, filters = {}) {
    const {
      status,
      project,
      startDate,
      endDate,
      tags,
      page = 1,
      limit = 50,
      sortBy = 'date',
      sortOrder = 'desc'
    } = filters;

    let query = Entry.query()
      .where('user_id', userId)
      .withGraphFetched('invoice(selectBasic)')
      .modifiers({
        selectBasic(builder) {
          builder.select('id', 'invoice_number', 'status', 'client_name');
        }
      });

    // Apply filters
    if (status) {
      query = query.where('status', status);
    }

    if (project) {
      query = query.where('project', 'like', `%${project}%`);
    }

    if (startDate) {
      query = query.where('date', '>=', startDate);
    }

    if (endDate) {
      query = query.where('date', '<=', endDate);
    }

    if (tags) {
      query = query.where('tags', 'like', `%${tags}%`);
    }

    // Apply sorting
    const validSortFields = ['date', 'hours', 'project', 'created_at'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'date';
    const order = ['asc', 'desc'].includes(sortOrder) ? sortOrder : 'desc';
    
    query = query.orderBy(sortField, order);

    // Apply pagination
    const offset = (page - 1) * limit;
    const results = await query
      .offset(offset)
      .limit(limit);

    // Get total count for pagination
    const totalQuery = Entry.query()
      .where('user_id', userId)
      .count('* as total');
    
    // Apply same filters to count query
    if (status) totalQuery.where('status', status);
    if (project) totalQuery.where('project', 'like', `%${project}%`);
    if (startDate) totalQuery.where('date', '>=', startDate);
    if (endDate) totalQuery.where('date', '<=', endDate);
    if (tags) totalQuery.where('tags', 'like', `%${tags}%`);

    const [{ total }] = await totalQuery;
    const totalPages = Math.ceil(total / limit);

    return {
      entries: results,
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
   * Get a single entry by ID
   * @param {number} entryId 
   * @param {number} userId 
   * @returns {Promise<Entry>}
   */
  async getEntry(entryId, userId) {
    const entry = await Entry.query()
      .findById(entryId)
      .where('user_id', userId)
      .withGraphFetched('invoice(selectBasic)')
      .modifiers({
        selectBasic(builder) {
          builder.select('id', 'invoice_number', 'status', 'client_name');
        }
      });

    if (!entry) {
      throw new NotFoundError('Entry not found');
    }

    return entry;
  }

  /**
   * Update an entry
   * @param {number} entryId 
   * @param {Object} updateData 
   * @param {number} userId 
   * @returns {Promise<Entry>}
   */
  async updateEntry(entryId, updateData, userId) {
    const entry = await Entry.query()
      .findById(entryId)
      .where('user_id', userId);

    if (!entry) {
      throw new NotFoundError('Entry not found');
    }

    // Prevent updating invoiced entries
    if (entry.status === 'invoiced' && updateData.status !== 'open') {
      throw new ValidationError('Cannot modify invoiced entries');
    }

    this.validateEntryData(updateData, true);

    const updatedEntry = await entry.$query().patchAndFetch(updateData);
    return updatedEntry;
  }

  /**
   * Delete an entry
   * @param {number} entryId 
   * @param {number} userId 
   * @returns {Promise<boolean>}
   */
  async deleteEntry(entryId, userId) {
    const entry = await Entry.query()
      .findById(entryId)
      .where('user_id', userId);

    if (!entry) {
      throw new NotFoundError('Entry not found');
    }

    // Prevent deleting invoiced entries
    if (entry.status === 'invoiced') {
      throw new ValidationError('Cannot delete invoiced entries');
    }

    await entry.$query().delete();
    return true;
  }

  /**
   * Create multiple entries in a batch
   * @param {Array} entriesData 
   * @param {number} userId 
   * @returns {Promise<Array<Entry>>}
   */
  async createBatchEntries(entriesData, userId) {
    // Validate all entries
    entriesData.forEach(entryData => this.validateEntryData(entryData));

    const entriesWithUser = entriesData.map(entry => ({
      ...entry,
      user_id: userId
    }));

    const entries = await Entry.query().insert(entriesWithUser);
    return entries;
  }

  /**
   * Update multiple entries
   * @param {Array} entryIds 
   * @param {Object} updateData 
   * @param {number} userId 
   * @returns {Promise<number>}
   */
  async updateBatchEntries(entryIds, updateData, userId) {
    // Validate update data
    this.validateEntryData(updateData, true);

    const updatedCount = await Entry.query()
      .whereIn('id', entryIds)
      .where('user_id', userId)
      .where('status', '!=', 'invoiced') // Prevent updating invoiced entries
      .patch(updateData);

    return updatedCount;
  }

  /**
   * Delete multiple entries
   * @param {Array} entryIds 
   * @param {number} userId 
   * @returns {Promise<number>}
   */
  async deleteBatchEntries(entryIds, userId) {
    const deletedCount = await Entry.query()
      .whereIn('id', entryIds)
      .where('user_id', userId)
      .where('status', '!=', 'invoiced') // Prevent deleting invoiced entries
      .delete();

    return deletedCount;
  }

  /**
   * Get time statistics for a user
   * @param {number} userId 
   * @param {Object} filters 
   * @returns {Promise<Object>}
   */
  async getTimeStats(userId, filters = {}) {
    const { startDate, endDate, status, groupBy } = filters;

    let baseQuery = Entry.query().where('user_id', userId);

    if (startDate) baseQuery = baseQuery.where('date', '>=', startDate);
    if (endDate) baseQuery = baseQuery.where('date', '<=', endDate);
    if (status) baseQuery = baseQuery.where('status', status);

    // Total hours
    const totalResult = await baseQuery.clone().sum('hours as totalHours').first();
    const totalHours = parseFloat(totalResult.totalHours) || 0;

    // Count of entries
    const countResult = await baseQuery.clone().count('* as totalEntries').first();
    const totalEntries = parseInt(countResult.totalEntries) || 0;

    const stats = {
      totalHours,
      totalEntries,
      averageHoursPerEntry: totalEntries > 0 ? totalHours / totalEntries : 0
    };

    // Group by project
    if (groupBy === 'project' || !groupBy) {
      const projectStats = await baseQuery.clone()
        .groupBy('project')
        .select('project')
        .sum('hours as totalHours')
        .count('* as entryCount')
        .orderBy('totalHours', 'desc');

      stats.byProject = projectStats.reduce((acc, stat) => {
        acc[stat.project || 'No Project'] = {
          hours: parseFloat(stat.totalHours),
          entries: parseInt(stat.entryCount)
        };
        return acc;
      }, {});
    }

    // Group by date
    if (groupBy === 'date') {
      const dateStats = await baseQuery.clone()
        .groupBy('date')
        .select('date')
        .sum('hours as totalHours')
        .count('* as entryCount')
        .orderBy('date', 'asc');

      stats.byDate = dateStats.reduce((acc, stat) => {
        acc[stat.date] = {
          hours: parseFloat(stat.totalHours),
          entries: parseInt(stat.entryCount)
        };
        return acc;
      }, {});
    }

    // Group by status
    if (groupBy === 'status') {
      const statusStats = await baseQuery.clone()
        .groupBy('status')
        .select('status')
        .sum('hours as totalHours')
        .count('* as entryCount');

      stats.byStatus = statusStats.reduce((acc, stat) => {
        acc[stat.status] = {
          hours: parseFloat(stat.totalHours),
          entries: parseInt(stat.entryCount)
        };
        return acc;
      }, {});
    }

    return stats;
  }

  /**
   * Get entries available for invoicing
   * @param {number} userId 
   * @param {Object} filters 
   * @returns {Promise<Array<Entry>>}
   */
  async getInvoiceableEntries(userId, filters = {}) {
    const { project, startDate, endDate } = filters;

    let query = Entry.query()
      .where('user_id', userId)
      .where('status', 'open')
      .orderBy('date', 'asc');

    if (project) {
      query = query.where('project', project);
    }

    if (startDate) {
      query = query.where('date', '>=', startDate);
    }

    if (endDate) {
      query = query.where('date', '<=', endDate);
    }

    return query;
  }

  /**
   * Mark entries as invoiced
   * @param {Array} entryIds 
   * @param {number} invoiceId 
   * @param {number} userId 
   * @returns {Promise<number>}
   */
  async markAsInvoiced(entryIds, invoiceId, userId) {
    const updatedCount = await Entry.query()
      .whereIn('id', entryIds)
      .where('user_id', userId)
      .where('status', 'open')
      .patch({
        status: 'invoiced',
        invoice_id: invoiceId
      });

    return updatedCount;
  }

  /**
   * Validate entry data
   * @private
   * @param {Object} entryData 
   * @param {boolean} isUpdate 
   */
  validateEntryData(entryData, isUpdate = false) {
    const errors = [];

    if (!isUpdate || entryData.description !== undefined) {
      if (!entryData.description || entryData.description.trim().length === 0) {
        errors.push('Description is required');
      } else if (entryData.description.length > 1000) {
        errors.push('Description must be 1000 characters or less');
      }
    }

    if (!isUpdate || entryData.hours !== undefined) {
      if (entryData.hours === undefined || entryData.hours === null) {
        errors.push('Hours is required');
      } else if (typeof entryData.hours !== 'number' || isNaN(entryData.hours)) {
        errors.push('Hours must be a valid number');
      } else if (entryData.hours <= 0) {
        errors.push('Hours must be greater than 0');
      } else if (entryData.hours > 24) {
        errors.push('Hours cannot exceed 24 per entry');
      }
    }

    if (entryData.project && entryData.project.length > 255) {
      errors.push('Project name must be 255 characters or less');
    }

    if (entryData.rate !== undefined && entryData.rate !== null) {
      if (typeof entryData.rate !== 'number' || entryData.rate < 0) {
        errors.push('Rate must be a positive number');
      }
    }

    if (entryData.date) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(entryData.date)) {
        errors.push('Date must be in YYYY-MM-DD format');
      } else {
        const date = new Date(entryData.date);
        if (isNaN(date.getTime())) {
          errors.push('Invalid date');
        }
      }
    }

    if (entryData.status && !['open', 'invoiced', 'paid'].includes(entryData.status)) {
      errors.push('Status must be one of: open, invoiced, paid');
    }

    if (entryData.tags && entryData.tags.length > 500) {
      errors.push('Tags must be 500 characters or less');
    }

    if (entryData.notes && entryData.notes.length > 2000) {
      errors.push('Notes must be 2000 characters or less');
    }

    if (errors.length > 0) {
      throw new ValidationError(errors.join(', '));
    }
  }
}

module.exports = EntryService;