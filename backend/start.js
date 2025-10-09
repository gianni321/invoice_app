const db = require('./database-loader');  // or './database-loader' if that module exports the db wrapper
const app = require('./server');         // your express app

(async () => {
    try {
        await db.initialize();
        const port = process.env.PORT || 3001;
        app.listen(port, '0.0.0.0', () => {
            console.log(`Server running on http://localhost:${port}`);
        });
    } catch (err) {
        console.error('Startup failed:', err);
        process.exit(1);
    }
})();