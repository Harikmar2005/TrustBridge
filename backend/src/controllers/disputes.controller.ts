import crypto from "crypto";
import { Response } from "express";
import { db } from "../config/database";
import { recordAuditLog } from "../services/audit.service";
import { createNotification } from "../services/notification.service";
import { emitToUser } from "../socket";
import { AuthenticatedRequest } from "../types/auth";

// GET /api/disputes
export function listMyDisputes(
  req: AuthenticatedRequest,
  res: Response
): void {
  if (!req.user) {
    res.status(401).json({ success: false, message: "Authentication required." });
    return;
  }

  const disputes = db
    .prepare<[string, string], Record<string, unknown>>(
      `SELECT d.*,
              b.fullName AS buyerName,
              s.fullName AS sellerName
       FROM disputes d
       JOIN users b ON b.id = d.buyerId
       JOIN users s ON s.id = d.sellerId
       WHERE d.buyerId = ? OR d.sellerId = ?
       ORDER BY d.updatedAt DESC`
    )
    .all(req.user.id, req.user.id)
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

// POST /api/disputes
export function createDispute(
  req: AuthenticatedRequest,
  res: Response
): void {
  if (!req.user) {
    res.status(401).json({ success: false, message: "Authentication required." });
    return;
  }

  if (req.user.role !== "buyer" && req.user.role !== "seller") {
    res.status(403).json({
      success: false,
      message: "Only buyers or sellers can open transaction disputes.",
    });
    return;
  }

  const counterpartyId = String(req.body?.counterpartyId ?? "").trim();
  const conversationId = req.body?.conversationId
    ? String(req.body.conversationId).trim()
    : null;
  const category = String(req.body?.category ?? "").trim();
  const subject = String(req.body?.subject ?? "").trim();
  const description = String(req.body?.description ?? "").trim();
  const evidence = Array.isArray(req.body?.evidence)
    ? req.body.evidence.map((item: unknown) => String(item).trim()).filter(Boolean)
    : [];

  if (!counterpartyId || category.length < 2 || subject.length < 4 || description.length < 15) {
    res.status(400).json({
      success: false,
      message:
        "Counterparty, category, subject (min 4 chars), and description (min 15 chars) are required.",
    });
    return;
  }

  if (counterpartyId === req.user.id) {
    res.status(400).json({
      success: false,
      message: "You cannot open a dispute against yourself.",
    });
    return;
  }

  const counterparty = db
    .prepare<[string], { id: string; fullName: string; role: string }>(
      "SELECT id, fullName, role FROM users WHERE id = ?"
    )
    .get(counterpartyId);

  if (!counterparty || counterparty.role === req.user.role || counterparty.role === "admin") {
    res.status(400).json({
      success: false,
      message: "Disputes must involve a valid buyer and seller counterparty.",
    });
    return;
  }

  const buyerId = req.user.role === "buyer" ? req.user.id : counterparty.id;
  const sellerId = req.user.role === "seller" ? req.user.id : counterparty.id;

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  db.prepare<
    [string, string | null, string, string, string, string, string, string, string, string, string]
  >(
    `INSERT INTO disputes (id, conversationId, buyerId, sellerId, openedBy, category, subject, description, evidenceJson, status, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', ?, ?)`
  ).run(
    id,
    conversationId,
    buyerId,
    sellerId,
    req.user.id,
    category,
    subject,
    description,
    JSON.stringify(evidence),
    now,
    now
  );

  createNotification({
    userId: counterparty.id,
    type: "disputeUpdates",
    title: "New transaction dispute opened",
    message: `${req.user.fullName} opened a dispute: ${subject}`,
    link: "/dashboard/disputes",
  });

  emitToUser(counterparty.id, "notification:new", {
    title: "New dispute opened",
    subject,
  });

  recordAuditLog({
    actorId: req.user.id,
    action: "DISPUTE_CREATED",
    targetType: "dispute",
    targetId: id,
    details: { category, counterpartyId },
    ipAddress: req.ip,
  });

  res.status(201).json({
    success: true,
    message: "Dispute submitted successfully.",
    disputeId: id,
  });
}

// GET /api/disputes/:id
export function getDisputeDetails(
  req: AuthenticatedRequest,
  res: Response
): void {
  if (!req.user) {
    res.status(401).json({ success: false, message: "Authentication required." });
    return;
  }

  const disputeId = String(req.params.id);
  const dispute = db
    .prepare<[string], Record<string, unknown>>(
      `SELECT d.*, b.fullName AS buyerName, s.fullName AS sellerName
       FROM disputes d
       JOIN users b ON b.id = d.buyerId
       JOIN users s ON s.id = d.sellerId
       WHERE d.id = ?`
    )
    .get(disputeId);

  if (!dispute) {
    res.status(404).json({ success: false, message: "Dispute not found." });
    return;
  }

  if (
    dispute.buyerId !== req.user.id &&
    dispute.sellerId !== req.user.id &&
    req.user.role !== "admin"
  ) {
    res.status(403).json({ success: false, message: "Access denied." });
    return;
  }

  const responses = db
    .prepare<[string], Record<string, unknown>>(
      `SELECT dr.*, u.fullName AS authorName
       FROM dispute_responses dr
       JOIN users u ON u.id = dr.authorId
       WHERE dr.disputeId = ?
       ORDER BY dr.createdAt ASC`
    )
    .all(disputeId);

  let evidence: string[] = [];
  try {
    evidence = JSON.parse(String(dispute.evidenceJson || "[]"));
  } catch {
    evidence = [];
  }

  res.status(200).json({
    success: true,
    data: {
      dispute: { ...dispute, evidence },
      responses,
    },
  });
}

// POST /api/disputes/:id/responses
export function addDisputeResponse(
  req: AuthenticatedRequest,
  res: Response
): void {
  if (!req.user) {
    res.status(401).json({ success: false, message: "Authentication required." });
    return;
  }

  const disputeId = String(req.params.id);
  const message = String(req.body?.message ?? "").trim();
  const evidenceText = req.body?.evidenceText
    ? String(req.body.evidenceText).trim()
    : null;

  if (message.length < 3) {
    res.status(400).json({
      success: false,
      message: "Response message must contain at least 3 characters.",
    });
    return;
  }

  const dispute = db
    .prepare<[string], { id: string; buyerId: string; sellerId: string; status: string }>(
      "SELECT id, buyerId, sellerId, status FROM disputes WHERE id = ?"
    )
    .get(disputeId);

  if (!dispute) {
    res.status(404).json({ success: false, message: "Dispute not found." });
    return;
  }

  if (
    dispute.buyerId !== req.user.id &&
    dispute.sellerId !== req.user.id &&
    req.user.role !== "admin"
  ) {
    res.status(403).json({ success: false, message: "Access denied." });
    return;
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  db.transaction(() => {
    db.prepare<
      [string, string, string, string, string, string | null, string]
    >(
      `INSERT INTO dispute_responses (id, disputeId, authorId, authorRole, message, evidenceText, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(id, disputeId, req.user!.id, req.user!.role, message, evidenceText, now);

    db.prepare<[string, string]>(
      "UPDATE disputes SET updatedAt = ? WHERE id = ?"
    ).run(now, disputeId);
  });

  const recipients = [dispute.buyerId, dispute.sellerId].filter(
    (uid) => uid !== req.user!.id
  );
  for (const uid of recipients) {
    createNotification({
      userId: uid,
      type: "disputeUpdates",
      title: "New dispute response",
      message: `${req.user.fullName} replied on a dispute.`,
      link: "/dashboard/disputes",
    });
  }

  res.status(201).json({
    success: true,
    message: "Response added to dispute.",
    responseId: id,
  });
}
