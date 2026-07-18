const form = document.querySelector('#todo-form');
const input = document.querySelector('#todo-input');
const list = document.querySelector('#todo-list');
const subjectSelect = document.querySelector('#subject-select');
const count = document.querySelector('#todo-count');
const emptyState = document.querySelector('#empty-state');
const clearCompletedButton = document.querySelector('#clear-completed');

const STORAGE_KEY = 'simple-todo-items';
const SUBJECTS = ['数学', '英語', '物理', '化学'];
const DEFAULT_SUBJECT = SUBJECTS[0];
let todos = loadTodos();

renderTodos();

form.addEventListener('submit', (event) => {
  event.preventDefault();

  const text = input.value.trim();
  if (!text) {
    return;
  }

  todos.push({
    id: createTodoId(),
    text,
    subject: normalizeSubject(subjectSelect.value),
    completed: false,
  });

  input.value = '';
  saveAndRender();
});

list.addEventListener('change', (event) => {
  if (!event.target.matches('input[type="checkbox"]')) {
    return;
  }

  const todo = todos.find((item) => item.id === event.target.dataset.id);
  if (todo) {
    todo.completed = event.target.checked;
    saveAndRender();
  }
});

list.addEventListener('click', (event) => {
  const deleteButton = event.target.closest('.delete-button');
  if (!deleteButton) {
    return;
  }

  todos = todos.filter((item) => item.id !== deleteButton.dataset.id);
  saveAndRender();
});

clearCompletedButton.addEventListener('click', () => {
  todos = todos.filter((item) => !item.completed);
  saveAndRender();
});

function renderTodos() {
  list.innerHTML = '';

  todos.forEach((todo) => {
    const item = document.createElement('li');
    item.className = `todo-item${todo.completed ? ' completed' : ''}`;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = todo.completed;
    checkbox.dataset.id = todo.id;
    checkbox.setAttribute('aria-label', `${todo.text}を完了にする`);

    const content = document.createElement('div');
    content.className = 'todo-content';

    const subjectName = normalizeSubject(todo.subject);

    const subject = document.createElement('span');
    subject.className = 'subject-badge';
    subject.dataset.subject = subjectName;
    subject.textContent = subjectName;

    const text = document.createElement('span');
    text.className = 'todo-text';
    text.textContent = todo.text;

    content.append(subject, text);

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'delete-button';
    deleteButton.dataset.id = todo.id;
    deleteButton.setAttribute('aria-label', `${todo.text}を削除する`);
    deleteButton.textContent = '×';

    item.append(checkbox, content, deleteButton);
    list.appendChild(item);
  });

  const remaining = todos.filter((todo) => !todo.completed).length;
  count.textContent = `${remaining} 件の未完了`;
  emptyState.classList.toggle('hidden', todos.length > 0);
  clearCompletedButton.disabled = todos.every((todo) => !todo.completed);
}

function saveAndRender() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  renderTodos();
}

function loadTodos() {
  const savedTodos = localStorage.getItem(STORAGE_KEY);
  if (!savedTodos) {
    return [];
  }

  try {
    const parsedTodos = JSON.parse(savedTodos);

    if (!Array.isArray(parsedTodos)) {
      return [];
    }

    return parsedTodos.map((todo) => ({
      ...todo,
      subject: normalizeSubject(todo.subject),
    }));
  } catch (error) {
    console.warn('保存済みタスクの読み込みに失敗しました。', error);
    return [];
  }
}

function normalizeSubject(subject) {
  return SUBJECTS.includes(subject) ? subject : DEFAULT_SUBJECT;
}

function createTodoId() {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `todo-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
