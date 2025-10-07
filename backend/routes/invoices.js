const express = require('express');
const db = require('../database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { getInvoiceSettings } = require('../lib/settings');
const { getDueDatetimes, periodBounds, statusFor, currentPeriod, dueForPeriod, ZONE } = require('../lib/deadlines');
const { notifyAdminsOnSubmit, notifyUserOnPaid } = require('../lib/invoiceNotify');
const { fmtCurrency } = require('../lib/format');

const router = express.Router();

// Get deadline status
router.get('/deadline-status', authenticateToken, async (req, res) => {
  try {
    const s = await getInvoiceSettings();
    const now = require('luxon').DateTime.now().setZone(ZONE);
    
    // Get current work week period (Mon 12:01 AM → Sun 11:59 PM)
    const period = currentPeriod(now);
    const due = dueForPeriod(period.end); // Tuesday 11:59 PM after Sunday
    
    const period_start = period.start.toISO();
    const period_end = period.end.toISO();

    // For members, only return their own status; for admins, return all users
    const users = req.user.role === 'admin' 
      ? await db.query('SELECT id, name FROM users')
      : [{ id: req.user.id, name: req.user.name }];
    
    const statuses = [];

    for (const u of users) {
      // Check if user has submitted invoice for current period
      const inv = await db.get(
        `SELECT id FROM invoices 
         WHERE user_id=? AND period_start=? AND period_end=? LIMIT 1`,
        [u.id, period_start, period_end]
      );
      
      const submitted = !!inv;
      const st = submitted ? 'ok' : statusFor(now, due, s.warnWindowHours);
      let message = null;

      // Only show warning messages if no invoice submitted for this period
      if (!submitted) {
        if (st === 'approaching') {
          message = `Invoice due ${due.setZone(ZONE).toFormat("ccc, LLL d @ hh:mm a z")}. Please submit.`;
        } else if (st === 'late') {
          message = `Invoice is late (due ${due.setZone(ZONE).toFormat("ccc, LLL d @ hh:mm a z")}). Payment may be delayed.`;
        }
      }

      statuses.push({
        userId: u.id,
        userName: u.name,
        submitted,
        status: st,
        deadline_iso: due.toUTC().toISO(),
        deadline_local: due.setZone(ZONE).toISO(),
        period_start,
        period_end,
        message
      });
    }

    res.json({ 
      zone: ZONE, 
      warnWindowHours: s.warnWindowHours, 
      statuses,
      currentPeriod: {
        start: period_start,
        end: period_end,
        due: due.toISO()
      }
    });
  } catch (error) {
    console.error('Error getting deadline status:', error);
    res.status(500).json({ error: 'Failed to get deadline status' });
  }
});

// Get invoices (user sees their own, admin sees all)
router.get('/', authenticateToken, async (req, res) => {
  try {
    let invoices;
    
    if (req.user.role === 'admin') {
      invoices = await db.query(
        `SELECT i.*, u.name as user_name, i.user_id as userId
         FROM invoices i 
         JOIN users u ON i.user_id = u.id 
         ORDER BY i.created_at DESC`
      );
    } else {
      invoices = await db.query(
        `SELECT i.*, u.name as user_name, i.user_id as userId
         FROM invoices i 
         JOIN users u ON i.user_id = u.id 
         WHERE i.user_id = ? 
         ORDER BY i.created_at DESC`,
        [req.user.id]
      );
    }

    // Helper function for safe number conversion
    const num = x => typeof x === 'number' ? x : parseFloat(String(x));

    // Get entries for each invoice and compute amounts
    for (const invoice of invoices) {
      const entries = await db.query(
        'SELECT * FROM entries WHERE invoice_id = ?',
        [invoice.id]
      );
      
      // Get user info for this invoice
      const user = await db.get('SELECT * FROM users WHERE id = ?', [invoice.user_id]);
      
      // Process entries to ensure they have computed amounts
      invoice.entries = entries.map(e => {
        const hours = num(e.hours);
        const rate = Number.isFinite(e.rate) ? e.rate : (user?.rate || 0);
        const amount = Math.round(hours * rate * 100) / 100;
        
        return {
          ...e,
          hours,
          rate,
          amount: Number.isFinite(amount) ? amount : 0
        };
      });
      
      // Add structured user data and date formatting
      invoice.user = {
        id: user?.id || invoice.user_id,
        name: user?.name || invoice.user_name,
        rate: user?.rate || 0
      };
      
      // Format date as ISO YYYY-MM-DD
      invoice.date = invoice.created_at ? invoice.created_at.split('T')[0] : null;
      
      // Add legacy compatibility fields
      invoice.userName = invoice.user_name;
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
    // Get current period bounds first
    const s = await getInvoiceSettings();
    const { last, next } = getDueDatetimes({
      weekday: s.weekday,
      hour: s.hour,
      minute: s.minute,
      zone: s.zone
    });
    const { period_start, period_end } = periodBounds({ lastDue: last, nextDue: next });

    // Get open entries for user that fall within the current period
    const entries = await db.query(
      `SELECT * FROM entries 
       WHERE user_id = ? AND invoice_id IS NULL 
       AND date >= ? AND date <= ?`,
      [req.user.id, period_start.split('T')[0], period_end.split('T')[0]]
    );

    if (entries.length === 0) {
      return res.status(400).json({ error: 'No open entries to invoice for current period' });
    }

    // Get user rate and info
    const user = await db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }

    // Validate user has a rate
    if (!Number.isFinite(user.rate)) {
      return res.status(400).json({ error: 'User rate missing' });
    }
    
    // Helper function for safe number conversion
    const num = x => typeof x === 'number' ? x : parseFloat(String(x));
    
    // Process entries and compute amounts
    let total = 0;
    for (const entry of entries) {
      // Ensure numeric hours
      entry.hours = num(entry.hours);
      if (!Number.isFinite(entry.hours) || entry.hours <= 0) {
        return res.status(400).json({ error: `Entry has invalid hours: ${entry.hours}` });
      }
      
      // Use entry rate if available, otherwise user rate
      const safeRate = Number.isFinite(entry.rate) ? entry.rate : user.rate;
      
      // Compute amount with proper rounding
      const hours = Math.round(entry.hours * 100) / 100;
      const amount = Math.round(hours * num(safeRate) * 100) / 100;
      
      if (!Number.isFinite(amount)) {
        return res.status(400).json({ error: 'Invalid hours/rate calculation' });
      }
      
      entry.amount = amount;
      entry.rate = safeRate; // Ensure rate is set for response
      total += amount;
    }
    
    // Round total
    total = Math.round(total * 100) / 100;

    // Check for existing invoice in this period (using already calculated period bounds)
    const existing = await db.get(
      `SELECT id FROM invoices 
       WHERE user_id = ? AND period_start = ? AND period_end = ?`,
      [req.user.id, period_start, period_end]
    );

    if (existing) {
      return res.status(400).json({ error: 'Invoice already submitted for this period' });
    }

    // Create invoice with period bounds
    const result = await db.run(
      `INSERT INTO invoices 
       (user_id, total, status, period_start, period_end, created_at) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.user.id, total, 'submitted', period_start, period_end, new Date().toISOString()]
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

    // Get complete invoice with all fields
    const invoice = await db.get(`
      SELECT i.*, u.name as user_name, i.user_id as userId
      FROM invoices i 
      JOIN users u ON i.user_id = u.id 
      WHERE i.id = ?`, 
      [result.id]
    );
    
    if (!invoice) {
      throw new Error('Failed to retrieve created invoice');
    }

    // Structure response according to specification
    const responseInvoice = {
      id: invoice.id,
      status: invoice.status,
      date: invoice.created_at.split('T')[0], // ISO YYYY-MM-DD format
      user: {
        id: user.id,
        name: user.name,
        rate: user.rate
      },
      total: total,
      entries: entries.map(e => ({
        id: e.id,
        date: e.date,
        hours: e.hours,
        rate: e.rate,
        amount: e.amount,
        task: e.task,
        notes: e.notes || ''
      })),
      // Keep legacy fields for compatibility
      userId: invoice.userId,
      user_name: invoice.user_name,
      userName: invoice.user_name
    };

    // Add entries to response (legacy format for compatibility)
    responseInvoice.entries = entries;

    // Send email notification to admins
    try {
      await notifyAdminsOnSubmit({
        invoice: { 
          id: result.id, 
          total_formatted: fmtCurrency(total), 
          created_at: new Date().toISOString() 
        },
        user: { 
          id: req.user.id, 
          name: req.user.name, 
          email: req.user.email 
        }
      });

      // Log email sent
      await db.run(
        'INSERT INTO email_log (type, invoice_id, to_email, sent_at) VALUES (?, ?, ?, ?)',
        ['submit_admin', result.id, process.env.ADMIN_NOTIFY_EMAILS, new Date().toISOString()]
      );
    } catch (emailError) {
      // Log email error but don't fail the request
      console.error('Error sending admin notification:', emailError);
    }

    res.status(201).json(responseInvoice);
  } catch (error) {
    console.error('Error submitting invoice:', error);
    res.status(500).json({ error: 'Failed to submit invoice' });
  }
});

// Approve invoice (admin only)
router.post('/:id/approve', authenticateToken, requireAdmin, async (req, res) => {
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
router.post('/:id/paid', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const now = new Date().toISOString();

    // First check if invoice exists and can be marked as paid
    const existingInvoice = await db.get('SELECT id, status, user_id FROM invoices WHERE id = ?', [id]);
    if (!existingInvoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (existingInvoice.status === 'paid') {
      return res.status(400).json({ error: 'Invoice is already marked as paid' });
    }

    // Update invoice status to paid (main operation)
    await db.run(
      'UPDATE invoices SET status = ?, paid_at = ?, paid_by_user_id = ? WHERE id = ?',
      ['paid', now, req.user.id, id]
    );

    // Add audit log entry
    try {
      await db.run(
        'INSERT INTO audit_log (user_id, action, details) VALUES (?, ?, ?)',
        [req.user.id, 'INVOICE_PAID', `Invoice ${id} marked as paid`]
      );
    } catch (auditError) {
      console.error('Warning: Failed to write audit log:', auditError);
      // Don't fail the main operation for audit log issues
    }

    // Fetch complete invoice data
    const invoice = await db.get(`
      SELECT i.*, u.name as user_name, u.email as user_email, i.user_id as userId
      FROM invoices i 
      JOIN users u ON i.user_id = u.id 
      WHERE i.id = ?`, 
      [id]
    );

    if (!invoice) {
      console.error('Warning: Could not fetch updated invoice data');
      return res.status(500).json({ error: 'Invoice updated but could not retrieve data' });
    }

    // Send email notification to user (non-blocking)
    setImmediate(async () => {
      try {
        const member = {
          name: invoice.user_name,
          email: invoice.user_email
        };

        const payer = await db.get('SELECT name FROM users WHERE id = ?', [req.user.id]);

        await notifyUserOnPaid({
          invoice: { 
            id: invoice.id, 
            total_formatted: fmtCurrency(invoice.total), 
            paid_at: now 
          },
          user: member,
          paidBy: payer
        });

        // Log email sent
        await db.run(
          'INSERT INTO email_log (type, invoice_id, to_email, sent_at) VALUES (?, ?, ?, ?)',
          ['paid_user', id, invoice.user_email, now]
        );
        
        console.log(`Payment notification sent successfully for invoice ${id}`);
      } catch (emailError) {
        // Log email error but don't fail the main operation
        console.error('Warning: Failed to send payment notification:', emailError);
        try {
          await db.run(
            'INSERT INTO audit_log (user_id, action, details) VALUES (?, ?, ?)',
            [req.user.id, 'EMAIL_FAILED', `Failed to send payment notification for invoice ${id}: ${emailError.message}`]
          );
        } catch (logError) {
          console.error('Warning: Failed to log email error:', logError);
        }
      }
    });

    // Return success immediately (don't wait for email)
    res.json(invoice);
  } catch (error) {
    console.error('Error marking invoice as paid:', error);
    
    // Provide more specific error messages
    if (error.message.includes('FOREIGN KEY constraint failed')) {
      res.status(400).json({ error: 'Invalid user or invoice reference' });
    } else if (error.message.includes('database is locked')) {
      res.status(503).json({ error: 'Database temporarily unavailable, please try again' });
    } else {
      res.status(500).json({ error: 'Failed to mark invoice as paid', details: error.message });
    }
  }
});

// Get entries attached to a specific invoice
router.get('/:id/entries', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user can access this invoice
    const invoice = await db.get(
      req.user.role === 'admin' 
        ? 'SELECT * FROM invoices WHERE id = ?'
        : 'SELECT * FROM invoices WHERE id = ? AND user_id = ?',
      req.user.role === 'admin' ? [id] : [id, req.user.id]
    );
    
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    const entries = await db.query(
      `SELECT e.*, u.name as user_name, u.rate, e.user_id as userId 
       FROM entries e 
       JOIN users u ON e.user_id = u.id 
       WHERE e.invoice_id = ? 
       ORDER BY e.date DESC`,
      [id]
    );
    
    // Helper function for safe number conversion
    const num = x => typeof x === 'number' ? x : parseFloat(String(x));
    
    // Process entries to ensure they have computed amounts
    const processedEntries = entries.map(e => {
      const hours = num(e.hours);
      const rate = Number.isFinite(e.rate) ? e.rate : 0;
      const amount = Math.round(hours * rate * 100) / 100;
      
      return {
        ...e,
        hours,
        rate,
        amount: Number.isFinite(amount) ? amount : 0
      };
    });
    
    res.json(processedEntries);
  } catch (error) {
    console.error('Error fetching invoice entries:', error);
    res.status(500).json({ error: 'Failed to fetch invoice entries' });
  }
});

// Revert invoice to draft status (admin only) - detaches entries
router.post('/:id/revert-to-draft', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get current invoice
    const invoice = await db.get('SELECT * FROM invoices WHERE id = ?', [id]);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    // Only allow reverting from submitted/approved status, not paid
    if (invoice.status === 'paid') {
      return res.status(400).json({ error: 'Cannot revert paid invoices' });
    }
    
    // Detach all entries from this invoice
    await db.run(
      'UPDATE entries SET invoice_id = NULL WHERE invoice_id = ?',
      [id]
    );
    
    // Update invoice status to draft
    await db.run(
      'UPDATE invoices SET status = ?, approved_at = NULL WHERE id = ?',
      ['draft', id]
    );
    
    // Log the action
    await db.run(
      'INSERT INTO audit_log (user_id, action, details) VALUES (?, ?, ?)',
      [req.user.id, 'INVOICE_REVERTED', `Invoice ${id} reverted to draft, entries detached`]
    );
    
    // Get updated invoice
    const updatedInvoice = await db.get(
      `SELECT i.*, u.name as user_name, i.user_id as userId
       FROM invoices i 
       JOIN users u ON i.user_id = u.id 
       WHERE i.id = ?`,
      [id]
    );
    
    res.json(updatedInvoice);
  } catch (error) {
    console.error('Error reverting invoice:', error);
    res.status(500).json({ error: 'Failed to revert invoice' });
  }
});

module.exports = router;