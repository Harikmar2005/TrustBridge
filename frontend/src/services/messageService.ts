import {
  attachMessageNexconnId,
  createConversation,
  deleteMessage,
  getConversationMessages,
  getConversations,
  listSellers,
  markConversationRead,
  reportAccount,
  sendConversationMessage,
  translateMessage,
  triggerMessageSocketFallback,
} from "./api";
import type {
  ChatMessage,
  ConversationSummary,
  SellerProfile,
  TranslationOutput,
} from "../types/message";

export async function fetchConversations(): Promise<ConversationSummary[]> {
  const res = await getConversations();
  return (res.conversations as ConversationSummary[]) || [];
}

export async function createOrGetConversation(
  recipientId: string
): Promise<{ conversationId: string; message?: string }> {
  const res = await createConversation(recipientId);
  const conversationId =
    typeof res.conversationId === "string" ? res.conversationId : "";
  if (!conversationId) {
    throw new Error("Server did not return a conversation ID.");
  }
  return {
    conversationId,
    message: typeof res.message === "string" ? res.message : undefined,
  };
}

export async function fetchConversationMessages(
  conversationId: string
): Promise<ChatMessage[]> {
  const res = await getConversationMessages(conversationId);
  return (res.messages as ChatMessage[]) || [];
}

export async function postMessage(
  conversationId: string,
  content: string,
  options?: {
    deliveryTransport?: "nexconn" | "socket";
    nexconnMessageId?: string;
  }
): Promise<{ message: ChatMessage | undefined; safetyNotice?: string }> {
  const res = await sendConversationMessage(conversationId, content, options);
  return {
    message: res.data as ChatMessage | undefined,
    safetyNotice:
      typeof res.safetyNotice === "string" ? res.safetyNotice : undefined,
  };
}

export async function saveMessageNexconnRef(
  messageId: string,
  nexconnMessageId: string
): Promise<void> {
  await attachMessageNexconnId(messageId, nexconnMessageId);
}

export async function broadcastMessageSocketFallback(
  messageId: string
): Promise<ChatMessage | undefined> {
  const res = await triggerMessageSocketFallback(messageId);
  return res.data;
}

export interface MarkThreadReadResult {
  markedCount: number;
  markedNexconnMessageIds: string[];
  hasLegacyUnread: boolean;
}

export async function markThreadRead(
  conversationId: string,
  deliveryTransport?: "nexconn" | "socket"
): Promise<MarkThreadReadResult> {
  const res = await markConversationRead(conversationId, deliveryTransport);
  const rawIds = Array.isArray(res.markedNexconnMessageIds)
    ? res.markedNexconnMessageIds
    : [];
  return {
    markedCount: Number(res.markedCount || 0),
    markedNexconnMessageIds: rawIds.filter(
      (id): id is string => typeof id === "string" && id.length > 0
    ),
    hasLegacyUnread: Boolean(res.hasLegacyUnread),
  };
}

export async function removeMessage(
  messageId: string,
  deliveryTransport?: "nexconn" | "socket"
): Promise<void> {
  await deleteMessage(messageId, deliveryTransport);
}

export async function translateChatMessage(
  messageId: string,
  targetLanguage: string
): Promise<TranslationOutput | null> {
  const res = await translateMessage(messageId, targetLanguage);
  return (res.data as TranslationOutput | undefined) ?? null;
}

export async function reportConversationCounterparty(params: {
  reportedUserId: string;
  conversationId: string;
  reason: string;
  details: string;
}): Promise<string> {
  const res = await reportAccount(params);
  return String(res.message || "Report submitted.");
}

export async function fetchAvailableSellers(): Promise<SellerProfile[]> {
  const res = await listSellers();
  return (res.sellers as SellerProfile[]) || [];
}
