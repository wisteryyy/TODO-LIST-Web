import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { createTask, getTasksByUser, updateTask, deleteTask } from '../models/task.js';
import type { AuthRequest } from '../types.js';

const router = Router();

// Middleware проверит токен и запишет userId в req перед каждым запросом.
router.use(authMiddleware);

// GET /tasks — получить все задачи текущего пользователя
router.get('/', async (req: AuthRequest, res) => {
  const tasks = await getTasksByUser(req.userId!);
  res.json(tasks);
});

// POST /tasks — создать новую задачу
router.post('/', async (req: AuthRequest, res) => {
  const { text } = req.body;

  if (!text) {
    res.status(400).json({ error: 'Text is required' });
    return;
  }

  const task = await createTask(req.userId!, text);
  res.status(201).json(task);
});

// PUT /tasks/:id — обновить задачу по ID
router.put('/:id', async (req: AuthRequest, res) => {
  // as string — потому что TypeScript не знает заранее, что :id это одно значение, а не массив
  const task = await updateTask(req.params.id as string, req.userId!, req.body);

  if (!task) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }

  res.json(task);
});

// DELETE /tasks/:id — удалить задачу по ID
router.delete('/:id', async (req: AuthRequest, res) => {
  const task = await deleteTask(req.params.id as string, req.userId!);

  if (!task) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }

  res.sendStatus(204);
});

export default router;