import { Request, Response } from 'express';
import { db } from '../database/connection';
import { AuthenticatedRequest } from '../middleware/auth';

export function getDisputes(req: AuthenticatedRequest, res: Response): void {
  const requestingUser = req.user!;
  let rawDisputes: any[];

  if (requestingUser.role === 'admin' || requestingUser.role === 'support') {
    rawDisputes = db.prepare(`SELECT * FROM disputes ORDER BY created_at DESC`).all() as any[];
  } else {
    rawDisputes = db.prepare(`
      SELECT * FROM disputes
      WHERE buyer_id = ? OR seller_id = ?
      ORDER BY created_at DESC
    `).all(requestingUser.userId, requestingUser.userId) as any[];
  }

  const disputeIds = rawDisputes.map((d) => d.id);
  const rawEvidence = disputeIds.length > 0
    ? db.prepare(`SELECT * FROM dispute_evidence WHERE dispute_id IN (${disputeIds.map(() => '?').join(',')})`).all(...disputeIds) as any[]
    : [];
  const rawHistory = disputeIds.length > 0
    ? db.prepare(`SELECT * FROM dispute_history WHERE dispute_id IN (${disputeIds.map(() => '?').join(',')}) ORDER BY timestamp ASC`).all(...disputeIds) as any[]
    : [];

  const evidenceMap: Record<string, any[]> = {};
  for (const ev of rawEvidence) {
    if (!evidenceMap[ev.dispute_id]) evidenceMap[ev.dispute_id] = [];
    evidenceMap[ev.dispute_id].push({
      id: ev.id,
      uploadedBy: ev.uploaded_by,
      fileUrl: ev.file_url,
      fileName: ev.file_name,
      fileSize: ev.file_size,
      mimeType: ev.mime_type,
      description: ev.description,
      uploadedAt: ev.uploaded_at,
    });
  }

  const historyMap: Record<string, any[]> = {};
  for (const h of rawHistory) {
    if (!historyMap[h.dispute_id]) historyMap[h.dispute_id] = [];
    historyMap[h.dispute_id].push({
      id: h.id,
      changedBy: h.changed_by,
      fromStatus: h.from_status,
      toStatus: h.to_status,
      actionTaken: h.action_taken,
      note: h.note,
      timestamp: h.timestamp,
    });
  }

  const result = rawDisputes.map((d) => ({
    id: d.id,
    referenceId: d.reference_id,
    transactionId: d.transaction_id,
    conversationId: d.conversation_id,
    buyerId: d.buyer_id,
    sellerId: d.seller_id,
    assignedAgentId: d.assigned_agent_id,
    category: d.category,
    reason: d.reason,
    status: d.status,
    priority: d.priority,
    evidence: evidenceMap[d.id] || [],
    history: historyMap[d.id] || [],
    resolutionNote: d.resolution_note,
    resolutionOutcome: d.resolution_outcome,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
  }));

  res.json(result);
}

export function getDisputeById(req: AuthenticatedRequest, res: Response): void {
  const d = db.prepare(`SELECT * FROM disputes WHERE id = ? OR reference_id = ?`).get(req.params.id, req.params.id) as any;
  if (!d) {
    res.status(404).json({ error: 'Dispute not found' });
    return;
  }

  const evidence = db.prepare(`SELECT * FROM dispute_evidence WHERE dispute_id = ?`).all(d.id) as any[];
  const history = db.prepare(`SELECT * FROM dispute_history WHERE dispute_id = ? ORDER BY timestamp ASC`).all(d.id) as any[];

  res.json({
    id: d.id,
    referenceId: d.reference_id,
    transactionId: d.transaction_id,
    conversationId: d.conversation_id,
    buyerId: d.buyer_id,
    sellerId: d.seller_id,
    assignedAgentId: d.assigned_agent_id,
    category: d.category,
    reason: d.reason,
    status: d.status,
    priority: d.priority,
    evidence: evidence.map((ev) => ({
      id: ev.id,
      uploadedBy: ev.uploaded_by,
      fileUrl: ev.file_url,
      fileName: ev.file_name,
      fileSize: ev.file_size,
      mimeType: ev.mime_type,
      description: ev.description,
      uploadedAt: ev.uploaded_at,
    })),
    history: history.map((h) => ({
      id: h.id,
      changedBy: h.changed_by,
      fromStatus: h.from_status,
      toStatus: h.to_status,
      actionTaken: h.action_taken,
      note: h.note,
      timestamp: h.timestamp,
    })),
    resolutionNote: d.resolution_note,
    resolutionOutcome: d.resolution_outcome,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
  });
}

export function createDispute(req: AuthenticatedRequest, res: Response): void {
  const { transactionId, conversationId, sellerId, category, reason, evidenceFiles } = req.body;
  const buyerId = req.user!.userId;

  const refId = `TB-DSP-2026-${Math.floor(1000 + Math.random() * 9000)}`;
  const disputeId = `dsp_${Date.now()}`;
  const roomId = `conv_room_${disputeId}`;
  const ticketId = `tkt_${Date.now()}`;
  const now = new Date().toISOString();

  const createTxn = db.transaction(() => {
    // 1. Create dispute
    db.prepare(`
      INSERT INTO disputes (
        id, reference_id, transaction_id, conversation_id, buyer_id, seller_id,
        assigned_agent_id, category, reason, status, priority, resolution_note,
        resolution_outcome, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      disputeId,
      refId,
      transactionId || 'txn_101',
      conversationId || 'conv_direct_1',
      buyerId,
      sellerId || 'usr_seller_1',
      'usr_support_1',
      category || 'suspected_fraud',
      reason || 'Dispute raised regarding off-platform coercion.',
      'IN_PROGRESS',
      'URGENT',
      'Active resolution room open with Buyer, Seller, and Trust Specialist.',
      null,
      now,
      now
    );

    // 2. Evidence validation & insertion
    if (evidenceFiles && Array.isArray(evidenceFiles)) {
      evidenceFiles.forEach((file: any, idx: number) => {
        const safeUrl = file.url || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop&q=80';
        const fileName = (file.name || `evidence_${idx + 1}.png`).replace(/[^a-zA-Z0-9._-]/g, '_');
        const mimeType = fileName.endsWith('.pdf') ? 'application/pdf' : 'image/png';

        db.prepare(`
          INSERT INTO dispute_evidence (
            id, dispute_id, uploaded_by, file_url, file_name, file_size, mime_type, description, uploaded_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          `ev_${Date.now()}_${idx}`,
          disputeId,
          buyerId,
          safeUrl,
          fileName,
          150000,
          mimeType,
          file.description || 'Uploaded proof documentation',
          now
        );
      });
    }

    // 3. Dispute History
    db.prepare(`
      INSERT INTO dispute_history (id, dispute_id, changed_by, from_status, to_status, action_taken, note, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(`dh_${Date.now()}_1`, disputeId, buyerId, 'NONE', 'OPEN', 'Dispute Filed by Buyer', reason, now);

    db.prepare(`
      INSERT INTO dispute_history (id, dispute_id, changed_by, from_status, to_status, action_taken, note, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `dh_${Date.now()}_2`,
      disputeId,
      'SMART_ROUTER',
      'OPEN',
      'ASSIGNED',
      'Smart Agent Dispatch Assigned Maya Patel',
      'Auto-routed to Tier-1 T&S Agent Maya Patel.',
      now
    );

    db.prepare(`
      INSERT INTO dispute_history (id, dispute_id, changed_by, from_status, to_status, action_taken, note, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `dh_${Date.now()}_3`,
      disputeId,
      'usr_support_1',
      'ASSIGNED',
      'IN_PROGRESS',
      'Agent Joined Nexconn Dispute Channel',
      'Maya Patel entered dispute channel. Escrow funds secured.',
      now
    );

    // 4. Linked Support Ticket
    db.prepare(`
      INSERT INTO support_tickets (
        id, ticket_number, dispute_id, conversation_id, requester_id, assigned_agent_id,
        title, summary, priority, status, category, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      ticketId,
      `TKT-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      disputeId,
      conversationId || 'conv_direct_1',
      buyerId,
      'usr_support_1',
      `Dispute ${refId}: ${(category || 'Escrow').replace(/_/g, ' ').toUpperCase()}`,
      reason,
      'URGENT',
      'IN_PROGRESS',
      'Escrow Dispute',
      now
    );

    // 5. Dispute Conversation Room
    db.prepare(`
      INSERT INTO conversations (
        id, type, nexconn_channel_id, buyer_id, seller_id, dispute_id, transaction_id, title, last_message_at, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      roomId,
      'dispute_room',
      `nc_room_${disputeId}`,
      buyerId,
      sellerId || 'usr_seller_1',
      disputeId,
      transactionId || 'txn_101',
      `Dispute Room: ${refId}`,
      now,
      'active'
    );

    // 6. Concierge System Message
    db.prepare(`
      INSERT INTO messages (
        id, conversation_id, sender_id, sender_name, sender_role, content, language,
        translations_json, risk_score, risk_category, detected_indicators_json,
        recommended_action, detection_engine, confidence_score, is_flagged, is_false_positive, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `msg_sys_${Date.now()}`,
      roomId,
      'SYSTEM',
      'TrustBridge Concierge',
      'system',
      `Dispute room ${refId} initialized. Senior Trust Agent Maya Patel has been dispatched to oversee resolution.`,
      'en',
      JSON.stringify({
        en: `Dispute room ${refId} initialized. Senior Trust Agent Maya Patel has been dispatched to oversee resolution.`,
        ta: `சர்ச்சை அறை ${refId} தொடங்கப்பட்டது. மூத்த நம்பிக்கை முகவர் மாயா படேல் நியமிக்கப்பட்டுள்ளார்.`,
        hi: `विवाद कक्ष ${refId} शुरू किया गया। वरिष्ठ ट्रस्ट एजेंट माया पटेल को भेजा गया है।`,
      }),
      0,
      'LOW',
      JSON.stringify(['Official dispute room moderation notice']),
      'Follow support guidelines.',
      'HEURISTIC_RULE_ENGINE',
      1.0,
      0,
      0,
      now
    );

    // 7. Update transaction status
    if (transactionId) {
      db.prepare(`UPDATE transactions SET status = 'DISPUTED' WHERE id = ?`).run(transactionId);
    }
  });

  createTxn();

  const created = db.prepare(`SELECT * FROM disputes WHERE id = ?`).get(disputeId);
  res.status(201).json({
    success: true,
    dispute: created,
    disputeRoomId: roomId,
    ticketId,
  });
}

export function resolveDispute(req: AuthenticatedRequest, res: Response): void {
  const { outcome, note } = req.body;
  const validOutcomes = ['FULL_REFUND', 'PARTIAL_REFUND', 'FUNDS_RELEASED', 'DISMISSED'];
  const validOutcome = validOutcomes.includes(outcome) ? outcome : 'FULL_REFUND';

  const dispute = db.prepare(`SELECT * FROM disputes WHERE id = ? OR reference_id = ?`).get(req.params.id, req.params.id) as any;
  if (!dispute) {
    res.status(404).json({ error: 'Dispute not found' });
    return;
  }

  const now = new Date().toISOString();
  const agentId = req.user!.userId;
  const agentName = req.user!.name;

  const resolveTxn = db.transaction(() => {
    // Update dispute
    db.prepare(`
      UPDATE disputes
      SET status = 'RESOLVED', resolution_outcome = ?, resolution_note = ?, updated_at = ?
      WHERE id = ?
    `).run(validOutcome, note || `Formally resolved with outcome: ${validOutcome}.`, now, dispute.id);

    // Record dispute history
    db.prepare(`
      INSERT INTO dispute_history (id, dispute_id, changed_by, from_status, to_status, action_taken, note, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `dh_${Date.now()}`,
      dispute.id,
      agentId || 'usr_support_1',
      dispute.status,
      'RESOLVED',
      `Dispute Formally Resolved: ${validOutcome}`,
      note || 'Formal resolution entered',
      now
    );

    // Update associated transaction
    db.prepare(`
      UPDATE transactions
      SET status = ?
      WHERE id = ?
    `).run(validOutcome === 'FULL_REFUND' ? 'CANCELLED' : 'COMPLETED', dispute.transaction_id);

    // Update associated ticket
    db.prepare(`
      UPDATE support_tickets
      SET status = 'RESOLVED', resolved_at = ?
      WHERE dispute_id = ?
    `).run(now, dispute.id);

    // Audit log
    db.prepare(`
      INSERT INTO audit_logs (id, actor_id, actor_name, actor_role, action, entity_type, entity_id, details, ip_address, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `aud_${Date.now()}`,
      agentId,
      agentName,
      req.user!.role,
      'DISPUTE_RESOLVED',
      'Dispute',
      dispute.reference_id,
      `Resolution outcome: ${validOutcome}. Escrow adjustment executed.`,
      req.ip || '127.0.0.1',
      now
    );
  });

  resolveTxn();

  const updated = db.prepare(`SELECT * FROM disputes WHERE id = ?`).get(dispute.id);
  res.json({ success: true, dispute: updated });
}
