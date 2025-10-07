# Stop all Node.js processes (kills both frontend and backend)

Write-Host "🛑 Stopping all Node.js processes..." -ForegroundColor Red

try {
    $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
    if ($nodeProcesses) {
        $nodeProcesses | Stop-Process -Force
        Write-Host "✅ Stopped $($nodeProcesses.Count) Node.js process(es)" -ForegroundColor Green
        
        # Also free up the ports
        Start-Sleep -Seconds 2
        
        # Check port 3001
        $port3001 = netstat -ano | Select-String ":3001.*LISTENING"
        if ($port3001) {
            $processId = ($port3001 -split '\s+')[-1]
            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
        }
        
        # Check port 5173
        $port5173 = netstat -ano | Select-String ":5173.*LISTENING"
        if ($port5173) {
            $processId = ($port5173 -split '\s+')[-1]
            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
        }
        
        Write-Host "🔓 Ports 3001 and 5173 have been freed" -ForegroundColor Green
    } else {
        Write-Host "ℹ️  No Node.js processes found" -ForegroundColor Cyan
    }
} catch {
    Write-Host "❌ Error stopping processes: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "🎯 All servers stopped!" -ForegroundColor Green