const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

let testDb;
let testDbPath;

/**
 * Setup test database with in-memory SQLite
 */
async function setupTestDb() {
  // Use in-memory database for tests
  testDbPath = ':memory:';
  testDb = new Database(testDbPath);
  
  // Enable foreign keys
  testDb.exec('PRAGMA foreign_keys = ON');
  
  // Create tables using migration files
  const migrationsDir = path.join(__dirname, '../../migrations');
  
  if (fs.existsSync(migrationsDir)) {
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    for (const file of migrationFiles) {
      const migrationPath = path.join(migrationsDir, file);
      const migration = fs.readFileSync(migrationPath, 'utf8');
      
      try {
        testDb.exec(migration);
      } catch (error) {
        console.warn(`Migration ${file} failed:`, error.message);
        // Continue with other migrations
      }
    }
  } else {
    // Fallback: create basic tables manually
    createBasicTables();
  }
  
  return testDb;
}

/**
 * Create basic tables if migrations don't exist
 */
function createBasicTables() {
  testDb.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      username TEXT UNIQUE,
      pin_hash TEXT,
      role TEXT DEFAULT 'user',
      rate REAL DEFAULT 0,
      active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      hours REAL NOT NULL,
      task TEXT,
      notes TEXT,
      tag TEXT,
      rate REAL,
      invoice_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      status TEXT DEFAULT 'draft',
      total REAL DEFAULT 0,
      period_start TEXT,
      period_end TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      details TEXT,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

/**
 * Create a test user
 */
async function createTestUser(userData = {}) {
  const defaultUser = {
    name: 'Test User',
    username: 'testuser',
    pin: '1234',
    role: 'user',
    rate: 50,
    active: 1
  };

  const user = { ...defaultUser, ...userData };
  
  // Hash the PIN
  const pinHash = await bcrypt.hash(user.pin, 4); // Low rounds for testing speed
  
  const stmt = testDb.prepare(`
    INSERT INTO users (name, username, pin_hash, role, rate, active)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  const result = stmt.run(
    user.name,
    user.username,
    pinHash,
    user.role,
    user.rate,
    user.active
  );
  
  return {
    id: result.lastInsertRowid,
    ...user
  };
}

/**
 * Create a test admin user
 */
async function createTestAdmin(userData = {}) {
  return createTestUser({
    name: 'Test Admin',
    username: 'testadmin',
    pin: '0000',
    role: 'admin',
    rate: 100,
    ...userData
  });
}

/**
 * Create test entries
 */
function createTestEntries(userId, count = 5) {
  const entries = [];
  const stmt = testDb.prepare(`
    INSERT INTO entries (user_id, date, hours, task, notes, tag, rate)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  for (let i = 0; i < count; i++) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const entry = {
      userId,
      date,
      hours: Math.random() * 8 + 1, // 1-9 hours
      task: `Test Task ${i + 1}`,
      notes: `Test notes for task ${i + 1}`,
      tag: ['Dev', 'Bug', 'Meeting', 'Call'][i % 4],
      rate: 50
    };

    const result = stmt.run(
      entry.userId,
      entry.date,
      entry.hours,
      entry.task,
      entry.notes,
      entry.tag,
      entry.rate
    );

    entries.push({
      id: result.lastInsertRowid,
      ...entry
    });
  }

  return entries;
}

/**
 * Create test invoice
 */
function createTestInvoice(userId, entryIds = []) {
  const stmt = testDb.prepare(`
    INSERT INTO invoices (user_id, status, total, period_start, period_end)
    VALUES (?, ?, ?, ?, ?)
  `);

  const invoice = {
    userId,
    status: 'submitted',
    total: 1000,
    periodStart: '2024-01-01',
    periodEnd: '2024-01-31'
  };

  const result = stmt.run(
    invoice.userId,
    invoice.status,
    invoice.total,
    invoice.periodStart,
    invoice.periodEnd
  );

  const invoiceId = result.lastInsertRowid;

  // Link entries to invoice if provided
  if (entryIds.length > 0) {
    const updateStmt = testDb.prepare(`
      UPDATE entries SET invoice_id = ? WHERE id = ?
    `);

    for (const entryId of entryIds) {
      updateStmt.run(invoiceId, entryId);
    }
  }

  return {
    id: invoiceId,
    ...invoice
  };
}

/**
 * Get test database connection
 */
function getTestDb() {
  return testDb;
}

/**
 * Clear all test data
 */
function clearTestData() {
  if (testDb) {
    const tables = ['audit_log', 'entries', 'invoices', 'users', 'settings'];
    
    for (const table of tables) {
      try {
        testDb.exec(`DELETE FROM ${table}`);
      } catch (error) {
        // Table might not exist, ignore
      }
    }
  }
}

/**
 * Cleanup test database
 */
async function cleanupTestDb() {
  if (testDb) {
    testDb.close();
    testDb = null;
  }
}

/**
 * Mock authentication middleware for testing
 */
function mockAuthUser(user) {
  return (req, res, next) => {
    req.user = user;
    next();
  };
}

/**
 * Test data generators
 */
const testData = {
  user: (overrides = {}) => ({
    name: 'Test User',
    username: 'testuser',
    pin: '1234',
    role: 'user',
    rate: 50,
    active: 1,
    ...overrides
  }),

  admin: (overrides = {}) => ({
    name: 'Test Admin',
    username: 'testadmin',
    pin: '0000',
    role: 'admin',
    rate: 100,
    active: 1,
    ...overrides
  }),

  entry: (overrides = {}) => ({
    date: new Date().toISOString().split('T')[0],
    hours: 8,
    task: 'Test Task',
    notes: 'Test notes',
    tag: 'Dev',
    rate: 50,
    ...overrides
  }),

  invoice: (overrides = {}) => ({
    status: 'draft',
    total: 1000,
    periodStart: '2024-01-01',
    periodEnd: '2024-01-31',
    ...overrides
  })
};

module.exports = {
  setupTestDb,
  cleanupTestDb,
  createTestUser,
  createTestAdmin,
  createTestEntries,
  createTestInvoice,
  getTestDb,
  clearTestData,
  mockAuthUser,
  testData
};