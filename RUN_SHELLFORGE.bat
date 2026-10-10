@echo off
title ShellForge — File Manager Launcher
color 0B
echo.
echo =======================================================
echo          ShellForge File Manager Launcher
echo =======================================================
echo.

echo [1/3] Stopping any old instances...
taskkill /F /IM node.exe >nul 2>&1

echo [2/3] Starting Backend API (Port 3001)...
start "ShellForge Backend" /min cmd /c "cd /d C:\A7_OSSP_PROJECT\backend && node src\server.js"

timeout /t 2 /nobreak >nul

echo [3/3] Starting Frontend UI (Port 5173)...
start "ShellForge Frontend" /min cmd /c "cd /d C:\A7_OSSP_PROJECT\frontend && npx vite --port 5173"

timeout /t 3 /nobreak >nul

echo.
echo =======================================================
echo  SUCCESS! ShellForge is running!
echo  Opening http://localhost:5173 in your browser...
echo =======================================================
echo.

start http://localhost:5173

pause
