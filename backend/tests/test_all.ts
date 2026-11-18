import { IncomingMessage, ServerResponse } from "http";
import { Socket } from "net";
import app from "../src/app";
import { db, initDatabase } from "../src/config/database";
import { env } from "../src/config/env";

interface TestResponse {
  statusCode: number;
  headers: Record<string, string | string[] | undefined>;
  body: any;
  text: string;
}

function dispatch(
  method: string,
  url: string,
  body?: any,
  headers: Record<string, string> = {}
): Promise<TestResponse> {
  return new Promise((resolve) => {
    const socket = new Socket();
    Object.defineProperty(socket, "remoteAddress", { value: "127.0.0.1" });
    const req = new IncomingMessage(socket);
    req.method = method;
    req.url = url;
    Object.defineProperty(req, "ip", { value: "127.0.0.1" });
    req.headers = {
      host: "localhost",
      "content-type": "application/json",
      ...headers,
    };

    const payload = body ? JSON.stringify(body) : "";
    if (payload) {
      req.headers["content-length"] = Buffer.byteLength(payload).toString();
    }

    const res = new ServerResponse(req);
    const chunks: Buffer[] = [];

    res.write = function (chunk: any) {
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      return true;
    } as any;

    res.end = function (chunk: any) {
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      const rawBody = Buffer.concat(chunks).toString("utf8");

      let parsedBody: any;
      try {
        parsedBody = JSON.parse(rawBody);
      } catch {
        parsedBody = rawBody;
      }

      resolve({
        statusCode: res.statusCode,
        headers: res.getHeaders() as Record<string, string | string[] | undefined>,
        body: parsedBody,
        text: rawBody,
      });
      return this;
    } as any;

    app(req, res);

    if (payload) {
      req.push(payload);
    }
    req.push(null);
  });
}

function extractCookie(res: TestResponse): string {
  const setCookie = res.headers["set-cookie"];
  if (!setCookie) return "";
  const cookieStr = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  return cookieStr.split(";")[0];
}

async function runTests() {
  console.log("Initializing database...");
  await initDatabase();
  console.log("Database initialized.");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, name: string, details?: any) {
    if (condition) {
      console.log(`PASS: ${name}`);
      passed++;
    } else {
      console.error(`FAIL: ${name}`, details || "");
      failed++;
    }
  }

  // 1. Health & Database FK
  const healthRes = await dispatch("GET", "/api/health");
  assert(
    healthRes.statusCode === 200 && healthRes.body.status === "ok",
    "/api/health returns 200 with status ok",
    healthRes.body
  );

  const fkRow = db.prepare<[], { foreign_keys: number }>("PRAGMA foreign_keys").get();
  assert(fkRow?.foreign_keys === 1, "SQLite foreign keys are enabled");

  // 2. Registration & RBAC guard
  const rand = Date.now().toString().slice(-6);
  const buyerEmail = `buyer_${rand}@test.com`;
  const sellerEmail = `seller_${rand}@test.com`;
  const thirdEmail = `unrelated_${rand}@test.com`;
  const password = "StrongPassword123!";

  // Attempt privilege escalation via register
  const adminRegAttempt = await dispatch("POST", "/api/auth/register", {
    fullName: "Attacker",
    email: `attacker_${rand}@test.com`,
    password,
    role: "admin",
  });
  assert(
    adminRegAttempt.statusCode === 400,
    "Registration rejects admin role escalation with 400",
    adminRegAttempt.body
  );

  const regBuyer = await dispatch("POST", "/api/auth/register", {
    fullName: "Alice Buyer",
    email: buyerEmail,
    password,
    role: "buyer",
  });
  assert(
    regBuyer.statusCode === 201 && regBuyer.body.user?.role === "buyer",
    "Registration of Buyer succeeds with 201"
  );
  const buyerId = regBuyer.body.user?.id;
  const buyerCookie = extractCookie(regBuyer);

  const regSeller = await dispatch("POST", "/api/auth/register", {
    fullName: "Bob Seller",
    email: sellerEmail,
    password,
    role: "seller",
  });
  assert(
    regSeller.statusCode === 201 && regSeller.body.user?.role === "seller",
    "Registration of Seller succeeds with 201"
  );
  const sellerId = regSeller.body.user?.id;
  const sellerCookie = extractCookie(regSeller);

  const regThird = await dispatch("POST", "/api/auth/register", {
    fullName: "Charlie Buyer",
    email: thirdEmail,
    password,
    role: "buyer",
  });
  assert(regThird.statusCode === 201, "Third user registered");
  const thirdCookie = extractCookie(regThird);

  const regDup = await dispatch("POST", "/api/auth/register", {
    fullName: "Dup",
    email: buyerEmail,
    password,
    role: "buyer",
  });
  assert(regDup.statusCode === 409, "Duplicate email rejected with 409");

  // 3. Login & SQLi attempt
  const sqliAttempt = await dispatch("POST", "/api/auth/login", {
    email: "' OR 1=1 --",
    password,
  });
  assert(sqliAttempt.statusCode === 400, "SQLi email string rejected by validation");

  const loginFail = await dispatch("POST", "/api/auth/login", {
    email: buyerEmail,
    password: "WrongPassword!",
  });
  assert(loginFail.statusCode === 401, "Wrong password returns 401");

  const loginBuyer = await dispatch(
    "POST",
    "/api/auth/login",
    {
      email: buyerEmail,
      password,
    },
    {
      origin: "https://ais-dev-preview.run.app",
    }
  );
  assert(
    loginBuyer.statusCode === 200 && typeof loginBuyer.body.token === "string",
    "Valid login returns 200 and session token"
  );
  const setCookieHeader = String(loginBuyer.headers["set-cookie"] || "");
  assert(
    setCookieHeader.includes("SameSite=None") &&
      setCookieHeader.includes("Secure") &&
      setCookieHeader.includes("Partitioned"),
    "HTTPS/run.app login sets SameSite=None; Secure; Partitioned cookie",
    setCookieHeader
  );
  const freshBuyerCookie = extractCookie(loginBuyer);

  const bearerDashboardRes = await dispatch(
    "GET",
    "/api/users/dashboard",
    undefined,
    {
      authorization: `Bearer ${loginBuyer.body.token}`,
    }
  );
  assert(
    bearerDashboardRes.statusCode === 200 &&
      bearerDashboardRes.body.data?.metrics !== undefined,
    "Dashboard loads via Bearer token when cookies are absent (iframe fallback)",
    bearerDashboardRes.body
  );

  // 4. Trust score: new account shows "Not enough data"
  const newTrustRes = await dispatch("GET", "/api/trust/me", undefined, {
    cookie: freshBuyerCookie,
  });
  assert(
    newTrustRes.statusCode === 200 &&
      newTrustRes.body.data.trustScore.insufficientData === true &&
      newTrustRes.body.data.trustScore.level === "Not enough data",
    "New account without sufficient activity returns 'Not enough data'",
    newTrustRes.body
  );

  // 5. Unauthorized admin access blocked
  const buyerAdminAttempt = await dispatch("GET", "/api/admin/overview", undefined, {
    cookie: freshBuyerCookie,
  });
  assert(
    buyerAdminAttempt.statusCode === 403,
    "Buyer blocked from /api/admin/overview with 403"
  );

  // 6. Messaging & fraud detection
  const selfConv = await dispatch(
    "POST",
    "/api/messages/conversations",
    { recipientId: buyerId },
    { cookie: freshBuyerCookie }
  );
  assert(selfConv.statusCode === 400, "Self-conversation rejected");

  const sameRoleConv = await dispatch(
    "POST",
    "/api/messages/conversations",
    { recipientId: regThird.body.user.id },
    { cookie: freshBuyerCookie }
  );
  assert(sameRoleConv.statusCode === 400, "Same-role conversation rejected");

  const createConv = await dispatch(
    "POST",
    "/api/messages/conversations",
    { recipientId: sellerId },
    { cookie: freshBuyerCookie }
  );
  assert(createConv.statusCode === 201, "Buyer-Seller conversation created");
  const convId = createConv.body.conversationId;

  const dupConv = await dispatch(
    "POST",
    "/api/messages/conversations",
    { recipientId: sellerId },
    { cookie: freshBuyerCookie }
  );
  assert(
    dupConv.statusCode === 200 && dupConv.body.conversationId === convId,
    "Duplicate conversation returns existing ID"
  );

  const msg1 = await dispatch(
    "POST",
    `/api/messages/${convId}`,
    { content: "Hello Seller, confirming availability." },
    { cookie: freshBuyerCookie }
  );
  assert(msg1.statusCode === 201, "Buyer sends normal message");
  const msg1Id = msg1.body.data.id;

  const suspiciousMsg = await dispatch(
    "POST",
    `/api/messages/${convId}`,
    { content: "Please pay outside the platform via wire transfer or gift card." },
    { cookie: sellerCookie }
  );
  assert(
    suspiciousMsg.statusCode === 201 &&
      suspiciousMsg.body.data.riskLevel === "HIGH",
    "Rule-based fraud detection flags suspicious off-platform payment message as HIGH",
    suspiciousMsg.body
  );

  const listConvBeforeRead = await dispatch(
    "GET",
    "/api/messages/conversations",
    undefined,
    { cookie: freshBuyerCookie }
  );
  assert(
    listConvBeforeRead.statusCode === 200 &&
      Array.isArray(listConvBeforeRead.body.conversations) &&
      listConvBeforeRead.body.conversations.some(
        (c: { id: number; unreadCount: number }) =>
          c.id === convId && c.unreadCount >= 1
      ),
    "GET /api/messages/conversations returns 200 with created conversation and unreadCount >= 1",
    listConvBeforeRead.body
  );

  const markRead = await dispatch(
    "PATCH",
    `/api/messages/${convId}/read`,
    {},
    { cookie: freshBuyerCookie }
  );
  assert(
    markRead.statusCode === 200 && markRead.body.markedCount >= 1,
    "Buyer marks seller message read"
  );

  // Unrelated user cannot access conversation (and triggers security event)
  const unrelatedGet = await dispatch("GET", `/api/messages/${convId}`, undefined, {
    cookie: thirdCookie,
  });
  assert(unrelatedGet.statusCode === 403, "Unrelated user denied conversation access");

  // Sender-only message deletion policy
  const sellerDeleteBuyerMsg = await dispatch(
    "DELETE",
    `/api/messages/${msg1Id}`,
    undefined,
    { cookie: sellerCookie }
  );
  assert(
    sellerDeleteBuyerMsg.statusCode === 403,
    "Seller cannot delete Buyer's message"
  );

  // 7. Disputes
  const createDispute = await dispatch(
    "POST",
    "/api/disputes",
    {
      counterpartyId: sellerId,
      conversationId: convId,
      category: "Suspicious payment request",
      subject: "Requested off-platform payment",
      description:
        "Seller requested wire transfer outside TrustBridge during conversation.",
      evidence: ["Message ID reference"],
    },
    { cookie: freshBuyerCookie }
  );
  assert(createDispute.statusCode === 201, "Buyer creates dispute");
  const disputeId = createDispute.body.disputeId;

  const sellerReply = await dispatch(
    "POST",
    `/api/disputes/${disputeId}/responses`,
    { message: "Understood, I will keep all payment steps inside TrustBridge." },
    { cookie: sellerCookie }
  );
  assert(sellerReply.statusCode === 201, "Seller responds to dispute");

  // 8. Admin sign-in & moderation
  const adminLogin = await dispatch("POST", "/api/auth/login", {
    email: env.ADMIN_SEED_EMAIL,
    password: env.ADMIN_SEED_PASSWORD,
  });
  assert(
    adminLogin.statusCode === 200 && adminLogin.body.user?.role === "admin",
    "Provisioned admin signs in successfully"
  );
  const adminCookie = extractCookie(adminLogin);

  const adminOverview = await dispatch("GET", "/api/admin/overview", undefined, {
    cookie: adminCookie,
  });
  assert(
    adminOverview.statusCode === 200 &&
      adminOverview.body.data.stats.totalUsers >= 4,
    "Admin overview returns real DB statistics"
  );

  const resolveDispute = await dispatch(
    "PATCH",
    `/api/admin/disputes/${disputeId}`,
    {
      status: "RESOLVED",
      resolutionNotes: "Reviewed conversation and warned seller.",
    },
    { cookie: adminCookie }
  );
  assert(resolveDispute.statusCode === 200, "Admin resolves dispute");

  // 9. Logout invalidates session
  const logoutRes = await dispatch("POST", "/api/auth/logout", {}, {
    cookie: buyerCookie,
  });
  assert(logoutRes.statusCode === 200, "Logout succeeds");

  const meAfterLogout = await dispatch("GET", "/api/auth/me", undefined, {
    cookie: buyerCookie,
  });
  assert(
    meAfterLogout.statusCode === 401,
    "Revoked session token rejected after logout"
  );

  // 10. Messaging security & validation edge cases
  const unauthConvs = await dispatch("GET", "/api/messages/conversations");
  assert(
    unauthConvs.statusCode === 401,
    "Unauthenticated GET /api/messages/conversations returns 401"
  );

  const unauthSend = await dispatch("POST", `/api/messages/${convId}`, {
    content: "Unauthorized attempt",
  });
  assert(
    unauthSend.statusCode === 401,
    "Unauthenticated POST /api/messages/:id returns 401"
  );

  const emptyMsg = await dispatch(
    "POST",
    `/api/messages/${convId}`,
    { content: "   " },
    { cookie: freshBuyerCookie }
  );
  assert(emptyMsg.statusCode === 400, "Empty whitespace message rejected with 400");

  const longMsg = await dispatch(
    "POST",
    `/api/messages/${convId}`,
    { content: "a".repeat(4001) },
    { cookie: freshBuyerCookie }
  );
  assert(longMsg.statusCode === 400, "Message > 4000 characters rejected with 400");

  const missingConvSend = await dispatch(
    "POST",
    "/api/messages/00000000-0000-0000-0000-000000000000",
    { content: "Hello" },
    { cookie: freshBuyerCookie }
  );
  assert(
    missingConvSend.statusCode === 404,
    "Nonexistent conversation returns 404"
  );

  // 11. Simulate backend restart: close SQLite db and re-initialize from disk
  db.close();
  await initDatabase();

  const persistedMsgsRes = await dispatch(
    "GET",
    `/api/messages/${convId}`,
    undefined,
    { cookie: freshBuyerCookie }
  );
  assert(
    persistedMsgsRes.statusCode === 200 &&
      Array.isArray(persistedMsgsRes.body.messages) &&
      persistedMsgsRes.body.messages.length >= 2,
    "Messages persist in SQLite across database close and reopen (restart simulation)",
    persistedMsgsRes.body
  );

  console.log(`\n========================================`);
  console.log(`RESULTS: ${passed} passed, ${failed} failed`);
  console.log(`========================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test runner exception:", err);
  process.exit(1);
});
