# TrustBridge API Documentation

## Base URL
`/api` (same-origin Express server on port `3000`)

## Authentication
Cookie-based HTTP-only JWT (`trustbridge_token`, bound to a revocable `user_sessions.id` via `jti`), with `Authorization: Bearer <token>` also accepted for API clients.

---

## Health
- `GET /api` — Service metadata
- `GET /api/health` — Returns `{ success: true, status: "ok", timestamp }`

## Authentication (`/api/auth`)
- `POST /api/auth/register` — Register `buyer` or `seller` (`admin` rejected)
- `POST /api/auth/login` — Authenticate credentials, create session, set HTTP-only cookie
- `GET /api/auth/me` — Return authenticated `AuthUser`
- `POST /api/auth/logout` — Revoke current session and clear cookie
- `POST /api/auth/change-password` — Verify current password, update Argon2 hash, revoke other sessions
- `POST /api/auth/forgot-password` — Generate hashed single-use reset token (dev token returned only when `NODE_ENV !== "production"`)
- `POST /api/auth/reset-password` — Redeem reset token and revoke active sessions
- `GET /api/auth/sessions` — List active sessions for authenticated user
- `DELETE /api/auth/sessions/:id` — Revoke a specific session

## Users, Dashboard & Sellers (`/api/users`)
- `GET /api/users/dashboard` — Role-specific workspace metrics, trust score, seller profile, recent conversations, and alerts
- `PATCH /api/users/profile` — Update `fullName`, `preferredLanguage`, and `notificationPrefs`
- `PUT /api/users/seller-profile` — Create or update authenticated seller's business profile
- `GET /api/users/sellers` — Public seller directory (`?q=&category=`) with explainable trust score previews
- `POST /api/users/report` — Report a counterparty account for administrator review
- `POST /api/users/delete-request` — Mark account status `pending_deletion`

## Messaging, Nexconn Chat & Translation (`/api/messages`, `/api/chat`)
- `GET /api/chat/status` — Returns whether Nexconn credentials are configured, `areaCode`, and the authenticated user's deterministic `nexconnUserId`
- `GET /api/chat/token` — Authenticates session via HTTP-only JWT cookie, rejects cross-user `?userId=` overrides (`403`), and issues a short-lived Nexconn user token via backend-only `NEXCONN_APP_SECRET` (returns `503 NEXCONN_NOT_CONFIGURED` when unset)
- `GET /api/messages/conversations` — List authenticated user's conversations with unread counts and `participantNexconnUserId`
- `POST /api/messages/conversations` — Open or fetch existing buyer–seller conversation
- `GET /api/messages/:id` — Fetch messages and read receipt state (logs `HIGH` security event if unauthorized)
- `POST /api/messages/:id` — Send message, run rule-based fraud screening, persist, and broadcast via Socket.IO unless `deliveryTransport === "nexconn"`
- `PATCH /api/messages/:messageId/nexconn` — Attach Nexconn `messageId` correlation reference (sender-only)
- `PATCH /api/messages/:id/read` — Mark unread counterparty messages as read
- `DELETE /api/messages/:messageId` — Soft-delete sender's own message while preserving audit integrity
- `POST /api/messages/:messageId/translate` — Validate supported target language (`en`, `es`, `fr`, `de`, `hi`, `ta`, `zh`, `ja`, `ar`, `pt`) and invoke configured translation provider or return honest unconfigured notice

## Trust & Security (`/api/trust`, `/api/security`, `/api/notifications`)
- `GET /api/trust/me` — Current user's explainable trust score and evaluation history
- `GET /api/trust/user/:userId` — Public explainable trust score summary
- `POST /api/trust/recalculate` — Re-evaluate trust score from current records
- `GET /api/security/overview` — User's security event counts, alerts, and event history
- `PATCH /api/security/alerts/:id/read` — Mark security alert as read
- `GET /api/notifications` / `PATCH /api/notifications/:id/read` / `PATCH /api/notifications/read-all`

## Disputes (`/api/disputes`)
- `GET /api/disputes` — List buyer/seller disputes
- `POST /api/disputes` — Open new dispute with category, description, and evidence list
- `GET /api/disputes/:id` — Dispute details and timeline responses
- `POST /api/disputes/:id/responses` — Append participant response and optional evidence note

## Administrator Console (`/api/admin`, requires `role === "admin"`)
- `GET /api/admin/overview` — Platform KPIs
- `GET /api/admin/users` — Filterable user & seller list
- `PATCH /api/admin/users/:id/status` — Suspend or reactivate an account
- `PATCH /api/admin/sellers/:userId/verify` — Update seller verification status
- `GET /api/admin/security` — Security events, reports, flagged conversations, audit logs, platform policies
- `PATCH /api/admin/security/:id` — Update security event status & review notes
- `PATCH /api/admin/reports/:id` — Update account report status
- `GET /api/admin/disputes` — List all platform disputes
- `PATCH /api/admin/disputes/:id` — Update dispute status & resolution notes
- `PUT /api/admin/policies/:key` — Update platform policy value
