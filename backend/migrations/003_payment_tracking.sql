-- Add payment tracking columns to invoices if they don't exist
SELECT CASE 
  WHEN NOT EXISTS(SELECT 1 FROM pragma_table_info('invoices') WHERE name='paid_by_user_id')
  THEN 'ALTER TABLE invoices ADD COLUMN paid_by_user_id INTEGER;'
END AS sql_command
WHERE sql_command IS NOT NULL;

SELECT CASE 
  WHEN NOT EXISTS(SELECT 1 FROM pragma_table_info('invoices') WHERE name='paid_at')
  THEN 'ALTER TABLE invoices ADD COLUMN paid_at TEXT;' -- ISO 8601
END AS sql_command
WHERE sql_command IS NOT NULL;

-- Create email log table
CREATE TABLE IF NOT EXISTS email_log (
  id INTEGER PRIMARY KEY,
  type TEXT,                -- 'submit_admin' | 'paid_user'
  invoice_id INTEGER,
  to_email TEXT,
  sent_at TEXT
);