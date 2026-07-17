@echo off
REM Автобэкап PlantAssist в Яндекс Диск.
REM Запусти двойным кликом или повесь на Планировщик задач Windows.

REM --- Настрой под себя после переезда в облако ---
set PLANTASSIST_URL=https://localhost:5000
REM set PLANTASSIST_URL=https://ИМЯ.pythonanywhere.com
REM set PLANTASSIST_PASSWORD=твой-пароль

cd /d "%~dp0"
"C:\Users\aleksamaar\AppData\Local\Python\bin\python.exe" backup.py
if errorlevel 1 (
  echo.
  echo Бэкап НЕ выполнен. Проверь адрес и пароль выше.
  pause
)
