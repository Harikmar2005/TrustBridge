# TRUSTBRIDGE
> **Multilingual Marketplace Trust, Safety & Escrow Resolution Platform**

TrustBridge is an enterprise-grade full-stack marketplace communication and fraud prevention platform built with React 19, TypeScript, Express, SQLite (better-sqlite3), Nexconn Chat SDK, and Google Gemini AI. TrustBridge safeguards buyers and sellers against phishing, credential theft, payment fraud, fee evasion, and extortion in real time across English, Tamil, and Hindi.

---

## 1. Clean Full-Stack Architecture

The codebase is organized into independent, decoupled layers following strict separation of concerns:

```
TrustBridge/
├── frontend/                     # Client application (browser-only)
│   ├── public/                   # Static public assets
│   ├── src/
│   │   ├── components/           # React UI components
│   │   │   └── fraud/            # AI Risk badge, warnings & security center
│   │   ├── context/              # Client state providers (Auth, Chat, Dispute, Nexconn)
│   │   ├── hooks/                # React custom hooks (useNexconn)
│   │   ├── lib/                  # Centralized API client & Nexconn client
│   │   ├── pages/                # Buyer, Seller, Support, Admin & Landing portals
│   │   ├── types/                # Re-exports shared domain models
│   │   ├── App.tsx               # Root React application
│   │   ├── main.tsx              # DOM entry point
│   │   └── index.css             # Tailwind CSS styles
│   ├── index.html                # HTML5 entry template
│   ├── vite.config.ts            # Independent Vite configuration with API proxy
│   ├── tsconfig.json             # Frontend TypeScript configuration
│   ├── package.json              # Independent frontend dependencies & scripts
│   └── .env.example              # Frontend environment variables template
│
├── backend/                      # API server & services (server-only)
│   ├── src/
│   │   ├── config/               # Environment & enterprise security configs
│   │   ├── database/             # SQLite connection, schema migrations & seeds
│   │   ├── controllers/          # Express route handler controllers
│   │   ├── routes/               # Modular REST API route declarations
│   │   ├── middleware/           # Auth, RBAC, IDOR & error handling middleware
│   │   ├── services/             # Auth, Nexconn token & translation services
│   │   ├── ai/                   # Multi-vector fraud intelligence & Gemini engines
│   │   ├── models/               # Server-side model interfaces
│   │   └── utils/                # Logging & utility helpers
│   ├── data/models/              # In-memory ML TF-IDF model artifacts
│   ├── server.ts                 # Express server & Vite middleware entrypoint
│   ├── package.json              # Independent backend dependencies & scripts
│   ├── tsconfig.json             # Backend TypeScript configuration
│   └── .env.example              # Backend environment variables template
│
├── shared/                       # Browser-safe contracts & shared types
│   ├── contracts/api.ts          # API route constants & request/response contracts
│   └── types/index.ts            # Enterprise domain models (User, Dispute, Message, etc.)
│
├── tests/
│   ├── audit-verification.ts     # 35-scenario critical technical audit runner
│   └── migration-verification.ts # 8-check full-stack architectural isolation test
│
├── server.ts                     # Backward-compatible root entrypoint
├── package.json                  # Root monorepo workspace & orchestration scripts
├── tsconfig.json                 # Base TypeScript configuration
├── .gitignore                    # Git ignore file (excludes secrets, databases, dist)
└── README.md                     # Complete architectural documentation
```

---

## 2. Environment Configuration

### Backend Environment (`backend/.env.example`)
Create `backend/.env` with:
```bash
# Server Port
PORT=8000

# JSON Web Token Secret (Min 32 characters)
JWT_SECRET=your_jwt_secret_min_32_characters_here

# Google Gemini AI API Key (Server-Side Only - Never exposed to frontend)
GEMINI_API_KEY=your_gemini_api_key_here

# Nexconn Chat Cloud Edge Credentials
NEXCONN_API_URL=https://api.nexconn.io
NEXCONN_APP_KEY=your_nexconn_app_key_here
NEXCONN_APP_SECRET=your_nexconn_app_secret_here

# Database Path
DATABASE_PATH=data/trustbridge.db
```

### Frontend Environment (`frontend/.env.example`)
Create `frontend/.env` with:
```bash
# Backend API Base URL (leave empty for same-origin or Vite dev proxy)
VITE_API_BASE_URL=

# Public Nexconn App Key (Public client credential)
VITE_NEXCONN_APP_KEY=your_nexconn_app_key_here
```

> **Security Guarantee:** `NEXCONN_APP_SECRET`, `GEMINI_API_KEY`, and `JWT_SECRET` are kept strictly on the backend. The frontend only receives the public `VITE_NEXCONN_APP_KEY` and short-lived user tokens generated via authenticated backend exchange.

---

## 3. Setup and Run Commands

### Unified Mode (Standard AI Studio / Container Port 3000)
Runs the Express backend mounting Vite development middleware pointing directly to `frontend/`:
```bash
# Install root dependencies
npm install

# Start unified development server on port 3000
npm run dev

# Run comprehensive test suites
npm test
```

### Independent Development Mode (Separated Frontend & Backend)
Run backend on port 8000 and frontend on port 5173:

**Terminal 1 — Backend (Port 8000):**
```bash
# Option A: From root
npm run dev:backend

# Option B: Direct inside backend/
cd backend
npm install
npm run dev
```

**Terminal 2 — Frontend (Port 5173 with proxy to backend):**
```bash
# Option A: From root
npm run dev:frontend

# Option B: Direct inside frontend/
cd frontend
npm install
npm run dev
```

---

## 4. Centralized API Client Architecture

All browser-facing communication with the server is routed through `frontend/src/lib/api.ts`:
- Resolves the API base URL from `import.meta.env.VITE_API_BASE_URL` with automatic fallback to window origin.
- Automatically injects the `Authorization: Bearer <token>` header from `localStorage`.
- Automatically catches 401 Unauthorized responses and dispatches session expiration events.
- Re-exports typed methods: `api.get<T>()`, `api.post<T>()`, `api.patch<T>()`, `api.delete<T>()`.

---

## 5. Nexconn Real-Time Integration Architecture

1. **Client Singleton Initialization:**
   `frontend/src/lib/nexconnClient.ts` instantiates a single `NCEngine` with `AreaCode.SG` (Singapore DC) and `LogLevel.WARN`. It guarantees zero duplicate engine instances across React re-renders.
2. **Secure Token Generation:**
   Users authenticate with TrustBridge via Argon2id credentials. The backend signs the user token request using `SHA1(AppSecret + Nonce + Timestamp)`.
3. **P2P & Group Communication:**
   - Peer-to-peer discussions are routed via `DirectChannel`.
   - Multi-party dispute rooms connect Buyer, Seller, and Tier-1 Support Agent via `GroupChannel`.
4. **Delivery & Read Receipts:**
   Messages track truthful delivery states (`PENDING_CLOUD`, `DELIVERED_CLOUD`, `DELIVERED_LOCAL`, `FAILED`, `READ`). In-memory deduplication caches prevent duplicate message reprocessing.
5. **Reconnection & Resilience:**
   Exponential backoff reconnection logic (2s, 4s, 8s, capped at 10s) and automatic re-auth on online window events.

---

## 6. Gemini AI & Multi-Vector Fraud Detection Architecture

1. **Multi-Vector Threat Interception:**
   - **NLP Engine (`backend/src/ai/nlpEngine.ts`):** Normalizes Unicode, removes zero-width characters, and detects intent patterns across English, Tamil, and Hindi.
   - **URL Intelligence (`backend/src/ai/urlIntelligence.ts`):** Defends against Server-Side Request Forgery (SSRF) by blocking private IPv4 ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8, 169.254.169.254) and flagging deceptive homoglyphs, shorteners, and credential parameters.
   - **Behavioral Engine (`backend/src/ai/behaviouralEngine.ts`):** Evaluates account age, transaction velocity, historical dispute ratios, and sudden behavioral shifts.
   - **ML Classifier (`backend/src/ai/mlClassifier.ts`):** In-memory TF-IDF Logistic Regression model loaded from `data/models/fraud_model_v2.json`.
2. **Gemini 2.5 Flash Integration (`backend/src/ai/unifiedRiskEngine.ts`):**
   - The server calls Google GenAI (`gemini-2.5-flash`) with structured prompts.
   - Deterministic Fallback: If `GEMINI_API_KEY` is absent or the Gemini service fails, TrustBridge automatically falls back to the deterministic multi-vector heuristic engine without blocking message delivery.
   - Engine Provenance: All analyses explicitly record the engine used (`GEMINI_2_5_FLASH` vs `HEURISTIC_RULE_ENGINE`).

---

## 7. Database Backup and Migration Instructions

TrustBridge uses SQLite with Write-Ahead Logging (`PRAGMA journal_mode = WAL`) and strict foreign keys (`PRAGMA foreign_keys = ON`).

### Database Backup
Because SQLite WAL mode is enabled, running a checkpoint before taking a physical file backup ensures all dirty pages are safely written:
```bash
# 1. Perform a passive WAL checkpoint via node script or sqlite3 CLI
node -e "
  const Database = require('better-sqlite3');
  const db = new Database('data/trustbridge.db');
  db.pragma('wal_checkpoint(PASSIVE)');
  db.close();
  console.log('WAL checkpoint complete.');
"

# 2. Copy the database file to your backup location
cp data/trustbridge.db backups/trustbridge_backup_$(date +%Y%m%d_%H%M%S).db
```

### Database Schema Migrations
Migrations are applied idempotently in `backend/src/database/schema.ts` inside `initializeDatabase()`:
- `CREATE TABLE IF NOT EXISTS` for `users`, `user_profiles`, `transactions`, `conversations`, `messages`, `disputes`, `dispute_evidence`, `dispute_history`, `support_tickets`, `fraud_alerts`, `audit_logs`, and `auth_sessions`.
- Safe `ALTER TABLE` checks with column existence introspection ensure zero data loss on schema evolution.

---

## 8. Deployment Instructions

### Production Frontend Build
```bash
cd frontend
npm run build
# Output generated in frontend/dist/
```

### Production Full-Stack Start
```bash
# Set production environment
export NODE_ENV=production
export PORT=3000

# Start server (serves static frontend/dist/ and mounts /api)
node server.ts
# or
npm start
```

---

## 9. Test Verification Results

All 35 technical audit scenarios and all 8 architecture migration checks execute cleanly:

```bash
$ npm test

======================================================
   TRUSTBRIDGE CRITICAL TECHNICAL AUDIT TEST RUNNER
======================================================
[PASS] Scenario 1: Database Persistence Across Restarts
[PASS] Scenario 2: Invalid Authentication Rejection
[PASS] Scenario 3: Role Authorization RBAC Enforcement
[PASS] Scenario 4: Conversation Access Isolation
[PASS] Scenario 5: No Fake Nexconn Token Generation
[PASS] Scenario 6: Accurate Message Delivery Status
[PASS] Scenario 7: AI/Heuristic Safety & Provenance Transparency
[PASS] Scenario 8: Fraud Alerts Database Persistence
[PASS] Scenario 9: Dispute Evidence Access Control
[PASS] Scenario 10: Session Revocation & Expiry Enforcement
[PASS] Scenario 11: AI Fraud Benchmark Evaluation (30 Test Cases) - 100% Accuracy
[PASS] Scenario 12: Nexconn Token Endpoint Authorization Enforcement
[PASS] Scenario 13: Nexconn Official Channel API Routing (Direct & Group)
[PASS] Scenario 14: Nexconn AreaCode.SG & Truthful Configuration Reporting
[PASS] Scenario 15: Duplicate Message Deduplication Cache
[PASS] Scenario 16: SQLite Full Message Persistence
[PASS] Scenario 17: Nexconn SHA1 Signature Algorithm & Input Ordering
[PASS] Scenario 18: Local vs Cloud Delivery Isolation
[PASS] Scenario 19: Nexconn Group Channel & Dispute Room API Support
[PASS] Scenario 20: Message Read Receipt Lifecycle
[PASS] Scenario 21: Exponential Backoff Reconnect Algorithm
[PASS] Scenario 22: Argon2id Password Hashing & Verification
[PASS] Scenario 23: Privilege Escalation Prevention on Registration
[PASS] Scenario 24: Dynamic SQLite Analytics & Agent Workload Computation
[PASS] Scenario 25: Security Headers & CORS Protection
[PASS] Scenario 26: Conversation Access IDOR Isolation
[PASS] Scenario 27: Dispute Complainant Session Binding
[PASS] Scenario 28: Dispute Arbitration Role Enforcement
[PASS] Scenario 29: Independent Holdout Dataset Evaluation (20 Unseen Cases) - 100% Accuracy
[PASS] Scenario 30: Fraud Alerts & Audit Logs Staff Authorization Enforcement
[PASS] Scenario 31: Automated Nexconn Token Generation & TTL Caching
[PASS] Scenario 32: Session Restoration on Page Refresh & Browser Reopen
[PASS] Scenario 33: Multi-User Identity Isolation & Token Separation
[PASS] Scenario 34: Token Expiration Renewal & Force Refresh Handling
[PASS] Scenario 35: Background Auto-Connect Singleton Protection
TOTAL SCENARIOS TESTED: 35 | PASSED: 35 | FAILED: 0

======================================================
   TRUSTBRIDGE ARCHITECTURE MIGRATION VERIFICATION
======================================================
[PASS] Check 1: Top-Level Architecture Separation (frontend/, backend/, shared/)
[PASS] Check 2: Frontend Directory Completeness (components, context, hooks, lib, pages, types, public)
[PASS] Check 3: Backend Modular Architecture Completeness (routes, controllers, services, middleware, models, database, ai, config, utils)
[PASS] Check 4: Shared Contracts & Types Isolation (browser-safe types and contracts)
[PASS] Check 5: Secret Isolation & Security Discipline (Zero server secrets in frontend)
[PASS] Check 6: Centralized API Client Implementation (Base URL & token handling)
[PASS] Check 7: Environment Configuration Templates (Separate backend & frontend .env.example)
[PASS] Check 8: Multi-Package Script & Dependency Autonomy
TOTAL MIGRATION CHECKS: 8 | PASSED: 8 | FAILED: 0
```

---

## 10. Known Limitations and Remaining Technical Debt

1. **Single-Node SQLite Architecture:**
   SQLite with WAL mode provides instant local persistence, zero latency, and zero cloud lock-in for single-instance deployments. For horizontal clustering across multiple availability zones, a migration to PostgreSQL (via Cloud SQL) using the existing schema in `backend/src/database/schema.ts` would be recommended.
2. **Live Nexconn Cloud Provisioning:**
   When running without real `NEXCONN_APP_KEY` and `NEXCONN_APP_SECRET` credentials in `.env`, the system truthfully reports `CREDENTIALS_REQUIRED` and securely falls back to local database messaging. To connect to the live Singapore edge cluster, provide valid enterprise Nexconn credentials.
3. **ML Model Online Training:**
   The current machine learning classifier loads pre-calibrated TF-IDF Logistic Regression weights from `data/models/fraud_model_v2.json`. Future enhancements can include an automated continuous learning pipeline triggered by verified false positive user reports.
