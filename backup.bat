@echo off
chcp 65001 > nul
REM Автобэкап PlantAssist из облака в Яндекс Диск.
REM Настройки (адрес и пароль) лежат в backup_config.bat — он не попадает в git.

cd /d "%~dp0"

if not exist "backup_config.bat" (
  echo.
  echo [!] Нет файла backup_config.bat — не знаю, откуда качать бэкап.
  echo     Создай его рядом с этим файлом, внутри:
  echo.
  echo     set PLANTASSIST_URL=https://aleksamaar.pythonanywhere.com
  echo     set PLANTASSIST_PASSWORD=твой-пароль
  echo.
  pause
  exit /b 1
)

call backup_config.bat

echo Качаю бэкап из %PLANTASSIST_URL% ...

REM Ищем Python: сначала стандартный лаунчер, потом привычный путь
where py >nul 2>&1
if %errorlevel%==0 (
  py backup.py
) else (
  "C:\Users\aleksamaar\AppData\Local\Python\bin\python.exe" backup.py
)
if errorlevel 1 (
  echo.
  echo [!] Бэкап НЕ выполнен. Проверь адрес и пароль в backup_config.bat
  pause
  exit /b 1
)

echo.
echo Готово. Копия лежит в backups\ и синхронизируется Яндекс Диском.
timeout /t 3 > nul
