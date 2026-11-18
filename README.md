# TrustBridge

**Building trust in every digital interaction.**

TrustBridge is a full-stack secure buyer–seller interaction platform built with React, TypeScript, Tailwind CSS, Express.js, Socket.IO, Argon2, and persistent SQLite (`sql.js` WebAssembly).

## Core Capabilities

- **Role-Based Access Control (RBAC)**: Buyer, Seller, and Administrator roles. Administrator accounts cannot be created through public registration and are provisioned separately on the backend.
- **Authenticated Messaging & Real-Time Updates**: Buyer–seller threads backed by HTTP-only JWT cookie authentication, Socket.IO real-time events, read receipts, sender-only soft message deletion (preserving dispute audit integrity), and thread search.
- **Rule-Based Fraud Screening & Security Alerts**: Automated rules detect off-platform payment solicitation, phishing/shortened links, urgency coercion, burst message frequency, repeated failed sign-ins, and unauthorized conversation access.
- **Explainable Trust Score Engine**: Transparent factor-by-factor scoring from verifiable account age, profile completeness, email verification, completed history, security events, and dispute outcomes. Accounts with limited activity explicitly show `"Not enough data"` rather than fabricated scores.
- **Dispute Management & Arbitration**: Structured case filing, evidence notes, participant timelines, and administrator arbitration (`OPEN`, `UNDER_REVIEW`, `WAITING_FOR_RESPONSE`, `RESOLVED`, `REJECTED`).
- **Multilingual Adapter**: Users set preferred languages; message translation connects to an optional external LibreTranslate-compatible endpoint when configured via environment variables and honestly reports unconfigured status otherwise.

## Quick Start (Windows PowerShell & Linux/macOS)

### Prerequisites
- Node.js 20+ (tested on Node.js 22)
- npm 10+

### 1. Install Dependencies
```powershell
npm install
```

### 2. Configure Environment Variables (Optional for Local Dev)
Copy `.env.example` to `.env` if you want custom values:
```powershell
Copy-Item .env.example .env
```

### 3. Build & Run Locally
```powershell
# Builds frontend bundle and runs backend + Socket.IO on http://localhost:3000
npm run dev
```

Or run frontend Vite dev server (`http://localhost:5173`) and backend (`http://localhost:3000`) separately in two terminals:
```powershell
# Terminal 1
npm run dev:backend

# Terminal 2
npm run dev:frontend
```

### 4. Verify Tests, Types, and Build
```powershell
npm run typecheck
npm run test
npm run lint
npm run build
```

## Seeded Local Evaluation Accounts

On first startup into an empty non-admin database, TrustBridge seeds sample accounts for evaluation:
- **Admin**: `admin@trustbridge.local` / `TrustBridgeAdmin!2026`
- **Buyer**: `buyer@trustbridge.local` / `TrustBridgeBuyer!2026`
- **Seller 1**: `elena@vanceaudio.local` / `TrustBridgeSeller!2026`
- **Seller 2**: `marcus@harborline.local` / `TrustBridgeSeller!2026`
- **Seller 3**: `priya@meridiantextiles.local` / `TrustBridgeSeller!2026`

## Environment & Honest Limitations
- **Password Reset**: In local development (`NODE_ENV !== "production"`), `/api/auth/forgot-password` generates a hashed single-use token and returns a development reset token directly because no external SMTP service is attached.
- **Translation**: `TRANSLATION_PROVIDER` defaults to `none`. Configure `TRANSLATION_PROVIDER=libretranslate` and `TRANSLATION_API_URL` to enable live machine translation; TrustBridge never fabricates placeholder translations.
- **Database**: Uses `sql.js` (WebAssembly SQLite) with non-destructive versioned migrations so Windows environments without native C++ build tools or under Application Control policies run reliably.

## Documentation
- [Architecture Overview](./docs/architecture.md)
- [API Documentation](./docs/api-documentation.md)
