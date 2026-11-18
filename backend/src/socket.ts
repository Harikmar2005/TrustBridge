import { Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { db } from "./config/database";
import { mapUserRowToAuthUser } from "./middleware/authenticate";
import { createNotification } from "./services/notification.service";
import { analyzeMessageForFraud } from "./services/fraud.rules";
import { createSecurityEventAndAlert } from "./services/security.service";
import { recalculateUserTrustScore } from "./services/trust.service";
import { UserRow } from "./types/auth";
import { extractTokenFromCookieHeader, verifyToken } from "./utils/token";
import crypto from "crypto";

let ioInstance: SocketIOServer | null = null;

export function getSocketIO(): SocketIOServer | null {
  return ioInstance;
}

export function emitToConversation(
  conversationId: string,
  event: string,
  payload: unknown
): void {
  ioInstance?.to(`conv:${conversationId}`).emit(event, payload);
}

export function emitToUser(
  userId: string,
  event: string,
  payload: unknown
): void {
  ioInstance?.to(`user:${userId}`).emit(event, payload);
}

export function initSocketServer(httpServer: HttpServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: true,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    try {
      const cookieToken = extractTokenFromCookieHeader(
        socket.handshake.headers.cookie
      );
      const authToken =
        typeof socket.handshake.auth?.token === "string"
          ? socket.handshake.auth.token
          : null;
      const token = cookieToken || authToken;

      if (!token) {
        return next(new Error("Authentication required"));
      }

      const payload = verifyToken(token);

      if (payload.jti) {
        const session = db
          .prepare<[string, string], { isRevoked: number; expiresAt: string }>(
            "SELECT isRevoked, expiresAt FROM user_sessions WHERE id = ? AND userId = ?"
          )
          .get(payload.jti, payload.userId);
        if (
          !session ||
          session.isRevoked === 1 ||
          new Date(session.expiresAt).getTime() <= Date.now()
        ) {
          return next(new Error("Session invalid or expired"));
        }
      }

      const userRow = db
        .prepare<[string], UserRow>("SELECT * FROM users WHERE id = ?")
        .get(payload.userId);
      if (!userRow || userRow.status === "suspended") {
        return next(new Error("Account unavailable"));
      }

      socket.data.user = mapUserRowToAuthUser(userRow);
      next();
    } catch {
      next(new Error("Invalid authentication token"));
    }
  });

  io.on("connection", (socket) => {
    const user = socket.data.user as ReturnType<typeof mapUserRowToAuthUser>;
    socket.join(`user:${user.id}`);

    socket.on("conversation:join", (conversationId: string) => {
      if (typeof conversationId !== "string" || !conversationId) return;
      const conv = db
        .prepare<[string], { id: string; buyerId: string; sellerId: string }>(
          "SELECT id, buyerId, sellerId FROM conversations WHERE id = ?"
        )
        .get(conversationId);

      if (
        conv &&
        (conv.buyerId === user.id ||
          conv.sellerId === user.id ||
          user.role === "admin")
      ) {
        socket.join(`conv:${conversationId}`);
      } else {
        socket.emit("error:unauthorized", {
          message: "Not authorized to join this conversation.",
        });
      }
    });

    socket.on(
      "message:send",
      (
        payload: { conversationId?: string; content?: string },
        ack?: (res: { success: boolean; message?: string; data?: unknown }) => void
      ) => {
        try {
          const conversationId = String(payload?.conversationId || "").trim();
          const content = String(payload?.content || "").trim();

          if (!conversationId || !content || content.length > 4000) {
            ack?.({
              success: false,
              message: "Message must contain between 1 and 4000 characters.",
            });
            return;
          }

          const conv = db
            .prepare<[string], { id: string; buyerId: string; sellerId: string }>(
              "SELECT id, buyerId, sellerId FROM conversations WHERE id = ?"
            )
            .get(conversationId);

          if (!conv) {
            ack?.({ success: false, message: "Conversation not found." });
            return;
          }

          if (conv.buyerId !== user.id && conv.sellerId !== user.id) {
            ack?.({
              success: false,
              message: "Access denied. Not a conversation participant.",
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

          // Persist BEFORE broadcasting
          db.transaction(() => {
            db.prepare<[string, string, string, string, string, string]>(
              `INSERT INTO messages (id, conversationId, senderId, content, riskLevel, isDeleted, createdAt)
               VALUES (?, ?, ?, ?, ?, 0, ?)`
            ).run(id, conversationId, user.id, content, analysis.riskLevel, createdAt);

            db.prepare<[string, string, string]>(
              `UPDATE conversations SET updatedAt = ?, status = CASE WHEN ? IN ('HIGH', 'CRITICAL') THEN 'flagged' ELSE status END WHERE id = ?`
            ).run(createdAt, analysis.riskLevel, conversationId);
          });

          const recipientId =
            conv.buyerId === user.id ? conv.sellerId : conv.buyerId;

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
                "A recent message triggered rule-based safety screening. Avoid off-platform payments or unverified links.",
            });
          }

          createNotification({
            userId: recipientId,
            type: "newMessages",
            title: `New message from ${user.fullName}`,
            message: content.slice(0, 120),
            link: `/dashboard/messages/${conversationId}`,
          });

          recalculateUserTrustScore(user.id, "Sent message on platform");

          const messagePayload = {
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

          io.to(`conv:${conversationId}`).emit("message:new", messagePayload);
          io.to(`user:${recipientId}`).emit("notification:new", {
            conversationId,
            senderName: user.fullName,
            preview: content.slice(0, 120),
          });

          ack?.({ success: true, data: messagePayload });
        } catch (err) {
          console.error("Socket message:send error:", err);
          ack?.({ success: false, message: "Failed to send message." });
        }
      }
    );
  });

  ioInstance = io;
  return io;
}
