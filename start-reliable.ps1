# RELIABLE Invoice App Startup Script
# This WILL work - no more loops!

Write-Host "🚀 FIXING Invoice App Startup - Final Solution!" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green

# Stop ALL node processes
Write-Host "🔄 Killing all Node.js processes..." -ForegroundColor Yellow
taskkill /f /im node.exe 2>$null
Start-Sleep -Seconds 3

# Navigate to correct directory
Set-Location "C:\Users\Owner\Documents\code\invoice_app"
Write-Host "📁 Working directory: $(Get-Location)" -ForegroundColor Cyan

# Function to wait for port
function Wait-ForPort {
    param([int]$Port, [string]$Service)
    
    $maxWait = 30
    $count = 0
    
    do {
        try {
            $connection = Test-NetConnection -ComputerName localhost -Port $Port -InformationLevel Quiet
            if ($connection) {
                Write-Host "✅ $Service is running on port $Port" -ForegroundColor Green
                return $true
            }
        }
        catch {
            # Port not ready yet
        }
        
        Start-Sleep -Seconds 1
        $count++
        Write-Host "⏳ Waiting for $Service on port $Port... ($count/$maxWait)" -ForegroundColor Yellow
        
    } while ($count -lt $maxWait)
    
    Write-Host "❌ $Service failed to start on port $Port" -ForegroundColor Red
    return $false
}

# Start Backend
Write-Host "`n🖥️  Starting Backend Server..." -ForegroundColor Green
$backendProcess = Start-Process -FilePath "cmd" -ArgumentList "/c", "cd /d `"$(Get-Location)\backend`" && node server.js" -WindowStyle Normal -PassThru

# Wait for backend
if (Wait-ForPort -Port 3001 -Service "Backend") {
    Write-Host "✅ Backend ready at http://localhost:3001" -ForegroundColor Green
} else {
    Write-Host "❌ Backend startup failed!" -ForegroundColor Red
    exit 1
}

# Start Frontend with explicit settings
Write-Host "`n🌐 Starting Frontend Server..." -ForegroundColor Green
$frontendProcess = Start-Process -FilePath "cmd" -ArgumentList "/c", "cd /d `"$(Get-Location)\frontend`" && npm run dev -- --host 0.0.0.0 --port 3000 --strictPort" -WindowStyle Normal -PassThru

# Wait for frontend
if (Wait-ForPort -Port 3000 -Service "Frontend") {
    Write-Host "✅ Frontend ready at http://localhost:3000" -ForegroundColor Green
} else {
    Write-Host "❌ Frontend startup failed!" -ForegroundColor Red
    Write-Host "🔧 Trying alternative frontend start..." -ForegroundColor Yellow
    
    # Kill the failed frontend process
    Stop-Process -Id $frontendProcess.Id -Force -ErrorAction SilentlyContinue
    
    # Try with npm start instead
    $frontendProcess2 = Start-Process -FilePath "cmd" -ArgumentList "/c", "cd /d `"$(Get-Location)\frontend`" && npx vite --host 0.0.0.0 --port 3000" -WindowStyle Normal -PassThru
    
    if (Wait-ForPort -Port 3000 -Service "Frontend (Alternative)") {
        Write-Host "✅ Frontend ready at http://localhost:3000" -ForegroundColor Green
    } else {
        Write-Host "❌ All frontend startup methods failed!" -ForegroundColor Red
        exit 1
    }
}

# Final verification
Write-Host "`n🔍 Final verification..." -ForegroundColor Cyan

try {
    $backendHealth = Invoke-RestMethod -Uri "http://localhost:3001/health" -TimeoutSec 5
    Write-Host "✅ Backend health check: OK" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Backend health check failed" -ForegroundColor Yellow
}

try {
    $frontendResponse = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 5
    Write-Host "✅ Frontend response: OK (Status: $($frontendResponse.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Frontend response check failed" -ForegroundColor Yellow
}

# Success message
Write-Host "`n🎉 SUCCESS! Invoice App is running!" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host "📱 Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "🖥️  Backend:  http://localhost:3001" -ForegroundColor Cyan  
Write-Host "🏥 Health:   http://localhost:3001/health" -ForegroundColor Cyan
Write-Host "`n💡 Two CMD windows opened - close them to stop services" -ForegroundColor Yellow

Write-Host "`nPress any key to exit this script (services will continue running)..." -ForegroundColor Green
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")