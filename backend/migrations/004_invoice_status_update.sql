-- Update invoice status values to match new specification
-- Current: 'pending', 'approved', 'paid'  
-- New spec: 'draft', 'submitted', 'approved', 'paid', 'void'

-- Map existing 'pending' to 'submitted' (since pending invoices are submitted ones)
UPDATE invoices SET status = 'submitted' WHERE status = 'pending';

-- Add audit log for any status that might need special handling
-- This migration assumes existing 'pending' invoices are actually submitted invoices
INSERT INTO audit_log (user_id, action, details) 
SELECT 0, 'MIGRATION_004', 'Updated invoice status from pending to submitted'
WHERE EXISTS (SELECT 1 FROM invoices WHERE status = 'submitted');