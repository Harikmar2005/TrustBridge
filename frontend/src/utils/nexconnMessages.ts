import type { ChatMessage, ConversationSummary } from "@shared/types";

export interface NexconnMessageMetadata {
  trustBridgeMessageId?: string;
  trustBridgeConversationId?: string;
  riskLevel?: ChatMessage["riskLevel"];
}

export function parseNexconnExtra(extra?: string): NexconnMessageMetadata {
  if (!extra || typeof extra !== "string") {
    return {};
  }
  try {
    const parsed = JSON.parse(extra) as Record<string, unknown>;
    const risk = parsed.riskLevel;
    const validRisk =
      risk === "NONE" ||
      risk === "LOW" ||
      risk === "MEDIUM" ||
      risk === "HIGH" ||
      risk === "CRITICAL"
        ? risk
        : undefined;

    return {
      trustBridgeMessageId:
        typeof parsed.trustBridgeMessageId === "string"
          ? parsed.trustBridgeMessageId
          : undefined,
      trustBridgeConversationId:
        typeof parsed.trustBridgeConversationId === "string"
          ? parsed.trustBridgeConversationId
          : undefined,
      riskLevel: validRisk,
    };
  } catch {
    return {};
  }
}

export function serializeNexconnExtra(meta: NexconnMessageMetadata): string {
  return JSON.stringify(meta);
}

/**
 * Finds the authorized TrustBridge conversation matching a Nexconn DirectChannel counterparty ID.
 * Returns null if the user has no authorized conversation with that counterparty,
 * preventing unauthorized Nexconn channels from bypassing TrustBridge membership rules.
 */
export function findAuthorizedConversationForNexconnChannel(
  conversations: ConversationSummary[],
  channelNexconnUserId: string
): ConversationSummary | null {
  if (!channelNexconnUserId) return null;
  return (
    conversations.find(
      (c) => c.participantNexconnUserId === channelNexconnUserId
    ) ?? null
  );
}

/**
 * Merges a new or reconciled ChatMessage into an existing message array without creating duplicates.
 * Matches by TrustBridge `id` or `nexconnMessageId`.
 */
export function mergeChatMessage(
  existing: ChatMessage[],
  incoming: ChatMessage
): ChatMessage[] {
  const matchIdx = existing.findIndex(
    (m) =>
      m.id === incoming.id ||
      (Boolean(incoming.nexconnMessageId) &&
        m.nexconnMessageId === incoming.nexconnMessageId)
  );

  if (matchIdx >= 0) {
    const prev = existing[matchIdx];
    const updated: ChatMessage = {
      ...prev,
      ...incoming,
      id: prev.id,
      nexconnMessageId: incoming.nexconnMessageId ?? prev.nexconnMessageId,
      riskLevel: incoming.riskLevel ?? prev.riskLevel,
      readByOther: Boolean(prev.readByOther || incoming.readByOther),
      isDeleted: Boolean(prev.isDeleted || incoming.isDeleted),
    };
    const next = existing.slice();
    next[matchIdx] = updated;
    return next;
  }

  return [...existing, incoming];
}

/**
 * Reconciles a fresh SQLite history snapshot with any live Nexconn messages in memory,
 * preserving chronological order and preventing duplicate entries.
 */
export function reconcileConversationMessages(
  serverMessages: ChatMessage[],
  liveMessages: ChatMessage[],
  conversationId: string
): ChatMessage[] {
  let merged = serverMessages.slice();
  for (const live of liveMessages) {
    if (live.conversationId !== conversationId) continue;
    merged = mergeChatMessage(merged, live);
  }
  return merged;
}
