// sqliteTable — функция создания таблицы
// text — тип данных для строк (VARCHAR/TEXT в SQL)
// integer — тип данных для чисел (INTEGER в SQL)
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
// Использование SQL-функций которые нет в Drizzle API
// Почему не просто строка: sql`...` экранирует значения и защищает от SQL-инъекций
// При использовании с .default() передаёт выражение в миграцию
import { sql } from "drizzle-orm";

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin'
}

// Таблица пользователей
export const users = sqliteTable('users', {
  id: text('id').primaryKey(), // UUID строкой | Drizzle: первичный ключ (автоматически UNIQUE + NOT NULL)
  username: text('username').notNull().unique(), // Уникальный логин | Drizzle: NOT NULL + UNIQUE индекс
  passwordHash: text('passwordHash').notNull(), // Хэш пароля (не сам пароль!) | Drizzle: NOT NULL
  role: text('role', { enum: ['user', 'admin', 'super_admin'] })
    .notNull()
    .default('user'),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`), // SQLite: дефолт через sql-тег Drizzle
})

// Таблица задач
export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(), // Drizzle: первичный ключ
  userId: text('userId').notNull()
    .references(() => users.id, {onDelete: 'cascade'}), // Drizzle: внешний ключ с CASCADE при удалении (автоматическая очистка связанных данных)
  text: text('text').notNull(), // Drizzle: NOT NULL
  done: integer('done').default(0), // SQLite: INTEGER для boolean (0/1) | Drizzle: дефолт 0
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`), // SQLite: авто-дата через sql-тег
  updatedAt: text('updatedAt').default(sql`CURRENT_TIMESTAMP`), // SQLite: дефолт, но авто-обновление требует триггера
})

// Таблица refresh-токенов
export const refreshTokens = sqliteTable('refresh_tokens', {
  id: text('id').primaryKey(), // Drizzle: первичный ключ
  userId: text('userId').notNull()
    .references(() => users.id, {onDelete: 'cascade'}), // Drizzle: FK с CASCADE
  tokenHash: text('tokenHash').notNull(), // храним хэш, а не сам токен | Drizzle: NOT NULL
  expiresAt: text('expiresAt').notNull(), // ISO-строка даты истечения | Drizzle: text для дат (SQLite не имеет DATE)
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`), // SQLite: дефолт через sql-тег Drizzle
  userAgent: text('userAgent'), // браузер/устройство пользователя | Drizzle: опциональное поле
  ipAddress: text('ipAddress'), // IP для безопасности | Drizzle: опциональное поле
})



/**
 * ДИАГРАММА СВЯЗЕЙ ТАБЛИЦ:
 * 
 * ┌─────────────┐
 * │   users     │
 * │─────────────│
 * │ id (PK)     │◄────────────────────────────┐
 * │ username    │                             │
 * │ passwordHash│                             │
 * │ createdAt   │                             │
 * └──────┬──────┘                             │
 *        │                                    │
 *        │ 1:N (CASCADE)                      │ 1:N (CASCADE)
 *        │                                    │
 *        ▼                                    ▼
 * ┌─────────────┐                    ┌─────────────────┐
 * │   tasks     │                    │  refresh_tokens │
 * │─────────────│                    │─────────────────│
 * │ id (PK)     │                    │ id (PK)         │
 * │ userId (FK) │                    │ userId (FK)     │
 * │ text        │                    │ tokenHash       │
 * │ done        │                    │ expiresAt       │
 * │ createdAt   │                    │ createdAt       │
 * │ updatedAt   │                    │ userAgent       │
 * └─────────────┘                    │ ipAddress       │
 *                                    └─────────────────┘
 * 
 * ПОТОК ДАННЫХ ПРИ РЕГИСТРАЦИИ:
 * 1. POST /register { username, password }
 * 2. createUser() → INSERT INTO users (id, username, passwordHash)
 * 3. База данных проверяет UNIQUE(username)
 * 4. Если ок → возвращаем { id, username }
 * 5. Если ошибка UNIQUE → 409 Conflict (пользователь существует)
 * 
 * 
 * ПОТОК ДАННЫХ ПРИ ВХОДЕ:
 * 1. POST /login { username, password }
 * 2. findUserByUsername(username) → SELECT * FROM users WHERE username = ?
 * 3. verifyPassword(password, user.passwordHash)
 * 4. Если ок → генерируем JWT + refresh токен
 * 5. INSERT INTO refresh_tokens (userId, tokenHash, expiresAt, userAgent, ipAddress)
 * 6. Возвращаем { accessToken, refreshToken }
 * 
 * 
 * ПОТОК ДАННЫХ ПРИ ОБНОВЛЕНИИ ТОКЕНА:
 * 1. POST /refresh { refreshToken }
 * 2. Хэшируем refreshToken → ищем в refreshTokens по tokenHash
 * 3. Проверяем expiresAt > NOW
 * 4. Если ок → генерируем новый accessToken + новый refreshToken
 * 5. Удаляем старый refresh токен (token rotation)
 * 6. Вставляем новый refresh токен
 * 7. Возвращаем { accessToken, refreshToken }
 * 
 * 
 * ПОТОК ДАННЫХ ПРИ ВЫХОДЕ (LOGOUT):
 * 1. POST /logout { refreshToken }
 * 2. Находим токен по tokenHash
 * 3. DELETE FROM refresh_tokens WHERE tokenHash = ?
 * 4. Возвращаем 200 OK
 * 
 * 
 * ПОТОК ДАННЫХ ПРИ УДАЛЕНИИ ПОЛЬЗОВАТЕЛЯ:
 * 1. DELETE FROM users WHERE id = ?
 * 2. SQLite автоматически (CASCADE):
 *    - DELETE FROM tasks WHERE userId = ?
 *    - DELETE FROM refresh_tokens WHERE userId = ?
 * 3. Возвращаем 200 OK
 */