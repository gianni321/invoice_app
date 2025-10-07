const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'backend', 'timetracker.db');

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Connected to SQLite database');
    
    // Check users table
    db.all('SELECT id, name, role FROM users', (err, rows) => {
      if (err) {
        console.error('Error querying users:', err);
      } else {
        console.log('Users in database:');
        console.table(rows);
      }
      
      db.close();
    });
  }
});