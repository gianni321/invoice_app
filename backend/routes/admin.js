const router = require('express').Router();
const { requireAdmin } = require('../middleware/auth');
const { getInvoiceSettings, setInvoiceSettings } = require('../lib/settings');

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

module.exports = router;