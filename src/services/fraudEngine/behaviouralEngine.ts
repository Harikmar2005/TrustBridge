import { db } from '../../db';
import { BehaviouralAnalysisResult, EvidenceReference } from './types';

/**
 * Executes privacy-conscious behavioural fraud analysis using SQLite database metrics
 */
export function analyzeBehaviour(
  senderId: string,
  conversationId?: string,
  currentMessageContent?: string
): BehaviouralAnalysisResult {
  const indicators: string[] = [];
  const evidence: EvidenceReference[] = [];
  let score = 0;

  let recentMessageVelocity = 0;
  let historicalFlaggedRatio = 0;
  let accountAgeDays = 30;
  let trustTier = 'STANDARD';
  let suddenShiftDetected = false;
  let independentReportsCount = 0;

  try {
    // 1. Fetch user account metadata & profile
    const user = db.prepare(`SELECT created_at, trust_score FROM users WHERE id = ?`).get(senderId) as any;
    const profile = db.prepare(`SELECT account_age_days, trust_tier FROM user_profiles WHERE user_id = ?`).get(senderId) as any;

    if (profile) {
      accountAgeDays = profile.account_age_days || 1;
      trustTier = profile.trust_tier || 'STANDARD';
    } else if (user) {
      const createdTime = new Date(user.created_at || Date.now()).getTime();
      accountAgeDays = Math.max(1, Math.floor((Date.now() - createdTime) / (1000 * 60 * 60 * 24)));
    }

    // New accounts (< 2 days old) operating with unverified trust tier have higher risk exposure
    if (accountAgeDays <= 2 && trustTier === 'PROBATION') {
      score += 25;
      indicators.push(`High-Risk Account Profile: Newly created account (${accountAgeDays} day old) on probation`);
      evidence.push({
        textSnippet: `Account Age: ${accountAgeDays} day(s), Tier: ${trustTier}`,
        indicatorType: 'NEW_ACCOUNT_PROBATION',
        reason: 'New accounts on probation have not established an escrow transaction track record.',
      });
    }

    // 2. Message Velocity Analysis (messages sent by this sender across last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const velocityRow = db.prepare(`
      SELECT COUNT(*) as c
      FROM messages
      WHERE sender_id = ? AND timestamp >= ?
    `).get(senderId, fiveMinutesAgo) as any;

    recentMessageVelocity = velocityRow?.c || 0;
    if (recentMessageVelocity >= 15) {
      score += 30;
      indicators.push(`High Message Velocity: ${recentMessageVelocity} messages in under 5 minutes (Spam/Automated Bot pattern)`);
      evidence.push({
        textSnippet: `${recentMessageVelocity} messages/5m`,
        indicatorType: 'HIGH_VELOCITY_FLOODING',
        reason: 'Abnormal messaging volume exceeds standard human peer-to-peer negotiation pacing.',
      });
    }

    // 3. Historical Flagged Message Ratio
    const totalMsgsRow = db.prepare(`SELECT COUNT(*) as c FROM messages WHERE sender_id = ?`).get(senderId) as any;
    const flaggedMsgsRow = db.prepare(`SELECT COUNT(*) as c FROM messages WHERE sender_id = ? AND is_flagged = 1 AND is_false_positive = 0`).get(senderId) as any;

    const totalSent = totalMsgsRow?.c || 0;
    const totalFlagged = flaggedMsgsRow?.c || 0;

    if (totalSent >= 3) {
      historicalFlaggedRatio = totalFlagged / totalSent;
      if (historicalFlaggedRatio >= 0.5) {
        score += 35;
        indicators.push(`Repeated Threat History: ${(historicalFlaggedRatio * 100).toFixed(0)}% of user messages historically flagged for fraud`);
        evidence.push({
          textSnippet: `${totalFlagged}/${totalSent} flagged`,
          indicatorType: 'REPEATED_FRAUD_HISTORY',
          reason: 'Sender account has a documented history of repeatedly generating flagged messages.',
        });
      }
    }

    // 4. Multiple Independent Fraud Alerts
    const alertsRow = db.prepare(`
      SELECT COUNT(*) as c
      FROM fraud_alerts
      WHERE target_user_id = ? AND severity IN ('HIGH', 'CRITICAL')
    `).get(senderId) as any;

    independentReportsCount = alertsRow?.c || 0;
    if (independentReportsCount >= 2) {
      score += 25;
      indicators.push(`Multiple Prior Fraud Alerts: ${independentReportsCount} independent high/critical security alerts logged`);
      evidence.push({
        textSnippet: `${independentReportsCount} alerts on record`,
        indicatorType: 'PRIOR_CRITICAL_ALERTS',
        reason: 'System security surveillance previously flagged this identity in independent transactions.',
      });
    }

    // 5. Sudden Conversation Behavioral Shift
    if (conversationId) {
      const priorMessages = db.prepare(`
        SELECT content, risk_score, sender_id
        FROM messages
        WHERE conversation_id = ?
        ORDER BY timestamp DESC
        LIMIT 4
      `).all(conversationId) as any[];

      if (priorMessages.length >= 2) {
        const priorSenderMsgs = priorMessages.filter((m) => m.sender_id === senderId);
        // If prior messages were safe (score < 25) and current message has high indicators
        const allPriorSafe = priorSenderMsgs.every((m) => m.risk_score < 25);
        if (allPriorSafe && priorSenderMsgs.length >= 1 && currentMessageContent) {
          const hasSuddenDemands = /otp|password|cvv|western union|gpay|wire|outside/i.test(currentMessageContent);
          if (hasSuddenDemands) {
            suddenShiftDetected = true;
            score += 20;
            indicators.push('Sudden Behavioral Shift: Polite conversation abruptly escalated to sensitive credential/wire demands');
            evidence.push({
              textSnippet: currentMessageContent.slice(0, 50),
              indicatorType: 'SUDDEN_BEHAVIORAL_SHIFT',
              reason: 'Luring counter-party with friendly rapport before introducing unverified payment demands.',
            });
          }
        }
      }
    }
  } catch (err) {
    console.warn('[Behavioural Engine] Notice evaluating behavioural signals:', err);
  }

  const finalScore = Math.min(Math.max(score, 0), 100);

  return {
    score: finalScore,
    indicators: indicators.length > 0 ? indicators : ['User account exhibits stable behavioral history'],
    evidence,
    recentMessageVelocity,
    historicalFlaggedRatio,
    accountAgeDays,
    trustTier,
    suddenShiftDetected,
    independentReportsCount,
  };
}
