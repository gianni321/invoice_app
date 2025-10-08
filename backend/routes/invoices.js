const express = require('express');
const db = require('../database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { getInvoiceSettings } = require('../lib/settings');
const { getDueDatetimes, periodBounds, statusFor, currentPeriod, dueForPeriod, ZONE } = require('../lib/deadlines');
const { notifyAdminsOnSubmit, notifyUserOnPaid } = require('../lib/invoiceNotify');
const { fmtCurrency } = require('../lib/format');

const router = express.Router();

// Helper function for reverting invoice to draft (shared between admin revert and member withdraw)
async function revertInvoiceToDraft(invoiceId, actionUserId, actionType) {
  // Detach all entries from this invoice
  await db.run(
    'UPDATE entries SET invoice_id = NULL WHERE invoice_id = ?',
    [invoiceId]
  );
  
  // Update invoice status to draft
  await db.run(
    'UPDATE invoices SET status = ?, approved_at = NULL WHERE id = ?',
    ['draft', invoiceId]
  );
  
  // Log the action
  const actionName = actionType === 'withdraw' ? 'INVOICE_WITHDRAWN' : 'INVOICE_REVERTED';
  const actionDesc = actionType === 'withdraw' ? 'withdrawn by member' : 'reverted to draft';
  await db.run(
    'INSERT INTO audit_log (user_id, action, details) VALUES (?, ?, ?)',
    [actionUserId, actionName, `Invoice ${invoiceId} ${actionDesc}, entries detached`]
  );
  
  // Get updated invoice
  const updatedInvoice = await db.get(
    `SELECT i.*, u.name as user_name, i.user_id as userId
     FROM invoices i 
     JOIN users u ON i.user_id = u.id 
     WHERE i.id = ?`,
    [invoiceId]
  );
  
  return updatedInvoice;
}

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

    // Fetch complete invoice data (handle missing email column gracefully)
    const invoice = await db.get(`
      SELECT i.*, u.name as user_name, i.user_id as userId
      FROM invoices i 
      JOIN users u ON i.user_id = u.id 
      WHERE i.id = ?`, 
      [id]
    );

    if (!invoice) {
      console.error('Warning: Could not fetch updated invoice data');
      return res.status(500).json({ error: 'Invoice updated but could not retrieve data' });
    }

    // Send email notification to user (non-blocking and safe)
    setImmediate(async () => {
      try {
        // Skip email sending if no proper email configuration
        const hasEmailConfig = process.env.SMTP_HOST && process.env.SMTP_USER;
        if (!hasEmailConfig) {
          console.log(`Skipping email notification for invoice ${id} - no email configuration`);
          return;
        }

        const member = {
          name: invoice.user_name,
          email: `user${invoice.userId}@example.com` // Fallback email since no email column exists
        };

        const payer = await db.get('SELECT name FROM users WHERE id = ?', [req.user.id]);

        await notifyUserOnPaid({
          invoice: { 
            id: invoice.id, 
            total_formatted: fmtCurrency(invoice.total), 
            paid_at: now 
          },
          user: member,
          paidBy: payer || { name: 'Admin' }
        });

        // Log email sent (only if email_log table exists)
        try {
          await db.run(
            'INSERT INTO email_log (type, invoice_id, to_email, sent_at) VALUES (?, ?, ?, ?)',
            ['paid_user', id, member.email, now]
          );
        } catch (logError) {
          // Table might not exist, that's okay
          console.log('Info: email_log table not available, skipping email log');
        }
        
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

// Withdraw submitted invoice (member only) - allows member to withdraw their own submitted invoice
router.post('/:id/withdraw', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get current invoice
    const invoice = await db.get('SELECT * FROM invoices WHERE id = ?', [id]);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    // Verify the user owns this invoice
    if (invoice.user_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only withdraw your own invoices' });
    }
    
    // Can only withdraw submitted invoices
    if (invoice.status !== 'submitted') {
      return res.status(400).json({ error: 'Only submitted invoices can be withdrawn' });
    }
    
    // Use shared helper function
    const updatedInvoice = await revertInvoiceToDraft(id, req.user.id, 'withdraw');
    
    res.json({
      message: 'Invoice withdrawn successfully',
      invoice: updatedInvoice
    });
  } catch (error) {
    console.error('Error withdrawing invoice:', error);
    res.status(500).json({ error: 'Failed to withdraw invoice' });
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

// Export invoice as PDF
router.get('/:id/export/pdf', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('PDF Export: Starting for invoice ID:', id);
    
    // Get invoice with entries
    const invoice = await db.get(`
      SELECT i.*, u.name as user_name, u.rate
      FROM invoices i 
      JOIN users u ON i.user_id = u.id 
      WHERE i.id = ?
    `, [id]);
    
    console.log('PDF Export: Retrieved invoice:', invoice);
    
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    // Check if user owns this invoice (members can only export their own)
    if (req.user.role !== 'admin' && invoice.user_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only export your own invoices' });
    }
    
    // Get invoice entries
    const entries = await db.query(`
      SELECT e.*, u.name as user_name, (e.hours * u.rate) as amount
      FROM entries e 
      JOIN users u ON e.user_id = u.id 
      WHERE e.invoice_id = ? 
      ORDER BY e.date DESC
    `, [id]);

    // Generate PDF using Puppeteer
    const puppeteer = require('puppeteer');
    
    // Create HTML content for the PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Invoice ${invoice.id}</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 40px; 
            line-height: 1.6;
            color: #333;
          }
          .header { 
            text-align: center; 
            margin-bottom: 40px; 
            border-bottom: 2px solid #007bff;
            padding-bottom: 20px;
          }
          .header h1 {
            color: #007bff;
            margin: 0;
            font-size: 28px;
          }
          .invoice-details { 
            margin-bottom: 30px; 
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
          }
          .invoice-details h2 {
            color: #007bff;
            margin-top: 0;
            margin-bottom: 15px;
          }
          .invoice-details div { 
            margin: 8px 0; 
            font-size: 14px;
          }
          .invoice-details strong {
            color: #495057;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          th, td { 
            border: 1px solid #dee2e6; 
            padding: 12px 8px; 
            text-align: left;
            font-size: 13px;
          }
          th { 
            background-color: #007bff; 
            color: white;
            font-weight: bold;
          }
          tr:nth-child(even) {
            background-color: #f8f9fa;
          }
          .total { 
            font-weight: bold; 
            font-size: 18px; 
            margin-top: 20px;
            text-align: right;
            color: #007bff;
            padding: 15px;
            background: #e7f3ff;
            border-radius: 5px;
          }
          .status {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
          }
          .status.paid { background: #d4edda; color: #155724; }
          .status.approved { background: #d1ecf1; color: #0c5460; }
          .status.submitted { background: #fff3cd; color: #856404; }
          .status.draft { background: #f8d7da; color: #721c24; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Invoice Report</h1>
          <p>Generated on ${new Date().toLocaleDateString()}</p>
        </div>
        
        <div class="invoice-details">
          <h2>Invoice Details</h2>
          <div><strong>Invoice #:</strong> ${invoice.id}</div>
          <div><strong>Member:</strong> ${invoice.user_name}</div>
          <div><strong>Status:</strong> <span class="status ${invoice.status}">${invoice.status.toUpperCase()}</span></div>
          <div><strong>Total Amount:</strong> $${invoice.total.toFixed(2)}</div>
          <div><strong>Created:</strong> ${new Date(invoice.created_at).toLocaleDateString()}</div>
          ${invoice.approved_at ? `<div><strong>Approved:</strong> ${new Date(invoice.approved_at).toLocaleDateString()}</div>` : ''}
          ${invoice.paid_at ? `<div><strong>Paid:</strong> ${new Date(invoice.paid_at).toLocaleDateString()}</div>` : ''}
        </div>
        
        <h2 style="color: #007bff; border-bottom: 1px solid #dee2e6; padding-bottom: 10px;">Time Entries</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Hours</th>
              <th>Task</th>
              <th>Notes</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${entries.map(entry => `
              <tr>
                <td>${new Date(entry.date).toLocaleDateString()}</td>
                <td>${entry.hours}</td>
                <td>${entry.task || 'N/A'}</td>
                <td>${entry.notes || 'N/A'}</td>
                <td>$${(entry.amount || 0).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="total">
          Total: $${invoice.total.toFixed(2)}
        </div>
      </body>
      </html>
    `;

    // Launch Puppeteer and generate PDF
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: {
        top: '20px',
        bottom: '20px',
        left: '20px',
        right: '20px'
      },
      printBackground: true
    });
    
    await browser.close();
    
    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${id}.pdf"`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // Send PDF buffer
    res.end(pdfBuffer);
    
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// Test export route
router.get('/:id/export/test', authenticateToken, async (req, res) => {
  try {
    res.json({ message: `Test export for invoice ${req.params.id}`, user: req.user.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export invoice as CSV
router.get('/:id/export/csv', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get invoice with user info
    const invoice = await db.get(`
      SELECT i.*, u.name as user_name 
      FROM invoices i 
      JOIN users u ON i.user_id = u.id 
      WHERE i.id = ?
    `, [id]);
    
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    // Check if user owns this invoice
    if (req.user.role !== 'admin' && invoice.user_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only export your own invoices' });
    }
    
    // Get invoice entries
    const entries = await db.query(`
      SELECT e.*, u.name as user_name 
      FROM entries e 
      JOIN users u ON e.user_id = u.id 
      WHERE e.invoice_id = ? 
      ORDER BY e.date DESC
    `, [id]);
    
    // Create CSV content
    let csvContent = "Type,Invoice_ID,Member,Status,Total,Date,Hours,Task,Notes,Amount\n";
    
    // Add invoice summary
    csvContent += `Invoice Summary,${invoice.id},"${invoice.user_name}",${invoice.status.toUpperCase()},$${invoice.total.toFixed(2)},,,,,$${invoice.total.toFixed(2)}\n`;
    csvContent += ",,,,,,,,\n"; // Empty row
    
    // Add entries
    entries.forEach(entry => {
      const task = (entry.task || '').replace(/"/g, '""');
      const notes = (entry.notes || '').replace(/"/g, '""');
      const entryDate = new Date(entry.date).toLocaleDateString();
      csvContent += `Time Entry,${invoice.id},"${entry.user_name}",${invoice.status.toUpperCase()},,${entryDate},${entry.hours},"${task}","${notes}",$${entry.amount.toFixed(2)}\n`;
    });
    
    // Set response headers
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${id}.csv"`);
    
    res.send(csvContent);
    
  } catch (error) {
    console.error('Error generating CSV:', error);
    res.status(500).json({ error: 'Failed to generate CSV', details: error.message });
  }
});

module.exports = router;