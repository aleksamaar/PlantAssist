'use strict';

// ── State ─────────────────────────────────────────────────────────────────────
let plants = [];
let cuttings = [];
let archivePlants = [];
let currentView = 'today';
let sortBy = 'watering';
let filterType = '';
let filterRoom = '';
let filterFavorites = false;
let searchQuery = '';

const CUTTING_METHODS = { water: '💧 В воде', soil: '🌱 В грунте', moss: '🌿 Во мхе' };
const CUTTING_STATUSES = {
  rooting: { label: '🔄 Укоренение', cls: 'rooting' },
  rooted:  { label: '✅ Укоренился', cls: 'rooted' },
  planted: { label: '🪴 Посажен',    cls: 'planted' },
  failed:  { label: '❌ Не прижился', cls: 'failed' },
};

const PLANT_PROBLEMS = [
  '🕷 Паутинный клещ',
  '🪲 Мучнистый червец',
  '🐛 Тля',
  '🛡 Щитовка',
  '🦟 Грибной комарик',
  '🪰 Трипсы',
  '🍄 Грибок',
  '💧 Гниль',
  '🌿 Другое',
];

const ROOM_OPTIONS = ['Гостиная', 'Спальня', 'Кухня', 'Балкон', 'Ванная', 'Кабинет', 'Студия'];

// ── Achievements ──────────────────────────────────────────────────────────────
function _totalHistory(section) {
  return plants.reduce((s, p) => s + (p[section]?.history?.length || 0), 0);
}

const ACHIEVEMENTS = [
  // Коллекция
  { id: 'garden_1',   cat: '🌿 Коллекция', icon: '🌱', name: 'Первый росток',          desc: 'Добавила первое растение',              check: () => plants.length >= 1 },
  { id: 'garden_5',   cat: '🌿 Коллекция', icon: '🪴', name: 'Маленький сад',          desc: '5 растений в коллекции',                check: () => plants.length >= 5 },
  { id: 'garden_10',  cat: '🌿 Коллекция', icon: '🌿', name: 'Зелёный уголок',         desc: '10 растений',                           check: () => plants.length >= 10 },
  { id: 'garden_20',  cat: '🌿 Коллекция', icon: '🌳', name: 'Настоящий сад',          desc: '20 растений',                           check: () => plants.length >= 20 },
  { id: 'garden_35',  cat: '🌿 Коллекция', icon: '🌴', name: 'Оранжерея',              desc: '35 растений — ты живёшь в лесу',        check: () => plants.length >= 35 },
  { id: 'garden_50',  cat: '🌿 Коллекция', icon: '🏡', name: 'Джунгли',                desc: '50 растений — людей уже не видно',      check: () => plants.length >= 50 },
  { id: 'garden_75',  cat: '🌿 Коллекция', icon: '🌾', name: 'Ботанический сад',       desc: '75 растений',                           check: () => plants.length >= 75 },
  { id: 'garden_100', cat: '🌿 Коллекция', icon: '💯', name: 'Сотня',                  desc: '100 растений. Ты ок?',                  check: () => plants.length >= 100 },
  { id: 'garden_150', cat: '🌿 Коллекция', icon: '🏆', name: 'Легенда',                desc: '150 растений — это уже не квартира',    check: () => plants.length >= 150 },

  // Полив
  { id: 'water_1',   cat: '💧 Полив', icon: '💧', name: 'Первый полив',     desc: 'Отметила первый полив',       check: () => _totalHistory('watering') >= 1 },
  { id: 'water_50',  cat: '💧 Полив', icon: '🚿', name: 'Заботливые руки',  desc: '50 поливов суммарно',         check: () => _totalHistory('watering') >= 50 },
  { id: 'water_100', cat: '💧 Полив', icon: '🌊', name: 'Водный мастер',    desc: '100 поливов суммарно',        check: () => _totalHistory('watering') >= 100 },
  { id: 'water_500', cat: '💧 Полив', icon: '🏄', name: 'Легенда полива',   desc: '500 поливов. Серьёзно.',      check: () => _totalHistory('watering') >= 500 },

  // Подкормка
  { id: 'fert_1',  cat: '🌱 Подкормка', icon: '🧪', name: 'Первая подкормка', desc: 'Витамины пошли!',            check: () => _totalHistory('fertilizing') >= 1 },
  { id: 'fert_20', cat: '🌱 Подкормка', icon: '👨‍🌾', name: 'Агроном',          desc: '20 подкормок суммарно',     check: () => _totalHistory('fertilizing') >= 20 },
  { id: 'fert_50', cat: '🌱 Подкормка', icon: '🔬', name: 'Шеф-ботаник',       desc: '50 подкормок — уважение',   check: () => _totalHistory('fertilizing') >= 50 },

  // Цветение
  { id: 'flower_1', cat: '🌸 Цветение', icon: '🌸', name: 'Первый цветок',   desc: 'Зафиксировала первое цветение',  check: () => plants.some(p => (p.flowering_log||[]).length > 0) },
  { id: 'flower_3', cat: '🌸 Цветение', icon: '💐', name: 'Цветочный сад',   desc: '3 растения с историей цветения', check: () => plants.filter(p => (p.flowering_log||[]).length > 0).length >= 3 },
  { id: 'flower_5', cat: '🌸 Цветение', icon: '🌺', name: 'Мастер цветения', desc: '5 растений с историей цветения', check: () => plants.filter(p => (p.flowering_log||[]).length > 0).length >= 5 },

  // Пересадка
  { id: 'repot_1', cat: '🪴 Пересадка', icon: '🪴', name: 'Новый дом',    desc: 'Первая пересадка',         check: () => _totalHistory('repotting') >= 1 },
  { id: 'repot_5', cat: '🪴 Пересадка', icon: '✨', name: 'Золотые руки', desc: '5 пересадок — все живые',  check: () => _totalHistory('repotting') >= 5 },

  // Черенки
  { id: 'cutting_1',         cat: '✂️ Черенки', icon: '✂️', name: 'Первый черенок',     desc: 'Размножение начато',                    check: () => cuttings.length >= 1 },
  { id: 'cutting_5',         cat: '✂️ Черенки', icon: '🌿', name: 'Маленький питомник', desc: '5 черенков в трекере',                  check: () => cuttings.length >= 5 },
  { id: 'cutting_10',        cat: '✂️ Черенки', icon: '🌱', name: 'Питомник',           desc: '10 черенков',                           check: () => cuttings.length >= 10 },
  { id: 'cutting_25',        cat: '✂️ Черенки', icon: '🏭', name: 'Мини-оранжерея',     desc: '25 черенков — серьёзное производство',  check: () => cuttings.length >= 25 },
  { id: 'cutting_50',        cat: '✂️ Черенки', icon: '🚀', name: 'Фабрика растений',   desc: '50 черенков — это уже промышленность', check: () => cuttings.length >= 50 },
  { id: 'cutting_rooted_5',  cat: '✂️ Черенки', icon: '🌳', name: 'Укоренитель',        desc: '5 черенков дали корни',                 check: () => cuttings.filter(c => c.status==='rooted'||c.status==='planted').length >= 5 },
  { id: 'cutting_rooted_20', cat: '✂️ Черенки', icon: '🌲', name: 'Мастер укоренения',  desc: '20 черенков дали корни',                check: () => cuttings.filter(c => c.status==='rooted'||c.status==='planted').length >= 20 },
  { id: 'cutting_water',     cat: '✂️ Черенки', icon: '💧', name: 'Водный метод',       desc: 'Первый черенок в воде',                 check: () => cuttings.some(c => c.method==='water') },
  { id: 'cutting_soil',      cat: '✂️ Черенки', icon: '🪨', name: 'Земляной метод',     desc: 'Первый черенок в грунте',               check: () => cuttings.some(c => c.method==='soil') },
  { id: 'cutting_moss',      cat: '✂️ Черенки', icon: '🍀', name: 'Мховый метод',       desc: 'Первый черенок во мху',                 check: () => cuttings.some(c => c.method==='moss') },
  { id: 'cutting_all',       cat: '✂️ Черенки', icon: '🧬', name: 'Экспериментатор',    desc: 'Попробовала все три метода укоренения', check: () => ['water','soil','moss'].every(m => cuttings.some(c => c.method===m)) },

  // Разнообразие — типы
  { id: 'types_2',  cat: '🌈 Разнообразие', icon: '🌿', name: 'Начало коллекции',     desc: '2 разных типа растений',   check: () => new Set(plants.flatMap(p => p.plant_types||[])).size >= 2 },
  { id: 'types_4',  cat: '🌈 Разнообразие', icon: '🌱', name: 'Любопытный ботаник',   desc: '4 разных типа',            check: () => new Set(plants.flatMap(p => p.plant_types||[])).size >= 4 },
  { id: 'types_6',  cat: '🌈 Разнообразие', icon: '🌳', name: 'Коллекционер',          desc: '6 разных типов',           check: () => new Set(plants.flatMap(p => p.plant_types||[])).size >= 6 },
  { id: 'types_8',  cat: '🌈 Разнообразие', icon: '🔭', name: 'Биолог',                desc: '8 разных типов',           check: () => new Set(plants.flatMap(p => p.plant_types||[])).size >= 8 },
  { id: 'types_10', cat: '🌈 Разнообразие', icon: '📚', name: 'Энциклопедия',          desc: '10 разных типов растений', check: () => new Set(plants.flatMap(p => p.plant_types||[])).size >= 10 },

  // Разнообразие — комнаты
  { id: 'rooms_2',   cat: '🌈 Разнообразие', icon: '🏠', name: 'Везде зелено',           desc: 'Растения в 2 комнатах', check: () => new Set(plants.map(p=>p.room).filter(Boolean)).size >= 2 },
  { id: 'rooms_4',   cat: '🌈 Разнообразие', icon: '🏡', name: 'Полная квартира',         desc: 'Растения в 4 комнатах', check: () => new Set(plants.map(p=>p.room).filter(Boolean)).size >= 4 },
  { id: 'rooms_all', cat: '🌈 Разнообразие', icon: '🏢', name: 'Ни одного пустого угла',  desc: '5+ разных комнат',      check: () => new Set(plants.map(p=>p.room).filter(Boolean)).size >= 5 },

  // Особые
  { id: 'favorite_3',   cat: '⭐ Особые', icon: '❤️', name: 'Любимчики',   desc: '3 растения в избранном',     check: () => plants.filter(p=>p.favorited).length >= 3 },
  { id: 'longevity_1y', cat: '⭐ Особые', icon: '🎂', name: 'Долгожитель', desc: 'Растение у тебя уже год',    check: () => plants.some(p => p.purchased_date && (Date.now()-new Date(p.purchased_date))/86400000 >= 365) },
  { id: 'longevity_2y', cat: '⭐ Особые', icon: '🏅', name: 'Ветеран',     desc: '2 года — это преданность',   check: () => plants.some(p => p.purchased_date && (Date.now()-new Date(p.purchased_date))/86400000 >= 730) },
  { id: 'pest_10',      cat: '⭐ Особые', icon: '🦸', name: 'Спасатель',   desc: '10 обработок от вредителей', check: () => _totalHistory('pest_control') >= 10 },
];
const SOIL_OPTIONS = ['Обычный грунт', 'Кокосовый субстрат', 'Мох', 'Для кактусов'];
const FERTILIZER_OPTIONS = ['Plargon Grow', 'Amixol', 'Для цветущих'];
const PEST_PRODUCT_OPTIONS = ['Фитоверм', 'Актара'];
const VITAMINS_OPTIONS = ['Epin', 'Циркон', 'Цитовит', 'HB-101', 'Янтарная кислота', 'Алирин-Б'];

const PLANT_TYPES = [
  '🌵 Суккуленты и кактусы',
  '🌿 Арроидные',
  '🍃 Декоративно-лиственные',
  '🌸 Цветущие',
  '🌲 Папоротники',
  '🍀 Ампельные',
  '🌴 Тропические',
  '🧅 Клубневые и луковичные',
  '🪴 Другое',
];

// ── Utils ─────────────────────────────────────────────────────────────────────
const pad = n => String(n).padStart(2, '0');

// All date functions use LOCAL time so UTC+N timezones work correctly.
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

function addDays(dateStr, days) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  const r = new Date(y, m - 1, d + days);
  return `${r.getFullYear()}-${pad(r.getMonth() + 1)}-${pad(r.getDate())}`;
}

function daysDiff(dateStr) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target - todayMidnight) / 86400000);
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const [y, m, day] = dateStr.split('-');
  return `${day}.${m}.${y}`;
}

function nextDate(section) {
  const last = section.last_date;
  const freq = section.frequency_days;
  if (!last || !freq) return null;
  return addDays(last, freq);
}

function getCardStatus(plant) {
  const t = today();
  const dates = [];
  const wNext = nextDate(plant.watering);
  if (wNext) dates.push(wNext);
  const fNext = nextDate(plant.fertilizing);
  if (fNext) dates.push(fNext);
  if (plant.fertilizing_reminder_date) dates.push(plant.fertilizing_reminder_date);
  if (plant.repotting?.last_date) dates.push(addDays(plant.repotting.last_date, 365));
  if (plant.needs_repotting) dates.push(t);
  if (plant.pest_control?.last_date && plant.pest_control?.frequency_days)
    dates.push(addDays(plant.pest_control.last_date, plant.pest_control.frequency_days));
  if (plant.vitamins?.last_date && plant.vitamins?.frequency_days)
    dates.push(addDays(plant.vitamins.last_date, plant.vitamins.frequency_days));
  if (!dates.length) return { status: 'none', label: 'Нет данных' };
  const earliest = dates.sort()[0];
  const diff = daysDiff(earliest);
  if (diff < 0) return { status: 'overdue', label: `Просрочен на ${Math.abs(diff)} дн.` };
  if (diff === 0) return { status: 'today', label: 'Сегодня' };
  if (diff <= 2) return { status: 'soon', label: `Через ${diff} дн.` };
  return { status: 'ok', label: 'Всё хорошо' };
}

// ── Custom select with user-saved options ─────────────────────────────────────
function getCustomList(key) {
  try { return JSON.parse(localStorage.getItem('customList_' + key) || '[]'); } catch { return []; }
}
function saveCustomItem(key, value) {
  const list = getCustomList(key);
  if (!list.includes(value)) { list.push(value); localStorage.setItem('customList_' + key, JSON.stringify(list)); }
}
function mountCustomSelect(wrapperId, selectId, storageKey, defaults, currentValue) {
  const wrap = document.getElementById(wrapperId);
  if (!wrap) return;
  wrap.innerHTML = '';
  const select = document.createElement('select');
  select.id = selectId;
  const buildOptions = () => {
    const prev = select.value;
    select.innerHTML = '';
    select.appendChild(new Option('— не указано —', ''));
    [...defaults, ...getCustomList(storageKey)].forEach(item => select.appendChild(new Option(item, item)));
    select.appendChild(new Option('✏️ Добавить свой...', '__add__'));
    select.value = prev || currentValue || '';
  };
  buildOptions();
  const addRow = document.createElement('div');
  addRow.style.cssText = 'display:none;align-items:center;gap:6px;margin-top:6px;';
  const addInput = document.createElement('input');
  addInput.type = 'text';
  addInput.placeholder = 'Введите название...';
  addInput.style.flex = '1';
  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'btn-primary';
  addBtn.textContent = 'Добавить';
  addBtn.style.cssText = 'padding:5px 10px;font-size:0.85em;white-space:nowrap;';
  addRow.appendChild(addInput);
  addRow.appendChild(addBtn);
  const save = () => {
    const val = addInput.value.trim();
    if (!val) return;
    saveCustomItem(storageKey, val);
    buildOptions();
    select.value = val;
    addRow.style.display = 'none';
    addInput.value = '';
  };
  select.addEventListener('change', () => {
    addRow.style.display = select.value === '__add__' ? 'flex' : 'none';
    if (select.value === '__add__') addInput.focus();
  });
  addBtn.addEventListener('click', save);
  addInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); save(); } });
  wrap.appendChild(select);
  wrap.appendChild(addRow);
}
function getCustomSelectValue(selectId) {
  const el = document.getElementById(selectId);
  if (!el || el.value === '__add__') return '';
  return el.value;
}

// ── Plant form draft (auto-save for new plants) ───────────────────────────────
const DRAFT_KEY = 'plantFormDraft';

function savePlantFormDraft() {
  if (document.getElementById('form-id')?.value) return;
  const draft = {
    name: document.getElementById('form-name')?.value || '',
    description: document.getElementById('form-description')?.value || '',
    purchased: document.getElementById('form-purchased')?.value || '',
    waterLast: document.getElementById('form-water-last')?.value || '',
    waterFreq: document.getElementById('form-water-freq')?.value || '',
    fertLast: document.getElementById('form-fert-last')?.value || '',
    fertFreq: document.getElementById('form-fert-freq')?.value || '',
    repotLast: document.getElementById('form-repot-last')?.value || '',
    pestLast: document.getElementById('form-pest-last')?.value || '',
    pestFreq: document.getElementById('form-pest-freq')?.value || '',
    vitaminsLast: document.getElementById('form-vitamins-last')?.value || '',
    vitaminsFreq: document.getElementById('form-vitamins-freq')?.value || '',
    wateringNote: document.getElementById('form-watering-note')?.value || '',
    light: document.getElementById('form-light')?.value || '',
    soil: getCustomSelectValue('form-soil'),
    room: getCustomSelectValue('form-room'),
    favorited: document.getElementById('form-favorited')?.checked || false,
    isFlowering: document.getElementById('form-is-flowering')?.checked || false,
    needsRepotting: document.getElementById('form-needs-repotting')?.checked || false,
    fertReminder: '',
    plantTypes: getSelectedTypes(),
    problems: getSelectedProblems(),
  };
  if (draft.name || draft.description || draft.purchased || draft.waterLast) {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }
}

function loadPlantFormDraft() {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); } catch { return null; }
}

function clearPlantFormDraft() {
  localStorage.removeItem(DRAFT_KEY);
}

function dateStatus(next) {
  if (!next) return 'none';
  const diff = daysDiff(next);
  if (diff < 0) return 'overdue';
  if (diff <= 1) return 'soon';
  return 'ok';
}

function dateBadgeLabel(next) {
  if (!next) return 'не задано';
  const diff = daysDiff(next);
  if (diff < 0) return `просрочен на ${Math.abs(diff)} д.`;
  if (diff === 0) return 'сегодня';
  if (diff === 1) return 'завтра';
  return `через ${diff} д.`;
}

/** Photos sorted newest-first; among equal dates, last uploaded comes first */
function sortedPhotos(plant) {
  const photos = plant.photos || [];
  return [...photos].reverse().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

/** URL of the cover (most recent) photo, or null */
function coverSrc(plant) {
  const photos = sortedPhotos(plant);
  return photos.length ? `/photos/${photos[0].filename}` : null;
}

// ── API ───────────────────────────────────────────────────────────────────────
async function api(method, path, body) {
  const opts = { method, headers: {} };
  if (body) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
  const res = await fetch(path, opts);
  if (!res.ok) throw new Error(await res.text());
  if (res.status === 204) return null;
  return res.json();
}

async function loadPlants() {
  plants = await api('GET', '/api/plants');
  render();
}

async function loadCuttings() {
  cuttings = await api('GET', '/api/cuttings');
  renderCuttings();
}

async function loadArchive() {
  archivePlants = await api('GET', '/api/archive');
  renderArchive();
}

// ── Render ────────────────────────────────────────────────────────────────────
function render() {
  document.getElementById('plants-stats').textContent = plants.length ? `${plants.length} растений` : '';
  renderToday();
  renderAll();
}

// ─ Today summary cards ────────────────────────────────────────────────────────
function renderTodaySummary() {
  const old = document.getElementById('today-summary');
  if (old) old.remove();

  const t = today();
  let waterCount = 0, fertCount = 0, repotCount = 0;
  plants.forEach(p => {
    const wNext = nextDate(p.watering);
    if (wNext && wNext <= t) waterCount++;
    const fNext = nextDate(p.fertilizing);
    if ((fNext && fNext <= t) || (p.fertilizing_reminder_date && p.fertilizing_reminder_date <= t)) fertCount++;
    if ((p.repotting?.last_date && addDays(p.repotting.last_date, 365) <= t) || p.needs_repotting) repotCount++;
  });
  const okCount = plants.filter(p => !hasOverdueTasks(p)).length;

  const row = document.createElement('div');
  row.id = 'today-summary';
  row.className = 'today-summary-row';

  [
    { icon: '💧', count: waterCount, label: 'Полить' },
    { icon: '🌱', count: fertCount, label: 'Подкормить' },
    { icon: '🪴', count: repotCount, label: 'Пересадить' },
    { icon: '✅', count: okCount, label: 'Всё хорошо', ok: true },
  ].forEach(({ icon, count, label, ok }) => {
    if (count === 0 && !ok) return;
    const card = document.createElement('div');
    card.className = 'today-summary-card' + (ok ? ' ok' : '');
    card.innerHTML = `<div class="today-summary-icon">${icon}</div><div class="today-summary-count">${count}</div><div class="today-summary-label">${label}<br>раст.</div>`;
    row.appendChild(card);
  });

  const list = document.getElementById('today-list');
  if (list) list.parentNode.insertBefore(row, list);
}

function renderFavoritesRow() {
  const old = document.getElementById('favorites-section');
  if (old) old.remove();

  const favs = plants.filter(p => p.favorited);
  if (!favs.length) return;

  const section = document.createElement('div');
  section.id = 'favorites-section';
  section.className = 'favorites-section';

  const header = document.createElement('div');
  header.className = 'favorites-section-header';
  const title = document.createElement('h3');
  title.className = 'favorites-section-title';
  title.textContent = 'Любимые растения';
  header.appendChild(title);
  section.appendChild(header);

  const scroll = document.createElement('div');
  scroll.className = 'favorites-scroll';

  favs.forEach(p => {
    const item = document.createElement('div');
    item.className = 'fav-plant-circle';
    item.addEventListener('click', () => openDetail(p.id));

    const photoWrap = document.createElement('div');
    photoWrap.className = 'fav-plant-photo';
    const src = coverSrc(p);
    if (src) {
      const img = document.createElement('img');
      img.src = src;
      img.alt = p.name;
      photoWrap.appendChild(img);
    } else {
      const ph = document.createElement('div');
      ph.className = 'fav-placeholder';
      ph.textContent = '🌿';
      photoWrap.appendChild(ph);
    }

    const nameEl = document.createElement('div');
    nameEl.className = 'fav-plant-name';
    nameEl.textContent = p.name;

    item.appendChild(photoWrap);
    item.appendChild(nameEl);
    scroll.appendChild(item);
  });

  section.appendChild(scroll);
  const list = document.getElementById('today-list');
  if (list) list.parentNode.insertBefore(section, list);
}

// ─ Today view ─────────────────────────────────────────────────────────────────
function renderToday() {
  renderTodaySummary();
  renderFavoritesRow();

  const list = document.getElementById('today-list');
  const empty = document.getElementById('today-empty');
  const t = today();

  const items = plants.map(p => {
    const tasks = [];
    const wNext = nextDate(p.watering);
    if (wNext && wNext <= t) tasks.push({ type: 'water', label: '💧 Полить' });
    const fNext = nextDate(p.fertilizing);
    if (fNext && fNext <= t) tasks.push({ type: 'fertilize', label: '🌱 Подкормить' });
    if (p.fertilizing_reminder_date && p.fertilizing_reminder_date <= t && !tasks.some(x => x.type === 'fertilize'))
      tasks.push({ type: 'fertilize', label: '🌱 Подкормить' });
    if (p.repotting.last_date) {
      const rNext = addDays(p.repotting.last_date, 365);
      if (rNext <= t) tasks.push({ type: 'repot', label: '🪴 Пересадить' });
    }
    if (p.needs_repotting && !tasks.some(x => x.type === 'repot'))
      tasks.push({ type: 'repot', label: '🪴 Пересадить' });
    if (p.pest_control?.last_date && p.pest_control?.frequency_days) {
      const pcNext = addDays(p.pest_control.last_date, p.pest_control.frequency_days);
      if (pcNext <= t) tasks.push({ type: 'pest_control', label: '🐛 Обработать' });
    }
    if (p.vitamins?.last_date && p.vitamins?.frequency_days) {
      const vNext = addDays(p.vitamins.last_date, p.vitamins.frequency_days);
      if (vNext <= t) tasks.push({ type: 'vitamins', label: '💊 Витамины' });
    }
    return { plant: p, tasks };
  }).filter(i => i.tasks.length > 0);

  list.innerHTML = '';
  if (items.length === 0) {
    empty.style.display = '';
    return;
  }
  empty.style.display = 'none';

  items.forEach(({ plant, tasks }) => {
    const row = document.createElement('div');
    row.className = 'today-plant';

    const photoWrap = document.createElement('div');
    photoWrap.className = 'today-photo';
    const src = coverSrc(plant);
    if (src) {
      const img = document.createElement('img');
      img.src = src;
      img.alt = plant.name;
      photoWrap.appendChild(img);
    } else {
      photoWrap.textContent = '🌿';
    }

    const info = document.createElement('div');
    info.className = 'today-info';

    const name = document.createElement('div');
    name.className = 'today-name';
    name.textContent = plant.name;

    const taskList = document.createElement('div');
    taskList.className = 'today-tasks';

    tasks.forEach(task => {
      const chip = document.createElement('button');
      chip.className = `task-chip ${task.type}`;
      chip.textContent = task.label;
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        if (chip.classList.contains('done')) return;
        openActionDateModal(plant.id, task.type, () => {
          chip.classList.add('done');
          chip.textContent = '✓ ' + chip.textContent;
        });
      });
      taskList.appendChild(chip);
    });

    info.appendChild(name);
    info.appendChild(taskList);
    row.appendChild(photoWrap);
    row.appendChild(info);

    const openBtn = document.createElement('button');
    openBtn.className = 'btn-secondary';
    openBtn.style.flexShrink = '0';
    openBtn.textContent = 'Открыть';
    openBtn.addEventListener('click', () => openDetail(plant.id));
    row.appendChild(openBtn);

    list.appendChild(row);
  });
}

function hasOverdueTasks(plant) {
  const t = today();
  if (nextDate(plant.watering) && nextDate(plant.watering) <= t) return true;
  if (nextDate(plant.fertilizing) && nextDate(plant.fertilizing) <= t) return true;
  if (plant.fertilizing_reminder_date && plant.fertilizing_reminder_date <= t) return true;
  if (plant.repotting?.last_date && addDays(plant.repotting.last_date, 365) <= t) return true;
  if (plant.needs_repotting) return true;
  if (plant.pest_control?.last_date && plant.pest_control?.frequency_days &&
      addDays(plant.pest_control.last_date, plant.pest_control.frequency_days) <= t) return true;
  if (plant.vitamins?.last_date && plant.vitamins?.frequency_days &&
      addDays(plant.vitamins.last_date, plant.vitamins.frequency_days) <= t) return true;
  return false;
}

// ─ All plants view ─────────────────────────────────────────────────────────────
function sortedBySection(arr, section) {
  return [...arr].sort((a, b) => {
    const aDate = section === 'purchased_date' ? (a.purchased_date || '') : (a[section]?.last_date || '');
    const bDate = section === 'purchased_date' ? (b.purchased_date || '') : (b[section]?.last_date || '');
    if (!aDate && !bDate) return 0;
    if (!aDate) return 1;
    if (!bDate) return -1;
    return section === 'purchased_date' ? bDate.localeCompare(aDate) : aDate.localeCompare(bDate);
  });
}

function updateTypeFilter() {
  const bar = document.getElementById('type-filter-bar');
  if (!bar) return;
  const existing = new Set(plants.flatMap(p => p.plant_types || []));
  bar.innerHTML = '';

  const makeBtn = (label, value) => {
    const btn = document.createElement('button');
    btn.className = 'type-filter-btn' + (filterType === value ? ' active' : '');
    btn.textContent = label;
    btn.addEventListener('click', () => { filterType = value; renderAll(); });
    bar.appendChild(btn);
  };

  makeBtn('Все', '');

  // Favorites toggle
  const favBtn = document.createElement('button');
  favBtn.className = 'type-filter-btn' + (filterFavorites ? ' active' : '');
  favBtn.textContent = '❤️ Избранные';
  favBtn.addEventListener('click', () => { filterFavorites = !filterFavorites; renderAll(); });
  bar.appendChild(favBtn);

  PLANT_TYPES.forEach(t => { if (existing.has(t)) makeBtn(t, t); });
}

function updateRoomFilter() {
  const bar = document.getElementById('room-filter-bar');
  if (!bar) return;
  const rooms = [...new Set(plants.map(p => p.room).filter(Boolean))];
  if (rooms.length < 2) { bar.style.display = 'none'; return; }
  bar.style.display = '';
  bar.innerHTML = '';

  const makeBtn = (label, value) => {
    const btn = document.createElement('button');
    btn.className = 'type-filter-btn' + (filterRoom === value ? ' active' : '');
    btn.textContent = label;
    btn.addEventListener('click', () => { filterRoom = value; renderAll(); });
    bar.appendChild(btn);
  };

  makeBtn('📍 Все комнаты', '');
  rooms.forEach(r => makeBtn('📍 ' + r, r));
}

function renderAll() {
  const grid = document.getElementById('plants-grid');
  const empty = document.getElementById('plants-empty');
  grid.innerHTML = '';
  updateTypeFilter();

  updateRoomFilter();

  const q = searchQuery.toLowerCase();
  const visible = plants.filter(p =>
    (!filterType || (p.plant_types || []).includes(filterType)) &&
    (!filterRoom || p.room === filterRoom) &&
    (!filterFavorites || p.favorited) &&
    (!q || p.name.toLowerCase().includes(q))
  );

  if (visible.length === 0) {
    empty.style.display = '';
    document.getElementById('plants-stats').textContent = '';
    return;
  }
  empty.style.display = 'none';
  document.getElementById('plants-stats').textContent =
    `${visible.length} ${visible.length === 1 ? 'растение' : visible.length < 5 ? 'растения' : 'растений'}`;

  sortedBySection(visible, sortBy).forEach(p => grid.appendChild(buildCard(p)));
}

function buildCard(plant) {
  const card = document.createElement('div');
  const hasProblems = (plant.problems || []).length > 0;
  const hasOverdue = hasOverdueTasks(plant);
  card.className = 'plant-card' + (hasProblems ? ' has-problems' : '') + (hasOverdue ? ' has-overdue' : '');
  card.addEventListener('click', () => openDetail(plant.id));

  // Photo area
  const src = coverSrc(plant);
  let photoContainer;
  if (src) {
    const photoDiv = document.createElement('div');
    photoDiv.className = 'plant-photo';
    const img = document.createElement('img');
    img.src = src;
    img.alt = plant.name;
    photoDiv.appendChild(img);
    const count = (plant.photos || []).length;
    if (count > 1) {
      const badge = document.createElement('div');
      badge.className = 'photo-count-badge';
      badge.textContent = `📷 ${count}`;
      photoDiv.appendChild(badge);
    }
    card.appendChild(photoDiv);
    photoContainer = photoDiv;
  } else {
    const ph = document.createElement('div');
    ph.className = 'plant-photo-placeholder';
    ph.textContent = '🌿';
    card.appendChild(ph);
    photoContainer = ph;
  }

  // Flowering badge
  if (plant.is_flowering) {
    const flBadge = document.createElement('div');
    flBadge.className = 'plant-flowering-badge';
    flBadge.textContent = '🌸 Цветёт';
    photoContainer.appendChild(flBadge);
  }

  // Favorite heart button
  const heartBtn = document.createElement('button');
  heartBtn.className = 'card-heart-btn';
  heartBtn.title = plant.favorited ? 'Убрать из избранного' : 'В избранное';
  heartBtn.textContent = plant.favorited ? '❤️' : '🤍';
  heartBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    const updated = await api('PUT', `/api/plants/${plant.id}`, { favorited: !plant.favorited });
    const idx = plants.findIndex(p => p.id === plant.id);
    if (idx !== -1) plants[idx] = updated;
    render();
  });
  photoContainer.appendChild(heartBtn);

  // Card body: name, room, status dot
  const body = document.createElement('div');
  body.className = 'plant-body';

  const name = document.createElement('div');
  name.className = 'plant-name';
  name.textContent = plant.name;
  body.appendChild(name);

  if (plant.room) {
    const roomEl = document.createElement('div');
    roomEl.className = 'plant-room-text';
    roomEl.textContent = plant.room;
    body.appendChild(roomEl);
  }

  // Status dot + text
  const cardStatus = getCardStatus(plant);
  const statusRow = document.createElement('div');
  statusRow.className = 'plant-status-row';
  const dot = document.createElement('span');
  dot.className = `status-dot ${cardStatus.status}`;
  const statusText = document.createElement('span');
  statusText.className = `status-text ${cardStatus.status}`;
  statusText.textContent = cardStatus.label;
  statusRow.appendChild(dot);
  statusRow.appendChild(statusText);
  body.appendChild(statusRow);

  // Problems chips (compact)
  const problems = plant.problems || [];
  if (problems.length) {
    const pb = document.createElement('div');
    pb.className = 'plant-problems-badge';
    problems.slice(0, 2).forEach(pr => {
      const chip = document.createElement('span');
      chip.className = 'problem-chip-card';
      chip.textContent = pr;
      pb.appendChild(chip);
    });
    if (problems.length > 2) {
      const more = document.createElement('span');
      more.className = 'problem-chip-card';
      more.textContent = `+${problems.length - 2}`;
      pb.appendChild(more);
    }
    body.appendChild(pb);
  }

  card.appendChild(body);

  // Footer: icon + label action buttons
  const footer = document.createElement('div');
  footer.className = 'card-footer';

  [
    { icon: '💧', label: 'Полить', action: 'water' },
    { icon: '🌱', label: 'Удобрить', action: 'fertilize' },
    { icon: '🪴', label: 'Пересадить', action: 'repot' },
  ].forEach(({ icon, label, action }) => {
    const btn = document.createElement('button');
    btn.className = 'card-action-btn';
    btn.title = label;
    const iconEl = document.createElement('span');
    iconEl.className = 'card-action-icon';
    iconEl.textContent = icon;
    const labelEl = document.createElement('span');
    labelEl.className = 'card-action-label';
    labelEl.textContent = label;
    btn.appendChild(iconEl);
    btn.appendChild(labelEl);
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openActionDateModal(plant.id, action, () => btn.classList.add('done'));
    });
    footer.appendChild(btn);
  });

  card.appendChild(footer);
  return card;
}

function makeDateRow(label, section) {
  const row = document.createElement('div');
  row.className = 'date-row';
  const lbl = document.createElement('span');
  lbl.className = 'date-label';
  lbl.textContent = label + ':';
  const badge = document.createElement('span');
  badge.className = 'date-badge none';
  badge.textContent = section.last_date ? formatDate(section.last_date) : 'не задано';
  row.appendChild(lbl);
  row.appendChild(badge);
  const next = nextDate(section);
  if (next) {
    const nextBadge = document.createElement('span');
    nextBadge.className = `date-badge ${dateStatus(next)}`;
    nextBadge.textContent = dateBadgeLabel(next);
    row.appendChild(nextBadge);
  }
  return row;
}

// ── Actions ───────────────────────────────────────────────────────────────────
const ACTION_LABELS = {
  water: '💧 Полить',
  fertilize: '🌱 Подкормить',
  repot: '🪴 Пересадить',
  pest_control: '🐛 Обработать',
  vitamins: '💊 Витамины',
};

const ACTION_TOASTS = {
  water: [
    '💧 Молодец! Растение счастливо!',
    '💧 Ты заботливая хозяйка! Водичка выпита 🌿',
    '💧 Отлично! Так держать! 🌱',
    '💧 Напоила! Растение говорит спасибо!',
    '💧 Умница! Растению теперь хорошо 🌿',
  ],
  fertilize: [
    '🌱 Умница! Витаминчики приняты!',
    '🌱 Молодец! Растение будет цвести 🌸',
    '🌱 Отлично! Ты лучшая хозяйка!',
  ],
  repot: [
    '🪴 Молодец! Это была непростая работа!',
    '🪴 Умница! Растению нравится новый дом 🌿',
    '🪴 Отлично! Пересадка засчитана! 🌱',
  ],
  pest_control: [
    '🐛 Молодец! Вредители не пройдут!',
    '🌿 Умница! Растение под защитой!',
    '🐛 Отлично! Профилактика — это важно! 🌱',
  ],
  vitamins: [
    '💊 Молодец! Витаминчики приняты! 🌿',
    '💊 Умница! Растение скажет спасибо!',
    '💊 Отлично! Подпитка засчитана! 🌱',
  ],
};

function initToastStyles() {
  if (document.getElementById('toast-styles')) return;
  const s = document.createElement('style');
  s.id = 'toast-styles';
  s.textContent = `
    @keyframes toastIn {
      0%   { opacity:0; transform:translate(-50%,-50%) scale(0.2); }
      65%  { opacity:1; transform:translate(-50%,-50%) scale(1.08); }
      100% { opacity:1; transform:translate(-50%,-50%) scale(1); }
    }
    @keyframes toastOut {
      0%   { opacity:1; transform:translate(-50%,-50%) scale(1); }
      100% { opacity:0; transform:translate(-50%,-50%) scale(0.75); }
    }
    .toast-card {
      position:fixed; top:50%; left:50%;
      transform:translate(-50%,-50%);
      z-index:9999; text-align:center;
      padding:36px 48px; border-radius:32px;
      box-shadow:0 12px 48px rgba(0,0,0,0.16);
      min-width:260px; pointer-events:none;
      animation:toastIn 0.55s cubic-bezier(0.34,1.56,0.64,1) forwards;
    }
    .toast-card.out { animation:toastOut 0.4s ease forwards; }
    .toast-emoji { font-size:64px; display:block; margin-bottom:14px; line-height:1; }
    .toast-msg { font-size:1.15em; font-weight:600; line-height:1.45; color:#2e4a2e; }
  `;
  document.head.appendChild(s);
}

function showToast(message, action) {
  initToastStyles();
  const cfg = {
    water:     { emoji: '💧', bg: 'linear-gradient(145deg,#dff0fc,#fff)' },
    fertilize: { emoji: '🌱', bg: 'linear-gradient(145deg,#dff5e3,#fff)' },
    repot:     { emoji: '🪴', bg: 'linear-gradient(145deg,#edf7df,#fff)' },
  }[action] || { emoji: '🌿', bg: '#fff' };
  const card = document.createElement('div');
  card.className = 'toast-card';
  card.style.background = cfg.bg;
  card.innerHTML = `<span class="toast-emoji">${cfg.emoji}</span><div class="toast-msg">${message}</div>`;
  document.body.appendChild(card);
  setTimeout(() => {
    card.classList.add('out');
    setTimeout(() => card.remove(), 400);
  }, 1600);
}

async function applyAction(plantId, action, actionDate, extra = {}) {
  const pathMap = { water: 'water', fertilize: 'fertilize', repot: 'repot', pest_control: 'pest_control', vitamins: 'vitamins' };
  const updated = await api('POST', `/api/plants/${plantId}/${pathMap[action]}`, { date: actionDate, ...extra });
  const idx = plants.findIndex(p => p.id === plantId);
  if (idx !== -1) plants[idx] = updated;
}

async function doAction(plantId, action, actionDate, extra = {}) {
  await applyAction(plantId, action, actionDate, extra);
  const msgs = ACTION_TOASTS[action] || ['🌿 Молодец!'];
  showToast(msgs[Math.floor(Math.random() * msgs.length)], action);
  render();
}

function openActionDateModal(plantId, action, afterAction) {
  const existing = document.getElementById('modal-action-date');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'modal-action-date';
  modal.style.display = 'flex';

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.addEventListener('click', () => modal.remove());

  const content = document.createElement('div');
  content.className = 'modal-content';
  content.style.maxWidth = '320px';
  const pestFields = action === 'pest_control' ? `
    <div class="form-group">
      <label>Препарат <span style="color:var(--text-secondary);font-size:0.85em">(необязательно)</span></label>
      <div id="action-product-wrap"></div>
    </div>
    <div class="form-group">
      <label>Следующий раз через</label>
      <div style="display:flex;align-items:center;gap:8px;">
        <input type="number" id="action-next-days" min="1" max="365" style="width:80px;">
        <span style="color:var(--text-secondary)">дней</span>
      </div>
    </div>
  ` : '';
  const vitaminsFields = action === 'vitamins' ? `
    <div class="form-group">
      <label>Препарат <span style="color:var(--text-secondary);font-size:0.85em">(необязательно)</span></label>
      <div id="action-vitamins-wrap"></div>
    </div>
    <div class="form-group">
      <label>Следующий раз через</label>
      <div style="display:flex;align-items:center;gap:8px;">
        <input type="number" id="action-next-days" min="1" max="365" style="width:80px;">
        <span style="color:var(--text-secondary)">дней</span>
      </div>
    </div>
  ` : '';
  const fertilizerFields = action === 'fertilize' ? `
    <div class="form-group">
      <label>Чем подкормил <span style="color:var(--text-secondary);font-size:0.85em">(необязательно)</span></label>
      <div id="action-fertilizer-wrap"></div>
    </div>
    <div class="form-group">
      <label>Дозировка</label>
      <select id="action-dose">
        <option value="">— не указано —</option>
        <option value="целая">целая</option>
        <option value="1/2">1/2</option>
        <option value="1/3">1/3</option>
        <option value="1/4">1/4</option>
        <option value="1/8">1/8</option>
      </select>
    </div>
    <div class="form-group">
      <label>Следующий раз через</label>
      <div style="display:flex;align-items:center;gap:8px;">
        <input type="number" id="action-next-days" min="1" max="365" style="width:80px;">
        <span style="color:var(--text-secondary)">дней</span>
      </div>
    </div>
  ` : '';
  content.innerHTML = `
    <div class="modal-header">
      <h3>${ACTION_LABELS[action]}</h3>
      <button class="modal-close">&times;</button>
    </div>
    <div style="padding:20px;display:flex;flex-direction:column;gap:14px;">
      <div class="form-group">
        <label>Дата</label>
        <input type="date" id="action-date-input" value="${today()}">
      </div>
      ${fertilizerFields}
      ${pestFields}
      ${vitaminsFields}
      <div class="form-actions">
        <button type="button" class="btn-secondary" id="action-date-cancel">Отмена</button>
        <button type="button" class="btn-primary" id="action-date-submit">Записать</button>
      </div>
    </div>
  `;

  modal.appendChild(overlay);
  modal.appendChild(content);
  document.body.appendChild(modal);

  if (action === 'fertilize') mountCustomSelect('action-fertilizer-wrap', 'action-fertilizer', 'fertilizer', FERTILIZER_OPTIONS, '');
  if (action === 'pest_control') mountCustomSelect('action-product-wrap', 'action-product', 'pest_product', PEST_PRODUCT_OPTIONS, '');
  if (action === 'vitamins') mountCustomSelect('action-vitamins-wrap', 'action-vitamins', 'vitamins_product', VITAMINS_OPTIONS, '');

  content.querySelector('.modal-close').addEventListener('click', () => modal.remove());
  document.getElementById('action-date-cancel').addEventListener('click', () => modal.remove());
  document.getElementById('action-date-submit').addEventListener('click', async () => {
    const chosenDate = document.getElementById('action-date-input').value;
    if (!chosenDate) return;
    const extra = {};
    if (action === 'fertilize') {
      const f = getCustomSelectValue('action-fertilizer');
      const d = document.getElementById('action-dose').value;
      const n = document.getElementById('action-next-days').value;
      if (f) extra.fertilizer = f;
      if (d) extra.dose = d;
      if (n) extra.next_days = parseInt(n);
    }
    if (action === 'pest_control') {
      const p = getCustomSelectValue('action-product');
      const n = document.getElementById('action-next-days').value;
      if (p) extra.product = p;
      if (n) extra.next_days = parseInt(n);
    }
    if (action === 'vitamins') {
      const p = getCustomSelectValue('action-vitamins');
      const n = document.getElementById('action-next-days').value;
      if (p) extra.product = p;
      if (n) extra.next_days = parseInt(n);
    }
    modal.remove();
    await doAction(plantId, action, chosenDate, extra);
    if (afterAction) afterAction();
  });
}

// ── Problems section ──────────────────────────────────────────────────────────
function buildProblemsSection(plant) {
  const wrap = document.createElement('div');
  wrap.className = 'problems-section';
  const title = document.createElement('div');
  title.className = 'problems-section-title';
  title.textContent = '⚠️ Вредители и болезни';
  wrap.appendChild(title);
  const chips = document.createElement('div');
  chips.className = 'problems-chips';
  const active = plant.problems || [];
  PLANT_PROBLEMS.forEach(prob => {
    const chip = document.createElement('button');
    chip.className = 'problem-chip' + (active.includes(prob) ? ' active' : '');
    chip.textContent = prob;
    chip.addEventListener('click', async () => {
      const current = plants.find(p => p.id === plant.id)?.problems || [];
      const next = current.includes(prob) ? current.filter(p => p !== prob) : [...current, prob];
      const updated = await api('PUT', `/api/plants/${plant.id}`, { problems: next });
      const idx = plants.findIndex(p => p.id === plant.id);
      if (idx !== -1) plants[idx] = updated;
      chip.classList.toggle('active', next.includes(prob));
      render();
    });
    chips.appendChild(chip);
  });
  wrap.appendChild(chips);
  return wrap;
}

// ── Plant type chip helpers ───────────────────────────────────────────────────
function initProblemsChips(selected = []) {
  const c = document.getElementById('form-problems-chips');
  if (!c) return;
  c.innerHTML = '';
  PLANT_PROBLEMS.forEach(prob => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'type-chip' + (selected.includes(prob) ? ' selected' : '');
    chip.style.cssText = selected.includes(prob)
      ? 'border-color:#ff8f00;background:#fff3e0;color:#bf360c;font-weight:600;'
      : '';
    chip.textContent = prob;
    chip.addEventListener('click', () => {
      chip.classList.toggle('selected');
      const on = chip.classList.contains('selected');
      chip.style.cssText = on ? 'border-color:#ff8f00;background:#fff3e0;color:#bf360c;font-weight:600;' : '';
    });
    c.appendChild(chip);
  });
}

function getSelectedProblems() {
  return [...document.querySelectorAll('#form-problems-chips .type-chip.selected')]
    .map(c => c.textContent);
}

function initTypeChips(selected = []) {
  const c = document.getElementById('form-plant-types-chips');
  if (!c) return;
  c.innerHTML = '';
  PLANT_TYPES.forEach(type => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'type-chip' + (selected.includes(type) ? ' selected' : '');
    chip.textContent = type;
    chip.addEventListener('click', () => chip.classList.toggle('selected'));
    c.appendChild(chip);
  });
}

function getSelectedTypes() {
  return [...document.querySelectorAll('#form-plant-types-chips .type-chip.selected')]
    .map(c => c.textContent);
}

// ── Care profile ──────────────────────────────────────────────────────────────
function buildCareProfile(plant) {
  const items = [
    { icon: '💧', value: plant.watering_note },
    { icon: '☀️', value: plant.light },
    { icon: '🪨', value: plant.soil },
  ].filter(i => i.value);
  const problems = plant.problems || [];
  if (!items.length && !problems.length) return null;
  const wrap = document.createElement('div');
  wrap.className = 'care-profile';
  items.forEach(({ icon, value }) => {
    const chip = document.createElement('span');
    chip.className = 'care-profile-chip';
    chip.textContent = `${icon} ${value}`;
    wrap.appendChild(chip);
  });
  problems.forEach(prob => {
    const chip = document.createElement('span');
    chip.className = 'care-profile-chip';
    chip.style.cssText = 'background:#fff3e0;border-color:#ffcc80;color:#e65100;';
    chip.textContent = prob;
    wrap.appendChild(chip);
  });
  return wrap;
}

// ── Flowering log ─────────────────────────────────────────────────────────────
function buildFloweringSection(plant) {
  const section = document.createElement('div');
  section.className = 'detail-section';

  const header = document.createElement('div');
  header.className = 'detail-section-header';

  const title = document.createElement('div');
  title.className = 'detail-section-title';
  title.textContent = '🌸 Цветение';
  header.appendChild(title);

  const isFlowering = !!plant.is_flowering;
  const actionBtn = document.createElement('button');
  actionBtn.className = 'detail-section-action';
  if (isFlowering) {
    actionBtn.textContent = '🍂 Отцвело';
    actionBtn.style.cssText = 'background:#fce4ec;color:#c2185b;';
  } else {
    actionBtn.textContent = '🌸 Зацвело';
    actionBtn.style.cssText = 'background:#fce4ec;color:#c2185b;';
  }
  actionBtn.addEventListener('click', () => {
    openFloweringModal(plant, isFlowering ? 'end' : 'start', async (eventDate, notes) => {
      const event = isFlowering ? 'end' : 'start';
      const updated = await api('POST', `/api/plants/${plant.id}/flowering`, { event, date: eventDate, notes });
      const idx = plants.findIndex(p => p.id === plant.id);
      if (idx !== -1) plants[idx] = updated;
      render();
      closeModal('modal-detail');
      openDetail(plant.id);
    });
  });
  header.appendChild(actionBtn);
  section.appendChild(header);

  // Current status
  const meta = document.createElement('div');
  meta.className = 'detail-section-meta';
  meta.textContent = isFlowering ? '🌸 Сейчас цветёт' : 'Не цветёт';
  section.appendChild(meta);

  // History
  const log = plant.flowering_log || [];
  if (log.length) {
    const hist = document.createElement('div');
    hist.className = 'detail-history';
    const histTitle = document.createElement('div');
    histTitle.className = 'detail-history-title';
    histTitle.textContent = 'История цветения';
    hist.appendChild(histTitle);

    // Pair start/end into periods for display
    const periods = [];
    let openStart = null;
    [...log].sort((a, b) => a.date.localeCompare(b.date)).forEach(e => {
      if (e.event === 'start') { openStart = e; }
      else if (e.event === 'end') {
        periods.push({ start: openStart, end: e });
        openStart = null;
      }
    });
    if (openStart) periods.push({ start: openStart, end: null });
    periods.reverse();

    const list = document.createElement('div');
    list.className = 'flowering-periods-list';

    periods.forEach(({ start, end }, periodIdx) => {
      const row = document.createElement('div');
      row.className = 'flowering-period-row';

      const dates = document.createElement('span');
      dates.className = 'flowering-period-dates';
      const startStr = start ? formatDate(start.date) : '?';
      const endStr = end ? formatDate(end.date) : 'наст. вр.';
      dates.textContent = `${startStr} — ${endStr}`;
      row.appendChild(dates);

      if (start?.notes || end?.notes) {
        const notes = document.createElement('span');
        notes.className = 'flowering-period-notes';
        notes.textContent = [start?.notes, end?.notes].filter(Boolean).join(' · ');
        row.appendChild(notes);
      }

      // Delete button for the last raw entry that belongs to this period
      const delBtn = document.createElement('button');
      delBtn.className = 'history-del-btn';
      delBtn.title = 'Удалить последнюю запись этого периода';
      delBtn.textContent = '×';
      delBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        // Find the index of the most recent entry of this period in the raw log
        const rawEntry = end || start;
        const rawIdx = log.findIndex(
          le => le.date === rawEntry.date && le.event === rawEntry.event
        );
        if (rawIdx === -1) return;
        const updated = await api('DELETE', `/api/plants/${plant.id}/history`, { section: 'flowering_log', index: rawIdx });
        const idx = plants.findIndex(p => p.id === plant.id);
        if (idx !== -1) plants[idx] = updated;
        render();
        closeModal('modal-detail');
        openDetail(plant.id);
      });
      row.appendChild(delBtn);
      list.appendChild(row);
    });

    hist.appendChild(list);
    section.appendChild(hist);
  }

  return section;
}

function openFloweringModal(plant, eventType, onConfirm) {
  const existing = document.getElementById('modal-flowering');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'modal-flowering';
  modal.style.display = 'flex';

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.addEventListener('click', () => modal.remove());

  const label = eventType === 'start' ? '🌸 Зацвело' : '🍂 Отцвело';
  const content = document.createElement('div');
  content.className = 'modal-content';
  content.style.maxWidth = '320px';
  content.innerHTML = `
    <div class="modal-header">
      <h3>${label} — ${plant.name}</h3>
      <button class="modal-close">&times;</button>
    </div>
    <div style="padding:20px;display:flex;flex-direction:column;gap:14px;">
      <div class="form-group">
        <label>Дата</label>
        <input type="date" id="fl-date" value="${today()}">
      </div>
      <div class="form-group">
        <label>Заметка <span style="color:var(--text-secondary);font-size:0.85em">(необязательно)</span></label>
        <input type="text" id="fl-notes" placeholder="${eventType === 'start' ? 'Цвет, кол-во бутонов...' : 'Длительность, особенности...'}">
      </div>
      <div class="form-actions">
        <button type="button" class="btn-secondary" id="fl-cancel">Отмена</button>
        <button type="button" class="btn-primary" id="fl-confirm">Записать</button>
      </div>
    </div>
  `;

  modal.appendChild(overlay);
  modal.appendChild(content);
  document.body.appendChild(modal);

  content.querySelector('.modal-close').addEventListener('click', () => modal.remove());
  document.getElementById('fl-cancel').addEventListener('click', () => modal.remove());
  document.getElementById('fl-confirm').addEventListener('click', async () => {
    const d = document.getElementById('fl-date').value;
    const notes = document.getElementById('fl-notes').value.trim();
    modal.remove();
    await onConfirm(d, notes);
  });
}

// ── Detail modal ───────────────────────────────────────────────────────────────
function openDetail(plantId) {
  const plant = plants.find(p => p.id === plantId)
             || archivePlants.find(p => p.id === plantId);
  if (!plant) return;
  const isArchived = !!plant.archived;

  const modal = document.getElementById('modal-detail');
  document.getElementById('detail-name').textContent = plant.name;
  const body = document.getElementById('detail-body');
  body.innerHTML = '';

  // ── Archive banner ────────────────────────────────────────────────────────
  if (isArchived) {
    const banner = document.createElement('div');
    banner.style.cssText = 'background:var(--border);border-radius:10px;padding:10px 14px;font-size:0.9em;color:var(--text-secondary);margin-bottom:4px;';
    let text = `📦 В архиве${plant.archived_date ? ' с ' + formatDate(plant.archived_date) : ''}`;
    if (plant.archive_reason) text += ` · ${plant.archive_reason}`;
    banner.textContent = text;
    body.appendChild(banner);
  }

  // ── Care profile ─────────────────────────────────────────────────────────
  const profile = buildCareProfile(plant);
  if (profile) body.appendChild(profile);

  // ── Gallery section ──────────────────────────────────────────────────────
  body.appendChild(buildGallerySection(plant));

  // ── Info ─────────────────────────────────────────────────────────────────
  const info = document.createElement('div');
  info.className = 'detail-info';
  if (plant.description) {
    const desc = document.createElement('div');
    desc.className = 'detail-description';
    desc.textContent = plant.description;
    info.appendChild(desc);
  }
  if (plant.purchased_date) {
    const p = document.createElement('div');
    p.className = 'detail-purchased';
    p.textContent = `Куплено: ${formatDate(plant.purchased_date)}`;
    info.appendChild(p);
  }
  body.appendChild(info);

  // ── Care sections ─────────────────────────────────────────────────────────
  const sections = document.createElement('div');
  sections.className = 'detail-sections';
  sections.appendChild(buildFloweringSection(plant));
  sections.appendChild(buildDetailSection(plant, 'watering', '💧 Полив', 'water', 'Полить'));
  sections.appendChild(buildDetailSection(plant, 'fertilizing', '🌱 Подкормка', 'fertilize', 'Подкормить'));
  sections.appendChild(buildDetailSection(plant, 'repotting', '🪴 Пересадка', 'repot', 'Пересадить', true));
  sections.appendChild(buildDetailSection(plant, 'pest_control', '🐛 Обработка от вредителей', 'pest_control', 'Обработать'));
  sections.appendChild(buildDetailSection(plant, 'vitamins', '💊 Витамины и стимуляторы', 'vitamins', 'Дать'));
  body.appendChild(sections);

  // ── Footer ────────────────────────────────────────────────────────────────
  const footer = document.createElement('div');
  footer.className = 'detail-footer';

  const editBtn = document.createElement('button');
  editBtn.className = 'btn-secondary';
  editBtn.textContent = 'Редактировать';
  editBtn.addEventListener('click', () => { closeModal('modal-detail'); openEditModal(plantId); });

  const archBtn = document.createElement('button');
  archBtn.className = 'btn-secondary';
  archBtn.textContent = '📦 В архив';
  archBtn.addEventListener('click', () => openArchiveModal(plant, async (reason) => {
    await api('POST', `/api/plants/${plantId}/archive`, { reason });
    plants = plants.filter(p => p.id !== plantId);
    closeModal('modal-detail');
    render();
  }));

  const delBtn = document.createElement('button');
  delBtn.className = 'btn-danger';
  delBtn.textContent = 'Удалить';
  delBtn.addEventListener('click', async () => {
    if (!confirm(`Удалить "${plant.name}" навсегда?`)) return;
    await api('DELETE', `/api/plants/${plantId}`);
    plants = plants.filter(p => p.id !== plantId);
    closeModal('modal-detail');
    render();
  });

  if (isArchived) {
    const restoreBtn = document.createElement('button');
    restoreBtn.className = 'btn-primary';
    restoreBtn.textContent = '↩ Восстановить';
    restoreBtn.addEventListener('click', async () => {
      await api('POST', `/api/plants/${plantId}/restore`);
      archivePlants = archivePlants.filter(p => p.id !== plantId);
      plant.archived = false;
      plants.push(plant);
      closeModal('modal-detail');
      renderArchive();
      render();
    });
    const delArchivedBtn = document.createElement('button');
    delArchivedBtn.className = 'btn-danger';
    delArchivedBtn.textContent = 'Удалить навсегда';
    delArchivedBtn.addEventListener('click', async () => {
      if (!confirm(`Удалить "${plant.name}" навсегда?`)) return;
      await api('DELETE', `/api/plants/${plantId}`);
      archivePlants = archivePlants.filter(p => p.id !== plantId);
      closeModal('modal-detail');
      renderArchive();
    });
    footer.appendChild(restoreBtn);
    footer.appendChild(delArchivedBtn);
  } else {
    footer.appendChild(editBtn);
    footer.appendChild(archBtn);
    footer.appendChild(delBtn);
  }
  body.appendChild(footer);

  modal.style.display = 'flex';
}

// ── Gallery section ───────────────────────────────────────────────────────────
function buildGallerySection(plant) {
  const wrap = document.createElement('div');
  wrap.className = 'gallery-section';

  const photos = sortedPhotos(plant);

  // Cover photo
  const coverWrap = document.createElement('div');
  coverWrap.className = 'gallery-cover';

  if (photos.length > 0) {
    const img = document.createElement('img');
    img.src = `/photos/${photos[0].filename}`;
    img.alt = plant.name;
    img.addEventListener('click', () => openLightbox(plant, 0));
    coverWrap.appendChild(img);

    if (photos[0].description || photos[0].date) {
      const cap = document.createElement('div');
      cap.className = 'gallery-cover-caption';
      cap.textContent = [formatDate(photos[0].date), photos[0].description].filter(Boolean).join(' · ');
      coverWrap.appendChild(cap);
    }
  } else {
    const ph = document.createElement('div');
    ph.className = 'gallery-cover-placeholder';
    ph.textContent = '🌿';
    coverWrap.appendChild(ph);
  }
  wrap.appendChild(coverWrap);

  // Thumbnails row (skip first — it's the cover)
  if (photos.length > 1) {
    const thumbRow = document.createElement('div');
    thumbRow.className = 'gallery-thumbs';
    photos.slice(1).forEach((photo, i) => {
      const thumb = document.createElement('div');
      thumb.className = 'gallery-thumb';
      const img = document.createElement('img');
      img.src = `/photos/${photo.filename}`;
      img.alt = photo.description || formatDate(photo.date);
      img.addEventListener('click', () => openLightbox(plant, i + 1));
      thumb.appendChild(img);
      if (photo.date) {
        const lbl = document.createElement('div');
        lbl.className = 'gallery-thumb-date';
        lbl.textContent = formatDate(photo.date);
        thumb.appendChild(lbl);
      }
      thumbRow.appendChild(thumb);
    });
    wrap.appendChild(thumbRow);
  }

  // Add photo button
  const addBtn = document.createElement('button');
  addBtn.className = 'gallery-add-btn';
  addBtn.textContent = '+ Добавить фото';
  addBtn.addEventListener('click', () => openPhotoUploadModal(plant.id));
  wrap.appendChild(addBtn);


  return wrap;
}

// ── Lightbox ──────────────────────────────────────────────────────────────────
function openLightbox(plant, startIndex) {
  const photos = sortedPhotos(plant);
  if (!photos.length) return;
  let current = startIndex;

  const lb = document.createElement('div');
  lb.className = 'lightbox';
  lb.id = 'lightbox';

  const overlay = document.createElement('div');
  overlay.className = 'lightbox-overlay';
  overlay.addEventListener('click', () => lb.remove());

  const box = document.createElement('div');
  box.className = 'lightbox-box';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'lightbox-close';
  closeBtn.textContent = '×';
  closeBtn.addEventListener('click', () => lb.remove());

  const img = document.createElement('img');
  img.className = 'lightbox-img';

  const info = document.createElement('div');
  info.className = 'lightbox-info';

  const nav = document.createElement('div');
  nav.className = 'lightbox-nav';

  const prevBtn = document.createElement('button');
  prevBtn.className = 'lightbox-nav-btn';
  prevBtn.textContent = '‹';
  prevBtn.addEventListener('click', () => { current = (current - 1 + photos.length) % photos.length; update(); });

  const nextBtn = document.createElement('button');
  nextBtn.className = 'lightbox-nav-btn';
  nextBtn.textContent = '›';
  nextBtn.addEventListener('click', () => { current = (current + 1) % photos.length; update(); });

  const counter = document.createElement('span');
  counter.className = 'lightbox-counter';

  nav.appendChild(prevBtn);
  nav.appendChild(counter);
  nav.appendChild(nextBtn);

  // Delete button
  const delBtn = document.createElement('button');
  delBtn.className = 'lightbox-del-btn';
  delBtn.textContent = '🗑 Удалить фото';
  delBtn.addEventListener('click', async () => {
    const photo = photos[current];
    if (!confirm('Удалить это фото?')) return;
    await api('DELETE', `/api/plants/${plant.id}/photos/${photo.id}`);
    const idx = plants.findIndex(p => p.id === plant.id);
    if (idx !== -1) plants[idx].photos = plants[idx].photos.filter(p => p.id !== photo.id);
    lb.remove();
    openDetail(plant.id);
    render();
  });

  function update() {
    const photo = photos[current];
    img.src = `/photos/${photo.filename}`;
    const parts = [formatDate(photo.date), photo.description].filter(Boolean);
    info.textContent = parts.join(' · ');
    counter.textContent = `${current + 1} / ${photos.length}`;
    prevBtn.style.visibility = photos.length > 1 ? '' : 'hidden';
    nextBtn.style.visibility = photos.length > 1 ? '' : 'hidden';
  }

  box.appendChild(closeBtn);
  box.appendChild(img);
  box.appendChild(info);
  box.appendChild(nav);
  box.appendChild(delBtn);
  lb.appendChild(overlay);
  lb.appendChild(box);
  document.body.appendChild(lb);
  update();

  document.addEventListener('keydown', function onKey(e) {
    if (!document.getElementById('lightbox')) { document.removeEventListener('keydown', onKey); return; }
    if (e.key === 'Escape') lb.remove();
    if (e.key === 'ArrowLeft') { current = (current - 1 + photos.length) % photos.length; update(); }
    if (e.key === 'ArrowRight') { current = (current + 1) % photos.length; update(); }
  });
}

// ── Photo upload modal ────────────────────────────────────────────────────────
function openPhotoUploadModal(plantId) {
  const existing = document.getElementById('modal-photo-upload');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'modal-photo-upload';
  modal.style.display = 'flex';

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.addEventListener('click', () => modal.remove());

  const content = document.createElement('div');
  content.className = 'modal-content';
  content.style.maxWidth = '400px';

  content.innerHTML = `
    <div class="modal-header">
      <h3>Добавить фото</h3>
      <button class="modal-close" id="photo-modal-close">&times;</button>
    </div>
    <form id="photo-upload-form" style="padding:20px;display:flex;flex-direction:column;gap:14px;">
      <div class="form-group">
        <label>Фото *</label>
        <input type="file" id="pu-file" accept="image/*" required style="padding:4px 0;">
      </div>
      <div class="form-group">
        <label>Дата фото</label>
        <input type="date" id="pu-date" value="${today()}">
      </div>
      <div class="form-group">
        <label>Описание</label>
        <input type="text" id="pu-desc" placeholder="Первые листья, после пересадки...">
      </div>
      <div class="form-actions" style="margin-top:4px;">
        <button type="button" class="btn-secondary" id="pu-cancel">Отмена</button>
        <button type="submit" class="btn-primary">Загрузить</button>
      </div>
    </form>
  `;

  modal.appendChild(overlay);
  modal.appendChild(content);
  document.body.appendChild(modal);

  document.getElementById('photo-modal-close').addEventListener('click', () => modal.remove());
  document.getElementById('pu-cancel').addEventListener('click', () => modal.remove());

  document.getElementById('photo-upload-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const file = document.getElementById('pu-file').files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('photo', file);
    fd.append('date', document.getElementById('pu-date').value);
    fd.append('description', document.getElementById('pu-desc').value.trim());
    const res = await fetch(`/api/plants/${plantId}/photos`, { method: 'POST', body: fd });
    const entry = await res.json();
    const idx = plants.findIndex(p => p.id === plantId);
    if (idx !== -1) plants[idx].photos.push(entry);
    modal.remove();
    openDetail(plantId);
    render();
  });
}

// ── Care detail section ───────────────────────────────────────────────────────
function buildDetailSection(plant, key, title, actionType, actionLabel, noFreq) {
  const section = document.createElement('div');
  section.className = 'detail-section';

  const header = document.createElement('div');
  header.className = 'detail-section-header';

  const titleEl = document.createElement('div');
  titleEl.className = 'detail-section-title';
  titleEl.textContent = title;

  const actionBtn = document.createElement('button');
  actionBtn.className = `detail-section-action ${actionType}`;
  actionBtn.textContent = actionLabel;
  actionBtn.addEventListener('click', () => {
    openActionDateModal(plant.id, actionType, () => openDetail(plant.id));
  });

  header.appendChild(titleEl);
  header.appendChild(actionBtn);

  const meta = document.createElement('div');
  meta.className = 'detail-section-meta';
  const data = plant[key];
  const last = data.last_date ? `Последний раз: ${formatDate(data.last_date)}` : 'Ещё не было';
  let next = '';
  if (!noFreq && data.frequency_days && data.last_date) {
    const nd = nextDate(data);
    next = ` · Следующий: ${formatDate(nd)} (${dateBadgeLabel(nd)})`;
  }
  meta.textContent = last + next;

  section.appendChild(header);
  section.appendChild(meta);

  if (data.history && data.history.length > 0) {
    const histWrap = document.createElement('div');
    histWrap.className = 'detail-history';
    const histTitle = document.createElement('div');
    histTitle.className = 'detail-history-title';
    histTitle.textContent = 'История:';
    const histList = document.createElement('div');
    histList.className = 'history-list';
    data.history.slice(0, 12).forEach((entry, idx) => {
      const d = typeof entry === 'string' ? entry : entry.date;
      let text = formatDate(d);
      if (typeof entry === 'object' && entry !== null) {
        const info = [entry.fertilizer, entry.dose, entry.product].filter(Boolean).join(' ');
        if (info) text += ' · ' + info;
      }
      const pill = document.createElement('span');
      pill.className = 'history-date';
      pill.style.cssText = 'display:inline-flex;align-items:center;gap:4px;';
      const label = document.createElement('span');
      label.textContent = text;
      const delBtn = document.createElement('button');
      delBtn.textContent = '×';
      delBtn.title = 'Удалить запись';
      delBtn.style.cssText = 'background:none;border:none;cursor:pointer;padding:0;font-size:1em;line-height:1;opacity:0.4;color:inherit;';
      delBtn.addEventListener('mouseenter', () => delBtn.style.opacity = '1');
      delBtn.addEventListener('mouseleave', () => delBtn.style.opacity = '0.4');
      delBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!confirm(`Удалить запись «${text}»?`)) return;
        const updated = await api('DELETE', `/api/plants/${plant.id}/history`, { section: key, index: idx });
        const pidx = plants.findIndex(p => p.id === plant.id);
        if (pidx !== -1) plants[pidx] = updated;
        openDetail(plant.id);
        render();
      });
      pill.appendChild(label);
      pill.appendChild(delBtn);
      histList.appendChild(pill);
    });
    histWrap.appendChild(histTitle);
    histWrap.appendChild(histList);
    section.appendChild(histWrap);
  }

  return section;
}

// ── Add / Edit modal ──────────────────────────────────────────────────────────
function openAddModal() {
  const form = document.getElementById('plant-form');
  form.reset();
  document.getElementById('form-id').value = '';
  document.getElementById('modal-title').textContent = 'Новое растение';
  document.getElementById('form-water-freq').value = '';
  document.getElementById('form-fert-freq').value = 30;

  const existingBanner = document.getElementById('draft-banner');
  if (existingBanner) existingBanner.remove();

  const draft = loadPlantFormDraft();
  if (draft) {
    document.getElementById('form-name').value = draft.name || '';
    document.getElementById('form-description').value = draft.description || '';
    document.getElementById('form-purchased').value = draft.purchased || '';
    document.getElementById('form-water-last').value = draft.waterLast || '';
    document.getElementById('form-water-freq').value = draft.waterFreq || '';
    document.getElementById('form-fert-last').value = draft.fertLast || '';
    document.getElementById('form-fert-freq').value = draft.fertFreq || 30;
    document.getElementById('form-repot-last').value = draft.repotLast || '';
    document.getElementById('form-pest-last').value = draft.pestLast || '';
    document.getElementById('form-pest-freq').value = draft.pestFreq || '';
    document.getElementById('form-vitamins-last').value = draft.vitaminsLast || '';
    document.getElementById('form-vitamins-freq').value = draft.vitaminsFreq || '';
    document.getElementById('form-watering-note').value = draft.wateringNote || '';
    document.getElementById('form-light').value = draft.light || '';
    document.getElementById('form-needs-repotting').checked = !!draft.needsRepotting;
    document.getElementById('form-favorited').checked = !!draft.favorited;
    document.getElementById('form-is-flowering').checked = !!draft.isFlowering;
    initTypeChips(draft.plantTypes || []);
    initProblemsChips(draft.problems || []);
    mountCustomSelect('form-soil-wrap', 'form-soil', 'soil', SOIL_OPTIONS, draft.soil || '');
    mountCustomSelect('form-room-wrap', 'form-room', 'room', ROOM_OPTIONS, draft.room || '');

    const banner = document.createElement('div');
    banner.id = 'draft-banner';
    banner.style.cssText = 'background:#e8f5e9;border-radius:8px;padding:8px 14px;font-size:0.85em;display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px;';
    const txt = document.createElement('span');
    txt.textContent = '↩ Восстановлен черновик';
    const clrBtn = document.createElement('button');
    clrBtn.type = 'button';
    clrBtn.textContent = 'Очистить';
    clrBtn.style.cssText = 'background:none;border:none;cursor:pointer;color:#e53935;font-size:0.85em;padding:0;';
    clrBtn.addEventListener('click', () => { clearPlantFormDraft(); openAddModal(); });
    banner.appendChild(txt);
    banner.appendChild(clrBtn);
    form.insertBefore(banner, form.querySelector('.form-section'));
  } else {
    initTypeChips([]);
    initProblemsChips([]);
    mountCustomSelect('form-soil-wrap', 'form-soil', 'soil', SOIL_OPTIONS, '');
    mountCustomSelect('form-room-wrap', 'form-room', 'room', ROOM_OPTIONS, '');
    document.getElementById('form-watering-note').value = '';
    document.getElementById('form-light').value = '';
    document.getElementById('form-needs-repotting').checked = false;
    document.getElementById('form-favorited').checked = false;
    document.getElementById('form-is-flowering').checked = false;
  }

  document.getElementById('modal-plant').style.display = 'flex';
}

function openEditModal(plantId) {
  const plant = plants.find(p => p.id === plantId);
  if (!plant) return;
  document.getElementById('form-id').value = plant.id;
  document.getElementById('modal-title').textContent = 'Редактировать';
  document.getElementById('form-name').value = plant.name;
  document.getElementById('form-description').value = plant.description || '';
  document.getElementById('form-purchased').value = plant.purchased_date || '';
  document.getElementById('form-water-last').value = plant.watering.last_date || '';
  document.getElementById('form-water-freq').value = plant.watering.frequency_days || 7;
  document.getElementById('form-fert-last').value = plant.fertilizing.last_date || '';
  document.getElementById('form-fert-freq').value = plant.fertilizing.frequency_days || 30;
  document.getElementById('form-repot-last').value = plant.repotting.last_date || '';
  document.getElementById('form-pest-last').value = plant.pest_control?.last_date || '';
  document.getElementById('form-pest-freq').value = plant.pest_control?.frequency_days || '';
  document.getElementById('form-vitamins-last').value = plant.vitamins?.last_date || '';
  document.getElementById('form-vitamins-freq').value = plant.vitamins?.frequency_days || '';
  initTypeChips(plant.plant_types || []);
  initProblemsChips(plant.problems || []);
  document.getElementById('form-watering-note').value = plant.watering_note || '';
  document.getElementById('form-light').value = plant.light || '';
  mountCustomSelect('form-soil-wrap', 'form-soil', 'soil', SOIL_OPTIONS, plant.soil || '');
  mountCustomSelect('form-room-wrap', 'form-room', 'room', ROOM_OPTIONS, plant.room || '');
  document.getElementById('form-needs-repotting').checked = !!plant.needs_repotting;
  document.getElementById('form-favorited').checked = !!plant.favorited;
  document.getElementById('form-is-flowering').checked = !!plant.is_flowering;
  document.getElementById('modal-plant').style.display = 'flex';
}

// Auto-save draft on every change (only for new plants — form-id is empty)
document.getElementById('plant-form').addEventListener('input', savePlantFormDraft);
document.getElementById('plant-form').addEventListener('change', savePlantFormDraft);

document.getElementById('plant-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('form-id').value;
  const payload = {
    name: document.getElementById('form-name').value.trim(),
    description: document.getElementById('form-description').value.trim(),
    purchased_date: document.getElementById('form-purchased').value,
    plant_types: getSelectedTypes(),
    problems: getSelectedProblems(),
    watering_note: document.getElementById('form-watering-note').value,
    light: document.getElementById('form-light').value,
    soil: getCustomSelectValue('form-soil'),
    room: getCustomSelectValue('form-room'),
    favorited: document.getElementById('form-favorited').checked,
    is_flowering: document.getElementById('form-is-flowering').checked,
    needs_repotting: document.getElementById('form-needs-repotting').checked,
    watering: {
      last_date: document.getElementById('form-water-last').value,
      frequency_days: parseInt(document.getElementById('form-water-freq').value) || null,
    },
    fertilizing: {
      last_date: document.getElementById('form-fert-last').value,
      frequency_days: parseInt(document.getElementById('form-fert-freq').value) || 30,
    },
    repotting: {
      last_date: document.getElementById('form-repot-last').value,
    },
    pest_control: {
      last_date: document.getElementById('form-pest-last').value,
      frequency_days: parseInt(document.getElementById('form-pest-freq').value) || null,
    },
    vitamins: {
      last_date: document.getElementById('form-vitamins-last').value,
      frequency_days: parseInt(document.getElementById('form-vitamins-freq').value) || null,
    },
  };

  if (id) {
    const updated = await api('PUT', `/api/plants/${id}`, payload);
    const idx = plants.findIndex(p => p.id === id);
    if (idx !== -1) plants[idx] = updated;
  } else {
    const created = await api('POST', '/api/plants', payload);
    plants.push(created);
  }

  clearPlantFormDraft();
  closeModal('modal-plant');
  render();
});

// ── Modal helpers ─────────────────────────────────────────────────────────────
function closeModal(id) {
  document.getElementById(id).style.display = 'none';
}

document.querySelectorAll('.modal-close, .modal-close-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const modal = btn.closest('.modal');
    if (modal) modal.style.display = 'none';
  });
});

document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', () => {
    const modal = overlay.closest('.modal');
    if (!modal || modal.id === 'modal-plant') return; // form auto-saves, don't close on overlay click
    modal.style.display = 'none';
  });
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !document.getElementById('lightbox')) {
    document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
  }
});

// ── Navigation ────────────────────────────────────────────────────────────────
document.querySelectorAll('.sidebar-nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    currentView = btn.dataset.view;
    document.querySelectorAll('.sidebar-nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(`view-${currentView}`).classList.add('active');
    if (currentView === 'cuttings') loadCuttings();
    if (currentView === 'archive') loadArchive();
    if (currentView === 'calendar') renderCalendar();
    if (currentView === 'achievements') renderAchievements();
    if (currentView === 'stats') renderStats();
  });
});

document.querySelectorAll('.sort-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    sortBy = btn.dataset.sort;
    renderAll();
  });
});

document.getElementById('plants-search').addEventListener('input', e => {
  searchQuery = e.target.value;
  renderAll();
});

document.getElementById('btn-add-plant').addEventListener('click', openAddModal);
document.getElementById('btn-add-cutting').addEventListener('click', () => openCuttingModal());
document.getElementById('btn-bulk-action').addEventListener('click', openBulkActionModal);

function openBulkActionModal() {
  const existing = document.getElementById('modal-bulk');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'modal-bulk';
  modal.style.display = 'flex';

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.addEventListener('click', () => modal.remove());

  const content = document.createElement('div');
  content.className = 'modal-content';
  content.style.maxWidth = '480px';

  const plantRows = plants.map(p => `
    <label class="bulk-plant-row">
      <input type="checkbox" class="bulk-cb" data-id="${p.id}" checked>
      <span>${p.name}</span>
    </label>
  `).join('');

  content.innerHTML = `
    <div class="modal-header">
      <h3>Массовая обработка</h3>
      <button class="modal-close">&times;</button>
    </div>
    <div style="padding:20px;display:flex;flex-direction:column;gap:14px;">
      <div class="form-group">
        <label>Действие</label>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px;">
          <button type="button" class="bulk-action-btn active" data-action="water">💧 Полить</button>
          <button type="button" class="bulk-action-btn" data-action="fertilize">🌱 Подкормить</button>
          <button type="button" class="bulk-action-btn" data-action="pest_control">🐛 Обработать</button>
          <button type="button" class="bulk-action-btn" data-action="vitamins">💊 Витамины</button>
          <button type="button" class="bulk-action-btn" data-action="infest">⚠️ Заражение</button>
          <button type="button" class="bulk-action-btn" data-action="cure">✅ Вылечили</button>
          <button type="button" class="bulk-action-btn" data-action="clear_vitamins">🗑 Сбросить витамины</button>
          <button type="button" class="bulk-action-btn" data-action="set_room">🏠 Комната</button>
          <button type="button" class="bulk-action-btn" data-action="set_soil">🪨 Грунт</button>
        </div>
      </div>
      <div class="form-group">
        <label>Растения</label>
        <div style="border:1px solid var(--border);border-radius:8px;padding:8px 12px;max-height:180px;overflow-y:auto;margin-top:4px;">
          <label class="bulk-plant-row" style="border-bottom:1px solid var(--border);padding-bottom:6px;margin-bottom:4px;">
            <input type="checkbox" id="bulk-all" checked>
            <span style="font-weight:600;">Выбрать все</span>
          </label>
          ${plantRows}
        </div>
      </div>
      <div class="form-group" id="bulk-date-group">
        <label>Дата</label>
        <input type="date" id="bulk-date" value="${today()}">
      </div>
      <div id="bulk-fertilize-fields" style="display:none;flex-direction:column;gap:12px;">
        <div class="form-group">
          <label>Удобрение <span style="color:var(--text-secondary);font-size:0.85em">(необязательно)</span></label>
          <div id="bulk-fertilizer-wrap"></div>
        </div>
        <div class="form-group">
          <label>Дозировка</label>
          <select id="bulk-dose">
            <option value="">— не указано —</option>
            <option value="целая">целая</option>
            <option value="1/2">1/2</option>
            <option value="1/3">1/3</option>
            <option value="1/4">1/4</option>
            <option value="1/8">1/8</option>
          </select>
        </div>
        <div class="form-group">
          <label>Следующий раз через</label>
          <div style="display:flex;align-items:center;gap:8px;">
            <input type="number" id="bulk-fert-next-days" min="1" max="365" style="width:80px;">
            <span style="color:var(--text-secondary)">дней</span>
          </div>
        </div>
      </div>
      <div id="bulk-pest-fields" style="display:none;flex-direction:column;gap:12px;">
        <div class="form-group">
          <label>Препарат <span style="color:var(--text-secondary);font-size:0.85em">(необязательно)</span></label>
          <div id="bulk-product-wrap"></div>
        </div>
        <div class="form-group">
          <label>Следующий раз через</label>
          <div style="display:flex;align-items:center;gap:8px;">
            <input type="number" id="bulk-pest-next-days" min="1" max="365" style="width:80px;">
            <span style="color:var(--text-secondary)">дней</span>
          </div>
        </div>
      </div>
      <div id="bulk-infest-fields" style="display:none;flex-direction:column;gap:10px;">
        <div class="form-group">
          <label>Вредитель или болезнь</label>
          <div id="bulk-infest-chips" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:6px;"></div>
        </div>
      </div>
      <div id="bulk-cure-fields" style="display:none;flex-direction:column;gap:10px;">
        <div class="form-group">
          <label>Что убрать <span style="color:var(--text-secondary);font-size:0.85em">(можно несколько)</span></label>
          <div id="bulk-cure-chips" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:6px;"></div>
        </div>
        <label class="bulk-plant-row" style="gap:8px;cursor:pointer;">
          <input type="checkbox" id="bulk-cure-all-problems">
          <span>Снять ВСЕ вредители и болезни</span>
        </label>
      </div>
      <div id="bulk-vitamins-fields" style="display:none;flex-direction:column;gap:12px;">
        <div class="form-group">
          <label>Препарат <span style="color:var(--text-secondary);font-size:0.85em">(необязательно)</span></label>
          <div id="bulk-vitamins-wrap"></div>
        </div>
        <div class="form-group">
          <label>Следующий раз через</label>
          <div style="display:flex;align-items:center;gap:8px;">
            <input type="number" id="bulk-vitamins-next-days" min="1" max="365" style="width:80px;">
            <span style="color:var(--text-secondary)">дней</span>
          </div>
        </div>
      </div>
      <div id="bulk-room-fields" style="display:none;flex-direction:column;gap:12px;">
        <div class="form-group">
          <label>Комната</label>
          <div id="bulk-room-wrap"></div>
        </div>
      </div>
      <div id="bulk-soil-fields" style="display:none;flex-direction:column;gap:12px;">
        <div class="form-group">
          <label>Грунт</label>
          <div id="bulk-soil-wrap"></div>
        </div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn-secondary" id="bulk-cancel">Отмена</button>
        <button type="button" class="btn-primary" id="bulk-submit">Записать</button>
      </div>
    </div>
  `;

  modal.appendChild(overlay);
  modal.appendChild(content);
  document.body.appendChild(modal);

  mountCustomSelect('bulk-fertilizer-wrap', 'bulk-fertilizer', 'fertilizer', FERTILIZER_OPTIONS, '');
  mountCustomSelect('bulk-product-wrap', 'bulk-product', 'pest_product', PEST_PRODUCT_OPTIONS, '');
  mountCustomSelect('bulk-vitamins-wrap', 'bulk-vitamins', 'vitamins_product', VITAMINS_OPTIONS, '');
  mountCustomSelect('bulk-room-wrap', 'bulk-room', 'room', ROOM_OPTIONS, '');
  mountCustomSelect('bulk-soil-wrap', 'bulk-soil', 'soil', SOIL_OPTIONS, '');

  let currentAction = 'water';

  content.querySelector('.modal-close').addEventListener('click', () => modal.remove());
  document.getElementById('bulk-cancel').addEventListener('click', () => modal.remove());

  // Populate infest chips (single-select)
  let selectedProblem = '';
  const infestChipsWrap = document.getElementById('bulk-infest-chips');
  PLANT_PROBLEMS.forEach(prob => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'type-chip';
    chip.style.cssText = 'border-color:#ff8f00;';
    chip.textContent = prob;
    chip.addEventListener('click', () => {
      infestChipsWrap.querySelectorAll('.type-chip').forEach(c => {
        c.classList.remove('selected');
        c.style.cssText = 'border-color:#ff8f00;';
      });
      if (selectedProblem === prob) {
        selectedProblem = '';
      } else {
        chip.classList.add('selected');
        chip.style.cssText = 'border-color:#ff8f00;background:#fff3e0;color:#bf360c;font-weight:600;';
        selectedProblem = prob;
      }
    });
    infestChipsWrap.appendChild(chip);
  });

  // Populate cure chips (multi-select)
  const cureChipsWrap = document.getElementById('bulk-cure-chips');
  PLANT_PROBLEMS.forEach(prob => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'type-chip';
    chip.style.cssText = 'border-color:#4caf50;';
    chip.textContent = prob;
    chip.addEventListener('click', () => {
      chip.classList.toggle('selected');
      const on = chip.classList.contains('selected');
      chip.style.cssText = on
        ? 'border-color:#4caf50;background:#e8f5e9;color:#1b5e20;font-weight:600;'
        : 'border-color:#4caf50;';
    });
    cureChipsWrap.appendChild(chip);
  });

  // Action type toggle
  content.querySelectorAll('.bulk-action-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      content.querySelectorAll('.bulk-action-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentAction = btn.dataset.action;
      document.getElementById('bulk-fertilize-fields').style.display = currentAction === 'fertilize' ? 'flex' : 'none';
      document.getElementById('bulk-pest-fields').style.display = currentAction === 'pest_control' ? 'flex' : 'none';
      document.getElementById('bulk-infest-fields').style.display = currentAction === 'infest' ? 'flex' : 'none';
      document.getElementById('bulk-cure-fields').style.display = currentAction === 'cure' ? 'flex' : 'none';
      document.getElementById('bulk-vitamins-fields').style.display = currentAction === 'vitamins' ? 'flex' : 'none';
      document.getElementById('bulk-room-fields').style.display = currentAction === 'set_room' ? 'flex' : 'none';
      document.getElementById('bulk-soil-fields').style.display = currentAction === 'set_soil' ? 'flex' : 'none';
      const noDate = ['infest', 'cure', 'clear_vitamins', 'set_room', 'set_soil'].includes(currentAction);
      document.getElementById('bulk-date-group').style.display = noDate ? 'none' : '';
    });
  });

  // Select all toggle
  document.getElementById('bulk-all').addEventListener('change', (e) => {
    content.querySelectorAll('.bulk-cb').forEach(cb => cb.checked = e.target.checked);
  });
  content.querySelectorAll('.bulk-cb').forEach(cb => {
    cb.addEventListener('change', () => {
      const all = [...content.querySelectorAll('.bulk-cb')].every(c => c.checked);
      document.getElementById('bulk-all').checked = all;
    });
  });

  // Submit
  document.getElementById('bulk-submit').addEventListener('click', async () => {
    const selectedIds = [...content.querySelectorAll('.bulk-cb:checked')].map(cb => cb.dataset.id);
    if (!selectedIds.length) return;

    if (currentAction === 'infest') {
      if (!selectedProblem) return;
      modal.remove();
      for (const plantId of selectedIds) {
        const plant = plants.find(p => p.id === plantId);
        if (!plant) continue;
        const current = plant.problems || [];
        if (current.includes(selectedProblem)) continue;
        const updated = await api('PUT', `/api/plants/${plantId}`, { problems: [...current, selectedProblem] });
        const idx = plants.findIndex(p => p.id === plantId);
        if (idx !== -1) plants[idx] = updated;
      }
      render();
      showToast(`⚠️ Заражение отмечено у ${selectedIds.length} растений`, 'pest_control');
      return;
    }

    if (currentAction === 'cure') {
      const clearAll = document.getElementById('bulk-cure-all-problems').checked;
      const toRemove = clearAll
        ? null
        : [...cureChipsWrap.querySelectorAll('.type-chip.selected')].map(c => c.textContent);
      if (!clearAll && !toRemove.length) return;
      modal.remove();
      for (const plantId of selectedIds) {
        const plant = plants.find(p => p.id === plantId);
        if (!plant) continue;
        const next = clearAll ? [] : (plant.problems || []).filter(p => !toRemove.includes(p));
        if ((plant.problems || []).length === next.length) continue;
        const updated = await api('PUT', `/api/plants/${plantId}`, { problems: next });
        const idx = plants.findIndex(p => p.id === plantId);
        if (idx !== -1) plants[idx] = updated;
      }
      render();
      showToast('✅ Вредители сняты!', 'repot');
      return;
    }

    if (currentAction === 'clear_vitamins') {
      modal.remove();
      for (const plantId of selectedIds) {
        const plant = plants.find(p => p.id === plantId);
        if (!plant) continue;
        const updated = await api('PUT', `/api/plants/${plantId}`, {
          vitamins: { last_date: '', frequency_days: plant.vitamins?.frequency_days || null }
        });
        const idx = plants.findIndex(p => p.id === plantId);
        if (idx !== -1) plants[idx] = updated;
      }
      render();
      showToast('🗑 История витаминов сброшена', 'repot');
      return;
    }

    if (currentAction === 'set_room') {
      const room = getCustomSelectValue('bulk-room');
      if (!room) return;
      modal.remove();
      for (const plantId of selectedIds) {
        const updated = await api('PUT', `/api/plants/${plantId}`, { room });
        const idx = plants.findIndex(p => p.id === plantId);
        if (idx !== -1) plants[idx] = updated;
      }
      render();
      showToast(`🏠 Комната "${room}" установлена для ${selectedIds.length} растений`, 'repot');
      return;
    }

    if (currentAction === 'set_soil') {
      const soil = getCustomSelectValue('bulk-soil');
      if (!soil) return;
      modal.remove();
      for (const plantId of selectedIds) {
        const updated = await api('PUT', `/api/plants/${plantId}`, { soil });
        const idx = plants.findIndex(p => p.id === plantId);
        if (idx !== -1) plants[idx] = updated;
      }
      render();
      showToast(`🪨 Грунт "${soil}" установлен для ${selectedIds.length} растений`, 'repot');
      return;
    }

    const date = document.getElementById('bulk-date').value;
    if (!date) return;

    const extra = {};
    if (currentAction === 'fertilize') {
      const f = getCustomSelectValue('bulk-fertilizer');
      const d = document.getElementById('bulk-dose').value;
      const n = document.getElementById('bulk-fert-next-days').value;
      if (f) extra.fertilizer = f;
      if (d) extra.dose = d;
      if (n) extra.next_days = parseInt(n);
    }
    if (currentAction === 'pest_control') {
      const p = getCustomSelectValue('bulk-product');
      const n = document.getElementById('bulk-pest-next-days').value;
      if (p) extra.product = p;
      if (n) extra.next_days = parseInt(n);
    }
    if (currentAction === 'vitamins') {
      const p = getCustomSelectValue('bulk-vitamins');
      const n = document.getElementById('bulk-vitamins-next-days').value;
      if (p) extra.product = p;
      if (n) extra.next_days = parseInt(n);
    }

    modal.remove();
    for (const plantId of selectedIds) {
      await applyAction(plantId, currentAction, date, extra);
    }
    render();
    const msgs = ACTION_TOASTS[currentAction] || ['🌿 Молодец!'];
    showToast(msgs[Math.floor(Math.random() * msgs.length)], currentAction);
  });
}

// ── Archive modal ─────────────────────────────────────────────────────────────
const ARCHIVE_REASONS = [
  '💸 Продала',
  '💧 Залила',
  '🐛 Вредители',
  '☀️ Сгорела',
  '🥶 Замёрзла',
  '🏜 Засохла',
  '🎁 Отдала',
  '😔 Погибла',
];

function openArchiveModal(plant, onConfirm) {
  const existing = document.getElementById('modal-archive');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'modal-archive';
  modal.style.display = 'flex';

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.addEventListener('click', () => modal.remove());

  const content = document.createElement('div');
  content.className = 'modal-content';
  content.style.maxWidth = '380px';
  content.innerHTML = `
    <div class="modal-header">
      <h3>📦 В архив — ${plant.name}</h3>
      <button class="modal-close">&times;</button>
    </div>
    <div style="padding:20px;display:flex;flex-direction:column;gap:14px;">
      <div class="form-group">
        <label>Причина <span style="color:var(--text-secondary);font-size:0.85em">(необязательно)</span></label>
        <div id="archive-reason-chips" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:6px;"></div>
      </div>
      <div class="form-group" id="archive-other-wrap" style="display:none;">
        <label>Другая причина</label>
        <input type="text" id="archive-other-input" placeholder="Опишите причину...">
      </div>
      <div class="form-actions">
        <button type="button" class="btn-secondary" id="archive-cancel">Отмена</button>
        <button type="button" class="btn-primary" id="archive-confirm">Архивировать</button>
      </div>
    </div>
  `;

  modal.appendChild(overlay);
  modal.appendChild(content);
  document.body.appendChild(modal);

  content.querySelector('.modal-close').addEventListener('click', () => modal.remove());
  document.getElementById('archive-cancel').addEventListener('click', () => modal.remove());

  let selectedReason = '';
  const chipsWrap = document.getElementById('archive-reason-chips');
  const otherWrap = document.getElementById('archive-other-wrap');
  const otherInput = document.getElementById('archive-other-input');

  const makeChip = (label) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'type-chip';
    chip.textContent = label;
    chip.addEventListener('click', () => {
      chipsWrap.querySelectorAll('.type-chip').forEach(c => c.classList.remove('selected'));
      const isOther = label === '✏️ Другое';
      if (selectedReason === label) {
        selectedReason = '';
        otherWrap.style.display = 'none';
      } else {
        chip.classList.add('selected');
        selectedReason = label;
        otherWrap.style.display = isOther ? '' : 'none';
        if (!isOther) otherInput.value = '';
      }
    });
    return chip;
  };

  ARCHIVE_REASONS.forEach(r => chipsWrap.appendChild(makeChip(r)));
  chipsWrap.appendChild(makeChip('✏️ Другое'));

  document.getElementById('archive-confirm').addEventListener('click', async () => {
    let reason = '';
    if (selectedReason === '✏️ Другое') {
      reason = otherInput.value.trim();
    } else {
      reason = selectedReason;
    }
    modal.remove();
    await onConfirm(reason);
  });
}

// ── Archive ───────────────────────────────────────────────────────────────────
function buildArchiveCard(plant) {
  const card = document.createElement('div');
  card.className = 'plant-card';
  card.style.cursor = 'pointer';
  card.addEventListener('click', () => openDetail(plant.id));

  const src = coverSrc(plant);
  if (src) {
    const photoDiv = document.createElement('div');
    photoDiv.className = 'plant-photo';
    const img = document.createElement('img');
    img.src = src;
    img.alt = plant.name;
    photoDiv.appendChild(img);
    card.appendChild(photoDiv);
  } else {
    const ph = document.createElement('div');
    ph.className = 'plant-photo-placeholder';
    ph.textContent = '🌿';
    card.appendChild(ph);
  }

  const body = document.createElement('div');
  body.className = 'plant-body';

  const name = document.createElement('div');
  name.className = 'plant-name';
  name.textContent = plant.name;
  body.appendChild(name);

  if (plant.archived_date) {
    const dateEl = document.createElement('div');
    dateEl.className = 'plant-desc';
    dateEl.style.color = 'var(--text-secondary)';
    dateEl.textContent = `Архивировано: ${formatDate(plant.archived_date)}`;
    body.appendChild(dateEl);
  }

  if (plant.archive_reason) {
    const reasonEl = document.createElement('div');
    reasonEl.style.cssText = 'font-size:0.88em;font-weight:600;margin-top:4px;';
    reasonEl.textContent = plant.archive_reason;
    body.appendChild(reasonEl);
  }

  card.appendChild(body);

  const actions = document.createElement('div');
  actions.style.cssText = 'display:flex;gap:8px;padding:0 16px 14px;';

  const restoreBtn = document.createElement('button');
  restoreBtn.className = 'btn-primary';
  restoreBtn.style.flex = '1';
  restoreBtn.textContent = '↩ Восстановить';
  restoreBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    await api('POST', `/api/plants/${plant.id}/restore`);
    archivePlants = archivePlants.filter(p => p.id !== plant.id);
    plant.archived = false;
    plants.push(plant);
    renderArchive();
    render();
  });

  const delBtn = document.createElement('button');
  delBtn.className = 'btn-danger';
  delBtn.style.flex = '1';
  delBtn.textContent = '🗑 Удалить';
  delBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (!confirm(`Удалить "${plant.name}" навсегда?`)) return;
    await api('DELETE', `/api/plants/${plant.id}`);
    archivePlants = archivePlants.filter(p => p.id !== plant.id);
    renderArchive();
  });

  actions.appendChild(restoreBtn);
  actions.appendChild(delBtn);
  card.appendChild(actions);
  return card;
}

function renderArchive() {
  const list = document.getElementById('archive-list');
  const empty = document.getElementById('archive-empty');
  list.innerHTML = '';
  if (!archivePlants.length) { empty.style.display = ''; return; }
  empty.style.display = 'none';
  archivePlants.forEach(plant => list.appendChild(buildArchiveCard(plant)));
}

// ── Cuttings ──────────────────────────────────────────────────────────────────
function renderCuttings() {
  const list = document.getElementById('cuttings-list');
  const empty = document.getElementById('cuttings-empty');
  list.innerHTML = '';
  if (!cuttings.length) { empty.style.display = ''; return; }
  empty.style.display = 'none';
  cuttings.forEach(c => {
    const card = document.createElement('div');
    card.className = 'cutting-card';
    const st = CUTTING_STATUSES[c.status] || CUTTING_STATUSES.rooting;
    const daysSince = c.date_taken ? Math.floor((new Date(today()) - new Date(c.date_taken)) / 86400000) : null;
    card.innerHTML = `
      <div class="cutting-icon">${c.status === 'failed' ? '🥀' : '🌿'}</div>
      <div class="cutting-info">
        <div class="cutting-name">${c.name}</div>
        <div class="cutting-meta">
          <span class="cutting-status ${st.cls}">${st.label}</span>
          <span>${CUTTING_METHODS[c.method] || c.method}</span>
          ${daysSince !== null ? `<span>${daysSince} дн.</span>` : ''}
          ${c.date_taken ? `<span>с ${formatDate(c.date_taken)}</span>` : ''}
        </div>
        ${c.notes ? `<div style="font-size:0.82rem;color:var(--text-muted);margin-top:4px;">${c.notes}</div>` : ''}
      </div>
      <div class="cutting-actions"></div>
    `;
    const actions = card.querySelector('.cutting-actions');
    const editBtn = document.createElement('button');
    editBtn.className = 'btn-secondary';
    editBtn.textContent = '✏️';
    editBtn.style.padding = '6px 10px';
    editBtn.addEventListener('click', () => openEditCuttingModal(c));
    const delBtn = document.createElement('button');
    delBtn.className = 'btn-danger';
    delBtn.textContent = '🗑';
    delBtn.style.padding = '6px 10px';
    delBtn.addEventListener('click', async () => {
      if (!confirm(`Удалить черенок "${c.name}"?`)) return;
      await api('DELETE', `/api/cuttings/${c.id}`);
      cuttings = cuttings.filter(x => x.id !== c.id);
      renderCuttings();
    });
    actions.appendChild(editBtn);
    actions.appendChild(delBtn);
    list.appendChild(card);
  });
}

function openCuttingModal(cutting = null) {
  const existing = document.getElementById('modal-cutting');
  if (existing) existing.remove();
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'modal-cutting';
  modal.style.display = 'flex';
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.addEventListener('click', () => modal.remove());
  const content = document.createElement('div');
  content.className = 'modal-content';
  content.style.maxWidth = '420px';
  const parentOptions = plants.map(p => `<option value="${p.id}" ${cutting?.parent_plant_id === p.id ? 'selected' : ''}>${p.name}</option>`).join('');
  content.innerHTML = `
    <div class="modal-header">
      <h3>${cutting ? 'Редактировать черенок' : 'Новый черенок'}</h3>
      <button class="modal-close">&times;</button>
    </div>
    <div style="padding:20px;display:flex;flex-direction:column;gap:12px;">
      <div class="form-group"><label>Название *</label>
        <input type="text" id="cut-name" value="${cutting?.name || ''}" placeholder="Эпипремнум, Монстера..." required></div>
      <div class="form-group"><label>Родительское растение</label>
        <select id="cut-parent"><option value="">— не указано —</option>${parentOptions}</select></div>
      <div class="form-group"><label>Дата взятия</label>
        <input type="date" id="cut-date" value="${cutting?.date_taken || today()}"></div>
      <div class="form-group"><label>Метод</label>
        <select id="cut-method">
          <option value="water" ${cutting?.method === 'water' || !cutting ? 'selected' : ''}>💧 В воде</option>
          <option value="soil" ${cutting?.method === 'soil' ? 'selected' : ''}>🌱 В грунте</option>
          <option value="moss" ${cutting?.method === 'moss' ? 'selected' : ''}>🌿 Во мхе</option>
        </select></div>
      <div class="form-group"><label>Статус</label>
        <select id="cut-status">
          <option value="rooting" ${cutting?.status === 'rooting' || !cutting ? 'selected' : ''}>🔄 Укоренение</option>
          <option value="rooted" ${cutting?.status === 'rooted' ? 'selected' : ''}>✅ Укоренился</option>
          <option value="planted" ${cutting?.status === 'planted' ? 'selected' : ''}>🪴 Посажен</option>
          <option value="failed" ${cutting?.status === 'failed' ? 'selected' : ''}>❌ Не прижился</option>
        </select></div>
      <div class="form-group"><label>Заметки</label>
        <textarea id="cut-notes" rows="2">${cutting?.notes || ''}</textarea></div>
      <div class="form-actions">
        <button type="button" class="btn-secondary" id="cut-cancel">Отмена</button>
        <button type="button" class="btn-primary" id="cut-save">Сохранить</button>
      </div>
    </div>`;
  modal.appendChild(overlay);
  modal.appendChild(content);
  document.body.appendChild(modal);
  content.querySelector('.modal-close').addEventListener('click', () => modal.remove());
  document.getElementById('cut-cancel').addEventListener('click', () => modal.remove());
  document.getElementById('cut-save').addEventListener('click', async () => {
    const name = document.getElementById('cut-name').value.trim();
    if (!name) return;
    const payload = {
      name,
      parent_plant_id: document.getElementById('cut-parent').value,
      date_taken: document.getElementById('cut-date').value,
      method: document.getElementById('cut-method').value,
      status: document.getElementById('cut-status').value,
      notes: document.getElementById('cut-notes').value.trim(),
    };
    if (cutting) {
      const updated = await api('PUT', `/api/cuttings/${cutting.id}`, payload);
      const idx = cuttings.findIndex(c => c.id === cutting.id);
      if (idx !== -1) cuttings[idx] = updated;
    } else {
      const created = await api('POST', '/api/cuttings', payload);
      cuttings.push(created);
    }
    modal.remove();
    renderCuttings();
  });
}
const openEditCuttingModal = c => openCuttingModal(c);

// ── Calendar ──────────────────────────────────────────────────────────────────
function renderCalendar() {
  const container = document.getElementById('calendar-container');
  container.innerHTML = '';
  const schedule = {};
  const t = today();
  for (let i = 0; i <= 30; i++) {
    const ds = addDays(t, i);
    plants.forEach(plant => {
      const tasks = [];
      const wNext = nextDate(plant.watering);
      if (wNext === ds) tasks.push({ action: 'water', label: '💧 Полить' });
      const fNext = nextDate(plant.fertilizing);
      if (fNext === ds) tasks.push({ action: 'fertilize', label: '🌱 Подкормить' });
      if (plant.fertilizing_reminder_date === ds) tasks.push({ action: 'fertilize', label: '🌱 Подкормить' });
      if (plant.pest_control?.last_date && plant.pest_control?.frequency_days) {
        if (addDays(plant.pest_control.last_date, plant.pest_control.frequency_days) === ds)
          tasks.push({ action: 'pest_control', label: '🐛 Обработать' });
      }
      if (plant.vitamins?.last_date && plant.vitamins?.frequency_days) {
        if (addDays(plant.vitamins.last_date, plant.vitamins.frequency_days) === ds)
          tasks.push({ action: 'vitamins', label: '💊 Витамины' });
      }
      tasks.forEach(task => {
        if (!schedule[ds]) schedule[ds] = [];
        if (!schedule[ds].find(x => x.plant.id === plant.id && x.action === task.action))
          schedule[ds].push({ plant, ...task });
      });
    });
  }
  const dates = Object.keys(schedule).sort();
  if (!dates.length) {
    container.innerHTML = '<div class="empty-state"><span class="empty-icon">🌿</span><p>Нет запланированных задач на ближайшие 30 дней</p></div>';
    return;
  }
  dates.forEach(ds => {
    const dayEl = document.createElement('div');
    dayEl.className = 'calendar-day';
    const header = document.createElement('div');
    header.className = 'calendar-day-header';
    const diff = daysDiff(ds);
    const [y, m, d2] = ds.split('-');
    const months = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
    let label = `${parseInt(d2)} ${months[parseInt(m)-1]}`;
    if (diff === 0) { label = `Сегодня · ${label}`; header.classList.add('is-today'); }
    else if (diff === 1) { label = `Завтра · ${label}`; header.classList.add('is-tomorrow'); }
    header.textContent = label;
    dayEl.appendChild(header);
    // Group by action
    const byAction = {};
    schedule[ds].forEach(x => { (byAction[x.action] = byAction[x.action] || { label: x.label, plants: [] }).plants.push(x.plant); });
    Object.values(byAction).forEach(({ label, plants: ps }) => {
      const row = document.createElement('div');
      row.className = 'calendar-task-row';
      const lbl = document.createElement('span');
      lbl.className = 'cal-action-label';
      lbl.textContent = label + ':';
      row.appendChild(lbl);
      ps.forEach((p, i) => {
        const span = document.createElement('span');
        span.className = 'cal-plant-name';
        span.textContent = p.name;
        span.addEventListener('click', () => { openDetail(p.id); });
        row.appendChild(span);
        if (i < ps.length - 1) row.appendChild(document.createTextNode(', '));
      });
      dayEl.appendChild(row);
    });
    container.appendChild(dayEl);
  });
}

// ── Theme ─────────────────────────────────────────────────────────────────────
(function () {
  const btn = document.getElementById('theme-toggle');
  const apply = dark => {
    document.body.classList.toggle('dark', dark);
    btn.innerHTML = `<i data-lucide="${dark ? 'sun' : 'moon'}" class="nav-icon"></i><span class="nav-label">${dark ? 'Светлая тема' : 'Тёмная тема'}</span>`;
    if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [btn] });
  };
  apply(localStorage.getItem('theme') === 'dark');
  btn.addEventListener('click', () => {
    const dark = !document.body.classList.contains('dark');
    localStorage.setItem('theme', dark ? 'dark' : 'light');
    apply(dark);
    if (currentView === 'stats') renderStats();
  });
})();

// ── Statistics / BI Dashboard ─────────────────────────────────────────────────
const _statCharts = {};

function _destroyStatCharts() {
  Object.keys(_statCharts).forEach(k => {
    if (_statCharts[k]) { _statCharts[k].destroy(); delete _statCharts[k]; }
  });
}

function _chartTheme() {
  const dark = document.body.classList.contains('dark');
  return {
    sage:     dark ? '#7FAB86' : '#6B8F71',
    olive:    dark ? '#A5B88A' : '#8B9B6E',
    sageDark: dark ? '#A5C9AA' : '#3D5C42',
    grid:     dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
    tick:     dark ? '#908C84' : '#8C8780',
    bg:       dark ? '#1C1C1A' : '#FFFFFF',
  };
}

function _monthLabels(count) {
  const now = new Date();
  const keys = [], labels = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    labels.push(d.toLocaleDateString('ru-RU', { month: 'short', year: '2-digit' }));
  }
  return { keys, labels };
}

// ── Achievements view ─────────────────────────────────────────────────────────
async function renderAchievements() {
  const container = document.getElementById('achievements-container');
  if (!container) return;

  if (cuttings.length === 0) {
    try { cuttings = await api('GET', '/api/cuttings'); } catch(e) {}
  }

  const unlocked = ACHIEVEMENTS.filter(a => { try { return a.check(); } catch(e) { return false; } });
  const locked   = ACHIEVEMENTS.filter(a => { try { return !a.check(); } catch(e) { return true; } });

  const subtitle = document.getElementById('achievements-subtitle');
  if (subtitle) subtitle.textContent = `${unlocked.length} из ${ACHIEVEMENTS.length} разблокировано`;

  container.innerHTML = '';

  // Category groups — show unlocked first within each group
  const cats = [...new Set(ACHIEVEMENTS.map(a => a.cat))];

  cats.forEach(cat => {
    const inCat = ACHIEVEMENTS.filter(a => a.cat === cat);
    const unlockedInCat = inCat.filter(a => { try { return a.check(); } catch(e) { return false; } });

    const section = document.createElement('div');
    section.style.marginBottom = '28px';

    const catHeader = document.createElement('div');
    catHeader.className = 'achievements-header';
    catHeader.innerHTML = `
      <h3 style="font-size:0.9rem;font-weight:700;margin:0;">${cat}</h3>
      <span class="achievements-counter">${unlockedInCat.length} / ${inCat.length}</span>
    `;
    section.appendChild(catHeader);

    const grid = document.createElement('div');
    grid.className = 'achievements-grid';

    const unlockedSet = new Set(unlockedInCat.map(a => a.id));
    [...inCat.filter(a => unlockedSet.has(a.id)), ...inCat.filter(a => !unlockedSet.has(a.id))].forEach(a => {
      const isUnlocked = unlockedSet.has(a.id);
      const card = document.createElement('div');
      card.className = 'achievement-card ' + (isUnlocked ? 'unlocked' : 'locked');
      card.innerHTML = `
        ${isUnlocked ? '<div class="achievement-unlocked-badge">✓</div>' : ''}
        <div class="achievement-icon">${a.icon}</div>
        <div class="achievement-name">${a.name}</div>
        <div class="achievement-desc">${a.desc}</div>
      `;
      grid.appendChild(card);
    });

    section.appendChild(grid);
    container.appendChild(section);
  });
}

function renderStats() {
  const container = document.getElementById('stats-container');
  if (!container) return;
  _destroyStatCharts();
  container.innerHTML = '';

  const ct = _chartTheme();

  // ── KPI row ──────────────────────────────────────────────────────────────
  const overdueCount    = plants.filter(p => hasOverdueTasks(p)).length;
  const favoritedCount  = plants.filter(p => p.favorited).length;
  const floweringCount  = plants.filter(p => p.is_flowering).length;
  const withProblems    = plants.filter(p => (p.problems || []).length > 0).length;
  const needsRepotting  = plants.filter(p => p.needs_repotting).length;

  const kpiRow = document.createElement('div');
  kpiRow.className = 'stats-kpi-row';
  [
    { icon: '🌿', value: plants.length,   label: 'Растений' },
    { icon: '❤️', value: favoritedCount,  label: 'Избранных' },
    { icon: '🌸', value: floweringCount,  label: 'Цветут' },
    { icon: '⚠️', value: overdueCount,    label: 'Требуют ухода' },
    { icon: '🐛', value: withProblems,    label: 'С вредителями' },
    { icon: '🪴', value: needsRepotting,  label: 'Нужна пересадка' },
  ].forEach(({ icon, value, label }) => {
    const card = document.createElement('div');
    card.className = 'stat-card';
    card.innerHTML = `<div class="stat-card-icon">${icon}</div><div class="stat-card-value">${value}</div><div class="stat-card-label">${label}</div>`;
    kpiRow.appendChild(card);
  });
  container.appendChild(kpiRow);

  // ── New plants by month (bar) + cumulative line — two columns ────────────
  {
    const { keys, labels } = _monthLabels(12);
    const newCounts = keys.map(m => plants.filter(p => (p.purchased_date || '').startsWith(m)).length);

    // Cumulative: how many plants acquired by end of each month
    const cumCounts = keys.map(m => {
      const endOfMonth = m + '-31';
      return plants.filter(p => p.purchased_date && p.purchased_date <= endOfMonth).length;
    });

    const twoCol = document.createElement('div');
    twoCol.className = 'dashboard-charts-2';

    // Bar: new per month
    const cardBar = document.createElement('div');
    cardBar.className = 'dashboard-chart-card';
    cardBar.style.marginBottom = '0';
    cardBar.innerHTML = `<div class="chart-card-title">Новые растения по месяцам</div><div style="position:relative;height:200px"><canvas id="chart-new-plants"></canvas></div>`;
    twoCol.appendChild(cardBar);

    _statCharts.newPlants = new Chart(cardBar.querySelector('#chart-new-plants').getContext('2d'), {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Новых',
          data: newCounts,
          backgroundColor: ct.sage + 'BB',
          borderColor: ct.sage,
          borderWidth: 1.5,
          borderRadius: 6,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: ct.grid }, ticks: { color: ct.tick, font: { size: 11 } } },
          y: { grid: { color: ct.grid }, ticks: { color: ct.tick, font: { size: 11 }, stepSize: 1 }, beginAtZero: true },
        }
      }
    });

    // Line: cumulative total
    const cardLine = document.createElement('div');
    cardLine.className = 'dashboard-chart-card';
    cardLine.style.marginBottom = '0';
    cardLine.innerHTML = `<div class="chart-card-title">Всего растений в коллекции</div><div style="position:relative;height:200px"><canvas id="chart-cumulative"></canvas></div>`;
    twoCol.appendChild(cardLine);

    _statCharts.cumulative = new Chart(cardLine.querySelector('#chart-cumulative').getContext('2d'), {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Растений',
          data: cumCounts,
          borderColor: ct.sageDark,
          backgroundColor: ct.sageDark + '22',
          borderWidth: 2.5,
          tension: 0.4,
          fill: true,
          pointRadius: 4,
          pointBackgroundColor: ct.sageDark,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: ct.grid }, ticks: { color: ct.tick, font: { size: 11 } } },
          y: { grid: { color: ct.grid }, ticks: { color: ct.tick, font: { size: 11 }, stepSize: 1 }, beginAtZero: true },
        }
      }
    });

    container.appendChild(twoCol);
  }

  // ── Two-column: types doughnut + rooms horizontal bar ─────────────────────
  const types = {};
  plants.forEach(p => { (p.plant_types || []).forEach(tp => { types[tp] = (types[tp] || 0) + 1; }); });
  const rooms = {};
  plants.forEach(p => { const r = p.room || ''; if (r) rooms[r] = (rooms[r] || 0) + 1; });

  const hasTypes = Object.keys(types).length > 0;
  const hasRooms = Object.keys(rooms).length > 0;

  if (hasTypes || hasRooms) {
    const twoCol = document.createElement('div');
    twoCol.className = 'dashboard-charts-2';

    if (hasTypes) {
      const typeEntries = Object.entries(types).sort((a, b) => b[1] - a[1]);
      const palette = [ct.sage, ct.olive, ct.sageDark, '#B5C99A', '#D4E6D1', '#8FA68B', '#C4D7C8'];
      const card = document.createElement('div');
      card.className = 'dashboard-chart-card';
      card.style.marginBottom = '0';
      card.innerHTML = `<div class="chart-card-title">Типы растений</div><div style="position:relative;height:200px"><canvas id="chart-types"></canvas></div>`;
      twoCol.appendChild(card);

      _statCharts.types = new Chart(card.querySelector('#chart-types').getContext('2d'), {
        type: 'doughnut',
        data: {
          labels: typeEntries.map(([k]) => k),
          datasets: [{ data: typeEntries.map(([, v]) => v), backgroundColor: palette, borderWidth: 2, borderColor: ct.bg }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '62%',
          plugins: {
            legend: { position: 'right', labels: { color: ct.tick, font: { size: 11 }, boxWidth: 12, padding: 8 } }
          }
        }
      });
    }

    if (hasRooms) {
      const roomEntries = Object.entries(rooms).sort((a, b) => b[1] - a[1]);
      const card = document.createElement('div');
      card.className = 'dashboard-chart-card';
      card.style.marginBottom = '0';
      card.innerHTML = `<div class="chart-card-title">По комнатам</div><div style="position:relative;height:200px"><canvas id="chart-rooms"></canvas></div>`;
      twoCol.appendChild(card);

      _statCharts.rooms = new Chart(card.querySelector('#chart-rooms').getContext('2d'), {
        type: 'bar',
        data: {
          labels: roomEntries.map(([k]) => k),
          datasets: [{
            label: 'Растений',
            data: roomEntries.map(([, v]) => v),
            backgroundColor: ct.olive + 'BB',
            borderColor: ct.olive,
            borderWidth: 1.5,
            borderRadius: 6,
            borderSkipped: false,
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { color: ct.grid }, ticks: { color: ct.tick, font: { size: 11 }, stepSize: 1 }, beginAtZero: true },
            y: { grid: { display: false }, ticks: { color: ct.tick, font: { size: 11 } } },
          }
        }
      });
    }

    container.appendChild(twoCol);
  }

  // ── Care activity by month (line) ─────────────────────────────────────────
  {
    const { keys, labels } = _monthLabels(12);
    const waterCounts = keys.map(() => 0);
    const fertCounts  = keys.map(() => 0);

    plants.forEach(p => {
      (p.watering?.history || []).forEach(h => {
        const dt = typeof h === 'string' ? h : (h?.date || '');
        const idx = keys.indexOf(dt.substring(0, 7));
        if (idx >= 0) waterCounts[idx]++;
      });
      (p.fertilizing?.history || []).forEach(h => {
        const dt = typeof h === 'string' ? h : (h?.date || '');
        const idx = keys.indexOf(dt.substring(0, 7));
        if (idx >= 0) fertCounts[idx]++;
      });
    });

    const card = document.createElement('div');
    card.className = 'dashboard-chart-card';
    card.innerHTML = `<div class="chart-card-title">Активность ухода по месяцам</div><div style="position:relative;height:200px"><canvas id="chart-care"></canvas></div>`;
    container.appendChild(card);

    _statCharts.care = new Chart(card.querySelector('#chart-care').getContext('2d'), {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Поливы',
            data: waterCounts,
            borderColor: ct.sage,
            backgroundColor: ct.sage + '22',
            borderWidth: 2,
            tension: 0.4,
            fill: true,
            pointRadius: 3,
          },
          {
            label: 'Подкормки',
            data: fertCounts,
            borderColor: ct.olive,
            backgroundColor: ct.olive + '22',
            borderWidth: 2,
            tension: 0.4,
            fill: true,
            pointRadius: 3,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: ct.tick, font: { size: 11 }, boxWidth: 12, padding: 10 } }
        },
        scales: {
          x: { grid: { color: ct.grid }, ticks: { color: ct.tick, font: { size: 11 } } },
          y: { grid: { color: ct.grid }, ticks: { color: ct.tick, font: { size: 11 }, stepSize: 1 }, beginAtZero: true },
        }
      }
    });
  }

  // ── Flowering history ─────────────────────────────────────────────────────
  const floweringPlants = plants.filter(p => (p.flowering_log || []).length > 0);
  if (floweringPlants.length > 0) {
    const sec = document.createElement('div');
    sec.className = 'stats-section';
    const secTitle = document.createElement('div');
    secTitle.className = 'stats-section-title';
    secTitle.textContent = '🌸 История цветения';
    sec.appendChild(secTitle);
    const list = document.createElement('div');
    list.className = 'stats-list';

    floweringPlants.forEach(p => {
      const log = [...(p.flowering_log || [])].sort((a, b) => a.date.localeCompare(b.date));
      const periods = [];
      let openStart = null;
      log.forEach(e => {
        if (e.event === 'start') { openStart = e; }
        else if (e.event === 'end') { periods.push({ start: openStart, end: e }); openStart = null; }
      });
      if (openStart) periods.push({ start: openStart, end: null });

      periods.reverse().forEach(({ start, end }) => {
        const row = document.createElement('div');
        row.className = 'stats-list-row';
        row.style.cursor = 'pointer';
        row.addEventListener('click', () => {
          document.querySelectorAll('.sidebar-nav-btn').forEach(b => b.classList.remove('active'));
          document.querySelector('[data-view="all"]').classList.add('active');
          document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
          document.getElementById('view-all').classList.add('active');
          currentView = 'all';
          openDetail(p.id);
        });

        const nameEl = document.createElement('span');
        nameEl.className = 'stats-list-label';
        nameEl.style.fontWeight = '600';
        nameEl.textContent = p.name;

        const datesEl = document.createElement('span');
        datesEl.style.fontSize = '0.8rem';
        datesEl.style.color = 'var(--text-muted)';
        datesEl.textContent = `${start ? formatDate(start.date) : '?'} — ${end ? formatDate(end.date) : '…'}`;

        const badge = document.createElement('span');
        badge.className = 'stats-list-count';
        if (!end) {
          badge.textContent = 'цветёт';
          badge.style.cssText = 'background:#fce4ec;color:#c2185b;';
        } else {
          const days = Math.round((new Date(end.date) - new Date(start?.date || end.date)) / 86400000);
          badge.textContent = days > 0 ? `${days} дн.` : '1 дн.';
        }

        const left = document.createElement('div');
        left.style.cssText = 'display:flex;flex-direction:column;gap:2px;';
        left.appendChild(nameEl);
        left.appendChild(datesEl);
        if (start?.notes || end?.notes) {
          const notes = document.createElement('span');
          notes.style.cssText = 'font-size:0.75rem;color:var(--text-muted);font-style:italic;';
          notes.textContent = [start?.notes, end?.notes].filter(Boolean).join(' · ');
          left.appendChild(notes);
        }
        row.appendChild(left);
        row.appendChild(badge);
        list.appendChild(row);
      });
    });
    sec.appendChild(list);
    container.appendChild(sec);
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────
loadPlants();
