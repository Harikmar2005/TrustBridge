import { Response } from "express";
import {
  getNexconnRuntimeConfig,
  isNexconnConfigured,
  issueNexconnUserToken,
  NexconnNotConfiguredError,
  NexconnUpstreamError,
  toNexconnUserId,
} from "../services/nexconn.service";
import { createSecurityEventAndAlert } from "../services/security.service";
import { AuthenticatedRequest } from "../types/auth";

// GET /api/chat/token
export async function getChatToken(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const user = req.user;
  if (!user) {
    res.status(401).json({
      success: false,
      message: "Authentication required. Please sign in.",
    });
    return;
  }

  // Reject any attempt to specify another user's ID
  const requestedUserId =
    typeof req.query.userId === "string"
      ? req.query.userId.trim()
      : typeof req.query.targetUserId === "string"
        ? req.query.targetUserId.trim()
        : "";

  if (requestedUserId && requestedUserId !== user.id) {
    createSecurityEventAndAlert({
      userId: user.id,
      eventType: "UNAUTHORIZED_CHAT_TOKEN_REQUEST",
      severity: "HIGH",
      description: `User ${user.email} attempted to request a chat token for another user ID (${requestedUserId}).`,
      metadata: { actorId: user.id, requestedUserId },
    });

    res.status(403).json({
      success: false,
      message: "Access denied. Cannot issue a chat token for another user.",
    });
    return;
  }

  if (user.role !== "buyer" && user.role !== "seller" && user.role !== "admin") {
    res.status(403).json({
      success: false,
      message: "Access denied. Invalid account role.",
    });
    return;
  }

  try {
    const result = await issueNexconnUserToken({
      trustBridgeUserId: user.id,
      fullName: user.fullName,
    });

    res.status(200).json({
      success: true,
      token: result.token,
      nexconnUserId: result.nexconnUserId,
      appKey: result.appKey,
      areaCode: result.areaCode,
    });
  } catch (error) {
    if (error instanceof NexconnNotConfiguredError) {
      res.status(503).json({
        success: false,
        code: "NEXCONN_NOT_CONFIGURED",
        message: error.message,
      });
      return;
    }

    if (error instanceof NexconnUpstreamError) {
      res.status(error.statusCode).json({
        success: false,
        code: "NEXCONN_TOKEN_FAILED",
        message: error.message,
      });
      return;
    }

    console.error("Unexpected chat token error:", error);
    res.status(500).json({
      success: false,
      code: "CHAT_TOKEN_ERROR",
      message: "Unable to initialize chat session.",
    });
  }
}

// GET /api/chat/status
export function getChatStatus(
  req: AuthenticatedRequest,
  res: Response
): void {
  const user = req.user;
  if (!user) {
    res.status(401).json({
      success: false,
      message: "Authentication required. Please sign in.",
    });
    return;
  }

  const config = getNexconnRuntimeConfig();
  res.status(200).json({
    success: true,
    configured: isNexconnConfigured(config),
    areaCode: config.areaCode,
    nexconnUserId: toNexconnUserId(user.id),
  });
}
