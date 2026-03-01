import 'dotenv/config'; // загружает переменные из .env в process.env
import express from 'express';
import cors from 'cors';
import { connectDB, closeDB } from './db.js';
import authRouter from './routes/auth.js';
import tasksRouter from './routes/tasks.js';

const app = express();

// cors() разрешает запросы с других доменов (например, с фронтенда на другом порту)
app.use(cors());
app.use(express.json());
// Подключаем маршруты:
// /auth/register, /auth/login   — публичные (без токена)
// /tasks, /tasks/:id            — защищённые (требуют токен)
app.use('/auth', authRouter); 
app.use('/tasks', tasksRouter);

const PORT = process.env.PORT ?? 3000;
connectDB().then(() => {
  console.log('База данных подключена!');
  app.listen(PORT, () => console.log(`Сервер запустился на http://localhost:${PORT}`));
});

// Корректное завершение работы при остановке процесса (Ctrl+C или системный сигнал).
// Закрываем соединение с БД перед выходом, чтобы не повредить файл базы данных.
const shutdown = async (signal: string) => {
  console.log(`\n${signal} получен.`);
  await closeDB();
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));   // Ctrl+C в терминале
process.on('SIGTERM', () => shutdown('SIGTERM')); // сигнал от системы (например, Docker)