import { NextFunction, Response } from "express";
import { db } from "../config/database";
import {
  AuthenticatedRequest,
  AuthUser,
  NotificationPreferences,
  UserRole,
  UserRow,
} from "../types/auth";
import { AUTH_COOKIE_NAME, verifyToken } from "../utils/token";

const DEFAULT_PREFS: NotificationPreferences = {
  newMessages: true,
  securityAlerts: true,
  disputeUpdates: true,
  accountChanges: true,
  adminAnnouncements: true,
};

export function mapUserRowToAuthUser(user: UserRow): AuthUser {
  let parsedPrefs = DEFAULT_PREFS;
  try {
    parsedPrefs = {
      ...DEFAULT_PREFS,
      ...JSON.parse(user.notificationPrefs || "{}"),
    };
  } catch {
    parsedPrefs = DEFAULT_PREFS;
  }

  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    status: user.status,
    preferredLanguage: user.preferredLanguage || "en",
    emailVerified: Boolean(user.emailVerified),
    notificationPrefs: parsedPrefs,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt || user.createdAt,
  };
}

export function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    let token = req.cookies?.[AUTH_COOKIE_NAME];

    const authHeader = req.headers.authorization;
    if (!token && authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }

    if (!token) {
      res.status(401).json({
        success: false,
        message: "Authentication required. Please sign in.",
      });
      return;
    }

    const payload = verifyToken(token);

    if (payload.jti) {
      const session = db
        .prepare<[string, string], { id: string; isRevoked: number; expiresAt: string }>(
          "SELECT id, isRevoked, expiresAt FROM user_sessions WHERE id = ? AND userId = ?"
        )
        .get(payload.jti, payload.userId);

      if (
        !session ||
        session.isRevoked === 1 ||
        new Date(session.expiresAt).getTime() <= Date.now()
      ) {
        res.status(401).json({
          success: false,
          message: "Session has expired or been revoked. Please sign in again.",
        });
        return;
      }

      db.prepare<[string, string]>(
        "UPDATE user_sessions SET lastActiveAt = ? WHERE id = ?"
      ).run(new Date().toISOString(), session.id);
    }

    const user = db
      .prepare<[string], UserRow>(
        `SELECT id, fullName, email, passwordHash, role, status, preferredLanguage,
                emailVerified, notificationPrefs, deletionRequestedAt, createdAt, updatedAt
         FROM users WHERE id = ?`
      )
      .get(payload.userId);

    if (!user) {
      res.status(401).json({
        success: false,
        message: "User account not found or has been deactivated.",
      });
      return;
    }

    if (user.status === "suspended") {
      res.status(403).json({
        success: false,
        message: "Your account has been suspended. Contact support for review.",
      });
      return;
    }

    req.user = mapUserRowToAuthUser(user);
    req.sessionId = payload.jti;
    next();
  } catch {
    res.status(401).json({
      success: false,
      message: "Invalid or expired session. Please sign in again.",
    });
  }
}

export function requireRole(...roles: UserRole[]) {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: "Access denied. Insufficient role permissions.",
      });
      return;
    }

    next();
  };
}
