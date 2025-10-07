# Invoice App Troubleshooting Guide

## 🚀 Quick Start (Working Solution)

### The Easy Way
Run one of these startup scripts from the root directory:
```bash
# Windows PowerShell
.\run.ps1

# Windows Command Prompt  
.\run.bat

# Cross-platform Node.js
node run-simple.js
```

### Manual Startup
```bash
# Terminal 1: Start Backend
cd backend
node server.js

# Terminal 2: Start Frontend  
cd frontend
npm run dev
```

## 🔧 Critical Fixes Applied

### 1. API Routing Issue (SOLVED ✅)
**Problem**: Frontend API calls were getting 404 errors because they were trying to hit `localhost:3000/api/` instead of the backend at `localhost:3001/api/`

**Solution**: Added Vite proxy configuration in `frontend/vite.config.js`:
```javascript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
})
```

**Also changed** `frontend/src/config.js`:
```javascript
// Before (BROKEN)
export const API_URL = 'http://localhost:3001/api';

// After (WORKING)  
export const API_URL = '/api';
```

### 2. Environment Variables Issue (SOLVED ✅)
**Problem**: JWT_SECRET not loading from .env file when server started from wrong directory

**Solution**: Fixed dotenv path in `backend/server.js`:
```javascript
// Added explicit path resolution
require('dotenv').config({ path: __dirname + '/.env' });
```

### 3. Port Configuration (SOLVED ✅)
**Problem**: Frontend was trying to run on port 5173 but had conflicts

**Solution**: 
- Backend runs on port 3001
- Frontend runs on port 3000  
- Vite proxy routes `/api` calls from frontend to backend

## 🛠 Common Issues & Solutions

### "Failed to fetch" or "This site can't be reached"
1. **Check if both servers are running**:
   ```bash
   # Check backend
   netstat -ano | findstr :3001
   
   # Check frontend
   netstat -ano | findstr :3000
   ```

2. **Kill stuck processes**:
   ```bash
   taskkill /F /IM node.exe
   ```

3. **Restart both servers** using the startup scripts

### Authentication Issues
- **Demo PINs available**:
  - `0000` - Admin User
  - `1234` - John Smith  
  - `5678` - Sarah Johnson
  - `9012` - Mike Chen

### Database Issues
- Database file: `backend/timetracker.db`
- Check database: `cd backend && node check-db.js`
- Demo users are pre-loaded

## 📁 Project Structure
```
invoice_app/
├── run.ps1              # PowerShell startup script
├── run.bat              # Batch startup script  
├── run-simple.js        # Node.js startup script
├── backend/             # Express.js API server (port 3001)
│   ├── server.js        # Main server file
│   ├── .env             # Environment variables
│   └── timetracker.db   # SQLite database
└── frontend/            # React + Vite app (port 3000)
    ├── vite.config.js   # Vite config with proxy
    └── src/config.js    # API configuration
```

## 🔄 Startup Process
1. **Kill existing processes** to avoid port conflicts
2. **Start backend server** on port 3001
3. **Start frontend server** on port 3000 with proxy configuration
4. **Frontend proxy routes** `/api` calls to backend automatically

## 🎯 Key Learning Points
1. **Vite proxy is essential** for frontend/backend communication in development
2. **Working directory matters** for environment variable loading
3. **Port conflicts** can cause mysterious connection issues
4. **Relative API URLs** work better with proxy configuration than absolute URLs

## ✅ Verification Steps
1. Backend accessible at: `http://localhost:3001`
2. Frontend accessible at: `http://localhost:3000`  
3. API calls from frontend automatically proxy to backend
4. Login with PIN `1234` should work without 404 errors

---
*This guide documents the solution to persistent connectivity and API routing issues that were resolved on October 7, 2025.*