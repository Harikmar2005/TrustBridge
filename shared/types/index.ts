export type UserRole = 'buyer' | 'seller' | 'admin';

export type AccountStatus = 'active' | 'suspended' | 'pending_deletion';

export type DisputeStatus =
  | 'OPEN'
  | 'UNDER_REVIEW'
  | 'WAITING_FOR_RESPONSE'
  | 'RESOLVED'
  | 'REJECTED';

export type SecuritySeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type SecurityEventStatus =
  | 'PENDING_REVIEW'
  | 'UNDER_INVESTIGATION'
  | 'RESOLVED'
  | 'DISMISSED';

export interface NotificationPreferences {
  newMessages: boolean;
  securityAlerts: boolean;
  disputeUpdates: boolean;
  accountChanges: boolean;
  adminAnnouncements: boolean;
}

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  status: AccountStatus;
  preferredLanguage: string;
  emailVerified: boolean;
  notificationPrefs: NotificationPreferences;
  createdAt: string;
  updatedAt: string;
}

export interface SellerProfile {
  id: string;
  userId: string;
  fullName?: string;
  email?: string;
  businessName: string;
  category: string;
  location: string;
  description: string;
  website: string;
  verificationStatus: 'unverified' | 'pending' | 'verified';
  responseTimeLabel: string;
  completedTransactions: number;
  createdAt: string;
  updatedAt: string;
  trustScore?: TrustScoreResult;
}

export interface TrustFactor {
  name: string;
  impact: 'positive' | 'negative' | 'neutral';
  points: number;
  detail: string;
}

export interface TrustScoreResult {
  score: number | null;
  level: 'Excellent' | 'Good' | 'Fair' | 'Low' | 'Not enough data';
  insufficientData: boolean;
  factors: TrustFactor[];
  disclaimer: string;
  lastUpdated: string;
}

export interface ConversationSummary {
  id: string;
  buyerId: string;
  sellerId: string;
  status: string;
  reportedFlag: number;
  createdAt: string;
  updatedAt: string;
  participantId: string;
  participantNexconnUserId?: string;
  participantName: string;
  participantRole: UserRole;
  participantBusinessName?: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  originalLanguage?: string | null;
  riskLevel?: SecuritySeverity | 'NONE';
  nexconnMessageId?: string | null;
  isDeleted: boolean;
  deletedAt?: string | null;
  readByOther?: boolean;
  createdAt: string;
}

export interface DisputeRecord {
  id: string;
  conversationId: string | null;
  buyerId: string;
  sellerId: string;
  openedBy: string;
  buyerName?: string;
  sellerName?: string;
  category: string;
  subject: string;
  description: string;
  evidence: string[];
  status: DisputeStatus;
  resolutionNotes: string | null;
  resolvedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DisputeResponseRecord {
  id: string;
  disputeId: string;
  authorId: string;
  authorName?: string;
  authorRole: UserRole;
  message: string;
  evidenceText: string | null;
  createdAt: string;
}

export interface SecurityEventRecord {
  id: string;
  userId: string | null;
  userName?: string | null;
  userEmail?: string | null;
  eventType: string;
  severity: SecuritySeverity;
  description: string;
  metadata: Record<string, unknown>;
  status: SecurityEventStatus;
  reviewedBy: string | null;
  reviewNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SecurityAlertRecord {
  id: string;
  userId: string;
  securityEventId: string | null;
  title: string;
  message: string;
  severity: SecuritySeverity;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationRecord {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}
