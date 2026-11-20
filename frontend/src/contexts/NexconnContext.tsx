import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  Message,
  MessageDeletedInfo,
  MessageReadReceiptResponse,
} from "@nexconn/chat";
import { useAuth } from "./AuthContext";
import { getNexconnChatStatus, getNexconnChatToken } from "../services/api";
import {
  connectNexconnWithToken,
  deleteDirectMessageForAllViaNexconn,
  disconnectNexconnCleanly,
  initializeNexconnOnce,
  registerNexconnHandlers,
  sendDirectReadReceiptViaNexconn,
  sendDirectTextViaNexconn,
  unregisterNexconnHandlers,
  type NexconnAreaCodeString,
} from "../services/nexconnService";
import type { NexconnMessageMetadata } from "../utils/nexconnMessages";
import {
  createNexconnConnectionManager,
  DEFAULT_MAX_RECONNECT_ATTEMPTS,
  type NexconnConnectionState,
  type NexconnManagerState,
  type NexconnReconnectNotice,
  type NexconnReconnectOutcome,
} from "../utils/nexconnResilience";

export type { NexconnConnectionState, NexconnReconnectNotice, NexconnReconnectOutcome };

type MessageListener = (messages: Array<Message<Record<string, unknown>>>) => void;
type DeleteListener = (deleted: MessageDeletedInfo[]) => void;
type ReadReceiptListener = (responses: MessageReadReceiptResponse[]) => void;
type OfflineSyncListener = () => void;

interface NexconnContextValue {
  status: NexconnConnectionState;
  connected: boolean;
  configured: boolean;
  nexconnUserId: string;
  areaCode: NexconnAreaCodeString;
  error: string;
  reconnectAttempt: number;
  maxReconnectAttempts: number;
  manualReconnecting: boolean;
  reconnectNotice: NexconnReconnectNotice | null;
  reconnect: () => Promise<NexconnReconnectOutcome>;
  clearReconnectNotice: () => void;
  sendDirectText: (params: {
    targetNexconnUserId: string;
    text: string;
    metadata?: NexconnMessageMetadata;
  }) => Promise<{
    isOk: boolean;
    code: number;
    messageId?: string;
    sentTime?: number;
  }>;
  sendReadReceipt: (
    targetNexconnUserId: string,
    nexconnMessageIds: string[]
  ) => Promise<boolean>;
  deleteMessageForAll: (
    targetNexconnUserId: string,
    nexconnMessageId: string,
    messageCreatedAt?: string
  ) => Promise<{ isOk: boolean; error?: string }>;
  subscribeMessages: (listener: MessageListener) => () => void;
  subscribeDeletes: (listener: DeleteListener) => () => void;
  subscribeReadReceipts: (listener: ReadReceiptListener) => () => void;
  subscribeOfflineSync: (listener: OfflineSyncListener) => () => void;
}

const INITIAL_MANAGER_STATE: NexconnManagerState = {
  status: "idle",
  configured: true,
  nexconnUserId: "",
  areaCode: "SG",
  error: "",
  reconnectAttempt: 0,
  maxReconnectAttempts: DEFAULT_MAX_RECONNECT_ATTEMPTS,
  manualReconnecting: false,
  reconnectNotice: null,
};

const NexconnContext = createContext<NexconnContextValue | null>(null);

export function NexconnProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const [managerState, setManagerState] = useState<NexconnManagerState>(
    INITIAL_MANAGER_STATE
  );

  const messageListenersRef = useRef<Set<MessageListener>>(new Set());
  const deleteListenersRef = useRef<Set<DeleteListener>>(new Set());
  const receiptListenersRef = useRef<Set<ReadReceiptListener>>(new Set());
  const syncListenersRef = useRef<Set<OfflineSyncListener>>(new Set());
  const managerRef = useRef<ReturnType<typeof createNexconnConnectionManager> | null>(
    null
  );

  const subscribeMessages = useCallback((listener: MessageListener) => {
    messageListenersRef.current.add(listener);
    return () => {
      messageListenersRef.current.delete(listener);
    };
  }, []);

  const subscribeDeletes = useCallback((listener: DeleteListener) => {
    deleteListenersRef.current.add(listener);
    return () => {
      deleteListenersRef.current.delete(listener);
    };
  }, []);

  const subscribeReadReceipts = useCallback((listener: ReadReceiptListener) => {
    receiptListenersRef.current.add(listener);
    return () => {
      receiptListenersRef.current.delete(listener);
    };
  }, []);

  const subscribeOfflineSync = useCallback((listener: OfflineSyncListener) => {
    syncListenersRef.current.add(listener);
    return () => {
      syncListenersRef.current.delete(listener);
    };
  }, []);

  const getOrCreateManager = useCallback(() => {
    if (!managerRef.current) {
      managerRef.current = createNexconnConnectionManager({
        getChatStatus: getNexconnChatStatus,
        getChatToken: getNexconnChatToken,
        initializeSdk: initializeNexconnOnce,
        registerConnectionHandler: (callbacks) => {
          registerNexconnHandlers({
            onConnectionStatusChanged(sdkStatus, code) {
              callbacks.onConnectionStatusChanged(sdkStatus, code);
            },
            onMessagesReceived(messages) {
              messageListenersRef.current.forEach((fn) => fn(messages));
            },
            onMessagesDeleted(deleted) {
              deleteListenersRef.current.forEach((fn) => fn(deleted));
            },
            onReadReceiptsReceived(responses) {
              receiptListenersRef.current.forEach((fn) => fn(responses));
            },
            onOfflineSyncCompleted() {
              syncListenersRef.current.forEach((fn) => fn());
            },
          });
        },
        unregisterHandlers: unregisterNexconnHandlers,
        connectWithToken: connectNexconnWithToken,
        disconnectCleanly: disconnectNexconnCleanly,
        isBrowserOnline: () =>
          typeof navigator === "undefined" ? true : navigator.onLine,
        onStateChange: (nextState) => {
          setManagerState(nextState);
        },
      });
    }
    return managerRef.current;
  }, []);

  // Sync authenticated user session lifecycle with the resilient connection manager
  const currentUserId = user?.id ?? null;
  useEffect(() => {
    const manager = getOrCreateManager();
    if (!currentUserId) {
      void manager.stopSession();
      return;
    }

    void manager.startSession(currentUserId);

    return () => {
      void manager.stopSession();
    };
  }, [currentUserId, getOrCreateManager]);

  // Listen to browser online/offline transitions cleanly
  useEffect(() => {
    if (typeof window === "undefined") return;
    const manager = getOrCreateManager();

    const onOffline = () => manager.handleBrowserOffline();
    const onOnline = () => manager.handleBrowserOnline();

    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, [getOrCreateManager]);

  // Auto-dismiss transient manual reconnect success notice after 5s
  useEffect(() => {
    if (managerState.reconnectNotice?.type !== "success") return;
    const manager = getOrCreateManager();
    const timer = window.setTimeout(() => {
      manager.clearReconnectNotice();
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [managerState.reconnectNotice, getOrCreateManager]);

  const reconnect = useCallback(
    () => getOrCreateManager().manualReconnect(),
    [getOrCreateManager]
  );

  const clearReconnectNotice = useCallback(
    () => getOrCreateManager().clearReconnectNotice(),
    [getOrCreateManager]
  );

  const value: NexconnContextValue = {
    status: managerState.status,
    connected: managerState.status === "connected",
    configured: managerState.configured,
    nexconnUserId: managerState.nexconnUserId,
    areaCode: managerState.areaCode,
    error: managerState.error,
    reconnectAttempt: managerState.reconnectAttempt,
    maxReconnectAttempts: managerState.maxReconnectAttempts,
    manualReconnecting: managerState.manualReconnecting,
    reconnectNotice: managerState.reconnectNotice,
    reconnect,
    clearReconnectNotice,
    sendDirectText: sendDirectTextViaNexconn,
    sendReadReceipt: sendDirectReadReceiptViaNexconn,
    deleteMessageForAll: deleteDirectMessageForAllViaNexconn,
    subscribeMessages,
    subscribeDeletes,
    subscribeReadReceipts,
    subscribeOfflineSync,
  };

  return (
    <NexconnContext.Provider value={value}>{children}</NexconnContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useNexconn(): NexconnContextValue {
  const ctx = useContext(NexconnContext);
  if (!ctx) {
    throw new Error("useNexconn must be used inside NexconnProvider");
  }
  return ctx;
}
