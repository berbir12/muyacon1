@echo off
echo Stopping Metro bundler...
taskkill /f /im node.exe 2>nul

echo Clearing Metro cache...
cd frontend
npx expo start --clear

echo App restarted with cleared cache!
pause
