CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT OR REPLACE INTO app_settings (key, value) VALUES
  ('invoice_due_weekday', '2'),         -- 0=Sun ... 2=Tue
  ('invoice_due_hour', '23'),           -- 23
  ('invoice_due_minute', '59'),         -- 59
  ('invoice_due_timezone', 'America/Denver'),
  ('invoice_warn_window_hours', '24');  -- show "approaching" within 24h

-- Ensure invoices have period bounds
ALTER TABLE invoices ADD COLUMN period_start TEXT; -- ISO date (YYYY-MM-DD)
ALTER TABLE invoices ADD COLUMN period_end TEXT;   -- ISO date (YYYY-MM-DD)