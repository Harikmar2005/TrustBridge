# TrustBridge

TrustBridge is an end-to-end platform bridging trust between buyers and sellers, incorporating real-time communication, dispute resolution, AI/fraud detection, and translation services.

## Project Structure

```text
TrustBridge/
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── common/
│   │   │   ├── layout/
│   │   │   └── chat/
│   │   ├── pages/
│   │   │   ├── auth/
│   │   │   ├── buyer/
│   │   │   ├── seller/
│   │   │   ├── support/
│   │   │   └── admin/
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── types/
│   │   ├── utils/
│   │   ├── styles/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── services/
│   │   │   ├── auth/
│   │   │   ├── nexconn/
│   │   │   ├── fraud/
│   │   │   ├── translation/
│   │   │   └── dispute/
│   │   ├── models/
│   │   ├── database/
│   │   ├── utils/
│   │   ├── types/
│   │   └── server.ts
│   ├── tests/
│   ├── package.json
│   └── .env.example
│
├── shared/
│   └── types/
│
├── docs/
│   ├── architecture.md
│   └── api-documentation.md
│
├── .gitignore
├── package.json
└── README.md
```

## Quick Start

### Prerequisites
- Node.js (v18+)
- npm / pnpm / yarn

### Installation
```bash
# Install dependencies across all workspaces
npm install
```

### Running Locally
```bash
# Run both frontend and backend concurrently
npm run dev

# Or run separately:
npm run dev:frontend
npm run dev:backend
```

## Documentation
- [Architecture Overview](file:///docs/architecture.md)
- [API Documentation](file:///docs/api-documentation.md)

