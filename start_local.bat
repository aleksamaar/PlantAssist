@echo off
cd /d "%~dp0"

echo ============================================================
echo  WARNING: this is the LOCAL development server.
echo.
echo  Your real data lives in the cloud. This here is an old copy.
echo  Changes made here WILL NOT reach the cloud and will be lost.
echo.
echo  To manage your plants, run start.bat (opens the cloud).
echo ============================================================
echo.
set /p answer="Run locally anyway? (y/n): "
if /i not "%answer%"=="y" exit /b 0

echo.
echo Starting local server...
py app.py
pause
