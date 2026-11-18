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
