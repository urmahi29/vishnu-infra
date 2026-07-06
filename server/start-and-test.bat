@echo off
cd /d "E:\VISHNU_INFRA\server"
echo =========================================
echo  Starting Backend Server
echo =========================================
echo.
echo Installing dependencies...
call npm install 2>nul
echo.
echo Starting server (will wait 20 seconds)...
start "Backend Server" cmd /c "node src/server.js"
echo.
echo Waiting 20 seconds for server to start...
timeout /t 20 /nobreak >nul
echo.
echo =========================================
echo  Testing Login API
echo =========================================
echo.
curl -X POST http://localhost:5000/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"admin@roadconstruction.com\",\"password\":\"Admin@123\"}"
echo.
echo.
echo =========================================
echo  Done - Check the server window for
echo  "Database Connected Successfully" or
echo  "Database connection failed" messages.
echo =========================================
pause
