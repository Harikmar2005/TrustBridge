import { IncomingMessage, ServerResponse } from "http";
import { Socket } from "net";
import app from "../src/app";
import { initDatabase } from "../src/config/database";

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
      console.log(`✅ PASS: ${name}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${name}`, details || "");
      failed++;
    }
  }

  // 1 & 2. Health check
  console.log("\n--- Testing 1 & 2: Server & /api/health ---");
  const healthRes = await dispatch("GET", "/api/health");
  assert(
    healthRes.statusCode === 200 && healthRes.body.status === "ok",
    "/api/health returns 200 with status ok",
    healthRes.body
  );

  // 3. Registration: Buyer & Seller & Third User
  console.log("\n--- Testing 3: Registration ---");
  const rand = Date.now().toString().slice(-6);
  const buyerEmail = `buyer_${rand}@test.com`;
  const sellerEmail = `seller_${rand}@test.com`;
  const thirdEmail = `unrelated_${rand}@test.com`;
  const password = "StrongPassword123!";

  const regBuyer = await dispatch("POST", "/api/auth/register", {
    fullName: "Alice Buyer",
    email: buyerEmail,
    password,
    role: "buyer",
  });
  assert(
    regBuyer.statusCode === 201 && regBuyer.body.success === true && regBuyer.body.user.role === "buyer",
    "Registration of Buyer succeeds with 201",
    regBuyer.body
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
    regSeller.statusCode === 201 && regSeller.body.success === true && regSeller.body.user.role === "seller",
    "Registration of Seller succeeds with 201",
    regSeller.body
  );
  const sellerId = regSeller.body.user?.id;
  const sellerCookie = extractCookie(regSeller);

  const regThird = await dispatch("POST", "/api/auth/register", {
    fullName: "Charlie Buyer",
    email: thirdEmail,
    password,
    role: "buyer",
  });
  assert(regThird.statusCode === 201, "Registration of unrelated third user succeeds");
  const thirdCookie = extractCookie(regThird);

  // Duplicate registration check
  const regDup = await dispatch("POST", "/api/auth/register", {
    fullName: "Duplicate User",
    email: buyerEmail,
    password,
    role: "buyer",
  });
  assert(regDup.statusCode === 409, "Duplicate registration rejected with 409", regDup.body);

  // 4. Login
  console.log("\n--- Testing 4: Login ---");
  const loginRes = await dispatch("POST", "/api/auth/login", {
    email: buyerEmail,
    password,
  });
  assert(
    loginRes.statusCode === 200 && loginRes.body.success === true && loginRes.body.user.email === buyerEmail,
    "Login works with 200 and returns user",
    loginRes.body
  );

  const loginFail = await dispatch("POST", "/api/auth/login", {
    email: buyerEmail,
    password: "WrongPassword!",
  });
  assert(loginFail.statusCode === 401, "Login with wrong password fails with 401");

  // 5. /api/auth/me
  console.log("\n--- Testing 5: /api/auth/me ---");
  const meRes = await dispatch("GET", "/api/auth/me", undefined, {
    cookie: buyerCookie,
  });
  assert(
    meRes.statusCode === 200 && meRes.body.success === true && meRes.body.user.id === buyerId,
    "/api/auth/me returns authenticated user",
    meRes.body
  );

  // 6. Messaging: reject unauthenticated
  console.log("\n--- Testing 6: Reject unauthenticated messaging ---");
  const unauthGet = await dispatch("GET", "/api/messages/conversations");
  assert(unauthGet.statusCode === 401, "GET /api/messages/conversations rejects unauthenticated with 401");

  const unauthPost = await dispatch("POST", "/api/messages/conversations", { recipientId: sellerId });
  assert(unauthPost.statusCode === 401, "POST /api/messages/conversations rejects unauthenticated with 401");

  // Authorization rules
  console.log("\n--- Testing Authorization Rules ---");
  // Cannot start conversation with self
  const selfConv = await dispatch(
    "POST",
    "/api/messages/conversations",
    { recipientId: buyerId },
    { cookie: buyerCookie }
  );
  assert(selfConv.statusCode === 400, "Cannot start conversation with oneself rejected with 400", selfConv.body);

  // Cannot start conversation with same role (buyer with buyer)
  const sameRoleConv = await dispatch(
    "POST",
    "/api/messages/conversations",
    { recipientId: regThird.body.user.id },
    { cookie: buyerCookie }
  );
  assert(sameRoleConv.statusCode === 400, "Cannot start conversation with same role rejected with 400", sameRoleConv.body);

  // 7. Buyer can start conversation with Seller
  console.log("\n--- Testing 7: Buyer starts conversation with Seller ---");
  const createConv = await dispatch(
    "POST",
    "/api/messages/conversations",
    { recipientId: sellerId },
    { cookie: buyerCookie }
  );
  assert(
    createConv.statusCode === 201 && createConv.body.success === true && !!createConv.body.conversationId,
    "Buyer starts conversation with Seller with 201",
    createConv.body
  );
  const convId = createConv.body.conversationId;

  // Duplicate conversation prevention
  const dupConv = await dispatch(
    "POST",
    "/api/messages/conversations",
    { recipientId: sellerId },
    { cookie: buyerCookie }
  );
  assert(
    dupConv.statusCode === 200 && dupConv.body.conversationId === convId,
    "Duplicate conversation returns existing conversationId with 200",
    dupConv.body
  );

  // 8. Both participants can retrieve conversations and messages
  console.log("\n--- Testing 8: Both participants retrieve conversation ---");
  const buyerConvs = await dispatch("GET", "/api/messages/conversations", undefined, { cookie: buyerCookie });
  assert(
    buyerConvs.statusCode === 200 && buyerConvs.body.conversations.some((c: any) => c.id === convId),
    "Buyer can list their conversations",
    buyerConvs.body
  );

  const sellerConvs = await dispatch("GET", "/api/messages/conversations", undefined, { cookie: sellerCookie });
  assert(
    sellerConvs.statusCode === 200 && sellerConvs.body.conversations.some((c: any) => c.id === convId),
    "Seller can list their conversations",
    sellerConvs.body
  );

  // 9. Both participants can send messages
  console.log("\n--- Testing 9: Both participants send messages ---");
  const buyerMsg = await dispatch(
    "POST",
    `/api/messages/${convId}`,
    { content: "Hello Seller, I would like to buy your item." },
    { cookie: buyerCookie }
  );
  assert(buyerMsg.statusCode === 201 && buyerMsg.body.success === true, "Buyer sends message with 201", buyerMsg.body);

  const sellerMsg = await dispatch(
    "POST",
    `/api/messages/${convId}`,
    { content: "Hello Buyer! The item is available and ready to ship." },
    { cookie: sellerCookie }
  );
  assert(sellerMsg.statusCode === 201 && sellerMsg.body.success === true, "Seller sends message with 201", sellerMsg.body);

  // Max length validation (>4000 characters)
  const tooLongMsg = await dispatch(
    "POST",
    `/api/messages/${convId}`,
    { content: "a".repeat(4001) },
    { cookie: buyerCookie }
  );
  assert(tooLongMsg.statusCode === 400, "Message > 4000 characters rejected with 400", tooLongMsg.body);

  // Retrieve message history
  const buyerMsgHistory = await dispatch("GET", `/api/messages/${convId}`, undefined, { cookie: buyerCookie });
  assert(
    buyerMsgHistory.statusCode === 200 && buyerMsgHistory.body.messages.length === 2,
    "Buyer retrieves message history (2 messages)",
    buyerMsgHistory.body
  );

  const sellerMsgHistory = await dispatch("GET", `/api/messages/${convId}`, undefined, { cookie: sellerCookie });
  assert(
    sellerMsgHistory.statusCode === 200 && sellerMsgHistory.body.messages.length === 2,
    "Seller retrieves message history (2 messages)",
    sellerMsgHistory.body
  );

  // 10. Unrelated user cannot access conversation
  console.log("\n--- Testing 10: Unrelated user access control ---");
  const unrelatedGet = await dispatch("GET", `/api/messages/${convId}`, undefined, { cookie: thirdCookie });
  assert(
    unrelatedGet.statusCode === 403 || unrelatedGet.statusCode === 404,
    "Unrelated user cannot retrieve conversation (received 403 or 404)",
    unrelatedGet.body
  );

  const unrelatedSend = await dispatch(
    "POST",
    `/api/messages/${convId}`,
    { content: "Unauthorized message attempt" },
    { cookie: thirdCookie }
  );
  assert(
    unrelatedSend.statusCode === 403 || unrelatedSend.statusCode === 404,
    "Unrelated user cannot send message to conversation (received 403 or 404)",
    unrelatedSend.body
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
