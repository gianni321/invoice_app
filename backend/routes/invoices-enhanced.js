const express = require('express');
const router = express.Router();
const { InvoiceController } = require('../controllers');
const auth = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

// Rate limiting for invoice operations
const invoiceLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Reasonable limit for invoice operations
  message: {
    success: false,
    error: 'Too many invoice operations, please try again later'
  }
});

// All routes require authentication
router.use(auth);

// Invoice CRUD operations
router.get('/', InvoiceController.getInvoices.bind(InvoiceController));
router.get('/stats', InvoiceController.getInvoiceStats.bind(InvoiceController));
router.get('/overdue', InvoiceController.getOverdueInvoices.bind(InvoiceController));
router.get('/export', InvoiceController.exportInvoices.bind(InvoiceController));
router.get('/:id', InvoiceController.getInvoice.bind(InvoiceController));
router.get('/:id/pdf', InvoiceController.generatePDF.bind(InvoiceController));

router.post('/', invoiceLimiter, InvoiceController.createInvoice.bind(InvoiceController));

router.put('/:id', InvoiceController.updateInvoice.bind(InvoiceController));
router.put('/:id/send', InvoiceController.markAsSent.bind(InvoiceController));
router.put('/:id/pay', InvoiceController.markAsPaid.bind(InvoiceController));
router.put('/:id/cancel', InvoiceController.cancelInvoice.bind(InvoiceController));

router.delete('/:id', InvoiceController.deleteInvoice.bind(InvoiceController));

module.exports = router;