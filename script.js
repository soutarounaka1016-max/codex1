const STORAGE_KEYS = {
  today: 'study-canvas-today-v1',
  weekly: 'study-canvas-weekly-v1',
  note: 'study-canvas-note-v1',
  migration: 'study-canvas-legacy-migrated-v1',
};
const LEGACY_STORAGE_KEY = 'simple-todo-items';
const BACKUP_APP_ID = 'study-canvas';
const BACKUP_VERSION = 1;

const state = {
  today: loadTaskList(STORAGE_KEYS.today),
  weekly: loadTaskList(STORAGE_KEYS.weekly),
  note: localStorage.getItem(STORAGE_KEYS.note) || '',
  pendingRestore: null,
};

const tabButtons = [...document.querySelectorAll('[data-tab]')];
const tabPanels = [...document.querySelectorAll('[data-panel]')];
const storageStatus = document.querySelector('#storage-status');
const taskCardTemplate = document.querySelector('#task-card-template');
const freeNote = document.querySelector('#free-note');
const noteCount = document.querySelector('#note-count');
const backupMessage = document.querySelector('#backup-message');
const restoreFileInput = document.querySelector('#restore-file');
const restorePreview = document.querySelector('#restore-preview');
const confirmRestoreButton = document.querySelector('#confirm-restore');
const cancelRestoreButton = document.querySelector('#cancel-restore');

const canvasConfig = {
  today: {
    storageKey: STORAGE_KEYS.today,
    form: document.querySelector('#today-form'),
    editId: document.querySelector('#today-edit-id'),
    subject: document.querySelector('#today-subject'),
    title: document.querySelector('#today-title'),
    minutes: document.querySelector('#today-minutes-input'),
    submit: document.querySelector('#today-submit'),
    cancel: document.querySelector('#today-cancel-edit'),
    list: document.querySelector('#today-list'),
    empty: document.querySelector('#today-empty'),
    remaining: document.querySelector('#today-remaining'),
    totalMinutes: document.querySelector('#today-minutes'),
    addLabel: 'カードを追加',
    editLabel: '変更を保存',
  },
  weekly: {
    storageKey: STORAGE_KEYS.weekly,
    form: document.querySelector('#weekly-form'),
    editId: document.querySelector('#weekly-edit-id'),
    subject: document.querySelector('#weekly-subject'),
    title: document.querySelector('#weekly-title'),
    minutes: document.querySelector('#weekly-minutes-input'),
    submit: document.querySelector('#weekly-submit'),
    cancel: document.querySelector('#weekly-cancel-edit'),
    list: document.querySelector('#weekly-list'),
    empty: document.querySelector('#weekly-empty'),
    remaining: document.querySelector('#weekly-remaining'),
    totalMinutes: document.querySelector('#weekly-minutes'),
    addLabel: '目標を追加',
    editLabel: '変更を保存',
  },
};

migrateLegacyTodos();
state.today = loadTaskList(STORAGE_KEYS.today);
initializeTabs();
initializeCanvas('today');
initializeCanvas('weekly');
initializeNote();
initializeBackup();
renderAll();

function initializeTabs() {
  tabButtons.forEach((button) => {
    button.addEventListener('click', () => activateTab(button.dataset.tab));
  });
}

function activateTab(tabName) {
  tabButtons.forEach((button) => {
    const isActive = button.dataset.tab === tabName;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-selected', String(isActive));
  });

  tabPanels.forEach((panel) => {
    const isActive = panel.dataset.panel === tabName;
    panel.classList.toggle('active', isActive);
    panel.hidden = !isActive;
  });
}

function initializeCanvas(canvasName) {
  const config = canvasConfig[canvasName];

  config.form.addEventListener('submit', (event) => {
    event.preventDefault();
    const title = config.title.value.trim();
    const minutes = Number(config.minutes.value);

    if (!title || !Number.isFinite(minutes) || minutes < 5) {
      config.form.reportValidity();
      return;
    }

    const existingId = config.editId.value;
    if (existingId) {
      state[canvasName] = state[canvasName].map((task) => (
        task.id === existingId
          ? { ...task, subject: config.subject.value, title, plannedMinutes: minutes }
          : task
      ));
    } else {
      state[canvasName].push({
        id: createId(),
        subject: config.subject.value,
        title,
        plannedMinutes: minutes,
        completed: false,
        createdAt: new Date().toISOString(),
      });
    }

    saveCanvas(canvasName);
    resetTaskForm(canvasName);
    renderCanvas(canvasName);
    showSavedStatus();
  });

  config.cancel.addEventListener('click', () => resetTaskForm(canvasName));

  config.list.addEventListener('change', (event) => {
    const checkbox = event.target.closest('.task-checkbox');
    if (!checkbox) return;

    const task = state[canvasName].find((item) => item.id === checkbox.dataset.id);
    if (!task) return;

    task.completed = checkbox.checked;
    saveCanvas(canvasName);
    renderCanvas(canvasName);
    showSavedStatus();
  });

  config.list.addEventListener('click', (event) => {
    const editButton = event.target.closest('.edit-button');
    const deleteButton = event.target.closest('.delete-button');

    if (editButton) {
      startEditingTask(canvasName, editButton.dataset.id);
      return;
    }

    if (deleteButton) {
      const task = state[canvasName].find((item) => item.id === deleteButton.dataset.id);
      if (!task) return;
      if (!window.confirm(`「${task.title}」を削除しますか？`)) return;

      state[canvasName] = state[canvasName].filter((item) => item.id !== task.id);
      saveCanvas(canvasName);
      resetTaskForm(canvasName);
      renderCanvas(canvasName);
      showSavedStatus();
    }
  });
}

function renderAll() {
  renderCanvas('today');
  renderCanvas('weekly');
  freeNote.value = state.note;
  updateNoteCount();
}

function renderCanvas(canvasName) {
  const config = canvasConfig[canvasName];
  const tasks = state[canvasName];
  config.list.replaceChildren();

  tasks.forEach((task) => {
    const card = taskCardTemplate.content.firstElementChild.cloneNode(true);
    const checkbox = card.querySelector('.task-checkbox');
    const subjectBadge = card.querySelector('.subject-badge');
    const minutesBadge = card.querySelector('.minutes-badge');
    const title = card.querySelector('.task-card-title');
    const editButton = card.querySelector('.edit-button');
    const deleteButton = card.querySelector('.delete-button');

    card.classList.toggle('completed', task.completed);
    checkbox.checked = task.completed;
    checkbox.dataset.id = task.id;
    checkbox.setAttribute('aria-label', `${task.title}の完了状態を切り替える`);
    subjectBadge.textContent = task.subject;
    subjectBadge.dataset.subject = task.subject;
    minutesBadge.textContent = task.plannedMinutes ? `${task.plannedMinutes}分` : '時間未設定';
    title.textContent = task.title;
    editButton.dataset.id = task.id;
    editButton.setAttribute('aria-label', `${task.title}を編集する`);
    deleteButton.dataset.id = task.id;
    deleteButton.setAttribute('aria-label', `${task.title}を削除する`);
    config.list.append(card);
  });

  const incompleteTasks = tasks.filter((task) => !task.completed);
  const incompleteMinutes = incompleteTasks.reduce((sum, task) => sum + (task.plannedMinutes || 0), 0);
  config.remaining.textContent = `${incompleteTasks.length}件`;
  config.totalMinutes.textContent = `予定 ${formatMinutes(incompleteMinutes)}`;
  config.empty.classList.toggle('hidden', tasks.length > 0);
}

function startEditingTask(canvasName, taskId) {
  const config = canvasConfig[canvasName];
  const task = state[canvasName].find((item) => item.id === taskId);
  if (!task) return;

  config.editId.value = task.id;
  config.subject.value = task.subject;
  config.title.value = task.title;
  config.minutes.value = task.plannedMinutes || 30;
  config.submit.textContent = config.editLabel;
  config.cancel.classList.remove('hidden');
  config.title.focus();
  config.form.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function resetTaskForm(canvasName) {
  const config = canvasConfig[canvasName];
  config.form.reset();
  config.editId.value = '';
  config.subject.value = '数学';
  config.submit.textContent = config.addLabel;
  config.cancel.classList.add('hidden');
}

function initializeNote() {
  freeNote.value = state.note;
  freeNote.addEventListener('input', () => {
    state.note = freeNote.value;
    localStorage.setItem(STORAGE_KEYS.note, state.note);
    updateNoteCount();
    showSavedStatus();
  });
}

function updateNoteCount() {
  noteCount.textContent = `${freeNote.value.length.toLocaleString('ja-JP')}文字`;
}

function initializeBackup() {
  document.querySelector('#export-backup').addEventListener('click', () => {
    downloadBackup(createBackupPayload(), 'study-canvas-backup');
    showBackupMessage('バックアップファイルを保存しました。');
  });

  restoreFileInput.addEventListener('change', async () => {
    clearRestoreSelection(false);
    const [file] = restoreFileInput.files;
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      state.pendingRestore = validateBackup(parsed);
      showRestorePreview(state.pendingRestore, file.name);
      showBackupMessage('内容を確認してください。まだ現在のデータは変更していません。');
    } catch (error) {
      clearRestoreSelection();
      showBackupMessage(error instanceof Error ? error.message : 'バックアップファイルを読み込めませんでした。', true);
    }
  });

  confirmRestoreButton.addEventListener('click', () => {
    if (!state.pendingRestore) return;

    const shouldRestore = window.confirm(
      '現在の今日タスク・週間目標・自由ノートを、選択したバックアップの内容で置き換えます。続けますか？',
    );
    if (!shouldRestore) return;

    downloadBackup(createBackupPayload(), 'study-canvas-before-restore');
    state.today = state.pendingRestore.data.today;
    state.weekly = state.pendingRestore.data.weekly;
    state.note = state.pendingRestore.data.note;
    persistAllData();
    resetTaskForm('today');
    resetTaskForm('weekly');
    renderAll();
    clearRestoreSelection();
    activateTab('today');
    showSavedStatus('復元しました');
    window.alert('復元が完了しました。復元前の状態もバックアップファイルとして保存しました。');
  });

  cancelRestoreButton.addEventListener('click', () => {
    clearRestoreSelection();
    showBackupMessage('復元を取り消しました。現在のデータは変更されていません。');
  });
}

function createBackupPayload() {
  return {
    app: BACKUP_APP_ID,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      today: state.today,
      weekly: state.weekly,
      note: state.note,
    },
  };
}

function validateBackup(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('バックアップの形式が正しくありません。');
  }
  if (payload.app !== BACKUP_APP_ID || payload.version !== BACKUP_VERSION) {
    throw new Error('このアプリで作成した対応バージョンのバックアップではありません。');
  }
  if (!payload.data || !Array.isArray(payload.data.today) || !Array.isArray(payload.data.weekly)) {
    throw new Error('バックアップ内のタスクデータが不足しています。');
  }
  if (typeof payload.data.note !== 'string') {
    throw new Error('バックアップ内のノートデータが正しくありません。');
  }

  return {
    ...payload,
    data: {
      today: payload.data.today.map(normalizeTask).filter(Boolean),
      weekly: payload.data.weekly.map(normalizeTask).filter(Boolean),
      note: payload.data.note.slice(0, 20000),
    },
  };
}

function showRestorePreview(payload, fileName) {
  const exportedAt = new Date(payload.exportedAt);
  const dateText = Number.isNaN(exportedAt.getTime())
    ? '日時不明'
    : exportedAt.toLocaleString('ja-JP');

  restorePreview.replaceChildren();
  const title = document.createElement('strong');
  title.textContent = fileName;
  const list = document.createElement('ul');
  [
    `保存日時：${dateText}`,
    `今日のカード：${payload.data.today.length}件`,
    `週間目標：${payload.data.weekly.length}件`,
    `自由ノート：${payload.data.note.length.toLocaleString('ja-JP')}文字`,
  ].forEach((text) => {
    const item = document.createElement('li');
    item.textContent = text;
    list.append(item);
  });
  restorePreview.append(title, list);
  restorePreview.classList.remove('hidden');
  confirmRestoreButton.classList.remove('hidden');
  cancelRestoreButton.classList.remove('hidden');
}

function clearRestoreSelection(clearInput = true) {
  state.pendingRestore = null;
  restorePreview.replaceChildren();
  restorePreview.classList.add('hidden');
  confirmRestoreButton.classList.add('hidden');
  cancelRestoreButton.classList.add('hidden');
  if (clearInput) restoreFileInput.value = '';
}

function downloadBackup(payload, prefix) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  anchor.href = url;
  anchor.download = `${prefix}-${timestamp}.json`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function persistAllData() {
  localStorage.setItem(STORAGE_KEYS.today, JSON.stringify(state.today));
  localStorage.setItem(STORAGE_KEYS.weekly, JSON.stringify(state.weekly));
  localStorage.setItem(STORAGE_KEYS.note, state.note);
}

function saveCanvas(canvasName) {
  localStorage.setItem(canvasConfig[canvasName].storageKey, JSON.stringify(state[canvasName]));
}

function loadTaskList(storageKey) {
  const raw = localStorage.getItem(storageKey);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeTask).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function normalizeTask(task) {
  if (!task || typeof task !== 'object') return null;
  const title = typeof task.title === 'string'
    ? task.title.trim()
    : typeof task.text === 'string'
      ? task.text.trim()
      : '';
  if (!title) return null;

  const numericMinutes = Number(task.plannedMinutes);
  return {
    id: typeof task.id === 'string' && task.id ? task.id : createId(),
    subject: typeof task.subject === 'string' && task.subject ? task.subject.slice(0, 20) : '未設定',
    title: title.slice(0, 100),
    plannedMinutes: Number.isFinite(numericMinutes) && numericMinutes > 0 ? Math.min(numericMinutes, 3000) : null,
    completed: Boolean(task.completed),
    createdAt: typeof task.createdAt === 'string' ? task.createdAt : new Date().toISOString(),
  };
}

function migrateLegacyTodos() {
  if (localStorage.getItem(STORAGE_KEYS.migration) === 'done') return;
  if (localStorage.getItem(STORAGE_KEYS.today)) {
    localStorage.setItem(STORAGE_KEYS.migration, 'done');
    return;
  }

  const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!legacyRaw) {
    localStorage.setItem(STORAGE_KEYS.migration, 'done');
    return;
  }

  try {
    const legacyTodos = JSON.parse(legacyRaw);
    if (Array.isArray(legacyTodos)) {
      const migratedTasks = legacyTodos.map(normalizeTask).filter(Boolean);
      localStorage.setItem(STORAGE_KEYS.today, JSON.stringify(migratedTasks));
    }
  } catch {
    // 壊れた旧データは削除せず、そのまま残します。
  }

  localStorage.setItem(STORAGE_KEYS.migration, 'done');
}

function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatMinutes(minutes) {
  if (!minutes) return '0分';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest}分`;
  if (!rest) return `${hours}時間`;
  return `${hours}時間${rest}分`;
}

let statusTimer;
function showSavedStatus(message = '保存しました') {
  window.clearTimeout(statusTimer);
  storageStatus.textContent = message;
  storageStatus.classList.add('saved');
  statusTimer = window.setTimeout(() => {
    storageStatus.textContent = 'この端末のブラウザに自動保存します';
    storageStatus.classList.remove('saved');
  }, 1800);
}

function showBackupMessage(message, isError = false) {
  backupMessage.textContent = message;
  backupMessage.classList.toggle('error', isError);
}
