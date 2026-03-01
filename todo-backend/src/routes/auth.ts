import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { createUser, findUserByUsername, verifyPassword } from '../models/user.js';

const router = Router();

// POST /auth/register — регистрация нового пользователя
router.post('/register', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: 'Username and password are required' });
    return;
  }

  const existing = await findUserByUsername(username);
  if (existing) {
    res.status(409).json({ error: 'Username already taken' });
    return;
  }

  try {
    const user = await createUser(username, password);

    // Генерируем JWT-токен, который клиент будет хранить и отправлять в каждом запросе.
    // В payload помещаем userId, чтобы потом быстро его достать из токена.
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET!,
      { expiresIn: (process.env.JWT_EXPIRES_IN ?? '7d') as jwt.SignOptions['expiresIn'] }
    );

    res.status(201).json({ token });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// POST /auth/login — вход для существующего пользователя
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  const user = await findUserByUsername(username);

  // Проверяем, что пользователь найден И пароль совпадает с хэшем.
  // Обе проверки объединены намеренно — так нельзя угадать, что именно неверно
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  // Выдаём новый токен
  const token = jwt.sign(
    { userId: user.id },
    process.env.JWT_SECRET!,
    { expiresIn: (process.env.JWT_EXPIRES_IN ?? '7d') as jwt.SignOptions['expiresIn'] }
  );

  res.json({ token });
});

export default router;