import { useState, useEffect, useCallback } from 'react';
import './App.css';

// ─── Типы ─────────────────────────────────────────────────
type Task = {
  id: string;
  userId: string;
  text: string;
  done: boolean;
  createdAt: string;
  updatedAt: string;
};

type ApiResponse = {
  token?: string;
  error?: string;
};

// ─── API-утилиты ──────────────────────────────────────────
const API = {
  headers(token?: string): HeadersInit {
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  },

  async register(username: string, password: string): Promise<ApiResponse> {
    const res = await fetch('/auth/register', {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ username, password }),
    });
    return res.json();
  },

  async login(username: string, password: string): Promise<ApiResponse> {
    const res = await fetch('/auth/login', {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ username, password }),
    });
    return res.json();
  },

  async getTasks(token: string): Promise<Task[]> {
    const res = await fetch('/tasks', { headers: this.headers(token) });
    return res.json();
  },

  async createTask(token: string, text: string): Promise<Task & { error?: string }> {
    const res = await fetch('/tasks', {
      method: 'POST',
      headers: this.headers(token),
      body: JSON.stringify({ text }),
    });
    return res.json();
  },

  async updateTask(token: string, id: string, data: Partial<Task>): Promise<Task & { error?: string }> {
    const res = await fetch(`/tasks/${id}`, {
      method: 'PUT',
      headers: this.headers(token),
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async deleteTask(token: string, id: string): Promise<void> {
    await fetch(`/tasks/${id}`, {
      method: 'DELETE',
      headers: this.headers(token),
    });
  },
};

// ─── Компонент: форма входа/регистрации ───────────────────
function AuthForm({ onAuth }: { onAuth: (token: string) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
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
    } else if (data.token) {
      localStorage.setItem('token', data.token);
      onAuth(data.token);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
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
type TaskItemProps = {
  task: Task;
  token: string;
  onUpdate: (id: string, data: Partial<Task>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

function TaskItem({ task, onUpdate, onDelete }: TaskItemProps) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(task.text);

  const toggleDone = () => onUpdate(task.id, { done: !task.done });

  const saveEdit = async () => {
    if (editText.trim() && editText !== task.text) {
      await onUpdate(task.id, { text: editText.trim() });
    }
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') saveEdit();
    if (e.key === 'Escape') { setEditText(task.text); setEditing(false); }
  };

  return (
    <div className={`task-item ${task.done ? 'task-done' : ''}`}>
      <button className="task-check" onClick={toggleDone} aria-label="Отметить">
        {task.done && (
          <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
            <path d="M1 4L4 7.5L10 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

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

      <button className="task-delete" onClick={() => onDelete(task.id)} aria-label="Удалить">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

// ─── Компонент: главная страница с задачами ───────────────
function TodoApp({ token, onLogout }: { token: string; onLogout: () => void }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newText, setNewText] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'done'>('all');
  const [loading, setLoading] = useState(true);

  const loadTasks = useCallback(async () => {
    const data = await API.getTasks(token);
    if (Array.isArray(data)) setTasks(data);
    setLoading(false);
  }, [token]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;
    const task = await API.createTask(token, newText.trim());
    if (!task.error) {
      setTasks((prev) => [task, ...prev]);
      setNewText('');
    }
  };

  const updateTask = async (id: string, data: Partial<Task>) => {
    const updated = await API.updateTask(token, id, data);
    if (!updated.error) {
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
    }
  };

  const deleteTask = async (id: string) => {
    await API.deleteTask(token, id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

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
        <header className="app-header">
          <div className="header-left" />
          <button className="btn-logout" onClick={onLogout}>Выйти</button>
        </header>

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

        <div className="filters">
          {(['all', 'active', 'done'] as const).map((f) => (
            <button
              key={f}
              className={`filter-btn ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'Все' : f === 'active' ? 'Активные' : 'Готовые'}
            </button>
          ))}
        </div>

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

        {tasks.length > 0 && (
          <p className="hint">Двойной клик по задаче — чтобы редактировать</p>
        )}
      </div>
    </div>
  );
}

// ─── Корневой компонент ────────────────────────────────────
export default function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
  };

  return token
    ? <TodoApp token={token} onLogout={handleLogout} />
    : <AuthForm onAuth={setToken} />;
}