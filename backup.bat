@echo off
REM Auto-backup PlantAssist from the cloud to Yandex Disk.
REM Settings (address and password) live in backup_config.bat - not in git.

cd /d "%~dp0"

if not exist "backup_config.bat" (
  echo.
  echo [!] backup_config.bat is missing - don't know where to download from.
  echo     Create it next to this file, containing:
  echo.
  echo     set PLANTASSIST_URL=https://aleksamaar.pythonanywhere.com
  echo     set PLANTASSIST_PASSWORD=your-password
  echo.
  pause
  exit /b 1
)

call backup_config.bat

echo Downloading backup from %PLANTASSIST_URL% ...

REM Find Python: try the standard launcher first, then the usual path
where py >nul 2>&1
if %errorlevel%==0 (
  py backup.py
) else (
  "C:\Users\aleksamaar\AppData\Local\Python\bin\python.exe" backup.py
)
if errorlevel 1 (
  echo.
  echo [!] Backup FAILED. Check the address and password in backup_config.bat
  pause
  exit /b 1
)

echo.
echo Done. The copy is in backups\ and syncs via Yandex Disk.
timeout /t 3 > nul
