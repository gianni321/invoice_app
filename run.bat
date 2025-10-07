@echo off
echo Starting Invoice App...

REM Kill any existing node processes
taskkill /F /IM node.exe 2>nul

REM Start backend in background
echo Starting backend server...
cd /d "%~dp0backend"
start /B node start.js

REM Wait a moment for backend to start
timeout /t 3 /nobreak >nul

REM Start frontend
echo Starting frontend server...
cd /d "%~dp0frontend"
start /B npx vite --port 3000 --host 0.0.0.0

REM Wait a moment for frontend to start
timeout /t 3 /nobreak >nul

echo.
echo ================================
echo   Invoice App is starting...
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:3001
echo ================================
echo.
echo Press any key to stop servers...
pause >nul

REM Clean shutdown
taskkill /F /IM node.exe 2>nul
echo Servers stopped.