import { db, initDatabase } from "../config/database";
import { provisionAdminAccount } from "../config/seeding";

async function main(): Promise<void> {
  const email = process.env.ADMIN_EMAIL || "";
  const password = process.env.ADMIN_PASSWORD || "";
  const fullName = process.env.ADMIN_NAME || "TrustBridge Administrator";

  if (!email.trim() || !password) {
    console.error(
      "Usage error: Set ADMIN_EMAIL and ADMIN_PASSWORD environment variables (password min 12 chars) before running provision:admin."
    );
    process.exitCode = 1;
    return;
  }

  await initDatabase();
  try {
    const result = await provisionAdminAccount(db, {
      fullName,
      email,
      password,
    });
    console.log(
      `Administrator account provisioned successfully: ${result.email} (id: ${result.userId})`
    );
  } finally {
    db.close();
  }
}

main().catch((err) => {
  console.error(
    "Failed to provision administrator:",
    err instanceof Error ? err.message : err
  );
  process.exit(1);
});
