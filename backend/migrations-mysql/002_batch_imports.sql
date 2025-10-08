-- MySQL version of 002_batch_imports.sql

-- Track batch imports for idempotency
CREATE TABLE IF NOT EXISTS batch_imports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  idempotency_key VARCHAR(255) NOT NULL UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);