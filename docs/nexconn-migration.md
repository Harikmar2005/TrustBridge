# Socket.IO to Nexconn Chat SDK Migration Plan

## Current Socket.IO Dependency Inventory

Before removing Socket.IO, every usage across `backend/` and `frontend/` was audited:

| Area | Current Usage | Migration Status |
| --- | --- | --- |
| `frontend/src/contexts/AuthContext.tsx` | Opens Socket.IO connection with cookie auth and exposes `socket`, `socketConnected`. | Retained during transition for non-chat notifications and offline fallback. |
| `frontend/src/layouts/DashboardLayout.tsx` | Listens to `notification:new` for top-bar notification bell badge refresh. | Non-chat workflow — remains on Socket.IO until workspace notifications migrate to SSE or Nexconn system channel. |
| `frontend/src/pages/MessagesPage.tsx` | Listens to `message:new`, `conversation:read`, `message:deleted` for live chat updates. | **Migrated to Nexconn** (`NexconnContext` + `DirectChannel` + `MessageHandler`). Socket.IO listeners are suppressed whenever `nexconnConnected === true` so duplicate messages are never delivered. |
| `backend/src/socket.ts` & `backend/src/controllers/messages.controller.ts` | Emits `message:new`, `conversation:read`, `message:deleted`, and `notification:new`. | Chat room broadcasts (`emitToConversation`) are suppressed when requests specify `deliveryTransport: "nexconn"`. `emitToUser(..., "notification:new")` continues serving workspace bell updates. |

## Phased Cutover Strategy

1. **Phase A — Dual-Safe Transition (Current State)**:
   - Nexconn handles real-time 1:1 DirectChannel chat delivery, read receipts, and message deletions whenever `NEXCONN_APP_KEY` and `NEXCONN_APP_SECRET` are configured and connected.
   - TrustBridge remains authoritative for buyer/seller role enforcement, conversation membership, rule-based fraud analysis (`analyzeMessageForFraud`), explainable trust scoring, dispute management, and SQLite audit history.
   - Socket.IO `emitToConversation` chat broadcasts and frontend `socket.on("message:new")` listeners are disabled while Nexconn is active to prevent duplicate delivery.
2. **Phase B — Full Verification with Live Nexconn Credentials**:
   - Configure `NEXCONN_APP_KEY`, `NEXCONN_APP_SECRET`, and `NEXCONN_AREA_CODE` on the backend.
   - Verify end-to-end buyer ↔ seller message delivery, reconnect sync, read receipts, and delete-for-all across two live browser sessions.
3. **Phase C — Socket.IO Chat Path Removal**:
   - After live Nexconn verification succeeds, remove `conversation:join`, `conversation:leave`, `message:send`, and `emitToConversation` chat events from `backend/src/socket.ts` and `MessagesPage.tsx`, keeping only `notification:new` (or migrating notifications to SSE/SystemChannel before uninstalling `socket.io` / `socket.io-client`).
