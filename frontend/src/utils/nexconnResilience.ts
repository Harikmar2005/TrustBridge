export type NexconnAreaCodeString = "SG" | "NA" | "SA" | "BJ" | "OM";

export type NexconnConnectionState =
  | "idle"
  | "unconfigured"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "error";

export type NexconnDisplayStatus =
  | "Connected"
  | "Connecting"
  | "Reconnecting"
  | "Disconnected";

export interface NexconnChatStatusResponse {
  configured: boolean;
  areaCode: NexconnAreaCodeString;
  nexconnUserId: string;
}

export interface NexconnChatTokenResponse {
  token: string;
  nexconnUserId: string;
  appKey: string;
  areaCode: NexconnAreaCodeString;
}

export interface NexconnReconnectOutcome {
  ok: boolean;
  message: string;
}

export interface NexconnReconnectNotice {
  type: "success" | "error";
  text: string;
}

export interface NexconnManagerState {
  status: NexconnConnectionState;
  configured: boolean;
  nexconnUserId: string;
  areaCode: NexconnAreaCodeString;
  error: string;
  reconnectAttempt: number;
  maxReconnectAttempts: number;
  manualReconnecting: boolean;
  reconnectNotice: NexconnReconnectNotice | null;
}

// SDK ConnectionStatus numeric values from @nexconn/chat (RCConnectionStatus)
export const NEXCONN_SDK_STATUS = {
  CONNECTED: 0,
  CONNECTING: 1,
  DISCONNECTED: 2,
  SUSPENDED: 3,
} as const;

export const DEFAULT_MAX_RECONNECT_ATTEMPTS = 5;
export const DEFAULT_MAX_TOKEN_REFRESH_ATTEMPTS = 2;
export const DEFAULT_BACKOFF_BASE_MS = 1000;
export const DEFAULT_BACKOFF_MAX_MS = 30_000;
export const TOKEN_REFRESH_DELAY_MS = 250;

// Exact Nexconn / @nexconn/engine ErrorCode values
const TOKEN_REFRESHABLE_CODES = new Set<number>([
  9,
  20,
  31004, // RC_CONN_TOKEN_INCORRECT
  31020, // RC_CONN_TOKEN_EXPIRED
  31027, // RC_OTP_USED
]);

const KICKED_SESSION_CODES = new Set<number>([
  6,
  31010, // RC_DISCONN_KICK
  31023, // RC_DISCONN_SAME_CLIENT_ON_LINE
]);

const PERMANENT_AUTH_CODES = new Set<number>([
  31005, // RC_CONN_NOT_AUTHRORIZED
  31007, // RC_CONN_PACKAGE_NAME_INVALID
  31008, // RC_CONN_APP_BLOCKED_OR_DELETED
  31009, // RC_CONN_USER_BLOCKED
  31012, // CONNECTION_ENCRYPT_AUTHORIZED_ERROR
  31024, // RC_LISCENSE_COUNT_OUT_OF_LIMIT
  31025, // RC_CONN_WRONG_CLUSTER
  31026, // RC_APP_AUTH_NOT_PASS
  31029, // RC_ACCOUNT_CANCELLATION
  31030, // RC_LICENSE_EXPIRED
]);

export function isTokenRefreshableErrorCode(code?: number): boolean {
  return typeof code === "number" && TOKEN_REFRESHABLE_CODES.has(code);
}

export function isKickedSessionErrorCode(code?: number): boolean {
  return typeof code === "number" && KICKED_SESSION_CODES.has(code);
}

export function isPermanentAuthErrorCode(code?: number): boolean {
  return typeof code === "number" && PERMANENT_AUTH_CODES.has(code);
}

export function toNexconnDisplayStatus(
  status: NexconnConnectionState
): NexconnDisplayStatus | null {
  switch (status) {
    case "connected":
      return "Connected";
    case "connecting":
      return "Connecting";
    case "reconnecting":
      return "Reconnecting";
    case "disconnected":
    case "error":
      return "Disconnected";
    case "idle":
    case "unconfigured":
    default:
      return null;
  }
}

export function computeReconnectDelayMs(
  attempt: number,
  options?: { baseMs?: number; maxMs?: number; jitterMs?: number }
): number {
  const baseMs = Math.max(100, options?.baseMs ?? DEFAULT_BACKOFF_BASE_MS);
  const maxMs = Math.max(baseMs, options?.maxMs ?? DEFAULT_BACKOFF_MAX_MS);
  const safeAttempt = Math.max(1, Math.floor(attempt));
  const exponential = Math.min(maxMs, baseMs * Math.pow(2, safeAttempt - 1));
  const jitter = Math.max(0, options?.jitterMs ?? 0);
  return Math.min(maxMs, exponential + jitter);
}

export function sanitizeNexconnErrorMessage(
  rawMessage: unknown,
  fallback = "Unable to connect to real-time messaging."
): string {
  if (typeof rawMessage !== "string") {
    return fallback;
  }
  let cleaned = rawMessage.trim();
  if (!cleaned) {
    return fallback;
  }
  // Redact any accidental credential/token substrings
  cleaned = cleaned.replace(
    /\b(app[_-]?secret|token|bearer|authorization)\s*[:=]\s*[^\s,;]+/gi,
    "$1=[REDACTED]"
  );
  // Redact JWT-like three-part tokens
  cleaned = cleaned.replace(
    /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,
    "[REDACTED_TOKEN]"
  );
  // Redact long opaque credential strings (32+ hex/base64url/alnum chars without spaces)
  cleaned = cleaned.replace(/\b[A-Za-z0-9+/_=-]{40,}\b/g, "[REDACTED]");
  return cleaned;
}

export interface DisconnectClassification {
  action:
    | "refresh-token"
    | "reconnect"
    | "stop-kicked"
    | "stop-permanent"
    | "stop-exhausted";
  status: NexconnConnectionState;
  message: string;
}

export function classifyNexconnDisconnect(params: {
  code?: number;
  tokenRefreshAttempts: number;
  maxTokenRefreshAttempts?: number;
  reconnectAttempts: number;
  maxReconnectAttempts?: number;
}): DisconnectClassification {
  const maxTokenRefreshAttempts =
    params.maxTokenRefreshAttempts ?? DEFAULT_MAX_TOKEN_REFRESH_ATTEMPTS;
  const maxReconnectAttempts =
    params.maxReconnectAttempts ?? DEFAULT_MAX_RECONNECT_ATTEMPTS;
  const { code } = params;

  if (code === 6 || code === 31023) {
    return {
      action: "stop-kicked",
      status: "disconnected",
      message:
        "Messaging session moved to another active client. Click Reconnect to resume here.",
    };
  }

  if (code === 31010) {
    return {
      action: "stop-kicked",
      status: "disconnected",
      message:
        "Real-time chat session was disconnected by server. Click Reconnect to try again.",
    };
  }

  if (isPermanentAuthErrorCode(code)) {
    return {
      action: "stop-permanent",
      status: "error",
      message: `Real-time chat authentication failed (code ${String(code)}).`,
    };
  }

  if (isTokenRefreshableErrorCode(code)) {
    if (params.tokenRefreshAttempts < maxTokenRefreshAttempts) {
      return {
        action: "refresh-token",
        status: "reconnecting",
        message: "Real-time chat token expired. Refreshing session...",
      };
    }
    return {
      action: "stop-permanent",
      status: "error",
      message: `Real-time chat authentication could not be refreshed (code ${String(code)}). Click Reconnect to try again.`,
    };
  }

  if (params.reconnectAttempts < maxReconnectAttempts) {
    return {
      action: "reconnect",
      status: "reconnecting",
      message:
        typeof code === "number"
          ? `Real-time connection interrupted (code ${code}). Reconnecting...`
          : "Real-time connection interrupted. Reconnecting...",
    };
  }

  return {
    action: "stop-exhausted",
    status: "disconnected",
    message:
      "Real-time messaging is disconnected. Standard fallback delivery remains active; click Reconnect to retry.",
  };
}

export interface NexconnSdkCallbacks {
  onConnectionStatusChanged: (status: number, code?: number) => void;
}

export interface NexconnConnectionManagerDeps {
  getChatStatus: () => Promise<NexconnChatStatusResponse>;
  getChatToken: () => Promise<NexconnChatTokenResponse>;
  initializeSdk: (appKey: string, areaCode: NexconnAreaCodeString) => void;
  registerConnectionHandler: (callbacks: NexconnSdkCallbacks) => void;
  unregisterHandlers: () => void;
  connectWithToken: (
    token: string
  ) => Promise<{ isOk: boolean; code: number; userId?: string }>;
  disconnectCleanly: () => Promise<void>;
  isBrowserOnline?: () => boolean;
  scheduleTimer?: (fn: () => void, delayMs: number) => unknown;
  clearTimer?: (handle: unknown) => void;
  maxReconnectAttempts?: number;
  maxTokenRefreshAttempts?: number;
  backoffBaseMs?: number;
  backoffMaxMs?: number;
  tokenRefreshDelayMs?: number;
  onStateChange: (state: NexconnManagerState) => void;
}

function isPermanentHttpFailure(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const maybeHttp = err as { status?: unknown; code?: unknown };
  if (maybeHttp.status === 401 || maybeHttp.status === 403) return true;
  if (
    maybeHttp.status === 503 ||
    maybeHttp.code === "NEXCONN_NOT_CONFIGURED"
  ) {
    return true;
  }
  return false;
}

function isUnconfiguredError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const maybeHttp = err as { status?: unknown; code?: unknown };
  return (
    maybeHttp.status === 503 || maybeHttp.code === "NEXCONN_NOT_CONFIGURED"
  );
}

export function createNexconnConnectionManager(
  deps: NexconnConnectionManagerDeps
) {
  const maxReconnectAttempts =
    deps.maxReconnectAttempts ?? DEFAULT_MAX_RECONNECT_ATTEMPTS;
  const maxTokenRefreshAttempts =
    deps.maxTokenRefreshAttempts ?? DEFAULT_MAX_TOKEN_REFRESH_ATTEMPTS;
  const backoffBaseMs = deps.backoffBaseMs ?? DEFAULT_BACKOFF_BASE_MS;
  const backoffMaxMs = deps.backoffMaxMs ?? DEFAULT_BACKOFF_MAX_MS;
  const tokenRefreshDelayMs =
    deps.tokenRefreshDelayMs ?? TOKEN_REFRESH_DELAY_MS;
  const isBrowserOnline = deps.isBrowserOnline ?? (() => true);
  const scheduleTimer =
    deps.scheduleTimer ?? ((fn, ms) => setTimeout(fn, ms));
  const clearTimer =
    deps.clearTimer ??
    ((handle) => clearTimeout(handle as ReturnType<typeof setTimeout>));

  let state: NexconnManagerState = {
    status: "idle",
    configured: true,
    nexconnUserId: "",
    areaCode: "SG",
    error: "",
    reconnectAttempt: 0,
    maxReconnectAttempts,
    manualReconnecting: false,
    reconnectNotice: null,
  };

  let activeUserId: string | null = null;
  let sessionGeneration = 0;
  let retryTimerHandle: unknown = null;
  let connectInFlight: Promise<NexconnReconnectOutcome> | null = null;
  let reconnectAttempts = 0;
  let tokenRefreshAttempts = 0;
  let suppressDisconnectHandling = false;
  let waitingForBrowserOnline = false;

  const emitState = (patch: Partial<NexconnManagerState>) => {
    state = { ...state, ...patch };
    deps.onStateChange(state);
  };

  const cancelRetryTimer = () => {
    if (retryTimerHandle !== null) {
      clearTimer(retryTimerHandle);
      retryTimerHandle = null;
    }
  };

  const isGenerationCurrent = (gen: number, userId: string): boolean =>
    gen === sessionGeneration && activeUserId === userId;

  const scheduleReconnectRetry = (params: {
    gen: number;
    userId: string;
    delayMs: number;
    reasonMessage: string;
  }) => {
    cancelRetryTimer();
    if (!isGenerationCurrent(params.gen, params.userId)) return;

    if (!isBrowserOnline()) {
      waitingForBrowserOnline = true;
      emitState({
        status: "disconnected",
        error:
          "Network offline. Real-time messaging will reconnect automatically when back online.",
      });
      return;
    }

    waitingForBrowserOnline = false;
    emitState({
      status: "reconnecting",
      reconnectAttempt: reconnectAttempts,
      error: params.reasonMessage,
    });

    retryTimerHandle = scheduleTimer(() => {
      retryTimerHandle = null;
      if (!isGenerationCurrent(params.gen, params.userId)) return;
      void runConnectAttempt({
        userId: params.userId,
        gen: params.gen,
        isRetry: true,
        forceDisconnectFirst: true,
      });
    }, params.delayMs);
  };

  const handleFailureClassification = (params: {
    gen: number;
    userId: string;
    code?: number;
  }): NexconnReconnectOutcome => {
    const decision = classifyNexconnDisconnect({
      code: params.code,
      tokenRefreshAttempts,
      maxTokenRefreshAttempts,
      reconnectAttempts,
      maxReconnectAttempts,
    });

    if (decision.action === "refresh-token") {
      tokenRefreshAttempts += 1;
      scheduleReconnectRetry({
        gen: params.gen,
        userId: params.userId,
        delayMs: tokenRefreshDelayMs,
        reasonMessage: decision.message,
      });
      return { ok: false, message: decision.message };
    }

    if (decision.action === "reconnect") {
      reconnectAttempts += 1;
      const delayMs = computeReconnectDelayMs(reconnectAttempts, {
        baseMs: backoffBaseMs,
        maxMs: backoffMaxMs,
      });
      scheduleReconnectRetry({
        gen: params.gen,
        userId: params.userId,
        delayMs,
        reasonMessage: decision.message,
      });
      return { ok: false, message: decision.message };
    }

    // Stop retrying: kicked, permanent auth error, or retries exhausted
    cancelRetryTimer();
    emitState({
      status: decision.status,
      reconnectAttempt: reconnectAttempts,
      error: decision.message,
    });
    return { ok: false, message: decision.message };
  };

  const runConnectAttempt = async (params: {
    userId: string;
    gen: number;
    isRetry: boolean;
    forceDisconnectFirst: boolean;
  }): Promise<NexconnReconnectOutcome> => {
    if (!isGenerationCurrent(params.gen, params.userId)) {
      return { ok: false, message: "Session changed before reconnect." };
    }

    if (connectInFlight) {
      return connectInFlight;
    }

    const attemptPromise = (async (): Promise<NexconnReconnectOutcome> => {
      emitState({
        status: params.isRetry ? "reconnecting" : "connecting",
        ...(params.isRetry ? {} : { error: "" }),
      });

      try {
        const chatStatus = await deps.getChatStatus();
        if (!isGenerationCurrent(params.gen, params.userId)) {
          return { ok: false, message: "Session ended during connection." };
        }

        emitState({
          nexconnUserId: chatStatus.nexconnUserId,
          areaCode: chatStatus.areaCode,
        });

        if (!chatStatus.configured) {
          cancelRetryTimer();
          emitState({
            configured: false,
            status: "unconfigured",
            error: "",
            reconnectAttempt: 0,
          });
          return {
            ok: false,
            message: "Real-time chat provider is not configured.",
          };
        }

        const tokenPayload = await deps.getChatToken();
        if (!isGenerationCurrent(params.gen, params.userId)) {
          return { ok: false, message: "Session ended while fetching token." };
        }

        emitState({
          configured: true,
          nexconnUserId: tokenPayload.nexconnUserId,
          areaCode: tokenPayload.areaCode,
        });

        deps.initializeSdk(tokenPayload.appKey, tokenPayload.areaCode);
        deps.registerConnectionHandler({
          onConnectionStatusChanged(sdkStatus, code) {
            handleSdkConnectionStatusChanged(sdkStatus, code, params.gen, params.userId);
          },
        });

        if (params.forceDisconnectFirst) {
          suppressDisconnectHandling = true;
          try {
            await deps.disconnectCleanly();
          } finally {
            suppressDisconnectHandling = false;
          }
          if (!isGenerationCurrent(params.gen, params.userId)) {
            return { ok: false, message: "Session ended before connecting." };
          }
        }

        const connRes = await deps.connectWithToken(tokenPayload.token);
        if (!isGenerationCurrent(params.gen, params.userId)) {
          return { ok: false, message: "Session ended during connection." };
        }

        if (connRes.isOk) {
          cancelRetryTimer();
          reconnectAttempts = 0;
          tokenRefreshAttempts = 0;
          waitingForBrowserOnline = false;
          emitState({
            status: "connected",
            error: "",
            reconnectAttempt: 0,
          });
          return { ok: true, message: "Reconnected to real-time messaging." };
        }

        return handleFailureClassification({
          gen: params.gen,
          userId: params.userId,
          code: connRes.code,
        });
      } catch (err) {
        if (!isGenerationCurrent(params.gen, params.userId)) {
          return { ok: false, message: "Session ended during connection." };
        }

        if (isUnconfiguredError(err)) {
          cancelRetryTimer();
          emitState({
            configured: false,
            status: "unconfigured",
            error: "",
            reconnectAttempt: 0,
          });
          return {
            ok: false,
            message: "Real-time chat provider is not configured.",
          };
        }

        const safeMessage = sanitizeNexconnErrorMessage(
          err instanceof Error ? err.message : err
        );

        if (isPermanentHttpFailure(err)) {
          cancelRetryTimer();
          emitState({
            status: "error",
            error: safeMessage,
          });
          return { ok: false, message: safeMessage };
        }

        if (reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts += 1;
          const delayMs = computeReconnectDelayMs(reconnectAttempts, {
            baseMs: backoffBaseMs,
            maxMs: backoffMaxMs,
          });
          scheduleReconnectRetry({
            gen: params.gen,
            userId: params.userId,
            delayMs,
            reasonMessage: `${safeMessage} Reconnecting...`,
          });
          return { ok: false, message: safeMessage };
        }

        cancelRetryTimer();
        emitState({
          status: "disconnected",
          reconnectAttempt: reconnectAttempts,
          error: safeMessage,
        });
        return { ok: false, message: safeMessage };
      }
    })();

    connectInFlight = attemptPromise;
    try {
      return await attemptPromise;
    } finally {
      if (connectInFlight === attemptPromise) {
        connectInFlight = null;
      }
    }
  };

  const handleSdkConnectionStatusChanged = (
    sdkStatus: number,
    code: number | undefined,
    expectedGen = sessionGeneration,
    expectedUserId = activeUserId
  ) => {
    if (
      !expectedUserId ||
      !isGenerationCurrent(expectedGen, expectedUserId)
    ) {
      return;
    }

    if (sdkStatus === NEXCONN_SDK_STATUS.CONNECTED) {
      cancelRetryTimer();
      reconnectAttempts = 0;
      tokenRefreshAttempts = 0;
      waitingForBrowserOnline = false;
      emitState({
        status: "connected",
        error: "",
        reconnectAttempt: 0,
      });
      return;
    }

    if (
      sdkStatus === NEXCONN_SDK_STATUS.CONNECTING ||
      sdkStatus === NEXCONN_SDK_STATUS.SUSPENDED
    ) {
      if (state.status !== "connecting") {
        emitState({
          status: "reconnecting",
          error:
            sdkStatus === NEXCONN_SDK_STATUS.SUSPENDED
              ? "Connection paused. Reconnecting..."
              : state.error,
        });
      }
      return;
    }

    if (sdkStatus === NEXCONN_SDK_STATUS.DISCONNECTED) {
      if (suppressDisconnectHandling) {
        return;
      }
      // If a connect attempt is already in flight, let it classify/handle the result once
      if (connectInFlight !== null) {
        return;
      }
      handleFailureClassification({
        gen: expectedGen,
        userId: expectedUserId,
        code,
      });
    }
  };

  return {
    getState(): NexconnManagerState {
      return state;
    },

    async startSession(userId: string): Promise<NexconnReconnectOutcome> {
      const prevUserId = activeUserId;
      sessionGeneration += 1;
      const gen = sessionGeneration;
      activeUserId = userId;
      cancelRetryTimer();
      reconnectAttempts = 0;
      tokenRefreshAttempts = 0;
      waitingForBrowserOnline = false;
      connectInFlight = null;

      emitState({
        reconnectAttempt: 0,
        manualReconnecting: false,
        reconnectNotice: null,
        error: "",
      });

      if (prevUserId && prevUserId !== userId) {
        suppressDisconnectHandling = true;
        try {
          await deps.disconnectCleanly();
        } finally {
          suppressDisconnectHandling = false;
        }
        if (!isGenerationCurrent(gen, userId)) {
          return { ok: false, message: "Session cancelled." };
        }
      }

      return runConnectAttempt({
        userId,
        gen,
        isRetry: false,
        forceDisconnectFirst: false,
      });
    },

    async stopSession(): Promise<void> {
      sessionGeneration += 1;
      activeUserId = null;
      cancelRetryTimer();
      reconnectAttempts = 0;
      tokenRefreshAttempts = 0;
      waitingForBrowserOnline = false;
      connectInFlight = null;
      deps.unregisterHandlers();

      suppressDisconnectHandling = true;
      try {
        await deps.disconnectCleanly();
      } finally {
        suppressDisconnectHandling = false;
      }

      emitState({
        status: "idle",
        nexconnUserId: "",
        error: "",
        reconnectAttempt: 0,
        manualReconnecting: false,
        reconnectNotice: null,
      });
    },

    async manualReconnect(): Promise<NexconnReconnectOutcome> {
      const userId = activeUserId;
      const gen = sessionGeneration;
      if (!userId) {
        return {
          ok: false,
          message: "Please sign in to reconnect real-time messaging.",
        };
      }

      cancelRetryTimer();
      reconnectAttempts = 0;
      tokenRefreshAttempts = 0;
      waitingForBrowserOnline = false;
      emitState({
        manualReconnecting: true,
        reconnectAttempt: 0,
        reconnectNotice: null,
      });

      try {
        const outcome = await runConnectAttempt({
          userId,
          gen,
          isRetry: true,
          forceDisconnectFirst: true,
        });

        if (!isGenerationCurrent(gen, userId)) {
          return { ok: false, message: "Session changed during reconnect." };
        }

        if (outcome.ok) {
          emitState({
            manualReconnecting: false,
            reconnectNotice: {
              type: "success",
              text: outcome.message,
            },
          });
        } else {
          const failureText = `Reconnect failed: ${outcome.message}`;
          emitState({
            manualReconnecting: false,
            reconnectNotice: {
              type: "error",
              text: failureText,
            },
          });
          return { ok: false, message: failureText };
        }
        return outcome;
      } finally {
        if (isGenerationCurrent(gen, userId) && state.manualReconnecting) {
          emitState({ manualReconnecting: false });
        }
      }
    },

    clearReconnectNotice(): void {
      if (state.reconnectNotice) {
        emitState({ reconnectNotice: null });
      }
    },

    handleSdkConnectionStatusChanged(sdkStatus: number, code?: number): void {
      handleSdkConnectionStatusChanged(sdkStatus, code);
    },

    handleBrowserOffline(): void {
      if (!activeUserId || !state.configured || state.status === "idle") {
        return;
      }
      cancelRetryTimer();
      waitingForBrowserOnline = true;
      emitState({
        status: "disconnected",
        error:
          "Network offline. Real-time messaging will reconnect automatically when back online.",
      });
    },

    handleBrowserOnline(): void {
      const userId = activeUserId;
      const gen = sessionGeneration;
      if (!userId || !state.configured) return;
      if (state.status === "connected") {
        waitingForBrowserOnline = false;
        return;
      }
      if (
        waitingForBrowserOnline ||
        state.status === "disconnected" ||
        state.status === "reconnecting"
      ) {
        waitingForBrowserOnline = false;
        reconnectAttempts = 0;
        void runConnectAttempt({
          userId,
          gen,
          isRetry: true,
          forceDisconnectFirst: true,
        });
      }
    },
  };
}
