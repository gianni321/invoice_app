const db = require('./database.js');

async function fixDatabase() {
  console.log('🔧 FIXING DATABASE ISSUES...\n');
  
  try {
    // 1. Create missing email_log table
    console.log('1. Creating email_log table...');
    await db.run(`
      CREATE TABLE IF NOT EXISTS email_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT,
        invoice_id INTEGER,
        to_email TEXT,
        sent_at TEXT
      )
    `);
    console.log('✅ email_log table created');
    
    // 2. Ensure all period columns exist in invoices table
    console.log('\n2. Checking invoices table columns...');
    const invoiceColumns = await db.query('PRAGMA table_info(invoices);');
    const existingCols = invoiceColumns.map(c => c.name);
    
    const requiredCols = [
      { name: 'period_start', type: 'TEXT' },
      { name: 'period_end', type: 'TEXT' },
      { name: 'paid_by_user_id', type: 'INTEGER' }
    ];
    
    for (const col of requiredCols) {
      if (!existingCols.includes(col.name)) {
        console.log(`Adding missing column: ${col.name}`);
        await db.run(`ALTER TABLE invoices ADD COLUMN ${col.name} ${col.type};`);
        console.log(`✅ Added ${col.name} column`);
      } else {
        console.log(`✅ ${col.name} column exists`);
      }
    }
    
    // 3. Verify all tables exist
    console.log('\n3. Final verification...');
    const tables = await db.query('SELECT name FROM sqlite_master WHERE type="table" ORDER BY name;');
    const tableNames = tables.map(t => t.name);
    
    const requiredTables = ['users', 'entries', 'invoices', 'audit_log', 'app_settings', 'email_log', 'batch_imports'];
    
    for (const table of requiredTables) {
      if (tableNames.includes(table)) {
        console.log(`✅ ${table} table exists`);
      } else {
        console.log(`❌ ${table} table missing!`);
      }
    }
    
    console.log('\n🎉 Database fixes completed!');
    
  } catch (error) {
    console.error('❌ Error fixing database:', error);
  }
  
  process.exit(0);
}

fixDatabase();