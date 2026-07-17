"""
Автобэкап PlantAssist в Яндекс Диск.

Скачивает архив со всеми данными и фото с сервера и кладёт его в папку
backups/ внутри Яндекс Диска. Клиент Яндекс Диска сам зальёт его в облако.

Настройка — в блоке ниже. Запуск:  python backup.py
Автоматически — через Планировщик задач Windows (см. backup.bat).

Внешних библиотек не требует.
"""

import os
import ssl
import sys
import urllib.parse
import urllib.request
import zipfile
from datetime import datetime
from http.cookiejar import CookieJar

# ── Настройки ──────────────────────────────────────────────────────────────
# Адрес приложения. После переезда в облако замени на свой,
# например: "https://имя-пользователя.pythonanywhere.com"
URL = os.environ.get('PLANTASSIST_URL', 'https://localhost:5000')

# Пароль от приложения (если он задан на сервере). Пусто — если пароля нет.
PASSWORD = os.environ.get('PLANTASSIST_PASSWORD', '')

# Куда складывать бэкапы — папка внутри Яндекс Диска (синхронизируется сама).
# Задаётся в backup_config.bat; по умолчанию — backups/ рядом со скриптом.
DEST_DIR = os.environ.get('PLANTASSIST_BACKUP_DIR', '').strip() \
    or os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backups')

# Сколько последних копий хранить
KEEP = 30

# Не проверять сертификат (нужно только для локального https с самоподписанным)
INSECURE = URL.startswith('https://localhost') or URL.startswith('https://192.168.')
# ───────────────────────────────────────────────────────────────────────────


# Консоль Windows часто не в UTF-8 — иначе кириллица в выводе роняет скрипт
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass


def build_opener():
    handlers = [urllib.request.HTTPCookieProcessor(CookieJar())]
    if INSECURE:
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        handlers.append(urllib.request.HTTPSHandler(context=ctx))
    return urllib.request.build_opener(*handlers)


def main():
    opener = build_opener()

    if PASSWORD:
        data = urllib.parse.urlencode({'password': PASSWORD}).encode()
        try:
            opener.open(f'{URL}/login', data, timeout=60).read()
        except Exception as e:
            print(f'Не удалось войти: {e}')
            return 1

    try:
        with opener.open(f'{URL}/api/backup', timeout=180) as resp:
            payload = resp.read()
    except Exception as e:
        print(f'Не удалось скачать бэкап: {e}')
        return 1

    if not payload.startswith(b'PK'):
        print('Сервер вернул не ZIP — возможно, нужен пароль (PLANTASSIST_PASSWORD).')
        return 1

    os.makedirs(DEST_DIR, exist_ok=True)
    stamp = datetime.now().strftime('%Y-%m-%d_%H%M')
    path = os.path.join(DEST_DIR, f'plantassist-backup-{stamp}.zip')

    tmp = f'{path}.tmp'
    with open(tmp, 'wb') as f:
        f.write(payload)

    # Проверяем, что архив целый, и только потом кладём на место
    try:
        with zipfile.ZipFile(tmp) as z:
            names = z.namelist()
            if 'data.json' not in names:
                raise zipfile.BadZipFile('нет data.json')
            photos = sum(1 for n in names if n.startswith('photos/'))
    except zipfile.BadZipFile as e:
        os.remove(tmp)
        print(f'Скачанный архив повреждён: {e}')
        return 1
    os.replace(tmp, path)

    size_mb = len(payload) / 1048576
    print(f'OK: {os.path.basename(path)} — {size_mb:.1f} МБ, фото: {photos}')

    # Чистим старые копии
    backups = sorted(f for f in os.listdir(DEST_DIR)
                     if f.startswith('plantassist-backup-') and f.endswith('.zip'))
    for old in backups[:-KEEP]:
        os.remove(os.path.join(DEST_DIR, old))
        print(f'Удалена старая копия: {old}')

    return 0


if __name__ == '__main__':
    sys.exit(main())
