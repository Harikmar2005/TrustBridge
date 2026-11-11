import {
  User,
  UserProfile,
  Transaction,
  Message,
  Conversation,
  Dispute,
  SupportTicket,
  FraudAlert,
  AuditLog,
  AdminMetrics,
  RiskAnalysisResult,
  NexconnConfigStatus,
  NexconnTokenResponse,
  AuthSessionResponse,
} from '../types';

export const API_ENDPOINTS = {
  // Auth
  AUTH_LOGIN: '/api/auth/login',
  AUTH_REGISTER: '/api/auth/register',
  AUTH_SWITCH_DEMO: '/api/auth/switch-demo-user',
  AUTH_LOGOUT: '/api/auth/logout',
  AUTH_ME: '/api/auth/me',

  // Users
  USERS_LIST: '/api/users',
  USER_PROFILE: (id: string) => `/api/users/${id}/profile`,
  USER_LANGUAGE: (id: string) => `/api/users/${id}/language`,

  // Nexconn
  NEXCONN_STATUS: '/api/v1/nexconn/status',
  NEXCONN_TOKEN: '/api/v1/nexconn/token',

  // Conversations & Messages
  CONVERSATIONS_LIST: '/api/conversations',
  CONVERSATION_MESSAGES: (id: string) => `/api/conversations/${id}/messages`,
  MESSAGE_SEND: '/api/messages/send',
  MESSAGE_READ: (id: string) => `/api/messages/${id}/read`,
  MESSAGE_FALSE_POSITIVE: (id: string) => `/api/messages/${id}/false-positive`,

  // Disputes & Resolution
  DISPUTES_LIST: '/api/disputes',
  DISPUTE_DETAIL: (id: string) => `/api/disputes/${id}`,
  DISPUTE_CREATE: '/api/disputes/create',
  DISPUTE_RESOLVE: (id: string) => `/api/disputes/${id}/resolve`,

  // Support & Admin
  TICKETS_LIST: '/api/tickets',
  FRAUD_ALERTS_LIST: '/api/fraud-alerts',
  FRAUD_ALERT_STATUS: (id: string) => `/api/fraud-alerts/${id}/status`,
  AUDIT_LOGS_LIST: '/api/audit-logs',
  ADMIN_METRICS: '/api/admin/metrics',

  // AI 2.0 Fraud Intelligence
  FRAUD_ANALYZE: '/api/v1/fraud/analyze',
  FRAUD_ANALYZE_URL: '/api/v1/fraud/analyze-url',
  FRAUD_ANALYSIS_DETAIL: (id: string) => `/api/v1/fraud/analysis/${id}`,
  FRAUD_STATS: '/api/v1/fraud/stats',
  FRAUD_MODELS: '/api/v1/fraud/models',

  // Benchmark & Demo
  TEST_BENCHMARK: '/api/test/fraud-detection-benchmark',
  TEST_TRANSLATIONS: '/api/test/translations',
  DEMO_RESET: '/api/demo/reset',
} as const;

export interface ApiResponse<T> {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  role?: 'buyer' | 'seller';
  preferredLanguage?: 'en' | 'ta' | 'hi';
  phone?: string;
}

export interface SwitchDemoUserRequest {
  userId: string;
}

export interface SendMessageRequest {
  conversationId: string;
  content: string;
  language?: string;
  deliveryStatus?: 'PENDING_CLOUD' | 'DELIVERED_CLOUD' | 'DELIVERED_LOCAL' | 'FAILED';
  nexconnMessageId?: string;
}

export interface CreateDisputeRequest {
  transactionId: string;
  conversationId: string;
  sellerId: string;
  category: string;
  reason: string;
  evidenceFiles?: Array<{
    name: string;
    url?: string;
    description?: string;
  }>;
}

export interface ResolveDisputeRequest {
  outcome: 'FULL_REFUND' | 'PARTIAL_REFUND' | 'FUNDS_RELEASED' | 'DISMISSED';
  note: string;
}
