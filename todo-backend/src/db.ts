import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.js';
import path from 'path';


/** Определяем путь к файлу базы данных
 * Если задана переменная окружения DB_PATH → используем её
 * Иначе → используем файл todo.db в корне проекта
 * - Переменная окружения: для production (можно указать /var/data/todo.db)
 * - Файл по умолчанию: для локальной разработки (todo.db в проекте)
 * - path.resolve(): превращает относительный путь в абсолютный
 */
const dbPath = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.resolve('todo.db');

const sqlite = new Database(dbPath);

/**
 * PRAGMA: команды настройки SQLite на низком уровне для изменения поведения движка
 * Выполняются ДО любых запросов к БД; и влияют на производительность, целостность, безопасность
 */
// WAL-режим ускоряет запись, foreign_keys включает каскадное удаление
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

/** Создаём типизированный объект db для работы с БД через Drizzle
 * 1. drizzle() обёртывает sqlite подключение в ORM интерфейс
 * 2. Подключает схему (schema) для типизации запросов
 * 3. Возвращает объект с методами: select, insert, update, delete
  * Зачем DRIZZLE после RAW SQL:
 * - initDB() использует raw SQL для создания таблиц (миграции)
 * - db объект используется для CRUD операций (запросы)
 * - Drizzle даёт типобезопасность, raw SQL даёт контроль
 */
export const db = drizzle(sqlite, { schema });

// Создаём таблицы при первом запуске (если не существуют)
export const initDB = () => {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id           TEXT PRIMARY KEY,
      username     TEXT NOT NULL UNIQUE,
      passwordHash TEXT NOT NULL,
      role         TEXT DEFAULT 'user' NOT NULL,
      createdAt    TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id        TEXT PRIMARY KEY,
      userId    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      text      TEXT NOT NULL,
      done      INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id         TEXT PRIMARY KEY,
      userId     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      tokenHash  TEXT NOT NULL,
      expiresAt  TEXT NOT NULL,
      createdAt  TEXT DEFAULT CURRENT_TIMESTAMP,
      userAgent  TEXT,
      ipAddress  TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_userId
      ON refresh_tokens(userId);

    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expiresAt
      ON refresh_tokens(expiresAt);
  `);
};

export const closeDB = () => sqlite.close();