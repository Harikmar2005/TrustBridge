import crypto from "crypto";
import { Response } from "express";
import { db } from "../config/database";
import { analyzeMessageForFraud } from "../services/fraud.rules";
import { createNotification } from "../services/notification.service";
import { createSecurityEventAndAlert } from "../services/security.service";
import { getTranslationProvider } from "../services/translation.service";
import { recalculateUserTrustScore } from "../services/trust.service";
import { emitToConversation, emitToUser } from "../socket";
import { AuthenticatedRequest } from "../types/auth";

interface Recipient {
  id: string;
  fullName: string;
  role: "buyer" | "seller" | "admin";
  status: string;
}

interface ConversationRecord {
  id: string;
  buyerId: string;
  sellerId: string;
  status: string;
}

// GET /api/messages/conversations
export function getConversations(
  req: AuthenticatedRequest,
  res: Response
): void {
  const user = req.user;
  if (!user) {
    res.status(401).json({ success: false, message: "Authentication required." });
    return;
  }

  const conversations = db
    .prepare<
      [string, string, string, string, string, string, string, string],
      Record<string, unknown>
    >(
      `SELECT
         c.id,
         c.buyerId,
         c.sellerId,
         c.status,
         c.reportedFlag,
         c.createdAt,
         COALESCE(NULLIF(c.updatedAt, ''), c.createdAt) AS updatedAt,

         CASE WHEN c.buyerId = ? THEN seller.id ELSE buyer.id END AS participantId,
         CASE WHEN c.buyerId = ? THEN seller.fullName ELSE buyer.fullName END AS participantName,
         CASE WHEN c.buyerId = ? THEN seller.role ELSE buyer.role END AS participantRole,
         CASE WHEN c.buyerId = ? THEN sp.businessName ELSE NULL END AS participantBusinessName,

         (
           SELECT CASE WHEN m.isDeleted = 1 THEN 'Message removed by sender' ELSE m.content END
           FROM messages m
           WHERE m.conversationId = c.id
           ORDER BY m.createdAt DESC, m.rowid DESC
           LIMIT 1
         ) AS lastMessage,

         (
           SELECT m.createdAt
           FROM messages m
           WHERE m.conversationId = c.id
           ORDER BY m.createdAt DESC, m.rowid DESC
           LIMIT 1
         ) AS lastMessageAt,

         (
           SELECT COUNT(*)
           FROM messages m
           LEFT JOIN message_reads mr ON mr.messageId = m.id AND mr.userId = ?
           WHERE m.conversationId = c.id
             AND m.senderId != ?
             AND m.isDeleted = 0
             AND mr.id IS NULL
         ) AS unreadCount

       FROM conversations c
       JOIN users buyer ON buyer.id = c.buyerId
       JOIN users seller ON seller.id = c.sellerId
       LEFT JOIN seller_profiles sp ON sp.userId = seller.id
       WHERE c.buyerId = ? OR c.sellerId = ?
       ORDER BY COALESCE(lastMessageAt, c.createdAt) DESC`
    )
    .all(
      user.id,
      user.id,
      user.id,
      user.id,
      user.id,
      user.id,
      user.id,
      user.id
    );

  res.status(200).json({
    success: true,
    conversations,
  });
}

// POST /api/messages/conversations
export function createConversation(
  req: AuthenticatedRequest,
  res: Response
): void {
  const user = req.user;
  if (!user) {
    res.status(401).json({ success: false, message: "Authentication required." });
    return;
  }

  const recipientId =
    typeof req.body?.recipientId === "string"
      ? req.body.recipientId.trim()
      : "";

  if (!recipientId) {
    res.status(400).json({
      success: false,
      message: "A valid recipientId is required.",
    });
    return;
  }

  if (recipientId === user.id) {
    res.status(400).json({
      success: false,
      message: "You cannot start a conversation with yourself.",
    });
    return;
  }

  const recipient = db
    .prepare<[string], Recipient>(
      "SELECT id, fullName, role, status FROM users WHERE id = ?"
    )
    .get(recipientId);

  if (!recipient || recipient.status !== "active") {
    res.status(404).json({
      success: false,
      message: "Recipient account not found.",
    });
    return;
  }

  if (recipient.role === user.role) {
    res.status(400).json({
      success: false,
      message: "Conversations must be between a buyer and a seller.",
    });
    return;
  }

  if (
    (user.role !== "buyer" && user.role !== "seller") ||
    (recipient.role !== "buyer" && recipient.role !== "seller")
  ) {
    res.status(400).json({
      success: false,
      message: "Only buyers and sellers can communicate with each other.",
    });
    return;
  }

  const buyerId = user.role === "buyer" ? user.id : recipient.id;
  const sellerId = user.role === "seller" ? user.id : recipient.id;

  const existing = db
    .prepare<[string, string], ConversationRecord>(
      `SELECT id, buyerId, sellerId, status
       FROM conversations
       WHERE buyerId = ? AND sellerId = ?`
    )
    .get(buyerId, sellerId);

  if (existing) {
    res.status(200).json({
      success: true,
      message: "Conversation already exists.",
      conversationId: existing.id,
    });
    return;
  }

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  db.prepare<[string, string, string, string, string]>(
    `INSERT INTO conversations (id, buyerId, sellerId, status, createdAt, updatedAt)
     VALUES (?, ?, ?, 'active', ?, ?)`
  ).run(id, buyerId, sellerId, createdAt, createdAt);

  res.status(201).json({
    success: true,
    message: "Conversation created successfully.",
    conversationId: id,
  });
}

// GET /api/messages/:id
export function getMessages(req: AuthenticatedRequest, res: Response): void {
  const user = req.user;
  const conversationId = String(req.params.id);

  if (!user) {
    res.status(401).json({ success: false, message: "Authentication required." });
    return;
  }

  const conversation = db
    .prepare<[string], ConversationRecord>(
      `SELECT id, buyerId, sellerId, status
       FROM conversations
       WHERE id = ?`
    )
    .get(conversationId);

  if (!conversation) {
    res.status(404).json({
      success: false,
      message: "Conversation not found.",
    });
    return;
  }

  const isParticipant =
    conversation.buyerId === user.id || conversation.sellerId === user.id;

  if (!isParticipant && user.role !== "admin") {
    createSecurityEventAndAlert({
      userId: user.id,
      eventType: "UNAUTHORIZED_CONVERSATION_ACCESS",
      severity: "HIGH",
      description: `User ${user.email} attempted to access conversation ${conversationId} without membership.`,
      metadata: { conversationId, actorId: user.id },
    });

    res.status(403).json({
      success: false,
      message: "Access denied. You are not a participant in this conversation.",
    });
    return;
  }

  const otherUserId =
    conversation.buyerId === user.id
      ? conversation.sellerId
      : conversation.buyerId;

  const messages = db
    .prepare<
      [string, string],
      {
        id: string;
        conversationId: string;
        senderId: string;
        senderName: string;
        content: string;
        originalLanguage: string | null;
        riskLevel: string;
        isDeleted: number;
        deletedAt: string | null;
        createdAt: string;
        readByOther: number;
      }
    >(
      `SELECT
         m.id,
         m.conversationId,
         m.senderId,
         u.fullName AS senderName,
         CASE WHEN m.isDeleted = 1 THEN '[Message removed by sender]' ELSE m.content END AS content,
         m.originalLanguage,
         m.riskLevel,
         m.isDeleted,
         m.deletedAt,
         m.createdAt,
         EXISTS(
           SELECT 1 FROM message_reads mr
           WHERE mr.messageId = m.id AND mr.userId = ?
         ) AS readByOther
       FROM messages m
       JOIN users u ON u.id = m.senderId
       WHERE m.conversationId = ?
       ORDER BY m.createdAt ASC, m.rowid ASC`
    )
    .all(otherUserId, conversationId)
    .map((m) => ({
      ...m,
      isDeleted: Boolean(m.isDeleted),
      readByOther: Boolean(m.readByOther),
    }));

  res.status(200).json({
    success: true,
    messages,
  });
}

// POST /api/messages/:id
export function sendMessage(req: AuthenticatedRequest, res: Response): void {
  const user = req.user;
  const conversationId = String(req.params.id);

  if (!user) {
    res.status(401).json({ success: false, message: "Authentication required." });
    return;
  }

  const content =
    typeof req.body?.content === "string" ? req.body.content.trim() : "";

  if (!content || content.length > 4000) {
    res.status(400).json({
      success: false,
      message: "Message must contain between 1 and 4000 characters.",
    });
    return;
  }

  const conversation = db
    .prepare<[string], ConversationRecord>(
      `SELECT id, buyerId, sellerId, status
       FROM conversations
       WHERE id = ?`
    )
    .get(conversationId);

  if (!conversation) {
    res.status(404).json({
      success: false,
      message: "Conversation not found.",
    });
    return;
  }

  if (conversation.buyerId !== user.id && conversation.sellerId !== user.id) {
    createSecurityEventAndAlert({
      userId: user.id,
      eventType: "UNAUTHORIZED_MESSAGE_SEND",
      severity: "HIGH",
      description: `User ${user.email} attempted to send a message to unauthorized conversation ${conversationId}.`,
      metadata: { conversationId, actorId: user.id },
    });

    res.status(403).json({
      success: false,
      message: "Access denied. You are not a participant in this conversation.",
    });
    return;
  }

  const oneMinAgo = new Date(Date.now() - 60 * 1000).toISOString();
  const recentCount =
    db
      .prepare<[string, string], { cnt: number }>(
        "SELECT COUNT(*) AS cnt FROM messages WHERE senderId = ? AND createdAt >= ?"
      )
      .get(user.id, oneMinAgo)?.cnt ?? 0;

  const burstPolicy = db
    .prepare<[string], { value: string }>(
      "SELECT value FROM platform_policies WHERE key = ?"
    )
    .get("message_burst_threshold");

  const analysis = analyzeMessageForFraud({
    content,
    recentMessageCountLastMinute: recentCount + 1,
    burstThreshold: Number.parseInt(burstPolicy?.value ?? "6", 10) || 6,
  });

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  db.transaction(() => {
    db.prepare<[string, string, string, string, string, string]>(
      `INSERT INTO messages (id, conversationId, senderId, content, riskLevel, isDeleted, createdAt)
       VALUES (?, ?, ?, ?, ?, 0, ?)`
    ).run(id, conversationId, user.id, content, analysis.riskLevel, createdAt);

    db.prepare<[string, string, string]>(
      `UPDATE conversations
       SET updatedAt = ?,
           status = CASE WHEN ? IN ('HIGH', 'CRITICAL') THEN 'flagged' ELSE status END
       WHERE id = ?`
    ).run(createdAt, analysis.riskLevel, conversationId);
  });

  const recipientId =
    conversation.buyerId === user.id
      ? conversation.sellerId
      : conversation.buyerId;

  if (analysis.flagged && analysis.riskLevel !== "LOW") {
    createSecurityEventAndAlert({
      userId: user.id,
      notifyUserId: recipientId,
      eventType: analysis.eventType ?? "SUSPICIOUS_MESSAGE",
      severity: analysis.riskLevel === "NONE" ? "MEDIUM" : analysis.riskLevel,
      description: analysis.description,
      metadata: {
        conversationId,
        messageId: id,
        matches: analysis.matches.map((m) => m.ruleId),
      },
      alertTitle: "Automated risk advisory in conversation",
      alertMessage:
        "A message in your conversation matched rule-based safety patterns (such as off-platform payment or urgency coercion). Exercise caution.",
    });
  }

  createNotification({
    userId: recipientId,
    type: "newMessages",
    title: `New message from ${user.fullName}`,
    message: content.slice(0, 120),
    link: `/dashboard/messages/${conversationId}`,
  });

  recalculateUserTrustScore(user.id, "Message sent in conversation");

  const payload = {
    id,
    conversationId,
    senderId: user.id,
    senderName: user.fullName,
    content,
    riskLevel: analysis.riskLevel,
    isDeleted: false,
    readByOther: false,
    createdAt,
  };

  emitToConversation(conversationId, "message:new", payload);
  emitToUser(recipientId, "notification:new", {
    conversationId,
    senderName: user.fullName,
    preview: content.slice(0, 120),
  });

  res.status(201).json({
    success: true,
    message: "Message sent successfully.",
    data: payload,
    safetyNotice: analysis.flagged ? analysis.description : undefined,
  });
}

// PATCH /api/messages/:id/read
export function markConversationRead(
  req: AuthenticatedRequest,
  res: Response
): void {
  const user = req.user;
  const conversationId = String(req.params.id);

  if (!user) {
    res.status(401).json({ success: false, message: "Authentication required." });
    return;
  }

  const conversation = db
    .prepare<[string], ConversationRecord>(
      "SELECT id, buyerId, sellerId, status FROM conversations WHERE id = ?"
    )
    .get(conversationId);

  if (!conversation) {
    res.status(404).json({ success: false, message: "Conversation not found." });
    return;
  }

  if (conversation.buyerId !== user.id && conversation.sellerId !== user.id) {
    res.status(403).json({ success: false, message: "Access denied." });
    return;
  }

  const unreadMessages = db
    .prepare<[string, string, string], { id: string }>(
      `SELECT m.id FROM messages m
       LEFT JOIN message_reads mr ON mr.messageId = m.id AND mr.userId = ?
       WHERE m.conversationId = ? AND m.senderId != ? AND mr.id IS NULL`
    )
    .all(user.id, conversationId, user.id);

  const now = new Date().toISOString();
  db.transaction(() => {
    const insertRead = db.prepare<[string, string, string, string, string]>(
      `INSERT OR IGNORE INTO message_reads (id, messageId, conversationId, userId, readAt)
       VALUES (?, ?, ?, ?, ?)`
    );
    for (const msg of unreadMessages) {
      insertRead.run(crypto.randomUUID(), msg.id, conversationId, user.id, now);
    }
  });

  emitToConversation(conversationId, "conversation:read", {
    conversationId,
    readerId: user.id,
    readAt: now,
  });

  res.status(200).json({
    success: true,
    markedCount: unreadMessages.length,
  });
}

// DELETE /api/messages/:messageId
// Deletion policy: Only the original sender may soft-delete their own message;
// soft deletion preserves conversation audit integrity for disputes.
export function deleteMessage(req: AuthenticatedRequest, res: Response): void {
  const user = req.user;
  const messageId = String(req.params.messageId);

  if (!user) {
    res.status(401).json({ success: false, message: "Authentication required." });
    return;
  }

  const message = db
    .prepare<[string], { id: string; conversationId: string; senderId: string; isDeleted: number }>(
      "SELECT id, conversationId, senderId, isDeleted FROM messages WHERE id = ?"
    )
    .get(messageId);

  if (!message) {
    res.status(404).json({ success: false, message: "Message not found." });
    return;
  }

  if (message.senderId !== user.id) {
    res.status(403).json({
      success: false,
      message: "You can only delete messages that you sent.",
    });
    return;
  }

  if (message.isDeleted) {
    res.status(200).json({ success: true, message: "Message already deleted." });
    return;
  }

  const now = new Date().toISOString();
  db.prepare<[string, string]>(
    "UPDATE messages SET isDeleted = 1, deletedAt = ? WHERE id = ?"
  ).run(now, messageId);

  emitToConversation(message.conversationId, "message:deleted", {
    messageId,
    conversationId: message.conversationId,
    deletedAt: now,
  });

  res.status(200).json({
    success: true,
    message: "Message removed from conversation view (audit record preserved).",
  });
}

// POST /api/messages/:messageId/translate
export async function translateMessage(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const user = req.user;
  const messageId = String(req.params.messageId);
  const targetLanguage =
    typeof req.body?.targetLanguage === "string"
      ? req.body.targetLanguage.trim().toLowerCase()
      : user?.preferredLanguage || "en";

  if (!user) {
    res.status(401).json({ success: false, message: "Authentication required." });
    return;
  }

  const row = db
    .prepare<
      [string],
      {
        id: string;
        content: string;
        isDeleted: number;
        buyerId: string;
        sellerId: string;
      }
    >(
      `SELECT m.id, m.content, m.isDeleted, c.buyerId, c.sellerId
       FROM messages m
       JOIN conversations c ON c.id = m.conversationId
       WHERE m.id = ?`
    )
    .get(messageId);

  if (!row) {
    res.status(404).json({ success: false, message: "Message not found." });
    return;
  }

  if (row.buyerId !== user.id && row.sellerId !== user.id && user.role !== "admin") {
    res.status(403).json({ success: false, message: "Access denied." });
    return;
  }

  if (row.isDeleted) {
    res.status(400).json({
      success: false,
      message: "Deleted messages cannot be translated.",
    });
    return;
  }

  try {
    const provider = getTranslationProvider();
    const translation = await provider.translate(row.content, targetLanguage);
    res.status(200).json({
      success: true,
      data: translation,
    });
  } catch (error) {
    res.status(502).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Translation provider request failed.",
    });
  }
}
