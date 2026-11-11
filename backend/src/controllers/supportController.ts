import { Request, Response } from 'express';
import { db } from '../database/connection';
import { AuthenticatedRequest } from '../middleware/auth';

export function getTickets(req: AuthenticatedRequest, res: Response): void {
  const user = req.user!;
  let tickets: any[];

  if (user.role === 'admin' || user.role === 'support') {
    tickets = db.prepare(`SELECT * FROM support_tickets ORDER BY created_at DESC`).all() as any[];
  } else {
    tickets = db.prepare(`SELECT * FROM support_tickets WHERE requester_id = ? ORDER BY created_at DESC`).all(user.userId) as any[];
  }

  res.json(
    tickets.map((t) => ({
      id: t.id,
      ticketNumber: t.ticket_number,
      disputeId: t.dispute_id,
      conversationId: t.conversation_id,
      requesterId: t.requester_id,
      assignedAgentId: t.assigned_agent_id,
      title: t.title,
      summary: t.summary,
      priority: t.priority,
      status: t.status,
      category: t.category,
      createdAt: t.created_at,
      resolvedAt: t.resolved_at,
    }))
  );
}

export function getFraudAlerts(_req: AuthenticatedRequest, res: Response): void {
  const alerts = db.prepare(`SELECT * FROM fraud_alerts ORDER BY created_at DESC`).all() as any[];
  res.json(
    alerts.map((a) => ({
      id: a.id,
      conversationId: a.conversation_id,
      messageId: a.message_id,
      targetUserId: a.target_user_id,
      targetUserName: a.target_user_name,
      riskScore: a.risk_score,
      category: a.category,
      indicators: JSON.parse(a.indicators_json || '[]'),
      severity: a.severity,
      reviewStatus: a.review_status,
      createdAt: a.created_at,
    }))
  );
}

export function updateFraudAlertStatus(req: AuthenticatedRequest, res: Response): void {
  const { status } = req.body;
  if (!['NEW', 'REVIEWED', 'DISMISSED', 'ACTIONED'].includes(status)) {
    res.status(400).json({ error: 'Invalid status' });
    return;
  }

  const result = db.prepare(`UPDATE fraud_alerts SET review_status = ? WHERE id = ?`).run(status, req.params.id);
  if (result.changes === 0) {
    res.status(404).json({ error: 'Alert not found' });
    return;
  }

  const updated = db.prepare(`SELECT * FROM fraud_alerts WHERE id = ?`).get(req.params.id) as any;
  res.json({
    id: updated.id,
    conversationId: updated.conversation_id,
    messageId: updated.message_id,
    targetUserId: updated.target_user_id,
    targetUserName: updated.target_user_name,
    riskScore: updated.risk_score,
    category: updated.category,
    indicators: JSON.parse(updated.indicators_json || '[]'),
    severity: updated.severity,
    reviewStatus: updated.review_status,
    createdAt: updated.created_at,
  });
}

export function getAuditLogs(_req: AuthenticatedRequest, res: Response): void {
  const logs = db.prepare(`SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 200`).all() as any[];
  res.json(
    logs.map((l) => ({
      id: l.id,
      actorId: l.actor_id,
      actorName: l.actor_name,
      actorRole: l.actor_role,
      action: l.action,
      entityType: l.entity_type,
      entityId: l.entity_id,
      details: l.details,
      timestamp: l.timestamp,
    }))
  );
}
