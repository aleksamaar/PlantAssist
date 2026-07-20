@echo off
REM Opens PlantAssist in the cloud - that's where your real data lives.
REM The address is taken from backup_config.bat (also used for backups).

cd /d "%~dp0"

if not exist "backup_config.bat" (
  echo.
  echo [!] backup_config.bat with the app address is missing.
  echo     Create it next to this file, containing:
  echo     set PLANTASSIST_URL=https://aleksamaar.pythonanywhere.com
  echo.
  pause
  exit /b 1
)

call backup_config.bat
echo Opening %PLANTASSIST_URL% ...
start "" "%PLANTASSIST_URL%"
timeout /t 2 > nul
