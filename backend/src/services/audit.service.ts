import crypto from "crypto";
import { db } from "../config/database";

export function recordAuditLog(params: {
  actorId?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  details?: Record<string, unknown>;
  ipAddress?: string;
}): void {
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  db.prepare<[string, string | null, string, string, string | null, string, string, string]>(
    `INSERT INTO audit_logs (id, actorId, action, targetType, targetId, detailsJson, ipAddress, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    params.actorId ?? null,
    params.action,
    params.targetType,
    params.targetId ?? null,
    JSON.stringify(params.details ?? {}),
    params.ipAddress ?? "unknown",
    createdAt
  );
}
