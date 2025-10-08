# Invoice App Server Startup Script
# This script handles all startup issues and provides robust server management

Write-Host "=== Invoice App Server Startup ===" -ForegroundColor Green
Write-Host "Checking and cleaning up existing processes..." -ForegroundColor Yellow

# Function to check if port is in use
function Test-Port {
    param([int]$Port)
    try {
        $tcpClient = New-Object System.Net.Sockets.TcpClient
        $connect = $tcpClient.BeginConnect("127.0.0.1", $Port, $null, $null)
        $wait = $connect.AsyncWaitHandle.WaitOne(1000, $false)
        if ($wait) {
            try {
                $tcpClient.EndConnect($connect)
                $tcpClient.Close()
                return $true
            }
            catch {
                return $false
            }
        }
        else {
            $tcpClient.Close()
            return $false
        }
    }
    catch {
        return $false
    }
}

# Function to find process using a port
function Get-ProcessOnPort {
    param([int]$Port)
    try {
        $netstat = netstat -ano | findstr ":$Port "
        if ($netstat) {
            $processId = ($netstat -split '\s+')[-1]
            return Get-Process -Id $processId -ErrorAction SilentlyContinue
        }
    }
    catch {}
    return $null
}

# Stop any existing node processes
Write-Host "Stopping existing node processes..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | ForEach-Object {
    Write-Host "Stopping node process PID $($_.Id)" -ForegroundColor Red
    Stop-Process -Id $_.Id -Force
}

# Wait for processes to fully terminate
Start-Sleep 3

# Check and clear ports 3000 and 3001
foreach ($port in @(3000, 3001)) {
    if (Test-Port $port) {
        Write-Host "Port $port is still in use, attempting to free it..." -ForegroundColor Red
        $process = Get-ProcessOnPort $port
        if ($process) {
            Write-Host "Killing process $($process.ProcessName) (PID: $($process.Id)) using port $port" -ForegroundColor Red
            Stop-Process -Id $process.Id -Force
            Start-Sleep 2
        }
    }
}

# Set working directory
Set-Location $PSScriptRoot

# Start Backend Server
Write-Host "Starting Backend Server..." -ForegroundColor Green
$backendJob = Start-Job -ScriptBlock {
    Set-Location $using:PSScriptRoot\backend
    node server.js
}

# Wait for backend to start
Write-Host "Waiting for backend to start..." -ForegroundColor Yellow
$backendReady = $false
$attempts = 0
while (!$backendReady -and $attempts -lt 30) {
    Start-Sleep 1
    $attempts++
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:3001/api/health" -Method Get -TimeoutSec 3 -ErrorAction Stop
        if ($response.status -eq "OK") {
            $backendReady = $true
            Write-Host "✅ Backend server is ready!" -ForegroundColor Green
        }
    }
    catch {
        Write-Host "." -NoNewline -ForegroundColor Yellow
    }
}

if (!$backendReady) {
    Write-Host "❌ Backend server failed to start!" -ForegroundColor Red
    Receive-Job $backendJob
    exit 1
}

# Start Frontend Server
Write-Host "Starting Frontend Server..." -ForegroundColor Green
$frontendJob = Start-Job -ScriptBlock {
    Set-Location $using:PSScriptRoot\frontend
    npx vite --port 3000 --host 0.0.0.0
}

# Wait for frontend to start
Write-Host "Waiting for frontend to start..." -ForegroundColor Yellow
$frontendReady = $false
$attempts = 0
while (!$frontendReady -and $attempts -lt 30) {
    Start-Sleep 1
    $attempts++
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            $frontendReady = $true
            Write-Host "✅ Frontend server is ready!" -ForegroundColor Green
        }
    }
    catch {
        Write-Host "." -NoNewline -ForegroundColor Yellow
    }
}

if (!$frontendReady) {
    Write-Host "❌ Frontend server failed to start!" -ForegroundColor Red
    Receive-Job $frontendJob
    exit 1
}

Write-Host ""
Write-Host "🚀 Both servers are running successfully!" -ForegroundColor Green
Write-Host "Backend:  http://localhost:3001" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Login with PIN: 1234" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press Ctrl+C to stop both servers" -ForegroundColor Gray

# Keep script running and monitor servers
try {
    while ($true) {
        Start-Sleep 5
        
        # Check if backend is still running
        try {
            $backendCheck = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
            if ($backendCheck.StatusCode -ne 200) {
                throw "Backend health check failed"
            }
        }
        catch {
            Write-Host "❌ Backend server is down! Restarting..." -ForegroundColor Red
            $backendJob = Start-Job -ScriptBlock {
                Set-Location $using:PSScriptRoot\backend
                node server.js
            }
            Start-Sleep 3
        }
        
        # Check if frontend is still running
        try {
            $frontendCheck = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
            if ($frontendCheck.StatusCode -ne 200) {
                throw "Frontend health check failed"
            }
        }
        catch {
            Write-Host "❌ Frontend server is down! Restarting..." -ForegroundColor Red
            $frontendJob = Start-Job -ScriptBlock {
                Set-Location $using:PSScriptRoot\frontend
                npx vite --port 3000 --host 0.0.0.0
            }
            Start-Sleep 3
        }
    }
}
finally {
    Write-Host "Stopping servers..." -ForegroundColor Yellow
    Stop-Job $backendJob -ErrorAction SilentlyContinue
    Stop-Job $frontendJob -ErrorAction SilentlyContinue
    Remove-Job $backendJob -ErrorAction SilentlyContinue
    Remove-Job $frontendJob -ErrorAction SilentlyContinue
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
    Write-Host "All servers stopped." -ForegroundColor Green
}