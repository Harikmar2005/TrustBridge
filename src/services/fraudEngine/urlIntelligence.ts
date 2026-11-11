import { URLIntelligenceResult, AnalyzedUrlDetail, EvidenceReference } from './types';

// In-memory safe domain reputation cache (domain -> reputation status)
const domainReputationCache = new Map<string, { status: 'SAFE' | 'SUSPICIOUS' | 'MALICIOUS'; cachedAt: number }>();

const REPUTATION_TTL_MS = 60 * 60 * 1000; // 1 hour

// Known malicious phishing domains detected in incident reports
const KNOWN_PHISHING_DOMAINS = new Set([
  'pay-fast-direct.net',
  'secure-escrow-vault.co',
  'refund-trustbridge.net',
  'quick-pay.xyz',
  'reversal-pay.net',
  'fake-escrow-ack.co',
  'quick-wire.top',
  'unverified-fast-ack.xyz',
  'quick-escrow-claim.net',
  'secure-trustbridge-claim.top',
]);

// Known URL shorteners used to mask phishing destinations
const SHORTENER_DOMAINS = new Set([
  'bit.ly',
  'tinyurl.com',
  't.co',
  'is.gd',
  'cutt.ly',
  'rb.gy',
  'ow.ly',
  'buff.ly',
  'rebrand.ly',
]);

// High-risk disposable generic TLDs
const HIGH_RISK_TLDS = new Set(['xyz', 'top', 'click', 'ru', 'su', 'biz', 'cc', 'club', 'work', 'vip', 'link']);

/**
 * Validates if an IP address string belongs to private, loopback, or link-local RFC ranges
 * Critical SSRF safeguard
 */
export function isPrivateOrReservedIp(ip: string): boolean {
  const clean = ip.trim();

  // IPv6 loopback & private
  if (clean === '::1' || clean === '::' || clean.startsWith('fc') || clean.startsWith('fd') || clean.startsWith('fe80')) {
    return true;
  }

  // IPv4 regex
  const parts = clean.split('.').map((p) => parseInt(p, 10));
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return false;
  }

  // Loopback 127.0.0.0/8
  if (parts[0] === 127) return true;

  // Zero 0.0.0.0/8
  if (parts[0] === 0) return true;

  // Private RFC1918: 10.0.0.0/8
  if (parts[0] === 10) return true;

  // Private RFC1918: 172.16.0.0/12 (172.16 - 172.31)
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;

  // Private RFC1918: 192.168.0.0/16
  if (parts[0] === 192 && parts[1] === 168) return true;

  // Link-Local / Cloud Metadata: 169.254.0.0/16 (e.g. AWS/GCP 169.254.169.254)
  if (parts[0] === 169 && parts[1] === 254) return true;

  // Broadcast
  if (parts[0] === 255) return true;

  return false;
}

/**
 * Extracts and safely analyzes URLs from message text
 */
export function analyzeUrls(content: string): URLIntelligenceResult {
  const urlRegex = /(https?:\/\/[^\s<>'"]+|www\.[^\s<>'"]+|[a-zA-Z0-9-]+\.(?:xyz|net|co|biz|top|cc|ru|su|club|click|work|top|link)\/[^\s<>'"]*)/gi;
  const rawMatches = content.match(urlRegex) || [];

  if (rawMatches.length === 0) {
    return {
      score: 0,
      hasUrl: false,
      isHighRisk: false,
      indicators: [],
      evidence: [],
      analyzedUrls: [],
    };
  }

  const indicators: string[] = [];
  const evidence: EvidenceReference[] = [];
  const analyzedUrls: AnalyzedUrlDetail[] = [];
  let score = 0;
  let isHighRisk = false;

  for (const rawUrl of rawMatches) {
    const formattedUrl = rawUrl.startsWith('http://') || rawUrl.startsWith('https://') ? rawUrl : `https://${rawUrl}`;

    let parsed: URL;
    try {
      parsed = new URL(formattedUrl);
    } catch {
      indicators.push(`Malformed or invalid URL syntax: ${rawUrl.slice(0, 30)}`);
      score += 25;
      continue;
    }

    const hostname = parsed.hostname.toLowerCase();
    const isIpHost = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) || hostname.includes(':');
    const isSsrfBlocked = isIpHost && isPrivateOrReservedIp(hostname);
    const domainParts = hostname.split('.');
    const tld = domainParts.length > 1 ? domainParts[domainParts.length - 1] : '';
    const isShortener = SHORTENER_DOMAINS.has(hostname);
    const isHighRiskTld = HIGH_RISK_TLDS.has(tld);
    const isSecureProtocol = parsed.protocol === 'https:';

    // Check deceptive spoofing of platform domain
    const isDeceptiveDomain =
      /(trustbridge|escrow|pay|safe|deal|refund|secure|tribunal)/i.test(hostname) &&
      !hostname.endsWith('trustbridge.io') &&
      hostname !== 'localhost';

    const hasSuspiciousParams = /[?&](otp|cvv|password|pin|redirect|token|session)=/i.test(parsed.search);
    const isKnownMalicious = KNOWN_PHISHING_DOMAINS.has(hostname);

    let reputationStatus: 'SAFE' | 'SUSPICIOUS' | 'MALICIOUS' | 'BLOCKED_SSRF' = 'SAFE';

    // 1. SSRF Attack Mitigation
    if (isSsrfBlocked || hostname === 'localhost') {
      reputationStatus = 'BLOCKED_SSRF';
      isHighRisk = true;
      score += 70;
      indicators.push(`SSRF Block: URL targets reserved internal or loopback infrastructure (${hostname})`);
      evidence.push({
        textSnippet: rawUrl,
        indicatorType: 'SSRF_INTERNAL_TARGET',
        reason: 'Attempted to direct request towards internal private address range, blocked by cybersecurity policy.',
      });
    }

    // 2. Known Malicious Domain
    if (isKnownMalicious) {
      reputationStatus = 'MALICIOUS';
      isHighRisk = true;
      score += 60;
      indicators.push(`Known Phishing Domain: ${hostname} flagged in global threat intelligence database`);
      evidence.push({
        textSnippet: rawUrl,
        indicatorType: 'KNOWN_PHISHING_DOMAIN',
        reason: 'Domain has been confirmed as active phishing host for harvesting payment credentials.',
      });
    }

    // 3. Deceptive Platform Impersonation Domain
    if (isDeceptiveDomain) {
      reputationStatus = 'MALICIOUS';
      isHighRisk = true;
      score += 50;
      indicators.push(`Deceptive Domain: Domain ${hostname} mimics platform trust authority without authorization`);
      evidence.push({
        textSnippet: rawUrl,
        indicatorType: 'DECEPTIVE_DOMAIN_SPOOF',
        reason: 'Domain incorporates trust/escrow keywords while not residing on official trustbridge.io domain.',
      });
    }

    // 4. IP-Based URL (Direct IP host without registered DNS)
    if (isIpHost && !isSsrfBlocked) {
      reputationStatus = 'SUSPICIOUS';
      isHighRisk = true;
      score += 45;
      indicators.push(`Direct IP Host URL: ${hostname} bypasses standard domain name registration`);
      evidence.push({
        textSnippet: rawUrl,
        indicatorType: 'RAW_IP_URL',
        reason: 'Legitimate e-commerce services operate on registered branded domains, not raw numeric IP addresses.',
      });
    }

    // 5. URL Shorteners
    if (isShortener) {
      if (reputationStatus === 'SAFE') reputationStatus = 'SUSPICIOUS';
      score += 30;
      indicators.push(`URL Shortener Detected: ${hostname} masks ultimate HTTP destination`);
      evidence.push({
        textSnippet: rawUrl,
        indicatorType: 'URL_SHORTENER_MASK',
        reason: 'URL shortening services are frequently utilized to circumvent static domain reputation filters.',
      });
    }

    // 6. Disposable High-Risk TLD
    if (isHighRiskTld) {
      if (reputationStatus === 'SAFE') reputationStatus = 'SUSPICIOUS';
      score += 35;
      isHighRisk = true;
      indicators.push(`High-Risk Disposable TLD (.${tld}) detected: ${hostname}`);
      evidence.push({
        textSnippet: rawUrl,
        indicatorType: 'HIGH_RISK_TLD',
        reason: `Top-level domain .${tld} has disproportionately high association with disposable phishing campaigns.`,
      });
    }

    // 7. Non-HTTPS Unencrypted Protocol
    if (!isSecureProtocol) {
      score += 20;
      indicators.push(`Insecure HTTP Protocol: ${rawUrl} transmits data in plaintext without TLS encryption`);
      evidence.push({
        textSnippet: rawUrl,
        indicatorType: 'INSECURE_HTTP',
        reason: 'Unencrypted HTTP communication exposes credentials and payment tokens to man-in-the-middle eavesdropping.',
      });
    }

    // 8. Suspicious Query Parameters (Credential Harvesting)
    if (hasSuspiciousParams) {
      score += 30;
      isHighRisk = true;
      indicators.push(`Credential Harvesting URL Parameters detected in query string`);
      evidence.push({
        textSnippet: rawUrl,
        indicatorType: 'CREDENTIAL_URL_QUERY',
        reason: 'Query parameters indicate attempt to receive passwords, OTP tokens, or redirect tokens through URL.',
      });
    }

    analyzedUrls.push({
      url: rawUrl,
      domain: hostname,
      isIpHost,
      isShortener,
      isDeceptiveDomain,
      isSsrfBlocked,
      tld,
      isSecureProtocol,
      hasSuspiciousParams,
      reputationStatus,
    });
  }

  const finalScore = Math.min(Math.max(score, 0), 100);

  return {
    score: finalScore,
    hasUrl: true,
    isHighRisk: isHighRisk || finalScore >= 50,
    indicators,
    evidence,
    analyzedUrls,
  };
}
