
@echo off
timeout /t 2 /nobreak >nul
echo Killing old process on port 3001...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
)
timeout /t 1 /nobreak >nul
cd /d "C:\Users\user\projects\The-first\backend"
echo Starting server...
npm start
