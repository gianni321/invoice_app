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

-- Ensure invoices have period bounds using conditional statements
SELECT CASE 
  WHEN NOT EXISTS(SELECT 1 FROM pragma_table_info('invoices') WHERE name='period_start')
  THEN 'ALTER TABLE invoices ADD COLUMN period_start TEXT;'
END AS sql_command
WHERE sql_command IS NOT NULL;

SELECT CASE 
  WHEN NOT EXISTS(SELECT 1 FROM pragma_table_info('invoices') WHERE name='period_end')
  THEN 'ALTER TABLE invoices ADD COLUMN period_end TEXT;'
END AS sql_command
WHERE sql_command IS NOT NULL;