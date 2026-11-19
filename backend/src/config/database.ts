import initSqlJs, {
  type Database as SqlJsDatabase,
  type SqlValue,
} from "sql.js";
import fs from "fs";
import path from "path";
import { env } from "./env";
import { seedDemoAccountsIfEnabled } from "./seeding";

const dbPath = path.isAbsolute(env.DATABASE_PATH)
  ? env.DATABASE_PATH
  : path.resolve(__dirname, "../../", env.DATABASE_PATH);

export interface PreparedStatement<
  BindParameters extends unknown[] = unknown[],
  Result = Record<string, unknown>
> {
  get: (...params: BindParameters) => Result | undefined;
  all: (...params: BindParameters) => Result[];
  run: (...params: BindParameters) => void;
}

export interface DatabaseAdapter {
  prepare<
    BindParameters extends unknown[] = unknown[],
    Result = Record<string, unknown>
  >(
    sql: string
  ): PreparedStatement<BindParameters, Result>;
  exec(sql: string): void;
  transaction<T>(fn: () => T): T;
  close(): void;
}

class PersistentDatabase implements DatabaseAdapter {
  private connection: SqlJsDatabase | null = null;
  private inTransaction = false;

  private get database(): SqlJsDatabase {
    if (!this.connection) {
      throw new Error(
        "Database is not initialized. Call initDatabase() first."
      );
    }
    return this.connection;
  }

  async initialize(): Promise<void> {
    if (this.connection) {
      return;
    }

    const directory = path.dirname(dbPath);
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }

    const SQL = await initSqlJs();

    if (fs.existsSync(dbPath)) {
      const fileData = fs.readFileSync(dbPath);
      this.connection = new SQL.Database(fileData);
    } else {
      this.connection = new SQL.Database();
    }

    this.database.run("PRAGMA foreign_keys = ON");

    this.runMigrations();
    await this.seedInitialData();
    this.save();

    console.log(`SQLite database initialized at ${dbPath}`);
  }

  private getColumnNames(tableName: string): Set<string> {
    const rows = this.prepare<[], { name: string }>(
      `PRAGMA table_info(${tableName})`
    ).all();
    return new Set(rows.map((r) => r.name));
  }

  private addColumnIfMissing(
    tableName: string,
    columnName: string,
    definition: string
  ): void {
    const columns = this.getColumnNames(tableName);
    if (columns.size > 0 && !columns.has(columnName)) {
      this.database.exec(
        `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`
      );
    }
  }

  private runMigrations(): void {
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        appliedAt TEXT NOT NULL
      );
    `);

    const applied = new Set(
      this.prepare<[], { version: number }>(
        "SELECT version FROM schema_migrations"
      )
        .all()
        .map((r) => r.version)
    );

    if (!applied.has(1)) {
      // Base tables (compatible with pre-existing users/conversations/messages)
      this.database.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          fullName TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL COLLATE NOCASE,
          passwordHash TEXT NOT NULL,
          role TEXT NOT NULL CHECK(role IN ('buyer', 'seller', 'admin')),
          status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'suspended', 'pending_deletion')),
          preferredLanguage TEXT NOT NULL DEFAULT 'en',
          emailVerified INTEGER NOT NULL DEFAULT 0,
          notificationPrefs TEXT NOT NULL DEFAULT '{"newMessages":true,"securityAlerts":true,"disputeUpdates":true,"accountChanges":true,"adminAnnouncements":true}',
          deletionRequestedAt TEXT,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL DEFAULT ''
        );

        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

        CREATE TABLE IF NOT EXISTS seller_profiles (
          id TEXT PRIMARY KEY,
          userId TEXT UNIQUE NOT NULL,
          businessName TEXT NOT NULL,
          category TEXT NOT NULL,
          location TEXT NOT NULL,
          description TEXT NOT NULL,
          website TEXT NOT NULL DEFAULT '',
          verificationStatus TEXT NOT NULL DEFAULT 'unverified' CHECK(verificationStatus IN ('unverified', 'pending', 'verified')),
          responseTimeLabel TEXT NOT NULL DEFAULT 'Within 24 hours',
          completedTransactions INTEGER NOT NULL DEFAULT 0,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL,
          FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_seller_profiles_category ON seller_profiles(category);

        CREATE TABLE IF NOT EXISTS conversations (
          id TEXT PRIMARY KEY,
          buyerId TEXT NOT NULL,
          sellerId TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'flagged', 'archived')),
          reportedFlag INTEGER NOT NULL DEFAULT 0,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL DEFAULT '',
          UNIQUE(buyerId, sellerId),
          FOREIGN KEY (buyerId) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (sellerId) REFERENCES users(id) ON DELETE CASCADE,
          CHECK(buyerId != sellerId)
        );

        CREATE INDEX IF NOT EXISTS idx_conversations_buyer ON conversations(buyerId);
        CREATE INDEX IF NOT EXISTS idx_conversations_seller ON conversations(sellerId);

        CREATE TABLE IF NOT EXISTS messages (
          id TEXT PRIMARY KEY,
          conversationId TEXT NOT NULL,
          senderId TEXT NOT NULL,
          content TEXT NOT NULL,
          originalLanguage TEXT DEFAULT 'en',
          riskLevel TEXT NOT NULL DEFAULT 'NONE',
          nexconnMessageId TEXT,
          isDeleted INTEGER NOT NULL DEFAULT 0,
          deletedAt TEXT,
          createdAt TEXT NOT NULL,
          FOREIGN KEY (conversationId) REFERENCES conversations(id) ON DELETE CASCADE,
          FOREIGN KEY (senderId) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversationId, createdAt);
      `);

      // Non-destructive column upgrades if database already existed from earlier version
      this.addColumnIfMissing(
        "users",
        "status",
        "TEXT NOT NULL DEFAULT 'active'"
      );
      this.addColumnIfMissing(
        "users",
        "preferredLanguage",
        "TEXT NOT NULL DEFAULT 'en'"
      );
      this.addColumnIfMissing(
        "users",
        "emailVerified",
        "INTEGER NOT NULL DEFAULT 0"
      );
      this.addColumnIfMissing(
        "users",
        "notificationPrefs",
        `TEXT NOT NULL DEFAULT '{"newMessages":true,"securityAlerts":true,"disputeUpdates":true,"accountChanges":true,"adminAnnouncements":true}'`
      );
      this.addColumnIfMissing("users", "deletionRequestedAt", "TEXT");
      this.addColumnIfMissing("users", "updatedAt", "TEXT NOT NULL DEFAULT ''");

      this.addColumnIfMissing(
        "conversations",
        "status",
        "TEXT NOT NULL DEFAULT 'active'"
      );
      this.addColumnIfMissing(
        "conversations",
        "reportedFlag",
        "INTEGER NOT NULL DEFAULT 0"
      );
      this.addColumnIfMissing(
        "conversations",
        "updatedAt",
        "TEXT NOT NULL DEFAULT ''"
      );

      this.addColumnIfMissing(
        "messages",
        "originalLanguage",
        "TEXT DEFAULT 'en'"
      );
      this.addColumnIfMissing(
        "messages",
        "riskLevel",
        "TEXT NOT NULL DEFAULT 'NONE'"
      );
      this.addColumnIfMissing(
        "messages",
        "isDeleted",
        "INTEGER NOT NULL DEFAULT 0"
      );
      this.addColumnIfMissing("messages", "deletedAt", "TEXT");

      // Note: SQLite CHECK constraints on existing users table (buyer/seller) might disallow 'admin'
      // if created by an older version. Safely migrate users table preserving all rows if needed.
      const tableSqlRow = this.prepare<[], { sql: string }>(
        "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'users'"
      ).get();
      if (tableSqlRow && !tableSqlRow.sql.includes("'admin'")) {
        this.database.exec("PRAGMA foreign_keys = OFF");
        this.database.exec(`
          CREATE TABLE users_new (
            id TEXT PRIMARY KEY,
            fullName TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL COLLATE NOCASE,
            passwordHash TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('buyer', 'seller', 'admin')),
            status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'suspended', 'pending_deletion')),
            preferredLanguage TEXT NOT NULL DEFAULT 'en',
            emailVerified INTEGER NOT NULL DEFAULT 0,
            notificationPrefs TEXT NOT NULL DEFAULT '{"newMessages":true,"securityAlerts":true,"disputeUpdates":true,"accountChanges":true,"adminAnnouncements":true}',
            deletionRequestedAt TEXT,
            createdAt TEXT NOT NULL,
            updatedAt TEXT NOT NULL DEFAULT ''
          );
          INSERT INTO users_new (id, fullName, email, passwordHash, role, status, preferredLanguage, emailVerified, notificationPrefs, deletionRequestedAt, createdAt, updatedAt)
          SELECT id, fullName, email, passwordHash, role,
            COALESCE(status, 'active'),
            COALESCE(preferredLanguage, 'en'),
            COALESCE(emailVerified, 0),
            COALESCE(notificationPrefs, '{"newMessages":true,"securityAlerts":true,"disputeUpdates":true,"accountChanges":true,"adminAnnouncements":true}'),
            deletionRequestedAt,
            createdAt,
            COALESCE(NULLIF(updatedAt, ''), createdAt)
          FROM users;
          DROP TABLE users;
          ALTER TABLE users_new RENAME TO users;
          CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
          CREATE INDEX IF NOT EXISTS idx_users_role_status ON users(role, status);
        `);
        this.database.exec("PRAGMA foreign_keys = ON");
      }

      this.database.exec(`
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_users_role_status ON users(role, status);
      `);

      this.prepare<[number, string, string]>(
        "INSERT INTO schema_migrations (version, name, appliedAt) VALUES (?, ?, ?)"
      ).run(1, "core_users_sellers_messaging", new Date().toISOString());
    }

    if (!applied.has(2)) {
      this.database.exec(`
        CREATE TABLE IF NOT EXISTS message_reads (
          id TEXT PRIMARY KEY,
          messageId TEXT NOT NULL,
          conversationId TEXT NOT NULL,
          userId TEXT NOT NULL,
          readAt TEXT NOT NULL,
          UNIQUE(messageId, userId),
          FOREIGN KEY (messageId) REFERENCES messages(id) ON DELETE CASCADE,
          FOREIGN KEY (conversationId) REFERENCES conversations(id) ON DELETE CASCADE,
          FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_message_reads_conv_user ON message_reads(conversationId, userId);

        CREATE TABLE IF NOT EXISTS trust_scores (
          userId TEXT PRIMARY KEY,
          score INTEGER,
          level TEXT NOT NULL,
          factorsJson TEXT NOT NULL,
          insufficientData INTEGER NOT NULL DEFAULT 1,
          lastUpdated TEXT NOT NULL,
          FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS trust_score_events (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL,
          delta INTEGER NOT NULL,
          reason TEXT NOT NULL,
          sourceType TEXT NOT NULL,
          sourceId TEXT,
          createdAt TEXT NOT NULL,
          FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_trust_score_events_user ON trust_score_events(userId, createdAt);

        CREATE TABLE IF NOT EXISTS security_events (
          id TEXT PRIMARY KEY,
          userId TEXT,
          eventType TEXT NOT NULL,
          severity TEXT NOT NULL CHECK(severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
          description TEXT NOT NULL,
          metadataJson TEXT NOT NULL DEFAULT '{}',
          status TEXT NOT NULL DEFAULT 'PENDING_REVIEW' CHECK(status IN ('PENDING_REVIEW', 'UNDER_INVESTIGATION', 'RESOLVED', 'DISMISSED')),
          reviewedBy TEXT,
          reviewNotes TEXT,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL,
          FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL,
          FOREIGN KEY (reviewedBy) REFERENCES users(id) ON DELETE SET NULL
        );

        CREATE INDEX IF NOT EXISTS idx_security_events_user_status ON security_events(userId, status);
        CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity, createdAt);

        CREATE TABLE IF NOT EXISTS security_alerts (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL,
          securityEventId TEXT,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          severity TEXT NOT NULL CHECK(severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
          isRead INTEGER NOT NULL DEFAULT 0,
          createdAt TEXT NOT NULL,
          FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (securityEventId) REFERENCES security_events(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_security_alerts_user ON security_alerts(userId, isRead, createdAt);

        CREATE TABLE IF NOT EXISTS disputes (
          id TEXT PRIMARY KEY,
          conversationId TEXT,
          buyerId TEXT NOT NULL,
          sellerId TEXT NOT NULL,
          openedBy TEXT NOT NULL,
          category TEXT NOT NULL,
          subject TEXT NOT NULL,
          description TEXT NOT NULL,
          evidenceJson TEXT NOT NULL DEFAULT '[]',
          status TEXT NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN', 'UNDER_REVIEW', 'WAITING_FOR_RESPONSE', 'RESOLVED', 'REJECTED')),
          resolutionNotes TEXT,
          resolvedBy TEXT,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL,
          FOREIGN KEY (conversationId) REFERENCES conversations(id) ON DELETE SET NULL,
          FOREIGN KEY (buyerId) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (sellerId) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (openedBy) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (resolvedBy) REFERENCES users(id) ON DELETE SET NULL
        );

        CREATE INDEX IF NOT EXISTS idx_disputes_participants ON disputes(buyerId, sellerId, status);

        CREATE TABLE IF NOT EXISTS dispute_responses (
          id TEXT PRIMARY KEY,
          disputeId TEXT NOT NULL,
          authorId TEXT NOT NULL,
          authorRole TEXT NOT NULL,
          message TEXT NOT NULL,
          evidenceText TEXT,
          createdAt TEXT NOT NULL,
          FOREIGN KEY (disputeId) REFERENCES disputes(id) ON DELETE CASCADE,
          FOREIGN KEY (authorId) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_dispute_responses_dispute ON dispute_responses(disputeId, createdAt);

        CREATE TABLE IF NOT EXISTS notifications (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL,
          type TEXT NOT NULL,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          link TEXT,
          isRead INTEGER NOT NULL DEFAULT 0,
          createdAt TEXT NOT NULL,
          FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(userId, isRead, createdAt);

        CREATE TABLE IF NOT EXISTS user_sessions (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL,
          userAgent TEXT NOT NULL DEFAULT 'Unknown',
          ipAddress TEXT NOT NULL DEFAULT 'unknown',
          isRevoked INTEGER NOT NULL DEFAULT 0,
          expiresAt TEXT NOT NULL,
          createdAt TEXT NOT NULL,
          lastActiveAt TEXT NOT NULL,
          FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(userId, isRevoked);

        CREATE TABLE IF NOT EXISTS audit_logs (
          id TEXT PRIMARY KEY,
          actorId TEXT,
          action TEXT NOT NULL,
          targetType TEXT NOT NULL,
          targetId TEXT,
          detailsJson TEXT NOT NULL DEFAULT '{}',
          ipAddress TEXT NOT NULL DEFAULT 'unknown',
          createdAt TEXT NOT NULL,
          FOREIGN KEY (actorId) REFERENCES users(id) ON DELETE SET NULL
        );

        CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(createdAt);

        CREATE TABLE IF NOT EXISTS password_reset_tokens (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL,
          tokenHash TEXT NOT NULL,
          expiresAt TEXT NOT NULL,
          usedAt TEXT,
          createdAt TEXT NOT NULL,
          FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS platform_policies (
          key TEXT PRIMARY KEY,
          label TEXT NOT NULL,
          value TEXT NOT NULL,
          description TEXT NOT NULL,
          updatedBy TEXT,
          updatedAt TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS account_reports (
          id TEXT PRIMARY KEY,
          reporterId TEXT NOT NULL,
          reportedUserId TEXT NOT NULL,
          conversationId TEXT,
          reason TEXT NOT NULL,
          details TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'PENDING_REVIEW' CHECK(status IN ('PENDING_REVIEW', 'REVIEWED', 'DISMISSED')),
          reviewedBy TEXT,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL,
          FOREIGN KEY (reporterId) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (reportedUserId) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (conversationId) REFERENCES conversations(id) ON DELETE SET NULL,
          FOREIGN KEY (reviewedBy) REFERENCES users(id) ON DELETE SET NULL
        );
      `);

      this.prepare<[number, string, string]>(
        "INSERT INTO schema_migrations (version, name, appliedAt) VALUES (?, ?, ?)"
      ).run(2, "trust_security_disputes_sessions_audit", new Date().toISOString());
    }

    // Non-destructive additive column upgrade for Nexconn message ID tracking
    this.addColumnIfMissing("messages", "nexconnMessageId", "TEXT");
  }

  private async seedInitialData(): Promise<void> {
    const now = new Date().toISOString();

    // Ensure default platform policies exist (non-credential configuration defaults)
    const policyCount =
      this.prepare<[], { cnt: number }>(
        "SELECT COUNT(*) AS cnt FROM platform_policies"
      ).get()?.cnt ?? 0;

    if (policyCount === 0) {
      const defaultPolicies = [
        {
          key: "fraud_keyword_sensitivity",
          label: "Fraud keyword detection",
          value: "enabled",
          description:
            "Flags messages matching off-platform payment diversion, credential phishing, or urgency coercion rules.",
        },
        {
          key: "message_burst_threshold",
          label: "Message burst limit (per minute)",
          value: "6",
          description:
            "Triggers an automated unusual-frequency security event when a user exceeds this message rate in 60 seconds.",
        },
        {
          key: "failed_login_alert_threshold",
          label: "Failed login alert threshold",
          value: "3",
          description:
            "Logs a security event after consecutive failed sign-in attempts for an account.",
        },
        {
          key: "min_trust_data_messages",
          label: "Minimum interactions for trust score",
          value: "2",
          description:
            "Accounts below this activity threshold display 'Not enough data' instead of an inferred numeric trust score.",
        },
      ];

      for (const p of defaultPolicies) {
        this.prepare<[string, string, string, string, string]>(
          `INSERT OR IGNORE INTO platform_policies (key, label, value, description, updatedAt)
           VALUES (?, ?, ?, ?, ?)`
        ).run(p.key, p.label, p.value, p.description, now);
      }
    }

    // Optional development-only demo account seeding (disabled by default, forbidden in production)
    const seedResult = await seedDemoAccountsIfEnabled(this, {
      nodeEnv: env.NODE_ENV,
      enableDemoSeed: env.ENABLE_DEMO_SEED,
      adminEmail: env.DEMO_ADMIN_EMAIL,
      adminPassword: env.DEMO_ADMIN_PASSWORD,
      buyerEmail: env.DEMO_BUYER_EMAIL,
      buyerPassword: env.DEMO_BUYER_PASSWORD,
      sellerEmail: env.DEMO_SELLER_EMAIL,
      sellerPassword: env.DEMO_SELLER_PASSWORD,
    });

    if (seedResult.seeded) {
      console.log(
        `Development demo accounts seeded (${seedResult.createdUsers.length} created, ${seedResult.skippedExisting.length} preserved).`
      );
    }
  }

  prepare<
    BindParameters extends unknown[] = unknown[],
    Result = Record<string, unknown>
  >(sql: string): PreparedStatement<BindParameters, Result> {
    return {
      get: (...params: BindParameters): Result | undefined => {
        const statement = this.database.prepare(sql);
        try {
          statement.bind(params as SqlValue[]);
          if (statement.step()) {
            return statement.getAsObject() as Result;
          }
          return undefined;
        } finally {
          statement.free();
        }
      },

      all: (...params: BindParameters): Result[] => {
        const statement = this.database.prepare(sql);
        const results: Result[] = [];
        try {
          statement.bind(params as SqlValue[]);
          while (statement.step()) {
            results.push(statement.getAsObject() as Result);
          }
          return results;
        } finally {
          statement.free();
        }
      },

      run: (...params: BindParameters): void => {
        this.database.run(sql, params as SqlValue[]);
        if (!this.inTransaction) {
          this.save();
        }
      },
    };
  }

  exec(sql: string): void {
    this.database.exec(sql);
    if (!this.inTransaction) {
      this.save();
    }
  }

  transaction<T>(fn: () => T): T {
    if (this.inTransaction) {
      return fn();
    }
    this.database.exec("BEGIN TRANSACTION");
    this.inTransaction = true;
    try {
      const result = fn();
      this.database.exec("COMMIT");
      this.save();
      return result;
    } catch (error) {
      try {
        this.database.exec("ROLLBACK");
      } catch {
        // Ignore rollback errors if connection already rolled back
      }
      throw error;
    } finally {
      this.inTransaction = false;
    }
  }

  save(): void {
    if (!this.connection) return;
    const exportedData = this.database.export();
    fs.writeFileSync(dbPath, Buffer.from(exportedData));
  }

  close(): void {
    if (!this.connection) return;
    this.save();
    this.database.close();
    this.connection = null;
  }
}

const persistentDatabase = new PersistentDatabase();

export const db = persistentDatabase;

export async function initDatabase(): Promise<void> {
  await persistentDatabase.initialize();
}
