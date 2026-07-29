"""Собрать иконки достижений из витражных исходников.

Исходник — квадратный JPG с круглым витражом на белом фоне. Скрипт обрезает по
кругу, убирает белые углы (иначе они торчат на плитке карточки) и сохраняет две
версии: маленькую для карточки и большую для просмотра по клику.

Требуется Pillow:  py -m pip install pillow
Исходники лежат в design/achievement-sources/ — папка в .gitignore, готовые
иконки коммитятся. Добавить новую: положить файл, дописать строку в JOBS,
запустить скрипт, прописать img/imgLarge у достижения в static/app.js.

    py tools/make_achievement_icons.py
"""
import os
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIR = os.path.join(ROOT, 'design', 'achievement-sources')
OUT_DIR = os.path.join(ROOT, 'static', 'icons', 'achievements')

# id достижения из ACHIEVEMENTS → имя файла-исходника
JOBS = {
    'garden_1':   'photo_2026-07-29_11-54-24.jpg',   # росток
    'garden_5':   'photo_2026-07-29_12-09-41.jpg',   # пять горшков
    'garden_10':  'photo_2026-07-29_12-16-22.jpg',   # полка с растениями
    'garden_20':  '20.jpg',                          # три полки
    'garden_35':  'Оранжереяjpg.jpg',                # теплица
    'garden_50':  'Джунглиjpg.jpg',                  # джунгли с туканом
    'garden_75':  'бот_сад.jpg',                     # оранжерея с фонтаном
    'garden_100': '100.jpg',                         # витражная сотня
    'garden_150': 'легенда.jpg',                     # лавровый венок
}

CARD, LARGE = 240, 760   # 104px в карточке и до 560px в просмотре, с запасом


def circle_mask(size):
    """Круг рисуется крупнее и уменьшается — иначе край получается «лесенкой»."""
    scale = 4
    mask = Image.new('L', (size * scale, size * scale), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size * scale - 1, size * scale - 1), fill=255)
    return mask.resize((size, size), Image.LANCZOS).filter(ImageFilter.GaussianBlur(0.4))


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    for ach_id, filename in JOBS.items():
        src = os.path.join(SRC_DIR, filename)
        if not os.path.exists(src):
            print(f'{ach_id:12} ПРОПУЩЕНО — нет файла {filename}')
            continue

        base = Image.open(src).convert('RGB')
        w, h = base.size
        side = min(w, h)
        square = base.crop(((w - side) // 2, (h - side) // 2,
                            (w + side) // 2, (h + side) // 2))

        for size, name in ((CARD, f'{ach_id}.webp'), (LARGE, f'{ach_id}-lg.webp')):
            out = square.resize((size, size), Image.LANCZOS).convert('RGBA')
            out.putalpha(circle_mask(size))
            path = os.path.join(OUT_DIR, name)
            out.save(path, 'WEBP', quality=86, method=6)
            print(f'{name:22} {size}px  {round(os.path.getsize(path) / 1024):>4} КБ')


if __name__ == '__main__':
    main()
