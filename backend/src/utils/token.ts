import { CookieOptions, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { TokenPayload } from '../types/auth';

export const AUTH_COOKIE_NAME = 'token';
export const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
}

type CookieRequestContext = Pick<Request, 'secure' | 'headers'>;

function isSecureContext(req?: CookieRequestContext): boolean {
  if (env.NODE_ENV === 'production') return true;
  if (!req) return false;
  if (req.secure) return true;

  const forwardedProto = String(req.headers['x-forwarded-proto'] || '');
  if (
    forwardedProto
      .split(',')
      .some((part) => part.trim().toLowerCase() === 'https')
  ) {
    return true;
  }

  const origin = String(req.headers.origin || '');
  const referer = String(req.headers.referer || '');
  const host = String(req.headers.host || '');

  return (
    origin.startsWith('https://') ||
    referer.startsWith('https://') ||
    host.endsWith('.run.app')
  );
}

function buildCookieOptions(
  req?: CookieRequestContext,
  includeMaxAge = true
): CookieOptions {
  const secure = isSecureContext(req);
  const options: CookieOptions & { partitioned?: boolean } = {
    httpOnly: true,
    secure,
    sameSite: secure ? 'none' : 'lax',
    path: '/',
    ...(includeMaxAge ? { maxAge: COOKIE_MAX_AGE_MS } : {}),
    ...(secure ? { partitioned: true } : {}),
  };
  return options;
}

export function setAuthCookie(
  res: Response,
  token: string,
  req?: CookieRequestContext
): void {
  res.cookie(AUTH_COOKIE_NAME, token, buildCookieOptions(req, true));
}

export function clearAuthCookie(
  res: Response,
  req?: CookieRequestContext
): void {
  res.clearCookie(AUTH_COOKIE_NAME, buildCookieOptions(req, false));
}

export function extractTokenFromCookieHeader(
  cookieHeader: string | undefined
): string | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const [rawKey, ...rawVal] = part.trim().split('=');
    if (rawKey === AUTH_COOKIE_NAME) {
      return decodeURIComponent(rawVal.join('='));
    }
  }
  return null;
}
