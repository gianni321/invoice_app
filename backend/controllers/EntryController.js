const EntryService = require('../services/EntryService-enhanced');
const { ValidationError } = require('../lib/errors');

/**
 * Entry Controller - handles HTTP requests and responses
 * Business logic is delegated to EntryService
 */
class EntryController {
  constructor() {
    this.entryService = new EntryService();
  }

  /**
   * Get user entries
   * GET /api/entries
   */
  async getEntries(req, res, next) {
    try {
      const userId = req.user.userId;
      const filters = {
        status: req.query.status,
        project: req.query.project,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        tags: req.query.tags,
        page: parseInt(req.query.page) || 1,
        limit: Math.min(parseInt(req.query.limit) || 50, 100), // Max 100 per page
        sortBy: req.query.sortBy,
        sortOrder: req.query.sortOrder
      };

      const result = await this.entryService.getUserEntries(userId, filters);

      res.json({
        success: true,
        data: result.entries,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get single entry
   * GET /api/entries/:id
   */
  async getEntry(req, res, next) {
    try {
      const entryId = parseInt(req.params.id);
      const userId = req.user.userId;

      if (!entryId || isNaN(entryId)) {
        throw new ValidationError('Invalid entry ID');
      }

      const entry = await this.entryService.getEntry(entryId, userId);

      res.json({
        success: true,
        data: entry
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create new entry
   * POST /api/entries
   */
  async createEntry(req, res, next) {
    try {
      const userId = req.user.userId;
      const entryData = req.body;

      const entry = await this.entryService.createEntry(entryData, userId);

      res.status(201).json({
        success: true,
        data: entry,
        message: 'Entry created successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update entry
   * PUT /api/entries/:id
   */
  async updateEntry(req, res, next) {
    try {
      const entryId = parseInt(req.params.id);
      const userId = req.user.userId;
      const updateData = req.body;

      if (!entryId || isNaN(entryId)) {
        throw new ValidationError('Invalid entry ID');
      }

      const entry = await this.entryService.updateEntry(entryId, updateData, userId);

      res.json({
        success: true,
        data: entry,
        message: 'Entry updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete entry
   * DELETE /api/entries/:id
   */
  async deleteEntry(req, res, next) {
    try {
      const entryId = parseInt(req.params.id);
      const userId = req.user.userId;

      if (!entryId || isNaN(entryId)) {
        throw new ValidationError('Invalid entry ID');
      }

      await this.entryService.deleteEntry(entryId, userId);

      res.json({
        success: true,
        message: 'Entry deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create multiple entries
   * POST /api/entries/batch
   */
  async createBatchEntries(req, res, next) {
    try {
      const userId = req.user.userId;
      const { entries } = req.body;

      if (!Array.isArray(entries) || entries.length === 0) {
        throw new ValidationError('Entries array is required and must not be empty');
      }

      if (entries.length > 100) {
        throw new ValidationError('Cannot create more than 100 entries at once');
      }

      const createdEntries = await this.entryService.createBatchEntries(entries, userId);

      res.status(201).json({
        success: true,
        data: createdEntries,
        message: `${createdEntries.length} entries created successfully`
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update multiple entries
   * PUT /api/entries/batch
   */
  async updateBatchEntries(req, res, next) {
    try {
      const userId = req.user.userId;
      const { entryIds, updateData } = req.body;

      if (!Array.isArray(entryIds) || entryIds.length === 0) {
        throw new ValidationError('Entry IDs array is required');
      }

      if (entryIds.length > 100) {
        throw new ValidationError('Cannot update more than 100 entries at once');
      }

      const updatedCount = await this.entryService.updateBatchEntries(entryIds, updateData, userId);

      res.json({
        success: true,
        data: { updatedCount },
        message: `${updatedCount} entries updated successfully`
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete multiple entries
   * DELETE /api/entries/batch
   */
  async deleteBatchEntries(req, res, next) {
    try {
      const userId = req.user.userId;
      const { entryIds } = req.body;

      if (!Array.isArray(entryIds) || entryIds.length === 0) {
        throw new ValidationError('Entry IDs array is required');
      }

      if (entryIds.length > 100) {
        throw new ValidationError('Cannot delete more than 100 entries at once');
      }

      const deletedCount = await this.entryService.deleteBatchEntries(entryIds, userId);

      res.json({
        success: true,
        data: { deletedCount },
        message: `${deletedCount} entries deleted successfully`
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get time statistics
   * GET /api/entries/stats
   */
  async getTimeStats(req, res, next) {
    try {
      const userId = req.user.userId;
      const filters = {
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        status: req.query.status,
        groupBy: req.query.groupBy
      };

      const stats = await this.entryService.getTimeStats(userId, filters);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get entries available for invoicing
   * GET /api/entries/invoiceable
   */
  async getInvoiceableEntries(req, res, next) {
    try {
      const userId = req.user.userId;
      const filters = {
        project: req.query.project,
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };

      const entries = await this.entryService.getInvoiceableEntries(userId, filters);

      res.json({
        success: true,
        data: entries
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Export entries to CSV
   * GET /api/entries/export
   */
  async exportEntries(req, res, next) {
    try {
      const userId = req.user.userId;
      const filters = {
        status: req.query.status,
        project: req.query.project,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        tags: req.query.tags,
        limit: 10000 // Large limit for export
      };

      const result = await this.entryService.getUserEntries(userId, filters);
      const entries = result.entries;

      // Set CSV headers
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="time-entries.csv"');

      // CSV header
      const csvHeader = 'Date,Description,Hours,Project,Status,Tags,Notes\n';
      res.write(csvHeader);

      // CSV rows
      entries.forEach(entry => {
        const row = [
          entry.date,
          `"${(entry.description || '').replace(/"/g, '""')}"`,
          entry.hours,
          `"${(entry.project || '').replace(/"/g, '""')}"`,
          entry.status,
          `"${(entry.tags || '').replace(/"/g, '""')}"`,
          `"${(entry.notes || '').replace(/"/g, '""')}"`,
        ].join(',') + '\n';
        res.write(row);
      });

      res.end();
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new EntryController();