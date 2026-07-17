# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# PlantAssist — техническая документация

> **Начинать с [STATUS.md](STATUS.md)** — там текущее состояние, что не доделано,
> известные проблемы и доступы. Здесь — только техника.

## Что это

Веб-приложение для учёта домашних растений: полив, подкормка, пересадка, обработка
от вредителей, витамины, цветение, черенки, посевы, архив, достижения, статистика.

**Развёрнуто в облаке** (PythonAnywhere) — там источник правды. Локально запускается
для разработки; локальные данные при этом устаревшие. Подробности — в STATUS.md.

## Команды разработки

```bash
py app.py            # локальный сервер (браузер откроется сам через 1 сек)
start_local.bat      # то же, с предупреждением про устаревшие данные
backup.bat           # скачать бэкап из облака в backups/
```

После изменения `app.py` сервер нужно перезапустить вручную (`debug=False` намеренно).
Тестов и линтера нет — всё проверяется руками в браузере.

**HTTPS-режим:** если существуют `certs/server.crt` и `certs/server.key`, `app.py`
стартует по HTTPS. Иначе — обычный HTTP. Сертификаты создаёт `gen-certs.sh`.

## Структура

```
PlantAssist/
├── app.py                 # Flask: REST API, авторизация, бэкапы (876 строк)
├── wsgi.py                # точка входа для хостинга
├── backup.py              # автобэкап из облака в Яндекс Диск (только stdlib)
├── backup_config.bat      # АДРЕС И ПАРОЛЬ (в .gitignore!)
├── backup.bat             # обёртка для Планировщика задач
├── start.bat              # открывает облако
├── start_local.bat        # локальный сервер (с предупреждением)
├── gen-certs.sh           # локальный HTTPS-сертификат
├── data.json              # растения (в .gitignore)
├── cuttings.json          # черенки (в .gitignore)
├── sowings.json           # посевы (в .gitignore)
├── photos/                # фото: <ownerid>_<photoid>.ext (в .gitignore)
├── backups/               # ZIP-бэкапы, синхронизируются Диском (в .gitignore)
├── certs/                 # HTTPS-сертификаты (в .gitignore!)
└── static/
    ├── index.html         # SPA (429 строк)
    ├── app.js             # весь фронтенд, vanilla JS (4073 строки)
    ├── style.css          # все стили (2051 строка)
    ├── manifest.json      # PWA-манифест
    ├── sw.js              # service worker
    └── icons/             # иконки приложения
```

## Стек

- **Бэкенд:** Python 3, Flask. Внешних зависимостей кроме flask нет.
- **Фронтенд:** vanilla JS (ES6+), без фреймворков и без npm.
- **CDN:** Inter (шрифт), Lucide (иконки), Chart.js 4 (графики).
- **Хранилище:** JSON-файлы + фото на диске.

## Модель данных

### data.json — растения

```json
{
  "id": "uuid4",
  "name": "Фикус",
  "description": "", "purchased_date": "2024-01-15",
  "plant_types": ["🌿 Арроидные"], "problems": ["🕷 Паутинный клещ"],
  "watering_note": "", "light": "", "soil": "", "room": "Гостиная",
  "favorited": false,
  "is_flowering": false,
  "flowering_log": [{"date": "2026-05-01", "event": "start", "notes": ""}],
  "needs_repotting": false,
  "fertilizing_reminder_date": "",
  "mute_watering": false,
  "mute_fertilizing": false,
  "archived": false, "archived_date": "", "archive_reason": "",
  "photos": [{"id": "uuid4", "filename": "...", "date": "", "description": ""}],
  "watering":     {"frequency_days": 7,  "last_date": "", "history": ["2024-05-20"]},
  "fertilizing":  {"frequency_days": 30, "last_date": "", "history": [{"date": "", "fertilizer": "", "dose": ""}]},
  "repotting":    {"last_date": "", "history": []},
  "pest_control": {"frequency_days": 14, "last_date": "", "history": [{"date": "", "product": ""}]},
  "vitamins":     {"frequency_days": null, "last_date": "", "history": [{"date": "", "product": ""}]}
}
```

`flowering_log`: `event` = `start` | `end`, отсортирован от новых к старым.
Пары start/end образуют периоды цветения. При удалении записи `is_flowering`
пересинхронизируется по последней оставшейся.

### sowings.json — посевы

```json
{
  "id": "uuid4", "name": "Лимон Мейера",
  "sowing_date": "2026-07-01",
  "seeds_count": 10,
  "sprouted_count": 5,          // ← ВЫЧИСЛЯЕТСЯ из log, не задавать напрямую
  "first_sprout_date": "2026-07-08",  // ← ВЫЧИСЛЯЕТСЯ из log
  "expected_min_days": 7, "expected_max_days": 21,
  "substrate": "Грунт", "pretreatment": ["Замачивание"],
  "notes": "", "status": "germinated",
  "log": [{"date": "2026-07-01", "event": "sown", "count": 10},
          {"date": "2026-07-08", "event": "sprout", "count": 2, "notes": "первые"}],
  "photos": []
}
```

`log` — **источник правды** для всходов. `event`: `sown` | `sprout` | `pricked_out` | `note`.
`recompute_sowing()` пересчитывает `sprouted_count` (сумма всех `sprout`) и
`first_sprout_date` (минимальная дата `sprout`). Поэтому `sprouted_count` и
`first_sprout_date` **исключены из `SOWING_FIELDS`** — их нельзя менять через PUT.

`status`: `sown` | `germinated` | `pricked_out` | `in_collection` | `failed`.
Статус двигается вперёд автоматически при добавлении записи в лог, но никогда
не откатывается назад.

### cuttings.json — черенки

`{id, name, parent_plant_id, date_taken, method, status, notes}`
`method`: `water`|`soil`|`moss`. `status`: `rooting`|`rooted`|`planted`|`failed`.

### Ключевая логика дат

- `next_date = last_date + frequency_days` — считается на фронтенде
- Пересадка: фиксированный год (365 дней), нет `frequency_days`
- `fertilizing_reminder_date` — разовое напоминание, сбрасывается при записи подкормки
- `history` — от новых к старым; запись = строка (дата) или объект `{date, ...}`
- Все функции дат работают в **локальном времени** (UTC+N корректен)

### Миграция

`load_plants()` и `load_sowings()` дополняют объекты недостающими полями при
загрузке (in-memory). Можно безопасно добавлять поля без правки JSON.
`load_sowings()` строит `log` из старых полей, если его нет.

## REST API

Всё под `/api/`, отдаёт JSON, ошибки — `{"error": "..."}`.

| Метод | URL | Что делает |
|-------|-----|-----------|
| GET/POST | `/login` | Вход по паролю (если задан `PLANTASSIST_PASSWORD`) |
| GET | `/logout` | Выход |
| GET | `/api/plants` | Активные растения (без архивных) |
| POST | `/api/plants` | Создать |
| PUT/DELETE | `/api/plants/<id>` | Обновить / удалить (+фото) |
| POST | `/api/plants/<id>/water` | Полив |
| POST | `/api/plants/<id>/fertilize` | Подкормка `{date?, fertilizer?, dose?, next_days?}` |
| POST | `/api/plants/<id>/repot` | Пересадка |
| POST | `/api/plants/<id>/pest_control` | Обработка `{date?, product?, next_days?}` |
| POST | `/api/plants/<id>/vitamins` | Витамины `{date?, product?, next_days?}` |
| POST | `/api/plants/<id>/flowering` | Цветение `{event: start|end, date?, notes?}` |
| DELETE | `/api/plants/<id>/history` | Удалить запись `{section, index}` |
| POST/DELETE | `/api/plants/<id>/photos` | Загрузить (multipart) / удалить все |
| DELETE | `/api/plants/<id>/photos/<photo_id>` | Удалить фото |
| GET | `/photos/<filename>` | Отдать файл фото |
| POST | `/api/plants/<id>/archive` | В архив `{reason?}` |
| POST | `/api/plants/<id>/restore` | Из архива |
| GET | `/api/archive` | Архивные |
| GET/POST | `/api/cuttings` | Черенки |
| PUT/DELETE | `/api/cuttings/<id>` | Обновить / удалить |
| GET/POST | `/api/sowings` | Посевы (POST сам добавляет запись `sown` в лог) |
| PUT/DELETE | `/api/sowings/<id>` | Обновить / удалить (+фото) |
| POST | `/api/sowings/<id>/log` | Запись в журнал `{event, date?, count?, notes?}` |
| DELETE | `/api/sowings/<id>/log` | Удалить запись `{index}` |
| POST | `/api/sowings/<id>/photos` | Фото посева (multipart) |
| DELETE | `/api/sowings/<id>/photos/<photo_id>` | Удалить фото |
| GET | `/api/backup` | ZIP: данные + все фото |
| POST | `/api/restore` | Восстановить из ZIP (multipart: `backup`) |

`PUT /api/plants/<id>` игнорирует `history` — она меняется только action-эндпоинтами
через единую `_record_action()`.

## Безопасность и надёжность

- **Авторизация:** включается только при заданной `PLANTASSIST_PASSWORD`. Без неё
  (локально) приложение открыто. `@app.before_request` пускает без входа только
  `/login`, `/style.css`, `/manifest.json`, `/sw.js`, `/icons/*` — остальное 401
  (для `/api/` и `/photos/`) или редирект на логин.
- **Атомарная запись:** `_atomic_write_json()` — пишет в `.tmp` + `os.fsync` +
  `os.replace`. Сбой посреди записи не может побить данные.
- **Restore** проверяет ZIP, валидирует JSON до записи, и берёт `basename()` от
  путей внутри архива — защита от path traversal.

## Фронтенд (static/app.js)

SPA без роутера, вся логика в одном файле.

```js
let plants = [];        // активные растения
let cuttings = [];      // черенки (лениво)
let sowings = [];       // посевы (грузятся при старте — нужны для напоминаний)
let archivePlants = []; // архив (лениво)
let currentView = 'today';
```

После изменения на сервере локальный объект патчится ответом сервера, затем `render()`.

### Ключевые функции

| Функция | Что делает |
|---------|-----------|
| `api(method, path, body)` | Обёртка fetch (кроме загрузки фото) |
| `render()` | Перерисовывает «Сегодня» и «Все растения» |
| `renderToday()` | Просроченные задачи + напоминания о всходах |
| `renderCalendar()` | Таблица: растения × даты, иконки задач в ячейках |
| `renderStats()` | KPI + 4 графика Chart.js + история цветения + бэкап |
| `renderAchievements()` | 71 достижение по категориям |
| `renderSowings()` / `openSowingDetail()` | Посевы и журнал |
| `buildCard(plant)` | DOM-карточка растения |
| `openDetail(plantId)` | Детальная карточка |
| `openActionDateModal()` / `doAction()` | Действие с выбором даты |
| `openBulkActionModal()` | Массовая обработка (в т.ч. комната/грунт) |
| `openMoreSheet()` | Мобильная шторка «Ещё» + переключатель темы |
| `showToast(msg, action)` | Центральное всплывающее сообщение |

### Заглушение напоминаний

- `isWateringMuted(p)` → `mute_watering`
- `isFertilizingMuted(p)` → `mute_fertilizing` **или есть активные `problems`**
  (больное растение не удобряют — авто-пауза)

Учитывается в `getCardStatus()`, `hasOverdueTasks()`, `renderToday()`,
`renderTodaySummary()` и `CAL_ACTIONS` календаря.

### Достижения

`ACHIEVEMENTS` — массив с `check()`. Важно: **обработка от вредителей считается по
уникальным дням** (`_uniqueDays('pest_control')`), а не по сумме записей — она
делается всем растениям сразу в один день. Полив/подкормка считаются по записям
(они индивидуальны). `_totalCare()` использует то же правило.

## PWA

- `manifest.json` + `sw.js` + иконки. Регистрация SW — в конце `index.html`.
- **Стратегия кэша:** `/api/` и `/photos/` — network-first (свежие данные);
  свой HTML/CSS/JS — network-first (обновления видны сразу); иконки/CDN — cache-first.
- Установка PWA и service worker требуют **доверенного HTTPS** — работают только
  из облака. По локальной сети с самоподписанным сертификатом Chrome их блокирует.

## Нюансы

- **`static_url_path=''`** — статика раздаётся с корня, поэтому API под `/api/`
- **Lucide:** `createIcons()` заменяет `<i>` на `<svg>`, поэтому при динамическом
  обновлении иконки нужно пересоздавать элемент через `innerHTML`, а не искать `<i>`
- **`--text-secondary`** — алиас `--text-muted` (в JS есть inline-стили с ним)
- Фото хранятся файлами, не в base64
- Сервер слушает `0.0.0.0` — доступен по локальной сети
- Тёмная тема — класс `body.dark`, сохраняется в `localStorage`
- `GET /api/plants` не возвращает архивные

## Зависимости

```
Python >= 3.8 (на хостинге 3.13)
flask >= 3.0
```
