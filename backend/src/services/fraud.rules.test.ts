import test from "node:test";
import assert from "node:assert/strict";
import { analyzeMessageForFraud } from "./fraud.rules";

test("normal buyer inquiry produces no fraud flags", () => {
  const res = analyzeMessageForFraud({
    content: "Hello, is this item still available and can you confirm shipping time?",
    recentMessageCountLastMinute: 1,
  });
  assert.equal(res.flagged, false);
  assert.equal(res.riskLevel, "NONE");
  assert.equal(res.matches.length, 0);
});

test("off-platform wire transfer / gift card request triggers HIGH risk", () => {
  const res = analyzeMessageForFraud({
    content: "Please pay outside the platform using wire transfer or gift card today.",
    recentMessageCountLastMinute: 1,
  });
  assert.equal(res.flagged, true);
  assert.equal(res.riskLevel, "HIGH");
  assert.equal(res.eventType, "SUSPICIOUS_MESSAGE");
  assert.ok(res.matches.some((m) => m.ruleId === "OFF_PLATFORM_PAYMENT_DIVERSION"));
});

test("shortened phishing URL triggers CRITICAL risk", () => {
  const res = analyzeMessageForFraud({
    content: "Verify your bank details immediately at https://bit.ly/verify-now",
  });
  assert.equal(res.flagged, true);
  assert.equal(res.riskLevel, "CRITICAL");
  assert.ok(res.matches.some((m) => m.ruleId === "CREDENTIAL_OR_SHORTLINK_PHISHING"));
});

test("high message burst frequency triggers UNUSUAL_MESSAGE_FREQUENCY", () => {
  const res = analyzeMessageForFraud({
    content: "Checking in again.",
    recentMessageCountLastMinute: 7,
    burstThreshold: 6,
  });
  assert.equal(res.flagged, true);
  assert.equal(res.riskLevel, "MEDIUM");
  assert.equal(res.eventType, "UNUSUAL_MESSAGE_FREQUENCY");
});
