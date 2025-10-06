const db = require('../database');

async function getInvoiceSettings() {
  const rows = await db.query('SELECT key, value FROM app_settings');
  const map = Object.fromEntries(rows.map(r => [r.key, r.value]));
  return {
    weekday: Number(map.invoice_due_weekday ?? 2),
    hour: Number(map.invoice_due_hour ?? 23),
    minute: Number(map.invoice_due_minute ?? 59),
    zone: map.invoice_due_timezone ?? 'America/Denver',
    warnWindowHours: Number(map.invoice_warn_window_hours ?? 24)
  };
}

async function setInvoiceSettings(input) {
  const settings = {
    invoice_due_weekday: input.weekday,
    invoice_due_hour: input.hour,
    invoice_due_minute: input.minute,
    invoice_due_timezone: input.zone,
    invoice_warn_window_hours: input.warnWindowHours
  };

  const entries = Object.entries(settings);
  for (const [key, value] of entries) {
    await db.run(
      'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
      [key, String(value)]
    );
  }
}

module.exports = { getInvoiceSettings, setInvoiceSettings };