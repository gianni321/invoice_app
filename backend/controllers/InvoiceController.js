const InvoiceService = require('../services/InvoiceService-enhanced');
const { ValidationError } = require('../lib/errors');

/**
 * Invoice Controller - handles HTTP requests and responses
 * Business logic is delegated to InvoiceService
 */
class InvoiceController {
  constructor() {
    this.invoiceService = new InvoiceService();
  }

  /**
   * Get user invoices
   * GET /api/invoices
   */
  async getInvoices(req, res, next) {
    try {
      const userId = req.user.userId;
      const filters = {
        status: req.query.status,
        client: req.query.client,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        page: parseInt(req.query.page) || 1,
        limit: Math.min(parseInt(req.query.limit) || 20, 50), // Max 50 per page
        sortBy: req.query.sortBy,
        sortOrder: req.query.sortOrder
      };

      const result = await this.invoiceService.getUserInvoices(userId, filters);

      res.json({
        success: true,
        data: result.invoices,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get single invoice
   * GET /api/invoices/:id
   */
  async getInvoice(req, res, next) {
    try {
      const invoiceId = parseInt(req.params.id);
      const userId = req.user.userId;

      if (!invoiceId || isNaN(invoiceId)) {
        throw new ValidationError('Invalid invoice ID');
      }

      const invoice = await this.invoiceService.getInvoice(invoiceId, userId);

      res.json({
        success: true,
        data: invoice
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create new invoice
   * POST /api/invoices
   */
  async createInvoice(req, res, next) {
    try {
      const userId = req.user.userId;
      const { invoiceData, entryIds } = req.body;

      if (!invoiceData || !entryIds) {
        throw new ValidationError('Invoice data and entry IDs are required');
      }

      const invoice = await this.invoiceService.createInvoice(invoiceData, entryIds, userId);

      res.status(201).json({
        success: true,
        data: invoice,
        message: 'Invoice created successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update invoice
   * PUT /api/invoices/:id
   */
  async updateInvoice(req, res, next) {
    try {
      const invoiceId = parseInt(req.params.id);
      const userId = req.user.userId;
      const updateData = req.body;

      if (!invoiceId || isNaN(invoiceId)) {
        throw new ValidationError('Invalid invoice ID');
      }

      const invoice = await this.invoiceService.updateInvoice(invoiceId, updateData, userId);

      res.json({
        success: true,
        data: invoice,
        message: 'Invoice updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete invoice
   * DELETE /api/invoices/:id
   */
  async deleteInvoice(req, res, next) {
    try {
      const invoiceId = parseInt(req.params.id);
      const userId = req.user.userId;

      if (!invoiceId || isNaN(invoiceId)) {
        throw new ValidationError('Invalid invoice ID');
      }

      await this.invoiceService.deleteInvoice(invoiceId, userId);

      res.json({
        success: true,
        message: 'Invoice deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark invoice as sent
   * PUT /api/invoices/:id/send
   */
  async markAsSent(req, res, next) {
    try {
      const invoiceId = parseInt(req.params.id);
      const userId = req.user.userId;

      if (!invoiceId || isNaN(invoiceId)) {
        throw new ValidationError('Invalid invoice ID');
      }

      const invoice = await this.invoiceService.markAsSent(invoiceId, userId);

      res.json({
        success: true,
        data: invoice,
        message: 'Invoice marked as sent'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark invoice as paid
   * PUT /api/invoices/:id/pay
   */
  async markAsPaid(req, res, next) {
    try {
      const invoiceId = parseInt(req.params.id);
      const userId = req.user.userId;
      const paymentData = req.body;

      if (!invoiceId || isNaN(invoiceId)) {
        throw new ValidationError('Invalid invoice ID');
      }

      const invoice = await this.invoiceService.markAsPaid(invoiceId, paymentData, userId);

      res.json({
        success: true,
        data: invoice,
        message: 'Invoice marked as paid'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancel invoice
   * PUT /api/invoices/:id/cancel
   */
  async cancelInvoice(req, res, next) {
    try {
      const invoiceId = parseInt(req.params.id);
      const userId = req.user.userId;

      if (!invoiceId || isNaN(invoiceId)) {
        throw new ValidationError('Invalid invoice ID');
      }

      const invoice = await this.invoiceService.cancelInvoice(invoiceId, userId);

      res.json({
        success: true,
        data: invoice,
        message: 'Invoice cancelled successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get overdue invoices
   * GET /api/invoices/overdue
   */
  async getOverdueInvoices(req, res, next) {
    try {
      const userId = req.user.userId;

      const invoices = await this.invoiceService.getOverdueInvoices(userId);

      res.json({
        success: true,
        data: invoices
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get invoice statistics
   * GET /api/invoices/stats
   */
  async getInvoiceStats(req, res, next) {
    try {
      const userId = req.user.userId;
      const filters = {
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };

      const stats = await this.invoiceService.getInvoiceStats(userId, filters);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate invoice PDF
   * GET /api/invoices/:id/pdf
   */
  async generatePDF(req, res, next) {
    try {
      const invoiceId = parseInt(req.params.id);
      const userId = req.user.userId;

      if (!invoiceId || isNaN(invoiceId)) {
        throw new ValidationError('Invalid invoice ID');
      }

      const invoice = await this.invoiceService.getInvoice(invoiceId, userId);

      // TODO: Implement PDF generation logic
      // For now, return invoice data that can be used by frontend for PDF generation
      res.json({
        success: true,
        data: {
          invoice,
          pdfUrl: `/api/invoices/${invoiceId}/pdf/download` // Future endpoint
        },
        message: 'PDF generation initiated'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Export invoices to CSV
   * GET /api/invoices/export
   */
  async exportInvoices(req, res, next) {
    try {
      const userId = req.user.userId;
      const filters = {
        status: req.query.status,
        client: req.query.client,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        limit: 10000 // Large limit for export
      };

      const result = await this.invoiceService.getUserInvoices(userId, filters);
      const invoices = result.invoices;

      // Set CSV headers
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="invoices.csv"');

      // CSV header
      const csvHeader = 'Invoice Number,Client Name,Issue Date,Due Date,Total Amount,Status,Paid Date\n';
      res.write(csvHeader);

      // CSV rows
      invoices.forEach(invoice => {
        const row = [
          `"${invoice.invoice_number}"`,
          `"${(invoice.client_name || '').replace(/"/g, '""')}"`,
          invoice.issue_date,
          invoice.due_date || '',
          invoice.total_amount,
          invoice.status,
          invoice.paid_date || ''
        ].join(',') + '\n';
        res.write(row);
      });

      res.end();
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new InvoiceController();