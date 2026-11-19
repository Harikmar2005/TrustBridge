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
  assert.equal(res.detectionMethod, "rule-based");
  assert.equal(res.matches.length, 0);
});

test("benign HTTPS catalog/tracking link produces informational LOW advisory without fraud flag", () => {
  const res = analyzeMessageForFraud({
    content: "Here is the product spec sheet: https://example.com/specs/unit-42.pdf",
    recentMessageCountLastMinute: 1,
  });
  assert.equal(res.flagged, false);
  assert.equal(res.riskLevel, "LOW");
  assert.equal(res.eventType, null);
  assert.equal(res.detectionMethod, "rule-based");
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

test("shortened phishing URL or IP-literal login link triggers CRITICAL risk", () => {
  const res = analyzeMessageForFraud({
    content: "Verify your bank details immediately at https://bit.ly/verify-now",
  });
  assert.equal(res.flagged, true);
  assert.equal(res.riskLevel, "CRITICAL");
  assert.ok(res.matches.some((m) => m.ruleId === "CREDENTIAL_OR_SHORTLINK_PHISHING"));

  const ipPhish = analyzeMessageForFraud({
    content: "Sign in at http://192.168.10.5/login to confirm your order",
  });
  assert.equal(ipPhish.flagged, true);
  assert.equal(ipPhish.riskLevel, "CRITICAL");
});

test("urgency coercion and secrecy phrasing triggers MEDIUM risk", () => {
  const res = analyzeMessageForFraud({
    content: "Send payment immediately and keep this between us before cancellation.",
  });
  assert.equal(res.flagged, true);
  assert.equal(res.riskLevel, "MEDIUM");
  assert.ok(res.matches.some((m) => m.ruleId === "URGENCY_COERCION"));
});

test("high message burst frequency and duplicate message spam trigger UNUSUAL_MESSAGE_FREQUENCY", () => {
  const burstRes = analyzeMessageForFraud({
    content: "Checking in again.",
    recentMessageCountLastMinute: 7,
    burstThreshold: 6,
  });
  assert.equal(burstRes.flagged, true);
  assert.equal(burstRes.riskLevel, "MEDIUM");
  assert.equal(burstRes.eventType, "UNUSUAL_MESSAGE_FREQUENCY");

  const dupRes = analyzeMessageForFraud({
    content: "Checking in again.",
    recentMessageCountLastMinute: 2,
    duplicateMessageCount: 3,
  });
  assert.equal(dupRes.flagged, true);
  assert.equal(dupRes.eventType, "UNUSUAL_MESSAGE_FREQUENCY");
  assert.ok(dupRes.matches.some((m) => m.ruleId === "ABNORMAL_COMMUNICATION_PATTERN"));
});

test("repeated suspicious messages escalate severity to HIGH", () => {
  const res = analyzeMessageForFraud({
    content: "Send deposit immediately before your account will be suspended.",
    recentSuspiciousCount: 2,
  });
  assert.equal(res.flagged, true);
  assert.equal(res.riskLevel, "HIGH");
  assert.ok(res.matches.some((m) => m.ruleId === "REPEATED_SUSPICIOUS_MESSAGES"));
});
