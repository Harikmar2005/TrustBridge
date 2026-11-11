import jwt from 'jsonwebtoken';
import { hashSync, verifySync } from '@node-rs/argon2';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db } from '../database/connection';
import { UserRole, LanguageCode } from '../../../shared/types';
import { config } from '../config/env';

export const JWT_ISSUER = 'trustbridge-platform';
export const JWT_AUDIENCE = 'trustbridge-client';
export const TOKEN_EXPIRY = '7d';

// Ephemeral fallback key for development session only when JWT_SECRET is not configured
const devSessionEphemeralKey = crypto.randomBytes(32).toString('hex');

/**
 * Returns verified JWT secret with strict production validation
 */
export function getJwtSecret(): string {
  const secret = (process.env.JWT_SECRET || config.jwtSecret)?.trim();
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL SECURITY ERROR: JWT_SECRET environment variable is missing in production environment.');
    }
    return devSessionEphemeralKey;
  }
  if (secret.length < 32 && process.env.NODE_ENV === 'production') {
    throw new Error('FATAL SECURITY ERROR: JWT_SECRET must be at least 32 characters in production.');
  }
  return secret;
}

/**
 * Validates security configuration at system boot
 */
export function validateSecurityConfiguration(): { valid: boolean; notes: string[] } {
  const notes: string[] = [];
  const secret = (process.env.JWT_SECRET || config.jwtSecret)?.trim();
  const isProd = process.env.NODE_ENV === 'production';

  if (!secret) {
    notes.push('JWT_SECRET missing: Using ephemeral 256-bit development key (sessions reset on process restart).');
    if (isProd) {
      throw new Error('FATAL: JWT_SECRET is mandatory in production mode.');
    }
  } else if (secret.length < 32) {
    notes.push('JWT_SECRET is shorter than 32 characters; recommend 256-bit entropy.');
    if (isProd) {
      throw new Error('FATAL: JWT_SECRET must be >= 32 characters in production.');
    }
  } else {
    notes.push('JWT_SECRET configured with adequate entropy.');
  }

  return { valid: true, notes };
}

/**
 * Hashes password using Argon2id with memory-hard parameters
 */
export function hashPassword(password: string): string {
  return hashSync(password, {
    memoryCost: 19456, // 19 MB memory hardness
    timeCost: 2,       // 2 iterations
    outputLen: 32,
    parallelism: 1,
  });
}

/**
 * Verifies password against Argon2id hash (with seamless backwards compatibility for legacy bcrypt)
 */
export function verifyPassword(password: string, hash: string): boolean {
  if (!password || !hash) return false;

  // Primary: Argon2id verification
  if (hash.startsWith('$argon2')) {
    try {
      return verifySync(hash, password);
    } catch {
      return false;
    }
  }

  // Legacy fallback: Bcrypt verification
  if (hash.startsWith('$2a$') || hash.startsWith('$2b$')) {
    try {
      return bcrypt.compareSync(password, hash);
    } catch {
      return false;
    }
  }

  return false;
}

export interface AuthTokenPayload {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  preferredLanguage: LanguageCode;
  tokenId: string;
  iss?: string;
  aud?: string;
}

/**
 * Creates and records a new JWT session in the database with strict claims
 */
export function issueSessionToken(user: {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  preferred_language?: string;
  preferredLanguage?: string;
}): { token: string; tokenId: string; expiresIn: string } {
  const tokenId = `tok_${crypto.randomBytes(16).toString('hex')}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  // Record active session in auth_sessions table
  db.prepare(`
    INSERT INTO auth_sessions (id, user_id, token_id, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(`sess_${crypto.randomBytes(8).toString('hex')}`, user.id, tokenId, now.toISOString(), expiresAt);

  const lang = (user.preferred_language || user.preferredLanguage || 'en') as LanguageCode;

  const payload: AuthTokenPayload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role as UserRole,
    preferredLanguage: lang,
    tokenId,
  };

  const token = jwt.sign(payload, getJwtSecret(), {
    expiresIn: TOKEN_EXPIRY,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });

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
 * Verifies a JWT session token string against signature, expiration, and database revocation
 */
export function verifySessionToken(token: string): AuthTokenPayload | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret(), {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }) as AuthTokenPayload;

    // Check if token session has been revoked or expired in SQLite
    const session = db.prepare(`
      SELECT revoked_at, expires_at FROM auth_sessions WHERE token_id = ?
    `).get(decoded.tokenId) as { revoked_at: string | null; expires_at: string } | undefined;

    if (!session || session.revoked_at) {
      return null;
    }

    if (new Date(session.expires_at) < new Date()) {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
}
