const db = require('./database.js');

async function checkTables() {
  try {
    const tables = await db.query('SELECT name FROM sqlite_master WHERE type="table" ORDER BY name;');
    console.log('=== EXISTING TABLES ===');
    tables.forEach(table => console.log(`- ${table.name}`));
    
    console.log('\n=== EMAIL_LOG TABLE CHECK ===');
    try {
      const emailLogInfo = await db.query('PRAGMA table_info(email_log);');
      if (emailLogInfo.length === 0) {
        console.log('❌ email_log table does not exist or has no columns');
      } else {
        console.log('✅ email_log table exists with columns:', emailLogInfo.map(c => c.name));
      }
    } catch (err) {
      console.log('❌ email_log table does not exist:', err.message);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkTables();