-- MySQL version of 001_settings_and_periods.sql

CREATE TABLE IF NOT EXISTS app_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  key_name VARCHAR(255) UNIQUE NOT NULL,
  value TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT IGNORE INTO app_settings (key_name, value) VALUES
  ('invoice_due_weekday', '2'),         -- 0=Sun ... 2=Tue
  ('invoice_due_hour', '23'),           -- 23
  ('invoice_due_minute', '59'),         -- 59
  ('invoice_due_timezone', 'America/Denver'),
  ('invoice_warn_window_hours', '24');  -- show "approaching" within 24h

-- Add period columns to invoices table
-- These may already exist, migration runner will skip errors
ALTER TABLE invoices ADD COLUMN period_start DATE;
ALTER TABLE invoices ADD COLUMN period_end DATE;