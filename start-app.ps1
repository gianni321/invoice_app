# Invoice App Startup Script - RELIABLE VERSION
# This script ensures both frontend and backend start properly

param(
    [switch]$KillExisting = $false
)

Write-Host "🚀 Invoice App Startup Script" -ForegroundColor Green
Write-Host "==============================" -ForegroundColor Green

# Function to kill processes on specific ports
function Stop-ProcessOnPort {
    param([int]$Port)
    
    $processes = netstat -ano | Select-String ":$Port\s" | ForEach-Object {
        ($_ -split '\s+')[-1]
    } | Where-Object { $_ -ne '0' } | Sort-Object -Unique
    
    foreach ($pid in $processes) {
        try {
            Write-Host "🔄 Stopping process on port $Port (PID: $pid)" -ForegroundColor Yellow
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 1
        }
        catch {
            Write-Host "❌ Could not stop process $pid" -ForegroundColor Red
        }
    }
}

# Kill existing processes if requested
if ($KillExisting) {
    Write-Host "🔄 Stopping existing services..." -ForegroundColor Yellow
    Stop-ProcessOnPort 3000
    Stop-ProcessOnPort 3001
    Start-Sleep -Seconds 3
}

# Check if ports are available
Write-Host "🔍 Checking port availability..." -ForegroundColor Cyan

$port3000 = (Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue)
$port3001 = (Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue)

if ($port3000) {
    Write-Host "⚠️  Port 3000 is already in use. Use -KillExisting to stop existing processes." -ForegroundColor Yellow
}

if ($port3001) {
    Write-Host "⚠️  Port 3001 is already in use. Use -KillExisting to stop existing processes." -ForegroundColor Yellow
}

# Set location to project root
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectRoot

Write-Host "📁 Project directory: $projectRoot" -ForegroundColor Cyan

# Verify directories exist
if (-not (Test-Path "backend")) {
    Write-Host "❌ Backend directory not found!" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path "frontend")) {
    Write-Host "❌ Frontend directory not found!" -ForegroundColor Red
    exit 1
}

# Check if backend dependencies are installed
Write-Host "🔍 Checking backend dependencies..." -ForegroundColor Cyan
if (-not (Test-Path "backend/node_modules")) {
    Write-Host "📦 Installing backend dependencies..." -ForegroundColor Yellow
    Set-Location "backend"
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install backend dependencies!" -ForegroundColor Red
        exit 1
    }
    Set-Location ".."
}

# Check if frontend dependencies are installed
Write-Host "🔍 Checking frontend dependencies..." -ForegroundColor Cyan
if (-not (Test-Path "frontend/node_modules")) {
    Write-Host "📦 Installing frontend dependencies..." -ForegroundColor Yellow
    Set-Location "frontend"
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install frontend dependencies!" -ForegroundColor Red
        exit 1
    }
    Set-Location ".."
}

# Function to start backend
function Start-Backend {
    Write-Host "🖥️  Starting backend server..." -ForegroundColor Green
    Set-Location "backend"
    
    # Start backend in background
    $backendJob = Start-Job -ScriptBlock {
        param($workingDir)
        Set-Location $workingDir
        node server.js
    } -ArgumentList (Get-Location)
    
    Set-Location ".."
    
    # Wait for backend to start
    $maxAttempts = 30
    $attempt = 0
    
    do {
        Start-Sleep -Seconds 1
        $attempt++
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) {
                Write-Host "✅ Backend is running on http://localhost:3001" -ForegroundColor Green
                Write-Host "🏥 Health endpoint: http://localhost:3001/health" -ForegroundColor Green
                return $backendJob
            }
        }
        catch {
            # Continue waiting
        }
        
        if ($attempt -eq $maxAttempts) {
            Write-Host "❌ Backend failed to start after $maxAttempts seconds!" -ForegroundColor Red
            Stop-Job $backendJob -ErrorAction SilentlyContinue
            Remove-Job $backendJob -ErrorAction SilentlyContinue
            return $null
        }
        
        Write-Host "⏳ Waiting for backend... ($attempt/$maxAttempts)" -ForegroundColor Yellow
    } while ($true)
}

# Function to start frontend
function Start-Frontend {
    Write-Host "🌐 Starting frontend server..." -ForegroundColor Green
    Set-Location "frontend"
    
    # Start frontend in background
    $frontendJob = Start-Job -ScriptBlock {
        param($workingDir)
        Set-Location $workingDir
        npm run dev
    } -ArgumentList (Get-Location)
    
    Set-Location ".."
    
    # Wait for frontend to start
    $maxAttempts = 30
    $attempt = 0
    
    do {
        Start-Sleep -Seconds 1
        $attempt++
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) {
                Write-Host "✅ Frontend is running on http://localhost:3000" -ForegroundColor Green
                return $frontendJob
            }
        }
        catch {
            # Continue waiting
        }
        
        if ($attempt -eq $maxAttempts) {
            Write-Host "❌ Frontend failed to start after $maxAttempts seconds!" -ForegroundColor Red
            Stop-Job $frontendJob -ErrorAction SilentlyContinue
            Remove-Job $frontendJob -ErrorAction SilentlyContinue
            return $null
        }
        
        Write-Host "⏳ Waiting for frontend... ($attempt/$maxAttempts)" -ForegroundColor Yellow
    } while ($true)
}

# Start services
Write-Host "`n🚀 Starting services..." -ForegroundColor Green

# Start backend first
$backendJob = Start-Backend
if (-not $backendJob) {
    Write-Host "❌ Failed to start backend! Exiting." -ForegroundColor Red
    exit 1
}

# Start frontend
$frontendJob = Start-Frontend
if (-not $frontendJob) {
    Write-Host "❌ Failed to start frontend! Stopping backend..." -ForegroundColor Red
    Stop-Job $backendJob -ErrorAction SilentlyContinue
    Remove-Job $backendJob -ErrorAction SilentlyContinue
    exit 1
}

# Success message
Write-Host "`n🎉 SUCCESS! Both services are running:" -ForegroundColor Green
Write-Host "   📱 Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "   🖥️  Backend:  http://localhost:3001" -ForegroundColor Cyan
Write-Host "   🏥 Health:   http://localhost:3001/health" -ForegroundColor Cyan
Write-Host "`n📝 To stop services:" -ForegroundColor Yellow
Write-Host "   ./start-app.ps1 -KillExisting" -ForegroundColor Yellow
Write-Host "`n⏳ Services will continue running in background..." -ForegroundColor Green
Write-Host "   Check Task Manager or use Get-Job to monitor" -ForegroundColor Green

# Keep script running to monitor jobs
Write-Host "`n🔍 Monitoring services (Ctrl+C to exit monitoring)..." -ForegroundColor Cyan
try {
    while ($true) {
        Start-Sleep -Seconds 10
        
        # Check if jobs are still running
        $backendStatus = Get-Job -Id $backendJob.Id -ErrorAction SilentlyContinue
        $frontendStatus = Get-Job -Id $frontendJob.Id -ErrorAction SilentlyContinue
        
        if ($backendStatus.State -ne "Running") {
            Write-Host "⚠️  Backend job stopped!" -ForegroundColor Red
            break
        }
        
        if ($frontendStatus.State -ne "Running") {
            Write-Host "⚠️  Frontend job stopped!" -ForegroundColor Red
            break
        }
        
        Write-Host "✅ Services running ($(Get-Date -Format 'HH:mm:ss'))" -ForegroundColor Green
    }
}
catch {
    Write-Host "`n👋 Monitoring stopped. Services continue running in background." -ForegroundColor Yellow
}