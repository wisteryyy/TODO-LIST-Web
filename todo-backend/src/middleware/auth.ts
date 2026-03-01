import jwt from 'jsonwebtoken';
import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../types.js';

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Token required' });
    return;
  }

  try {
    // Проверяем токен с помощью секретного ключа из .env
    // Если токен валидный — jwt.verify вернёт его содержимое (payload)
    // Если истёк или подделан — выбросит исключение
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };

    req.userId = payload.userId;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};