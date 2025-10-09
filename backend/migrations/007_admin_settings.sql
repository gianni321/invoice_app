-- Admin settings database schema
-- This creates tables for managing configurable platform settings

-- Table for storing configurable tags
CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(50) NOT NULL UNIQUE,
  color VARCHAR(7) DEFAULT '#3B82F6', -- hex color code
  description TEXT,
  is_active BOOLEAN DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for company/organization settings
CREATE TABLE IF NOT EXISTS company_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT,
  setting_type VARCHAR(20) DEFAULT 'text', -- text, number, boolean, json
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default tags (migrating from hardcoded list)
INSERT OR IGNORE INTO tags (name, color, description, sort_order) VALUES
  ('Dev', '#10B981', 'Development work', 1),
  ('Bug', '#EF4444', 'Bug fixes and debugging', 2),
  ('Call', '#8B5CF6', 'Phone calls and conversations', 3),
  ('Meeting', '#F59E0B', 'Meetings and collaboration', 4),
  ('Research', '#06B6D4', 'Research and investigation', 5),
  ('Admin', '#6B7280', 'Administrative tasks', 6),
  ('Testing', '#EC4899', 'Quality assurance and testing', 7),
  ('Documentation', '#84CC16', 'Writing documentation and specs', 8);

-- Insert default company settings
INSERT OR IGNORE INTO company_settings (setting_key, setting_value, setting_type, description) VALUES
  ('company_name', 'Your Company Name', 'text', 'Company or organization name'),
  ('company_address_line1', '123 Business St', 'text', 'Address line 1'),
  ('company_address_line2', 'Suite 100', 'text', 'Address line 2 (optional)'),
  ('company_city', 'Business City', 'text', 'City'),
  ('company_state', 'ST', 'text', 'State or province'),
  ('company_zip', '12345', 'text', 'ZIP or postal code'),
  ('company_country', 'United States', 'text', 'Country'),
  ('company_phone', '(555) 123-4567', 'text', 'Phone number'),
  ('company_email', 'contact@company.com', 'text', 'Contact email'),
  ('company_website', 'https://yourcompany.com', 'text', 'Website URL'),
  ('invoice_prefix', 'INV', 'text', 'Invoice number prefix'),
  ('default_rate', '75.00', 'number', 'Default hourly rate'),
  ('currency_symbol', '$', 'text', 'Currency symbol'),
  ('timezone', 'America/New_York', 'text', 'Default timezone');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tags_active ON tags(is_active);
CREATE INDEX IF NOT EXISTS idx_tags_sort ON tags(sort_order);
CREATE INDEX IF NOT EXISTS idx_company_settings_key ON company_settings(setting_key);