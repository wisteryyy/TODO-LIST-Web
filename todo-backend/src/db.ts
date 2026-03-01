import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

// В ESM-модулях нет встроенных __dirname и __filename, поэтому получаем путь к текущему файлу вручную
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Путь к файлу базы данных берём из переменной окружения DB_PATH, или используем todo.db в корне проекта
const dbPath = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(__dirname, '..', 'todo.db');

// Открываем соединение с базой данных. Если файл todo.db не существует — SQLite создаст его автоматически
export const db = new sqlite3.Database(dbPath);


// Создаём таблицы при первом запуске (если они ещё не существуют)
export const connectDB = (): Promise<void> =>
  new Promise((resolve, reject) => {
    db.exec(
      `
      -- Таблица пользователей
      CREATE TABLE IF NOT EXISTS users (
        id           TEXT PRIMARY KEY,               -- уникальный UUID пользователя
        username     TEXT NOT NULL UNIQUE,           -- логин (должен быть уникальным)
        passwordHash TEXT NOT NULL,                  -- хэш пароля (не сам пароль!)
        createdAt    TEXT DEFAULT CURRENT_TIMESTAMP  -- дата регистрации
      );

      -- Таблица задач
      CREATE TABLE IF NOT EXISTS tasks (
        id        TEXT PRIMARY KEY,                                    -- уникальный UUID задачи
        userId    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- владелец задачи
        text      TEXT NOT NULL,                                        -- текст задачи
        done      INTEGER DEFAULT 0,                                    -- 0 = не выполнена, 1 = выполнена
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,                       -- дата создания
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP                        -- дата последнего изменения
      );
      `,
      // Если при создании таблиц произошла ошибка — reject, иначе resolve
      (err) => (err ? reject(err) : resolve())
    );
  });

// Корректно закрываем соединение с БД (вызывается при завершении сервера)
export const closeDB = (): Promise<void> =>
  new Promise((resolve, reject) => {
    db.close((err) => (err ? reject(err) : resolve()));
  });


// sqlite3 работает через колбэки, а мы хотим использовать async/await.
// Эти три функции превращают колбэки в промисы.

// Выполняет запрос без возврата данных (INSERT, UPDATE, DELETE)
export const dbRun = (sql: string, params: unknown[] = []): Promise<void> =>
  new Promise((resolve, reject) => {
    db.run(sql, params, (err) => (err ? reject(err) : resolve()));
  });

// Возвращает одну строку из таблицы (или undefined, если не найдено)
export const dbGet = <T>(sql: string, params: unknown[] = []): Promise<T | undefined> =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row as T)));
  });

// Возвращает массив строк из таблицы
export const dbAll = <T>(sql: string, params: unknown[] = []): Promise<T[]> =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows as T[])));
  });