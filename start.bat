@echo off
chcp 65001 > nul
REM Открывает PlantAssist в облаке — там твои настоящие данные.
REM Адрес берётся из backup_config.bat (он же используется для бэкапов).

cd /d "%~dp0"

if not exist "backup_config.bat" (
  echo.
  echo [!] Нет файла backup_config.bat с адресом приложения.
  echo     Создай его рядом, внутри:
  echo     set PLANTASSIST_URL=https://aleksamaar.pythonanywhere.com
  echo.
  pause
  exit /b 1
)

call backup_config.bat
echo Открываю %PLANTASSIST_URL% ...
start "" "%PLANTASSIST_URL%"
timeout /t 2 > nul
