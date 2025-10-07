# Clean up temporary files created during troubleshooting

Write-Host "🧹 Cleaning up temporary troubleshooting files..."

# List of temporary files to remove
$tempFiles = @(
    "test-pin-auth.js",
    "check-db.js",
    "backend/check-db.js",
    "backend/test-mark-paid.js",
    "backend/check-schema.js", 
    "backend/check-tables.js",
    "backend/audit-frontend.js",
    "backend/audit-routes.js",
    "backend/fix-database.js",
    "test-api.js",
    "test-api.ps1", 
    "test-tuesday-deadline.js"
)

# Remove temp files if they exist
foreach ($file in $tempFiles) {
    if (Test-Path $file) {
        Remove-Item $file -Force
        Write-Host "✅ Removed: $file"
    }
}

# Clean up log files (keep directory structure)
if (Test-Path "backend/logs") {
    Get-ChildItem "backend/logs/*.log" | Remove-Item -Force
    Write-Host "✅ Cleaned backend logs"
}

# Remove old startup scripts that are superseded
$oldScripts = @(
    "restart-server.ps1",
    "start-backend.ps1", 
    "stop-server.ps1"
)

foreach ($script in $oldScripts) {
    if (Test-Path $script) {
        Remove-Item $script -Force
        Write-Host "✅ Removed old script: $script"
    }
}

Write-Host "🎉 Cleanup complete! Repository is now clean."
Write-Host ""
Write-Host "Remaining startup options:"
Write-Host "  .\run.ps1       - PowerShell startup script"
Write-Host "  .\run.bat       - Windows batch startup script"  
Write-Host "  node run-simple.js - Cross-platform Node.js script"