@echo off
title HackMate - Hackathon Teammate Matcher
echo ========================================================
echo               HACKMATE LAUNCH SYSTEM
echo   College-Exclusive Hackathon Teammates Platform
echo ========================================================
echo.

:: 1. Check if dependencies exist, install if missing
if not exist "node_modules\" (
    echo [1/3] Installing root dependencies...
    call npm install
)

if not exist "server\node_modules\" (
    echo [2/3] Installing server dependencies...
    call npm --prefix server install
)

if not exist "client\node_modules\" (
    echo [3/3] Installing client dependencies...
    call npm --prefix client install
)

echo.
echo [OK] Dependencies verified.
echo.
echo Starting HackMate Backend (http://localhost:5000)
echo Starting HackMate Frontend (http://localhost:3000)
echo.
echo Opening browser in 3 seconds...
start "" http://localhost:3000
echo.
echo Press Ctrl+C in this terminal to stop both servers.
echo ========================================================
echo.

npm run dev
