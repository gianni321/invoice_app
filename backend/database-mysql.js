const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const fs = require('fs').promises;
const path = require('path');

class MySQLDatabase {
  constructor() {
    this.pool = null;
    this.isConnected = false;
    this.initPromise = this.connect().catch(err => {
      console.error('Failed to initialize MySQL:', err.message);
      throw err;
    });
  }

  async connect() {
    try {
      this.pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'invoice_user',
        password: process.env.DB_PASSWORD || 'invoice_pass',
        database: process.env.DB_NAME || 'invoice_db',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        timezone: 'Z' // Use UTC
      });

      // Test connection with timeout
      const connection = await Promise.race([
        this.pool.getConnection(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), 5000)
        )
      ]);
      
      console.log('Connected to MySQL database');
      connection.release();
      this.isConnected = true;
      
      await this.initialize();
    } catch (err) {
      console.error('MySQL connection error:', err.message);
      throw new Error(`MySQL connection failed: ${err.message}`);
    }
  }

  async runMigrations() {
    const migrationsDir = path.join(__dirname, 'migrations-mysql');
    try {
      const files = await fs.readdir(migrationsDir);
      const migrations = files.filter(f => f.endsWith('.sql')).sort();
      
      for (const migration of migrations) {
        const sql = await fs.readFile(path.join(migrationsDir, migration), 'utf8');
        try {
          await this.run(sql);
          console.log(`Ran migration: ${migration}`);
        } catch (migrationErr) {
          // Ignore "duplicate column" errors as columns may already exist
          if (migrationErr.message && migrationErr.message.includes('Duplicate column')) {
            console.log(`Skipped migration ${migration}: columns already exist`);
          } else {
            throw migrationErr;
          }
        }
      }
    } catch (err) {
      console.error('Migration error:', err);
    }
  }

  convertSQLiteToMySQL(sql) {
    return sql
      // Replace INTEGER PRIMARY KEY AUTOINCREMENT with INT AUTO_INCREMENT PRIMARY KEY
      .replace(/INTEGER PRIMARY KEY AUTOINCREMENT/gi, 'INT AUTO_INCREMENT PRIMARY KEY')
      // Replace TEXT with VARCHAR(255) or TEXT based on usage
      .replace(/(\w+)\s+TEXT\s+NOT\s+NULL/gi, '$1 VARCHAR(255) NOT NULL')
      .replace(/(\w+)\s+TEXT(?!\s+NOT\s+NULL)/gi, '$1 TEXT')
      // Replace REAL with DECIMAL
      .replace(/(\w+)\s+REAL/gi, '$1 DECIMAL(10,2)')
      // Replace DATETIME DEFAULT CURRENT_TIMESTAMP with proper MySQL syntax
      .replace(/DATETIME DEFAULT CURRENT_TIMESTAMP/gi, 'DATETIME DEFAULT CURRENT_TIMESTAMP')
      // Replace INSERT OR IGNORE with INSERT IGNORE
      .replace(/INSERT OR IGNORE/gi, 'INSERT IGNORE');
  }

  async initialize() {
    try {
      // Users table
      await this.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          pin_hash VARCHAR(255) NOT NULL,
          rate DECIMAL(10,2) NOT NULL,
          role VARCHAR(50) DEFAULT 'member',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Time entries table
      await this.run(`
        CREATE TABLE IF NOT EXISTS entries (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          hours DECIMAL(10,2) NOT NULL,
          task VARCHAR(255) NOT NULL,
          notes TEXT,
          date DATE NOT NULL,
          invoice_id INT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);

      // Invoices table
      await this.run(`
        CREATE TABLE IF NOT EXISTS invoices (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          total DECIMAL(10,2) NOT NULL,
          status VARCHAR(50) DEFAULT 'pending',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          approved_at DATETIME NULL,
          paid_at DATETIME NULL,
          period_start DATE NULL,
          period_end DATE NULL,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);

      // Audit log table
      await this.run(`
        CREATE TABLE IF NOT EXISTS audit_log (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT,
          action VARCHAR(255) NOT NULL,
          details TEXT,
          ip_address VARCHAR(45),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // App settings table (if it doesn't exist from migrations)
      await this.run(`
        CREATE TABLE IF NOT EXISTS app_settings (
          id INT AUTO_INCREMENT PRIMARY KEY,
          key_name VARCHAR(255) UNIQUE NOT NULL,
          value TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);

      // Create demo users
      await this.createDemoUsers();
      
      // Run migrations
      await this.runMigrations();
      
    } catch (err) {
      console.error('Database initialization error:', err);
      throw err;
    }
  }

  async createDemoUsers() {
    const demoUsers = [
      { name: 'Admin', pin: '0000', rate: 0, role: 'admin' },
      { name: 'John Smith', pin: '1234', rate: 75, role: 'member' },
      { name: 'Sarah Johnson', pin: '5678', rate: 85, role: 'member' },
      { name: 'Mike Chen', pin: '9012', rate: 70, role: 'member' },
    ];

    for (const user of demoUsers) {
      const pinHash = await bcrypt.hash(user.pin, 10);
      
      try {
        await this.run(
          `INSERT IGNORE INTO users (name, pin_hash, rate, role) VALUES (?, ?, ?, ?)`,
          [user.name, pinHash, user.rate, user.role]
        );
      } catch (err) {
        console.error('Error creating demo user:', err);
      }
    }
  }

  async query(sql, params = []) {
    try {
      const [rows] = await this.pool.execute(sql, params);
      return rows;
    } catch (err) {
      console.error('Query error:', err);
      throw err;
    }
  }

  async run(sql, params = []) {
    try {
      const [result] = await this.pool.execute(sql, params);
      return { 
        id: result.insertId, 
        changes: result.affectedRows,
        affectedRows: result.affectedRows
      };
    } catch (err) {
      console.error('Run error:', err);
      throw err;
    }
  }

  async get(sql, params = []) {
    try {
      const [rows] = await this.pool.execute(sql, params);
      return rows[0] || null;
    } catch (err) {
      console.error('Get error:', err);
      throw err;
    }
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
      console.log('MySQL connection pool closed');
    }
  }
}

module.exports = new MySQLDatabase();