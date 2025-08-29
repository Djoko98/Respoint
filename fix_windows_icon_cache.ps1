# Script to clear Windows Icon Cache and refresh Start Menu icons
Write-Host "🧹 Clearing Windows Icon Cache..." -ForegroundColor Green

# Stop Windows Explorer
Write-Host "Stopping Windows Explorer..." -ForegroundColor Yellow
Stop-Process -Name explorer -Force

# Clear Icon Cache locations
$iconCachePaths = @(
    "$env:LOCALAPPDATA\Microsoft\Windows\Explorer\iconcache*",
    "$env:LOCALAPPDATA\Microsoft\Windows\Explorer\thumbcache*",
    "$env:LOCALAPPDATA\IconCache.db"
)

foreach ($path in $iconCachePaths) {
    if (Test-Path $path) {
        Write-Host "Deleting: $path" -ForegroundColor Yellow
        Remove-Item -Path $path -Force -ErrorAction SilentlyContinue
    }
}

# Clear Start Menu tile cache
$tileCachePath = "$env:LOCALAPPDATA\Microsoft\Windows\Caches\*"
if (Test-Path $tileCachePath) {
    Write-Host "Clearing Start Menu tile cache..." -ForegroundColor Yellow
    Remove-Item -Path $tileCachePath -Force -Recurse -ErrorAction SilentlyContinue
}

# Start Windows Explorer
Write-Host "Restarting Windows Explorer..." -ForegroundColor Yellow
Start-Process explorer

Write-Host "✅ Icon cache cleared!" -ForegroundColor Green
Write-Host ""
Write-Host "📌 Next steps:" -ForegroundColor Cyan
Write-Host "1. Uninstall the old ResPoint from Control Panel/Settings" -ForegroundColor White
Write-Host "2. Install the new ResPoint from: src-tauri\target\release\bundle\nsis\" -ForegroundColor White
Write-Host "3. The new icon should now appear in Start Menu!" -ForegroundColor White 