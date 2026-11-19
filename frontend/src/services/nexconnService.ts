import {
  AreaCode,
  BaseChannel,
  ChannelType,
  ConnectionStatus,
  ConnectionStatusHandler,
  DirectChannel,
  LogLevel,
  MessageHandler,
  MessageType,
  NCEngine,
  SendTextMessageParams,
  type Message,
  type MessageDeletedInfo,
  type MessageReadReceiptResponse,
  type TextMessageContent,
} from "@nexconn/chat";
import {
  serializeNexconnExtra,
  type NexconnMessageMetadata,
} from "../utils/nexconnMessages";

export type NexconnAreaCodeString = "SG" | "NA" | "SA" | "BJ" | "OM";

export interface NexconnTokenPayload {
  token: string;
  nexconnUserId: string;
  appKey: string;
  areaCode: NexconnAreaCodeString;
}

export interface NexconnServiceHandlers {
  onConnectionStatusChanged: (status: number, code?: number) => void;
  onMessagesReceived: (messages: Array<Message<Record<string, unknown>>>) => void;
  onMessagesDeleted: (deleted: MessageDeletedInfo[]) => void;
  onReadReceiptsReceived: (responses: MessageReadReceiptResponse[]) => void;
  onOfflineSyncCompleted: () => void;
}

const CONNECTION_HANDLER_ID = "trustbridge-conn-handler";
const MESSAGE_HANDLER_ID = "trustbridge-msg-handler";

let initializedAppKey: string | null = null;
let initializedAreaCode: NexconnAreaCodeString | null = null;
let handlersRegistered = false;
let connectInFlight: Promise<{ isOk: boolean; code: number; userId?: string }> | null =
  null;

function mapAreaCode(code: NexconnAreaCodeString): AreaCode {
  switch (code) {
    case "NA":
      return AreaCode.NA;
    case "SA":
      return AreaCode.SA;
    case "BJ":
      return AreaCode.BJ;
    case "OM":
      return AreaCode.OM;
    case "SG":
    default:
      return AreaCode.SG;
  }
}

export function initializeNexconnOnce(
  appKey: string,
  areaCode: NexconnAreaCodeString = "SG"
): void {
  if (!appKey) {
    throw new Error("Nexconn App Key is required for initialization.");
  }

  if (initializedAppKey !== null) {
    return;
  }

  NCEngine.initialize({
    appKey,
    areaCode: mapAreaCode(areaCode),
    logLevel: LogLevel.WARN,
  });

  initializedAppKey = appKey;
  initializedAreaCode = areaCode;
}

export function registerNexconnHandlers(
  handlers: NexconnServiceHandlers
): void {
  if (handlersRegistered) {
    NCEngine.removeConnectionStatusHandler(CONNECTION_HANDLER_ID);
    NCEngine.removeMessageHandler(MESSAGE_HANDLER_ID);
  }

  NCEngine.addConnectionStatusHandler(
    CONNECTION_HANDLER_ID,
    new ConnectionStatusHandler({
      onConnectionStatusChanged({ status, code }) {
        handlers.onConnectionStatusChanged(status, code);
      },
    })
  );

  NCEngine.addMessageHandler(
    MESSAGE_HANDLER_ID,
    new MessageHandler({
      onMessageReceived({ messages }) {
        handlers.onMessagesReceived(messages);
      },
      onMessageDeleted({ messages }) {
        handlers.onMessagesDeleted(messages);
      },
      onMessageReceiptResponse({ responses }) {
        handlers.onReadReceiptsReceived(responses);
      },
      onOfflineMessageSyncCompleted() {
        handlers.onOfflineSyncCompleted();
      },
    })
  );

  handlersRegistered = true;
}

export function unregisterNexconnHandlers(): void {
  if (!handlersRegistered) return;
  NCEngine.removeConnectionStatusHandler(CONNECTION_HANDLER_ID);
  NCEngine.removeMessageHandler(MESSAGE_HANDLER_ID);
  handlersRegistered = false;
}

export async function connectNexconnWithToken(
  token: string
): Promise<{ isOk: boolean; code: number; userId?: string }> {
  if (connectInFlight) {
    return connectInFlight;
  }

  const currentStatus = NCEngine.getConnectionStatus();
  if (currentStatus === ConnectionStatus.CONNECTED) {
    return {
      isOk: true,
      code: 0,
      userId: NCEngine.getCurrentUserId() || undefined,
    };
  }

  connectInFlight = (async () => {
    try {
      const result = await NCEngine.connect({ token });
      return {
        isOk: Boolean(result.isOk),
        code: result.code,
        userId: result.data?.userId,
      };
    } finally {
      connectInFlight = null;
    }
  })();

  return connectInFlight;
}

export async function disconnectNexconnCleanly(): Promise<void> {
  if (!initializedAppKey) return;
  try {
    await NCEngine.disconnect(false);
  } catch {
    // Ignore disconnect errors if already disconnected
  }
}

export function getNexconnCurrentUserId(): string {
  if (!initializedAppKey) return "";
  return NCEngine.getCurrentUserId() || "";
}

export function getNexconnInitializedInfo(): {
  initialized: boolean;
  areaCode: NexconnAreaCodeString | null;
} {
  return {
    initialized: initializedAppKey !== null,
    areaCode: initializedAreaCode,
  };
}

export async function sendDirectTextViaNexconn(params: {
  targetNexconnUserId: string;
  text: string;
  metadata?: NexconnMessageMetadata;
}): Promise<{
  isOk: boolean;
  code: number;
  messageId?: string;
  sentTime?: number;
}> {
  const channel = new DirectChannel(params.targetNexconnUserId);
  const messageParams = new SendTextMessageParams({
    text: params.text,
    ...(params.metadata
      ? { extra: serializeNexconnExtra(params.metadata) }
      : {}),
  });

  const res = await channel.sendMessage(messageParams);
  if (res.isOk && res.data) {
    return {
      isOk: true,
      code: res.code,
      messageId: res.data.messageId,
      sentTime: res.data.sentTime,
    };
  }

  return {
    isOk: false,
    code: res.code,
  };
}

export async function sendDirectReadReceiptViaNexconn(
  targetNexconnUserId: string,
  nexconnMessageIds: string[]
): Promise<boolean> {
  const ids = nexconnMessageIds.filter(Boolean);
  if (!targetNexconnUserId || ids.length === 0) return false;
  try {
    const channel = new DirectChannel(targetNexconnUserId);
    const res = await channel.sendReadReceiptResponse(ids);
    return Boolean(res.isOk);
  } catch {
    return false;
  }
}

export async function deleteDirectMessageForAllViaNexconn(
  targetNexconnUserId: string,
  nexconnMessageId: string
): Promise<boolean> {
  if (!targetNexconnUserId || !nexconnMessageId) return false;
  try {
    const channel = new DirectChannel(targetNexconnUserId);
    const query = BaseChannel.createMessagesQuery({
      channelIdentifier: channel.identifier,
      startTime: Date.now() + 60_000,
      pageSize: 50,
      isAscending: false,
    });
    const historyRes = await query.loadNextPage();
    if (!historyRes.isOk || !historyRes.data?.data) return false;

    const target = historyRes.data.data.find(
      (m) => m.messageId === nexconnMessageId
    );
    if (!target) return false;

    const delRes = await channel.deleteMessageForAll(target);
    return Boolean(delRes.isOk);
  } catch {
    return false;
  }
}

export async function fetchDirectHistoryViaNexconn(
  targetNexconnUserId: string,
  pageSize = 30
): Promise<Array<Message<TextMessageContent>>> {
  const channel = new DirectChannel(targetNexconnUserId);
  const query = BaseChannel.createMessagesQuery({
    channelIdentifier: channel.identifier,
    startTime: Date.now() + 60_000,
    pageSize,
    isAscending: false,
  });
  const res = await query.loadNextPage();
  if (!res.isOk || !res.data?.data) return [];
  return res.data.data.filter(
    (m): m is Message<TextMessageContent> =>
      m.messageType === MessageType.TEXT &&
      m.channelIdentifier.channelType === ChannelType.DIRECT
  );
}

export { ChannelType, ConnectionStatus, MessageType };
