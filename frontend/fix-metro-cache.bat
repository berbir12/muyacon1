@echo off
echo Fixing Metro cache issues...

cd /d "%~dp0"

echo Stopping any running processes...
taskkill /f /im node.exe 2>nul || echo No node processes found

echo Clearing npm cache...
npm cache clean --force

echo Clearing Metro cache...
npx expo start --clear --reset-cache

echo Done!
pause
