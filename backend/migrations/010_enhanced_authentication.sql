-- Migration 010: Enhanced Authentication System
-- Replace PIN-based authentication with secure password system

BEGIN TRANSACTION;

-- Create new authentication tables
CREATE TABLE user_auth (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    password_hash TEXT NOT NULL,
    password_salt TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_password_change DATETIME DEFAULT CURRENT_TIMESTAMP,
    password_reset_token TEXT,
    password_reset_expires DATETIME,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create refresh tokens table
CREATE TABLE refresh_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token_id TEXT UNIQUE NOT NULL,
    user_id INTEGER NOT NULL,
    token_hash TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_used DATETIME DEFAULT CURRENT_TIMESTAMP,
    revoked BOOLEAN DEFAULT FALSE,
    device_info TEXT,
    ip_address TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create login history table
CREATE TABLE login_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    login_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT,
    user_agent TEXT,
    success BOOLEAN NOT NULL,
    failure_reason TEXT,
    session_id TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create password policy table
CREATE TABLE password_policies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    min_length INTEGER DEFAULT 8,
    require_uppercase BOOLEAN DEFAULT TRUE,
    require_lowercase BOOLEAN DEFAULT TRUE,
    require_numbers BOOLEAN DEFAULT TRUE,
    require_special_chars BOOLEAN DEFAULT TRUE,
    max_age_days INTEGER DEFAULT 90,
    history_count INTEGER DEFAULT 5,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default password policy
INSERT INTO password_policies (min_length, require_uppercase, require_lowercase, require_numbers, require_special_chars)
VALUES (8, TRUE, TRUE, TRUE, TRUE);

-- Create indexes for performance
CREATE INDEX idx_user_auth_user_id ON user_auth(user_id);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token_id ON refresh_tokens(token_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX idx_login_history_user_id ON login_history(user_id);
CREATE INDEX idx_login_history_login_time ON login_history(login_time);

-- Add new columns to users table for enhanced security
ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN two_factor_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN two_factor_secret TEXT;
ALTER TABLE users ADD COLUMN last_login DATETIME;
ALTER TABLE users ADD COLUMN account_status TEXT DEFAULT 'active'; -- active, locked, suspended, inactive

-- Create triggers to update timestamps
CREATE TRIGGER update_user_auth_timestamp 
    AFTER UPDATE ON user_auth
    BEGIN
        UPDATE user_auth SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER update_refresh_token_last_used
    AFTER UPDATE ON refresh_tokens
    BEGIN
        UPDATE refresh_tokens SET last_used = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

-- Add migration tracking
INSERT OR REPLACE INTO schema_migrations (version, description, applied_at)
VALUES (
    '010',
    'Enhanced Authentication System - Add secure password system, refresh tokens, login history',
    CURRENT_TIMESTAMP
);

COMMIT;