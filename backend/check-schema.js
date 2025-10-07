const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('timetracker.db', (err) => {
  if (err) {
    console.error('Error opening database:', err);
    return;
  }
  
  console.log('Connected to SQLite database');
  
  // Check users table schema
  db.all("PRAGMA table_info(users)", (err, rows) => {
    if (err) {
      console.error('Error checking users table:', err);
    } else {
      console.log('\nUsers table columns:');
      rows.forEach(row => {
        console.log(`  ${row.name}: ${row.type} ${row.notnull ? 'NOT NULL' : ''} ${row.pk ? 'PRIMARY KEY' : ''}`);
      });
    }
    
    // Check invoices table schema
    db.all("PRAGMA table_info(invoices)", (err, rows) => {
      if (err) {
        console.error('Error checking invoices table:', err);
      } else {
        console.log('\nInvoices table columns:');
        rows.forEach(row => {
          console.log(`  ${row.name}: ${row.type} ${row.notnull ? 'NOT NULL' : ''} ${row.pk ? 'PRIMARY KEY' : ''}`);
        });
      }
      
      db.close();
    });
  });
});