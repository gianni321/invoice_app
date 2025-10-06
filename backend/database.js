const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');
const fs = require('fs').promises;

const DB_PATH = path.join(__dirname, 'timetracker.db');

class Database {
  constructor() {
    this.db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Database connection error:', err);
      } else {
        console.log('Connected to SQLite database');
        this.initialize();
      }
    });
  }

  async runMigrations() {
    const migrationsDir = path.join(__dirname, 'migrations');
    try {
      const files = await fs.readdir(migrationsDir);
      const migrations = files.filter(f => f.endsWith('.sql')).sort();
      
      for (const migration of migrations) {
        const sql = await fs.readFile(path.join(migrationsDir, migration), 'utf8');
        await this.run(sql);
        console.log(`Ran migration: ${migration}`);
      }
    } catch (err) {
      console.error('Migration error:', err);
    }
  }

  initialize() {
    this.db.serialize(() => {
      // Users table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          pin_hash TEXT NOT NULL,
          rate REAL NOT NULL,
          role TEXT DEFAULT 'member',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Time entries table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS entries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          hours REAL NOT NULL,
          task TEXT NOT NULL,
          notes TEXT,
          date TEXT NOT NULL,
          invoice_id INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);

      // Invoices table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS invoices (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          total REAL NOT NULL,
          status TEXT DEFAULT 'pending',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          approved_at DATETIME,
          paid_at DATETIME,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);

      // Audit log table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS audit_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          action TEXT NOT NULL,
          details TEXT,
          ip_address TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create demo users
      this.createDemoUsers();
      this.runMigrations();
    });
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
      
      this.db.run(
        `INSERT OR IGNORE INTO users (name, pin_hash, rate, role) 
         SELECT ?, ?, ?, ? 
         WHERE NOT EXISTS (SELECT 1 FROM users WHERE name = ?)`,
        [user.name, pinHash, user.rate, user.role, user.name],
        (err) => {
          if (err) console.error('Error creating demo user:', err);
        }
      );
    }
  }

  query(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }
}

module.exports = new Database();