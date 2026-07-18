const form = document.querySelector('#todo-form');
const input = document.querySelector('#todo-input');
const subjectSelect = document.querySelector('#subject-select');
const list = document.querySelector('#todo-list');
const count = document.querySelector('#todo-count');
const emptyState = document.querySelector('#empty-state');
const clearCompletedButton = document.querySelector('#clear-completed');

const STORAGE_KEY = 'simple-todo-items';
const DEFAULT_SUBJECT = '未設定';
let todos = loadTodos();

renderTodos();

form.addEventListener('submit', (event) => {
  event.preventDefault();

  const text = input.value.trim();
  if (!text) {
    return;
  }

  todos.push({
    id: crypto.randomUUID(),
    text,
    subject: subjectSelect.value,
    completed: false,
  });

  input.value = '';
  subjectSelect.value = '数学';
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

    const text = document.createElement('span');
    text.className = 'todo-text';
    text.textContent = todo.text;

    const subject = document.createElement('span');
    subject.className = 'todo-subject';
    subject.textContent = todo.subject || DEFAULT_SUBJECT;

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'delete-button';
    deleteButton.dataset.id = todo.id;
    deleteButton.setAttribute('aria-label', `${todo.text}を削除する`);
    deleteButton.textContent = '×';

    item.append(checkbox, text, subject, deleteButton);
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

  return JSON.parse(savedTodos).map((todo) => ({
    ...todo,
    subject: todo.subject || DEFAULT_SUBJECT,
  }));
}
