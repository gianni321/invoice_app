# Quick backend-only restart script
# For when you just need to test the API without the frontend

Write-Host "🔄 Restarting Backend Server Only..." -ForegroundColor Yellow

# Kill existing Node processes
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

# Free up port 3001 if needed (updated from 3000)
$port3001 = netstat -ano | Select-String ":3001.*LISTENING"
if ($port3001) {
    $processId = ($port3001 -split '\s+')[-1]
    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
}

# Navigate to backend directory and start server
Set-Location "c:\Users\Owner\Documents\code\invoice_app\backend"
Write-Host "🚀 Starting backend server at http://localhost:3001..." -ForegroundColor Green

# Start backend server
npm start