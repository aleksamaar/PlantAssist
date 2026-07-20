import io
import json
import os
import secrets
import uuid
import webbrowser
import zipfile
from datetime import date, timedelta
from threading import Timer

from flask import (Flask, jsonify, redirect, render_template_string, request,
                   send_file, send_from_directory, session, url_for)

app = Flask(__name__, static_folder='static', static_url_path='')

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(BASE_DIR, 'data.json')
CUTTINGS_FILE = os.path.join(BASE_DIR, 'cuttings.json')
SOWINGS_FILE = os.path.join(BASE_DIR, 'sowings.json')
PHOTOS_DIR = os.path.join(BASE_DIR, 'photos')

os.makedirs(PHOTOS_DIR, exist_ok=True)

# ── Auth ───────────────────────────────────────────────────────────────────
# Set PLANTASSIST_PASSWORD in the hosting env to require a login.
# Left unset (e.g. at home) the app stays open — no password.
APP_PASSWORD = os.environ.get('PLANTASSIST_PASSWORD', '').strip()

def _secret_key():
    env = os.environ.get('PLANTASSIST_SECRET', '').strip()
    if env:
        return env
    # Persist a generated key so sessions survive restarts
    key_file = os.path.join(BASE_DIR, '.secret_key')
    if os.path.exists(key_file):
        with open(key_file) as f:
            return f.read().strip()
    key = secrets.token_hex(32)
    with open(key_file, 'w') as f:
        f.write(key)
    return key

app.secret_key = _secret_key()
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=365)


def _is_public_path(path):
    if path in ('/login', '/style.css', '/manifest.json', '/sw.js'):
        return True
    return path.startswith('/icons/')


@app.before_request
def require_login():
    if not APP_PASSWORD:
        return None  # auth disabled
    if _is_public_path(request.path) or session.get('auth'):
        return None
    if request.path.startswith('/api/') or request.path.startswith('/photos/'):
        return jsonify({'error': 'unauthorized'}), 401
    return redirect(url_for('login'))


LOGIN_PAGE = """<!DOCTYPE html><html lang="ru"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>PlantAssist — вход</title>
<link rel="manifest" href="/manifest.json"><meta name="theme-color" content="#3D5C42">
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
<link rel="icon" type="image/png" href="/icons/icon-192.png">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
<style>
 *{box-sizing:border-box;margin:0;padding:0}
 body{font-family:Inter,system-ui,sans-serif;background:#F5F3EF;color:#25231F;
      min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
 .box{background:#fff;border-radius:20px;padding:34px 28px;width:100%;max-width:360px;
      box-shadow:0 10px 40px rgba(0,0,0,.08);text-align:center}
 .logo{width:66px;height:66px;border-radius:18px;margin:0 auto 16px;display:block}
 h1{font-size:1.3rem;font-weight:800;letter-spacing:-.4px;margin-bottom:6px}
 p{font-size:.85rem;color:#8C8780;margin-bottom:22px}
 input{width:100%;padding:13px 15px;font-size:16px;font-family:inherit;
       border:1.5px solid #E4E0D8;border-radius:12px;outline:none;transition:border-color .15s}
 input:focus{border-color:#6B8F71}
 button{width:100%;margin-top:12px;padding:13px;font-size:.95rem;font-weight:700;font-family:inherit;
        background:#3D5C42;color:#fff;border:none;border-radius:12px;cursor:pointer;transition:background .15s}
 button:hover{background:#2F4733}
 .err{color:#C0392B;font-size:.82rem;margin-top:12px}
 @media(prefers-color-scheme:dark){
   body{background:#141412;color:#E8E5DF}.box{background:#1C1C1A}
   input{background:#252522;border-color:#343330;color:#E8E5DF}p{color:#908C84}}
</style></head><body>
<form class="box" method="post">
  <img src="/icons/icon-192.png" class="logo" alt="">
  <h1>PlantAssist</h1>
  <p>Введите пароль для входа</p>
  <input type="password" name="password" placeholder="Пароль" autofocus required autocomplete="current-password">
  <button type="submit">Войти</button>
  {% if error %}<div class="err">Неверный пароль</div>{% endif %}
</form></body></html>"""


@app.route('/login', methods=['GET', 'POST'])
def login():
    if not APP_PASSWORD:
        return redirect(url_for('index'))
    error = False
    if request.method == 'POST':
        if secrets.compare_digest(request.form.get('password', ''), APP_PASSWORD):
            session.permanent = True
            session['auth'] = True
            return redirect(url_for('index'))
        error = True
    return render_template_string(LOGIN_PAGE, error=error)


@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))


def _atomic_write_json(path, data):
    """Write JSON safely — a crash mid-write can never corrupt the real file."""
    tmp = f'{path}.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.flush()
        os.fsync(f.fileno())
    os.replace(tmp, path)


def load_cuttings():
    if not os.path.exists(CUTTINGS_FILE):
        return []
    with open(CUTTINGS_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)


def save_cuttings(cuttings):
    _atomic_write_json(CUTTINGS_FILE, cuttings)


def load_sowings():
    if not os.path.exists(SOWINGS_FILE):
        return []
    with open(SOWINGS_FILE, 'r', encoding='utf-8') as f:
        sowings = json.load(f)
    for s in sowings:
        if 'log' not in s:
            # Build an event log from legacy single-value fields
            log = []
            if s.get('sowing_date'):
                log.append({'date': s['sowing_date'], 'event': 'sown', 'count': s.get('seeds_count')})
            if s.get('first_sprout_date'):
                log.append({'date': s['first_sprout_date'], 'event': 'sprout', 'count': s.get('sprouted_count')})
            s['log'] = log
        s.setdefault('photos', [])
        s.setdefault('contents', [])  # "box" mode: several plants in one sowing
    return sowings


def recompute_sowing(s):
    """Derive sprouted_count / first_sprout_date from the event log."""
    log = s.get('log', [])
    sprouts = [e for e in log if e.get('event') == 'sprout']
    if sprouts:
        s['sprouted_count'] = sum(int(e.get('count') or 0) for e in sprouts)
        s['first_sprout_date'] = min(e['date'] for e in sprouts if e.get('date'))
    else:
        s['sprouted_count'] = None
        s['first_sprout_date'] = ''


def save_sowings(sowings):
    _atomic_write_json(SOWINGS_FILE, sowings)


def load_plants():
    if not os.path.exists(DATA_FILE):
        return []
    with open(DATA_FILE, 'r', encoding='utf-8') as f:
        plants = json.load(f)
    for plant in plants:
        if 'pest_control' not in plant:
            plant['pest_control'] = {'frequency_days': None, 'last_date': '', 'history': []}
        for field in ('watering_note', 'light', 'soil', 'room'):
            if field not in plant:
                plant[field] = ''
        if 'favorited' not in plant:
            plant['favorited'] = False
        if 'is_flowering' not in plant:
            plant['is_flowering'] = False
        if 'flowering_log' not in plant:
            plant['flowering_log'] = []
        if 'mute_watering' not in plant:
            plant['mute_watering'] = False
        if 'mute_fertilizing' not in plant:
            plant['mute_fertilizing'] = False
        if 'needs_repotting' not in plant:
            plant['needs_repotting'] = False
        if 'fertilizing_reminder_date' not in plant:
            plant['fertilizing_reminder_date'] = ''
        if 'vitamins' not in plant:
            plant['vitamins'] = {'frequency_days': None, 'last_date': '', 'history': []}
        if 'problems' not in plant:
            plant['problems'] = []
        for f in ('archived', 'archived_date', 'archive_reason'):
            if f not in plant:
                plant[f] = False if f == 'archived' else ''
        if 'plant_types' not in plant:
            old = plant.pop('plant_type', '')
            plant['plant_types'] = [old] if old else []
        elif 'plant_type' in plant:
            plant.pop('plant_type', None)
    # Migrate: single 'photo' string → 'photos' array
    for plant in plants:
        if 'photos' not in plant:
            plant['photos'] = []
            if plant.get('photo'):
                plant['photos'].append({
                    'id': str(uuid.uuid4()),
                    'filename': plant['photo'],
                    'date': plant.get('purchased_date', date.today().isoformat()),
                    'description': '',
                })
        plant.pop('photo', None)
    return plants


def save_plants(plants):
    _atomic_write_json(DATA_FILE, plants)


def find_plant(plants, plant_id):
    return next((p for p in plants if p['id'] == plant_id), None)


def sorted_photos(plant):
    """Photos sorted newest-first by date."""
    return sorted(plant.get('photos', []), key=lambda p: p.get('date', ''), reverse=True)


def entry_date(e):
    return e if isinstance(e, str) else e['date']


@app.route('/')
def index():
    return send_from_directory('static', 'index.html')


@app.route('/photos/<filename>')
def serve_photo(filename):
    return send_from_directory(PHOTOS_DIR, filename)


@app.route('/api/plants', methods=['GET'])
def get_plants():
    return jsonify([p for p in load_plants() if not p.get('archived')])


@app.route('/api/plants', methods=['POST'])
def create_plant():
    plants = load_plants()
    data = request.json
    def init_history(last_date):
        return [last_date] if last_date else []

    w_last = data.get('watering', {}).get('last_date', '')
    f_last = data.get('fertilizing', {}).get('last_date', '')
    r_last = data.get('repotting', {}).get('last_date', '')
    pc_last = data.get('pest_control', {}).get('last_date', '')
    pc_freq = data.get('pest_control', {}).get('frequency_days')
    plant = {
        'id': str(uuid.uuid4()),
        'name': data.get('name', ''),
        'description': data.get('description', ''),
        'photos': [],
        'purchased_date': data.get('purchased_date', ''),
        'plant_types': data.get('plant_types', []),
        'problems': [],
        'watering_note': data.get('watering_note', ''),
        'light': data.get('light', ''),
        'soil': data.get('soil', ''),
        'room': data.get('room', ''),
        'favorited': data.get('favorited', False),
        'is_flowering': data.get('is_flowering', False),
        'flowering_log': [],
        'needs_repotting': False,
        'fertilizing_reminder_date': (date.fromisoformat(r_last) + timedelta(days=14)).isoformat() if r_last else '',
        'watering': {
            'frequency_days': int(data['watering']['frequency_days']) if data.get('watering', {}).get('frequency_days') else None,
            'last_date': w_last,
            'history': init_history(w_last)
        },
        'fertilizing': {
            'frequency_days': data.get('fertilizing', {}).get('frequency_days', 30),
            'last_date': f_last,
            'history': init_history(f_last)
        },
        'repotting': {
            'last_date': r_last,
            'history': init_history(r_last)
        },
        'pest_control': {
            'frequency_days': int(pc_freq) if pc_freq else None,
            'last_date': pc_last,
            'history': init_history(pc_last)
        },
        'vitamins': {
            'frequency_days': int(data.get('vitamins', {}).get('frequency_days')) if data.get('vitamins', {}).get('frequency_days') else None,
            'last_date': data.get('vitamins', {}).get('last_date', ''),
            'history': init_history(data.get('vitamins', {}).get('last_date', ''))
        }
    }
    plants.append(plant)
    save_plants(plants)
    return jsonify(plant), 201


@app.route('/api/plants/<plant_id>', methods=['PUT'])
def update_plant(plant_id):
    plants = load_plants()
    plant = find_plant(plants, plant_id)
    if not plant:
        return jsonify({'error': 'Not found'}), 404
    data = request.json
    for field in ('name', 'description', 'purchased_date', 'watering_note', 'light', 'soil', 'room', 'favorited', 'is_flowering', 'needs_repotting', 'fertilizing_reminder_date', 'mute_watering', 'mute_fertilizing'):
        if field in data:
            plant[field] = data[field]
    if 'plant_types' in data:
        plant['plant_types'] = data['plant_types']
    if 'problems' in data:
        plant['problems'] = data['problems']
    if 'repotting' in data:
        new_repot = data['repotting'].get('last_date', '')
        old_repot = plant.get('repotting', {}).get('last_date', '')
        if new_repot and new_repot != old_repot:
            plant['fertilizing_reminder_date'] = (date.fromisoformat(new_repot) + timedelta(days=14)).isoformat()
    for section in ('watering', 'fertilizing', 'repotting', 'pest_control', 'vitamins'):
        if section in data:
            for key, val in data[section].items():
                if key != 'history':
                    plant[section][key] = val
    save_plants(plants)
    return jsonify(plant)


@app.route('/api/plants/<plant_id>', methods=['DELETE'])
def delete_plant(plant_id):
    plants = load_plants()
    plant = find_plant(plants, plant_id)
    if not plant:
        return jsonify({'error': 'Not found'}), 404
    for photo in plant.get('photos', []):
        path = os.path.join(PHOTOS_DIR, photo['filename'])
        if os.path.exists(path):
            os.remove(path)
    plants = [p for p in plants if p['id'] != plant_id]
    save_plants(plants)
    return '', 204


def _record_action(plant_id, section, action_date=None, extra=None, section_updates=None, plant_updates=None):
    plants = load_plants()
    plant = find_plant(plants, plant_id)
    if not plant:
        return None, 404
    action_date = action_date or date.today().isoformat()
    history = plant[section].setdefault('history', [])
    old_last = plant[section].get('last_date')
    if old_last and old_last not in [entry_date(e) for e in history]:
        history.append(old_last)
    new_entry = {'date': action_date, **extra} if extra else action_date
    if new_entry not in history:
        history.append(new_entry)
    history.sort(key=entry_date, reverse=True)
    plant[section]['history'] = history
    plant[section]['last_date'] = entry_date(history[0])
    if section_updates:
        plant[section].update(section_updates)
    if plant_updates:
        plant.update(plant_updates)
    save_plants(plants)
    return plant, 200


@app.route('/api/plants/<plant_id>/water', methods=['POST'])
def water_plant(plant_id):
    data = request.get_json(silent=True) or {}
    plant, status = _record_action(plant_id, 'watering', data.get('date'))
    if plant is None:
        return jsonify({'error': 'Not found'}), status
    return jsonify(plant)


@app.route('/api/plants/<plant_id>/fertilize', methods=['POST'])
def fertilize_plant(plant_id):
    data = request.get_json(silent=True) or {}
    extra = {k: data[k] for k in ('fertilizer', 'dose') if data.get(k)}
    section_updates = {}
    if data.get('next_days'):
        section_updates['frequency_days'] = int(data['next_days'])
    plant, status = _record_action(plant_id, 'fertilizing', data.get('date'), extra or None, section_updates or None, {'fertilizing_reminder_date': ''})
    if plant is None:
        return jsonify({'error': 'Not found'}), status
    return jsonify(plant)


@app.route('/api/plants/<plant_id>/repot', methods=['POST'])
def repot_plant(plant_id):
    data = request.get_json(silent=True) or {}
    reminder = (date.today() + timedelta(days=14)).isoformat()
    plant, status = _record_action(plant_id, 'repotting', data.get('date'), plant_updates={'needs_repotting': False, 'fertilizing_reminder_date': reminder})
    if plant is None:
        return jsonify({'error': 'Not found'}), status
    return jsonify(plant)


@app.route('/api/plants/<plant_id>/flowering', methods=['POST'])
def record_flowering(plant_id):
    plants = load_plants()
    plant = find_plant(plants, plant_id)
    if not plant:
        return jsonify({'error': 'Not found'}), 404
    data = request.get_json(silent=True) or {}
    event = data.get('event', 'start')  # 'start' or 'end'
    entry_dt = data.get('date', '') or date.today().isoformat()
    notes = data.get('notes', '').strip()

    log_entry = {'date': entry_dt, 'event': event}
    if notes:
        log_entry['notes'] = notes

    if 'flowering_log' not in plant:
        plant['flowering_log'] = []
    plant['flowering_log'].insert(0, log_entry)
    # Sort newest first
    plant['flowering_log'].sort(key=lambda e: e['date'], reverse=True)
    # Sync is_flowering flag
    plant['is_flowering'] = (event == 'start')
    save_plants(plants)
    return jsonify(plant)


@app.route('/api/plants/<plant_id>/history', methods=['DELETE'])
def delete_history_entry(plant_id):
    plants = load_plants()
    plant = find_plant(plants, plant_id)
    if not plant:
        return jsonify({'error': 'Not found'}), 404
    data = request.get_json(silent=True) or {}
    section = data.get('section')
    index = data.get('index')

    # Flowering log is a top-level list, not nested under a section
    if section == 'flowering_log':
        log = plant.get('flowering_log', [])
        if index is None or not (0 <= index < len(log)):
            return jsonify({'error': 'Invalid index'}), 400
        log.pop(index)
        plant['flowering_log'] = log
        # Re-sync is_flowering from the most recent start/end entry
        for entry in log:
            plant['is_flowering'] = (entry['event'] == 'start')
            break
        else:
            plant['is_flowering'] = False
        save_plants(plants)
        return jsonify(plant)

    if section not in ('watering', 'fertilizing', 'repotting', 'pest_control', 'vitamins'):
        return jsonify({'error': 'Invalid section'}), 400
    history = plant[section].get('history', [])
    if index is None or not (0 <= index < len(history)):
        return jsonify({'error': 'Invalid index'}), 400
    history.pop(index)
    plant[section]['history'] = history
    plant[section]['last_date'] = entry_date(history[0]) if history else ''
    save_plants(plants)
    return jsonify(plant)


@app.route('/api/plants/<plant_id>/photos', methods=['POST'])
def upload_photo(plant_id):
    plants = load_plants()
    plant = find_plant(plants, plant_id)
    if not plant:
        return jsonify({'error': 'Not found'}), 404
    if 'photo' not in request.files:
        return jsonify({'error': 'No file'}), 400
    file = request.files['photo']
    photo_date = request.form.get('date', date.today().isoformat())
    description = request.form.get('description', '')
    photo_id = str(uuid.uuid4())
    ext = os.path.splitext(file.filename)[1].lower() or '.jpg'
    filename = f"{plant_id}_{photo_id}{ext}"
    file.save(os.path.join(PHOTOS_DIR, filename))
    entry = {'id': photo_id, 'filename': filename, 'date': photo_date, 'description': description}
    plant.setdefault('photos', []).append(entry)
    save_plants(plants)
    return jsonify(entry), 201


@app.route('/api/plants/<plant_id>/pest_control', methods=['POST'])
def pest_control_plant(plant_id):
    data = request.get_json(silent=True) or {}
    extra = {k: data[k] for k in ('product',) if data.get(k)}
    section_updates = {}
    if data.get('next_days'):
        section_updates['frequency_days'] = int(data['next_days'])
    plant, status = _record_action(plant_id, 'pest_control', data.get('date'), extra or None, section_updates or None)
    if plant is None:
        return jsonify({'error': 'Not found'}), status
    return jsonify(plant)


@app.route('/api/plants/<plant_id>/vitamins', methods=['POST'])
def vitamins_plant(plant_id):
    data = request.get_json(silent=True) or {}
    extra = {k: data[k] for k in ('product',) if data.get(k)}
    section_updates = {}
    if data.get('next_days'):
        section_updates['frequency_days'] = int(data['next_days'])
    plant, status = _record_action(plant_id, 'vitamins', data.get('date'), extra or None, section_updates or None)
    if plant is None:
        return jsonify({'error': 'Not found'}), status
    return jsonify(plant)


@app.route('/api/plants/<plant_id>/photos', methods=['DELETE'])
def delete_all_photos(plant_id):
    plants = load_plants()
    plant = find_plant(plants, plant_id)
    if not plant:
        return jsonify({'error': 'Not found'}), 404
    for photo in plant.get('photos', []):
        path = os.path.join(PHOTOS_DIR, photo['filename'])
        if os.path.exists(path):
            os.remove(path)
    plant['photos'] = []
    save_plants(plants)
    return jsonify(plant)


@app.route('/api/plants/<plant_id>/photos/<photo_id>', methods=['DELETE'])
def delete_photo(plant_id, photo_id):
    plants = load_plants()
    plant = find_plant(plants, plant_id)
    if not plant:
        return jsonify({'error': 'Not found'}), 404
    photos = plant.get('photos', [])
    photo = next((p for p in photos if p['id'] == photo_id), None)
    if not photo:
        return jsonify({'error': 'Photo not found'}), 404
    path = os.path.join(PHOTOS_DIR, photo['filename'])
    if os.path.exists(path):
        os.remove(path)
    plant['photos'] = [p for p in photos if p['id'] != photo_id]
    save_plants(plants)
    return '', 204


@app.route('/api/archive', methods=['GET'])
def get_archive():
    return jsonify([p for p in load_plants() if p.get('archived')])


@app.route('/api/plants/<plant_id>/archive', methods=['POST'])
def archive_plant(plant_id):
    plants = load_plants()
    plant = find_plant(plants, plant_id)
    if not plant:
        return jsonify({'error': 'Not found'}), 404
    data = request.get_json(silent=True) or {}
    plant['archived'] = True
    plant['archived_date'] = date.today().isoformat()
    plant['archive_reason'] = data.get('reason', '')
    save_plants(plants)
    return jsonify(plant)


@app.route('/api/plants/<plant_id>/restore', methods=['POST'])
def restore_plant(plant_id):
    plants = load_plants()
    plant = find_plant(plants, plant_id)
    if not plant:
        return jsonify({'error': 'Not found'}), 404
    plant['archived'] = False
    plant['archived_date'] = ''
    plant['archive_reason'] = ''
    save_plants(plants)
    return jsonify(plant)


@app.route('/api/cuttings', methods=['GET'])
def get_cuttings():
    return jsonify(load_cuttings())


@app.route('/api/cuttings', methods=['POST'])
def create_cutting():
    cuttings = load_cuttings()
    data = request.json
    cutting = {
        'id': str(uuid.uuid4()),
        'name': data.get('name', ''),
        'parent_plant_id': data.get('parent_plant_id', ''),
        'date_taken': data.get('date_taken', date.today().isoformat()),
        'method': data.get('method', 'water'),
        'status': data.get('status', 'rooting'),
        'notes': data.get('notes', ''),
    }
    cuttings.append(cutting)
    save_cuttings(cuttings)
    return jsonify(cutting), 201


@app.route('/api/cuttings/<cutting_id>', methods=['PUT'])
def update_cutting(cutting_id):
    cuttings = load_cuttings()
    cutting = next((c for c in cuttings if c['id'] == cutting_id), None)
    if not cutting:
        return jsonify({'error': 'Not found'}), 404
    data = request.json
    for field in ('name', 'parent_plant_id', 'date_taken', 'method', 'status', 'notes'):
        if field in data:
            cutting[field] = data[field]
    save_cuttings(cuttings)
    return jsonify(cutting)


@app.route('/api/cuttings/<cutting_id>', methods=['DELETE'])
def delete_cutting(cutting_id):
    cuttings = load_cuttings()
    cuttings = [c for c in cuttings if c['id'] != cutting_id]
    save_cuttings(cuttings)
    return '', 204


# ── Sowings (посевной дневник) ──────────────────────────────────────────────
# sprouted_count / first_sprout_date are derived from the log — not directly settable
SOWING_FIELDS = (
    'name', 'sowing_date', 'seeds_count',
    'expected_min_days', 'expected_max_days',
    'substrate', 'pretreatment', 'notes', 'status',
    'contents',
)


@app.route('/api/sowings', methods=['GET'])
def get_sowings():
    return jsonify(load_sowings())


@app.route('/api/sowings', methods=['POST'])
def create_sowing():
    sowings = load_sowings()
    data = request.json or {}
    sowing_date = data.get('sowing_date', date.today().isoformat())
    seeds = data.get('seeds_count', None)
    sowing = {
        'id': str(uuid.uuid4()),
        'name': data.get('name', ''),
        'sowing_date': sowing_date,
        'seeds_count': seeds,
        'sprouted_count': None,
        'expected_min_days': data.get('expected_min_days', None),
        'expected_max_days': data.get('expected_max_days', None),
        'first_sprout_date': '',
        'substrate': data.get('substrate', ''),
        'pretreatment': data.get('pretreatment', []),
        'notes': data.get('notes', ''),
        'status': data.get('status', 'sown'),
        'contents': data.get('contents', []),
        'log': [{'date': sowing_date, 'event': 'sown', 'count': seeds}],
        'photos': [],
    }
    recompute_sowing(sowing)
    sowings.append(sowing)
    save_sowings(sowings)
    return jsonify(sowing), 201


@app.route('/api/sowings/<sowing_id>/log', methods=['POST'])
def add_sowing_log(sowing_id):
    sowings = load_sowings()
    sowing = next((s for s in sowings if s['id'] == sowing_id), None)
    if not sowing:
        return jsonify({'error': 'Not found'}), 404
    data = request.json or {}
    event = data.get('event', 'note')
    entry = {'date': data.get('date') or date.today().isoformat(), 'event': event}
    if data.get('count') not in (None, ''):
        entry['count'] = int(data['count'])
    if data.get('notes'):
        entry['notes'] = data['notes'].strip()
    sowing.setdefault('log', []).append(entry)
    sowing['log'].sort(key=lambda e: e.get('date', ''))
    recompute_sowing(sowing)
    # Nudge status forward (never downgrade a manual terminal state)
    if event == 'sprout' and sowing.get('status') == 'sown':
        sowing['status'] = 'germinated'
    elif event == 'pricked_out' and sowing.get('status') in ('sown', 'germinated'):
        sowing['status'] = 'pricked_out'
    save_sowings(sowings)
    return jsonify(sowing), 201


@app.route('/api/sowings/<sowing_id>/log', methods=['DELETE'])
def delete_sowing_log(sowing_id):
    sowings = load_sowings()
    sowing = next((s for s in sowings if s['id'] == sowing_id), None)
    if not sowing:
        return jsonify({'error': 'Not found'}), 404
    data = request.get_json(silent=True) or {}
    idx = data.get('index')
    log = sowing.get('log', [])
    if idx is None or idx < 0 or idx >= len(log):
        return jsonify({'error': 'Bad index'}), 400
    log.pop(idx)
    recompute_sowing(sowing)
    save_sowings(sowings)
    return jsonify(sowing)


@app.route('/api/sowings/<sowing_id>', methods=['PUT'])
def update_sowing(sowing_id):
    sowings = load_sowings()
    sowing = next((s for s in sowings if s['id'] == sowing_id), None)
    if not sowing:
        return jsonify({'error': 'Not found'}), 404
    data = request.json or {}
    old_sowing_date = sowing.get('sowing_date')
    for field in SOWING_FIELDS:
        if field in data:
            sowing[field] = data[field]
    # Keep the initial "sown" log entry in sync with an edited sowing date
    new_date = sowing.get('sowing_date')
    if new_date and new_date != old_sowing_date:
        for e in sowing.get('log', []):
            if e.get('event') == 'sown':
                e['date'] = new_date
                if 'seeds_count' in data:
                    e['count'] = sowing.get('seeds_count')
                break
        sowing['log'].sort(key=lambda e: e.get('date', ''))
    recompute_sowing(sowing)
    save_sowings(sowings)
    return jsonify(sowing)


@app.route('/api/sowings/<sowing_id>', methods=['DELETE'])
def delete_sowing(sowing_id):
    sowings = load_sowings()
    target = next((s for s in sowings if s['id'] == sowing_id), None)
    if target:
        for photo in target.get('photos', []):
            path = os.path.join(PHOTOS_DIR, photo['filename'])
            if os.path.exists(path):
                os.remove(path)
    sowings = [s for s in sowings if s['id'] != sowing_id]
    save_sowings(sowings)
    return '', 204


@app.route('/api/sowings/<sowing_id>/photos', methods=['POST'])
def upload_sowing_photo(sowing_id):
    sowings = load_sowings()
    sowing = next((s for s in sowings if s['id'] == sowing_id), None)
    if not sowing:
        return jsonify({'error': 'Not found'}), 404
    if 'photo' not in request.files:
        return jsonify({'error': 'No file'}), 400
    file = request.files['photo']
    photo_date = request.form.get('date', date.today().isoformat())
    description = request.form.get('description', '')
    photo_id = str(uuid.uuid4())
    ext = os.path.splitext(file.filename)[1].lower() or '.jpg'
    filename = f"{sowing_id}_{photo_id}{ext}"
    file.save(os.path.join(PHOTOS_DIR, filename))
    entry = {'id': photo_id, 'filename': filename, 'date': photo_date, 'description': description}
    sowing.setdefault('photos', []).append(entry)
    save_sowings(sowings)
    return jsonify(entry), 201


@app.route('/api/sowings/<sowing_id>/photos/<photo_id>', methods=['DELETE'])
def delete_sowing_photo(sowing_id, photo_id):
    sowings = load_sowings()
    sowing = next((s for s in sowings if s['id'] == sowing_id), None)
    if not sowing:
        return jsonify({'error': 'Not found'}), 404
    photos = sowing.get('photos', [])
    photo = next((p for p in photos if p['id'] == photo_id), None)
    if not photo:
        return jsonify({'error': 'Photo not found'}), 404
    path = os.path.join(PHOTOS_DIR, photo['filename'])
    if os.path.exists(path):
        os.remove(path)
    sowing['photos'] = [p for p in photos if p['id'] != photo_id]
    save_sowings(sowings)
    return '', 204


# ── Backup / restore ────────────────────────────────────────────────────────
DATA_FILES = (DATA_FILE, CUTTINGS_FILE, SOWINGS_FILE)


@app.route('/api/backup', methods=['GET'])
def download_backup():
    """Everything (data + photos) as one ZIP."""
    mem = io.BytesIO()
    with zipfile.ZipFile(mem, 'w', zipfile.ZIP_DEFLATED) as z:
        for path in DATA_FILES:
            if os.path.exists(path):
                z.write(path, os.path.basename(path))
        if os.path.isdir(PHOTOS_DIR):
            for name in sorted(os.listdir(PHOTOS_DIR)):
                full = os.path.join(PHOTOS_DIR, name)
                if os.path.isfile(full):
                    z.write(full, f'photos/{name}')
    mem.seek(0)
    return send_file(
        mem, mimetype='application/zip', as_attachment=True,
        download_name=f'plantassist-backup-{date.today().isoformat()}.zip',
    )


@app.route('/api/restore', methods=['POST'])
def restore_backup():
    """Restore from a backup ZIP produced by /api/backup."""
    if 'backup' not in request.files:
        return jsonify({'error': 'No file'}), 400
    file = request.files['backup']
    allowed = {os.path.basename(p) for p in DATA_FILES}
    restored = {'data': 0, 'photos': 0}
    try:
        with zipfile.ZipFile(file) as z:
            names = z.namelist()
            if not any(n in allowed for n in names):
                return jsonify({'error': 'Не похоже на бэкап PlantAssist'}), 400
            for name in names:
                if name.endswith('/'):
                    continue
                base = os.path.basename(name)
                if not base:
                    continue
                if name in allowed:
                    target = os.path.join(BASE_DIR, base)
                    with z.open(name) as src:
                        payload = src.read()
                    json.loads(payload.decode('utf-8'))  # validate before writing
                    tmp = f'{target}.tmp'
                    with open(tmp, 'wb') as out:
                        out.write(payload)
                    os.replace(tmp, target)
                    restored['data'] += 1
                elif name.startswith('photos/'):
                    target = os.path.join(PHOTOS_DIR, base)  # basename blocks path traversal
                    with z.open(name) as src, open(target, 'wb') as out:
                        out.write(src.read())
                    restored['photos'] += 1
    except zipfile.BadZipFile:
        return jsonify({'error': 'Повреждённый ZIP'}), 400
    except (ValueError, UnicodeDecodeError):
        return jsonify({'error': 'Повреждённые данные в бэкапе'}), 400
    return jsonify({'ok': True, **restored})


if __name__ == '__main__':
    cert = os.path.join(os.path.dirname(__file__), 'certs', 'server.crt')
    key = os.path.join(os.path.dirname(__file__), 'certs', 'server.key')
    if os.path.exists(cert) and os.path.exists(key):
        # HTTPS mode — needed for full PWA (service worker + install) on phones
        Timer(1.0, lambda: webbrowser.open('https://localhost:5000')).start()
        app.run(host='0.0.0.0', port=5000, debug=False, ssl_context=(cert, key))
    else:
        Timer(1.0, lambda: webbrowser.open('http://localhost:5000')).start()
        app.run(host='0.0.0.0', port=5000, debug=False)
