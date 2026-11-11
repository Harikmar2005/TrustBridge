import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Database storage location
const DB_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = path.join(DB_DIR, 'trustbridge.db');

export const db: Database.Database = new Database(DB_PATH);

// Enable WAL mode for high concurrency and foreign key enforcement
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/**
 * Initializes database schema with primary keys, foreign keys, indexes, and constraints
 */
export function initializeDatabase(): void {
  db.exec(`
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('buyer', 'seller', 'support', 'admin')),
      preferred_language TEXT NOT NULL DEFAULT 'en' CHECK(preferred_language IN ('en', 'ta', 'hi')),
      avatar TEXT NOT NULL,
      trust_score INTEGER NOT NULL DEFAULT 85 CHECK(trust_score >= 0 AND trust_score <= 100),
      phone TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- User profiles table
    CREATE TABLE IF NOT EXISTS user_profiles (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      business_name TEXT,
      verified INTEGER NOT NULL DEFAULT 1,
      completed_orders INTEGER NOT NULL DEFAULT 0,
      dispute_rate TEXT NOT NULL DEFAULT '0%',
      account_age_days INTEGER NOT NULL DEFAULT 1,
      trust_tier TEXT NOT NULL DEFAULT 'STANDARD' CHECK(trust_tier IN ('PLATINUM', 'GOLD', 'STANDARD', 'PROBATION')),
      verification_badges TEXT NOT NULL -- JSON array
    );

    -- Transactions table
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      reference_number TEXT UNIQUE NOT NULL,
      buyer_id TEXT NOT NULL REFERENCES users(id),
      seller_id TEXT NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      status TEXT NOT NULL DEFAULT 'IN_ESCROW' CHECK(status IN ('COMPLETED', 'IN_ESCROW', 'DISPUTED', 'CANCELLED')),
      date TEXT NOT NULL,
      category TEXT NOT NULL
    );

    -- Conversations table
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK(type IN ('direct', 'dispute_room')),
      nexconn_channel_id TEXT NOT NULL,
      buyer_id TEXT NOT NULL REFERENCES users(id),
      seller_id TEXT NOT NULL REFERENCES users(id),
      dispute_id TEXT,
      transaction_id TEXT,
      title TEXT NOT NULL,
      last_message_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'archived'))
    );

    -- Messages table
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      sender_id TEXT NOT NULL REFERENCES users(id),
      sender_name TEXT NOT NULL,
      sender_role TEXT NOT NULL,
      content TEXT NOT NULL,
      language TEXT NOT NULL DEFAULT 'en',
      translations_json TEXT NOT NULL, -- JSON Record<string, string>
      risk_score INTEGER NOT NULL DEFAULT 0,
      risk_category TEXT NOT NULL CHECK(risk_category IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
      detected_indicators_json TEXT NOT NULL, -- JSON string[]
      recommended_action TEXT NOT NULL,
      detection_engine TEXT NOT NULL DEFAULT 'HEURISTIC_RULE_ENGINE',
      confidence_score REAL NOT NULL DEFAULT 0.85,
      is_flagged INTEGER NOT NULL DEFAULT 0,
      is_false_positive INTEGER NOT NULL DEFAULT 0,
      timestamp TEXT NOT NULL,
      delivery_status TEXT DEFAULT 'DELIVERED_LOCAL',
      nexconn_message_id TEXT
    );

    -- Disputes table
    CREATE TABLE IF NOT EXISTS disputes (
      id TEXT PRIMARY KEY,
      reference_id TEXT UNIQUE NOT NULL,
      transaction_id TEXT NOT NULL,
      conversation_id TEXT NOT NULL,
      buyer_id TEXT NOT NULL REFERENCES users(id),
      seller_id TEXT NOT NULL REFERENCES users(id),
      assigned_agent_id TEXT REFERENCES users(id),
      category TEXT NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_FOR_USER', 'RESOLVED', 'ESCALATED')),
      priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK(priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
      resolution_note TEXT,
      resolution_outcome TEXT CHECK(resolution_outcome IS NULL OR resolution_outcome IN ('FULL_REFUND', 'PARTIAL_REFUND', 'FUNDS_RELEASED', 'DISMISSED')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Dispute Evidence table
    CREATE TABLE IF NOT EXISTS dispute_evidence (
      id TEXT PRIMARY KEY,
      dispute_id TEXT NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
      uploaded_by TEXT NOT NULL REFERENCES users(id),
      file_url TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_size INTEGER NOT NULL DEFAULT 0,
      mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
      description TEXT NOT NULL,
      uploaded_at TEXT NOT NULL
    );

    -- Dispute History table
    CREATE TABLE IF NOT EXISTS dispute_history (
      id TEXT PRIMARY KEY,
      dispute_id TEXT NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
      changed_by TEXT NOT NULL,
      from_status TEXT NOT NULL,
      to_status TEXT NOT NULL,
      action_taken TEXT NOT NULL,
      note TEXT NOT NULL,
      timestamp TEXT NOT NULL
    );

    -- Support Tickets table
    CREATE TABLE IF NOT EXISTS support_tickets (
      id TEXT PRIMARY KEY,
      ticket_number TEXT UNIQUE NOT NULL,
      dispute_id TEXT,
      conversation_id TEXT NOT NULL,
      requester_id TEXT NOT NULL REFERENCES users(id),
      assigned_agent_id TEXT REFERENCES users(id),
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK(priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
      status TEXT NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_FOR_USER', 'RESOLVED', 'ESCALATED')),
      category TEXT NOT NULL,
      created_at TEXT NOT NULL,
      resolved_at TEXT
    );

    -- Fraud Alerts table
    CREATE TABLE IF NOT EXISTS fraud_alerts (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      message_id TEXT NOT NULL,
      target_user_id TEXT NOT NULL REFERENCES users(id),
      target_user_name TEXT NOT NULL,
      risk_score INTEGER NOT NULL,
      category TEXT NOT NULL,
      indicators_json TEXT NOT NULL, -- JSON string[]
      severity TEXT NOT NULL CHECK(severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
      review_status TEXT NOT NULL DEFAULT 'NEW' CHECK(review_status IN ('NEW', 'REVIEWED', 'DISMISSED', 'ACTIONED')),
      created_at TEXT NOT NULL
    );

    -- Immutable Audit Logs table
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      actor_id TEXT NOT NULL,
      actor_name TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      details TEXT NOT NULL,
      ip_address TEXT DEFAULT '127.0.0.1',
      timestamp TEXT NOT NULL
    );

    -- User Auth Sessions table for token revocation
    CREATE TABLE IF NOT EXISTS auth_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_id TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      revoked_at TEXT
    );

    -- AI 2.0 Fraud Analyses Table: Complete structured intelligence persistence
    CREATE TABLE IF NOT EXISTS fraud_analyses (
      id TEXT PRIMARY KEY,
      message_id TEXT REFERENCES messages(id) ON DELETE CASCADE,
      conversation_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      risk_score INTEGER NOT NULL,
      risk_category TEXT NOT NULL CHECK(risk_category IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
      confidence_score REAL NOT NULL DEFAULT 0.95,
      nlp_score INTEGER NOT NULL DEFAULT 0,
      url_score INTEGER NOT NULL DEFAULT 0,
      behavioural_score INTEGER NOT NULL DEFAULT 0,
      ml_score INTEGER NOT NULL DEFAULT 0,
      detected_indicators_json TEXT NOT NULL,
      evidence_references_json TEXT NOT NULL,
      recommendation TEXT NOT NULL,
      explanation TEXT NOT NULL,
      model_version TEXT NOT NULL DEFAULT 'v2.0-sentinel',
      detectors_status_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    -- Performance Indexes
    CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
    CREATE INDEX IF NOT EXISTS idx_conversations_participants ON conversations(buyer_id, seller_id);
    CREATE INDEX IF NOT EXISTS idx_disputes_buyer_seller ON disputes(buyer_id, seller_id);
    CREATE INDEX IF NOT EXISTS idx_disputes_agent ON disputes(assigned_agent_id);
    CREATE INDEX IF NOT EXISTS idx_fraud_alerts_severity ON fraud_alerts(severity, review_status);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
    CREATE INDEX IF NOT EXISTS idx_auth_sessions_token ON auth_sessions(token_id);
    CREATE INDEX IF NOT EXISTS idx_fraud_analyses_msg ON fraud_analyses(message_id);
    CREATE INDEX IF NOT EXISTS idx_fraud_analyses_conv ON fraud_analyses(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_fraud_analyses_created ON fraud_analyses(created_at);
  `);

  // Safe schema migrations for existing SQLite databases
  try {
    const cols = db.pragma('table_info(messages)') as Array<{ name: string }>;
    const colNames = new Set(cols.map((c) => c.name));
    if (!colNames.has('delivery_status')) {
      db.exec(`ALTER TABLE messages ADD COLUMN delivery_status TEXT DEFAULT 'DELIVERED_LOCAL'`);
    }
    if (!colNames.has('nexconn_message_id')) {
      db.exec(`ALTER TABLE messages ADD COLUMN nexconn_message_id TEXT`);
    }
  } catch (migErr) {
    console.warn('[DB Migration] Notice checking message columns:', migErr);
  }
}

