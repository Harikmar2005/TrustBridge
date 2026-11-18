import crypto from "crypto";
import { Response } from "express";
import { db } from "../config/database";
import { AuthenticatedRequest } from "../types/auth";

interface Recipient {
  id: string;
  fullName: string;
  role: "buyer" | "seller";
}

interface ConversationSummary {
  id: string;
  buyerId: string;
  sellerId: string;
  createdAt: string;
  participantName: string;
  participantRole: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
}

interface MessageRecord {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
}

interface ConversationRecord {
  id: string;
  buyerId: string;
  sellerId: string;
}

// GET /api/messages/conversations
export function getConversations(
  req: AuthenticatedRequest,
  res: Response
): void {
  const user = req.user;

  if (!user) {
    res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
    return;
  }

  const conversations = db
    .prepare<[string, string, string, string], ConversationSummary>(
      `SELECT
         c.id,
         c.buyerId,
         c.sellerId,
         c.createdAt,

         CASE
           WHEN c.buyerId = ? THEN seller.fullName
           ELSE buyer.fullName
         END AS participantName,

         CASE
           WHEN c.buyerId = ? THEN seller.role
           ELSE buyer.role
         END AS participantRole,

         (
           SELECT m.content
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
         ) AS lastMessageAt

       FROM conversations c

       JOIN users buyer
         ON buyer.id = c.buyerId

       JOIN users seller
         ON seller.id = c.sellerId

       WHERE c.buyerId = ? OR c.sellerId = ?

       ORDER BY COALESCE(lastMessageAt, c.createdAt) DESC`
    )
    .all(user.id, user.id, user.id, user.id);

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
    res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
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

  // Prevent users from creating conversations with themselves
  if (recipientId === user.id) {
    res.status(400).json({
      success: false,
      message: "You cannot start a conversation with yourself.",
    });
    return;
  }

  // Look up recipient
  const recipient = db
    .prepare<[string], Recipient>(
      "SELECT id, fullName, role FROM users WHERE id = ?"
    )
    .get(recipientId);

  if (!recipient) {
    res.status(404).json({
      success: false,
      message: "Recipient account not found.",
    });
    return;
  }

  // Prevent users from creating conversations with users of the same role
  if (recipient.role === user.role) {
    res.status(400).json({
      success: false,
      message: "Conversations must be between a buyer and a seller.",
    });
    return;
  }

  // Enforce buyer-seller pairing
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

  // Prevent duplicate buyer-seller conversations
  const existing = db
    .prepare<[string, string], ConversationRecord>(
      `SELECT id, buyerId, sellerId
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

  db.prepare<[string, string, string, string]>(
    `INSERT INTO conversations (id, buyerId, sellerId, createdAt)
     VALUES (?, ?, ?, ?)`
  ).run(id, buyerId, sellerId, createdAt);

  res.status(201).json({
    success: true,
    message: "Conversation created successfully.",
    conversationId: id,
  });
}

// GET /api/messages/:id
export function getMessages(
  req: AuthenticatedRequest,
  res: Response
): void {
  const user = req.user;
  const conversationId = req.params.id;

  if (!user) {
    res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
    return;
  }

  // Look up conversation
  const conversation = db
    .prepare<[string], ConversationRecord>(
      `SELECT id, buyerId, sellerId
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

  // Authorization check: only participants can view messages
  if (conversation.buyerId !== user.id && conversation.sellerId !== user.id) {
    res.status(403).json({
      success: false,
      message: "Access denied. You are not a participant in this conversation.",
    });
    return;
  }

  const messages = db
    .prepare<[string], MessageRecord>(
      `SELECT
         m.id,
         m.conversationId,
         m.senderId,
         u.fullName AS senderName,
         m.content,
         m.createdAt
       FROM messages m
       JOIN users u
         ON u.id = m.senderId
       WHERE m.conversationId = ?
       ORDER BY m.createdAt ASC, m.rowid ASC`
    )
    .all(conversationId);

  res.status(200).json({
    success: true,
    messages,
  });
}

// POST /api/messages/:id
export function sendMessage(
  req: AuthenticatedRequest,
  res: Response
): void {
  const user = req.user;
  const conversationId = req.params.id;

  if (!user) {
    res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
    return;
  }

  const content =
    typeof req.body?.content === "string" ? req.body.content.trim() : "";

  // Validate message content and enforce a maximum length of 4000 characters
  if (!content || content.length > 4000) {
    res.status(400).json({
      success: false,
      message: "Message must contain between 1 and 4000 characters.",
    });
    return;
  }

  // Look up conversation
  const conversation = db
    .prepare<[string], ConversationRecord>(
      `SELECT id, buyerId, sellerId
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

  // Authorization check: only participants can send messages
  if (conversation.buyerId !== user.id && conversation.sellerId !== user.id) {
    res.status(403).json({
      success: false,
      message: "Access denied. You are not a participant in this conversation.",
    });
    return;
  }

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  db.prepare<[string, string, string, string, string]>(
    `INSERT INTO messages (id, conversationId, senderId, content, createdAt)
     VALUES (?, ?, ?, ?, ?)`
  ).run(id, conversationId, user.id, content, createdAt);

  res.status(201).json({
    success: true,
    message: "Message sent successfully.",
    data: {
      id,
      conversationId,
      senderId: user.id,
      senderName: user.fullName,
      content,
      createdAt,
    },
  });
}

