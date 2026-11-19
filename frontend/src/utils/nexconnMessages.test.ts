import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { ChatMessage, ConversationSummary } from "../../../shared/types";
import {
  findAuthorizedConversationForNexconnChannel,
  mergeChatMessage,
  parseNexconnExtra,
  reconcileConversationMessages,
  serializeNexconnExtra,
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
});
