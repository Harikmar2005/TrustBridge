export type UserRole = 'buyer' | 'seller' | 'support' | 'admin';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  createdAt: string;
}

export type DisputeStatus = 'open' | 'under_review' | 'resolved' | 'escalated' | 'closed';

export interface Dispute {
  id: string;
  transactionId: string;
  initiatorId: string;
  defendantId: string;
  status: DisputeStatus;
  reason: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  originalLanguage?: string;
  translatedContent?: string;
  riskScore?: number;
  timestamp: string;
}

