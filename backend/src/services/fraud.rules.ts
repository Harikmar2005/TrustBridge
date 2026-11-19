import type { SecuritySeverity } from "../types/domain";

export interface FraudRuleMatch {
  ruleId: string;
  label: string;
  severity: SecuritySeverity;
  description: string;
}

export interface FraudAnalysisResult {
  flagged: boolean;
  riskLevel: SecuritySeverity | "NONE";
  eventType: string | null;
  detectionMethod: "rule-based";
  description: string;
  matches: FraudRuleMatch[];
}

const OFF_PLATFORM_PAYMENT_PATTERNS: RegExp[] = [
  /\b(wire\s*transfer|western\s*union|moneygram|gift\s*card|steam\s*card|itunes\s*card|google\s*play\s*card)\b/i,
  /\b(crypto\s*wallet|usdt|bitcoin\s*address|send\s*btc|send\s*eth|trc20|erc20)\b/i,
  /\b(pay\s*outside|outside\s*the\s*platform|bypass\s*escrow|avoid\s*fees\s*by\s*paying|direct\s*zelle|cashapp\s*me|venmo\s*me)\b/i,
  /\b(whatsapp\s*me|telegram\s*me|text\s*me\s*at\s*my\s*number|dm\s*me\s*on\s*(whatsapp|telegram|signal))\b/i,
];

const SHORTENED_OR_SUSPICIOUS_LINK_PATTERNS: RegExp[] = [
  /\b(bit\.ly|tinyurl\.com|t\.co|cutt\.ly|rb\.gy|is\.gd|ow\.ly|shorturl\.at)\/\S+/i,
  /https?:\/\/(?:\d{1,3}\.){3}\d{1,3}(?::\d+)?(?:\/\S*)?/i,
  /https?:\/\/[^\s]*xn--[^\s]*/i,
  /\bhttp:\/\/[^\s]*(login|verify|account|bank|wallet|secure|update)[^\s]*/i,
];

const CREDENTIAL_HARVESTING_PATTERNS: RegExp[] = [
  /\b(verify\s*your\s*bank|confirm\s*otp|share\s*your\s*password|send\s*verification\s*code|enter\s*your\s*pin|send\s*cvv)\b/i,
];

const ANY_URL_PATTERN = /https?:\/\/[^\s]+/i;

const URGENCY_COERCION_PATTERNS: RegExp[] = [
  /\b(act\s*within\s*\d+\s*(min|minute|hour)|send\s*(money|payment|deposit)\s*immediately|urgent\s*payment|last\s*chance\s*before\s*cancel)\b/i,
  /\b(your\s*account\s*will\s*be\s*suspended|pay\s*now\s*or\s*lose|respond\s*in\s*\d+\s*(min|minute)s?\s*or)\b/i,
  /\b(do\s*not\s*tell\s*support|don't\s*tell\s*support|keep\s*this\s*between\s*us)\b/i,
];

const SEVERITY_RANK: Record<SecuritySeverity | "NONE", number> = {
  NONE: 0,
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};

function higherSeverity(
  a: SecuritySeverity | "NONE",
  b: SecuritySeverity | "NONE"
): SecuritySeverity | "NONE" {
  return SEVERITY_RANK[a] >= SEVERITY_RANK[b] ? a : b;
}

export function analyzeMessageForFraud(input: {
  content: string;
  recentMessageCountLastMinute?: number;
  burstThreshold?: number;
  recentSuspiciousCount?: number;
  duplicateMessageCount?: number;
}): FraudAnalysisResult {
  const text = input.content.trim();
  const matches: FraudRuleMatch[] = [];

  if (OFF_PLATFORM_PAYMENT_PATTERNS.some((rx) => rx.test(text))) {
    matches.push({
      ruleId: "OFF_PLATFORM_PAYMENT_DIVERSION",
      label: "Off-platform payment or contact request",
      severity: "HIGH",
      description:
        "Message references off-platform payment methods, gift cards, crypto transfers, or external messaging channels.",
    });
  }

  const hasCredentialOrSuspiciousLink =
    SHORTENED_OR_SUSPICIOUS_LINK_PATTERNS.some((rx) => rx.test(text)) ||
    CREDENTIAL_HARVESTING_PATTERNS.some((rx) => rx.test(text));
  const hasAnyUrl = ANY_URL_PATTERN.test(text);

  if (hasCredentialOrSuspiciousLink) {
    matches.push({
      ruleId: "CREDENTIAL_OR_SHORTLINK_PHISHING",
      label: "Potential phishing link or credential request",
      severity: "CRITICAL",
      description:
        "Message contains a shortened/obfuscated URL, insecure login link, or requests sensitive credentials/OTP codes.",
    });
  } else if (hasAnyUrl) {
    matches.push({
      ruleId: "EXTERNAL_URL_SHARED",
      label: "External link shared in conversation",
      severity: "LOW",
      description:
        "Message contains an external URL. Verify destination domains before clicking.",
    });
  }

  if (URGENCY_COERCION_PATTERNS.some((rx) => rx.test(text))) {
    matches.push({
      ruleId: "URGENCY_COERCION",
      label: "High-pressure urgency or secrecy phrasing",
      severity: "MEDIUM",
      description:
        "Message contains time-pressure, secrecy, or suspension-threat language that warrants extra verification.",
    });
  }

  const burstThreshold = input.burstThreshold ?? 6;
  if ((input.recentMessageCountLastMinute ?? 0) >= burstThreshold) {
    matches.push({
      ruleId: "UNUSUAL_MESSAGE_FREQUENCY",
      label: "Unusual message frequency",
      severity: "MEDIUM",
      description: `Sender posted ${input.recentMessageCountLastMinute} messages within 60 seconds, exceeding normal pacing.`,
    });
  }

  if ((input.duplicateMessageCount ?? 0) >= 2) {
    matches.push({
      ruleId: "ABNORMAL_COMMUNICATION_PATTERN",
      label: "Repeated identical message pattern",
      severity: "MEDIUM",
      description:
        "Identical message text was repeated multiple times in a short interval, consistent with automated or spam behavior.",
    });
  }

  // Only escalate repeated suspicious messages if this message itself has a >= MEDIUM/HIGH/CRITICAL match
  // or the sender has already triggered >= 2 recent suspicious flags and sends another flagged message.
  const hasActionableMatch = matches.some((m) => m.severity !== "LOW");
  if (hasActionableMatch && (input.recentSuspiciousCount ?? 0) >= 2) {
    matches.push({
      ruleId: "REPEATED_SUSPICIOUS_MESSAGES",
      label: "Repeated suspicious message pattern",
      severity: "HIGH",
      description:
        "Multiple messages from this sender in recent history matched rule-based safety indicators.",
    });
  }

  if (matches.length === 0) {
    return {
      flagged: false,
      riskLevel: "NONE",
      eventType: null,
      detectionMethod: "rule-based",
      description: "No suspicious patterns detected.",
      matches: [],
    };
  }

  let topSeverity: SecuritySeverity | "NONE" = "NONE";
  for (const m of matches) {
    topSeverity = higherSeverity(topSeverity, m.severity);
  }

  const primary = matches.find((m) => m.severity === topSeverity) ?? matches[0];
  const eventType =
    primary.ruleId === "UNUSUAL_MESSAGE_FREQUENCY" ||
    primary.ruleId === "ABNORMAL_COMMUNICATION_PATTERN"
      ? "UNUSUAL_MESSAGE_FREQUENCY"
      : "SUSPICIOUS_MESSAGE";

  // Informational LOW-severity links alone are not marked as high-risk fraud flags
  const flagged = topSeverity !== "LOW";

  return {
    flagged,
    riskLevel: topSeverity,
    eventType: flagged ? eventType : null,
    detectionMethod: "rule-based",
    description: flagged
      ? `Rule-based safety indicator matched: ${primary.description}`
      : primary.description,
    matches,
  };
}
