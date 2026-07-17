"""
WSGI-точка входа для хостинга (PythonAnywhere и т.п.).

На PythonAnywhere в разделе Web → Code → WSGI configuration file
содержимое файла заменить на:

    import sys
    path = '/home/ВАШ_ЛОГИН/PlantAssist'
    if path not in sys.path:
        sys.path.insert(0, path)

    import os
    os.environ['PLANTASSIST_PASSWORD'] = 'ваш-пароль'
    os.environ['PLANTASSIST_SECRET'] = 'длинная-случайная-строка'

    from app import app as application

Локально этот файл не нужен — запускается python app.py.
"""

from app import app as application  # noqa: F401
