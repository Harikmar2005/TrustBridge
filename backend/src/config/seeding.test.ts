import { describe, it } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { verify } from "@node-rs/argon2";
import initSqlJs, { type SqlValue } from "sql.js";
import type { DatabaseAdapter, PreparedStatement } from "./database";
import {
  provisionAdminAccount,
  seedDemoAccountsIfEnabled,
} from "./seeding";

async function createInMemoryDb(): Promise<DatabaseAdapter> {
  const SQL = await initSqlJs();
  const conn = new SQL.Database();
  conn.run("PRAGMA foreign_keys = ON");
  conn.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      fullName TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL COLLATE NOCASE,
      passwordHash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('buyer', 'seller', 'admin')),
      status TEXT NOT NULL DEFAULT 'active',
      preferredLanguage TEXT NOT NULL DEFAULT 'en',
      emailVerified INTEGER NOT NULL DEFAULT 0,
      notificationPrefs TEXT NOT NULL DEFAULT '{}',
      deletionRequestedAt TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE seller_profiles (
      id TEXT PRIMARY KEY,
      userId TEXT UNIQUE NOT NULL,
      businessName TEXT NOT NULL,
      category TEXT NOT NULL,
      location TEXT NOT NULL,
      description TEXT NOT NULL,
      website TEXT NOT NULL DEFAULT '',
      verificationStatus TEXT NOT NULL DEFAULT 'unverified',
      responseTimeLabel TEXT NOT NULL DEFAULT 'Within 24 hours',
      completedTransactions INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE audit_logs (
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
  `);

  let inTx = false;

  return {
    prepare<BindParameters extends unknown[] = unknown[], Result = Record<string, unknown>>(
      sql: string
    ): PreparedStatement<BindParameters, Result> {
      return {
        get: (...params: BindParameters): Result | undefined => {
          const stmt = conn.prepare(sql);
          try {
            stmt.bind(params as SqlValue[]);
            return stmt.step() ? (stmt.getAsObject() as Result) : undefined;
          } finally {
            stmt.free();
          }
        },
        all: (...params: BindParameters): Result[] => {
          const stmt = conn.prepare(sql);
          const rows: Result[] = [];
          try {
            stmt.bind(params as SqlValue[]);
            while (stmt.step()) {
              rows.push(stmt.getAsObject() as Result);
            }
            return rows;
          } finally {
            stmt.free();
          }
        },
        run: (...params: BindParameters): void => {
          conn.run(sql, params as SqlValue[]);
        },
      };
    },
    exec(sql: string): void {
      conn.exec(sql);
    },
    transaction<T>(fn: () => T): T {
      if (inTx) return fn();
      conn.exec("BEGIN TRANSACTION");
      inTx = true;
      try {
        const res = fn();
        conn.exec("COMMIT");
        return res;
      } catch (err) {
        try {
          conn.exec("ROLLBACK");
        } catch {
          // ignore rollback error
        }
        throw err;
      } finally {
        inTx = false;
      }
    },
    close(): void {
      conn.close();
    },
  };
}

function makeTestPassword(tag: string): string {
  return `Test_${tag}_${crypto.randomBytes(6).toString("hex")}!9`;
}

describe("Development Demo Seeding & Admin Provisioning Security", () => {
  it("disables demo seeding by default (ENABLE_DEMO_SEED=false) and creates zero users", async () => {
    const db = await createInMemoryDb();
    try {
      const result = await seedDemoAccountsIfEnabled(db, {
        nodeEnv: "development",
        enableDemoSeed: false,
        adminEmail: "",
        adminPassword: "",
        buyerEmail: "",
        buyerPassword: "",
        sellerEmail: "",
        sellerPassword: "",
      });

      assert.equal(result.seeded, false);
      assert.equal(result.createdUsers.length, 0);
      const row = db
        .prepare<[], { cnt: number }>("SELECT COUNT(*) AS cnt FROM users")
        .get();
      assert.equal(row?.cnt, 0);
    } finally {
      db.close();
    }
  });

  it("forbids demo seeding in production even when ENABLE_DEMO_SEED=true", async () => {
    const db = await createInMemoryDb();
    try {
      await assert.rejects(
        () =>
          seedDemoAccountsIfEnabled(db, {
            nodeEnv: "production",
            enableDemoSeed: true,
            adminEmail: "ops-admin@example.test",
            adminPassword: makeTestPassword("admin"),
            buyerEmail: "ops-buyer@example.test",
            buyerPassword: makeTestPassword("buyer"),
            sellerEmail: "ops-seller@example.test",
            sellerPassword: makeTestPassword("seller"),
          }),
        /NODE_ENV=production/
      );

      const row = db
        .prepare<[], { cnt: number }>("SELECT COUNT(*) AS cnt FROM users")
        .get();
      assert.equal(row?.cnt, 0);
    } finally {
      db.close();
    }
  });

  it("rejects demo seeding in non-development environments such as test", async () => {
    const db = await createInMemoryDb();
    try {
      await assert.rejects(
        () =>
          seedDemoAccountsIfEnabled(db, {
            nodeEnv: "test",
            enableDemoSeed: true,
            adminEmail: "t-admin@example.test",
            adminPassword: makeTestPassword("admin"),
            buyerEmail: "t-buyer@example.test",
            buyerPassword: makeTestPassword("buyer"),
            sellerEmail: "t-seller@example.test",
            sellerPassword: makeTestPassword("seller"),
          }),
        /NODE_ENV=development/
      );
    } finally {
      db.close();
    }
  });

  it("rejects missing, weak (<12 chars), or duplicate demo credentials without partial inserts", async () => {
    const db = await createInMemoryDb();
    try {
      // Weak password
      await assert.rejects(
        () =>
          seedDemoAccountsIfEnabled(db, {
            nodeEnv: "development",
            enableDemoSeed: true,
            adminEmail: "dev-admin@example.test",
            adminPassword: "short",
            buyerEmail: "dev-buyer@example.test",
            buyerPassword: makeTestPassword("buyer"),
            sellerEmail: "dev-seller@example.test",
            sellerPassword: makeTestPassword("seller"),
          }),
        /at least 12 characters/
      );

      // Duplicate emails
      await assert.rejects(
        () =>
          seedDemoAccountsIfEnabled(db, {
            nodeEnv: "development",
            enableDemoSeed: true,
            adminEmail: "same@example.test",
            adminPassword: makeTestPassword("admin"),
            buyerEmail: "same@example.test",
            buyerPassword: makeTestPassword("buyer"),
            sellerEmail: "dev-seller@example.test",
            sellerPassword: makeTestPassword("seller"),
          }),
        /must be distinct/
      );

      const row = db
        .prepare<[], { cnt: number }>("SELECT COUNT(*) AS cnt FROM users")
        .get();
      assert.equal(row?.cnt, 0);
    } finally {
      db.close();
    }
  });

  it("seeds admin, buyer, and seller with Argon2 hashes in development when explicitly enabled", async () => {
    const db = await createInMemoryDb();
    const adminPassword = makeTestPassword("admin");
    const buyerPassword = makeTestPassword("buyer");
    const sellerPassword = makeTestPassword("seller");

    try {
      const result = await seedDemoAccountsIfEnabled(db, {
        nodeEnv: "development",
        enableDemoSeed: true,
        adminEmail: "dev-admin@example.test",
        adminPassword,
        buyerEmail: "dev-buyer@example.test",
        buyerPassword,
        sellerEmail: "dev-seller@example.test",
        sellerPassword,
      });

      assert.equal(result.seeded, true);
      assert.equal(result.createdUsers.length, 3);
      assert.equal(result.skippedExisting.length, 0);

      const adminRow = db
        .prepare<[string], { passwordHash: string; role: string }>(
          "SELECT passwordHash, role FROM users WHERE email = ?"
        )
        .get("dev-admin@example.test");
      assert.ok(adminRow);
      assert.equal(adminRow.role, "admin");
      assert.ok(adminRow.passwordHash.startsWith("$argon2"));
      assert.notEqual(adminRow.passwordHash, adminPassword);
      assert.equal(await verify(adminRow.passwordHash, adminPassword), true);

      const buyerRow = db
        .prepare<[string], { passwordHash: string; role: string }>(
          "SELECT passwordHash, role FROM users WHERE email = ?"
        )
        .get("dev-buyer@example.test");
      assert.ok(buyerRow);
      assert.equal(buyerRow.role, "buyer");
      assert.equal(await verify(buyerRow.passwordHash, buyerPassword), true);

      const sellerRow = db
        .prepare<[string], { id: string; passwordHash: string; role: string }>(
          "SELECT id, passwordHash, role FROM users WHERE email = ?"
        )
        .get("dev-seller@example.test");
      assert.ok(sellerRow);
      assert.equal(sellerRow.role, "seller");
      assert.equal(await verify(sellerRow.passwordHash, sellerPassword), true);

      const sellerProfile = db
        .prepare<[string], { userId: string; verificationStatus: string }>(
          "SELECT userId, verificationStatus FROM seller_profiles WHERE userId = ?"
        )
        .get(sellerRow.id);
      assert.ok(sellerProfile);
      assert.equal(sellerProfile.verificationStatus, "verified");
    } finally {
      db.close();
    }
  });

  it("preserves existing accounts and never overwrites existing passwords on re-seed", async () => {
    const db = await createInMemoryDb();
    const existingId = "existing-user-id-123";
    const existingHash = "$argon2id$v=19$m=19456,t=2,p=1$customsalt$customhashvalue";
    const now = new Date().toISOString();

    try {
      db.prepare<[string, string, string, string, string, string]>(
        `INSERT INTO users (id, fullName, email, passwordHash, role, status, emailVerified, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, 'buyer', 'active', 1, ?, ?)`
      ).run(
        existingId,
        "Existing Buyer",
        "dev-buyer@example.test",
        existingHash,
        now,
        now
      );

      const result = await seedDemoAccountsIfEnabled(db, {
        nodeEnv: "development",
        enableDemoSeed: true,
        adminEmail: "dev-admin@example.test",
        adminPassword: makeTestPassword("admin"),
        buyerEmail: "dev-buyer@example.test",
        buyerPassword: makeTestPassword("newbuyer"),
        sellerEmail: "dev-seller@example.test",
        sellerPassword: makeTestPassword("seller"),
      });

      assert.equal(result.seeded, true);
      assert.deepEqual(result.skippedExisting, ["dev-buyer@example.test"]);

      const preserved = db
        .prepare<[string], { id: string; fullName: string; passwordHash: string }>(
          "SELECT id, fullName, passwordHash FROM users WHERE email = ?"
        )
        .get("dev-buyer@example.test");
      assert.ok(preserved);
      assert.equal(preserved.id, existingId);
      assert.equal(preserved.fullName, "Existing Buyer");
      assert.equal(preserved.passwordHash, existingHash);
    } finally {
      db.close();
    }
  });

  it("provisions administrator accounts via backend CLI helper with Argon2 hash and refuses overwrites", async () => {
    const db = await createInMemoryDb();
    const adminPass = makeTestPassword("cliadmin");

    try {
      const provisioned = await provisionAdminAccount(db, {
        fullName: "Security Officer",
        email: "SecurityAdmin@example.test",
        password: adminPass,
      });

      assert.equal(provisioned.email, "securityadmin@example.test");

      const row = db
        .prepare<[string], { id: string; role: string; passwordHash: string }>(
          "SELECT id, role, passwordHash FROM users WHERE email = ?"
        )
        .get("securityadmin@example.test");
      assert.ok(row);
      assert.equal(row.role, "admin");
      assert.ok(row.passwordHash.startsWith("$argon2"));
      assert.equal(await verify(row.passwordHash, adminPass), true);

      const audit = db
        .prepare<[string], { action: string; targetId: string }>(
          "SELECT action, targetId FROM audit_logs WHERE actorId = ?"
        )
        .get(row.id);
      assert.ok(audit);
      assert.equal(audit.action, "ADMIN_PROVISIONED_CLI");
      assert.equal(audit.targetId, row.id);

      await assert.rejects(
        () =>
          provisionAdminAccount(db, {
            email: "securityadmin@example.test",
            password: makeTestPassword("other"),
          }),
        /already exists/
      );
    } finally {
      db.close();
    }
  });
});
