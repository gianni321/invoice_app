# Invoice App - Development Setup

## Quick Start Summary
After extensive troubleshooting and improvements, the application now has a reliable startup process and proper API routing.

## Key Solution Components

### 1. Vite Proxy Configuration
The critical fix was adding a proxy configuration to `frontend/vite.config.js` to route API calls from the frontend to the backend:

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

### 2. API URL Configuration  
Changed the API URL in `frontend/src/config.js` to use relative paths that work with the proxy:

```javascript
export const API_URL = '/api';  // Instead of 'http://localhost:3001/api'
```

### 3. Environment Variables Fix
Fixed the dotenv loading in `backend/server.js` to work regardless of working directory:

```javascript
require('dotenv').config({ path: __dirname + '/.env' });
```

### 4. Automated Startup Scripts
Created multiple startup options:
- `run.ps1` - PowerShell script
- `run.bat` - Windows batch file  
- `run-simple.js` - Cross-platform Node.js script

## Architecture Overview
- **Backend**: Express.js server on port 3001 with SQLite database
- **Frontend**: React + Vite on port 3000 with proxy to backend
- **Authentication**: PIN-based system with JWT tokens
- **API Routing**: Vite proxy handles `/api` requests to backend

## Testing
- Login with PIN `1234` (John Smith) works without 404 errors
- All API endpoints properly routed through proxy
- Both servers start reliably with startup scripts

## File Structure Changes
```
Added:
├── TROUBLESHOOTING_GUIDE.md  # Comprehensive troubleshooting documentation
├── SETUP_NOTES.md           # This file - quick reference  
├── run.ps1                  # PowerShell startup script
├── run.bat                  # Batch startup script
└── run-simple.js            # Node.js startup script

Modified:
├── frontend/vite.config.js  # Added proxy configuration
├── frontend/src/config.js   # Changed to relative API URLs  
└── backend/server.js        # Fixed dotenv path loading
```

---
*Solution implemented October 7, 2025 - Application now starts reliably with proper API routing.*