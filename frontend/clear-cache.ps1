# PowerShell script to clear all caches and fix InternalBytecode.js issue
Write-Host "Clearing all caches and fixing InternalBytecode.js issue..." -ForegroundColor Green

# Stop any running Metro processes
Write-Host "Stopping Metro processes..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force

# Clear npm cache
Write-Host "Clearing npm cache..." -ForegroundColor Yellow
npm cache clean --force

# Clear Metro cache
Write-Host "Clearing Metro cache..." -ForegroundColor Yellow
npx expo start --clear --reset-cache

# Clear temp files
Write-Host "Clearing temp files..." -ForegroundColor Yellow
Remove-Item -Path "$env:TEMP\metro-*" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "$env:TEMP\expo-*" -Recurse -Force -ErrorAction SilentlyContinue

# Clear node_modules if it exists
if (Test-Path "node_modules") {
    Write-Host "Clearing node_modules..." -ForegroundColor Yellow
    Remove-Item -Path "node_modules" -Recurse -Force
    Write-Host "Reinstalling dependencies..." -ForegroundColor Yellow
    npm install
}

Write-Host "Cache cleared! Please restart your development server." -ForegroundColor Green
Write-Host "If the error persists, try:" -ForegroundColor Cyan
Write-Host "1. Delete node_modules folder" -ForegroundColor White
Write-Host "2. Run npm install" -ForegroundColor White
Write-Host "3. Run npx expo start --clear" -ForegroundColor White

Read-Host "Press Enter to continue"

