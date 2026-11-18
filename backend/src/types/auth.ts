import { Request } from 'express';
import type {
  AccountStatus,
  NotificationPreferences,
  UserRole,
} from './domain';

export type { AccountStatus, NotificationPreferences, UserRole };

export interface UserRow {
  id: string;
  fullName: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status: AccountStatus;
  preferredLanguage: string;
  emailVerified: number;
  notificationPrefs: string;
  deletionRequestedAt: string | null;
  createdAt: string;
  updatedAt: string;
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

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  jti: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
  sessionId?: string;
}

export interface ApiFieldError {
  field: string;
  message: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  user?: T;
  errors?: ApiFieldError[];
}
