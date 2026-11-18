import { Response } from "express";
import { db } from "../config/database";
import {
  getUserTrustScore,
  recalculateUserTrustScore,
} from "../services/trust.service";
import { AuthenticatedRequest } from "../types/auth";

// GET /api/trust/me
export function getMyTrustScore(
  req: AuthenticatedRequest,
  res: Response
): void {
  if (!req.user) {
    res.status(401).json({ success: false, message: "Authentication required." });
    return;
  }

  const trustScore = getUserTrustScore(req.user.id);
  const history = db
    .prepare<
      [string],
      {
        id: string;
        delta: number;
        reason: string;
        sourceType: string;
        createdAt: string;
      }
    >(
      `SELECT id, delta, reason, sourceType, createdAt
       FROM trust_score_events
       WHERE userId = ?
       ORDER BY createdAt DESC
       LIMIT 20`
    )
    .all(req.user.id);

  res.status(200).json({
    success: true,
    data: {
      trustScore,
      history,
    },
  });
}

// GET /api/trust/user/:userId
export function getPublicUserTrustScore(
  req: AuthenticatedRequest,
  res: Response
): void {
  const userId = String(req.params.userId);
  const exists = db
    .prepare<[string], { id: string; fullName: string; role: string }>(
      "SELECT id, fullName, role FROM users WHERE id = ?"
    )
    .get(userId);

  if (!exists) {
    res.status(404).json({ success: false, message: "User not found." });
    return;
  }

  res.status(200).json({
    success: true,
    data: {
      userId: exists.id,
      fullName: exists.fullName,
      role: exists.role,
      trustScore: getUserTrustScore(userId),
    },
  });
}

// POST /api/trust/recalculate
export function recalculateMyTrustScore(
  req: AuthenticatedRequest,
  res: Response
): void {
  if (!req.user) {
    res.status(401).json({ success: false, message: "Authentication required." });
    return;
  }

  const trustScore = recalculateUserTrustScore(
    req.user.id,
    "Manual trust score refresh"
  );

  res.status(200).json({
    success: true,
    message: "Trust score evaluated.",
    data: { trustScore },
  });
}
