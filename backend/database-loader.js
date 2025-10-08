// Dynamic database loader - chooses between SQLite and MySQL based on environment
const dbClient = process.env.DB_CLIENT || 'sqlite';

let database;

if (dbClient === 'mysql') {
  console.log('Using MySQL database');
  database = require('./database-mysql');
} else {
  console.log('Using SQLite database');
  database = require('./database');
}

module.exports = database;