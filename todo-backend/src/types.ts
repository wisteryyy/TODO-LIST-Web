import type { Request } from 'express';
import { UserRole } from './schema.js';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userRole?: UserRole;
    }
  }
}

export type User = {
  id: string;
  username: string;
  passwordHash: string;
  role: string;
  createdAt: string;
};

export type Task = {
  id: string;
  userId: string;
  text: string;
  done: boolean;
  createdAt: string;
  updatedAt: string;
};

// Payload, который хранится внутри Access Token
export type JwtPayload = {
  sub: string;
  iat?: number;
  exp?: number;
};

// AuthRequest теперь просто алиас для Request (поля уже встроены через augmentation выше)
export type { Request as AuthRequest } from 'express';