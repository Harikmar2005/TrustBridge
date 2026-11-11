export interface EvidenceReference {
  textSnippet: string;
  indicatorType: string;
  reason: string;
}

export type RiskCategory = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface NLPAnalysisResult {
  score: number; // 0 - 100
  category: RiskCategory;
  confidence: number;
  indicators: string[];
  evidence: EvidenceReference[];
  normalizedText: string;
  detectedThreatTypes: string[];
}

export interface AnalyzedUrlDetail {
  url: string;
  domain: string;
  isIpHost: boolean;
  isShortener: boolean;
  isDeceptiveDomain: boolean;
  isSsrfBlocked: boolean;
  tld: string;
  isSecureProtocol: boolean;
  hasSuspiciousParams: boolean;
  reputationStatus: 'SAFE' | 'SUSPICIOUS' | 'MALICIOUS' | 'BLOCKED_SSRF';
}

export interface URLIntelligenceResult {
  score: number; // 0 - 100
  hasUrl: boolean;
  isHighRisk: boolean;
  indicators: string[];
  evidence: EvidenceReference[];
  analyzedUrls: AnalyzedUrlDetail[];
}

export interface BehaviouralAnalysisResult {
  score: number; // 0 - 100
  indicators: string[];
  evidence: EvidenceReference[];
  recentMessageVelocity: number;
  historicalFlaggedRatio: number;
  accountAgeDays: number;
  trustTier: string;
  suddenShiftDetected: boolean;
  independentReportsCount: number;
}

export interface MLPredictionResult {
  score: number; // 0 - 100
  prediction: 'BENIGN' | 'MALICIOUS';
  probability: number; // 0.0 - 1.0
  modelVersion: string;
  confidence: number;
  extractedFeatures: string[];
}

export interface DetectorStatus {
  name: string;
  available: boolean;
  latencyMs: number;
  error?: string;
}

export interface UnifiedRiskReport {
  analysisId: string;
  messageId?: string;
  conversationId?: string;
  senderId?: string;
  riskScore: number; // 0 - 100
  riskCategory: RiskCategory;
  confidenceScore: number;
  detectionEngine: string;
  weightsUsed: {
    nlpWeight: number;
    urlWeight: number;
    behaviouralWeight: number;
    mlWeight: number;
  };
  nlpScore: number;
  urlScore: number;
  behaviouralScore: number;
  mlScore: number;
  detectedIndicators: string[];
  evidenceReferences: EvidenceReference[];
  explanation: string;
  recommendedAction: string;
  modelVersion: string;
  detectorsStatus: Record<string, DetectorStatus>;
  timestamp: string;
}
