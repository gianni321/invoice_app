const express = require('express');
const router = express.Router();
const { EntryController } = require('../controllers');
const auth = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

// Rate limiting for batch operations
const batchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit batch operations
  message: {
    success: false,
    error: 'Too many batch operations, please try again later'
  }
});

// All routes require authentication
router.use(auth);

// Entry CRUD operations
router.get('/', EntryController.getEntries.bind(EntryController));
router.get('/stats', EntryController.getTimeStats.bind(EntryController));
router.get('/invoiceable', EntryController.getInvoiceableEntries.bind(EntryController));
router.get('/export', EntryController.exportEntries.bind(EntryController));
router.get('/:id', EntryController.getEntry.bind(EntryController));

router.post('/', EntryController.createEntry.bind(EntryController));
router.post('/batch', batchLimiter, EntryController.createBatchEntries.bind(EntryController));

router.put('/:id', EntryController.updateEntry.bind(EntryController));
router.put('/batch', batchLimiter, EntryController.updateBatchEntries.bind(EntryController));

router.delete('/:id', EntryController.deleteEntry.bind(EntryController));
router.delete('/batch', batchLimiter, EntryController.deleteBatchEntries.bind(EntryController));

module.exports = router;