const knex = require('knex');
const { Model } = require('objection');
const config = require('./knexfile');

const environment = process.env.NODE_ENV || 'development';
const knexConfig = config[environment];

// Initialize Knex instance
const db = knex(knexConfig);

// Bind Objection.js to the knex instance
Model.knex(db);

// Database health check
const checkConnection = async () => {
  try {
    await db.raw('SELECT 1');
    console.log('✅ Database connection established successfully');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
};

// Graceful shutdown
const closeConnection = async () => {
  try {
    await db.destroy();
    console.log('📦 Database connection closed');
  } catch (error) {
    console.error('Error closing database connection:', error);
  }
};

// Auto-migrate in development
const runMigrations = async () => {
  try {
    const [batchNo, migrations] = await db.migrate.latest();
    if (migrations.length === 0) {
      console.log('📊 Database is up to date');
    } else {
      console.log(`📊 Ran migrations batch ${batchNo}: ${migrations.join(', ')}`);
    }
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  }
};

// Initialize database
const initializeDatabase = async () => {
  const isConnected = await checkConnection();
  if (!isConnected) {
    throw new Error('Failed to establish database connection');
  }

  if (environment === 'development' || environment === 'test') {
    await runMigrations();
  }

  return db;
};

module.exports = {
  db,
  initializeDatabase,
  checkConnection,
  closeConnection,
  runMigrations
};