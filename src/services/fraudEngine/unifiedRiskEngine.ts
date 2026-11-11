import {
  UnifiedRiskReport,
  RiskCategory,
  EvidenceReference,
  DetectorStatus,
} from './types';
import { analyzeMessageNLP } from './nlpEngine';
import { analyzeUrls } from './urlIntelligence';
import { analyzeBehaviour } from './behaviouralEngine';
import { predictML, getModelMetadata } from './mlClassifier';
import { db } from '../../db';
import { GoogleGenAI } from '@google/genai';

let genAI: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!genAI) genAI = new GoogleGenAI();
  return genAI;
}

export interface AnalyzeOptions {
  messageId?: string;
  conversationId?: string;
  senderId?: string;
  senderRole?: string;
  conversationContext?: string[];
  persist?: boolean;
}

/**
 * Central Unified AI Fraud Intelligence Engine combining:
 * 1. Real-time NLP Scam Detection (35%)
 * 2. Intelligent Phishing URL Detection (25%)
 * 3. Behavioural Fraud Detection (20%)
 * 4. Machine Learning Classification (20%)
 * + Explainable AI Recommendations
 */
export async function runUnifiedFraudAnalysis(
  content: string,
  options: AnalyzeOptions = {}
): Promise<UnifiedRiskReport> {
  const startTime = Date.now();
  const analysisId = `fa_ai2_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const senderRole = options.senderRole || 'seller';
  const senderId = options.senderId || 'usr_seller_1';

  const detectorsStatus: Record<string, DetectorStatus> = {};

  // 1. NLP Analysis
  const nlpStart = Date.now();
  let nlpResult: ReturnType<typeof analyzeMessageNLP>;
  try {
    nlpResult = analyzeMessageNLP(content, senderRole);
    detectorsStatus['nlp_engine'] = {
      name: 'Real-time NLP Scam Detector',
      available: true,
      latencyMs: Date.now() - nlpStart,
    };
  } catch (err: any) {
    nlpResult = {
      score: 0,
      category: 'LOW',
      confidence: 0.5,
      indicators: [],
      evidence: [],
      normalizedText: content,
      detectedThreatTypes: [],
    };
    detectorsStatus['nlp_engine'] = {
      name: 'Real-time NLP Scam Detector',
      available: false,
      latencyMs: Date.now() - nlpStart,
      error: err.message,
    };
  }

  // 2. URL Intelligence
  const urlStart = Date.now();
  let urlResult: ReturnType<typeof analyzeUrls>;
  try {
    urlResult = analyzeUrls(content);
    detectorsStatus['url_intelligence'] = {
      name: 'Phishing URL Intelligence',
      available: true,
      latencyMs: Date.now() - urlStart,
    };
  } catch (err: any) {
    urlResult = {
      score: 0,
      hasUrl: false,
      isHighRisk: false,
      indicators: [],
      evidence: [],
      analyzedUrls: [],
    };
    detectorsStatus['url_intelligence'] = {
      name: 'Phishing URL Intelligence',
      available: false,
      latencyMs: Date.now() - urlStart,
      error: err.message,
    };
  }

  // 3. Behavioural Analysis
  const behStart = Date.now();
  let behResult: ReturnType<typeof analyzeBehaviour>;
  try {
    behResult = analyzeBehaviour(senderId, options.conversationId, content);
    detectorsStatus['behavioural_engine'] = {
      name: 'Account & Conversation Behaviour Engine',
      available: true,
      latencyMs: Date.now() - behStart,
    };
  } catch (err: any) {
    behResult = {
      score: 0,
      indicators: [],
      evidence: [],
      recentMessageVelocity: 0,
      historicalFlaggedRatio: 0,
      accountAgeDays: 1,
      trustTier: 'STANDARD',
      suddenShiftDetected: false,
      independentReportsCount: 0,
    };
    detectorsStatus['behavioural_engine'] = {
      name: 'Account & Conversation Behaviour Engine',
      available: false,
      latencyMs: Date.now() - behStart,
      error: err.message,
    };
  }

  // 4. ML Classifier
  const mlStart = Date.now();
  let mlResult: ReturnType<typeof predictML>;
  try {
    mlResult = predictML(content);
    detectorsStatus['ml_classifier'] = {
      name: 'TF-IDF Logistic Regression ML Classifier',
      available: true,
      latencyMs: Date.now() - mlStart,
    };
  } catch (err: any) {
    mlResult = {
      score: 0,
      prediction: 'BENIGN',
      probability: 0.1,
      modelVersion: 'v2.0-sentinel-ml',
      confidence: 0.5,
      extractedFeatures: [],
    };
    detectorsStatus['ml_classifier'] = {
      name: 'TF-IDF Logistic Regression ML Classifier',
      available: false,
      latencyMs: Date.now() - mlStart,
      error: err.message,
    };
  }

  // Dynamic Weighting Scheme
  // Baseline: NLP 35%, URL 25%, Behaviour 20%, ML 20%
  // When no URL is present in the message, redistribute URL weight: NLP gets 45%, ML gets 30%, Behaviour gets 25%
  let nlpWeight = 0.35;
  let urlWeight = 0.25;
  let behaviouralWeight = 0.2;
  let mlWeight = 0.2;

  // Handle missing URL signal explicitly
  if (!urlResult.hasUrl) {
    nlpWeight = 0.5;
    urlWeight = 0.0;
    behaviouralWeight = 0.2;
    mlWeight = 0.3;
  }

  // Handle neutral/missing behavioral history explicitly:
  // If behavioral engine has no history (score === 0), reallocate behavioral weight so it doesn't dampen active threat detections
  if (behResult.score === 0) {
    const behShare = behaviouralWeight;
    behaviouralWeight = 0.0;
    nlpWeight += behShare * 0.6;
    mlWeight += behShare * 0.4;
  }

  // Weighted score calculation
  const weightedScoreRaw =
    nlpResult.score * nlpWeight +
    urlResult.score * urlWeight +
    behResult.score * behaviouralWeight +
    mlResult.score * mlWeight;

  let calculatedScore = Math.round(weightedScoreRaw);

  // Maximum override: If individual high-precision detectors identify critical threats, enforce floor
  if (nlpResult.score >= 80) {
    calculatedScore = Math.max(calculatedScore, nlpResult.score);
  } else if (nlpResult.score >= 60) {
    calculatedScore = Math.max(calculatedScore, nlpResult.score);
  }

  if (urlResult.isHighRisk) {
    calculatedScore = Math.max(calculatedScore, urlResult.score);
  }

  const riskScore = Math.min(Math.max(calculatedScore, 0), 100);

  // Classification thresholds
  const riskCategory: RiskCategory =
    riskScore >= 80 ? 'CRITICAL' : riskScore >= 60 ? 'HIGH' : riskScore >= 30 ? 'MEDIUM' : 'LOW';

  // Aggregate indicators & evidence
  const allIndicators = [
    ...nlpResult.indicators.filter((i) => !i.includes('No anomalous')),
    ...urlResult.indicators,
    ...behResult.indicators.filter((i) => !i.includes('exhibits stable')),
  ];
  if (mlResult.prediction === 'MALICIOUS' && mlResult.extractedFeatures.length > 0) {
    allIndicators.push(`Machine Learning Signal: High-confidence vector match (${mlResult.extractedFeatures.slice(0, 3).join(', ')})`);
  }

  const finalIndicators = allIndicators.length > 0 ? allIndicators : ['No anomalous fraud or phishing patterns identified'];

  const allEvidence: EvidenceReference[] = [
    ...nlpResult.evidence,
    ...urlResult.evidence,
    ...behResult.evidence,
  ];

  // Explainability & Actionable Recommendations
  let explanation = '';
  let recommendedAction = '';

  if (riskCategory === 'CRITICAL') {
    explanation = `Critical multi-vector threat detected (Risk: ${riskScore}/100). The message exhibits high-severity signals including ${finalIndicators.slice(0, 2).join(' and ')}.`;
    recommendedAction = 'CRITICAL WARNING: NEVER disclose OTPs, passwords, or CVVs. Do NOT click external payment links. Escrow funds are held safely.';
  } else if (riskCategory === 'HIGH') {
    explanation = `High risk detected (Risk: ${riskScore}/100). Indicators suggest off-platform diversion or suspicious payment circumvention (${finalIndicators[0]}).`;
    recommendedAction = 'CAUTION: Keep all transactions and communications strictly inside TrustBridge to preserve Escrow buyer protection.';
  } else if (riskCategory === 'MEDIUM') {
    explanation = `Moderate anomaly detected (Risk: ${riskScore}/100). The message contains unverified external references or rapid pacing.`;
    recommendedAction = 'Verify counter-party credentials and ensure order is booked through official TrustBridge checkout.';
  } else {
    explanation = 'Unified AI fraud inspection detected no malicious patterns. Content conforms to legitimate marketplace communication standards.';
    recommendedAction = 'Safe to proceed with standard on-platform messaging.';
  }

  let detectionEngine = 'HEURISTIC_RULE_ENGINE';

  // Optional: Gemini 2.5 Flash Explainability Enhancement if server key is configured
  if (process.env.GEMINI_API_KEY && riskScore >= 40) {
    try {
      const ai = getGenAI();
      const prompt = `You are the TrustBridge Explainable AI Security Officer.
A user received this marketplace message: "${content}".
Risk Score: ${riskScore}/100 (${riskCategory}).
Detected Evidence: ${JSON.stringify(allEvidence.map((e) => `${e.indicatorType}: ${e.reason}`))}

Provide a 1-sentence precise cybersecurity explanation and a 1-sentence actionable user recommendation.
Respond in JSON: {"explanation": "...", "recommendation": "..."}`;

      const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json', temperature: 0.1 },
      });

      if (res.text) {
        const parsed = JSON.parse(res.text);
        if (parsed.explanation) explanation = parsed.explanation;
        if (parsed.recommendation) recommendedAction = parsed.recommendation;
        detectionEngine = 'GEMINI_2_5_FLASH';
      }
    } catch (e) {
      // Deterministic explainability fallback remains completely active
    }
  }

  const modelMetadata = getModelMetadata();
  const report: UnifiedRiskReport = {
    analysisId,
    messageId: options.messageId,
    conversationId: options.conversationId,
    senderId,
    riskScore,
    riskCategory,
    confidenceScore: Math.min(0.99, Math.max(0.85, (nlpResult.confidence + mlResult.confidence) / 2)),
    detectionEngine,
    weightsUsed: {
      nlpWeight,
      urlWeight,
      behaviouralWeight,
      mlWeight,
    },
    nlpScore: nlpResult.score,
    urlScore: urlResult.score,
    behaviouralScore: behResult.score,
    mlScore: mlResult.score,
    detectedIndicators: finalIndicators,
    evidenceReferences: allEvidence,
    explanation,
    recommendedAction,
    modelVersion: modelMetadata.version,
    detectorsStatus,
    timestamp: new Date().toISOString(),
  };

  // Optional database persistence
  if (options.persist !== false && options.conversationId) {
    try {
      db.prepare(`
        INSERT INTO fraud_analyses (
          id, message_id, conversation_id, sender_id, risk_score, risk_category,
          confidence_score, nlp_score, url_score, behavioural_score, ml_score,
          detected_indicators_json, evidence_references_json, recommendation, explanation,
          model_version, detectors_status_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        analysisId,
        options.messageId || null,
        options.conversationId,
        senderId,
        report.riskScore,
        report.riskCategory,
        report.confidenceScore,
        report.nlpScore,
        report.urlScore,
        report.behaviouralScore,
        report.mlScore,
        JSON.stringify(report.detectedIndicators),
        JSON.stringify(report.evidenceReferences),
        report.recommendedAction,
        report.explanation,
        report.modelVersion,
        JSON.stringify(report.detectorsStatus),
        report.timestamp
      );
    } catch (dbErr) {
      console.warn('[Fraud Analysis DB] Notice persisting analysis:', dbErr);
    }
  }

  return report;
}
