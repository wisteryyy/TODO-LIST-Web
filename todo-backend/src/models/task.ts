import crypto from 'crypto';           // Node.js: генерация UUID для ID задач
import { eq, and, desc, sql } from 'drizzle-orm';  // Drizzle: операторы для SQL запросов
import { db } from '../db.js';         // Подключение к БД через Drizzle
import { tasks } from '../schema.js';  // Схема таблицы задач

// TaskRow: тип строки из БД (done как number: 0/1)
type TaskRow = typeof tasks.$inferSelect;

// Task: тип для API (done как boolean: true/false)
// SQLite хранит boolean как INTEGER, конвертируем на границе БД↔API
export type Task = Omit<TaskRow, 'done'> & { done: boolean };

// Конвертация done: 0/1 → false/true перед отправкой клиенту
const mapTask = (row: TaskRow): Task => ({ ...row, done: Boolean(row.done) });

/**
 * Создаёт новую задачу для пользователя
 * @param userId - ID владельца (из JWT токена)
 * @param text - текст задачи
 */
export const createTask = (userId: string, text: string): Task => {
  // Генерация UUID v4 для уникального ID
  const id = crypto.randomUUID();
  // INSERT: вставляем задачу (done, createdAt, updatedAt — по DEFAULT)
  db.insert(tasks).values({ id, userId, text }).run();
  // SELECT: получаем созданную задачу (.run() не возвращает данные в SQLite)
  const task = db.select().from(tasks).where(eq(tasks.id, id)).get() as TaskRow;
  // Конвертируем done в boolean и возвращаем
  return mapTask(task);
};

/**
 * Возвращает все задачи текущего пользователя (отсортированные по дате)
 * @param userId - ID владельца (из JWT токена)
 */
export const getTasksByUser = (userId: string): Task[] =>
  db.select().from(tasks)
    .where(eq(tasks.userId, userId)) // Фильтр: только свои задачи
    .orderBy(desc(tasks.createdAt)) // Сортировка: новые сверху
    .all() // Получаем массив всех записей
    .map(mapTask); // Конвертируем done в boolean

/**
 * Обновляет задачу (PATCH: только переданные поля)
 * @param id - ID задачи
 * @param userId - ID владельца (проверка прав доступа)
 * @param body - поля для обновления (text и/или done)
 */
export const updateTask = (
  id: string,
  userId: string,
  body: { text?: string; done?: boolean }
): Task | null => {
  // Проверка: задача существует и принадлежит пользователю
  const task = db.select().from(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
    .get() as TaskRow | undefined;

  if (!task) return null;  // Задача не найдена или чужая

  // Формируем объект обновлений
  const updates: Partial<TaskRow> = { 
    updatedAt: sql`CURRENT_TIMESTAMP` as unknown as string  // Обновляем timestamp
  };
  
  if (body.text !== undefined) updates.text = body.text;   // Если передан text
  if (body.done !== undefined) updates.done = body.done ? 1 : 0;  // boolean → 0/1

  // UPDATE: применяем изменения
  db.update(tasks).set(updates).where(eq(tasks.id, id)).run();

  // Получаем и возвращаем обновлённую задачу
  const updated = db.select().from(tasks).where(eq(tasks.id, id)).get() as TaskRow;
  return mapTask(updated);
};

/**
 * Удаляет задачу (с проверкой прав доступа)
 * @param id - ID задачи
 * @param userId - ID владельца (проверка прав доступа)
 */
export const deleteTask = (id: string, userId: string): Task | null => {
  // Проверка: задача существует и принадлежит пользователю
  const task = db.select().from(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
    .get() as TaskRow | undefined;

  if (!task) return null;  // Задача не найдена или чужая

  // DELETE: удаляем задачу
  db.delete(tasks).where(eq(tasks.id, id)).run();
  
  // Возвращаем удалённую задачу (для подтверждения клиенту)
  return mapTask(task);
};