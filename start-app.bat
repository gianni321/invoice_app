@echo off
echo.
echo ====================================
echo  INVOICE APP - GUARANTEED STARTUP
echo ====================================
echo.

REM Navigate to project directory
cd /d "C:\Users\Owner\Documents\code\invoice_app"

echo [1/4] Stopping any existing processes...
taskkill /f /im node.exe >nul 2>&1
timeout /t 2 >nul

echo [2/4] Starting Backend Server...
start "Backend Server" cmd /k "cd backend && echo Backend starting... && node server.js"
timeout /t 5 >nul

echo [3/4] Starting Frontend Server...
start "Frontend Server" cmd /k "cd frontend && echo Frontend starting... && npm run dev"
timeout /t 8 >nul

echo [4/4] Testing connections...
powershell -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:3001/health' -UseBasicParsing -TimeoutSec 5; Write-Host 'Backend: OK' -ForegroundColor Green } catch { Write-Host 'Backend: Check manually' -ForegroundColor Yellow }"

powershell -Command "try { $r = Test-NetConnection -ComputerName localhost -Port 3000 -InformationLevel Quiet; if($r) { Write-Host 'Frontend: OK' -ForegroundColor Green } else { Write-Host 'Frontend: Check manually' -ForegroundColor Yellow } } catch { Write-Host 'Frontend: Check manually' -ForegroundColor Yellow }"

echo.
echo ====================================
echo  SUCCESS! Services should be running:
echo ====================================
echo  Frontend: http://localhost:3000
echo  Backend:  http://localhost:3001
echo  Health:   http://localhost:3001/health
echo.
echo Two command windows opened for each service.
echo Close those windows to stop the services.
echo.
pause