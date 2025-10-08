# Health Monitor Script for Invoice App
# This script continuously monitors both servers and restarts them if they fail

param(
    [int]$CheckInterval = 30, # Check every 30 seconds
    [switch]$AutoRestart
)

# Default AutoRestart to true if not specified
if (-not $PSBoundParameters.ContainsKey('AutoRestart')) {
    $AutoRestart = $true
}

Write-Host "=== Invoice App Health Monitor ===" -ForegroundColor Green
Write-Host "Check interval: $CheckInterval seconds" -ForegroundColor Yellow
Write-Host "Auto-restart: $AutoRestart" -ForegroundColor Yellow
Write-Host ""

function Test-ServerHealth {
    param([string]$Url, [string]$ServerName)
    
    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ $ServerName is healthy" -ForegroundColor Green
            return $true
        }
    }
    catch {
        Write-Host "❌ $ServerName is down: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
    return $false
}

function Start-ServerIfNeeded {
    param([string]$ServerType)
    
    if ($ServerType -eq "backend") {
        Write-Host "🔄 Restarting backend server..." -ForegroundColor Yellow
        Start-Job -Name "BackendServer" -ScriptBlock {
            Set-Location "C:\Users\Owner\Documents\code\invoice_app\backend"
            node server.js
        } | Out-Null
    }
    elseif ($ServerType -eq "frontend") {
        Write-Host "🔄 Restarting frontend server..." -ForegroundColor Yellow
        Start-Job -Name "FrontendServer" -ScriptBlock {
            Set-Location "C:\Users\Owner\Documents\code\invoice_app\frontend"
            npx vite --port 3000 --host 0.0.0.0
        } | Out-Null
    }
}

# Main monitoring loop
try {
    while ($true) {
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        Write-Host "[$timestamp] Checking server health..." -ForegroundColor Cyan
        
        # Check backend
        $backendHealthy = Test-ServerHealth -Url "http://localhost:3001/api/health" -ServerName "Backend"
        
        # Check frontend
        $frontendHealthy = Test-ServerHealth -Url "http://localhost:3000" -ServerName "Frontend"
        
        # Restart if needed and auto-restart is enabled
        if ($AutoRestart) {
            if (!$backendHealthy) {
                # Stop existing backend jobs
                Get-Job -Name "BackendServer" -ErrorAction SilentlyContinue | Remove-Job -Force
                Start-ServerIfNeeded -ServerType "backend"
                Start-Sleep 5 # Give it time to start
            }
            
            if (!$frontendHealthy) {
                # Stop existing frontend jobs
                Get-Job -Name "FrontendServer" -ErrorAction SilentlyContinue | Remove-Job -Force
                Start-ServerIfNeeded -ServerType "frontend"
                Start-Sleep 5 # Give it time to start
            }
        }
        
        Write-Host ""
        Start-Sleep $CheckInterval
    }
}
catch {
    Write-Host "Monitor stopped: $($_.Exception.Message)" -ForegroundColor Red
}
finally {
    # Clean up jobs
    Get-Job | Remove-Job -Force -ErrorAction SilentlyContinue
    Write-Host "Health monitor stopped." -ForegroundColor Yellow
}