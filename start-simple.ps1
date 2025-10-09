# Simple Invoice App Startup - WORKS EVERY TIME
Write-Host "🚀 Starting Invoice App..." -ForegroundColor Green

# Kill any existing processes on our ports
Write-Host "🔄 Cleaning up existing processes..." -ForegroundColor Yellow
Get-Process | Where-Object {$_.ProcessName -eq "node"} | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Navigate to project directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

Write-Host "📁 Working in: $scriptDir" -ForegroundColor Cyan

# Start backend
Write-Host "🖥️  Starting backend..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$scriptDir\backend'; Write-Host 'Backend Starting...' -ForegroundColor Green; node server.js"

# Wait for backend
Write-Host "⏳ Waiting for backend to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Test backend
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3001/health" -TimeoutSec 5
    Write-Host "✅ Backend is ready!" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Backend may still be starting..." -ForegroundColor Yellow
}

# Start frontend
Write-Host "🌐 Starting frontend..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$scriptDir\frontend'; Write-Host 'Frontend Starting...' -ForegroundColor Green; npm run dev"

# Wait for frontend
Write-Host "⏳ Waiting for frontend to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 8

# Test frontend
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 5
    Write-Host "✅ Frontend is ready!" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Frontend may still be starting..." -ForegroundColor Yellow
}

Write-Host "`n🎉 SUCCESS! Services should be running:" -ForegroundColor Green
Write-Host "   📱 Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "   🖥️  Backend:  http://localhost:3001" -ForegroundColor Cyan
Write-Host "   🏥 Health:   http://localhost:3001/health" -ForegroundColor Cyan

Write-Host "`n📝 Two PowerShell windows opened for each service" -ForegroundColor Yellow
Write-Host "   Close those windows to stop the services" -ForegroundColor Yellow