import { hash } from "@node-rs/argon2";
import crypto from "crypto";
import { z } from "zod";
import type { DatabaseAdapter } from "./database";

export interface DemoSeedConfig {
  nodeEnv: string;
  enableDemoSeed: boolean;
  adminEmail: string;
  adminPassword: string;
  buyerEmail: string;
  buyerPassword: string;
  sellerEmail: string;
  sellerPassword: string;
}

export interface DemoSeedResult {
  seeded: boolean;
  reason: string;
  createdUsers: Array<{ email: string; role: "admin" | "buyer" | "seller" }>;
  skippedExisting: string[];
}

const demoCredentialsSchema = z.object({
  adminEmail: z.string().trim().email("DEMO_ADMIN_EMAIL must be a valid email"),
  adminPassword: z
    .string()
    .min(12, "DEMO_ADMIN_PASSWORD must be at least 12 characters"),
  buyerEmail: z.string().trim().email("DEMO_BUYER_EMAIL must be a valid email"),
  buyerPassword: z
    .string()
    .min(12, "DEMO_BUYER_PASSWORD must be at least 12 characters"),
  sellerEmail: z.string().trim().email("DEMO_SELLER_EMAIL must be a valid email"),
  sellerPassword: z
    .string()
    .min(12, "DEMO_SELLER_PASSWORD must be at least 12 characters"),
});

const adminProvisionSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Admin full name must be at least 2 characters")
    .max(80)
    .default("TrustBridge Administrator"),
  email: z.string().trim().email("ADMIN_EMAIL must be a valid email").toLowerCase(),
  password: z
    .string()
    .min(12, "ADMIN_PASSWORD must be at least 12 characters")
    .max(128),
});

export async function seedDemoAccountsIfEnabled(
  database: DatabaseAdapter,
  config: DemoSeedConfig
): Promise<DemoSeedResult> {
  if (!config.enableDemoSeed) {
    return {
      seeded: false,
      reason: "Demo seeding disabled (ENABLE_DEMO_SEED is not true).",
      createdUsers: [],
      skippedExisting: [],
    };
  }

  if (config.nodeEnv === "production") {
    throw new Error(
      "Security configuration error: Demo account seeding cannot run when NODE_ENV=production."
    );
  }

  if (config.nodeEnv !== "development") {
    throw new Error(
      "Security configuration error: Demo account seeding is only permitted when NODE_ENV=development."
    );
  }

  const parsed = demoCredentialsSchema.safeParse({
    adminEmail: config.adminEmail,
    adminPassword: config.adminPassword,
    buyerEmail: config.buyerEmail,
    buyerPassword: config.buyerPassword,
    sellerEmail: config.sellerEmail,
    sellerPassword: config.sellerPassword,
  });

  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => i.message).join("; ");
    throw new Error(
      `Demo seeding configuration error: missing or invalid environment credentials (${details}).`
    );
  }

  const creds = {
    adminEmail: parsed.data.adminEmail.toLowerCase(),
    adminPassword: parsed.data.adminPassword,
    buyerEmail: parsed.data.buyerEmail.toLowerCase(),
    buyerPassword: parsed.data.buyerPassword,
    sellerEmail: parsed.data.sellerEmail.toLowerCase(),
    sellerPassword: parsed.data.sellerPassword,
  };

  const uniqueEmails = new Set([
    creds.adminEmail,
    creds.buyerEmail,
    creds.sellerEmail,
  ]);
  if (uniqueEmails.size !== 3) {
    throw new Error(
      "Demo seeding configuration error: DEMO_ADMIN_EMAIL, DEMO_BUYER_EMAIL, and DEMO_SELLER_EMAIL must be distinct."
    );
  }

  const now = new Date().toISOString();
  const createdUsers: Array<{ email: string; role: "admin" | "buyer" | "seller" }> =
    [];
  const skippedExisting: string[] = [];

  const ensureAccount = async (params: {
    fullName: string;
    email: string;
    password: string;
    role: "admin" | "buyer" | "seller";
  }): Promise<{ id: string; created: boolean }> => {
    const existing = database
      .prepare<[string], { id: string }>(
        "SELECT id FROM users WHERE email = ?"
      )
      .get(params.email);

    if (existing) {
      skippedExisting.push(params.email);
      return { id: existing.id, created: false };
    }

    const passwordHash = await hash(params.password);
    const id = crypto.randomUUID();
    database
      .prepare<[string, string, string, string, string, number, string, string]>(
        `INSERT INTO users (id, fullName, email, passwordHash, role, status, emailVerified, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?)`
      )
      .run(
        id,
        params.fullName,
        params.email,
        passwordHash,
        params.role,
        1,
        now,
        now
      );

    createdUsers.push({ email: params.email, role: params.role });
    return { id, created: true };
  };

  await ensureAccount({
    fullName: "TrustBridge Demo Admin",
    email: creds.adminEmail,
    password: creds.adminPassword,
    role: "admin",
  });

  await ensureAccount({
    fullName: "TrustBridge Demo Buyer",
    email: creds.buyerEmail,
    password: creds.buyerPassword,
    role: "buyer",
  });

  const sellerResult = await ensureAccount({
    fullName: "TrustBridge Demo Seller",
    email: creds.sellerEmail,
    password: creds.sellerPassword,
    role: "seller",
  });

  if (sellerResult.created) {
    database
      .prepare<[string, string, string, string, string, string, string, string, string, number, string, string]>(
        `INSERT OR IGNORE INTO seller_profiles (id, userId, businessName, category, location, description, website, verificationStatus, responseTimeLabel, completedTransactions, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        crypto.randomUUID(),
        sellerResult.id,
        "Demo Verified Merchant",
        "General Commerce",
        "Local Development",
        "Development evaluation merchant storefront.",
        "",
        "verified",
        "Within 4 hours",
        0,
        now,
        now
      );
  }

  return {
    seeded: createdUsers.length > 0,
    reason:
      createdUsers.length > 0
        ? "Development demo accounts seeded from environment variables."
        : "All configured demo accounts already exist; existing users preserved.",
    createdUsers,
    skippedExisting,
  };
}

export async function provisionAdminAccount(
  database: DatabaseAdapter,
  input: { fullName?: string; email: string; password: string }
): Promise<{ userId: string; email: string; fullName: string }> {
  const parsed = adminProvisionSchema.safeParse({
    fullName: input.fullName || "TrustBridge Administrator",
    email: input.email,
    password: input.password,
  });

  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => i.message).join("; ");
    throw new Error(`Admin provisioning validation failed: ${details}`);
  }

  const existing = database
    .prepare<[string], { id: string }>("SELECT id FROM users WHERE email = ?")
    .get(parsed.data.email);

  if (existing) {
    throw new Error(
      `Cannot provision administrator: account with email "${parsed.data.email}" already exists. Existing users are never overwritten.`
    );
  }

  const passwordHash = await hash(parsed.data.password);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  database.transaction(() => {
    database
      .prepare<[string, string, string, string, number, string, string]>(
        `INSERT INTO users (id, fullName, email, passwordHash, role, status, emailVerified, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, 'admin', 'active', ?, ?, ?)`
      )
      .run(
        id,
        parsed.data.fullName,
        parsed.data.email,
        passwordHash,
        1,
        now,
        now
      );

    database
      .prepare<[string, string, string, string, string, string, string, string]>(
        `INSERT INTO audit_logs (id, actorId, action, targetType, targetId, detailsJson, ipAddress, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        crypto.randomUUID(),
        id,
        "ADMIN_PROVISIONED_CLI",
        "user",
        id,
        JSON.stringify({ email: parsed.data.email }),
        "cli",
        now
      );
  });

  return {
    userId: id,
    email: parsed.data.email,
    fullName: parsed.data.fullName,
  };
}
