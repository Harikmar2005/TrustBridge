export type UserRole = 'buyer' | 'seller' | 'support' | 'admin';

export type LanguageCode = 'en' | 'ta' | 'hi';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  preferredLanguage: LanguageCode;
  avatar: string;
  trustScore: number;
  phone: string;
  createdAt: string;
}

export interface UserProfile {
  userId: string;
  businessName?: string;
  verified: boolean;
  completedOrders: number;
  disputeRate: string;
  accountAgeDays: number;
  trustTier: 'PLATINUM' | 'GOLD' | 'STANDARD' | 'PROBATION';
  verificationBadges: string[];
}

export interface Transaction {
  id: string;
  referenceNumber: string;
  buyerId: string;
  sellerId: string;
  title: string;
  amount: number;
  currency: string;
  status: 'COMPLETED' | 'IN_ESCROW' | 'DISPUTED' | 'CANCELLED';
  date: string;
  category: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  content: string;
  language: string;
  translations: Record<string, string>;
  riskScore: number;
  riskCategory: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  detectedIndicators: string[];
  recommendedAction: string;
  detectionEngine?: 'GEMINI_2_5_FLASH' | 'HEURISTIC_RULE_ENGINE';
  confidenceScore?: number;
  isFlagged: boolean;
  isFalsePositive: boolean;
  timestamp: string;
}

export interface Conversation {
  id: string;
  type: 'direct' | 'dispute_room';
  nexconnChannelId: string;
  buyerId: string;
  sellerId: string;
  disputeId?: string;
  transactionId?: string;
  title: string;
  lastMessageAt: string;
  status: 'active' | 'archived';
}

export type DisputeCategory =
  | 'payment_issue'
  | 'non_delivery'
  | 'wrong_product'
  | 'refund_request'
  | 'seller_misconduct'
  | 'suspected_fraud';

export type DisputeStatus =
  | 'OPEN'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'WAITING_FOR_USER'
  | 'RESOLVED'
  | 'ESCALATED';

export type DisputePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface DisputeEvidence {
  id: string;
  uploadedBy: string;
  fileUrl: string;
  fileName: string;
  description: string;
  uploadedAt: string;
}

export interface DisputeHistoryItem {
  id: string;
  changedBy: string;
  fromStatus: string;
  toStatus: string;
  actionTaken: string;
  note: string;
  timestamp: string;
}

export interface Dispute {
  id: string;
  referenceId: string;
  transactionId: string;
  conversationId: string;
  buyerId: string;
  sellerId: string;
  assignedAgentId?: string;
  category: DisputeCategory;
  reason: string;
  status: DisputeStatus;
  priority: DisputePriority;
  evidence: DisputeEvidence[];
  history: DisputeHistoryItem[];
  resolutionNote?: string;
  resolutionOutcome?: 'FULL_REFUND' | 'PARTIAL_REFUND' | 'FUNDS_RELEASED' | 'DISMISSED';
  createdAt: string;
  updatedAt: string;
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  disputeId?: string;
  conversationId: string;
  requesterId: string;
  assignedAgentId?: string;
  title: string;
  summary: string;
  priority: DisputePriority;
  status: DisputeStatus;
  category: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface FraudAlert {
  id: string;
  conversationId: string;
  messageId: string;
  targetUserId: string;
  targetUserName: string;
  riskScore: number;
  category: string;
  indicators: string[];
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reviewStatus: 'NEW' | 'REVIEWED' | 'DISMISSED' | 'ACTIONED';
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  timestamp: string;
}

export interface AdminMetrics {
  kpis: {
    totalUsers: number;
    activeConversations: number;
    openDisputes: number;
    highRiskMessages: number;
    pendingTickets: number;
    resolvedDisputes: number;
    avgResolutionHours: string;
    protectionSuccessRate: string;
  };
  riskDistribution: Array<{ name: string; value: number; color: string }>;
  disputeTrends: Array<{ day: string; opened: number; resolved: number }>;
  agentWorkload: Array<{ name: string; assigned: number; resolved: number; rating: number }>;
}
