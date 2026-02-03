@echo off
timeout /t 2 /nobreak >nul
cd /d "%~dp0"
node server.js
