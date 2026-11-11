import { Request, Response, NextFunction } from 'express';
import { db } from '../database/connection';
import { UserRole } from '../../../shared/types';
import { verifySessionToken, AuthTokenPayload } from '../services/authService';

export interface AuthenticatedRequest extends Request {
  user?: AuthTokenPayload;
}

/**
 * Express Middleware: Authenticates JWT Bearer Token, validates claims and verifies active session
 */
export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Authentication token is required to access this endpoint.',
    });
    return;
  }

  const decoded = verifySessionToken(token);
  if (!decoded) {
    res.status(401).json({
      error: 'INVALID_TOKEN',
      message: 'Invalid, revoked, or expired authentication token. Please log in again.',
    });
    return;
  }

  // Attach validated user payload to request
  req.user = decoded;
  next();
}

/**
 * Express Middleware: Enforces Server-Side Role-Based Access Control (RBAC)
 */
export function requireRoles(roles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        error: 'FORBIDDEN',
        message: `Access denied. Role '${req.user.role}' is not authorized to perform this operation. Required: [${roles.join(', ')}]`,
      });
      return;
    }

    next();
  };
}

/**
 * Express Middleware: Enforces that user is authorized to access a dispute (Buyer, Seller, Assigned Support, or Admin)
 */
export function requireDisputeAccess(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'UNAUTHORIZED' });
    return;
  }

  const disputeId = req.params.id || req.body.disputeId;
  if (!disputeId) {
    res.status(400).json({ error: 'INVALID_REQUEST', message: 'Dispute ID required' });
    return;
  }

  const dispute = db.prepare(`
    SELECT buyer_id, seller_id, assigned_agent_id FROM disputes WHERE id = ? OR reference_id = ?
  `).get(disputeId, disputeId) as { buyer_id: string; seller_id: string; assigned_agent_id: string } | undefined;

  if (!dispute) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Dispute not found' });
    return;
  }

  const user = req.user;
  if (user.role === 'admin' || user.role === 'support') {
    return next();
  }

  if (user.userId === dispute.buyer_id || user.userId === dispute.seller_id) {
    return next();
  }

  res.status(403).json({
    error: 'FORBIDDEN',
    message: 'You are not an authorized party or assigned agent for this dispute record.',
  });
}

/**
 * Express Middleware: Enforces that user is a participant of a conversation
 */
export function requireConversationAccess(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'UNAUTHORIZED' });
    return;
  }

  const convId = req.params.id || req.body.conversationId;
  if (!convId) {
    res.status(400).json({ error: 'INVALID_REQUEST', message: 'Conversation ID required' });
    return;
  }

  const conv = db.prepare(`
    SELECT buyer_id, seller_id, type FROM conversations WHERE id = ?
  `).get(convId) as { buyer_id: string; seller_id: string; type: string } | undefined;

  if (!conv) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Conversation not found' });
    return;
  }

  const user = req.user;
  if (user.role === 'admin' || user.role === 'support') {
    return next();
  }

  if (conv.type === 'dispute_room' && (user.userId === conv.buyer_id || user.userId === conv.seller_id)) {
    return next();
  }

  if (user.userId === conv.buyer_id || user.userId === conv.seller_id) {
    return next();
  }

  res.status(403).json({
    error: 'FORBIDDEN',
    message: 'You are not an authorized participant in this conversation.',
  });
}
