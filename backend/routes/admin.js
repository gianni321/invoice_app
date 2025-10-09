const router = require('express').Router();
const { requireAdmin, authenticateToken } = require('../middleware/auth');
const { getInvoiceSettings, setInvoiceSettings } = require('../lib/settings');
const db = require('../database-loader');

router.get('/invoice-deadline', requireAdmin, async (req, res) => {
  try {
    const settings = await getInvoiceSettings();
    res.json(settings);
  } catch (err) {
    console.error('Error getting invoice deadline settings:', err);
    res.status(500).json({ error: 'Failed to fetch invoice deadline settings' });
  }
});

router.post('/invoice-deadline', requireAdmin, async (req, res) => {
  try {
    const { weekday, hour, minute, zone, warnWindowHours } = req.body;
    
    // Input validation
    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
      return res.status(400).json({ error: 'Invalid weekday (0-6 required)' });
    }
    if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
      return res.status(400).json({ error: 'Invalid hour (0-23 required)' });
    }
    if (!Number.isInteger(minute) || minute < 0 || minute > 59) {
      return res.status(400).json({ error: 'Invalid minute (0-59 required)' });
    }
    if (typeof zone !== 'string' || !zone) {
      return res.status(400).json({ error: 'Invalid timezone' });
    }
    if (!Number.isInteger(warnWindowHours) || warnWindowHours < 0) {
      return res.status(400).json({ error: 'Invalid warning window' });
    }

    await setInvoiceSettings({
      weekday,
      hour,
      minute,
      zone,
      warnWindowHours
    });
    
    res.status(204).end();
  } catch (err) {
    console.error('Error updating invoice deadline settings:', err);
    res.status(500).json({ error: 'Failed to update invoice deadline settings' });
  }
});

// =============================================================================
// TAG MANAGEMENT ROUTES
// =============================================================================

// Get all tags
router.get('/tags', authenticateToken, async (req, res) => {
  try {
    const tags = await db.query(
      'SELECT * FROM tags ORDER BY sort_order ASC, name ASC'
    );
    res.json(tags);
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

// Get active tags only (for dropdowns)
router.get('/tags/active', authenticateToken, async (req, res) => {
  try {
    const tags = await db.query(
      'SELECT * FROM tags WHERE is_active = 1 ORDER BY sort_order ASC, name ASC'
    );
    res.json(tags);
  } catch (error) {
    console.error('Error fetching active tags:', error);
    res.status(500).json({ error: 'Failed to fetch active tags' });
  }
});

// Create new tag (admin only)
router.post('/tags', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, color, description, sort_order } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Tag name is required' });
    }
    
    // Validate color format
    const colorRegex = /^#[0-9A-F]{6}$/i;
    if (color && !colorRegex.test(color)) {
      return res.status(400).json({ error: 'Color must be a valid hex code (e.g., #3B82F6)' });
    }
    
    const result = await db.run(
      `INSERT INTO tags (name, color, description, sort_order) 
       VALUES (?, ?, ?, ?)`,
      [
        name.trim(), 
        color || '#3B82F6', 
        description || '', 
        sort_order || 0
      ]
    );
    
    const newTag = await db.get('SELECT * FROM tags WHERE id = ?', [result.id]);
    
    await db.run(
      'INSERT INTO audit_log (user_id, action, details) VALUES (?, ?, ?)',
      [req.user.id, 'TAG_CREATED', `Created tag: ${name}`]
    );
    
    res.status(201).json(newTag);
  } catch (error) {
    console.error('Error creating tag:', error);
    if (error.message.includes('UNIQUE constraint failed')) {
      res.status(400).json({ error: 'Tag name already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create tag' });
    }
  }
});

// Update tag (admin only)
router.put('/tags/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, color, description, sort_order, is_active } = req.body;
    
    const existingTag = await db.get('SELECT * FROM tags WHERE id = ?', [id]);
    if (!existingTag) {
      return res.status(404).json({ error: 'Tag not found' });
    }
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Tag name is required' });
    }
    
    // Validate color format
    const colorRegex = /^#[0-9A-F]{6}$/i;
    if (color && !colorRegex.test(color)) {
      return res.status(400).json({ error: 'Color must be a valid hex code (e.g., #3B82F6)' });
    }
    
    await db.run(
      `UPDATE tags 
       SET name = ?, color = ?, description = ?, sort_order = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        name.trim(),
        color || existingTag.color,
        description !== undefined ? description : existingTag.description,
        sort_order !== undefined ? sort_order : existingTag.sort_order,
        is_active !== undefined ? (is_active ? 1 : 0) : existingTag.is_active,
        id
      ]
    );
    
    const updatedTag = await db.get('SELECT * FROM tags WHERE id = ?', [id]);
    
    await db.run(
      'INSERT INTO audit_log (user_id, action, details) VALUES (?, ?, ?)',
      [req.user.id, 'TAG_UPDATED', `Updated tag: ${name}`]
    );
    
    res.json(updatedTag);
  } catch (error) {
    console.error('Error updating tag:', error);
    if (error.message.includes('UNIQUE constraint failed')) {
      res.status(400).json({ error: 'Tag name already exists' });
    } else {
      res.status(500).json({ error: 'Failed to update tag' });
    }
  }
});

// Delete tag (admin only)
router.delete('/tags/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const existingTag = await db.get('SELECT * FROM tags WHERE id = ?', [id]);
    if (!existingTag) {
      return res.status(404).json({ error: 'Tag not found' });
    }
    
    // Check if tag is used in any entries
    const usageCount = await db.get(
      'SELECT COUNT(*) as count FROM entries WHERE tag = ?',
      [existingTag.name]
    );
    
    if (usageCount.count > 0) {
      return res.status(400).json({ 
        error: `Cannot delete tag "${existingTag.name}" as it is used in ${usageCount.count} entries. Consider deactivating it instead.` 
      });
    }
    
    await db.run('DELETE FROM tags WHERE id = ?', [id]);
    
    await db.run(
      'INSERT INTO audit_log (user_id, action, details) VALUES (?, ?, ?)',
      [req.user.id, 'TAG_DELETED', `Deleted tag: ${existingTag.name}`]
    );
    
    res.json({ message: 'Tag deleted successfully' });
  } catch (error) {
    console.error('Error deleting tag:', error);
    res.status(500).json({ error: 'Failed to delete tag' });
  }
});

// =============================================================================
// COMPANY SETTINGS ROUTES
// =============================================================================

// Get all company settings
router.get('/settings', authenticateToken, async (req, res) => {
  try {
    const settings = await db.query('SELECT * FROM company_settings ORDER BY setting_key');
    
    // Convert to key-value object for easier frontend consumption
    const settingsObj = {};
    settings.forEach(setting => {
      let value = setting.setting_value;
      
      // Convert based on type
      if (setting.setting_type === 'number') {
        value = parseFloat(value) || 0;
      } else if (setting.setting_type === 'boolean') {
        value = value === 'true' || value === '1';
      } else if (setting.setting_type === 'json') {
        try {
          value = JSON.parse(value);
        } catch (e) {
          value = {};
        }
      }
      
      settingsObj[setting.setting_key] = {
        value,
        type: setting.setting_type,
        description: setting.description
      };
    });
    
    res.json(settingsObj);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Update company setting (admin only)
router.put('/settings/:key', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    
    if (value === undefined) {
      return res.status(400).json({ error: 'Setting value is required' });
    }
    
    // Get existing setting to determine type
    const existingSetting = await db.get(
      'SELECT * FROM company_settings WHERE setting_key = ?',
      [key]
    );
    
    let stringValue = value;
    if (existingSetting) {
      // Convert value to string based on type
      if (existingSetting.setting_type === 'number') {
        stringValue = String(parseFloat(value) || 0);
      } else if (existingSetting.setting_type === 'boolean') {
        stringValue = value ? 'true' : 'false';
      } else if (existingSetting.setting_type === 'json') {
        stringValue = JSON.stringify(value);
      } else {
        stringValue = String(value);
      }
      
      // Update existing setting
      await db.run(
        `UPDATE company_settings 
         SET setting_value = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE setting_key = ?`,
        [stringValue, key]
      );
    } else {
      // Create new setting
      await db.run(
        `INSERT INTO company_settings (setting_key, setting_value, setting_type) 
         VALUES (?, ?, ?)`,
        [key, String(value), 'text']
      );
    }
    
    await db.run(
      'INSERT INTO audit_log (user_id, action, details) VALUES (?, ?, ?)',
      [req.user.id, 'SETTING_UPDATED', `Updated setting: ${key}`]
    );
    
    res.json({ message: 'Setting updated successfully' });
  } catch (error) {
    console.error('Error updating setting:', error);
    res.status(500).json({ error: 'Failed to update setting' });
  }
});

// Bulk update settings (admin only)
router.put('/settings', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { settings } = req.body;
    
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'Settings object is required' });
    }
    
    // Start transaction
    await db.run('BEGIN TRANSACTION');
    
    try {
      for (const [key, value] of Object.entries(settings)) {
        const existingSetting = await db.get(
          'SELECT * FROM company_settings WHERE setting_key = ?',
          [key]
        );
        
        let stringValue = String(value);
        if (existingSetting) {
          if (existingSetting.setting_type === 'number') {
            stringValue = String(parseFloat(value) || 0);
          } else if (existingSetting.setting_type === 'boolean') {
            stringValue = value ? 'true' : 'false';
          } else if (existingSetting.setting_type === 'json') {
            stringValue = JSON.stringify(value);
          }
          
          await db.run(
            `UPDATE company_settings 
             SET setting_value = ?, updated_at = CURRENT_TIMESTAMP 
             WHERE setting_key = ?`,
            [stringValue, key]
          );
        } else {
          await db.run(
            `INSERT INTO company_settings (setting_key, setting_value, setting_type) 
             VALUES (?, ?, ?)`,
            [key, stringValue, 'text']
          );
        }
      }
      
      await db.run('COMMIT');
      
      await db.run(
        'INSERT INTO audit_log (user_id, action, details) VALUES (?, ?, ?)',
        [req.user.id, 'SETTINGS_BULK_UPDATE', `Updated ${Object.keys(settings).length} settings`]
      );
      
      res.json({ message: 'Settings updated successfully' });
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error bulk updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

module.exports = router;