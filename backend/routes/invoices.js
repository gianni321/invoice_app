const express = require('express');
const db = require('../database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get invoices (user sees their own, admin sees all)
router.get('/', authenticateToken, async (req, res) => {
  try {
    let invoices;
    
    if (req.user.role === 'admin') {
      invoices = await db.query(
        `SELECT i.*, u.name as user_name 
         FROM invoices i 
         JOIN users u ON i.user_id = u.id 
         ORDER BY i.created_at DESC`
      );
    } else {
      invoices = await db.query(
        `SELECT i.*, u.name as user_name 
         FROM invoices i 
         JOIN users u ON i.user_id = u.id 
         WHERE i.user_id = ? 
         ORDER BY i.created_at DESC`,
        [req.user.id]
      );
    }

    // Get entries for each invoice
    for (const invoice of invoices) {
      invoice.entries = await db.query(
        'SELECT * FROM entries WHERE invoice_id = ?',
        [invoice.id]
      );
    }

    res.json(invoices);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// Submit invoice
router.post('/submit', authenticateToken, async (req, res) => {
  try {
    // Get all open entries for user
    const entries = await db.query(
      'SELECT * FROM entries WHERE user_id = ? AND invoice_id IS NULL',
      [req.user.id]
    );

    if (entries.length === 0) {
      return res.status(400).json({ error: 'No open entries to invoice' });
    }

    // Get user rate
    const user = await db.get('SELECT rate FROM users WHERE id = ?', [req.user.id]);
    
    // Calculate total
    const total = entries.reduce((sum, e) => sum + (e.hours * user.rate), 0);

    // Create invoice
    const result = await db.run(
      'INSERT INTO invoices (user_id, total, status) VALUES (?, ?, ?)',
      [req.user.id, total, 'pending']
    );

    // Update entries with invoice_id
    for (const entry of entries) {
      await db.run(
        'UPDATE entries SET invoice_id = ? WHERE id = ?',
        [result.id, entry.id]
      );
    }

    await db.run(
      'INSERT INTO audit_log (user_id, action, details) VALUES (?, ?, ?)',
      [req.user.id, 'INVOICE_SUBMITTED', `Invoice ${result.id} submitted`]
    );

    const invoice = await db.get('SELECT * FROM invoices WHERE id = ?', [result.id]);
    invoice.entries = entries;

    res.status(201).json(invoice);
  } catch (error) {
    console.error('Error submitting invoice:', error);
    res.status(500).json({ error: 'Failed to submit invoice' });
  }
});

// Approve invoice (admin only)
router.put('/:id/approve', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    await db.run(
      'UPDATE invoices SET status = ?, approved_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['approved', id]
    );

    await db.run(
      'INSERT INTO audit_log (user_id, action, details) VALUES (?, ?, ?)',
      [req.user.id, 'INVOICE_APPROVED', `Invoice ${id} approved`]
    );

    const invoice = await db.get('SELECT * FROM invoices WHERE id = ?', [id]);
    res.json(invoice);
  } catch (error) {
    console.error('Error approving invoice:', error);
    res.status(500).json({ error: 'Failed to approve invoice' });
  }
});

// Mark as paid (admin only)
router.put('/:id/paid', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    await db.run(
      'UPDATE invoices SET status = ?, paid_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['paid', id]
    );

    await db.run(
      'INSERT INTO audit_log (user_id, action, details) VALUES (?, ?, ?)',
      [req.user.id, 'INVOICE_PAID', `Invoice ${id} marked as paid`]
    );

    const invoice = await db.get('SELECT * FROM invoices WHERE id = ?', [id]);
    res.json(invoice);
  } catch (error) {
    console.error('Error marking invoice as paid:', error);
    res.status(500).json({ error: 'Failed to mark invoice as paid' });
  }
});

module.exports = router;