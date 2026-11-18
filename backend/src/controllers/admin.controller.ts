import { Response } from "express";
import { db } from "../config/database";
import { recordAuditLog } from "../services/audit.service";
import { createNotification } from "../services/notification.service";
import { recalculateUserTrustScore } from "../services/trust.service";
import { AuthenticatedRequest } from "../types/auth";

// GET /api/admin/overview
export function getAdminOverview(
  _req: AuthenticatedRequest,
  res: Response
): void {
  const totalUsers =
    db.prepare<[], { cnt: number }>("SELECT COUNT(*) AS cnt FROM users").get()
      ?.cnt ?? 0;
  const buyersCount =
    db
      .prepare<[], { cnt: number }>(
        "SELECT COUNT(*) AS cnt FROM users WHERE role = 'buyer'"
      )
      .get()?.cnt ?? 0;
  const sellersCount =
    db
      .prepare<[], { cnt: number }>(
        "SELECT COUNT(*) AS cnt FROM users WHERE role = 'seller'"
      )
      .get()?.cnt ?? 0;
  const suspendedCount =
    db
      .prepare<[], { cnt: number }>(
        "SELECT COUNT(*) AS cnt FROM users WHERE status = 'suspended'"
      )
      .get()?.cnt ?? 0;
  const totalConversations =
    db
      .prepare<[], { cnt: number }>(
        "SELECT COUNT(*) AS cnt FROM conversations"
      )
      .get()?.cnt ?? 0;
  const flaggedConversations =
    db
      .prepare<[], { cnt: number }>(
        "SELECT COUNT(*) AS cnt FROM conversations WHERE status = 'flagged' OR reportedFlag = 1"
      )
      .get()?.cnt ?? 0;
  const pendingSecurityEvents =
    db
      .prepare<[], { cnt: number }>(
        "SELECT COUNT(*) AS cnt FROM security_events WHERE status IN ('PENDING_REVIEW', 'UNDER_INVESTIGATION')"
      )
      .get()?.cnt ?? 0;
  const criticalEvents =
    db
      .prepare<[], { cnt: number }>(
        "SELECT COUNT(*) AS cnt FROM security_events WHERE severity = 'CRITICAL' AND status != 'DISMISSED'"
      )
      .get()?.cnt ?? 0;
  const openDisputes =
    db
      .prepare<[], { cnt: number }>(
        "SELECT COUNT(*) AS cnt FROM disputes WHERE status IN ('OPEN', 'UNDER_REVIEW', 'WAITING_FOR_RESPONSE')"
      )
      .get()?.cnt ?? 0;
  const pendingReports =
    db
      .prepare<[], { cnt: number }>(
        "SELECT COUNT(*) AS cnt FROM account_reports WHERE status = 'PENDING_REVIEW'"
      )
      .get()?.cnt ?? 0;

  res.status(200).json({
    success: true,
    data: {
      stats: {
        totalUsers,
        buyersCount,
        sellersCount,
        suspendedCount,
        totalConversations,
        flaggedConversations,
        pendingSecurityEvents,
        criticalEvents,
        openDisputes,
        pendingReports,
      },
    },
  });
}

// GET /api/admin/users
export function adminListUsers(
  req: AuthenticatedRequest,
  res: Response
): void {
  const search =
    typeof req.query.q === "string" ? req.query.q.trim().toLowerCase() : "";
  const role =
    typeof req.query.role === "string" ? req.query.role.trim().toLowerCase() : "";
  const status =
    typeof req.query.status === "string"
      ? req.query.status.trim().toLowerCase()
      : "";

  const users = db
    .prepare<[], Record<string, unknown>>(
      `SELECT u.id, u.fullName, u.email, u.role, u.status, u.emailVerified, u.createdAt, u.updatedAt,
              ts.score AS trustScore, ts.level AS trustLevel,
              sp.businessName, sp.verificationStatus
       FROM users u
       LEFT JOIN trust_scores ts ON ts.userId = u.id
       LEFT JOIN seller_profiles sp ON sp.userId = u.id
       ORDER BY u.createdAt DESC`
    )
    .all()
    .filter((u) => {
      if (role && role !== "all" && String(u.role) !== role) return false;
      if (status && status !== "all" && String(u.status) !== status) return false;
      if (search) {
        const hay = `${u.fullName} ${u.email} ${u.businessName || ""}`.toLowerCase();
        return hay.includes(search);
      }
      return true;
    });

  res.status(200).json({
    success: true,
    users,
  });
}

// PATCH /api/admin/users/:id/status
export function adminUpdateUserStatus(
  req: AuthenticatedRequest,
  res: Response
): void {
  const userId = String(req.params.id);
  const status = String(req.body?.status ?? "").trim();

  if (status !== "active" && status !== "suspended") {
    res.status(400).json({
      success: false,
      message: "Status must be 'active' or 'suspended'.",
    });
    return;
  }

  if (req.user && userId === req.user.id && status === "suspended") {
    res.status(400).json({
      success: false,
      message: "Administrators cannot suspend their own active account.",
    });
    return;
  }

  const target = db
    .prepare<[string], { id: string; fullName: string; role: string }>(
      "SELECT id, fullName, role FROM users WHERE id = ?"
    )
    .get(userId);

  if (!target) {
    res.status(404).json({ success: false, message: "User not found." });
    return;
  }

  const now = new Date().toISOString();
  db.transaction(() => {
    db.prepare<[string, string, string]>(
      "UPDATE users SET status = ?, updatedAt = ? WHERE id = ?"
    ).run(status, now, userId);

    if (status === "suspended") {
      db.prepare<[string]>(
        "UPDATE user_sessions SET isRevoked = 1 WHERE userId = ?"
      ).run(userId);
    }
  });

  recordAuditLog({
    actorId: req.user?.id ?? null,
    action: status === "suspended" ? "USER_SUSPENDED" : "USER_REACTIVATED",
    targetType: "user",
    targetId: userId,
    details: { status },
    ipAddress: req.ip,
  });

  createNotification({
    userId,
    type: "adminAnnouncements",
    title: status === "suspended" ? "Account suspended" : "Account reactivated",
    message:
      status === "suspended"
        ? "Your account has been suspended by an administrator."
        : "Your account has been reactivated by an administrator.",
    link: "/dashboard/settings",
  });

  res.status(200).json({
    success: true,
    message: `User account ${status === "suspended" ? "suspended" : "reactivated"}.`,
  });
}

// PATCH /api/admin/sellers/:userId/verify
export function adminVerifySeller(
  req: AuthenticatedRequest,
  res: Response
): void {
  const userId = String(req.params.userId);
  const verificationStatus = String(req.body?.verificationStatus ?? "").trim();

  if (
    verificationStatus !== "verified" &&
    verificationStatus !== "pending" &&
    verificationStatus !== "unverified"
  ) {
    res.status(400).json({
      success: false,
      message: "Invalid verificationStatus.",
    });
    return;
  }

  const now = new Date().toISOString();
  db.prepare<[string, string, string]>(
    "UPDATE seller_profiles SET verificationStatus = ?, updatedAt = ? WHERE userId = ?"
  ).run(verificationStatus, now, userId);

  if (verificationStatus === "verified") {
    db.prepare<[string, string]>(
      "UPDATE users SET emailVerified = 1, updatedAt = ? WHERE id = ?"
    ).run(now, userId);
  }

  recalculateUserTrustScore(
    userId,
    `Seller verification status updated to ${verificationStatus}`
  );

  recordAuditLog({
    actorId: req.user?.id ?? null,
    action: "SELLER_VERIFICATION_UPDATED",
    targetType: "seller_profile",
    targetId: userId,
    details: { verificationStatus },
    ipAddress: req.ip,
  });

  res.status(200).json({
    success: true,
    message: "Seller verification status updated.",
  });
}

// GET /api/admin/security
export function adminListSecurityData(
  _req: AuthenticatedRequest,
  res: Response
): void {
  const events = db
    .prepare<[], Record<string, unknown>>(
      `SELECT se.*, u.fullName AS userName, u.email AS userEmail
       FROM security_events se
       LEFT JOIN users u ON u.id = se.userId
       ORDER BY se.createdAt DESC
       LIMIT 100`
    )
    .all()
    .map((e) => {
      let metadata = {};
      try {
        metadata = JSON.parse(String(e.metadataJson || "{}"));
      } catch {
        metadata = {};
      }
      return { ...e, metadata };
    });

  const reports = db
    .prepare<[], Record<string, unknown>>(
      `SELECT ar.*,
              rep.fullName AS reporterName,
              tgt.fullName AS reportedUserName,
              tgt.email AS reportedUserEmail
       FROM account_reports ar
       JOIN users rep ON rep.id = ar.reporterId
       JOIN users tgt ON tgt.id = ar.reportedUserId
       ORDER BY ar.createdAt DESC
       LIMIT 100`
    )
    .all();

  const conversations = db
    .prepare<[], Record<string, unknown>>(
      `SELECT c.*, b.fullName AS buyerName, s.fullName AS sellerName,
              (SELECT COUNT(*) FROM messages m WHERE m.conversationId = c.id) AS messageCount
       FROM conversations c
       JOIN users b ON b.id = c.buyerId
       JOIN users s ON s.id = c.sellerId
       ORDER BY c.reportedFlag DESC, c.updatedAt DESC
       LIMIT 100`
    )
    .all();

  const auditLogs = db
    .prepare<[], Record<string, unknown>>(
      `SELECT al.*, u.fullName AS actorName, u.email AS actorEmail
       FROM audit_logs al
       LEFT JOIN users u ON u.id = al.actorId
       ORDER BY al.createdAt DESC
       LIMIT 100`
    )
    .all();

  const policies = db
    .prepare<[], Record<string, unknown>>(
      "SELECT * FROM platform_policies ORDER BY key ASC"
    )
    .all();

  res.status(200).json({
    success: true,
    data: {
      events,
      reports,
      conversations,
      auditLogs,
      policies,
    },
  });
}

// PATCH /api/admin/security/:id
export function adminUpdateSecurityEvent(
  req: AuthenticatedRequest,
  res: Response
): void {
  const id = String(req.params.id);
  const status = String(req.body?.status ?? "").trim();
  const reviewNotes = String(req.body?.reviewNotes ?? "").trim();

  const allowed = [
    "PENDING_REVIEW",
    "UNDER_INVESTIGATION",
    "RESOLVED",
    "DISMISSED",
  ];
  if (!allowed.includes(status)) {
    res.status(400).json({ success: false, message: "Invalid event status." });
    return;
  }

  const event = db
    .prepare<[string], { id: string; userId: string | null }>(
      "SELECT id, userId FROM security_events WHERE id = ?"
    )
    .get(id);

  if (!event) {
    res.status(404).json({ success: false, message: "Security event not found." });
    return;
  }

  const now = new Date().toISOString();
  db.prepare<[string, string | null, string, string, string]>(
    `UPDATE security_events
     SET status = ?, reviewedBy = ?, reviewNotes = ?, updatedAt = ?
     WHERE id = ?`
  ).run(status, req.user?.id ?? null, reviewNotes, now, id);

  if (event.userId) {
    recalculateUserTrustScore(
      event.userId,
      `Security event marked ${status} by administrator`
    );
  }

  recordAuditLog({
    actorId: req.user?.id ?? null,
    action: "SECURITY_EVENT_REVIEWED",
    targetType: "security_event",
    targetId: id,
    details: { status, reviewNotes },
    ipAddress: req.ip,
  });

  res.status(200).json({
    success: true,
    message: "Security event updated.",
  });
}

// PATCH /api/admin/reports/:id
export function adminUpdateReport(
  req: AuthenticatedRequest,
  res: Response
): void {
  const id = String(req.params.id);
  const status = String(req.body?.status ?? "").trim();
  if (status !== "REVIEWED" && status !== "DISMISSED" && status !== "PENDING_REVIEW") {
    res.status(400).json({ success: false, message: "Invalid report status." });
    return;
  }

  const report = db
    .prepare<[string], { id: string; reportedUserId: string }>(
      "SELECT id, reportedUserId FROM account_reports WHERE id = ?"
    )
    .get(id);

  if (!report) {
    res.status(404).json({ success: false, message: "Report not found." });
    return;
  }

  const now = new Date().toISOString();
  db.prepare<[string, string | null, string, string]>(
    "UPDATE account_reports SET status = ?, reviewedBy = ?, updatedAt = ? WHERE id = ?"
  ).run(status, req.user?.id ?? null, now, id);

  recalculateUserTrustScore(
    report.reportedUserId,
    `Account report status updated to ${status}`
  );

  recordAuditLog({
    actorId: req.user?.id ?? null,
    action: "ACCOUNT_REPORT_UPDATED",
    targetType: "account_report",
    targetId: id,
    details: { status },
    ipAddress: req.ip,
  });

  res.status(200).json({
    success: true,
    message: "Report status updated.",
  });
}

// GET /api/admin/disputes
export function adminListDisputes(
  _req: AuthenticatedRequest,
  res: Response
): void {
  const disputes = db
    .prepare<[], Record<string, unknown>>(
      `SELECT d.*, b.fullName AS buyerName, s.fullName AS sellerName
       FROM disputes d
       JOIN users b ON b.id = d.buyerId
       JOIN users s ON s.id = d.sellerId
       ORDER BY d.updatedAt DESC`
    )
    .all()
    .map((d) => {
      let evidence: string[] = [];
      try {
        evidence = JSON.parse(String(d.evidenceJson || "[]"));
      } catch {
        evidence = [];
      }
      return { ...d, evidence };
    });

  res.status(200).json({
    success: true,
    disputes,
  });
}

// PATCH /api/admin/disputes/:id
export function adminUpdateDispute(
  req: AuthenticatedRequest,
  res: Response
): void {
  const id = String(req.params.id);
  const status = String(req.body?.status ?? "").trim();
  const resolutionNotes = String(req.body?.resolutionNotes ?? "").trim();

  const allowed = [
    "OPEN",
    "UNDER_REVIEW",
    "WAITING_FOR_RESPONSE",
    "RESOLVED",
    "REJECTED",
  ];
  if (!allowed.includes(status)) {
    res.status(400).json({ success: false, message: "Invalid dispute status." });
    return;
  }

  const dispute = db
    .prepare<
      [string],
      { id: string; buyerId: string; sellerId: string; subject: string }
    >("SELECT id, buyerId, sellerId, subject FROM disputes WHERE id = ?")
    .get(id);

  if (!dispute) {
    res.status(404).json({ success: false, message: "Dispute not found." });
    return;
  }

  const now = new Date().toISOString();
  db.prepare<[string, string, string | null, string, string]>(
    `UPDATE disputes
     SET status = ?, resolutionNotes = ?, resolvedBy = ?, updatedAt = ?
     WHERE id = ?`
  ).run(status, resolutionNotes, req.user?.id ?? null, now, id);

  recalculateUserTrustScore(
    dispute.buyerId,
    `Dispute ${dispute.subject} updated to ${status}`
  );
  recalculateUserTrustScore(
    dispute.sellerId,
    `Dispute ${dispute.subject} updated to ${status}`
  );

  for (const uid of [dispute.buyerId, dispute.sellerId]) {
    createNotification({
      userId: uid,
      type: "disputeUpdates",
      title: `Dispute status: ${status.replace(/_/g, " ")}`,
      message: resolutionNotes
        ? `${dispute.subject}: ${resolutionNotes}`
        : `Your dispute "${dispute.subject}" is now ${status.replace(/_/g, " ")}.`,
      link: "/dashboard/disputes",
    });
  }

  recordAuditLog({
    actorId: req.user?.id ?? null,
    action: "DISPUTE_STATUS_UPDATED",
    targetType: "dispute",
    targetId: id,
    details: { status, resolutionNotes },
    ipAddress: req.ip,
  });

  res.status(200).json({
    success: true,
    message: "Dispute updated.",
  });
}

// PUT /api/admin/policies/:key
export function adminUpdatePolicy(
  req: AuthenticatedRequest,
  res: Response
): void {
  const key = String(req.params.key);
  const value = String(req.body?.value ?? "").trim();

  if (!value) {
    res.status(400).json({ success: false, message: "Policy value is required." });
    return;
  }

  const existing = db
    .prepare<[string], { key: string }>(
      "SELECT key FROM platform_policies WHERE key = ?"
    )
    .get(key);

  if (!existing) {
    res.status(404).json({ success: false, message: "Policy not found." });
    return;
  }

  const now = new Date().toISOString();
  db.prepare<[string, string | null, string, string]>(
    "UPDATE platform_policies SET value = ?, updatedBy = ?, updatedAt = ? WHERE key = ?"
  ).run(value, req.user?.id ?? null, now, key);

  recordAuditLog({
    actorId: req.user?.id ?? null,
    action: "PLATFORM_POLICY_UPDATED",
    targetType: "policy",
    targetId: key,
    details: { value },
    ipAddress: req.ip,
  });

  res.status(200).json({
    success: true,
    message: "Platform policy updated.",
  });
}
