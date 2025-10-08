# Invoice App Server Stop Script

Write-Host "=== Stopping Invoice App Servers ===" -ForegroundColor Red

# Stop all node processes
Write-Host "Stopping all node processes..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | ForEach-Object {
    Write-Host "Stopping node process PID $($_.Id)" -ForegroundColor Red
    Stop-Process -Id $_.Id -Force
}

# Stop any npm processes
Get-Process -Name "npm" -ErrorAction SilentlyContinue | ForEach-Object {
    Write-Host "Stopping npm process PID $($_.Id)" -ForegroundColor Red
    Stop-Process -Id $_.Id -Force
}

Start-Sleep 2

Write-Host "✅ All servers stopped." -ForegroundColor Green