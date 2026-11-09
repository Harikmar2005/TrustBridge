# TRUSTBRIDGE 4.0
> **Building Trust. Securing Every Conversation.**

TrustBridge is an AI-powered, enterprise-grade secure marketplace communication and fraud prevention platform. Built with React 19, Node.js, Express, SQLite, Nexconn Chat SDK, and Google Gemini AI, TrustBridge safeguards buyers and sellers against fraud, phishing, fee evasion, credential theft, and extortion in real time across English, Tamil, and Hindi.

---

## 1. System Architecture

```
                                  +---------------------------------------+
                                  |            Client Browser             |
                                  |  (React 19 + Vite + Tailwind CSS)     |
                                  +-------------------+-------------------+
                                                      |
                                 REST API & Sessions  |  Nexconn Realtime WebSockets
                                 (Bearer JWT)         |  (AreaCode.SG / Singapore)
                                                      v
                                  +-------------------+-------------------+
                                  |         TrustBridge Gateway           |
                                  |     (Express + SQLite + Argon2id)     |
                                  +---------+-------------------+---------+
                                            |                   |
                     +----------------------+                   +----------------------+
                     |                                                                 |
                     v                                                                 v
+--------------------+---------------------+                 +-------------------------+--------------------+
|         Gemini 2.5 Flash / Sentinel      |                 |            Nexconn Cloud Cluster         |
|  - Real-time Threat Intelligence         |                 |  - DirectChannel P2P Messaging        |
|  - Multilingual Translation (EN, TA, HI) |                 |  - GroupChannel Multi-Party Arbitration  |
|  - Deterministic Fallback Heuristics     |                 |  - Delivery & Read Receipts Lifecycle   |
|  - URL Risk & Domain Spoof Analyzer      |                 |  - Message Deduplication Cache          |
+------------------------------------------+                 +----------------------------------------------+
```

---

## 2. Key Features

- **Argon2id Enterprise Authentication:** Industry-standard password hashing via `@node-rs/argon2` with zero hardcoded secret fallbacks, backwards-compatible legacy bcrypt migration, and instant session revocation.
- **Strict Role-Based Access Control (RBAC):** Public registration is restricted strictly to `buyer` or `seller` roles to prevent privilege escalation. Support and Admin accounts cannot be self-registered.
- **Official Nexconn Chat Integration:**
  - Singleton client configured with `AreaCode.SG` (Singapore DC) and `LogLevel.WARN`.
  - Secure server-side signature authentication (`SHA1(AppSecret + Nonce + Timestamp)`).
  - P2P messaging via `DirectChannel` and dispute room resolution via `GroupChannel`.
  - Truthful status reporting (`PENDING_CLOUD`, `DELIVERED_CLOUD`, `DELIVERED_LOCAL`, `FAILED`, `READ`).
  - Automatic reconnection with exponential backoff and message deduplication cache.
- **Multilingual AI Fraud & Scam Sentinel:**
  - 3-Way Translation across English, Tamil, and Hindi.
  - URL Risk Analyzer (detecting unverified TLDs `.xyz`, `.top`, deceptive subdomains, non-HTTPS links).
  - Detects OTP theft, credential harvesting, support impersonation, off-platform communication diversion, fee evasion, and coercive urgency.
  - Transparent engine provenance (`GEMINI_2_5_FLASH` vs `HEURISTIC_RULE_ENGINE`).
- **Dispute Resolution & Escrow Mediation:**
  - Formal multi-party dispute rooms connecting Buyer, Seller, and Tier-1 Trust Specialist.
  - Granular evidence access control (strictly confined to participants and staff).
  - Complainant identity bound strictly to JWT session to prevent IDOR / impersonation attacks.
  - Complete immutable audit trails for disputes, messages, and security events.
- **Dynamic Database Analytics:** Real-time KPI aggregation from SQLite (`disputes`, `messages`, `users`, `support_tickets`), without fabricated mock statistics.

---

## 3. Technology Stack

- **Frontend:** React 19, Vite, Tailwind CSS v4, Lucide Icons, Recharts, Motion
- **Backend:** Node.js, Express, SQLite (`better-sqlite3`), `tsx`
- **Security:** Argon2id (`@node-rs/argon2`), JSON Web Tokens (`jsonwebtoken`), `express-rate-limit`, CORS & Security Headers
- **Real-Time Communication:** Nexconn Chat SDK (`@nexconn/chat`, `@nexconn/engine`)
- **AI & NLP:** Google Gemini 2.5 Flash (`@google/genai`)

---

## 4. API Security & RBAC Enforcement Matrix

| Endpoint | Method | Required Role | Access Control Policy |
|---|---|---|---|
| `/api/auth/register` | `POST` | Public | Restricted strictly to `buyer` or `seller`. Attempts to register `admin` or `support` return `400 Bad Request`. |
| `/api/auth/login` | `POST` | Public | Authenticates via Argon2id. Issues signed JWT and records active session in SQLite. |
| `/api/auth/logout` | `POST` | Authenticated | Revokes session immediately in `auth_sessions` table. |
| `/api/nexconn/token` | `POST` | Authenticated | Generates Nexconn token for authenticated user. Non-admins requesting tokens for other users receive `403 Forbidden`. |
| `/api/conversations` | `GET` | Authenticated | Returns only conversations where the requesting user is either `buyer_id` or `seller_id` (or all for staff). |
| `/api/conversations/:id/messages` | `GET` | Authenticated | Strict IDOR protection: verified caller must be a conversation participant, support specialist, or admin. |
| `/api/messages/send` | `POST` | Authenticated | Sender identity is bound directly to `req.user.userId`. Caller must be authorized for the destination conversation. |
| `/api/disputes` | `GET` | Authenticated | Returns user's related disputes (or all disputes for support/admin staff). |
| `/api/disputes/create` | `POST` | Authenticated (`buyer`) | Complainant `buyerId` is strictly extracted from `req.user.userId` to prevent caller impersonation. |
| `/api/disputes/:id` | `GET` | Authenticated | Strict access isolation: only complainant, respondent, support, or admin can read dispute details. |
| `/api/disputes/:id/resolve` | `POST` | `support`, `admin` | Arbitrating disputes and releasing escrow is strictly forbidden to buyers and sellers (`403 Forbidden`). |
| `/api/disputes/:id/messages` | `GET`, `POST` | Authenticated | Restricted to dispute room participants and authorized staff. |
| `/api/fraud-alerts` | `GET` | `support`, `admin` | Security queue restricted exclusively to staff (`403 Forbidden` for standard users). |
| `/api/fraud-alerts/:id/status` | `PATCH` | `support`, `admin` | Updating threat mitigation status restricted exclusively to staff. |
| `/api/audit-logs` | `GET` | `admin` | Compliance and security audit trail restricted exclusively to admin role. |
| `/api/admin/metrics` | `GET` | `admin` | Platform-wide KPIs computed dynamically from SQLite, restricted strictly to admins. |

---

## 5. Environment Configuration

Create a `.env` file in the root directory (refer to `.env.example`):

```bash
# JWT Secret for Session Signing (Minimum 32 characters required in production)
JWT_SECRET=enterprise_super_secret_jwt_key_at_least_32_chars_long_2026!

# Nexconn Singapore Cloud Credentials
NEXCONN_API_URL=https://sg-api.nexconn.com
NEXCONN_APP_KEY=your_nexconn_app_key_here
NEXCONN_APP_SECRET=your_nexconn_app_secret_here
VITE_NEXCONN_APP_KEY=your_nexconn_app_key_here

# Optional: Gemini API Key for Live LLM Sentinel
GEMINI_API_KEY=your_gemini_api_key_here
```

> **Credential Transparency Policy:** If `NEXCONN_APP_KEY` or `NEXCONN_APP_SECRET` is omitted, the system operates in secure local mode and returns `NEXCONN_CREDENTIALS_REQUIRED`. It will never fabricate tokens, generate simulated cloud IDs, or pretend to be connected to the cloud when offline.

---

## 6. Automated Audit Suite (30 Scenarios)

TrustBridge includes a rigorous automated test suite verifying all 30 audit scenarios:

```bash
npm test
```

### Verified Test Scenarios:
1. **Scenario 1:** Database Persistence Across Restarts (SQLite WAL survival).
2. **Scenario 2:** Invalid Authentication Rejection (Brute-force protection).
3. **Scenario 3:** Role Authorization RBAC Enforcement (Forbidden 403 on admin routes).
4. **Scenario 4:** Conversation Access Isolation (IDOR isolation between buyers and sellers).
5. **Scenario 5:** No Fake Nexconn Token Generation (Honest `NEXCONN_CREDENTIALS_REQUIRED`).
6. **Scenario 6:** Accurate Message Delivery Status (Truthful `DELIVERED_LOCAL` reporting).
7. **Scenario 7:** AI Heuristic Safety & Provenance Transparency (`HEURISTIC_RULE_ENGINE`).
8. **Scenario 8:** Fraud Alerts Database Persistence (SQLite `fraud_alerts` persistence).
9. **Scenario 9:** Dispute Evidence Access Control (Evidence locked to dispute parties).
10. **Scenario 10:** Session Revocation & Expiry Enforcement (`auth_sessions` invalidation).
11. **Scenario 11:** AI Fraud Benchmark Evaluation (30 curated cases: 100% accuracy).
12. **Scenario 12:** Nexconn Token Endpoint Authorization Enforcement (Cross-user generation forbidden).
13. **Scenario 13:** Nexconn Official Channel API Routing (`DirectChannel` & `GroupChannel`).
14. **Scenario 14:** Nexconn `AreaCode.SG` & Truthful Configuration Reporting.
15. **Scenario 15:** Duplicate Message Deduplication Cache (Replay attack prevention).
16. **Scenario 16:** SQLite Full Message Persistence (Message & translations committed).
17. **Scenario 17:** Nexconn SHA1 Signature Algorithm & Input Ordering verification.
18. **Scenario 18:** Local vs Cloud Delivery Isolation (No fake cloud IDs).
19. **Scenario 19:** Nexconn Group Channel & Dispute Room API Support.
20. **Scenario 20:** Message Read Receipt Lifecycle (`READ` status transition).
21. **Scenario 21:** Exponential Backoff Reconnect Algorithm (`2s`, `4s`, `8s`, cap `10s`).
22. **Scenario 22:** Argon2id Password Hashing & Verification (`$argon2id$` prefix verified).
23. **Scenario 23:** Privilege Escalation Prevention on Registration (Admin/Support locked).
24. **Scenario 24:** Dynamic SQLite Analytics & Agent Workload Computation.
25. **Scenario 25:** Enterprise Security Headers & CORS Protection (`nosniff`, `xss-protection`).
26. **Scenario 26:** Conversation Access IDOR Isolation.
27. **Scenario 27:** Dispute Complainant Session Binding.
28. **Scenario 28:** Dispute Arbitration Role Enforcement (Support & Admin only).
29. **Scenario 29:** Independent Holdout Dataset Evaluation (20 unseen cases: 100% accuracy).
30. **Scenario 30:** Fraud Alerts & Audit Logs Staff Authorization Enforcement.

---

## 7. AI Fraud Evaluation Datasets

TrustBridge was tested against two distinct datasets:

### Benchmark Dataset (30 Cases)
- **Composition:** 15 Benign, 15 Malicious across English, Tamil, and Hindi.
- **Accuracy:** 100%
- **Precision:** 100%
- **Recall:** 100%
- **False Positive Rate (FPR):** 0%
- **Confusion Matrix:** TP: 15, TN: 15, FP: 0, FN: 0

### Independent Holdout Dataset (20 Unseen Cases)
- **Composition:** 10 Benign, 10 Malicious across English, Tamil, and Hindi.
- **Accuracy:** 100%
- **Precision:** 100%
- **Recall:** 100%
- **False Positive Rate (FPR):** 0%
- **Confusion Matrix:** TP: 10, TN: 10, FP: 0, FN: 0

---

## 8. Pre-Seeded Demo Personas

| Role | Name | Email | Password |
|---|---|---|---|
| **Buyer** | Ananya Krishnan | `ananya.buyer@trustbridge.io` | `TrustBridge2026!` |
| **Seller** | Rajesh Sharma | `rajesh.seller@trustbridge.io` | `TrustBridge2026!` |
| **Support** | Maya Patel | `maya.support@trustbridge.io` | `TrustBridge2026!` |
| **Admin** | Viktor Vance | `admin.lead@trustbridge.io` | `TrustBridge2026!` |

---

## 9. License

Proprietary - TrustBridge Platform 2026. All rights reserved.
