import { Request, Response } from 'express';
import { db } from '../database/connection';
import {
  hashPassword,
  verifyPassword,
  issueSessionToken,
  revokeSessionToken,
} from '../services/authService';
import { AuthenticatedRequest } from '../middleware/auth';

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'MISSING_CREDENTIALS', message: 'Email and password are required' });
    return;
  }

  const user = db.prepare(`SELECT * FROM users WHERE email = ?`).get(email.trim().toLowerCase()) as any;
  if (!user) {
    res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Invalid email or password' });
    return;
  }

  const isPasswordValid = await verifyPassword(password, user.password_hash);
  if (!isPasswordValid) {
    res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Invalid email or password' });
    return;
  }

  // Automatic seamless rehash from legacy bcrypt to Argon2id
  if (user.password_hash.startsWith('$2a$') || user.password_hash.startsWith('$2b$')) {
    try {
      const newArgonHash = await hashPassword(password);
      db.prepare(`UPDATE users SET password_hash = ? WHERE id = ?`).run(newArgonHash, user.id);
    } catch {
      // Non-fatal upgrade failure
    }
  }

  const profile = db.prepare(`SELECT * FROM user_profiles WHERE user_id = ?`).get(user.id) as any;
  const tokenData = issueSessionToken(user);

  // Audit log
  db.prepare(`
    INSERT INTO audit_logs (id, actor_id, actor_name, actor_role, action, entity_type, entity_id, details, ip_address, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    `aud_${Date.now()}`,
    user.id,
    user.name,
    user.role,
    'USER_LOGIN',
    'User',
    user.id,
    `User logged in successfully via password authentication.`,
    req.ip || '127.0.0.1',
    new Date().toISOString()
  );

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
    profile: profile
      ? {
          userId: profile.user_id,
          businessName: profile.business_name,
          verified: Boolean(profile.verified),
          completedOrders: profile.completed_orders,
          disputeRate: profile.dispute_rate,
          accountAgeDays: profile.account_age_days,
          trustTier: profile.trust_tier,
          verificationBadges: JSON.parse(profile.verification_badges || '[]'),
        }
      : null,
    token: tokenData.token,
    tokenId: tokenData.tokenId,
    expiresIn: tokenData.expiresIn,
  });
}

export async function register(req: Request, res: Response): Promise<void> {
  const { email, password, name, role, preferredLanguage, phone } = req.body;
  if (!email || !password || !name) {
    res.status(400).json({ error: 'MISSING_FIELDS', message: 'Email, password, and name are required' });
    return;
  }

  const existing = db.prepare(`SELECT id FROM users WHERE email = ?`).get(email.trim().toLowerCase());
  if (existing) {
    res.status(409).json({ error: 'USER_EXISTS', message: 'User with this email already exists' });
    return;
  }

  const userId = `usr_${Date.now()}`;
  const passwordHash = await hashPassword(password);
  const now = new Date().toISOString();
  // Prevent privilege escalation: public registrations can only be 'buyer' or 'seller'
  const userRole = role === 'seller' ? 'seller' : 'buyer';
  const lang = ['en', 'ta', 'hi'].includes(preferredLanguage) ? preferredLanguage : 'en';

  const avatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';

  const registerTxn = db.transaction(() => {
    db.prepare(`
      INSERT INTO users (id, email, password_hash, name, role, preferred_language, avatar, trust_score, phone, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(userId, email.trim().toLowerCase(), passwordHash, name.trim(), userRole, lang, avatar, 85, phone || '+91 99999 00000', now, now);

    db.prepare(`
      INSERT INTO user_profiles (user_id, business_name, verified, completed_orders, dispute_rate, account_age_days, trust_tier, verification_badges)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      null,
      1,
      0,
      '0%',
      1,
      'STANDARD',
      JSON.stringify(['Mobile OTP Verified', `${lang.toUpperCase()} Preferred Locale`])
    );
  });

  registerTxn();

  const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(userId) as any;
  const tokenData = issueSessionToken(user);

  res.status(201).json({
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
    token: tokenData.token,
    tokenId: tokenData.tokenId,
  });
}

export function switchDemoUser(req: Request, res: Response): void {
  const { userId } = req.body;
  if (!userId) {
    res.status(400).json({ error: 'USER_ID_REQUIRED' });
    return;
  }

  const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(userId) as any;
  if (!user) {
    res.status(404).json({ error: 'USER_NOT_FOUND', message: 'Requested demo user does not exist' });
    return;
  }

  const profile = db.prepare(`SELECT * FROM user_profiles WHERE user_id = ?`).get(user.id) as any;
  const tokenData = issueSessionToken(user);

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
    profile: profile
      ? {
          userId: profile.user_id,
          businessName: profile.business_name,
          verified: Boolean(profile.verified),
          completedOrders: profile.completed_orders,
          disputeRate: profile.dispute_rate,
          accountAgeDays: profile.account_age_days,
          trustTier: profile.trust_tier,
          verificationBadges: JSON.parse(profile.verification_badges || '[]'),
        }
      : null,
    token: tokenData.token,
    tokenId: tokenData.tokenId,
    expiresIn: tokenData.expiresIn,
  });
}

export function logout(req: AuthenticatedRequest, res: Response): void {
  if (req.user?.tokenId) {
    revokeSessionToken(req.user.tokenId);
  }
  res.json({ success: true, message: 'Logged out successfully.' });
}

export function getMe(req: AuthenticatedRequest, res: Response): void {
  const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(req.user!.userId) as any;
  if (!user) {
    res.status(404).json({ error: 'USER_NOT_FOUND' });
    return;
  }

  const profile = db.prepare(`SELECT * FROM user_profiles WHERE user_id = ?`).get(user.id) as any;

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
    profile: profile
      ? {
          userId: profile.user_id,
          businessName: profile.business_name,
          verified: Boolean(profile.verified),
          completedOrders: profile.completed_orders,
          disputeRate: profile.dispute_rate,
          accountAgeDays: profile.account_age_days,
          trustTier: profile.trust_tier,
          verificationBadges: JSON.parse(profile.verification_badges || '[]'),
        }
      : null,
  });
}
