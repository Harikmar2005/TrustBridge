import { Request, Response } from 'express';
import { db } from '../database/connection';

export function getUsers(_req: Request, res: Response): void {
  const rawUsers = db.prepare(`SELECT id, email, name, role, preferred_language, avatar, trust_score, phone, created_at FROM users`).all() as any[];
  const rawProfiles = db.prepare(`SELECT * FROM user_profiles`).all() as any[];

  const users = rawUsers.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    preferredLanguage: u.preferred_language,
    avatar: u.avatar,
    trustScore: u.trust_score,
    phone: u.phone,
    createdAt: u.created_at,
  }));

  const profiles: Record<string, any> = {};
  for (const p of rawProfiles) {
    profiles[p.user_id] = {
      userId: p.user_id,
      businessName: p.business_name,
      verified: Boolean(p.verified),
      completedOrders: p.completed_orders,
      disputeRate: p.dispute_rate,
      accountAgeDays: p.account_age_days,
      trustTier: p.trust_tier,
      verificationBadges: JSON.parse(p.verification_badges || '[]'),
    };
  }

  res.json({ users, profiles });
}

export function getUserProfile(req: Request, res: Response): void {
  const user = db.prepare(`SELECT id, email, name, role, preferred_language, avatar, trust_score, phone, created_at FROM users WHERE id = ?`).get(req.params.id) as any;
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const p = db.prepare(`SELECT * FROM user_profiles WHERE user_id = ?`).get(user.id) as any;
  const profile = p
    ? {
        userId: p.user_id,
        businessName: p.business_name,
        verified: Boolean(p.verified),
        completedOrders: p.completed_orders,
        disputeRate: p.dispute_rate,
        accountAgeDays: p.account_age_days,
        trustTier: p.trust_tier,
        verificationBadges: JSON.parse(p.verification_badges || '[]'),
      }
    : null;

  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      preferredLanguage: user.preferred_language,
      avatar: user.avatar,
      trustScore: user.trust_score,
      phone: user.phone,
      createdAt: user.created_at,
    },
    profile,
  });
}

export function updateUserLanguage(req: Request, res: Response): void {
  const { language } = req.body;
  if (!['en', 'ta', 'hi'].includes(language)) {
    res.status(400).json({ error: 'Language must be en, ta, or hi' });
    return;
  }

  const result = db.prepare(`UPDATE users SET preferred_language = ?, updated_at = ? WHERE id = ?`).run(
    language,
    new Date().toISOString(),
    req.params.id
  );

  if (result.changes === 0) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({ success: true, userId: req.params.id, preferredLanguage: language });
}
