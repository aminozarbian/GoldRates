@echo off
echo Starting Gold Rates Project...

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Python not found! Please install Python and add it to PATH.
    pause
    exit /b
)

REM Install python dependencies if needed
if not exist "venv" (
    echo Installing Python dependencies...
    python -m pip install -r requirements.txt
)

echo Starting Server and MT5 Bridge...
npm run dev:full

pause
