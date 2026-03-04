import { Router, type Response } from 'express'; // Express: создание роутера
import { authMiddleware } from '../middleware/auth.js'; // Middleware: проверка JWT токена
import { createTask, getTasksByUser, updateTask, deleteTask } from '../models/task.js'; // CRUD операции
import type { AuthRequest } from '../types.js'; // Тип: запрос с userId из токена

// Создаем роутер для группы маршрутов /tasks
const router = Router();

// Применяем middleware ко ВСЕМ маршрутам этого роутера
// Без валидного JWT токена доступ к задачам запрещен
router.use(authMiddleware);

// GET /tasks - получить все задачи пользователя
router.get('/', (req: AuthRequest, res: Response) => {
  // req.userId! добавлен middleware (восклицание = точно есть после auth)
  const tasks = getTasksByUser(req.userId!);
  res.json(tasks); // Автоматически ставит Content-Type: application/json
});

// POST /tasks - создать новую задачу
router.post('/', (req: AuthRequest, res: Response) =>{
  const { text } = req.body;
  if (!text) {
    res.status(400).json({ error: 'Text is required!'});
    return; // Чтобы не выполнять код дальше
  }

  // Создаем задачу (userId из токена, text от клиента)
  const task = createTask(req.userId!, text);
  res.status(201).json(task);

});

// PUT /tasks/:id - обновить задачу
router.put('/:id', (req: AuthRequest, res: Response) => {
  // req.params.id - параметр из URL (тип string | undefined)
  const task = updateTask(req.params.id as string, req.userId!, req.body);
  if (!task) {
    res.status(404).json({error: 'Task not found!'});
    return;
  }
  res.json(task);
});

// DELETE /tasks/:id - удалить задачу
router.delete('/:id', (req: AuthRequest, res: Response) => {
  const task = deleteTask(req.params.id as string, req.userId!);

  if (!task) {
    res.status(404).json({ error: 'Task not found!'});
    return;
  }
  res.sendStatus(204);
});

export default router;