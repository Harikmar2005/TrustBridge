import { Response } from "express";
import { db } from "../config/database";
import { AuthenticatedRequest } from "../types/auth";

// GET /api/notifications
export function getNotifications(
  req: AuthenticatedRequest,
  res: Response
): void {
  if (!req.user) {
    res.status(401).json({ success: false, message: "Authentication required." });
    return;
  }

  const notifications = db
    .prepare<[string], Record<string, unknown>>(
      `SELECT id, userId, type, title, message, link, isRead, createdAt
       FROM notifications
       WHERE userId = ?
       ORDER BY createdAt DESC
       LIMIT 50`
    )
    .all(req.user.id)
    .map((n) => ({ ...n, isRead: Boolean(n.isRead) }));

  res.status(200).json({
    success: true,
    notifications,
    unreadCount: notifications.filter((n) => !n.isRead).length,
  });
}

// PATCH /api/notifications/:id/read
export function markNotificationRead(
  req: AuthenticatedRequest,
  res: Response
): void {
  if (!req.user) {
    res.status(401).json({ success: false, message: "Authentication required." });
    return;
  }

  const id = String(req.params.id);
  db.prepare<[string, string]>(
    "UPDATE notifications SET isRead = 1 WHERE id = ? AND userId = ?"
  ).run(id, req.user.id);

  res.status(200).json({
    success: true,
    message: "Notification marked as read.",
  });
}

// PATCH /api/notifications/read-all
export function markAllNotificationsRead(
  req: AuthenticatedRequest,
  res: Response
): void {
  if (!req.user) {
    res.status(401).json({ success: false, message: "Authentication required." });
    return;
  }

  db.prepare<[string]>(
    "UPDATE notifications SET isRead = 1 WHERE userId = ? AND isRead = 0"
  ).run(req.user.id);

  res.status(200).json({
    success: true,
    message: "All notifications marked as read.",
  });
}
