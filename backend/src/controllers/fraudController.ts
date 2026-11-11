import { Response } from 'express';
import { db } from '../database/connection';
import { AuthenticatedRequest } from '../middleware/auth';
import {
  runUnifiedFraudAnalysis,
  analyzeUrls,
  getModelMetadata,
} from '../ai/aiFraudService';

export async function analyzeMessage(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { content, conversationId, persist } = req.body;
  if (!content || typeof content !== 'string' || !content.trim()) {
    res.status(400).json({ error: 'INVALID_INPUT', message: 'Message content is required.' });
    return;
  }

  if (content.length > 10000) {
    res.status(400).json({ error: 'PAYLOAD_TOO_LARGE', message: 'Content exceeds 10,000 characters limit.' });
    return;
  }

  // IDOR protection: if conversationId is specified, ensure user has access
  if (conversationId && req.user!.role !== 'admin' && req.user!.role !== 'support') {
    const conv = db.prepare(`SELECT buyer_id, seller_id FROM conversations WHERE id = ?`).get(conversationId) as any;
    if (conv && conv.buyer_id !== req.user!.userId && conv.seller_id !== req.user!.userId) {
      res.status(403).json({ error: 'FORBIDDEN', message: 'Access to this conversation context is forbidden.' });
      return;
    }
  }

  try {
    const report = await runUnifiedFraudAnalysis(content, {
      conversationId,
      senderId: req.user!.userId,
      senderRole: req.user!.role,
      persist: persist !== false,
    });
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: 'ANALYSIS_FAILED', message: err.message });
  }
}

export function analyzeUrl(req: AuthenticatedRequest, res: Response): void {
  const { url } = req.body;
  if (!url || typeof url !== 'string' || !url.trim()) {
    res.status(400).json({ error: 'INVALID_URL', message: 'URL string is required.' });
    return;
  }

  const result = analyzeUrls(url.trim());
  res.json(result);
}

export function getAnalysisById(req: AuthenticatedRequest, res: Response): void {
  const row = db.prepare(`SELECT * FROM fraud_analyses WHERE id = ?`).get(req.params.id) as any;
  if (!row) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Fraud analysis record not found.' });
    return;
  }

  // Access validation
  if (req.user!.role !== 'admin' && req.user!.role !== 'support' && row.sender_id !== req.user!.userId) {
    const conv = db.prepare(`SELECT buyer_id, seller_id FROM conversations WHERE id = ?`).get(row.conversation_id) as any;
    if (!conv || (conv.buyer_id !== req.user!.userId && conv.seller_id !== req.user!.userId)) {
      res.status(403).json({ error: 'FORBIDDEN', message: 'You are not authorized to view this analysis record.' });
      return;
    }
  }

  res.json({
    id: row.id,
    messageId: row.message_id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    riskScore: row.risk_score,
    riskCategory: row.risk_category,
    confidenceScore: row.confidence_score,
    nlpScore: row.nlp_score,
    urlScore: row.url_score,
    behaviouralScore: row.behavioural_score,
    mlScore: row.ml_score,
    detectedIndicators: JSON.parse(row.detected_indicators_json || '[]'),
    evidenceReferences: JSON.parse(row.evidence_references_json || '[]'),
    recommendation: row.recommendation,
    explanation: row.explanation,
    modelVersion: row.model_version,
    detectorsStatus: JSON.parse(row.detectors_status_json || '{}'),
    createdAt: row.created_at,
  });
}

export function getStats(_req: AuthenticatedRequest, res: Response): void {
  const totalAnalyzed = (db.prepare(`SELECT COUNT(*) as c FROM messages`).get() as any)?.c || 0;
  const highRiskCount = (db.prepare(`SELECT COUNT(*) as c FROM messages WHERE risk_score >= 60`).get() as any)?.c || 0;
  const criticalCount = (db.prepare(`SELECT COUNT(*) as c FROM messages WHERE risk_score >= 80`).get() as any)?.c || 0;
  const falsePositives = (db.prepare(`SELECT COUNT(*) as c FROM messages WHERE is_false_positive = 1`).get() as any)?.c || 0;
  const activeAlerts = (db.prepare(`SELECT COUNT(*) as c FROM fraud_alerts WHERE review_status = 'NEW'`).get() as any)?.c || 0;
  const totalConversations = (db.prepare(`SELECT COUNT(*) as c FROM conversations`).get() as any)?.c || 0;

  // Breakdown by category
  const categoriesRaw = db.prepare(`
    SELECT risk_category, COUNT(*) as c
    FROM messages
    GROUP BY risk_category
  `).all() as Array<{ risk_category: string; c: number }>;

  const categoryCounts: Record<string, number> = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
  for (const cat of categoriesRaw) {
    if (categoryCounts[cat.risk_category] !== undefined) {
      categoryCounts[cat.risk_category] = cat.c;
    }
  }

  // Model metadata
  const model = getModelMetadata();

  res.json({
    metrics: {
      totalAnalyzed,
      totalConversations,
      highRiskCount,
      criticalCount,
      falsePositives,
      activeAlerts,
      safeMessageRate: totalAnalyzed > 0 ? `${(((totalAnalyzed - highRiskCount) / totalAnalyzed) * 100).toFixed(1)}%` : '100%',
    },
    categoryDistribution: [
      { name: 'Low Risk', value: categoryCounts.LOW, color: '#10b981' },
      { name: 'Medium Risk', value: categoryCounts.MEDIUM, color: '#f59e0b' },
      { name: 'High Risk', value: categoryCounts.HIGH, color: '#f97316' },
      { name: 'Critical Risk', value: categoryCounts.CRITICAL, color: '#ef4444' },
    ],
    modelInfo: {
      version: model.version,
      algorithm: model.algorithm,
      trainedAt: model.trainedAt,
      metrics: model.evaluationMetrics,
    },
    detectorsHealth: {
      nlpEngine: 'ONLINE',
      urlIntelligence: 'ONLINE',
      behaviouralEngine: 'ONLINE',
      mlClassifier: 'ONLINE',
      geminiAssistant: process.env.GEMINI_API_KEY ? 'ONLINE' : 'FALLBACK_HEURISTIC',
    },
  });
}

export function getModels(_req: AuthenticatedRequest, res: Response): void {
  const model = getModelMetadata();
  res.json({
    activeModel: model.version,
    algorithm: model.algorithm,
    trainedAt: model.trainedAt,
    vocabularySize: Object.keys(model.vocabulary).length,
    weightsCount: model.weights.length,
    bias: model.bias,
    evaluationMetrics: model.evaluationMetrics,
    supportedLanguages: ['en', 'ta', 'hi'],
  });
}
