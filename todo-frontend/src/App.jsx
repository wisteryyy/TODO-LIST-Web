import { useState, useEffect, useCallback } from 'react';
import './App.css';

// ─── API-утилиты ──────────────────────────────────────────
const API = {
  // Возвращает заголовок с токеном для защищённых запросов
  headers(token) {
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  },

  async register(username, password) {
    const res = await fetch('/auth/register', {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ username, password }),
    });
    return res.json();
  },

  async login(username, password) {
    const res = await fetch('/auth/login', {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ username, password }),
    });
    return res.json();
  },

  async getTasks(token) {
    const res = await fetch('/tasks', { headers: this.headers(token) });
    return res.json();
  },

  async createTask(token, text) {
    const res = await fetch('/tasks', {
      method: 'POST',
      headers: this.headers(token),
      body: JSON.stringify({ text }),
    });
    return res.json();
  },

  async updateTask(token, id, data) {
    const res = await fetch(`/tasks/${id}`, {
      method: 'PUT',
      headers: this.headers(token),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async deleteTask(token, id) {
    await fetch(`/tasks/${id}`, {
      method: 'DELETE',
      headers: this.headers(token),
    });
  },
};

// ─── Компонент: форма входа/регистрации ───────────────────
function AuthForm({ onAuth }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Заполните все поля');
      return;
    }

    setLoading(true);
    setError('');

    const data = mode === 'login'
      ? await API.login(username, password)
      : await API.register(username, password);

    setLoading(false);

    if (data.error) {
      setError(data.error);
    } else {
      // Сохраняем токен в localStorage, чтобы не разлогиниваться при перезагрузке
      localStorage.setItem('token', data.token);
      onAuth(data.token);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        {/* <div className="auth-logo">
          <span className="logo-dot" />
          TODO
        </div> */}

        <h1 className="auth-title">
          {mode === 'login' ? 'Добро пожаловать' : 'Создать аккаунт'}
        </h1>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="field">
            <label>Логин</label>
            <input
              type="text"
              placeholder="Введите ваш логин"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
            />
          </div>

          <div className="field">
            <label>Пароль</label>
            <input
              type="password"
              placeholder="Введите ваш пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="error-msg">{error}</p>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Загрузка...' : mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
          </button>
        </form>

        <p className="auth-switch">
          {mode === 'login' ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}
          <button
            className="btn-link"
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
          >
            {mode === 'login' ? 'Зарегистрироваться' : 'Войти'}
          </button>
        </p>
      </div>
    </div>
  );
}

// ─── Компонент: одна задача ────────────────────────────────
function TaskItem({ task, token, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(task.text);

  const toggleDone = () => onUpdate(task.id, { done: !task.done });

  const saveEdit = async () => {
    if (editText.trim() && editText !== task.text) {
      await onUpdate(task.id, { text: editText.trim() });
    }
    setEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') saveEdit();
    if (e.key === 'Escape') { setEditText(task.text); setEditing(false); }
  };

  return (
    <div className={`task-item ${task.done ? 'task-done' : ''}`}>
      {/* Чекбокс */}
      <button className="task-check" onClick={toggleDone} aria-label="Отметить">
        {task.done && (
          <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
            <path d="M1 4L4 7.5L10 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {/* Текст задачи или поле редактирования */}
      {editing ? (
        <input
          className="task-edit-input"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={saveEdit}
          onKeyDown={handleKeyDown}
          autoFocus
        />
      ) : (
        <span className="task-text" onDoubleClick={() => setEditing(true)}>
          {task.text}
        </span>
      )}

      {/* Кнопка удаления */}
      <button className="task-delete" onClick={() => onDelete(task.id)} aria-label="Удалить">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

// ─── Компонент: главная страница с задачами ───────────────
function TodoApp({ token, onLogout }) {
  const [tasks, setTasks] = useState([]);
  const [newText, setNewText] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'active' | 'done'
  const [loading, setLoading] = useState(true);

  // Загружаем задачи при монтировании компонента
  const loadTasks = useCallback(async () => {
    const data = await API.getTasks(token);
    if (Array.isArray(data)) setTasks(data);
    setLoading(false);
  }, [token]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const addTask = async (e) => {
    e.preventDefault();
    if (!newText.trim()) return;
    const task = await API.createTask(token, newText.trim());
    if (!task.error) {
      setTasks((prev) => [task, ...prev]);
      setNewText('');
    }
  };

  const updateTask = async (id, data) => {
    const updated = await API.updateTask(token, id, data);
    if (!updated.error) {
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
    }
  };

  const deleteTask = async (id) => {
    await API.deleteTask(token, id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  // Фильтрация задач по выбранной вкладке
  const filtered = tasks.filter((t) => {
    if (filter === 'active') return !t.done;
    if (filter === 'done') return t.done;
    return true;
  });

  const doneCount = tasks.filter((t) => t.done).length;
  const activeCount = tasks.length - doneCount;

  return (
    <div className="app-wrapper">
      <div className="app-card">

        {/* Шапка */}
        <header className="app-header">
          <div className="header-left">
            {/* <span className="logo-dot" />
            <span className="app-title">TODO</span> */}
          </div>
          <button className="btn-logout" onClick={onLogout}>Выйти</button>
        </header>

        {/* Счётчики */}
        <div className="stats">
          <div className="stat">
            <span className="stat-num">{tasks.length}</span>
            <span className="stat-label">всего</span>
          </div>
          <div className="stat">
            <span className="stat-num">{activeCount}</span>
            <span className="stat-label">активных</span>
          </div>
          <div className="stat">
            <span className="stat-num accent">{doneCount}</span>
            <span className="stat-label">готово</span>
          </div>
        </div>

        {/* Форма добавления задачи */}
        <form onSubmit={addTask} className="add-form">
          <input
            className="add-input"
            placeholder="Добавить задачу..."
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
          />
          <button type="submit" className="btn-add" disabled={!newText.trim()}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2V14M2 8H14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </button>
        </form>

        {/* Фильтры */}
        <div className="filters">
          {['all', 'active', 'done'].map((f) => (
            <button
              key={f}
              className={`filter-btn ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'Все' : f === 'active' ? 'Активные' : 'Готовые'}
            </button>
          ))}
        </div>

        {/* Список задач */}
        <div className="task-list">
          {loading && <p className="empty-msg">Загрузка...</p>}

          {!loading && filtered.length === 0 && (
            <p className="empty-msg">
              {filter === 'all' ? 'Задач пока нет' : 'Ничего не найдено'}
            </p>
          )}

          {filtered.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              token={token}
              onUpdate={updateTask}
              onDelete={deleteTask}
            />
          ))}
        </div>

        {/* Подсказка */}
        {tasks.length > 0 && (
          <p className="hint">Двойной клик по задаче — чтобы редактировать</p>
        )}
      </div>
    </div>
  );
}

// ─── Корневой компонент ────────────────────────────────────
export default function App() {
  // Берём токен из localStorage (если пользователь уже входил)
  const [token, setToken] = useState(() => localStorage.getItem('token'));

  const handleAuth = (t) => setToken(t);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
  };

  // Если токена нет — показываем форму входа, иначе — список задач
  return token
    ? <TodoApp token={token} onLogout={handleLogout} />
    : <AuthForm onAuth={handleAuth} />;
}