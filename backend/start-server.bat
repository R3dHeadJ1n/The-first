@echo off
:restart
echo Starting server on 0.0.0.0 (accessible from phone at http://YOUR_IP:3001/)...
echo.
node server.js
echo.
echo Server stopped. Restarting in 3 seconds...
timeout /t 3 /nobreak >nul
goto restart
