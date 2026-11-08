import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db } from '../db';
import { UserRole, LanguageCode } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'trustbridge-enterprise-jwt-secret-token-key-2026';
const TOKEN_EXPIRY = '7d';

export interface AuthTokenPayload {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  preferredLanguage: LanguageCode;
  tokenId: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthTokenPayload;
}

/**
 * Creates and records a new JWT session in the database
 */
export function issueSessionToken(user: {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  preferred_language: string;
}): { token: string; tokenId: string; expiresIn: string } {
  const tokenId = `tok_${crypto.randomBytes(16).toString('hex')}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  // Record session in auth_sessions table
  db.prepare(`
    INSERT INTO auth_sessions (id, user_id, token_id, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(`sess_${crypto.randomBytes(8).toString('hex')}`, user.id, tokenId, now.toISOString(), expiresAt);

  const payload: AuthTokenPayload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role as UserRole,
    preferredLanguage: user.preferred_language as LanguageCode,
    tokenId,
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
  return { token, tokenId, expiresIn: '7 days' };
}

/**
 * Revokes a session token in the database
 */
export function revokeSessionToken(tokenId: string): boolean {
  const res = db.prepare(`
    UPDATE auth_sessions
    SET revoked_at = ?
    WHERE token_id = ?
  `).run(new Date().toISOString(), tokenId);

  return res.changes > 0;
}

/**
 * Express Middleware: Authenticates JWT Bearer Token and verifies against active DB session
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

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthTokenPayload;

    // Check if token session has been revoked in database
    const session = db.prepare(`
      SELECT revoked_at, expires_at FROM auth_sessions WHERE token_id = ?
    `).get(decoded.tokenId) as { revoked_at: string | null; expires_at: string } | undefined;

    if (!session || session.revoked_at) {
      res.status(401).json({
        error: 'SESSION_REVOKED',
        message: 'This session has been revoked. Please log in again.',
      });
      return;
    }

    if (new Date(session.expires_at) < new Date()) {
      res.status(401).json({
        error: 'TOKEN_EXPIRED',
        message: 'Authentication token has expired. Please log in again.',
      });
      return;
    }

    // Attach user payload to request
    req.user = decoded;
    next();
  } catch (err: any) {
    res.status(401).json({
      error: 'INVALID_TOKEN',
      message: 'Invalid or malformed authentication token.',
    });
  }
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

  // Admins have universal access; Support can access assigned or general cases; Buyers & Sellers can only access their own
  const user = req.user;
  if (user.role === 'admin') {
    return next();
  }

  if (user.role === 'support') {
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
    message: 'You are not a participant in this conversation.',
  });
}
