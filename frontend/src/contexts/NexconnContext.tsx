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
import { ApiHttpError, getNexconnChatToken } from "../services/api";
import {
  ConnectionStatus,
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

export type NexconnConnectionState =
  | "idle"
  | "unconfigured"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "error";

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
  reconnect: () => Promise<void>;
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
    nexconnMessageId: string
  ) => Promise<boolean>;
  subscribeMessages: (listener: MessageListener) => () => void;
  subscribeDeletes: (listener: DeleteListener) => () => void;
  subscribeReadReceipts: (listener: ReadReceiptListener) => () => void;
  subscribeOfflineSync: (listener: OfflineSyncListener) => () => void;
}

const NexconnContext = createContext<NexconnContextValue | null>(null);

export function NexconnProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const [status, setStatus] = useState<NexconnConnectionState>("idle");
  const [configured, setConfigured] = useState(true);
  const [nexconnUserId, setNexconnUserId] = useState("");
  const [areaCode, setAreaCode] = useState<NexconnAreaCodeString>("SG");
  const [error, setError] = useState("");

  const messageListenersRef = useRef<Set<MessageListener>>(new Set());
  const deleteListenersRef = useRef<Set<DeleteListener>>(new Set());
  const receiptListenersRef = useRef<Set<ReadReceiptListener>>(new Set());
  const syncListenersRef = useRef<Set<OfflineSyncListener>>(new Set());
  const activeUserIdRef = useRef<string | null>(null);

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

  const connectCurrentUser = useCallback(async () => {
    if (!user) return;
    setStatus("connecting");
    setError("");

    try {
      const tokenPayload = await getNexconnChatToken();
      if (activeUserIdRef.current !== user.id) return;

      setConfigured(true);
      setNexconnUserId(tokenPayload.nexconnUserId);
      setAreaCode(tokenPayload.areaCode);

      // 1. Initialize NCEngine exactly once
      initializeNexconnOnce(tokenPayload.appKey, tokenPayload.areaCode);

      // 2. Register connection-status and message handlers BEFORE connecting
      registerNexconnHandlers({
        onConnectionStatusChanged(connStatus, code) {
          if (activeUserIdRef.current !== user.id) return;
          if (connStatus === ConnectionStatus.CONNECTED) {
            setStatus("connected");
            setError("");
          } else if (
            connStatus === ConnectionStatus.CONNECTING ||
            connStatus === ConnectionStatus.SUSPENDED
          ) {
            setStatus("reconnecting");
          } else if (connStatus === ConnectionStatus.DISCONNECTED) {
            if (code === 6 || code === 31023) {
              setStatus("disconnected");
              setError("Messaging session moved to another active client.");
            } else if (
              code === 9 ||
              code === 20 ||
              code === 31004 ||
              code === 31030
            ) {
              setStatus("error");
              setError(
                `Real-time chat authentication failed (code ${String(code)}).`
              );
            } else {
              setStatus("disconnected");
            }
          }
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

      // 3. Connect using the backend-issued token
      const connRes = await connectNexconnWithToken(tokenPayload.token);
      if (activeUserIdRef.current !== user.id) return;

      if (connRes.isOk) {
        setStatus("connected");
        setError("");
      } else {
        setStatus("error");
        setError(`Nexconn connection failed (code ${connRes.code}).`);
      }
    } catch (err) {
      if (activeUserIdRef.current !== user.id) return;

      if (
        err instanceof ApiHttpError &&
        (err.status === 503 || err.code === "NEXCONN_NOT_CONFIGURED")
      ) {
        setConfigured(false);
        setStatus("unconfigured");
        setError("");
        return;
      }

      setStatus("error");
      setError(
        err instanceof Error
          ? err.message
          : "Unable to connect to real-time messaging."
      );
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      activeUserIdRef.current = null;
      unregisterNexconnHandlers();
      let active = true;
      void disconnectNexconnCleanly().finally(() => {
        if (!active) return;
        setStatus("idle");
        setNexconnUserId("");
        setError("");
      });
      return () => {
        active = false;
      };
    }

    const prevUserId = activeUserIdRef.current;
    activeUserIdRef.current = user.id;

    let cancelled = false;
    void (async () => {
      if (prevUserId && prevUserId !== user.id) {
        await disconnectNexconnCleanly();
      }
      if (!cancelled) {
        await connectCurrentUser();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, connectCurrentUser]);

  const value: NexconnContextValue = {
    status,
    connected: status === "connected",
    configured,
    nexconnUserId,
    areaCode,
    error,
    reconnect: connectCurrentUser,
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
