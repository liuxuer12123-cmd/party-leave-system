@echo off
title Party Leave System - Install (Mirror)
echo ========================================
echo   Party Leave System - Install ^& Start
echo ========================================
echo.

set APP_DIR=C:\party-leave-system

echo [1/5] Cleaning old files...
cd /d "%APP_DIR%\server"
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del package-lock.json
echo Done.

echo [2/5] Setting mirrors...
call npm config set registry https://registry.npmmirror.com
set npm_config_better_sqlite3_binary_host=https://npmmirror.com/mirrors/better-sqlite3
echo Done.

echo [3/5] Installing better-sqlite3@11...
call npm install better-sqlite3@11 --omit=dev
echo Done.

echo [4/5] Installing remaining dependencies...
call npm install --omit=dev
echo Done.

echo [5/5] Starting application...
cd /d "%APP_DIR%"
call pm2 delete party-leave-system 2>nul
call pm2 start ecosystem.config.js
call pm2 save
echo Done.

echo.
echo ========================================
echo   pm2 status:
call pm2 status
echo.
echo   If status is "online", visit:
echo   http://49.232.215.76:3001
echo.
echo   If still errored, run: pm2 logs --lines 20
echo.
echo   LAST RESORT: Install Visual Studio Build Tools
echo   https://visualstudio.microsoft.com/downloads/
echo   Download "Build Tools for Visual Studio 2022"
echo   Select "Desktop development with C++"
echo   Then re-run this script
echo ========================================
pause