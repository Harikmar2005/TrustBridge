import crypto from "crypto";
import { db } from "../config/database";
import type { SecuritySeverity } from "../types/domain";
import { createNotification } from "./notification.service";

const failedLoginTracker = new Map<
  string,
  { count: number; firstAttemptAt: number }
>();

export function createSecurityEventAndAlert(params: {
  userId?: string | null;
  notifyUserId?: string | null;
  eventType: string;
  severity: SecuritySeverity;
  description: string;
  metadata?: Record<string, unknown>;
  alertTitle?: string;
  alertMessage?: string;
}): string {
  const eventId = crypto.randomUUID();
  const now = new Date().toISOString();

  db.prepare<
    [string, string | null, string, string, string, string, string, string]
  >(
    `INSERT INTO security_events (id, userId, eventType, severity, description, metadataJson, status, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, 'PENDING_REVIEW', ?, ?)`
  ).run(
    eventId,
    params.userId ?? null,
    params.eventType,
    params.severity,
    params.description,
    JSON.stringify(params.metadata ?? {}),
    now,
    now
  );

  const targetAlertUser = params.notifyUserId ?? params.userId;
  if (targetAlertUser) {
    const alertId = crypto.randomUUID();
    const title = params.alertTitle ?? "Security advisory";
    const message = params.alertMessage ?? params.description;

    db.prepare<[string, string, string, string, string, string, string]>(
      `INSERT INTO security_alerts (id, userId, securityEventId, title, message, severity, isRead, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?)`
    ).run(
      alertId,
      targetAlertUser,
      eventId,
      title,
      message,
      params.severity,
      now
    );

    createNotification({
      userId: targetAlertUser,
      type: "securityAlerts",
      title,
      message,
      link: "/dashboard/security",
    });
  }

  return eventId;
}

export function recordFailedLoginAttempt(params: {
  email: string;
  userId?: string;
  ipAddress?: string;
}): void {
  const key = params.email.toLowerCase();
  const nowMs = Date.now();
  const windowMs = 15 * 60 * 1000;

  const current = failedLoginTracker.get(key);
  if (!current || nowMs - current.firstAttemptAt > windowMs) {
    failedLoginTracker.set(key, { count: 1, firstAttemptAt: nowMs });
    return;
  }

  current.count += 1;
  failedLoginTracker.set(key, current);

  const policy = db
    .prepare<[string], { value: string }>(
      "SELECT value FROM platform_policies WHERE key = ?"
    )
    .get("failed_login_alert_threshold");

  const threshold = Number.parseInt(policy?.value ?? "3", 10) || 3;

  if (current.count >= threshold) {
    createSecurityEventAndAlert({
      userId: params.userId ?? null,
      notifyUserId: params.userId ?? null,
      eventType: "MULTIPLE_FAILED_LOGINS",
      severity: current.count >= threshold + 2 ? "HIGH" : "MEDIUM",
      description: `${current.count} failed sign-in attempts detected for account ${key}.`,
      metadata: {
        email: key,
        attemptCount: current.count,
        ipAddress: params.ipAddress ?? "unknown",
      },
      alertTitle: "Multiple failed login attempts",
      alertMessage: `We detected ${current.count} unsuccessful sign-in attempts on your account. If this wasn't you, consider updating your password.`,
    });
  }
}

export function clearFailedLoginAttempts(email: string): void {
  failedLoginTracker.delete(email.toLowerCase());
}
