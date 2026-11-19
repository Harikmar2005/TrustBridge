import { hash, verify } from "@node-rs/argon2";
import crypto from "crypto";
import { Request, Response } from "express";
import { db } from "../config/database";
import { mapUserRowToAuthUser } from "../middleware/authenticate";
import {
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
} from "../schemas/auth.schema";
import { recordAuditLog } from "../services/audit.service";
import { createNotification } from "../services/notification.service";
import {
  clearFailedLoginAttempts,
  recordFailedLoginAttempt,
} from "../services/security.service";
import { recalculateUserTrustScore } from "../services/trust.service";
import { AuthenticatedRequest, UserRow } from "../types/auth";
import {
  clearAuthCookie,
  COOKIE_MAX_AGE_MS,
  generateToken,
  setAuthCookie,
} from "../utils/token";

function createSessionForUser(params: {
  userId: string;
  req: Pick<Request, "headers" | "ip">;
}): string {
  const sessionId = crypto.randomUUID();
  const now = new Date();
  const nowIso = now.toISOString();
  const expiresAt = new Date(now.getTime() + COOKIE_MAX_AGE_MS).toISOString();
  const userAgent = String(params.req.headers["user-agent"] || "Browser");
  const ipAddress = params.req.ip || "unknown";

  db.prepare<
    [string, string, string, string, string, string, string]
  >(
    `INSERT INTO user_sessions (id, userId, userAgent, ipAddress, isRevoked, expiresAt, createdAt, lastActiveAt)
     VALUES (?, ?, ?, ?, 0, ?, ?, ?)`
  ).run(
    sessionId,
    params.userId,
    userAgent.slice(0, 200),
    ipAddress,
    expiresAt,
    nowIso,
    nowIso
  );

  return sessionId;
}

// POST /api/auth/register
export async function register(
  req: Request<unknown, unknown, RegisterInput>,
  res: Response
): Promise<void> {
  try {
    const { fullName, email, password, role } = req.body;
    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = db
      .prepare<[string], { id: string }>(
        "SELECT id FROM users WHERE email = ?"
      )
      .get(normalizedEmail);

    if (existingUser) {
      res.status(409).json({
        success: false,
        message: "An account with this email address already exists.",
      });
      return;
    }

    const passwordHash = await hash(password);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    db.prepare<[string, string, string, string, string, string, string]>(
      `INSERT INTO users (id, fullName, email, passwordHash, role, status, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, 'active', ?, ?)`
    ).run(id, fullName.trim(), normalizedEmail, passwordHash, role, now, now);

    if (role === "seller") {
      db.prepare<[string, string, string, string, string]>(
        `INSERT INTO seller_profiles (id, userId, businessName, category, location, description, verificationStatus, createdAt, updatedAt)
         VALUES (?, ?, ?, 'General Commerce', 'Unspecified', '', 'unverified', ?, ?)`
      ).run(
        crypto.randomUUID(),
        id,
        `${fullName.trim()} Storefront`,
        now,
        now
      );
    }

    recalculateUserTrustScore(id, "Initial account creation");

    const userRow = db
      .prepare<[string], UserRow>("SELECT * FROM users WHERE id = ?")
      .get(id)!;
    const authUser = mapUserRowToAuthUser(userRow);

    const jti = createSessionForUser({ userId: id, req });
    const token = generateToken({
      userId: id,
      email: authUser.email,
      role: authUser.role,
      jti,
    });
    setAuthCookie(res, token, req);

    recordAuditLog({
      actorId: id,
      action: "USER_REGISTERED",
      targetType: "user",
      targetId: id,
      details: { role: authUser.role },
      ipAddress: req.ip,
    });

    createNotification({
      userId: id,
      type: "accountChanges",
      title: "Welcome to TrustBridge",
      message:
        role === "seller"
          ? "Complete your business profile in Settings to build buyer confidence."
          : "Explore verified sellers or open a secure conversation.",
      link: role === "seller" ? "/dashboard/settings" : "/sellers",
    });

    res.status(201).json({
      success: true,
      message: "Account created successfully!",
      user: authUser,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Unable to complete registration. Please try again later.",
    });
  }
}

// POST /api/auth/login
export async function login(
  req: Request<unknown, unknown, LoginInput>,
  res: Response
): Promise<void> {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email.trim().toLowerCase();

    const user = db
      .prepare<[string], UserRow>("SELECT * FROM users WHERE email = ?")
      .get(normalizedEmail);

    if (!user) {
      recordFailedLoginAttempt({ email: normalizedEmail, ipAddress: req.ip });
      res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
      return;
    }

    if (user.status === "suspended") {
      res.status(403).json({
        success: false,
        message:
          "This account is currently suspended. Contact an administrator for assistance.",
      });
      return;
    }

    const isValidPassword = await verify(user.passwordHash, password);
    if (!isValidPassword) {
      recordFailedLoginAttempt({
        email: normalizedEmail,
        userId: user.id,
        ipAddress: req.ip,
      });
      res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
      return;
    }

    clearFailedLoginAttempts(normalizedEmail);

    const authUser = mapUserRowToAuthUser(user);
    const jti = createSessionForUser({ userId: user.id, req });
    const token = generateToken({
      userId: user.id,
      email: authUser.email,
      role: authUser.role,
      jti,
    });
    setAuthCookie(res, token, req);

    recordAuditLog({
      actorId: user.id,
      action: "USER_LOGIN",
      targetType: "session",
      targetId: jti,
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: "Signed in successfully!",
      user: authUser,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Unable to log in. Please try again later.",
    });
  }
}

// GET /api/auth/me
export function getMe(req: AuthenticatedRequest, res: Response): void {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
    return;
  }

  res.status(200).json({
    success: true,
    message: "User authenticated",
    user: req.user,
  });
}

// POST /api/auth/logout
export function logout(req: AuthenticatedRequest, res: Response): void {
  if (req.sessionId) {
    db.prepare<[string]>(
      "UPDATE user_sessions SET isRevoked = 1 WHERE id = ?"
    ).run(req.sessionId);
  }
  clearAuthCookie(res, req);
  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
}

// POST /api/auth/change-password
export async function changePassword(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, message: "Authentication required." });
    return;
  }

  const { currentPassword, newPassword } = req.body as ChangePasswordInput;

  const user = db
    .prepare<[string], UserRow>("SELECT * FROM users WHERE id = ?")
    .get(req.user.id);

  if (!user) {
    res.status(404).json({ success: false, message: "User not found." });
    return;
  }

  const valid = await verify(user.passwordHash, currentPassword);
  if (!valid) {
    res.status(400).json({
      success: false,
      message: "Current password is incorrect.",
    });
    return;
  }

  const newHash = await hash(newPassword);
  const now = new Date().toISOString();

  db.transaction(() => {
    db.prepare<[string, string, string]>(
      "UPDATE users SET passwordHash = ?, updatedAt = ? WHERE id = ?"
    ).run(newHash, now, user.id);

    // Revoke all other active sessions
    if (req.sessionId) {
      db.prepare<[string, string]>(
        "UPDATE user_sessions SET isRevoked = 1 WHERE userId = ? AND id != ?"
      ).run(user.id, req.sessionId);
    } else {
      db.prepare<[string]>(
        "UPDATE user_sessions SET isRevoked = 1 WHERE userId = ?"
      ).run(user.id);
    }
  });

  createNotification({
    userId: user.id,
    type: "accountChanges",
    title: "Password updated",
    message:
      "Your password was changed and other active sessions were signed out.",
    link: "/dashboard/settings",
  });

  recordAuditLog({
    actorId: user.id,
    action: "PASSWORD_CHANGED",
    targetType: "user",
    targetId: user.id,
    ipAddress: req.ip,
  });

  res.status(200).json({
    success: true,
    message: "Password updated and other sessions invalidated.",
  });
}

// POST /api/auth/forgot-password (Development-only reset token workflow)
export function forgotPassword(
  req: Request<unknown, unknown, ForgotPasswordInput>,
  res: Response
): void {
  const email = req.body.email.trim().toLowerCase();
  const user = db
    .prepare<[string], { id: string }>("SELECT id FROM users WHERE email = ?")
    .get(email);

  let devResetToken: string | undefined;

  if (user) {
    const rawToken = crypto.randomBytes(24).toString("hex");
    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 60 * 1000).toISOString();

    db.prepare<[string, string, string, string, string]>(
      `INSERT INTO password_reset_tokens (id, userId, tokenHash, expiresAt, createdAt)
       VALUES (?, ?, ?, ?, ?)`
    ).run(crypto.randomUUID(), user.id, tokenHash, expiresAt, now.toISOString());

    if (process.env.NODE_ENV !== "production") {
      devResetToken = rawToken;
    }
  }

  res.status(200).json({
    success: true,
    message:
      "If an account exists for that email, a password reset token has been generated. Note: external email delivery is not configured in this local environment.",
    developmentOnly: process.env.NODE_ENV !== "production",
    ...(devResetToken ? { devResetToken } : {}),
  });
}

// POST /api/auth/reset-password
export async function resetPassword(
  req: Request<unknown, unknown, ResetPasswordInput>,
  res: Response
): Promise<void> {
  const { token, newPassword } = req.body;
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const record = db
    .prepare<
      [string],
      { id: string; userId: string; expiresAt: string; usedAt: string | null }
    >(
      `SELECT id, userId, expiresAt, usedAt FROM password_reset_tokens
       WHERE tokenHash = ? ORDER BY createdAt DESC LIMIT 1`
    )
    .get(tokenHash);

  if (
    !record ||
    record.usedAt !== null ||
    new Date(record.expiresAt).getTime() <= Date.now()
  ) {
    res.status(400).json({
      success: false,
      message: "Invalid or expired password reset token.",
    });
    return;
  }

  const newHash = await hash(newPassword);
  const now = new Date().toISOString();

  db.transaction(() => {
    db.prepare<[string, string, string]>(
      "UPDATE users SET passwordHash = ?, updatedAt = ? WHERE id = ?"
    ).run(newHash, now, record.userId);

    db.prepare<[string, string]>(
      "UPDATE password_reset_tokens SET usedAt = ? WHERE id = ?"
    ).run(now, record.id);

    db.prepare<[string]>(
      "UPDATE user_sessions SET isRevoked = 1 WHERE userId = ?"
    ).run(record.userId);
  });

  recordAuditLog({
    actorId: record.userId,
    action: "PASSWORD_RESET",
    targetType: "user",
    targetId: record.userId,
    ipAddress: req.ip,
  });

  res.status(200).json({
    success: true,
    message: "Password reset successfully. Please sign in with your new password.",
  });
}

// GET /api/auth/sessions
export function getSessions(req: AuthenticatedRequest, res: Response): void {
  if (!req.user) {
    res.status(401).json({ success: false, message: "Authentication required." });
    return;
  }

  const sessions = db
    .prepare<
      [string, string],
      {
        id: string;
        userAgent: string;
        ipAddress: string;
        isRevoked: number;
        expiresAt: string;
        createdAt: string;
        lastActiveAt: string;
      }
    >(
      `SELECT id, userAgent, ipAddress, isRevoked, expiresAt, createdAt, lastActiveAt
       FROM user_sessions
       WHERE userId = ? AND isRevoked = 0 AND expiresAt > ?
       ORDER BY lastActiveAt DESC`
    )
    .all(req.user.id, new Date().toISOString())
    .map((s) => ({
      ...s,
      isCurrent: s.id === req.sessionId,
    }));

  res.status(200).json({
    success: true,
    sessions,
  });
}

// DELETE /api/auth/sessions/:id
export function revokeSession(req: AuthenticatedRequest, res: Response): void {
  if (!req.user) {
    res.status(401).json({ success: false, message: "Authentication required." });
    return;
  }

  const sessionId = String(req.params.id);
  const existing = db
    .prepare<[string, string], { id: string }>(
      "SELECT id FROM user_sessions WHERE id = ? AND userId = ?"
    )
    .get(sessionId, req.user.id);

  if (!existing) {
    res.status(404).json({ success: false, message: "Session not found." });
    return;
  }

  db.prepare<[string]>("UPDATE user_sessions SET isRevoked = 1 WHERE id = ?").run(
    sessionId
  );

  if (sessionId === req.sessionId) {
    clearAuthCookie(res, req);
  }

  res.status(200).json({
    success: true,
    message: "Session revoked.",
  });
}
