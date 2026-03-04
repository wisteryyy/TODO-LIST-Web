import { verifyAccessToken } from '../services/tokenService.js';
import type { Request, Response, NextFunction } from 'express';
import { UserRole } from '../schema.js';
import { db } from '../db.js';
import { users } from '../schema.js';
import { eq } from 'drizzle-orm';

export const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token required' });
    return;
  }

  const token = header.substring(7);

  try {
    const payload = verifyAccessToken(token);
    req.userId = payload.sub;

    const user = db.select().from(users).where(eq(users.id, req.userId)).get();

    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    req.userRole = user.role as UserRole;
    next();
  } catch (err: any) {
    if (err.message === 'ACCESS_TOKEN_EXPIRED') {
      // Клиент видит отдельный код и знает, что надо вызвать /auth/refresh
      res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
      return;
    }
    res.status(401).json({ error: 'Invalid token' });
  }
};