import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { dbRun, dbGet } from '../db.js';
import type { User } from '../types.js';

// Регистрирует нового пользователя в базе данных
export const createUser = async (username: string, password: string): Promise<User> => {
  const id = crypto.randomUUID(); // генерируем уникальный ID

  // Хэшируем пароль перед сохранением — bcrypt необратимо шифрует строку.
  // Число 10 — это "соль": чем выше, тем надёжнее, но медленнее.
  // Это значит, что даже зная хэш, нельзя восстановить исходный пароль.
  const passwordHash = await bcrypt.hash(password, 10);

  // Сохраняем пользователя в БД
  await dbRun(
    'INSERT INTO users (id, username, passwordHash) VALUES (?, ?, ?)',
    [id, username, passwordHash]
  );

  // Возвращаем только что созданного пользователя из БД
  return dbGet<User>('SELECT * FROM users WHERE id = ?', [id]) as Promise<User>;
};

// Ищет пользователя по логину (используется при входе и проверке уникальности)
export const findUserByUsername = (username: string): Promise<User | undefined> =>
  dbGet<User>('SELECT * FROM users WHERE username = ?', [username]);

// Сравнивает введённый пароль с хэшем из базы данных.
// Возвращает true если совпадают, false если нет.
export const verifyPassword = (password: string, hash: string): Promise<boolean> =>
  bcrypt.compare(password, hash);