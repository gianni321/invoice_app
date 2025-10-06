-- Add payment tracking columns to invoices
ALTER TABLE invoices
  ADD COLUMN paid_by_user_id INTEGER,
  ADD COLUMN paid_at TEXT; -- ISO 8601

-- Create email log table
CREATE TABLE IF NOT EXISTS email_log (
  id INTEGER PRIMARY KEY,
  type TEXT,                -- 'submit_admin' | 'paid_user'
  invoice_id INTEGER,
  to_email TEXT,
  sent_at TEXT
);