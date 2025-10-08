# Simple Invoice App Startup - Just Boot It Up!
Write-Host "BOOT IT UP - Invoice App Simple Startup" -ForegroundColor Green

# Clean slate
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep 2

# Start backend in new window
Write-Host "Starting backend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\Users\Owner\Documents\code\invoice_app\backend'; node server.js"

# Wait for backend
Start-Sleep 10

# Start frontend in new window  
Write-Host "Starting frontend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\Users\Owner\Documents\code\invoice_app\frontend'; npm run dev"

# Wait for frontend
Start-Sleep 12

Write-Host ""
Write-Host "Servers should be starting up!" -ForegroundColor Green
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Backend:  http://localhost:3001" -ForegroundColor Cyan
Write-Host "PIN: 1234" -ForegroundColor Yellow
Write-Host ""
Write-Host "If login does not work, wait 30 seconds and try again." -ForegroundColor Gray