-- MySQL version of 003_payment_tracking.sql

-- Add payment tracking columns to invoices
-- These may already exist, migration runner will skip errors  
ALTER TABLE invoices ADD COLUMN paid_by_user_id INT;
ALTER TABLE invoices ADD COLUMN paid_at DATETIME;

-- Create email log table
CREATE TABLE IF NOT EXISTS email_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type VARCHAR(50),         -- 'submit_admin' | 'paid_user'
  invoice_id INT,
  to_email VARCHAR(255),
  sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
);