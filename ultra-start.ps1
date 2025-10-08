# Ultra-Reliable Invoice App Startup Script
# This script includes watchdog functionality to restart failed servers

param(
    [switch]$NoMonitoring
)

$ErrorActionPreference = "SilentlyContinue"

Write-Host "=== Ultra-Reliable Invoice App Startup ===" -ForegroundColor Green
Write-Host "This script will keep your servers running no matter what!" -ForegroundColor Yellow
Write-Host ""

# Kill everything first
Write-Host "🧹 Cleaning up existing processes..." -ForegroundColor Yellow
Get-Process -Name "node" | Stop-Process -Force
Get-Process -Name "npm" | Stop-Process -Force
Start-Sleep 3

# Function to start backend with retry
function Start-BackendWithRetry {
    $attempts = 0
    while ($attempts -lt 3) {
        $attempts++
        Write-Host "🖥️ Starting Backend Server (attempt $attempts)..." -ForegroundColor Green
        
        $backendProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\Users\Owner\Documents\code\invoice_app\backend'; Write-Host 'Starting backend server...' -ForegroundColor Green; node server.js" -WindowStyle Normal -PassThru
        
        # Wait and test
        Start-Sleep 8
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -UseBasicParsing -TimeoutSec 5
            if ($response.StatusCode -eq 200) {
                Write-Host "✅ Backend server is running!" -ForegroundColor Green
                return $backendProcess
            }
        }
        catch {
            Write-Host "❌ Backend attempt $attempts failed" -ForegroundColor Red
            if ($backendProcess -and !$backendProcess.HasExited) {
                $backendProcess.Kill()
            }
        }
    }
    throw "Backend failed to start after 3 attempts"
}

# Function to start frontend with retry
function Start-FrontendWithRetry {
    $attempts = 0
    while ($attempts -lt 3) {
        $attempts++
        Write-Host "🌐 Starting Frontend Server (attempt $attempts)..." -ForegroundColor Green
        
        $frontendProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\Users\Owner\Documents\code\invoice_app\frontend'; Write-Host 'Starting frontend server...' -ForegroundColor Green; npm run dev" -WindowStyle Normal -PassThru
        
        # Wait longer for frontend
        Start-Sleep 12
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 5
            if ($response.StatusCode -eq 200) {
                Write-Host "✅ Frontend server is running!" -ForegroundColor Green
                return $frontendProcess
            }
        }
        catch {
            Write-Host "❌ Frontend attempt $attempts failed: $($_.Exception.Message)" -ForegroundColor Red
            if ($frontendProcess -and !$frontendProcess.HasExited) {
                $frontendProcess.Kill()
            }
        }
    }
    throw "Frontend failed to start after 3 attempts"
}

# Function to monitor and restart servers
function Monitor-Servers {
    param($BackendProcess, $FrontendProcess)
    
    if ($NoMonitoring) {
        Write-Host "✅ Servers started. Monitoring disabled." -ForegroundColor Green
        return
    }
    
    Write-Host "🔍 Starting continuous monitoring..." -ForegroundColor Cyan
    Write-Host "Press Ctrl+C to stop monitoring and servers" -ForegroundColor Gray
    
    while ($true) {
        Start-Sleep 10
        
        # Check backend
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -UseBasicParsing -TimeoutSec 3
            if ($response.StatusCode -ne 200) { throw "Health check failed" }
            Write-Host "." -NoNewline -ForegroundColor Green
        }
        catch {
            Write-Host "`n❌ Backend down! Restarting..." -ForegroundColor Red
            try {
                $BackendProcess = Start-BackendWithRetry
            }
            catch {
                Write-Host "❌ Could not restart backend!" -ForegroundColor Red
                break
            }
        }
        
        # Check frontend
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 3
            if ($response.StatusCode -ne 200) { throw "Frontend check failed" }
            Write-Host "." -NoNewline -ForegroundColor Blue
        }
        catch {
            Write-Host "`n❌ Frontend down! Restarting..." -ForegroundColor Red
            try {
                $FrontendProcess = Start-FrontendWithRetry
            }
            catch {
                Write-Host "❌ Could not restart frontend!" -ForegroundColor Red
                break
            }
        }
    }
}

# Main execution
try {
    $backendProcess = Start-BackendWithRetry
    $frontendProcess = Start-FrontendWithRetry
    
    Write-Host ""
    Write-Host "🚀 Both servers are running successfully!" -ForegroundColor Green
    Write-Host "Backend:  http://localhost:3001" -ForegroundColor Cyan
    Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Login PIN: 1234" -ForegroundColor Yellow
    Write-Host ""
    
    # Test authentication
    Write-Host "🔐 Testing authentication..." -ForegroundColor Yellow
    $body = '{"pin":"1234"}'
    $authResponse = Invoke-WebRequest -Uri "http://localhost:3001/api/auth/login" -Method POST -Body $body -ContentType "application/json" -UseBasicParsing
    if ($authResponse.StatusCode -eq 200) {
        Write-Host "✅ Authentication test passed!" -ForegroundColor Green
    }
    
    Monitor-Servers -BackendProcess $backendProcess -FrontendProcess $frontendProcess
}
catch {
    Write-Host "❌ Startup failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Check the server windows for detailed error messages." -ForegroundColor Yellow
}
finally {
    Write-Host "`nStopping all servers..." -ForegroundColor Yellow
    Get-Process -Name "node" | Stop-Process -Force
    Get-Process -Name "npm" | Stop-Process -Force
}