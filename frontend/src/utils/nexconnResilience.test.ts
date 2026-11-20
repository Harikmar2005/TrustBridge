import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  classifyNexconnDisconnect,
  computeReconnectDelayMs,
  createNexconnConnectionManager,
  NEXCONN_SDK_STATUS,
  sanitizeNexconnErrorMessage,
  toNexconnDisplayStatus,
  type NexconnManagerState,
} from "./nexconnResilience";
import { mergeChatMessage, reconcileConversationMessages } from "./nexconnMessages";
import type { ChatMessage } from "../../../shared/types";

function createFakeTimerHarness() {
  let nextId = 1;
  const timers = new Map<number, { fn: () => void; delayMs: number }>();

  return {
    scheduleTimer(fn: () => void, delayMs: number) {
      const id = nextId++;
      timers.set(id, { fn, delayMs });
      return id;
    },
    clearTimer(handle: unknown) {
      timers.delete(handle as number);
    },
    pendingCount() {
      return timers.size;
    },
    pendingDelays() {
      return Array.from(timers.values()).map((t) => t.delayMs);
    },
    async flushNext(): Promise<boolean> {
      const first = timers.entries().next();
      if (first.done) return false;
      const [id, entry] = first.value;
      timers.delete(id);
      entry.fn();
      await Promise.resolve();
      await Promise.resolve();
      return true;
    },
  };
}

describe("Nexconn Phase 2 Connection Resilience", () => {
  it("computes bounded exponential backoff delays cleanly", () => {
    assert.equal(computeReconnectDelayMs(1, { baseMs: 1000, maxMs: 30000 }), 1000);
    assert.equal(computeReconnectDelayMs(2, { baseMs: 1000, maxMs: 30000 }), 2000);
    assert.equal(computeReconnectDelayMs(3, { baseMs: 1000, maxMs: 30000 }), 4000);
    assert.equal(computeReconnectDelayMs(4, { baseMs: 1000, maxMs: 30000 }), 8000);
    assert.equal(computeReconnectDelayMs(5, { baseMs: 1000, maxMs: 30000 }), 16000);
    assert.equal(computeReconnectDelayMs(6, { baseMs: 1000, maxMs: 15000 }), 15000);
  });

  it("classifies expired tokens, permanent errors, kicked sessions, and transient disconnects accurately", () => {
    assert.equal(
      classifyNexconnDisconnect({
        code: 31020,
        tokenRefreshAttempts: 0,
        reconnectAttempts: 0,
      }).action,
      "refresh-token"
    );

    assert.equal(
      classifyNexconnDisconnect({
        code: 31004,
        tokenRefreshAttempts: 2,
        maxTokenRefreshAttempts: 2,
        reconnectAttempts: 0,
      }).action,
      "stop-permanent"
    );

    assert.equal(
      classifyNexconnDisconnect({
        code: 31009,
        tokenRefreshAttempts: 0,
        reconnectAttempts: 0,
      }).action,
      "stop-permanent"
    );

    assert.equal(
      classifyNexconnDisconnect({
        code: 31023,
        tokenRefreshAttempts: 0,
        reconnectAttempts: 0,
      }).action,
      "stop-kicked"
    );

    assert.equal(
      classifyNexconnDisconnect({
        code: 30011,
        tokenRefreshAttempts: 0,
        reconnectAttempts: 2,
        maxReconnectAttempts: 5,
      }).action,
      "reconnect"
    );

    assert.equal(
      classifyNexconnDisconnect({
        code: 30011,
        tokenRefreshAttempts: 0,
        reconnectAttempts: 5,
        maxReconnectAttempts: 5,
      }).action,
      "stop-exhausted"
    );
  });

  it("sanitizes any accidental secret or token fragments from error messages", () => {
    const sanitized = sanitizeNexconnErrorMessage(
      "Auth failed token=eyJhbGciOiJIUzI1NiJ9.payload123.signature456 appSecret=mysecretvalue123"
    );
    assert.equal(sanitized.includes("mysecretvalue123"), false);
    assert.equal(sanitized.includes("payload123"), false);
    assert.match(sanitized, /\[REDACTED\]/);
  });

  it("automatically detects expired token (31020), fetches fresh token, and reconnects", async () => {
    const timers = createFakeTimerHarness();
    const states: NexconnManagerState[] = [];
    const tokensSeen: string[] = [];
    let tokenCounter = 0;

    const manager = createNexconnConnectionManager({
      getChatStatus: async () => ({
        configured: true,
        areaCode: "SG",
        nexconnUserId: "tb-user-1",
      }),
      getChatToken: async () => {
        tokenCounter += 1;
        return {
          token: `fresh-token-${tokenCounter}`,
          nexconnUserId: "tb-user-1",
          appKey: "app-key-1",
          areaCode: "SG",
        };
      },
      initializeSdk: () => {},
      registerConnectionHandler: () => {},
      unregisterHandlers: () => {},
      connectWithToken: async (token) => {
        tokensSeen.push(token);
        return { isOk: true, code: 0, userId: "tb-user-1" };
      },
      disconnectCleanly: async () => {},
      scheduleTimer: timers.scheduleTimer,
      clearTimer: timers.clearTimer,
      tokenRefreshDelayMs: 50,
      onStateChange: (s) => states.push(s),
    });

    const initial = await manager.startSession("user-1");
    assert.equal(initial.ok, true);
    assert.equal(manager.getState().status, "connected");
    assert.deepEqual(tokensSeen, ["fresh-token-1"]);

    // Simulate runtime disconnect with RC_CONN_TOKEN_EXPIRED (31020)
    manager.handleSdkConnectionStatusChanged(NEXCONN_SDK_STATUS.DISCONNECTED, 31020);
    assert.equal(manager.getState().status, "reconnecting");
    assert.equal(timers.pendingCount(), 1);

    await timers.flushNext();
    // Wait for async getChatStatus -> getChatToken -> connectWithToken chain
    await new Promise((r) => setTimeout(r, 10));

    assert.equal(manager.getState().status, "connected");
    assert.deepEqual(tokensSeen, ["fresh-token-1", "fresh-token-2"]);
    assert.equal(toNexconnDisplayStatus(manager.getState().status), "Connected");
  });

  it("caps consecutive token refresh retries and stops on permanent authentication errors", async () => {
    const timers = createFakeTimerHarness();
    let tokenRequests = 0;

    const manager = createNexconnConnectionManager({
      getChatStatus: async () => ({
        configured: true,
        areaCode: "SG",
        nexconnUserId: "tb-user-1",
      }),
      getChatToken: async () => {
        tokenRequests += 1;
        return {
          token: `bad-token-${tokenRequests}`,
          nexconnUserId: "tb-user-1",
          appKey: "app-key-1",
          areaCode: "SG",
        };
      },
      initializeSdk: () => {},
      registerConnectionHandler: () => {},
      unregisterHandlers: () => {},
      connectWithToken: async () => ({ isOk: false, code: 31004 }),
      disconnectCleanly: async () => {},
      scheduleTimer: timers.scheduleTimer,
      clearTimer: timers.clearTimer,
      maxTokenRefreshAttempts: 2,
      tokenRefreshDelayMs: 10,
      onStateChange: () => {},
    });

    await manager.startSession("user-1");
    assert.equal(manager.getState().status, "reconnecting");
    assert.equal(timers.pendingCount(), 1);

    await timers.flushNext();
    await new Promise((r) => setTimeout(r, 10));
    assert.equal(manager.getState().status, "reconnecting");
    assert.equal(timers.pendingCount(), 1);

    await timers.flushNext();
    await new Promise((r) => setTimeout(r, 10));
    // After 2 refresh retries fail with 31004, it must stop retrying
    assert.equal(manager.getState().status, "error");
    assert.equal(timers.pendingCount(), 0);
    assert.equal(tokenRequests, 3);
  });

  it("enforces bounded exponential backoff and stops retrying when exhausted", async () => {
    const timers = createFakeTimerHarness();
    let connectCalls = 0;

    const manager = createNexconnConnectionManager({
      getChatStatus: async () => ({
        configured: true,
        areaCode: "SG",
        nexconnUserId: "tb-user-1",
      }),
      getChatToken: async () => ({
        token: "valid-token",
        nexconnUserId: "tb-user-1",
        appKey: "app-key-1",
        areaCode: "SG",
      }),
      initializeSdk: () => {},
      registerConnectionHandler: () => {},
      unregisterHandlers: () => {},
      connectWithToken: async () => {
        connectCalls += 1;
        return { isOk: false, code: 30011 };
      },
      disconnectCleanly: async () => {},
      scheduleTimer: timers.scheduleTimer,
      clearTimer: timers.clearTimer,
      maxReconnectAttempts: 3,
      backoffBaseMs: 500,
      backoffMaxMs: 4000,
      onStateChange: () => {},
    });

    await manager.startSession("user-1");
    assert.deepEqual(timers.pendingDelays(), [500]);
    assert.equal(manager.getState().status, "reconnecting");

    await timers.flushNext();
    await new Promise((r) => setTimeout(r, 10));
    assert.deepEqual(timers.pendingDelays(), [1000]);

    await timers.flushNext();
    await new Promise((r) => setTimeout(r, 10));
    assert.deepEqual(timers.pendingDelays(), [2000]);

    await timers.flushNext();
    await new Promise((r) => setTimeout(r, 10));
    assert.equal(timers.pendingCount(), 0);
    assert.equal(connectCalls, 4); // initial + 3 bounded retries
    assert.equal(manager.getState().status, "disconnected");
    assert.equal(toNexconnDisplayStatus(manager.getState().status), "Disconnected");
  });

  it("prevents multiple simultaneous connection attempts and cancels pending retries on logout", async () => {
    const timers = createFakeTimerHarness();
    let activeConnects = 0;
    let totalConnects = 0;
    let resolveConnect!: (res: { isOk: boolean; code: number }) => void;

    const manager = createNexconnConnectionManager({
      getChatStatus: async () => ({
        configured: true,
        areaCode: "SG",
        nexconnUserId: "tb-user-1",
      }),
      getChatToken: async () => ({
        token: "valid-token",
        nexconnUserId: "tb-user-1",
        appKey: "app-key-1",
        areaCode: "SG",
      }),
      initializeSdk: () => {},
      registerConnectionHandler: () => {},
      unregisterHandlers: () => {},
      connectWithToken: async () => {
        activeConnects += 1;
        totalConnects += 1;
        assert.equal(activeConnects, 1, "Must never have >1 simultaneous connect");
        return await new Promise<{ isOk: boolean; code: number }>((res) => {
          resolveConnect = (val) => {
            activeConnects -= 1;
            res(val);
          };
        });
      },
      disconnectCleanly: async () => {},
      scheduleTimer: timers.scheduleTimer,
      clearTimer: timers.clearTimer,
      onStateChange: () => {},
    });

    const p1 = manager.startSession("user-1");
    await new Promise((r) => setTimeout(r, 10));
    // Concurrent manualReconnect while p1 is still in flight must share p1
    const p2 = manager.manualReconnect();
    resolveConnect({ isOk: false, code: 30011 });
    await Promise.all([p1, p2]);

    assert.equal(totalConnects, 1);
    assert.equal(timers.pendingCount(), 1);
    assert.equal(manager.getState().status, "reconnecting");

    // Logout must cancel pending retry timer cleanly and transition to idle
    await manager.stopSession();
    assert.equal(timers.pendingCount(), 0);
    assert.equal(manager.getState().status, "idle");
  });

  it("handles manual reconnect loading, failure feedback, and recovery cleanly", async () => {
    const timers = createFakeTimerHarness();
    let shouldFail = true;
    const loadingObserved: boolean[] = [];

    const manager = createNexconnConnectionManager({
      getChatStatus: async () => ({
        configured: true,
        areaCode: "SG",
        nexconnUserId: "tb-user-1",
      }),
      getChatToken: async () => ({
        token: "valid-token",
        nexconnUserId: "tb-user-1",
        appKey: "app-key-1",
        areaCode: "SG",
      }),
      initializeSdk: () => {},
      registerConnectionHandler: () => {},
      unregisterHandlers: () => {},
      connectWithToken: async () =>
        shouldFail ? { isOk: false, code: 31023 } : { isOk: true, code: 0 },
      disconnectCleanly: async () => {},
      scheduleTimer: timers.scheduleTimer,
      clearTimer: timers.clearTimer,
      onStateChange: (s) => {
        loadingObserved.push(s.manualReconnecting);
      },
    });

    await manager.startSession("user-1");
    assert.equal(manager.getState().status, "disconnected");

    const failOutcome = await manager.manualReconnect();
    assert.equal(failOutcome.ok, false);
    assert.equal(manager.getState().manualReconnecting, false);
    assert.equal(manager.getState().reconnectNotice?.type, "error");
    assert.match(manager.getState().reconnectNotice?.text || "", /Reconnect failed/i);

    shouldFail = false;
    const okOutcome = await manager.manualReconnect();
    assert.equal(okOutcome.ok, true);
    assert.equal(manager.getState().status, "connected");
    assert.equal(manager.getState().reconnectNotice?.type, "success");
    assert.equal(loadingObserved.includes(true), true);
  });

  it("prevents duplicate messages when reconciling Socket.IO fallback messages across reconnect", () => {
    const socketFallbackCopy: ChatMessage = {
      id: "tb-msg-10",
      conversationId: "conv-1",
      senderId: "buyer-1",
      senderName: "Alice",
      content: "Delivered during outage via Socket.IO",
      riskLevel: "NONE",
      nexconnMessageId: null,
      isDeleted: false,
      readByOther: false,
      createdAt: "2026-11-20T12:50:00.000Z",
    };

    const syncedServerCopy: ChatMessage = {
      ...socketFallbackCopy,
      readByOther: true,
    };

    const afterReconnect = reconcileConversationMessages(
      [syncedServerCopy],
      mergeChatMessage([], socketFallbackCopy),
      "conv-1"
    );

    assert.equal(afterReconnect.length, 1);
    assert.equal(afterReconnect[0].id, "tb-msg-10");
    assert.equal(afterReconnect[0].readByOther, true);
  });
});
