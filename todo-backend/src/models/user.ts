import crypto from 'crypto'; // Генерация UUID
import bcrypt from 'bcryptjs'; // Хэширование и проверка паролей
import { eq } from 'drizzle-orm'; // Оператор WHERE для запросов
import { db } from '../db.js'; // Подключение к SQLite через Drizzle
import { users } from '../schema.js'; // Схема таблицы пользователя

/* $inferSelect — магический тип Drizzle ORM
 * Зачем: автоматически создаёт TypeScript-тип на основе схемы таблицы
 * Преимущество: при изменении схемы типы обновляются автоматически (не нужно дублировать)
 */
export type User = typeof users.$inferSelect;

/**
 * Создает нового пользователя
 * @param username - логин пользователя
 * @param password - пароль в открытом виде (будет захеширован)
 */
export const createUser = async (username: string, password: string): Promise<User> => {
  // crypto: генерация UUID v4 для уникального ID
  const id = crypto.randomUUID();
  // bcrypt: хеширование пароля с раундами (10 = баланс безопасности/скорости)
  const passwordHash = await bcrypt.hash(password, 10);
  // Drizzle: INSERN запрос, .run() выполняет без возврата данных
  db.insert(users).values({id, username,passwordHash}).run();
  // Drizzle: SELECT запрос, .get() возвращает одну запись | eq(): условие WHERE id = ?
  return db.select().from(users).where(eq(users.id, id)).get() as User;
}

/**
 * Ищет пользователя по логину
 * @param username - логин для поиска
 * @returns обьект пользователя или undefined если не найден
 */
// Drizzle ORM: .select() — выборка полей, .from() — таблица, .where() — условие, .get() — одна запись
// eq(users.username, username) генерирует SQL: WHERE username = ?
export const findUserByUsername = (username: string): User | undefined =>
  db.select().from(users).where(eq(users.username, username)).get() as User | undefined;

/**
 * Сравнивает введенный пароль с хешем из БД
 * @param password - пароль в открытом виде
 * @param hash - хэе пароля из базы данных
 * @returns true если пароль совпадает, false иначе
 */
// bcrypt: безопасное сравнение пароля с хэшем
export const verifyPassword = (password: string, hash: string): Promise<boolean> =>
  bcrypt.compare(password, hash);



/**
 * КАК ЭТО РАБОТАЕТ ВМЕСТЕ (пример flow регистрации и входа):
 * 
 * РЕГИСТРАЦИЯ:
 * 1. Пользователь отправляет { username, password } на сервер
 * 2. Сервер вызывает createUser(username, password)
 * 3. createUser хэширует пароль и сохраняет в БД
 * 4. Сервер возвращает { id, username } (без passwordHash!)
 * 
 * ВХОД (LOGIN):
 * 1. Пользователь отправляет { username, password }
 * 2. Сервер вызывает findUserByUsername(username)
 * 3. Если пользователь найден → verifyPassword(password, user.passwordHash)
 * 4. Если пароль верен → генерируем JWT / сессию, возвращаем токен
 * 5. Если не верен → ошибка 401 Unauthorized
 * 
 * ПОЧЕМУ TAKAJA СТРУКТУРА:
 * - Разделение логики: каждая функция делает одну вещь (Single Responsibility)
 * - Типобезопасность: TypeScript + Drizzle $inferSelect дают автодополнение и проверку типов
 * - Безопасность: пароли никогда не возвращаются клиенту, хранятся только хэши
 * - Тестируемость: функции можно тестировать изолированно (unit-тесты)
 */