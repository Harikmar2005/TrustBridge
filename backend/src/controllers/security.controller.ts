import { Response } from "express";
import { db } from "../config/database";
import { AuthenticatedRequest } from "../types/auth";

// GET /api/security/overview
export function getMySecurityOverview(
  req: AuthenticatedRequest,
  res: Response
): void {
  if (!req.user) {
    res.status(401).json({ success: false, message: "Authentication required." });
    return;
  }

  const alerts = db
    .prepare<[string], Record<string, unknown>>(
      `SELECT id, userId, securityEventId, title, message, severity, isRead, createdAt
       FROM security_alerts
       WHERE userId = ?
       ORDER BY createdAt DESC
       LIMIT 50`
    )
    .all(req.user.id)
    .map((a) => ({ ...a, isRead: Boolean(a.isRead) }));

  const events = db
    .prepare<
      [string],
      {
        id: string;
        userId: string | null;
        eventType: string;
        severity: string;
        description: string;
        metadataJson: string;
        status: string;
        createdAt: string;
        updatedAt: string;
      }
    >(
      `SELECT id, userId, eventType, severity, description, metadataJson, status, createdAt, updatedAt
       FROM security_events
       WHERE userId = ?
       ORDER BY createdAt DESC
       LIMIT 50`
    )
    .all(req.user.id)
    .map((e) => {
      let metadata = {};
      try {
        metadata = JSON.parse(String(e.metadataJson || "{}"));
      } catch {
        metadata = {};
      }
      return {
        ...e,
        metadata,
      };
    });

  const summary = {
    totalEvents: events.length,
    criticalCount: events.filter((e) => e.severity === "CRITICAL").length,
    highCount: events.filter((e) => e.severity === "HIGH").length,
    mediumCount: events.filter((e) => e.severity === "MEDIUM").length,
    unreadAlerts: alerts.filter((a) => !a.isRead).length,
  };

  res.status(200).json({
    success: true,
    data: {
      summary,
      alerts,
      events,
    },
  });
}

// PATCH /api/security/alerts/:id/read
export function markSecurityAlertRead(
  req: AuthenticatedRequest,
  res: Response
): void {
  if (!req.user) {
    res.status(401).json({ success: false, message: "Authentication required." });
    return;
  }

  const alertId = String(req.params.id);
  const existing = db
    .prepare<[string, string], { id: string }>(
      "SELECT id FROM security_alerts WHERE id = ? AND userId = ?"
    )
    .get(alertId, req.user.id);

  if (!existing) {
    res.status(404).json({ success: false, message: "Security alert not found." });
    return;
  }

  db.prepare<[string]>("UPDATE security_alerts SET isRead = 1 WHERE id = ?").run(
    alertId
  );

  res.status(200).json({
    success: true,
    message: "Alert marked as read.",
  });
}
