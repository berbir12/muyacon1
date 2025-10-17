@echo off
echo Clearing Metro cache and fixing InternalBytecode.js issue...

REM Stop any running Metro processes
taskkill /f /im node.exe 2>nul

REM Clear all caches
echo Clearing npm cache...
npm cache clean --force

echo Clearing Metro cache...
npx expo start --clear --reset-cache

REM Alternative: Clear all caches
REM npx expo r -c
REM npx react-native start --reset-cache

REM Clear temp files
echo Clearing temp files...
del /q /s %TEMP%\metro-* 2>nul
del /q /s %TEMP%\expo-* 2>nul

echo Cache cleared! Please restart your development server.
echo If the error persists, try:
echo 1. Delete node_modules folder
echo 2. Run npm install
echo 3. Run npx expo start --clear
pause
