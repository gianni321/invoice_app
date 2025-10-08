-- MySQL initialization script
-- This script runs when the MySQL container starts for the first time

-- Set default character set and collation
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- Ensure the database exists (it should from the environment variables)
CREATE DATABASE IF NOT EXISTS invoice_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Use the database
USE invoice_db;

-- Grant permissions to the invoice_user (already created by environment)
GRANT ALL PRIVILEGES ON invoice_db.* TO 'invoice_user'@'%';
FLUSH PRIVILEGES;

-- Note: Tables will be created by the Node.js application when it starts
SELECT 'MySQL initialization complete' as status;