const express = require('express');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all entries for current user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const entries = await db.query(
      `SELECT e.*, u.name as user_name, u.rate 
       FROM entries e 
       JOIN users u ON e.user_id = u.id 
       WHERE e.user_id = ? 
       ORDER BY e.date DESC`,
      [req.user.id]
    );
    res.json(entries);
  } catch (error) {
    console.error('Error fetching entries:', error);
    res.status(500).json({ error: 'Failed to fetch entries' });
  }
});

// Create new entry
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { hours, task, notes, date } = req.body;

    if (!hours || !task || !date) {
      return res.status(400).json({ error: 'Hours, task, and date are required' });
    }

    if (hours <= 0 || hours > 24) {
      return res.status(400).json({ error: 'Hours must be between 0 and 24' });
    }

    const result = await db.run(
      `INSERT INTO entries (user_id, hours, task, notes, date) 
       VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, hours, task, notes || '', date]
    );

    const entry = await db.get('SELECT * FROM entries WHERE id = ?', [result.id]);
    
    await db.run(
      'INSERT INTO audit_log (user_id, action, details) VALUES (?, ?, ?)',
      [req.user.id, 'ENTRY_CREATED', `Created entry: ${task}`]
    );

    res.status(201).json(entry);
  } catch (error) {
    console.error('Error creating entry:', error);
    res.status(500).json({ error: 'Failed to create entry' });
  }
});

// Update entry
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { hours, task, notes, date } = req.body;

    // Check if entry belongs to user and is not invoiced
    const entry = await db.get(
      'SELECT * FROM entries WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (!entry) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    if (entry.invoice_id) {
      return res.status(400).json({ error: 'Cannot edit invoiced entry' });
    }

    await db.run(
      `UPDATE entries 
       SET hours = ?, task = ?, notes = ?, date = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [hours, task, notes || '', date, id]
    );

    const updated = await db.get('SELECT * FROM entries WHERE id = ?', [id]);
    res.json(updated);
  } catch (error) {
    console.error('Error updating entry:', error);
    res.status(500).json({ error: 'Failed to update entry' });
  }
});

// Delete entry
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const entry = await db.get(
      'SELECT * FROM entries WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (!entry) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    if (entry.invoice_id) {
      return res.status(400).json({ error: 'Cannot delete invoiced entry' });
    }

    await db.run('DELETE FROM entries WHERE id = ?', [id]);
    res.json({ message: 'Entry deleted' });
  } catch (error) {
    console.error('Error deleting entry:', error);
    res.status(500).json({ error: 'Failed to delete entry' });
  }
});

module.exports = router;