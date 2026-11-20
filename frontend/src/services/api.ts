import type {
  AuthUser,
  ChatMessage,
  ConversationSummary,
  DisputeRecord,
  DisputeResponseRecord,
  DisputeStatus,
  NotificationPreferences,
  NotificationRecord,
  SecurityAlertRecord,
  SecurityEventRecord,
  SecurityEventStatus,
  SellerProfile,
  TrustScoreResult,
} from "@shared/types";

export type {
  AuthUser,
  ChatMessage,
  ConversationSummary,
  DisputeRecord,
  DisputeResponseRecord,
  DisputeStatus,
  NotificationPreferences,
  NotificationRecord,
  SecurityAlertRecord,
  SecurityEventRecord,
  SecurityEventStatus,
  SellerProfile,
  TrustScoreResult,
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

interface ApiResponse<T = unknown> {
  success: boolean;
  code?: string;
  message?: string;
  user?: AuthUser;
  data?: T;
  errors?: { field: string; message: string }[];
  [key: string]: unknown;
}

export class ApiHttpError extends Error {
  public readonly status: number;
  public readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiHttpError";
    this.status = status;
    this.code = code;
  }
}

async function apiRequest<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T> & Record<string, unknown>> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    credentials: "include",
    headers,
  });

  let data: ApiResponse<T> & Record<string, unknown>;
  try {
    data = (await response.json()) as ApiResponse<T> & Record<string, unknown>;
  } catch {
    throw new ApiHttpError(
      "The server returned an invalid response.",
      response.status
    );
  }

  if (!response.ok) {
    if (
      response.status === 401 &&
      !endpoint.startsWith("/auth/login") &&
      !endpoint.startsWith("/auth/register") &&
      !endpoint.startsWith("/auth/me")
    ) {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("tb:unauthorized"));
      }
    }
    throw new ApiHttpError(
      typeof data.message === "string"
        ? data.message
        : `Request failed (${response.status})`,
      response.status,
      typeof data.code === "string" ? data.code : undefined
    );
  }

  return data;
}

// Auth
export function registerUser(details: {
  fullName: string;
  email: string;
  password: string;
  role: "buyer" | "seller";
}) {
  return apiRequest("/auth/register", {
    method: "POST",
    body: JSON.stringify(details),
  });
}

export function loginUser(details: { email: string; password: string }) {
  return apiRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify(details),
  });
}

export function getCurrentUser() {
  return apiRequest("/auth/me");
}

export function logoutUser() {
  return apiRequest("/auth/logout", { method: "POST" });
}

export function changePassword(details: {
  currentPassword: string;
  newPassword: string;
}) {
  return apiRequest("/auth/change-password", {
    method: "POST",
    body: JSON.stringify(details),
  });
}

export function requestPasswordReset(email: string) {
  return apiRequest("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function resetPasswordWithToken(details: {
  token: string;
  newPassword: string;
}) {
  return apiRequest("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(details),
  });
}

export function getActiveSessions() {
  return apiRequest("/auth/sessions");
}

export function revokeSession(sessionId: string) {
  return apiRequest(`/auth/sessions/${sessionId}`, { method: "DELETE" });
}

// Users & Dashboard & Sellers
export function getDashboardSummary() {
  return apiRequest<{
    metrics: {
      totalConversations: number;
      activeConversations: number;
      unreadMessages: number;
      securityAlerts: number;
      openDisputes: number;
    };
    trustScore: TrustScoreResult;
    sellerProfile: SellerProfile | null;
    recentConversations: Array<{
      id: string;
      participantId: string;
      participantName: string;
      participantRole: string;
      lastMessage: string | null;
      lastMessageAt: string | null;
    }>;
    recentAlerts: SecurityAlertRecord[];
    recentNotifications: NotificationRecord[];
    recentSellers: SellerProfile[];
  }>("/users/dashboard");
}

export function updateProfile(details: {
  fullName?: string;
  preferredLanguage?: string;
  notificationPrefs?: Partial<NotificationPreferences>;
}) {
  return apiRequest("/users/profile", {
    method: "PATCH",
    body: JSON.stringify(details),
  });
}

export function upsertSellerProfile(details: {
  businessName: string;
  category: string;
  location: string;
  description: string;
  website?: string;
  responseTimeLabel?: string;
}) {
  return apiRequest("/users/seller-profile", {
    method: "PUT",
    body: JSON.stringify(details),
  });
}

export function listSellers(params?: { q?: string; category?: string }) {
  const qs = new URLSearchParams();
  if (params?.q) qs.set("q", params.q);
  if (params?.category && params.category !== "all") {
    qs.set("category", params.category);
  }
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return apiRequest(`/users/sellers${suffix}`);
}

export function reportAccount(details: {
  reportedUserId: string;
  conversationId?: string | null;
  reason: string;
  details: string;
}) {
  return apiRequest("/users/report", {
    method: "POST",
    body: JSON.stringify(details),
  });
}

export function requestAccountDeletion() {
  return apiRequest("/users/delete-request", { method: "POST" });
}

// Messaging & Nexconn Chat Token & Translation
export async function getNexconnChatStatus(): Promise<{
  configured: boolean;
  areaCode: "SG" | "NA" | "SA" | "BJ" | "OM";
  nexconnUserId: string;
}> {
  const res = await apiRequest("/chat/status");
  return {
    configured: Boolean(res.configured),
    areaCode: (res.areaCode as "SG" | "NA" | "SA" | "BJ" | "OM") || "SG",
    nexconnUserId: String(res.nexconnUserId || ""),
  };
}

export async function getNexconnChatToken(): Promise<{
  token: string;
  nexconnUserId: string;
  appKey: string;
  areaCode: "SG" | "NA" | "SA" | "BJ" | "OM";
}> {
  const res = await apiRequest("/chat/token");
  return {
    token: String(res.token || ""),
    nexconnUserId: String(res.nexconnUserId || ""),
    appKey: String(res.appKey || ""),
    areaCode: (res.areaCode as "SG" | "NA" | "SA" | "BJ" | "OM") || "SG",
  };
}

export function getConversations() {
  return apiRequest("/messages/conversations");
}

export function createConversation(recipientId: string) {
  return apiRequest("/messages/conversations", {
    method: "POST",
    body: JSON.stringify({ recipientId }),
  });
}

export function getConversationMessages(conversationId: string) {
  return apiRequest(`/messages/${conversationId}`);
}

export function sendConversationMessage(
  conversationId: string,
  content: string,
  options?: {
    deliveryTransport?: "nexconn" | "socket";
    nexconnMessageId?: string;
  }
) {
  return apiRequest(`/messages/${conversationId}`, {
    method: "POST",
    body: JSON.stringify({
      content,
      ...(options?.deliveryTransport
        ? { deliveryTransport: options.deliveryTransport }
        : {}),
      ...(options?.nexconnMessageId
        ? { nexconnMessageId: options.nexconnMessageId }
        : {}),
    }),
  });
}

export function attachMessageNexconnId(
  messageId: string,
  nexconnMessageId: string
) {
  return apiRequest(`/messages/${messageId}/nexconn`, {
    method: "PATCH",
    body: JSON.stringify({ nexconnMessageId }),
  });
}

export function triggerMessageSocketFallback(messageId: string) {
  return apiRequest<ChatMessage>(`/messages/${messageId}/fallback`, {
    method: "POST",
  });
}

export function markConversationRead(
  conversationId: string,
  deliveryTransport?: "nexconn" | "socket"
) {
  return apiRequest(`/messages/${conversationId}/read`, {
    method: "PATCH",
    ...(deliveryTransport
      ? { body: JSON.stringify({ deliveryTransport }) }
      : {}),
  });
}

export function deleteMessage(
  messageId: string,
  deliveryTransport?: "nexconn" | "socket"
) {
  const qs = deliveryTransport
    ? `?deliveryTransport=${encodeURIComponent(deliveryTransport)}`
    : "";
  return apiRequest(`/messages/${messageId}${qs}`, { method: "DELETE" });
}

export function translateMessage(messageId: string, targetLanguage: string) {
  return apiRequest<{
    configured: boolean;
    provider: string;
    originalText: string;
    detectedLanguage: string | null;
    targetLanguage: string;
    translatedText: string | null;
    machineGenerated: boolean;
    notice: string;
  }>(`/messages/${messageId}/translate`, {
    method: "POST",
    body: JSON.stringify({ targetLanguage }),
  });
}

// Trust Score
export function getMyTrustScore() {
  return apiRequest<{
    trustScore: TrustScoreResult;
    history: Array<{
      id: string;
      delta: number;
      reason: string;
      sourceType: string;
      createdAt: string;
    }>;
  }>("/trust/me");
}

export function recalculateTrustScore() {
  return apiRequest("/trust/recalculate", { method: "POST" });
}

// Security Monitoring
export function getMySecurityOverview() {
  return apiRequest<{
    summary: {
      totalEvents: number;
      criticalCount: number;
      highCount: number;
      mediumCount: number;
      unreadAlerts: number;
    };
    alerts: SecurityAlertRecord[];
    events: SecurityEventRecord[];
  }>("/security/overview");
}

export function markSecurityAlertRead(alertId: string) {
  return apiRequest(`/security/alerts/${alertId}/read`, { method: "PATCH" });
}

// Disputes
export function listDisputes() {
  return apiRequest("/disputes");
}

export function createDispute(details: {
  counterpartyId: string;
  conversationId?: string | null;
  category: string;
  subject: string;
  description: string;
  evidence?: string[];
}) {
  return apiRequest("/disputes", {
    method: "POST",
    body: JSON.stringify(details),
  });
}

export function getDisputeDetails(disputeId: string) {
  return apiRequest<{
    dispute: DisputeRecord;
    responses: DisputeResponseRecord[];
  }>(`/disputes/${disputeId}`);
}

export function addDisputeResponse(
  disputeId: string,
  details: { message: string; evidenceText?: string }
) {
  return apiRequest(`/disputes/${disputeId}/responses`, {
    method: "POST",
    body: JSON.stringify(details),
  });
}

// Notifications
export function getNotifications() {
  return apiRequest("/notifications");
}

export function markNotificationRead(id: string) {
  return apiRequest(`/notifications/${id}/read`, { method: "PATCH" });
}

export function markAllNotificationsRead() {
  return apiRequest("/notifications/read-all", { method: "PATCH" });
}

// Admin
export function getAdminOverview() {
  return apiRequest<{
    stats: {
      totalUsers: number;
      buyersCount: number;
      sellersCount: number;
      suspendedCount: number;
      totalConversations: number;
      flaggedConversations: number;
      pendingSecurityEvents: number;
      criticalEvents: number;
      openDisputes: number;
      pendingReports: number;
    };
  }>("/admin/overview");
}

export function adminListUsers(params?: {
  q?: string;
  role?: string;
  status?: string;
}) {
  const qs = new URLSearchParams();
  if (params?.q) qs.set("q", params.q);
  if (params?.role && params.role !== "all") qs.set("role", params.role);
  if (params?.status && params.status !== "all") qs.set("status", params.status);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return apiRequest(`/admin/users${suffix}`);
}

export function adminUpdateUserStatus(
  userId: string,
  status: "active" | "suspended"
) {
  return apiRequest(`/admin/users/${userId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function adminVerifySeller(
  userId: string,
  verificationStatus: "verified" | "pending" | "unverified"
) {
  return apiRequest(`/admin/sellers/${userId}/verify`, {
    method: "PATCH",
    body: JSON.stringify({ verificationStatus }),
  });
}

export function adminGetSecurityData() {
  return apiRequest<{
    events: SecurityEventRecord[];
    reports: Array<{
      id: string;
      reporterName: string;
      reportedUserName: string;
      reportedUserEmail: string;
      reason: string;
      details: string;
      status: "PENDING_REVIEW" | "REVIEWED" | "DISMISSED";
      createdAt: string;
    }>;
    conversations: Array<{
      id: string;
      buyerName: string;
      sellerName: string;
      status: string;
      reportedFlag: number;
      messageCount: number;
      updatedAt: string;
    }>;
    auditLogs: Array<{
      id: string;
      actorName: string | null;
      actorEmail: string | null;
      action: string;
      targetType: string;
      targetId: string | null;
      createdAt: string;
    }>;
    policies: Array<{
      key: string;
      label: string;
      value: string;
      description: string;
    }>;
  }>("/admin/security");
}

export function adminUpdateSecurityEvent(
  eventId: string,
  status: SecurityEventStatus,
  reviewNotes?: string
) {
  return apiRequest(`/admin/security/${eventId}`, {
    method: "PATCH",
    body: JSON.stringify({ status, reviewNotes }),
  });
}

export function adminUpdateReport(
  reportId: string,
  status: "REVIEWED" | "DISMISSED" | "PENDING_REVIEW"
) {
  return apiRequest(`/admin/reports/${reportId}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function adminListDisputes() {
  return apiRequest("/admin/disputes");
}

export function adminUpdateDispute(
  disputeId: string,
  status: DisputeStatus,
  resolutionNotes?: string
) {
  return apiRequest(`/admin/disputes/${disputeId}`, {
    method: "PATCH",
    body: JSON.stringify({ status, resolutionNotes }),
  });
}

export function adminUpdatePolicy(key: string, value: string) {
  return apiRequest(`/admin/policies/${key}`, {
    method: "PUT",
    body: JSON.stringify({ value }),
  });
}
