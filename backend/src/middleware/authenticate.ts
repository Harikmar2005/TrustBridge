import { NextFunction, Response } from 'express';
import { db } from '../config/database';
import { AuthenticatedRequest, AuthUser, User } from '../types/auth';
import { AUTH_COOKIE_NAME, verifyToken } from '../utils/token';

export function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    let token = req.cookies?.[AUTH_COOKIE_NAME];

    // Fall back to Authorization Bearer header if cookie is absent
    const authHeader = req.headers.authorization;
    if (!token && authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Authentication required. Please sign in.',
      });
      return;
    }

    const payload = verifyToken(token);

    const userStmt = db.prepare<[string], User>(
      'SELECT id, fullName, email, passwordHash, role, createdAt FROM users WHERE id = ?'
    );
    const user = userStmt.get(payload.userId);

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User account not found or has been deactivated.',
      });
      return;
    }

    const authUser: AuthUser = {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    };

    req.user = authUser;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired session. Please sign in again.',
    });
  }
}

