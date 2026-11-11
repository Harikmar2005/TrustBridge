import { Request, Response } from 'express';
import { db } from '../database/connection';
import { AuthenticatedRequest } from '../middleware/auth';
import { analyzeMessageForRisk } from '../ai/aiFraudService';
import { translateText } from '../services/translationService';

export function getConversations(req: AuthenticatedRequest, res: Response): void {
  const requestingUser = req.user!;
  let conversations: any[];

  if (requestingUser.role === 'admin' || requestingUser.role === 'support') {
    conversations = db.prepare(`SELECT * FROM conversations ORDER BY last_message_at DESC`).all();
  } else {
    conversations = db.prepare(`
      SELECT * FROM conversations
      WHERE buyer_id = ? OR seller_id = ? OR (type = 'dispute_room' AND (buyer_id = ? OR seller_id = ?))
      ORDER BY last_message_at DESC
    `).all(requestingUser.userId, requestingUser.userId, requestingUser.userId, requestingUser.userId);
  }

  res.json(
    conversations.map((c) => ({
      id: c.id,
      type: c.type,
      nexconnChannelId: c.nexconn_channel_id,
      buyerId: c.buyer_id,
      sellerId: c.seller_id,
      disputeId: c.dispute_id,
      transactionId: c.transaction_id,
      title: c.title,
      lastMessageAt: c.last_message_at,
      status: c.status,
    }))
  );
}

export function getMessages(req: AuthenticatedRequest, res: Response): void {
  const rows = db.prepare(`
    SELECT * FROM messages
    WHERE conversation_id = ?
    ORDER BY timestamp ASC
  `).all(req.params.id) as any[];

  res.json(
    rows.map((m) => ({
      id: m.id,
      conversationId: m.conversation_id,
      senderId: m.sender_id,
      senderName: m.sender_name,
      senderRole: m.sender_role,
      content: m.content,
      language: m.language,
      translations: JSON.parse(m.translations_json || '{}'),
      riskScore: m.risk_score,
      riskCategory: m.risk_category,
      detectedIndicators: JSON.parse(m.detected_indicators_json || '[]'),
      recommendedAction: m.recommended_action,
      detectionEngine: m.detection_engine,
      confidenceScore: m.confidence_score,
      isFlagged: Boolean(m.is_flagged),
      isFalsePositive: Boolean(m.is_false_positive),
      timestamp: m.timestamp,
      deliveryStatus: m.delivery_status || 'DELIVERED_LOCAL',
      nexconnMessageId: m.nexconn_message_id || null,
    }))
  );
}

export async function sendMessage(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { conversationId, content, language, deliveryStatus: requestedDeliveryStatus, nexconnMessageId: requestedNexconnMessageId } = req.body;
  if (!conversationId || !content || !content.trim()) {
    res.status(400).json({ error: 'Missing required message parameters' });
    return;
  }

  // Sender identity bound to authenticated session
  const authenticatedUserId = req.user!.userId;
  const sender = db.prepare(`SELECT * FROM users WHERE id = ?`).get(authenticatedUserId) as any;
  if (!sender) {
    res.status(404).json({ error: 'Sender not found' });
    return;
  }

  // 1. Fetch recent conversation context for AI Fraud Risk Detection
  const recentRows = db.prepare(`
    SELECT sender_role, content
    FROM messages
    WHERE conversation_id = ?
    ORDER BY timestamp DESC
    LIMIT 3
  `).all(conversationId) as any[];

  const conversationContext = recentRows.reverse().map((r) => `[${r.sender_role}]: ${r.content}`);

  // 2. AI Fraud & Scam Risk Detection with Provenance and Conversation Context
  const analysis = await analyzeMessageForRisk(content, sender.role, conversationContext);

  // 3. Multilingual 3-Way Translation (English, Tamil, Hindi)
  const sourceLang = language || sender.preferred_language || 'en';
  const targetLanguages = ['en', 'ta', 'hi'];
  const translations = await translateText(content, sourceLang, targetLanguages);

  const messageId = `msg_${Date.now()}`;
  const now = new Date().toISOString();
  const isFlagged = analysis.riskScore >= 60;
  const validStatuses = ['DELIVERED_CLOUD', 'PENDING_CLOUD', 'FAILED', 'DELIVERED_LOCAL'];
  const deliveryStatus = validStatuses.includes(requestedDeliveryStatus)
    ? requestedDeliveryStatus
    : 'DELIVERED_LOCAL';
  const nexconnMessageId = requestedNexconnMessageId || null;

  const insertMsgTxn = db.transaction(() => {
    db.prepare(`
      INSERT INTO messages (
        id, conversation_id, sender_id, sender_name, sender_role,
        content, language, translations_json, risk_score, risk_category,
        detected_indicators_json, recommended_action, detection_engine,
        confidence_score, is_flagged, is_false_positive, timestamp,
        delivery_status, nexconn_message_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      messageId,
      conversationId,
      sender.id,
      sender.name,
      sender.role,
      content,
      sourceLang,
      JSON.stringify(translations),
      analysis.riskScore,
      analysis.riskCategory,
      JSON.stringify(analysis.detectedIndicators),
      analysis.recommendedAction,
      analysis.detectionEngine,
      analysis.confidenceScore,
      isFlagged ? 1 : 0,
      0,
      now,
      deliveryStatus,
      nexconnMessageId
    );

    // Update conversation timestamp
    db.prepare(`UPDATE conversations SET last_message_at = ? WHERE id = ?`).run(now, conversationId);

    // Create FraudAlert if high/critical
    if (isFlagged) {
      const alertId = `fa_${Date.now()}`;
      db.prepare(`
        INSERT INTO fraud_alerts (
          id, conversation_id, message_id, target_user_id, target_user_name,
          risk_score, category, indicators_json, severity, review_status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        alertId,
        conversationId,
        messageId,
        sender.id,
        sender.name,
        analysis.riskScore,
        analysis.riskScore >= 80 ? 'Critical Fraud & Credential Phishing' : 'Suspicious Payment Activity',
        JSON.stringify(analysis.detectedIndicators),
        analysis.riskCategory,
        'NEW',
        now
      );

      // Audit Log
      db.prepare(`
        INSERT INTO audit_logs (id, actor_id, actor_name, actor_role, action, entity_type, entity_id, details, ip_address, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `aud_${Date.now()}`,
        'SYSTEM_AI_ENGINE',
        'TrustBridge AI Sentinel',
        'system',
        'RISK_THRESHOLD_EXCEEDED',
        'Message',
        messageId,
        `Risk score ${analysis.riskScore}/100 detected using ${analysis.detectionEngine} (${analysis.detectedIndicators.join(', ')}).`,
        req.ip || '127.0.0.1',
        now
      );
    }
  });

  insertMsgTxn();

  res.status(201).json({
    id: messageId,
    conversationId,
    senderId: sender.id,
    senderName: sender.name,
    senderRole: sender.role,
    content,
    language: sourceLang,
    translations,
    riskScore: analysis.riskScore,
    riskCategory: analysis.riskCategory,
    detectedIndicators: analysis.detectedIndicators,
    recommendedAction: analysis.recommendedAction,
    detectionEngine: analysis.detectionEngine,
    confidenceScore: analysis.confidenceScore,
    isFlagged,
    isFalsePositive: false,
    timestamp: now,
    deliveryStatus,
    nexconnMessageId,
  });
}

export function markRead(req: Request, res: Response): void {
  const result = db.prepare(`
    UPDATE messages
    SET delivery_status = 'READ'
    WHERE id = ? OR nexconn_message_id = ?
  `).run(req.params.id, req.params.id);

  if (result.changes === 0) {
    res.status(404).json({ error: 'Message not found' });
    return;
  }

  res.json({ success: true, messageId: req.params.id, deliveryStatus: 'READ' });
}

export function reportFalsePositive(req: Request, res: Response): void {
  const result = db.prepare(`
    UPDATE messages
    SET is_false_positive = 1, is_flagged = 0
    WHERE id = ?
  `).run(req.params.id);

  if (result.changes === 0) {
    res.status(404).json({ error: 'Message not found' });
    return;
  }

  // Audit log
  db.prepare(`
    INSERT INTO audit_logs (id, actor_id, actor_name, actor_role, action, entity_type, entity_id, details, ip_address, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    `aud_${Date.now()}`,
    req.body.userId || 'usr_anonymous',
    req.body.userName || 'User',
    'user',
    'FALSE_POSITIVE_REPORTED',
    'Message',
    req.params.id,
    'User marked message fraud detection as a false positive.',
    req.ip || '127.0.0.1',
    new Date().toISOString()
  );

  res.json({ success: true, messageId: req.params.id });
}
