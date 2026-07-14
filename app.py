import json
import os
import uuid
import webbrowser
from datetime import date, timedelta
from threading import Timer

from flask import Flask, jsonify, request, send_from_directory

app = Flask(__name__, static_folder='static', static_url_path='')

DATA_FILE = os.path.join(os.path.dirname(__file__), 'data.json')
CUTTINGS_FILE = os.path.join(os.path.dirname(__file__), 'cuttings.json')
PHOTOS_DIR = os.path.join(os.path.dirname(__file__), 'photos')

os.makedirs(PHOTOS_DIR, exist_ok=True)


def load_cuttings():
    if not os.path.exists(CUTTINGS_FILE):
        return []
    with open(CUTTINGS_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)


def save_cuttings(cuttings):
    with open(CUTTINGS_FILE, 'w', encoding='utf-8') as f:
        json.dump(cuttings, f, ensure_ascii=False, indent=2)


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
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(plants, f, ensure_ascii=False, indent=2)


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
    for field in ('name', 'description', 'purchased_date', 'watering_note', 'light', 'soil', 'room', 'favorited', 'is_flowering', 'needs_repotting', 'fertilizing_reminder_date'):
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


if __name__ == '__main__':
    Timer(1.0, lambda: webbrowser.open('http://localhost:5000')).start()
    app.run(host='0.0.0.0', port=5000, debug=False)
