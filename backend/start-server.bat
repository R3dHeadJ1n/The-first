@echo off
:restart
echo Starting server...
node server.js
echo.
echo Server stopped. Restarting in 3 seconds...
timeout /t 3 /nobreak >nul
goto restart
