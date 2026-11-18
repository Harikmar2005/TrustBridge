import crypto from "crypto";
import { db } from "../config/database";
import type { TrustScoreResult } from "../types/domain";
import {
  calculateExplainableTrustScore,
  TRUST_SCORE_DISCLAIMER,
} from "./trust.rules";

export function recalculateUserTrustScore(
  userId: string,
  reason?: string
): TrustScoreResult | null {
  const user = db
    .prepare<
      [string],
      {
        id: string;
        fullName: string;
        role: string;
        emailVerified: number;
        preferredLanguage: string;
        createdAt: string;
      }
    >(
      "SELECT id, fullName, role, emailVerified, preferredLanguage, createdAt FROM users WHERE id = ?"
    )
    .get(userId);

  if (!user) return null;

  const accountAgeMs = Math.max(
    0,
    Date.now() - new Date(user.createdAt).getTime()
  );
  const accountAgeDays = accountAgeMs / (1000 * 60 * 60 * 24);

  let profileCompletenessPct = 50; // fullName + email present
  if (user.preferredLanguage) profileCompletenessPct += 10;
  if (user.emailVerified) profileCompletenessPct += 15;

  let completedTransactions = 0;

  if (user.role === "seller") {
    const sellerProfile = db
      .prepare<
        [string],
        {
          businessName: string;
          category: string;
          location: string;
          description: string;
          website: string;
          completedTransactions: number;
        }
      >(
        "SELECT businessName, category, location, description, website, completedTransactions FROM seller_profiles WHERE userId = ?"
      )
      .get(userId);

    if (sellerProfile) {
      let fields = 0;
      if (sellerProfile.businessName?.trim()) fields++;
      if (sellerProfile.category?.trim()) fields++;
      if (sellerProfile.location?.trim()) fields++;
      if (sellerProfile.description?.trim()) fields++;
      profileCompletenessPct = Math.min(
        100,
        40 + fields * 15
      );
      completedTransactions = sellerProfile.completedTransactions ?? 0;
    } else {
      profileCompletenessPct = 40;
    }
  } else {
    profileCompletenessPct = user.emailVerified ? 90 : 75;
  }

  const messageCount =
    db
      .prepare<[string], { cnt: number }>(
        "SELECT COUNT(*) AS cnt FROM messages WHERE senderId = ? AND isDeleted = 0"
      )
      .get(userId)?.cnt ?? 0;

  const activeConversations =
    db
      .prepare<[string, string], { cnt: number }>(
        "SELECT COUNT(*) AS cnt FROM conversations WHERE buyerId = ? OR sellerId = ?"
      )
      .get(userId, userId)?.cnt ?? 0;

  const confirmedDisputesAgainst =
    db
      .prepare<[string, string, string], { cnt: number }>(
        `SELECT COUNT(*) AS cnt FROM disputes
         WHERE (sellerId = ? OR buyerId = ?)
           AND openedBy != ?
           AND status = 'RESOLVED'`
      )
      .get(userId, userId, userId)?.cnt ?? 0;

  const verifiedSuspiciousEvents =
    db
      .prepare<[string], { cnt: number }>(
        `SELECT COUNT(*) AS cnt FROM security_events
         WHERE userId = ? AND status = 'RESOLVED'`
      )
      .get(userId)?.cnt ?? 0;

  const confirmedPolicyViolations =
    db
      .prepare<[string], { cnt: number }>(
        `SELECT COUNT(*) AS cnt FROM account_reports
         WHERE reportedUserId = ? AND status = 'REVIEWED'`
      )
      .get(userId)?.cnt ?? 0;

  const policyMin = db
    .prepare<[string], { value: string }>(
      "SELECT value FROM platform_policies WHERE key = ?"
    )
    .get("min_trust_data_messages");
  const minInteractionsThreshold =
    Number.parseInt(policyMin?.value ?? "2", 10) || 2;

  const previous = db
    .prepare<[string], { score: number | null }>(
      "SELECT score FROM trust_scores WHERE userId = ?"
    )
    .get(userId);

  const computed = calculateExplainableTrustScore({
    accountAgeDays,
    profileCompletenessPct,
    emailVerified: Boolean(user.emailVerified),
    messageCount,
    activeConversations,
    completedTransactions,
    confirmedDisputesAgainst,
    confirmedPolicyViolations,
    verifiedSuspiciousEvents,
    minInteractionsThreshold,
  });

  db.prepare<[string, number | null, string, string, number, string]>(
    `INSERT INTO trust_scores (userId, score, level, factorsJson, insufficientData, lastUpdated)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(userId) DO UPDATE SET
       score = excluded.score,
       level = excluded.level,
       factorsJson = excluded.factorsJson,
       insufficientData = excluded.insufficientData,
       lastUpdated = excluded.lastUpdated`
  ).run(
    userId,
    computed.score,
    computed.level,
    JSON.stringify(computed.factors),
    computed.insufficientData ? 1 : 0,
    computed.lastUpdated
  );

  if (computed.score !== null && previous?.score !== computed.score) {
    const delta =
      previous?.score !== null && previous?.score !== undefined
        ? computed.score - previous.score
        : computed.score;
    db.prepare<[string, string, number, string, string]>(
      `INSERT INTO trust_score_events (id, userId, delta, reason, sourceType, createdAt)
       VALUES (?, ?, ?, ?, 'RECALCULATION', ?)`
    ).run(
      crypto.randomUUID(),
      userId,
      delta,
      reason ?? "Trust score recalculated from verified platform activity",
      computed.lastUpdated
    );
  }

  return computed;
}

export function getUserTrustScore(userId: string): TrustScoreResult {
  const row = db
    .prepare<
      [string],
      {
        score: number | null;
        level: TrustScoreResult["level"];
        factorsJson: string;
        insufficientData: number;
        lastUpdated: string;
      }
    >(
      "SELECT score, level, factorsJson, insufficientData, lastUpdated FROM trust_scores WHERE userId = ?"
    )
    .get(userId);

  if (!row) {
    return (
      recalculateUserTrustScore(userId, "Initial trust score evaluation") ?? {
        score: null,
        level: "Not enough data",
        insufficientData: true,
        factors: [],
        disclaimer: TRUST_SCORE_DISCLAIMER,
        lastUpdated: new Date().toISOString(),
      }
    );
  }

  let factors = [];
  try {
    factors = JSON.parse(row.factorsJson);
  } catch {
    factors = [];
  }

  return {
    score: row.score,
    level: row.level,
    insufficientData: Boolean(row.insufficientData),
    factors,
    disclaimer: TRUST_SCORE_DISCLAIMER,
    lastUpdated: row.lastUpdated,
  };
}
