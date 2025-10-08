-- Migration to add manual period tracking fields for "Submit Anytime" feature
-- This supports tracking when users manually override the invoice period

-- Add fields to track manual period overrides
ALTER TABLE invoices ADD COLUMN manual_period BOOLEAN DEFAULT 0;
ALTER TABLE invoices ADD COLUMN declared_at TEXT; -- ISO timestamp when user chose period override
ALTER TABLE invoices ADD COLUMN custom_note TEXT; -- User-provided reason for custom period

-- Create index for querying manual period invoices
CREATE INDEX IF NOT EXISTS idx_invoices_manual_period ON invoices(manual_period, period_start);

-- Update audit log to track manual period submissions
-- No schema changes needed for audit_log as it already supports flexible details