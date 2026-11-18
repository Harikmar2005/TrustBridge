import type { TrustFactor, TrustScoreResult } from "../types/domain";

export interface TrustCalculationInput {
  accountAgeDays: number;
  profileCompletenessPct: number;
  emailVerified: boolean;
  messageCount: number;
  activeConversations: number;
  completedTransactions: number;
  confirmedDisputesAgainst: number;
  confirmedPolicyViolations: number;
  verifiedSuspiciousEvents: number;
  minInteractionsThreshold?: number;
  nowIso?: string;
}

export const TRUST_SCORE_DISCLAIMER =
  "Trust scores summarize verified platform signals and historical activity. They are informational indicators, not a guarantee of transaction safety.";

export function calculateExplainableTrustScore(
  input: TrustCalculationInput
): TrustScoreResult {
  const lastUpdated = input.nowIso ?? new Date().toISOString();
  const minMessages = input.minInteractionsThreshold ?? 2;

  const hasEnoughActivity =
    input.messageCount >= minMessages ||
    input.completedTransactions > 0 ||
    (input.profileCompletenessPct >= 75 && input.accountAgeDays >= 7);

  if (!hasEnoughActivity) {
    return {
      score: null,
      level: "Not enough data",
      insufficientData: true,
      factors: [
        {
          name: "Insufficient activity history",
          impact: "neutral",
          points: 0,
          detail: `At least ${minMessages} messages, a completed transaction, or an established profile is needed before calculating a score.`,
        },
      ],
      disclaimer: TRUST_SCORE_DISCLAIMER,
      lastUpdated,
    };
  }

  const factors: TrustFactor[] = [];
  let rawScore = 35; // Neutral baseline once minimum activity threshold is met

  // 1. Profile completeness (0 to +20)
  const profilePoints = Math.round((Math.min(100, Math.max(0, input.profileCompletenessPct)) / 100) * 20);
  rawScore += profilePoints;
  factors.push({
    name: "Profile completeness",
    impact: profilePoints >= 12 ? "positive" : "neutral",
    points: profilePoints,
    detail: `Profile is ${Math.round(input.profileCompletenessPct)}% complete.`,
  });

  // 2. Account age (0 to +15)
  const agePoints =
    input.accountAgeDays >= 90
      ? 15
      : input.accountAgeDays >= 30
      ? 12
      : input.accountAgeDays >= 7
      ? 7
      : 2;
  rawScore += agePoints;
  factors.push({
    name: "Account age",
    impact: agePoints >= 7 ? "positive" : "neutral",
    points: agePoints,
    detail: `Account active for ${Math.max(0, Math.floor(input.accountAgeDays))} days.`,
  });

  // 3. Verified email (+12)
  if (input.emailVerified) {
    rawScore += 12;
    factors.push({
      name: "Email verification",
      impact: "positive",
      points: 12,
      detail: "Account email address verified.",
    });
  } else {
    factors.push({
      name: "Email verification",
      impact: "neutral",
      points: 0,
      detail: "Email not yet verified.",
    });
  }

  // 4. Platform communication & transaction history (0 to +18)
  const interactionPoints = Math.min(
    18,
    input.completedTransactions * 4 + Math.min(6, input.activeConversations * 2) + Math.min(4, Math.floor(input.messageCount / 3))
  );
  rawScore += interactionPoints;
  factors.push({
    name: "Interaction & fulfillment history",
    impact: interactionPoints >= 6 ? "positive" : "neutral",
    points: interactionPoints,
    detail: `${input.completedTransactions} completed transactions across ${input.activeConversations} conversation(s).`,
  });

  // 5. Confirmed disputes against user (-12 each, capped)
  if (input.confirmedDisputesAgainst > 0) {
    const penalty = -Math.min(36, input.confirmedDisputesAgainst * 12);
    rawScore += penalty;
    factors.push({
      name: "Confirmed dispute outcomes",
      impact: "negative",
      points: penalty,
      detail: `${input.confirmedDisputesAgainst} resolved dispute(s) recorded against account.`,
    });
  }

  // 6. Confirmed policy violations (-15 each, capped)
  if (input.confirmedPolicyViolations > 0) {
    const penalty = -Math.min(45, input.confirmedPolicyViolations * 15);
    rawScore += penalty;
    factors.push({
      name: "Confirmed policy violations",
      impact: "negative",
      points: penalty,
      detail: `${input.confirmedPolicyViolations} confirmed policy violation(s).`,
    });
  }

  // 7. Verified suspicious security events (-10 each, capped)
  if (input.verifiedSuspiciousEvents > 0) {
    const penalty = -Math.min(30, input.verifiedSuspiciousEvents * 10);
    rawScore += penalty;
    factors.push({
      name: "Verified security incidents",
      impact: "negative",
      points: penalty,
      detail: `${input.verifiedSuspiciousEvents} verified security incident(s) reviewed by administrators.`,
    });
  }

  const score = Math.max(0, Math.min(100, rawScore));
  const level: TrustScoreResult["level"] =
    score >= 85
      ? "Excellent"
      : score >= 70
      ? "Good"
      : score >= 50
      ? "Fair"
      : "Low";

  return {
    score,
    level,
    insufficientData: false,
    factors,
    disclaimer: TRUST_SCORE_DISCLAIMER,
    lastUpdated,
  };
}
