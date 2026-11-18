import crypto from "crypto";
import { db } from "../config/database";
import type { NotificationPreferences } from "../types/domain";

export type NotificationCategory = keyof NotificationPreferences;

export function createNotification(params: {
  userId: string;
  type: NotificationCategory;
  title: string;
  message: string;
  link?: string | null;
}): string | null {
  const userRow = db
    .prepare<[string], { notificationPrefs: string }>(
      "SELECT notificationPrefs FROM users WHERE id = ?"
    )
    .get(params.userId);

  if (!userRow) return null;

  try {
    const prefs = JSON.parse(
      userRow.notificationPrefs || "{}"
    ) as Partial<NotificationPreferences>;
    if (prefs[params.type] === false) {
      return null;
    }
  } catch {
    // Default to enabled if preferences JSON is malformed
  }

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  db.prepare<[string, string, string, string, string, string | null, string]>(
    `INSERT INTO notifications (id, userId, type, title, message, link, isRead, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?)`
  ).run(
    id,
    params.userId,
    params.type,
    params.title,
    params.message,
    params.link ?? null,
    createdAt
  );

  return id;
}
