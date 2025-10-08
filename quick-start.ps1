# Simple Invoice App Startup Script
# This version avoids network timeouts and hangs

Write-Host "=== Simple Invoice App Startup ===" -ForegroundColor Green

# Kill existing processes
Write-Host "Cleaning up existing processes..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep 2

# Start Backend
Write-Host "Starting Backend Server..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\Users\Owner\Documents\code\invoice_app\backend'; node server.js" -WindowStyle Normal

# Wait a bit for backend to start
Start-Sleep 5

# Start Frontend  
Write-Host "Starting Frontend Server..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\Users\Owner\Documents\code\invoice_app\frontend'; npm run dev" -WindowStyle Normal

# Wait a bit for frontend to start
Start-Sleep 5

Write-Host ""
Write-Host "🚀 Servers are starting up!" -ForegroundColor Green
Write-Host "Backend should be at:  http://localhost:3001" -ForegroundColor Cyan
Write-Host "Frontend should be at: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Login with PIN: 1234" -ForegroundColor Yellow
Write-Host ""
Write-Host "Check the new PowerShell windows for server status." -ForegroundColor Gray