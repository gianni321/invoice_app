const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// @route   GET api/entries
// @desc    Get user's time entries
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    // Replace with database query in production
    const entries = []; // Get from database
    res.json(entries);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST api/entries
// @desc    Create a time entry
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const { hours, task, notes, date } = req.body;
    
    // Validate input
    if (!hours || !task || !date) {
      return res.status(400).json({ message: 'Please include all required fields' });
    }

    // Create entry (replace with database operation in production)
    const entry = {
      id: Date.now(),
      userId: req.user.id,
      userName: req.user.name,
      hours: Number(hours),
      task,
      notes,
      date: new Date(date).toISOString(),
      rate: req.user.rate,
      invoiceId: null
    };

    res.json(entry);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT api/entries/:id
// @desc    Update a time entry
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const { hours, task, notes } = req.body;
    
    // Update entry (replace with database operation in production)
    res.json({ message: 'Entry updated' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE api/entries/:id
// @desc    Delete a time entry
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    // Delete entry (replace with database operation in production)
    res.json({ message: 'Entry deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;