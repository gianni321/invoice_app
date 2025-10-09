-- Add budget tracking fields to users table
ALTER TABLE users ADD COLUMN budget DECIMAL(10,2) DEFAULT NULL;
ALTER TABLE users ADD COLUMN budget_period TEXT DEFAULT 'monthly'; -- monthly, weekly, daily
ALTER TABLE users ADD COLUMN budget_start_date TEXT DEFAULT NULL;

-- Set default budgets based on rate (assuming 160 hours/month)
UPDATE users SET budget = rate * 160 WHERE budget IS NULL AND rate > 0;