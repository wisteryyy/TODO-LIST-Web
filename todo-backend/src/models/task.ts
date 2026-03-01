import crypto from 'crypto';
import { dbRun, dbGet, dbAll } from '../db.js';
import type { Task } from '../types.js';

// В SQLite булево значение хранится как число (0 или 1).
// Эта функция конвертирует поле done в настоящий boolean (true/false).
// Применяется к каждой задаче перед отправкой клиенту.
const mapTask = (row: Task): Task => ({ ...row, done: Boolean(row.done) });

// CREATE — создание новой задачи
export const createTask = async (userId: string, text: string): Promise<Task> => {
  const id = crypto.randomUUID();

  await dbRun(
    'INSERT INTO tasks (id, userId, text) VALUES (?, ?, ?)',
    [id, userId, text]
  );

  // Получаем созданную задачу и возвращаем с правильным типом done
  const task = await dbGet<Task>('SELECT * FROM tasks WHERE id = ?', [id]);
  return mapTask(task!);
};

// READ — получение всех задач конкретного пользователя
export const getTasksByUser = async (userId: string): Promise<Task[]> => {
  const tasks = await dbAll<Task>(
    'SELECT * FROM tasks WHERE userId = ? ORDER BY createdAt DESC',
    [userId]
  );
  return tasks.map(mapTask); // конвертируем done у каждой задачи
};

// UPDATE — изменение текста или статуса задачи
export const updateTask = async (
  id: string,
  userId: string,
  body: { text?: string; done?: boolean } // можно передать одно или оба поля
): Promise<Task | null> => {

  // Проверяем, что задача существует И принадлежит этому пользователю
  const task = await dbGet<Task>(
    'SELECT * FROM tasks WHERE id = ? AND userId = ?',
    [id, userId]
  );
  if (!task) return null;

  // Собираем только те поля, которые нужно обновить (динамический UPDATE)
  const fields: string[] = [];
  const params: unknown[] = [];

  if (body.text !== undefined) {
    fields.push('text = ?');
    params.push(body.text);
  }
  if (body.done !== undefined) {
    fields.push('done = ?');
    params.push(body.done ? 1 : 0); // конвертируем boolean → 0/1 для SQLite
  }

  // Если ничего не передали — возвращаем задачу без изменений
  if (fields.length === 0) return mapTask(task);

  // Всегда обновляем временную метку последнего изменения
  fields.push('updatedAt = CURRENT_TIMESTAMP');
  params.push(id, userId);

  await dbRun(
    `UPDATE tasks SET ${fields.join(', ')} WHERE id = ? AND userId = ?`,
    params
  );

  // Возвращаем обновлённую версию задачи из БД
  const updated = await dbGet<Task>('SELECT * FROM tasks WHERE id = ?', [id]);
  return mapTask(updated!);
};

// DELETE — удаление задачи
export const deleteTask = async (id: string, userId: string): Promise<Task | null> => {
  const task = await dbGet<Task>(
    'SELECT * FROM tasks WHERE id = ? AND userId = ?',
    [id, userId]
  );
  if (!task) return null;

  await dbRun('DELETE FROM tasks WHERE id = ?', [id]);

  return mapTask(task);
};