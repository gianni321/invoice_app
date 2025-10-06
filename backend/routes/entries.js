const express = require('express');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all entries for current user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const entries = await db.query(
      `SELECT e.*, u.name as user_name, u.rate, e.user_id as userId 
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

    // Get complete entry with user info
    const entry = await db.get(
      `SELECT e.*, u.name as user_name, u.rate, e.user_id as userId
       FROM entries e 
       JOIN users u ON e.user_id = u.id 
       WHERE e.id = ?`, 
      [result.id]
    );
    
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

    const updated = await db.get(
      `SELECT e.*, u.name as user_name, u.rate, e.user_id as userId 
       FROM entries e 
       JOIN users u ON e.user_id = u.id 
       WHERE e.id = ?`, 
      [id]
    );
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

// Preview batch entries
router.post('/batch/preview', authenticateToken, async (req, res) => {
  try {
    const { mode, input } = req.body;
    if (!input?.data) {
      return res.status(400).json({ error: 'Input data required' });
    }

    const rows = parseEntries(input.data, mode);
    const validated = rows.map((row, idx) => validateEntry(row, idx + 1));
    
    const summary = validated.reduce((acc, row) => ({
      valid: acc.valid + (row.valid ? 1 : 0),
      invalid: acc.invalid + (row.valid ? 0 : 1),
      total: acc.total + 1
    }), { valid: 0, invalid: 0, total: 0 });

    res.json({ rows: validated, summary });
  } catch (error) {
    console.error('Error previewing batch entries:', error);
    res.status(500).json({ error: 'Failed to preview entries' });
  }
});

// Import batch entries
router.post('/batch/import', authenticateToken, async (req, res) => {
  try {
    const { idempotencyKey, rows } = req.body;
    if (!rows?.length) {
      return res.status(400).json({ error: 'No entries to import' });
    }

    // Check idempotency key
    const existing = await db.get(
      'SELECT id FROM batch_imports WHERE idempotency_key = ?',
      [idempotencyKey]
    );
    if (existing) {
      return res.status(409).json({ error: 'Duplicate import' });
    }

    const results = {
      created: 0,
      skipped: 0,
      errors: []
    };

    // Import valid entries
    for (let i = 0; i < rows.length; i++) {
      const entry = rows[i];
      try {
        // Validate again for safety
        const validation = validateEntry(entry, i + 1);
        if (!validation.valid) {
          results.errors.push({ index: i, reason: validation.errors[0] });
          results.skipped++;
          continue;
        }

        // Check for duplicates
        const dupe = await db.get(
          `SELECT id FROM entries 
           WHERE user_id = ? AND date = ? AND hours = ? AND task = ? AND notes = ?`,
          [req.user.id, entry.date, entry.hours, entry.task, entry.notes || '']
        );
        if (dupe) {
          results.errors.push({ index: i, reason: 'duplicate' });
          results.skipped++;
          continue;
        }

        // Insert entry
        await db.run(
          `INSERT INTO entries (user_id, hours, task, notes, date) 
           VALUES (?, ?, ?, ?, ?)`,
          [req.user.id, entry.hours, entry.task, entry.notes || '', entry.date]
        );
        results.created++;
      } catch (err) {
        console.error(`Error importing entry ${i}:`, err);
        results.errors.push({ index: i, reason: 'database_error' });
        results.skipped++;
      }
    }

    // Record successful import
    await db.run(
      'INSERT INTO batch_imports (user_id, idempotency_key) VALUES (?, ?)',
      [req.user.id, idempotencyKey]
    );

    res.json(results);
  } catch (error) {
    console.error('Error importing batch entries:', error);
    res.status(500).json({ error: 'Failed to import entries' });
  }
});

// Parsing and validation helpers
function parseEntries(input, mode = 'deterministic') {
  const lines = input.split('\n').filter(line => line.trim());
  const entries = [];

  for (const line of lines) {
    const entry = parseLine(line.trim());
    if (entry) entries.push(entry);
  }

  return entries;
}

function parseLine(line) {
  // Try CSV format first
  const csvMatch = line.match(/^(?:(\d{4}-\d{2}-\d{2}),)?(\d+(?:\.\d+)?),([^,]+)(?:,(.+))?$/);
  if (csvMatch) {
    const [, date, hours, task, notes] = csvMatch;
    return { date: date || getTodayISO(), hours: parseFloat(hours), task, notes };
  }

  // Try free-form with hours suffix
  const hoursMatch = line.match(/^(\d+(?:\.\d+)?)h\s*[|,]?\s*([^|,]+)(?:[|,]\s*(.+))?$/);
  if (hoursMatch) {
    const [, hours, task, notes] = hoursMatch;
    return { date: getTodayISO(), hours: parseFloat(hours), task, notes };
  }

  // Try free-form with date prefix
  const dateMatch = line.match(/^(\d{4}-\d{2}-\d{2})\s*[|,]\s*(.+)$/);
  const [, date, rest] = dateMatch;
  const parsed = parseLine(rest); // Recursively parse the rest
  if (parsed) {
    parsed.date = date;
    return parsed;
  }

  return null;
}

function validateEntry(entry, lineNum) {
  const errors = [];
  let parsed = null;

  if (!entry) {
    return { line: lineNum, parsed: null, valid: false, errors: ['Unrecognized format'] };
  }

  try {
    parsed = {
      date: entry.date || getTodayISO(),
      hours: parseFloat(entry.hours),
      task: (entry.task || '').trim(),
      notes: (entry.notes || '').trim()
    };

    // Validate hours
    if (isNaN(parsed.hours) || parsed.hours <= 0 || parsed.hours > 24) {
      errors.push('Hours must be between 0 and 24');
    }
    parsed.hours = Math.round(parsed.hours * 100) / 100; // Clamp to 2 decimals

    // Validate task
    if (!parsed.task) {
      errors.push('Task is required');
    }
    if (parsed.task.length > 120) {
      errors.push('Task must be 120 characters or less');
    }

    // Validate notes
    if (parsed.notes.length > 500) {
      errors.push('Notes must be 500 characters or less');
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(parsed.date)) {
      errors.push('Invalid date format (use YYYY-MM-DD)');
    }
  } catch (error) {
    errors.push('Invalid entry format');
  }

  return {
    line: lineNum,
    parsed,
    valid: errors.length === 0,
    errors
  };
}

function getTodayISO() {
  return new Date().toISOString().split('T')[0];
}

module.exports = router;