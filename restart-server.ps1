# PowerShell script to restart the invoice app server# PowerShell script to restart the invoice app server

# This script kills any existing Node processes and starts the server fresh# This script kills any existing Node processes and starts the server fresh



Write-Host "🔄 Restarting Invoice App Server..." -ForegroundColor YellowWrite-Host "🔄 Restarting Invoice App Server..." -ForegroundColor Yellow



# Kill any existing Node.js processes# Kill any existing Node.js processes

Write-Host "🛑 Stopping existing Node.js processes..." -ForegroundColor RedWrite-Host "🛑 Stopping existing Node.js processes..." -ForegroundColor Red

try {try {

    $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue    $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue

    if ($nodeProcesses) {    if ($nodeProcesses) {

        $nodeProcesses | Stop-Process -Force        $nodeProcesses | Stop-Process -Force

        Write-Host "✅ Stopped $($nodeProcesses.Count) Node.js process(es)" -ForegroundColor Green        Write-Host "✅ Stopped $($nodeProcesses.Count) Node.js process(es)" -ForegroundColor Green

        Start-Sleep -Seconds 2  # Give processes time to fully stop        Start-Sleep -Seconds 2  # Give processes time to fully stop

    } else {    } else {

        Write-Host "ℹ️  No existing Node.js processes found" -ForegroundColor Cyan        Write-Host "ℹ️  No existing Node.js processes found" -ForegroundColor Cyan

    }    }

} catch {} catch {

    Write-Host "⚠️  Error stopping processes: $($_.Exception.Message)" -ForegroundColor Yellow    Write-Host "⚠️  Error stopping processes: $($_.Exception.Message)" -ForegroundColor Yellow

}}



# Check if ports are free# Check if ports are free

Write-Host "🔍 Checking port availability..." -ForegroundColor BlueWrite-Host "🔍 Checking port availability..." -ForegroundColor Blue

$port3001 = netstat -an | Select-String ":3001.*LISTENING"$port3001 = netstat -an | Select-String ":3001.*LISTENING"

$port5173 = netstat -an | Select-String ":5173.*LISTENING"$port5173 = netstat -an | Select-String ":5173.*LISTENING"



if ($port3001) {if ($port3001) {

    Write-Host "⚠️  Port 3001 still in use, attempting to free it..." -ForegroundColor Yellow    Write-Host "⚠️  Port 3001 still in use, attempting to free it..." -ForegroundColor Yellow

    # Find and kill process using port 3001    # Find and kill process using port 3001

    $proc = netstat -ano | Select-String ":3001.*LISTENING" | ForEach-Object { ($_ -split '\s+')[-1] }    $proc = netstat -ano | Select-String ":3001.*LISTENING" | ForEach-Object { ($_ -split '\s+')[-1] }

    if ($proc) {    if ($proc) {

        Stop-Process -Id $proc -Force -ErrorAction SilentlyContinue        Stop-Process -Id $proc -Force -ErrorAction SilentlyContinue

        Start-Sleep -Seconds 1        Start-Sleep -Seconds 1

    }    }

}}



if ($port5173) {if ($port5173) {

    Write-Host "⚠️  Port 5173 still in use, attempting to free it..." -ForegroundColor Yellow    Write-Host "⚠️  Port 5173 still in use, attempting to free it..." -ForegroundColor Yellow

    # Find and kill process using port 5173    # Find and kill process using port 5173

    $proc = netstat -ano | Select-String ":5173.*LISTENING" | ForEach-Object { ($_ -split '\s+')[-1] }    $proc = netstat -ano | Select-String ":5173.*LISTENING" | ForEach-Object { ($_ -split '\s+')[-1] }

    if ($proc) {    if ($proc) {

        Stop-Process -Id $proc -Force -ErrorAction SilentlyContinue        Stop-Process -Id $proc -Force -ErrorAction SilentlyContinue

        Start-Sleep -Seconds 1        Start-Sleep -Seconds 1

    }    }

}}



# Navigate to project directory# Navigate to project directory

$projectPath = "c:\Users\Owner\Documents\code\invoice_app"$projectPath = "c:\Users\Owner\Documents\code\invoice_app"

Set-Location $projectPathSet-Location $projectPath



Write-Host "📁 Working directory: $projectPath" -ForegroundColor CyanWrite-Host "📁 Working directory: $projectPath" -ForegroundColor Cyan



# Start the application (both backend and frontend)# Start the application (both backend and frontend)

Write-Host "🚀 Starting Invoice App (Backend + Frontend)..." -ForegroundColor GreenWrite-Host "🚀 Starting Invoice App (Backend + Frontend)..." -ForegroundColor Green

Write-Host "📊 Backend will be available at: http://localhost:3001" -ForegroundColor CyanWrite-Host "📊 Backend will be available at: http://localhost:3001" -ForegroundColor Cyan

Write-Host "🌐 Frontend will be available at: http://localhost:5173" -ForegroundColor CyanWrite-Host "🌐 Frontend will be available at: http://localhost:5173" -ForegroundColor Cyan

Write-Host ""Write-Host ""



# Start npm in the background and capture the process# Start npm in the background and capture the process

try {try {

    $npmProcess = Start-Process -FilePath "npm" -ArgumentList "start" -WorkingDirectory $projectPath -PassThru -WindowStyle Normal    $npmProcess = Start-Process -FilePath "npm" -ArgumentList "start" -WorkingDirectory $projectPath -PassThru -WindowStyle Normal

        

    Write-Host "✅ Server started successfully!" -ForegroundColor Green    Write-Host "✅ Server started successfully!" -ForegroundColor Green

    Write-Host "🆔 Process ID: $($npmProcess.Id)" -ForegroundColor Cyan    Write-Host "🆔 Process ID: $($npmProcess.Id)" -ForegroundColor Cyan

    Write-Host "🕐 Waiting 5 seconds for services to fully initialize..." -ForegroundColor Yellow    Write-Host "🕐 Waiting 5 seconds for services to fully initialize..." -ForegroundColor Yellow

        

    Start-Sleep -Seconds 5    Start-Sleep -Seconds 5

        

    # Check if services are responding    # Check if services are responding

    Write-Host "🔍 Testing service availability..." -ForegroundColor Blue    Write-Host "🔍 Testing service availability..." -ForegroundColor Blue

        

    try {    try {

        $backendTest = Invoke-WebRequest -Uri "http://localhost:3001/api" -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue        $backendTest = Invoke-WebRequest -Uri "http://localhost:3001/api" -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue

        if ($backendTest.StatusCode -eq 200) {        if ($backendTest.StatusCode -eq 200) {

            Write-Host "✅ Backend API is responding" -ForegroundColor Green            Write-Host "✅ Backend API is responding" -ForegroundColor Green

        }        }

    } catch {    } catch {

        Write-Host "⚠️  Backend API not yet responding (may still be starting up)" -ForegroundColor Yellow        Write-Host "⚠️  Backend API not yet responding (may still be starting up)" -ForegroundColor Yellow

    }    }

        

    try {    try {

        $frontendTest = Invoke-WebRequest -Uri "http://localhost:5173" -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue        $frontendTest = Invoke-WebRequest -Uri "http://localhost:5173" -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue

        if ($frontendTest) {        if ($frontendTest) {

            Write-Host "✅ Frontend is responding" -ForegroundColor Green            Write-Host "✅ Frontend is responding" -ForegroundColor Green

        }        }

    } catch {    } catch {

        Write-Host "⚠️  Frontend not yet responding (may still be starting up)" -ForegroundColor Yellow        Write-Host "⚠️  Frontend not yet responding (may still be starting up)" -ForegroundColor Yellow

    }    }

        

    Write-Host ""    Write-Host ""

    Write-Host "🎉 Invoice App should now be running!" -ForegroundColor Green    Write-Host "🎉 Invoice App should now be running!" -ForegroundColor Green

    Write-Host "📱 Open browser to: http://localhost:5173" -ForegroundColor Cyan    Write-Host "📱 Open browser to: http://localhost:5173" -ForegroundColor Cyan

    Write-Host "🔧 API endpoint: http://localhost:3001/api" -ForegroundColor Cyan    Write-Host "🔧 API endpoint: http://localhost:3001/api" -ForegroundColor Cyan

    Write-Host ""    Write-Host ""

    Write-Host "💡 To stop the server, press Ctrl+C in the npm terminal or run:" -ForegroundColor Yellow    Write-Host "💡 To stop the server, press Ctrl+C in the npm terminal or run:" -ForegroundColor Yellow

    Write-Host "   Stop-Process -Id $($npmProcess.Id) -Force" -ForegroundColor Gray    Write-Host "   Stop-Process -Id $($npmProcess.Id) -Force" -ForegroundColor Gray

        

} catch {} catch {

    Write-Host "❌ Failed to start server: $($_.Exception.Message)" -ForegroundColor Red    Write-Host "❌ Failed to start server: $($_.Exception.Message)" -ForegroundColor Red

    exit 1    exit 1

}}