-- Performance Indexes Migration
-- Add indexes on commonly queried columns for better performance

-- Index on entries table for common queries
CREATE INDEX IF NOT EXISTS idx_entries_user_id ON entries(user_id);
CREATE INDEX IF NOT EXISTS idx_entries_date ON entries(date);
CREATE INDEX IF NOT EXISTS idx_entries_invoice_id ON entries(invoice_id);
CREATE INDEX IF NOT EXISTS idx_entries_user_date ON entries(user_id, date);
CREATE INDEX IF NOT EXISTS idx_entries_tag ON entries(tag);

-- Index on invoices table for common queries
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_period_start ON invoices(period_start);
CREATE INDEX IF NOT EXISTS idx_invoices_period_end ON invoices(period_end);
CREATE INDEX IF NOT EXISTS idx_invoices_user_status ON invoices(user_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_submitted_at ON invoices(submitted_at);

-- Index on audit_log table for performance
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);

-- Index on users table for authentication
CREATE INDEX IF NOT EXISTS idx_users_active ON users(active);

-- Composite indexes for complex queries
CREATE INDEX IF NOT EXISTS idx_entries_user_invoice ON entries(user_id, invoice_id);
CREATE INDEX IF NOT EXISTS idx_entries_date_status ON entries(date, invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_period_status ON invoices(period_start, period_end, status);