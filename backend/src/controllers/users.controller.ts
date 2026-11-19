import crypto from "crypto";
import { Request, Response } from "express";
import { db } from "../config/database";
import { mapUserRowToAuthUser } from "../middleware/authenticate";
import { recordAuditLog } from "../services/audit.service";
import { createNotification } from "../services/notification.service";
import { createSecurityEventAndAlert } from "../services/security.service";
import {
  getUserTrustScore,
  recalculateUserTrustScore,
} from "../services/trust.service";
import { AuthenticatedRequest, UserRow } from "../types/auth";

// GET /api/users/dashboard
export function getDashboardSummary(
  req: AuthenticatedRequest,
  res: Response
): void {
  const user = req.user;
  if (!user) {
    res.status(401).json({ success: false, message: "Authentication required." });
    return;
  }

  const totalConversations =
    db
      .prepare<[string, string], { cnt: number }>(
        "SELECT COUNT(*) AS cnt FROM conversations WHERE buyerId = ? OR sellerId = ?"
      )
      .get(user.id, user.id)?.cnt ?? 0;

  const activeConversations =
    db
      .prepare<[string, string], { cnt: number }>(
        `SELECT COUNT(DISTINCT c.id) AS cnt
         FROM conversations c
         JOIN messages m ON m.conversationId = c.id AND m.isDeleted = 0
         WHERE c.buyerId = ? OR c.sellerId = ?`
      )
      .get(user.id, user.id)?.cnt ?? 0;

  const unreadMessages =
    db
      .prepare<[string, string, string, string], { cnt: number }>(
        `SELECT COUNT(*) AS cnt
         FROM messages m
         JOIN conversations c ON c.id = m.conversationId
         LEFT JOIN message_reads mr ON mr.messageId = m.id AND mr.userId = ?
         WHERE (c.buyerId = ? OR c.sellerId = ?)
           AND m.senderId != ?
           AND m.isDeleted = 0
           AND mr.id IS NULL`
      )
      .get(user.id, user.id, user.id, user.id)?.cnt ?? 0;

  const securityAlertsCount =
    db
      .prepare<[string], { cnt: number }>(
        "SELECT COUNT(*) AS cnt FROM security_alerts WHERE userId = ? AND isRead = 0"
      )
      .get(user.id)?.cnt ?? 0;

  const openDisputes =
    db
      .prepare<[string, string], { cnt: number }>(
        `SELECT COUNT(*) AS cnt FROM disputes
         WHERE (buyerId = ? OR sellerId = ?)
           AND status IN ('OPEN', 'UNDER_REVIEW', 'WAITING_FOR_RESPONSE')`
      )
      .get(user.id, user.id)?.cnt ?? 0;

  const trustScore = getUserTrustScore(user.id);

  const recentConversations = db
    .prepare<
      [string, string, string, string, string],
      {
        id: string;
        participantId: string;
        participantName: string;
        participantRole: string;
        lastMessage: string | null;
        lastMessageAt: string | null;
      }
    >(
      `SELECT
         c.id,
         CASE WHEN c.buyerId = ? THEN seller.id ELSE buyer.id END AS participantId,
         CASE WHEN c.buyerId = ? THEN seller.fullName ELSE buyer.fullName END AS participantName,
         CASE WHEN c.buyerId = ? THEN seller.role ELSE buyer.role END AS participantRole,
         (SELECT m.content FROM messages m WHERE m.conversationId = c.id AND m.isDeleted = 0 ORDER BY m.createdAt DESC LIMIT 1) AS lastMessage,
         (SELECT m.createdAt FROM messages m WHERE m.conversationId = c.id AND m.isDeleted = 0 ORDER BY m.createdAt DESC LIMIT 1) AS lastMessageAt
       FROM conversations c
       JOIN users buyer ON buyer.id = c.buyerId
       JOIN users seller ON seller.id = c.sellerId
       WHERE c.buyerId = ? OR c.sellerId = ?
       ORDER BY COALESCE(lastMessageAt, c.createdAt) DESC
       LIMIT 5`
    )
    .all(user.id, user.id, user.id, user.id, user.id);

  const recentAlerts = db
    .prepare<
      [string],
      {
        id: string;
        title: string;
        message: string;
        severity: string;
        isRead: number;
        createdAt: string;
      }
    >(
      `SELECT id, title, message, severity, isRead, createdAt
       FROM security_alerts
       WHERE userId = ?
       ORDER BY createdAt DESC
       LIMIT 4`
    )
    .all(user.id);

  const recentNotifications = db
    .prepare<
      [string],
      {
        id: string;
        type: string;
        title: string;
        message: string;
        link: string | null;
        isRead: number;
        createdAt: string;
      }
    >(
      `SELECT id, type, title, message, link, isRead, createdAt
       FROM notifications
       WHERE userId = ?
       ORDER BY createdAt DESC
       LIMIT 6`
    )
    .all(user.id);

  let sellerProfile = null;
  if (user.role === "seller") {
    sellerProfile =
      db
        .prepare<[string], Record<string, unknown>>(
          "SELECT * FROM seller_profiles WHERE userId = ?"
        )
        .get(user.id) ?? null;
  }

  let recentSellers: Record<string, unknown>[] = [];
  if (user.role === "buyer") {
    recentSellers = db
      .prepare<[], Record<string, unknown>>(
        `SELECT sp.*, u.fullName
         FROM seller_profiles sp
         JOIN users u ON u.id = sp.userId
         WHERE u.status = 'active'
         ORDER BY sp.completedTransactions DESC, sp.createdAt DESC
         LIMIT 4`
      )
      .all()
      .map((s) => ({
        ...s,
        trustScore: getUserTrustScore(String(s.userId)),
      }));
  }

  res.status(200).json({
    success: true,
    data: {
      metrics: {
        totalConversations,
        activeConversations,
        unreadMessages,
        securityAlerts: securityAlertsCount,
        openDisputes,
      },
      trustScore,
      sellerProfile,
      recentConversations,
      recentAlerts,
      recentNotifications,
      recentSellers,
    },
  });
}

// PATCH /api/users/profile
export function updateProfile(req: AuthenticatedRequest, res: Response): void {
  if (!req.user) {
    res.status(401).json({ success: false, message: "Authentication required." });
    return;
  }

  const fullName =
    typeof req.body?.fullName === "string" ? req.body.fullName.trim() : undefined;
  const preferredLanguage =
    typeof req.body?.preferredLanguage === "string"
      ? req.body.preferredLanguage.trim().toLowerCase()
      : undefined;
  const notificationPrefs = req.body?.notificationPrefs;

  if (fullName !== undefined && (fullName.length < 2 || fullName.length > 80)) {
    res.status(400).json({
      success: false,
      message: "Full name must be between 2 and 80 characters.",
    });
    return;
  }

  const current = db
    .prepare<[string], UserRow>("SELECT * FROM users WHERE id = ?")
    .get(req.user.id);

  if (!current) {
    res.status(404).json({ success: false, message: "User not found." });
    return;
  }

  const nextName = fullName ?? current.fullName;
  const nextLang = preferredLanguage ?? current.preferredLanguage;
  let nextPrefsStr = current.notificationPrefs;

  if (notificationPrefs && typeof notificationPrefs === "object") {
    try {
      const existing = JSON.parse(current.notificationPrefs || "{}");
      nextPrefsStr = JSON.stringify({ ...existing, ...notificationPrefs });
    } catch {
      nextPrefsStr = JSON.stringify(notificationPrefs);
    }
  }

  const now = new Date().toISOString();
  db.prepare<[string, string, string, string, string]>(
    `UPDATE users
     SET fullName = ?, preferredLanguage = ?, notificationPrefs = ?, updatedAt = ?
     WHERE id = ?`
  ).run(nextName, nextLang, nextPrefsStr, now, req.user.id);

  recalculateUserTrustScore(req.user.id, "Profile settings updated");

  const updated = db
    .prepare<[string], UserRow>("SELECT * FROM users WHERE id = ?")
    .get(req.user.id)!;

  recordAuditLog({
    actorId: req.user.id,
    action: "PROFILE_UPDATED",
    targetType: "user",
    targetId: req.user.id,
    ipAddress: req.ip,
  });

  res.status(200).json({
    success: true,
    message: "Profile settings updated.",
    user: mapUserRowToAuthUser(updated),
  });
}

// PUT /api/users/seller-profile
export function upsertSellerProfile(
  req: AuthenticatedRequest,
  res: Response
): void {
  if (!req.user) {
    res.status(401).json({ success: false, message: "Authentication required." });
    return;
  }

  if (req.user.role !== "seller") {
    res.status(403).json({
      success: false,
      message: "Only seller accounts can manage a seller business profile.",
    });
    return;
  }

  const businessName = String(req.body?.businessName ?? "").trim();
  const category = String(req.body?.category ?? "").trim();
  const location = String(req.body?.location ?? "").trim();
  const description = String(req.body?.description ?? "").trim();
  const website = String(req.body?.website ?? "").trim();
  const responseTimeLabel =
    String(req.body?.responseTimeLabel ?? "Within 24 hours").trim() ||
    "Within 24 hours";

  if (businessName.length < 2 || category.length < 2 || location.length < 2) {
    res.status(400).json({
      success: false,
      message: "Business name, category, and location are required.",
    });
    return;
  }

  const now = new Date().toISOString();
  const existing = db
    .prepare<[string], { id: string }>(
      "SELECT id FROM seller_profiles WHERE userId = ?"
    )
    .get(req.user.id);

  if (existing) {
    db.prepare<
      [string, string, string, string, string, string, string, string]
    >(
      `UPDATE seller_profiles
       SET businessName = ?, category = ?, location = ?, description = ?, website = ?, responseTimeLabel = ?, updatedAt = ?
       WHERE userId = ?`
    ).run(
      businessName,
      category,
      location,
      description,
      website,
      responseTimeLabel,
      now,
      req.user.id
    );
  } else {
    db.prepare<
      [string, string, string, string, string, string, string, string, string, string]
    >(
      `INSERT INTO seller_profiles (id, userId, businessName, category, location, description, website, verificationStatus, responseTimeLabel, completedTransactions, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, 0, ?, ?)`
    ).run(
      crypto.randomUUID(),
      req.user.id,
      businessName,
      category,
      location,
      description,
      website,
      responseTimeLabel,
      now,
      now
    );
  }

  const trustScore = recalculateUserTrustScore(
    req.user.id,
    "Seller business profile updated"
  );

  const profile = db
    .prepare<[string], Record<string, unknown>>(
      "SELECT * FROM seller_profiles WHERE userId = ?"
    )
    .get(req.user.id);

  res.status(200).json({
    success: true,
    message: "Seller profile saved.",
    data: { ...profile, trustScore },
  });
}

// GET /api/users/sellers
export function listSellers(req: Request, res: Response): void {
  const search =
    typeof req.query.q === "string" ? req.query.q.trim().toLowerCase() : "";
  const category =
    typeof req.query.category === "string"
      ? req.query.category.trim().toLowerCase()
      : "";

  const rows = db
    .prepare<[], Record<string, unknown>>(
      `SELECT sp.*, u.fullName, u.createdAt AS memberSince
       FROM seller_profiles sp
       JOIN users u ON u.id = sp.userId
       WHERE u.role = 'seller' AND u.status = 'active'
       ORDER BY sp.completedTransactions DESC, sp.createdAt DESC`
    )
    .all();

  const filtered = rows
    .filter((row) => {
      if (category && category !== "all") {
        if (String(row.category || "").toLowerCase() !== category) {
          return false;
        }
      }
      if (search) {
        const haystack = `${row.businessName} ${row.fullName} ${row.category} ${row.location} ${row.description}`.toLowerCase();
        return haystack.includes(search);
      }
      return true;
    })
    .map((row) => ({
      ...row,
      trustScore: getUserTrustScore(String(row.userId)),
    }));

  res.status(200).json({
    success: true,
    sellers: filtered,
  });
}

// POST /api/users/report
export function reportAccount(
  req: AuthenticatedRequest,
  res: Response
): void {
  if (!req.user) {
    res.status(401).json({ success: false, message: "Authentication required." });
    return;
  }

  const reportedUserId = String(req.body?.reportedUserId ?? "").trim();
  const conversationId = req.body?.conversationId
    ? String(req.body.conversationId).trim()
    : null;
  const reason = String(req.body?.reason ?? "").trim().slice(0, 120);
  const details = String(req.body?.details ?? "").trim();

  if (
    !reportedUserId ||
    reason.length < 3 ||
    details.length < 10 ||
    details.length > 2000
  ) {
    res.status(400).json({
      success: false,
      message:
        "Reported user, reason (min 3 chars), and detailed explanation (10-2000 chars) are required.",
    });
    return;
  }

  if (reportedUserId === req.user.id) {
    res.status(400).json({
      success: false,
      message: "You cannot report your own account.",
    });
    return;
  }

  const target = db
    .prepare<[string], { id: string; fullName: string }>(
      "SELECT id, fullName FROM users WHERE id = ?"
    )
    .get(reportedUserId);

  if (!target) {
    res.status(404).json({
      success: false,
      message: "Reported account not found.",
    });
    return;
  }

  if (conversationId) {
    const conv = db
      .prepare<[string], { id: string; buyerId: string; sellerId: string }>(
        "SELECT id, buyerId, sellerId FROM conversations WHERE id = ?"
      )
      .get(conversationId);

    if (!conv) {
      res.status(404).json({
        success: false,
        message: "Referenced conversation not found.",
      });
      return;
    }

    const involvesBoth =
      (conv.buyerId === req.user.id && conv.sellerId === reportedUserId) ||
      (conv.sellerId === req.user.id && conv.buyerId === reportedUserId);

    if (!involvesBoth) {
      createSecurityEventAndAlert({
        userId: req.user.id,
        eventType: "UNAUTHORIZED_REPORT_REFERENCE",
        severity: "HIGH",
        description: `User ${req.user.email} attempted to attach report to unauthorized conversation ${conversationId}.`,
        metadata: { conversationId, actorId: req.user.id, reportedUserId },
      });

      res.status(403).json({
        success: false,
        message:
          "Access denied. You can only link reports to conversations you participate in with the reported user.",
      });
      return;
    }
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  db.transaction(() => {
    db.prepare<
      [string, string, string, string | null, string, string, string, string]
    >(
      `INSERT INTO account_reports (id, reporterId, reportedUserId, conversationId, reason, details, status, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, 'PENDING_REVIEW', ?, ?)`
    ).run(
      id,
      req.user!.id,
      reportedUserId,
      conversationId,
      reason,
      details,
      now,
      now
    );

    if (conversationId) {
      db.prepare<[string, string]>(
        "UPDATE conversations SET reportedFlag = 1, updatedAt = ? WHERE id = ?"
      ).run(now, conversationId);
    }

    createSecurityEventAndAlert({
      userId: reportedUserId,
      notifyUserId: req.user!.id,
      eventType: "USER_REPORT_SUBMITTED",
      severity: "MEDIUM",
      description: `Account report submitted by ${req.user!.fullName} regarding ${target.fullName}: ${reason}. Pending administrator review.`,
      metadata: {
        reportId: id,
        reporterId: req.user!.id,
        reportedUserId,
        conversationId,
      },
      alertTitle: "Report received",
      alertMessage:
        "Your report has been logged for administrator review. Unverified reports do not automatically penalize accounts.",
    });
  });

  res.status(201).json({
    success: true,
    message: "Report submitted for administrator review.",
    reportId: id,
  });
}

// POST /api/users/delete-request
export function requestAccountDeletion(
  req: AuthenticatedRequest,
  res: Response
): void {
  if (!req.user) {
    res.status(401).json({ success: false, message: "Authentication required." });
    return;
  }

  const now = new Date().toISOString();
  db.prepare<[string, string, string]>(
    "UPDATE users SET status = 'pending_deletion', deletionRequestedAt = ?, updatedAt = ? WHERE id = ?"
  ).run(now, now, req.user.id);

  recordAuditLog({
    actorId: req.user.id,
    action: "ACCOUNT_DELETION_REQUESTED",
    targetType: "user",
    targetId: req.user.id,
    ipAddress: req.ip,
  });

  createNotification({
    userId: req.user.id,
    type: "accountChanges",
    title: "Account deletion requested",
    message:
      "Your account has been marked pending deletion. Contact an administrator if you wish to cancel this request.",
    link: "/dashboard/settings",
  });

  res.status(200).json({
    success: true,
    message: "Account deletion request recorded.",
  });
}
