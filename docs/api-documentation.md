# TrustBridge API Documentation

## Base URL
`/api/v1`

## Authentication
Bearer token authentication via JWT in the `Authorization` header:
`Authorization: Bearer <token>`

---

## Endpoints

### Health Check
- `GET /api/v1/health`
  - Response: `{ "status": "ok", "timestamp": "ISO-8601" }`

### Authentication (`/api/v1/auth`)
- `POST /register`: Register a new user (buyer/seller)
- `POST /login`: Authenticate and receive JWT
- `GET /me`: Get current user profile

### Nexconn / Chat (`/api/v1/chat`)
- `GET /conversations`: Retrieve active conversations
- `POST /messages`: Send message (triggers translation & fraud check)
- `GET /messages/:conversationId`: Retrieve message history

### Fraud Detection (`/api/v1/fraud`)
- `POST /analyze`: Submit transaction or message for risk evaluation

### Translation (`/api/v1/translation`)
- `POST /translate`: Translate text into target language

### Dispute Management (`/api/v1/disputes`)
- `POST /create`: Open dispute for a transaction
- `GET /:id`: Retrieve dispute status and audit log
- `POST /:id/resolve`: Arbitrate or resolve dispute

