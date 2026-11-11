import { Request, Response } from 'express';
import { db } from '../database/connection';
import { getNexconnConfigStatus, requestNexconnUserToken } from '../services/nexconnService';
import { AuthenticatedRequest } from '../middleware/auth';

export function getStatus(_req: Request, res: Response): void {
  const status = getNexconnConfigStatus();
  res.json(status);
}

export async function getToken(req: AuthenticatedRequest, res: Response): Promise<void> {
  const requestingUser = req.user!;
  // Always derive Nexconn User ID from authenticated session unless admin is delegating
  const targetUserId = req.body.userId || requestingUser.userId;

  // Authorization: Non-admins can only request a token for their own authenticated session
  if (requestingUser.role !== 'admin' && requestingUser.userId !== targetUserId) {
    res.status(403).json({
      error: 'FORBIDDEN',
      message: 'You are only authorized to request Nexconn tokens for your own user account.',
    });
    return;
  }

  const dbUser = db.prepare(`SELECT name, avatar FROM users WHERE id = ?`).get(targetUserId) as any;
  if (!dbUser) {
    res.status(404).json({ error: 'USER_NOT_FOUND', message: 'Target user does not exist.' });
    return;
  }

  const userName = req.body.name || dbUser?.name || requestingUser.name;
  const portraitUri = dbUser?.avatar;
  const forceRefresh = Boolean(req.body.forceRefresh);

  const result = await requestNexconnUserToken({
    userId: targetUserId,
    name: userName,
    portraitUri,
    forceRefresh,
  });

  if (!result.success) {
    res.status(result.requiresCredentials ? 503 : 400).json({
      success: false,
      code: result.code,
      message: result.message,
      requiresCredentials: result.requiresCredentials,
    });
    return;
  }

  res.json({
    success: true,
    appKey: result.appKey,
    userId: result.userId,
    token: result.token,
    expiresIn: result.expiresIn || 86400,
  });
}
