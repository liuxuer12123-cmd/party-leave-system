@echo off
title Party Leave System - Install & Start
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

echo [2/5] Setting npm registry...
call npm config set registry https://registry.npmmirror.com
echo Done.

echo [3/5] Installing better-sqlite3 (with prebuilt binary)...
call npm install better-sqlite3@11 --omit=dev --registry=https://registry.npmmirror.com
echo Done.

echo [4/5] Installing remaining dependencies...
call npm install --omit=dev --registry=https://registry.npmmirror.com
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
echo   If not online, run: pm2 logs --lines 20
echo ========================================
pause