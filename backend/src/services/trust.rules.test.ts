import test from "node:test";
import assert from "node:assert/strict";
import { calculateExplainableTrustScore } from "./trust.rules";

test("returns Not enough data when user has insufficient activity", () => {
  const result = calculateExplainableTrustScore({
    accountAgeDays: 1,
    profileCompletenessPct: 40,
    emailVerified: false,
    messageCount: 0,
    activeConversations: 0,
    completedTransactions: 0,
    confirmedDisputesAgainst: 0,
    confirmedPolicyViolations: 0,
    verifiedSuspiciousEvents: 0,
  });

  assert.equal(result.insufficientData, true);
  assert.equal(result.score, null);
  assert.equal(result.level, "Not enough data");
  assert.ok(result.disclaimer.includes("not a guarantee"));
});

test("calculates high score for verified active account with zero violations", () => {
  const result = calculateExplainableTrustScore({
    accountAgeDays: 95,
    profileCompletenessPct: 100,
    emailVerified: true,
    messageCount: 14,
    activeConversations: 3,
    completedTransactions: 6,
    confirmedDisputesAgainst: 0,
    confirmedPolicyViolations: 0,
    verifiedSuspiciousEvents: 0,
  });

  assert.equal(result.insufficientData, false);
  assert.ok(result.score !== null && result.score >= 85);
  assert.equal(result.level, "Excellent");
  assert.ok(result.factors.some((f) => f.impact === "positive"));
});

test("penalizes confirmed disputes and policy violations transparently", () => {
  const clean = calculateExplainableTrustScore({
    accountAgeDays: 40,
    profileCompletenessPct: 100,
    emailVerified: true,
    messageCount: 10,
    activeConversations: 2,
    completedTransactions: 4,
    confirmedDisputesAgainst: 0,
    confirmedPolicyViolations: 0,
    verifiedSuspiciousEvents: 0,
  });

  const penalized = calculateExplainableTrustScore({
    accountAgeDays: 40,
    profileCompletenessPct: 100,
    emailVerified: true,
    messageCount: 10,
    activeConversations: 2,
    completedTransactions: 4,
    confirmedDisputesAgainst: 2,
    confirmedPolicyViolations: 1,
    verifiedSuspiciousEvents: 1,
  });

  assert.ok(clean.score !== null && penalized.score !== null);
  assert.ok(penalized.score < clean.score);
  assert.ok(penalized.factors.some((f) => f.impact === "negative"));
});
