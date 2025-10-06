-- Add payment tracking columns to invoices
-- These may already exist, migration runner will skip errors  
ALTER TABLE invoices ADD COLUMN paid_by_user_id INTEGER;
ALTER TABLE invoices ADD COLUMN paid_at TEXT;

-- Create email log table
CREATE TABLE IF NOT EXISTS email_log (
  id INTEGER PRIMARY KEY,
  type TEXT,                -- 'submit_admin' | 'paid_user'
  invoice_id INTEGER,
  to_email TEXT,
  sent_at TEXT
);