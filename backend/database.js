const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const fs = require('fs').promises;
const path = require('path');

class Database {
  constructor() {
    this.pool = mysql.createPool({
      host: process.env.DB_HOST || 'db',
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || 'invoice_user',
      password: process.env.DB_PASS || process.env.DB_PASSWORD || 'invoice_pass',
      database: process.env.DB_NAME || 'invoice_db',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      multipleStatements: true,
      charset: 'utf8mb4',
      timezone: 'Z',
    });
    this.migrationsDir = path.join(__dirname, process.env.MIGRATIONS_DIR || 'migrations-mysql');
    this.runMigrationsFlag = (process.env.RUN_MIGRATIONS ?? 'true') === 'true';
  }

  async initialize() {
    await this.#waitForDB();
    if (this.runMigrationsFlag) {
      await this.#ensureMigrationsTable();
      await this.#applyMigrations();
    }
    await this.#seedDemoUsers();
  }

  async query(sql, params = []) {
    const [rows] = await this.pool.query(sql, params);
    return rows;
  }

  async run(sql, params = []) {
    const [res] = await this.pool.execute(sql, params);
    return res;
  }

  async run(sql, params = []) {
    // Parameterized single-statement writes
    const [res] = await this.pool.execute(sql, params);
    return res;
  }

  async runRaw(sql) {
     // Multi-statement files (no params)
     const [res] = await this.pool.query(sql); // allows multiple statements
     return res;
  }

  async get(sql, params = []) {
    const [rows] = await this.pool.query(sql, params);
    return rows[0] || null;
  }

  async close() {
    await this.pool.end();
  }

  // --- private ---

  async #waitForDB(retries = 30, delayMs = 1000) {
    for (let i = 0; i < retries; i++) {
      try { await this.query('SELECT 1'); return; }
      catch (e) { if (i === retries - 1) throw e; await new Promise(r => setTimeout(r, delayMs)); }
    }
  }

  async #ensureMigrationsTable() {
    await this.run(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);
  }

  async #isApplied(filename) {
    const row = await this.get(`SELECT 1 FROM _migrations WHERE filename = ?`, [filename]);
    return !!row;
  }

  async #markApplied(filename) {
    await this.run(`INSERT INTO _migrations (filename) VALUES (?)`, [filename]);
  }

  async #applyMigrations() {
    let files;
    try {
      files = (await fs.readdir(this.migrationsDir))
          .filter(f => f.toLowerCase().endsWith('.sql'))
          .sort();
    } catch (e) {
      if (e.code === 'ENOENT') return;
      throw e;
    }

    for (const file of files) {
      if (await this.#isApplied(file)) continue;
      const sql = await fs.readFile(path.join(this.migrationsDir, file), 'utf8');
      await this.runRaw(sql);
      await this.#markApplied(file);
      console.log(`migration applied: ${file}`);
    }
  }

  async #seedDemoUsers() {
    const demo = [
      { name: 'Admin', pin: '0000', rate: 0, role: 'admin' },
      { name: 'John Smith', pin: '1234', rate: 75, role: 'member' },
      { name: 'Sarah Johnson', pin: '5678', rate: 85, role: 'member' },
      { name: 'Mike Chen', pin: '9012', rate: 70, role: 'member' },
    ];
    for (const u of demo) {
      const pinHash = await bcrypt.hash(u.pin, 10);
      await this.run(
          `INSERT IGNORE INTO users (name, pin_hash, rate, role) VALUES (?,?,?,?)`,
          [u.name, pinHash, u.rate, u.role]
      );
    }
  }
}

module.exports = new Database();