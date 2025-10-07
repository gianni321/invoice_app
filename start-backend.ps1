# Quick backend-only restart script
# For when you just need to test the API without the frontend

Write-Host "🔄 Restarting Backend Server Only..." -ForegroundColor Yellow

# Kill existing Node processes
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

# Free up port 3000 if needed
$port3000 = netstat -ano | Select-String ":3000.*LISTENING"
if ($port3000) {
    $processId = ($port3000 -split '\s+')[-1]
    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
}

# Navigate to backend directory and start server
Set-Location "c:\Users\Owner\Documents\code\invoice_app\backend"
Write-Host "🚀 Starting backend server at http://localhost:3000..." -ForegroundColor Green

# Start backend server
npm start