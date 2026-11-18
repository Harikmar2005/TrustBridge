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
  description: string;
  matches: FraudRuleMatch[];
}

const OFF_PLATFORM_PAYMENT_PATTERNS: RegExp[] = [
  /\b(wire\s*transfer|western\s*union|moneygram|gift\s*card|steam\s*card|itunes\s*card)\b/i,
  /\b(crypto\s*wallet|usdt|bitcoin\s*address|send\s*btc|send\s*eth)\b/i,
  /\b(pay\s*outside|outside\s*the\s*platform|bypass\s*escrow|avoid\s*fees\s*by\s*paying)\b/i,
  /\b(whatsapp\s*me|telegram\s*me|text\s*me\s*at\s*my\s*number)\b/i,
];

const PHISHING_LINK_PATTERNS: RegExp[] = [
  /https?:\/\/[^\s]+/i,
  /\b(bit\.ly|tinyurl\.com|t\.co|cutt\.ly|rb\.gy)\/\S+/i,
  /\b(verify\s*your\s*bank|confirm\s*otp|share\s*your\s*password|send\s*verification\s*code)\b/i,
];

const URGENCY_COERCION_PATTERNS: RegExp[] = [
  /\b(act\s*within\s*\d+\s*(min|minute|hour)|send\s*immediately|urgent\s*payment|last\s*chance\s*before\s*cancel)\b/i,
  /\b(your\s*account\s*will\s*be\s*suspended|pay\s*now\s*or\s*lose)\b/i,
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

  const hasShortenedOrCredentialPhish =
    PHISHING_LINK_PATTERNS[1].test(text) || PHISHING_LINK_PATTERNS[2].test(text);
  const hasAnyUrl = PHISHING_LINK_PATTERNS[0].test(text);

  if (hasShortenedOrCredentialPhish) {
    matches.push({
      ruleId: "CREDENTIAL_OR_SHORTLINK_PHISHING",
      label: "Potential phishing link or credential request",
      severity: "CRITICAL",
      description:
        "Message contains a shortened URL or requests sensitive credentials/OTP codes.",
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
      label: "High-pressure urgency phrasing",
      severity: "MEDIUM",
      description:
        "Message contains time-pressure or suspension-threat language commonly associated with scams.",
    });
  }

  const burstThreshold = input.burstThreshold ?? 6;
  if ((input.recentMessageCountLastMinute ?? 0) >= burstThreshold) {
    matches.push({
      ruleId: "UNUSUAL_MESSAGE_FREQUENCY",
      label: "Unusual message frequency",
      severity: "MEDIUM",
      description: `User sent ${input.recentMessageCountLastMinute} or more messages within 60 seconds.`,
    });
  }

  if (matches.length === 0) {
    return {
      flagged: false,
      riskLevel: "NONE",
      eventType: null,
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
    primary.ruleId === "UNUSUAL_MESSAGE_FREQUENCY"
      ? "UNUSUAL_MESSAGE_FREQUENCY"
      : "SUSPICIOUS_MESSAGE";

  return {
    flagged: topSeverity !== "LOW" || matches.length > 0,
    riskLevel: topSeverity,
    eventType,
    description: `Potential risk detected (rule-based): ${primary.description}`,
    matches,
  };
}
