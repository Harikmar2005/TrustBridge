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

/**
 * Checks whether NCEngine.initialize must run for the requested (appKey, areaCode).
 */
export function shouldInitializeNexconnSdk(params: {
  currentAppKey: string | null;
  currentAreaCode: string | null;
  nextAppKey: string;
  nextAreaCode: string;
}): boolean {
  if (!params.nextAppKey) {
    return false;
  }
  return (
    params.currentAppKey !== params.nextAppKey ||
    params.currentAreaCode !== params.nextAreaCode
  );
}

/**
 * Filters candidate Nexconn message IDs to deduplicated IDs not yet acknowledged.
 */
export function filterUnsentReceiptIds(
  candidateIds: Array<string | null | undefined>,
  alreadySentIds: ReadonlySet<string>
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of candidateIds) {
    if (typeof raw !== "string") continue;
    const id = raw.trim();
    if (!id || alreadySentIds.has(id) || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }
  return result;
}

export interface NexconnDeliveryResult {
  transport: "nexconn" | "socket-fallback" | "failed";
  nexconnMessageId?: string;
  warning?: string;
  error?: string;
}

/**
 * Attempts real-time delivery via Nexconn DirectChannel for an already-persisted
 * TrustBridge message, falling back cleanly to Socket.IO broadcast on failure or
 * ambiguous client errors without creating duplicate SQLite rows.
 */
export async function deliverNexconnOrFallback(params: {
  messageId: string;
  conversationId: string;
  text: string;
  riskLevel?: ChatMessage["riskLevel"];
  targetNexconnUserId: string;
  sendDirectText: (input: {
    targetNexconnUserId: string;
    text: string;
    metadata?: NexconnMessageMetadata;
  }) => Promise<{ isOk: boolean; code: number; messageId?: string }>;
  saveNexconnRef: (messageId: string, nexconnMessageId: string) => Promise<void>;
  triggerSocketFallback: (messageId: string) => Promise<unknown>;
}): Promise<NexconnDeliveryResult> {
  let failureReason: string;

  try {
    const nexconnSend = await params.sendDirectText({
      targetNexconnUserId: params.targetNexconnUserId,
      text: params.text,
      metadata: {
        trustBridgeMessageId: params.messageId,
        trustBridgeConversationId: params.conversationId,
        riskLevel: params.riskLevel,
      },
    });

    if (nexconnSend.isOk && nexconnSend.messageId) {
      try {
        await params.saveNexconnRef(params.messageId, nexconnSend.messageId);
      } catch {
        // Message was delivered via Nexconn and persisted in SQLite; non-fatal if ref patch fails
      }
      return {
        transport: "nexconn",
        nexconnMessageId: nexconnSend.messageId,
      };
    }

    failureReason = `Nexconn delivery failed (code ${nexconnSend.code})`;
  } catch (err) {
    failureReason =
      err instanceof Error ? err.message : "Nexconn delivery threw an error";
  }

  try {
    await params.triggerSocketFallback(params.messageId);
    return {
      transport: "socket-fallback",
      warning: `${failureReason}; delivered via Socket.IO fallback.`,
    };
  } catch (fallbackErr) {
    const fallbackReason =
      fallbackErr instanceof Error
        ? fallbackErr.message
        : "Socket.IO fallback failed";
    return {
      transport: "failed",
      error: `Message saved to TrustBridge audit log, but real-time delivery failed (${failureReason}; ${fallbackReason}).`,
    };
  }
}

export interface NexconnDeletionOutcome {
  ok: boolean;
  transport: "nexconn" | "socket";
  warning?: string;
  error?: string;
}

/**
 * Coordinates Nexconn remote recall and TrustBridge soft-deletion:
 * Only suppresses Socket.IO `message:deleted` when a valid `nexconnMessageId`
 * exists AND Nexconn remote recall succeeds.
 */
export async function deleteMessageWithNexconnFallback(params: {
  messageId: string;
  nexconnMessageId?: string | null;
  messageCreatedAt?: string;
  nexconnConnected: boolean;
  participantNexconnUserId?: string;
  deleteNexconnMessage: (
    targetNexconnUserId: string,
    nexconnMessageId: string,
    messageCreatedAt?: string
  ) => Promise<{ isOk: boolean; error?: string }>;
  removeAuditMessage: (
    messageId: string,
    deliveryTransport: "nexconn" | "socket"
  ) => Promise<void>;
}): Promise<NexconnDeletionOutcome> {
  const canRecallViaNexconn =
    params.nexconnConnected &&
    Boolean(params.participantNexconnUserId) &&
    Boolean(params.nexconnMessageId);

  let nexconnRecalled = false;
  let recallWarning: string | undefined;

  if (
    canRecallViaNexconn &&
    params.participantNexconnUserId &&
    params.nexconnMessageId
  ) {
    try {
      const delRes = await params.deleteNexconnMessage(
        params.participantNexconnUserId,
        params.nexconnMessageId,
        params.messageCreatedAt
      );
      if (delRes.isOk) {
        nexconnRecalled = true;
      } else {
        recallWarning =
          delRes.error ||
          "Remote Nexconn recall failed; Socket.IO deletion fallback used.";
      }
    } catch (err) {
      recallWarning =
        err instanceof Error
          ? `${err.message}; Socket.IO deletion fallback used.`
          : "Remote Nexconn recall failed; Socket.IO deletion fallback used.";
    }
  }

  const transport: "nexconn" | "socket" = nexconnRecalled ? "nexconn" : "socket";

  try {
    await params.removeAuditMessage(params.messageId, transport);
    return {
      ok: true,
      transport,
      ...(recallWarning ? { warning: recallWarning } : {}),
    };
  } catch (err) {
    return {
      ok: false,
      transport,
      error: err instanceof Error ? err.message : "Failed to remove message.",
    };
  }
}
