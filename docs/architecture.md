# TrustBridge Architecture

## System Overview
TrustBridge connects buyers, sellers, support agents, and admins with built-in escrow, dispute resolution, fraud analysis, and multi-language translation.

## High-Level Architecture

```
       +---------------------------------------------+
       |                  Frontend                   |
       |  (React, TypeScript, Vite, Tailwind/CSS)    |
       |   Roles: Buyer, Seller, Support, Admin      |
       +----------------------+----------------------+
                              | HTTP / WebSocket
                              v
       +---------------------------------------------+
       |                  Backend                    |
       |             (Node.js / Express)             |
       +----------------------+----------------------+
                              |
     +------------+-----------+-----------+------------+
     |            |           |           |            |
     v            v           v           v            v
  [Auth]      [Nexconn]    [Fraud]   [Translation] [Dispute]
  Service      Service     Service      Service    Service
```

## Core Modules
- **Frontend**: Role-based routing (Buyer, Seller, Support, Admin), real-time chat components, layout system.
- **Backend Services**:
  - `auth`: User authentication, session management, and RBAC.
  - `nexconn`: Real-time messaging and communication gateway.
  - `fraud`: AI/rule-based fraud detection and risk scoring.
  - `translation`: Real-time cross-language message translation.
  - `dispute`: Arbitration workflow and resolution engine.
- **Shared**: Type definitions and interfaces common to frontend and backend.

