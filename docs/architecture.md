# TrustBridge Architecture

## System Overview
TrustBridge is a modular TypeScript monorepo (`frontend`, `backend`, `shared`) serving a secure buyer–seller commerce workspace over HTTP and WebSockets on a unified Express + Socket.IO server (`0.0.0.0:3000`).

```text
+-------------------------------------------------------------------+
|                        Frontend (React 19)                        |
|  Vite + Tailwind CSS v4 + React Router + React Hook Form + Zod    |
|  - Public: /, /sellers, /login, /register                         |
|  - Buyer/Seller Workspace: /dashboard, /messages, /trust,         |
|    /security, /disputes, /settings                                |
|  - Admin Console: /admin, /admin/users, /admin/security,          |
|    /admin/disputes                                                |
+-------------------------------+-----------------------------------+
                                | REST (/api/*) + Socket.IO (Cookie JWT)
                                v
+-------------------------------------------------------------------+
|                   Backend (Express + Socket.IO)                   |
|  - Auth & Session Middleware (Argon2 + JWT + user_sessions)       |
|  - Rule-Based Fraud Screening (services/fraud.rules.ts)           |
|  - Explainable Trust Engine (services/trust.rules.ts)             |
|  - Security Alerts, Audit Logs, Notifications, Translation Adapter|
+-------------------------------+-----------------------------------+
                                | Parameterized SQL + Transactions
                                v
+-------------------------------------------------------------------+
|              Database Layer (sql.js WASM SQLite)                  |
|  - Non-destructive versioned migrations (schema_migrations v1-v2) |
|  - 17 normalized tables with foreign keys and indexes             |
|  - Modular DatabaseAdapter interface ready for PostgreSQL         |
+-------------------------------------------------------------------+
```

## Database Schema Overview
1. `users` & `user_sessions` & `password_reset_tokens`: Accounts, RBAC roles (`buyer`, `seller`, `admin`), language & notification preferences, session revocation.
2. `seller_profiles`: Business storefront metadata and admin-controlled verification status.
3. `conversations`, `messages`, `message_reads`: Buyer–seller threads, risk tags, sender-only soft deletion, and per-participant read receipts.
4. `trust_scores` & `trust_score_events`: Persisted explainable evaluations and score delta history.
5. `security_events`, `security_alerts`, `account_reports`, `audit_logs`, `platform_policies`: Rule triggers, user advisories, human review status, immutable audit trail, and configurable thresholds.
6. `disputes` & `dispute_responses`: Structured case records, evidence items, timeline responses, and arbitration notes.
7. `notifications`: In-app notification feed delivered via REST and Socket.IO.
