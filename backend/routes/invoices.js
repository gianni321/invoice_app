const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// @route   GET api/invoices
// @desc    Get user's invoices
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    // Replace with database query in production
    const invoices = []; // Get from database
    res.json(invoices);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST api/invoices
// @desc    Create an invoice
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const { entryIds } = req.body;
    
    // Validate input
    if (!entryIds || !entryIds.length) {
      return res.status(400).json({ message: 'Please include entries for the invoice' });
    }

    // Create invoice (replace with database operation in production)
    const invoice = {
      id: Date.now(),
      userId: req.user.id,
      userName: req.user.name,
      entryIds,
      status: 'pending',
      date: new Date().toISOString()
    };

    res.json(invoice);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT api/invoices/:id
// @desc    Update invoice status (admin only)
// @access  Private/Admin
router.put('/:id', auth, async (req, res) => {
  try {
    const { status } = req.body;
    
    // Verify admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Update invoice (replace with database operation in production)
    res.json({ message: 'Invoice updated' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;