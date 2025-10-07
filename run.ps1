# Kill any existing processes
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force

Write-Host "Starting Invoice App..." -ForegroundColor Green

# Start backend
Write-Host "Starting backend server..." -ForegroundColor Yellow
Set-Location "$PSScriptRoot\backend"
Start-Process -FilePath "node" -ArgumentList "start.js" -WindowStyle Hidden

# Wait for backend to start
Start-Sleep -Seconds 3

# Start frontend  
Write-Host "Starting frontend server..." -ForegroundColor Yellow
Set-Location "$PSScriptRoot\frontend"
Start-Process -FilePath "npx" -ArgumentList "vite", "--port", "3000", "--host", "0.0.0.0" -WindowStyle Hidden

# Wait for frontend to start
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "   Invoice App is running!" -ForegroundColor Green
Write-Host "   Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "   Backend:  http://localhost:3001" -ForegroundColor White
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press CTRL+C to stop servers..." -ForegroundColor Yellow

# Keep script running
try {
    while ($true) {
        Start-Sleep -Seconds 1
    }
} finally {
    Write-Host "Stopping servers..." -ForegroundColor Red
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
    Write-Host "Servers stopped." -ForegroundColor Green
}