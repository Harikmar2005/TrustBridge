import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { ChatMessage, ConversationSummary } from "../../../shared/types";
import {
  deleteMessageWithNexconnFallback,
  deliverNexconnOrFallback,
  filterUnsentReceiptIds,
  findAuthorizedConversationForNexconnChannel,
  mergeChatMessage,
  parseNexconnExtra,
  reconcileConversationMessages,
  serializeNexconnExtra,
  shouldInitializeNexconnSdk,
} from "./nexconnMessages";

const sampleConv: ConversationSummary = {
  id: "conv-1",
  buyerId: "buyer-1",
  sellerId: "seller-1",
  status: "active",
  reportedFlag: 0,
  createdAt: "2026-11-19T10:00:00.000Z",
  updatedAt: "2026-11-19T10:00:00.000Z",
  participantId: "seller-1",
  participantNexconnUserId: "tb11111111111111111111111111111111",
  participantName: "Elena Vance",
  participantRole: "seller",
  lastMessage: null,
  lastMessageAt: null,
  unreadCount: 0,
};

describe("Nexconn Frontend Message Helpers", () => {
  it("serializes and parses TrustBridge metadata in Nexconn extra payload safely", () => {
    const serialized = serializeNexconnExtra({
      trustBridgeMessageId: "msg-123",
      trustBridgeConversationId: "conv-1",
      riskLevel: "HIGH",
    });
    assert.deepEqual(parseNexconnExtra(serialized), {
      trustBridgeMessageId: "msg-123",
      trustBridgeConversationId: "conv-1",
      riskLevel: "HIGH",
    });
    assert.deepEqual(parseNexconnExtra("not-json"), {});
    assert.deepEqual(parseNexconnExtra(undefined), {});
  });

  it("authorizes incoming Nexconn DirectChannel only when matched to a TrustBridge conversation", () => {
    assert.equal(
      findAuthorizedConversationForNexconnChannel(
        [sampleConv],
        "tb11111111111111111111111111111111"
      )?.id,
      "conv-1"
    );
    assert.equal(
      findAuthorizedConversationForNexconnChannel(
        [sampleConv],
        "tb99999999999999999999999999999999"
      ),
      null
    );
  });

  it("deduplicates messages by id or nexconnMessageId without creating duplicates", () => {
    const initial: ChatMessage[] = [
      {
        id: "tb-msg-1",
        conversationId: "conv-1",
        senderId: "buyer-1",
        senderName: "Alice Buyer",
        content: "Hello seller",
        riskLevel: "NONE",
        nexconnMessageId: "nc-100",
        isDeleted: false,
        readByOther: false,
        createdAt: "2026-11-19T10:01:00.000Z",
      },
    ];

    // Duplicate arrival from Nexconn with same nexconnMessageId
    const afterDupNexconn = mergeChatMessage(initial, {
      id: "tb-msg-1",
      conversationId: "conv-1",
      senderId: "buyer-1",
      senderName: "Alice Buyer",
      content: "Hello seller",
      riskLevel: "NONE",
      nexconnMessageId: "nc-100",
      isDeleted: false,
      readByOther: true,
      createdAt: "2026-11-19T10:01:00.000Z",
    });
    assert.equal(afterDupNexconn.length, 1);
    assert.equal(afterDupNexconn[0].readByOther, true);

    // Reconcile server history + live list yields zero duplicates
    const reconciled = reconcileConversationMessages(
      initial,
      afterDupNexconn,
      "conv-1"
    );
    assert.equal(reconciled.length, 1);
  });

  it("validates both appKey and areaCode before reinitializing NCEngine", () => {
    assert.equal(
      shouldInitializeNexconnSdk({
        currentAppKey: null,
        currentAreaCode: null,
        nextAppKey: "key-1",
        nextAreaCode: "SG",
      }),
      true
    );
    assert.equal(
      shouldInitializeNexconnSdk({
        currentAppKey: "key-1",
        currentAreaCode: "SG",
        nextAppKey: "key-1",
        nextAreaCode: "SG",
      }),
      false
    );
    assert.equal(
      shouldInitializeNexconnSdk({
        currentAppKey: "key-1",
        currentAreaCode: "SG",
        nextAppKey: "key-1",
        nextAreaCode: "NA",
      }),
      true
    );
    assert.equal(
      shouldInitializeNexconnSdk({
        currentAppKey: "key-1",
        currentAreaCode: "SG",
        nextAppKey: "key-2",
        nextAreaCode: "SG",
      }),
      true
    );
  });

  it("filters out already-acknowledged and duplicate receipt IDs", () => {
    const sent = new Set(["nc-1", "nc-2"]);
    assert.deepEqual(
      filterUnsentReceiptIds(["nc-1", "nc-3", "", null, "nc-3", "nc-2", "nc-4"], sent),
      ["nc-3", "nc-4"]
    );
  });

  it("falls back to Socket.IO when sendDirectText fails or throws and deduplicates ambiguous delivery", async () => {
    // 1. Happy path via Nexconn
    let fallbackCalls = 0;
    let savedRef = "";
    const okRes = await deliverNexconnOrFallback({
      messageId: "tb-1",
      conversationId: "conv-1",
      text: "Hi",
      riskLevel: "NONE",
      targetNexconnUserId: "tb-peer",
      sendDirectText: async () => ({ isOk: true, code: 0, messageId: "nc-1" }),
      saveNexconnRef: async (_id, ref) => {
        savedRef = ref;
      },
      triggerSocketFallback: async () => {
        fallbackCalls++;
      },
    });
    assert.equal(okRes.transport, "nexconn");
    assert.equal(okRes.nexconnMessageId, "nc-1");
    assert.equal(savedRef, "nc-1");
    assert.equal(fallbackCalls, 0);

    // 2. Failure response triggers Socket.IO fallback
    let fallbackMessageId = "";
    const failRes = await deliverNexconnOrFallback({
      messageId: "tb-2",
      conversationId: "conv-1",
      text: "Fallback test",
      riskLevel: "NONE",
      targetNexconnUserId: "tb-peer",
      sendDirectText: async () => ({ isOk: false, code: 30001 }),
      saveNexconnRef: async () => {},
      triggerSocketFallback: async (id) => {
        fallbackMessageId = id;
      },
    });
    assert.equal(failRes.transport, "socket-fallback");
    assert.equal(fallbackMessageId, "tb-2");

    // 3. Ambiguous timeout/exception triggers Socket.IO fallback and deduplicates against Nexconn copy
    const receiverLog: ChatMessage[] = [];
    const ambiguousRes = await deliverNexconnOrFallback({
      messageId: "tb-3",
      conversationId: "conv-1",
      text: "Ambiguous",
      riskLevel: "NONE",
      targetNexconnUserId: "tb-peer",
      sendDirectText: async () => {
        // Simulate Nexconn actually delivering to receiver before client timed out
        const extra = parseNexconnExtra(
          serializeNexconnExtra({
            trustBridgeMessageId: "tb-3",
            trustBridgeConversationId: "conv-1",
            riskLevel: "NONE",
          })
        );
        receiverLog.splice(
          0,
          receiverLog.length,
          ...mergeChatMessage(receiverLog, {
            id: extra.trustBridgeMessageId || "nc-3",
            conversationId: "conv-1",
            senderId: "buyer-1",
            senderName: "Alice",
            content: "Ambiguous",
            riskLevel: "NONE",
            nexconnMessageId: "nc-3",
            isDeleted: false,
            readByOther: false,
            createdAt: "2026-11-20T12:00:00.000Z",
          })
        );
        throw new Error("Ack timeout");
      },
      saveNexconnRef: async () => {},
      triggerSocketFallback: async (id) => {
        // Socket.IO fallback arrives with the same TrustBridge message ID
        receiverLog.splice(
          0,
          receiverLog.length,
          ...mergeChatMessage(receiverLog, {
            id,
            conversationId: "conv-1",
            senderId: "buyer-1",
            senderName: "Alice",
            content: "Ambiguous",
            riskLevel: "NONE",
            nexconnMessageId: null,
            isDeleted: false,
            readByOther: false,
            createdAt: "2026-11-20T12:00:00.000Z",
          })
        );
      },
    });
    assert.equal(ambiguousRes.transport, "socket-fallback");
    assert.equal(receiverLog.length, 1);
    assert.equal(receiverLog[0].id, "tb-3");
    assert.equal(receiverLog[0].nexconnMessageId, "nc-3");

    // 4. Both Nexconn and fallback fail -> honest failed outcome
    const bothFail = await deliverNexconnOrFallback({
      messageId: "tb-4",
      conversationId: "conv-1",
      text: "Offline",
      targetNexconnUserId: "tb-peer",
      sendDirectText: async () => ({ isOk: false, code: 500 }),
      saveNexconnRef: async () => {},
      triggerSocketFallback: async () => {
        throw new Error("Network down");
      },
    });
    assert.equal(bothFail.transport, "failed");
    assert.match(bothFail.error || "", /real-time delivery failed/i);
  });

  it("suppresses Socket.IO deletion only when Nexconn recall succeeds and reports failures", async () => {
    const transports: string[] = [];

    // 1. Valid ID + Nexconn recall succeeds -> suppresses Socket.IO
    const okDel = await deleteMessageWithNexconnFallback({
      messageId: "tb-1",
      nexconnMessageId: "nc-1",
      nexconnConnected: true,
      participantNexconnUserId: "tb-peer",
      deleteNexconnMessage: async () => ({ isOk: true }),
      removeAuditMessage: async (_id, t) => {
        transports.push(t);
      },
    });
    assert.equal(okDel.ok, true);
    assert.equal(okDel.transport, "nexconn");
    assert.equal(okDel.warning, undefined);

    // 2. Valid ID + Nexconn recall fails -> keeps Socket.IO deletion and reports warning
    const failedRecallDel = await deleteMessageWithNexconnFallback({
      messageId: "tb-2",
      nexconnMessageId: "nc-2",
      nexconnConnected: true,
      participantNexconnUserId: "tb-peer",
      deleteNexconnMessage: async () => ({
        isOk: false,
        error: "Message not found in history",
      }),
      removeAuditMessage: async (_id, t) => {
        transports.push(t);
      },
    });
    assert.equal(failedRecallDel.ok, true);
    assert.equal(failedRecallDel.transport, "socket");
    assert.match(failedRecallDel.warning || "", /not found/i);

    // 3. Missing Nexconn ID -> does not suppress Socket.IO
    const legacyDel = await deleteMessageWithNexconnFallback({
      messageId: "tb-3",
      nexconnMessageId: null,
      nexconnConnected: true,
      participantNexconnUserId: "tb-peer",
      deleteNexconnMessage: async () => {
        throw new Error("Should not be called without nexconnMessageId");
      },
      removeAuditMessage: async (_id, t) => {
        transports.push(t);
      },
    });
    assert.equal(legacyDel.ok, true);
    assert.equal(legacyDel.transport, "socket");

    // 4. Audit delete fails -> returns ok: false
    const auditFail = await deleteMessageWithNexconnFallback({
      messageId: "tb-4",
      nexconnMessageId: "nc-4",
      nexconnConnected: true,
      participantNexconnUserId: "tb-peer",
      deleteNexconnMessage: async () => ({ isOk: true }),
      removeAuditMessage: async () => {
        throw new Error("Server error");
      },
    });
    assert.equal(auditFail.ok, false);
    assert.equal(auditFail.error, "Server error");

    assert.deepEqual(transports, ["nexconn", "socket", "socket"]);
  });
});
