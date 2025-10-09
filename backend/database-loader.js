const db = require('./database');
(async () => {
  try {
    await db.initialize();
    console.log('DB ready');
  } catch (e) {
    console.error('DB init failed:', e);
    process.exit(1);
  }
})();
module.exports = db;