import { Request } from 'express';

export type UserRole = 'buyer' | 'seller';

export interface User {
  id: string;
  fullName: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  createdAt: string;
}

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export interface ApiFieldError {
  field: string;
  message: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  user?: T;
  errors?: ApiFieldError[];
}

