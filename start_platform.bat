@echo off
title Neurova AI - Platform Launcher
cls
echo ===============================================================================
echo        NEUROVA AI - TWO-PORTAL INTERVIEW & ASSESSMENT PLATFORM
echo ===============================================================================
echo.
echo [1/3] Verifying Python and Node environments...
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH.
    pause
    exit /b 1
)

node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not in PATH.
    pause
    exit /b 1
)

echo [2/3] Starting FastAPI Backend on http://127.0.0.1:8000 ...
start "Neurova Backend (FastAPI)" cmd /k "cd /d \"%~dp0backend\" && python run.py"

timeout /t 3 /nobreak >nul

echo [3/3] Starting Next.js Frontend on http://localhost:3000 ...
start "Neurova Frontend (Next.js)" cmd /k "cd /d \"%~dp0frontend\" && npm run dev"

timeout /t 4 /nobreak >nul

echo.
echo ===============================================================================
echo [SUCCESS] Both servers launched!
echo.
echo   - Candidate Portal:  http://localhost:3000/candidate
echo   - HR Dashboard:      http://localhost:3000/hr/dashboard
echo   - ML Benchmarks:     http://localhost:3000/ml
echo   - API Swagger Docs:  http://127.0.0.1:8000/docs
echo ===============================================================================
echo.
start http://localhost:3000
exit /b 0

