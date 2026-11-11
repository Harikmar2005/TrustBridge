/**
 * Official Nexconn Chat SDK Client Wrapper
 *
 * Implements genuine initialization, token-based authentication,
 * DirectChannel (1-to-1) and GroupChannel (Dispute Room) routing,
 * read receipts, reconnection handling, and real error reporting.
 */
import {
  NCEngine,
  DirectChannel,
  GroupChannel,
  SendTextMessageParams,
  MessageHandler,
  ConnectionStatusHandler,
  LogLevel,
  AreaCode,
  ChannelType,
} from '@nexconn/chat';

export type NexconnConnectionState =
  | 'INITIAL'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'DISCONNECTED'
  | 'RECONNECTING'
  | 'CREDENTIALS_REQUIRED'
  | 'ERROR';

export interface NexconnStatusDetail {
  state: NexconnConnectionState;
  statusText: string;
  userId?: string;
  errorCode?: number | string;
  isConfigured: boolean;
}

export interface ChatMessagePayload {
  channelId: string;
  channelType: 'direct' | 'group';
  messageId: string;
  content: string;
  senderId: string;
  timestamp: number;
}

type MessageListener = (payload: ChatMessagePayload) => void;
type StatusListener = (status: NexconnStatusDetail) => void;
type ReceiptListener = (receiptEvent: any) => void;

class NexconnChatService {
  private static instance: NexconnChatService;
  private initialized = false;
  private connectionState: NexconnConnectionState = 'INITIAL';
  private currentUserId = '';
  private currentToken = '';
  private appKey = '';
  private isConfigured = false;
  private statusText = 'Not initialized';
  private lastErrorCode: number | string | undefined;

  private messageListeners: Set<MessageListener> = new Set();
  private statusListeners: Set<StatusListener> = new Set();
  private receiptListeners: Set<ReceiptListener> = new Set();
  private directChannels: Map<string, DirectChannel> = new Map();
  private groupChannels: Map<string, GroupChannel> = new Map();

  // Deduplication cache for incoming messages
  private processedMessageIds: Set<string> = new Set();
  private processedMessageQueue: string[] = [];

  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectTimeout: any = null;

  private constructor() {
    this.ensureInitialized();
  }

  public static getInstance(): NexconnChatService {
    if (!NexconnChatService.instance) {
      NexconnChatService.instance = new NexconnChatService();
    }
    return NexconnChatService.instance;
  }

  public ensureInitialized(explicitKey?: string): boolean {
    if (this.initialized) {
      return true;
    }
    return this.initialize(explicitKey);
  }

  public initialize(appKey?: string): boolean {
    if (this.initialized) {
      return true;
    }

    if (typeof window === 'undefined') {
      return false;
    }

    const resolvedKey = (
      appKey ||
      (typeof import.meta !== 'undefined' && import.meta.env?.VITE_NEXCONN_APP_KEY) ||
      ''
    ).trim();

    if (
      !resolvedKey ||
      resolvedKey === 'your_actual_app_key' ||
      resolvedKey === 'trustbridge-nexconn-demo-key' ||
      resolvedKey === '<Your-App-Key>'
    ) {
      this.isConfigured = false;
      this.updateState(
        'CREDENTIALS_REQUIRED',
        'Nexconn App Key required. Configure VITE_NEXCONN_APP_KEY in your frontend/.env file.'
      );
      return false;
    }

    try {
      this.appKey = resolvedKey;

      NCEngine.initialize({
        appKey: this.appKey,
        areaCode: AreaCode.SG,
        logLevel: LogLevel.WARN,
      });

      try {
        const handleStatus = (event: any) => {
          const status = event?.status;
          if (status === 0) {
            this.reconnectAttempts = 0;
            this.updateState('CONNECTED', 'Connected to Nexconn Cloud Edge');
          } else if (status === 1) {
            this.updateState('RECONNECTING', 'Connecting to Nexconn...');
          } else if (status === 3) {
            this.updateState('RECONNECTING', 'Connection suspended. Reconnecting automatically...');
          } else {
            this.updateState('DISCONNECTED', `Nexconn disconnected (status: ${status})`, status);
            this.attemptReconnect();
          }
        };

        NCEngine.addConnectionStatusHandler(
          'tb-conn-status-handler',
          new ConnectionStatusHandler({
            onConnectionStatusChanged: handleStatus,
          })
        );
      } catch (handlerErr) {
        console.warn('[Nexconn SDK] Warning attaching connection status handler:', handlerErr);
      }

      try {
        NCEngine.addMessageHandler(
          'tb-msg-handler',
          new MessageHandler({
            onMessageReceived: ({ messages }: { messages: any[] }) => {
              if (messages && messages.length > 0) {
                messages.forEach((msg: any) => {
                  const msgId = msg.messageId || msg.messageUId;
                  if (msgId && this.processedMessageIds.has(msgId)) {
                    return;
                  }
                  if (msgId) {
                    this.trackProcessedMessageId(msgId);
                  }

                  const channelId =
                    msg.channelIdentifier?.channelId || msg.targetId || msg.channelId || 'unknown';
                  const isGroup =
                    msg.channelIdentifier?.channelType === ChannelType.GROUP ||
                    msg.conversationType === 3;

                  this.notifyMessageListeners({
                    channelId,
                    channelType: isGroup ? 'group' : 'direct',
                    messageId: msgId || `nc_${Date.now()}`,
                    content: msg.content?.text || '',
                    senderId: msg.senderUserId || '',
                    timestamp: msg.sentTime || Date.now(),
                  });
                });
              }
            },
            onMessageReceiptResponse: (event: any) => {
              this.notifyReceiptListeners(event);
            },
          })
        );
      } catch (msgHandlerErr) {
        console.warn('[Nexconn SDK] Warning attaching message handler:', msgHandlerErr);
      }

      this.initialized = true;
      this.isConfigured = true;
      this.updateState('INITIAL', 'Nexconn SDK initialized successfully');
      return true;
    } catch (err: any) {
      this.initialized = false;
      this.isConfigured = false;
      this.updateState('ERROR', `SDK Init Failed: ${err?.message || err}`);
      return false;
    }
  }

  public async connect(userId: string, token: string, appKey?: string): Promise<{ success: boolean; error?: string }> {
    if (!token || !userId) {
      this.updateState('CREDENTIALS_REQUIRED', 'Nexconn token required for authentication.');
      return { success: false, error: 'Token and User ID required' };
    }

    this.currentUserId = userId;
    this.currentToken = token;

    if (!this.initialized) {
      const initOk = this.ensureInitialized(appKey);
      if (!initOk) {
        return { success: false, error: 'Nexconn SDK initialization failed: Valid App Key required.' };
      }
    }

    this.updateState('CONNECTING', 'Connecting to Nexconn Cloud Edge...');

    try {
      const res = await NCEngine.connect({ token });

      if (res && res.isOk) {
        this.reconnectAttempts = 0;
        this.updateState('CONNECTED', `Connected as ${userId}`);
        return { success: true };
      } else {
        const errCode = res?.code ?? 'UNKNOWN';
        this.updateState('ERROR', `Connection failed (code: ${errCode})`, errCode);
        return { success: false, error: `Nexconn server returned code: ${errCode}` };
      }
    } catch (err: any) {
      this.updateState('ERROR', `Connection error: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts || !this.currentToken) {
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);

    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = setTimeout(async () => {
      if (this.connectionState !== 'CONNECTED' && this.currentToken) {
        this.updateState('RECONNECTING', `Reconnecting (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
        await this.connect(this.currentUserId, this.currentToken);
      }
    }, delay);
  }

  public getDirectChannel(targetUserId: string): DirectChannel {
    if (!this.initialized) {
      this.ensureInitialized();
    }
    if (!this.directChannels.has(targetUserId)) {
      const channel = new DirectChannel(targetUserId);
      this.directChannels.set(targetUserId, channel);
    }
    return this.directChannels.get(targetUserId)!;
  }

  public getGroupChannel(groupId: string): GroupChannel {
    if (!this.initialized) {
      this.ensureInitialized();
    }
    if (!this.groupChannels.has(groupId)) {
      const channel = new GroupChannel(groupId);
      this.groupChannels.set(groupId, channel);
    }
    return this.groupChannels.get(groupId)!;
  }

  public async createOrJoinGroup(
    groupId: string,
    groupName: string,
    inviteeUserIds: string[] = []
  ): Promise<{ success: boolean; isNew?: boolean; error?: string }> {
    if (!this.initialized || this.connectionState !== 'CONNECTED') {
      return { success: false, error: 'Nexconn SDK is not connected' };
    }

    try {
      const channel = this.getGroupChannel(groupId);
      const joinRes = await channel.join();
      if (joinRes && joinRes.isOk) {
        return { success: true, isNew: false };
      }

      const createRes = await GroupChannel.createGroup({
        groupId,
        groupName,
        inviteeUserIds,
      });

      if (createRes && createRes.isOk) {
        return { success: true, isNew: true };
      }

      return {
        success: false,
        error: `Group create/join returned code: ${createRes?.code || joinRes?.code || 'UNKNOWN'}`,
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Group channel error: ${err.message}`,
      };
    }
  }

  public async sendTextMessage(
    channelType: 'direct' | 'group',
    targetId: string,
    text: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.initialized) {
      return {
        success: false,
        error: `Cannot send message: Nexconn SDK is not initialized`,
      };
    }
    if (this.connectionState !== 'CONNECTED') {
      return {
        success: false,
        error: `Cannot send message: Nexconn SDK is ${this.connectionState} (${this.statusText})`,
      };
    }

    try {
      const params = new SendTextMessageParams({ text });
      let result: any;

      if (channelType === 'direct') {
        const directChan = this.getDirectChannel(targetId);
        result = await directChan.sendMessage(params);
      } else {
        const groupChan = this.getGroupChannel(targetId);
        result = await groupChan.sendMessage(params);
      }

      if (result && result.isOk) {
        const messageId = result.data?.messageId || result.data?.messageUId || `nc_${Date.now()}`;
        return {
          success: true,
          messageId,
        };
      } else {
        const code = result?.code || 'UNKNOWN';
        return {
          success: false,
          error: `Nexconn delivery failed with code: ${code}`,
        };
      }
    } catch (err: any) {
      return {
        success: false,
        error: `Nexconn send exception: ${err.message}`,
      };
    }
  }

  public async sendReadReceipt(
    channelType: 'direct' | 'group',
    targetId: string,
    messageIds: string | string[]
  ): Promise<boolean> {
    if (!this.initialized || this.connectionState !== 'CONNECTED') return false;
    try {
      const ids = Array.isArray(messageIds) ? messageIds : [messageIds];
      if (channelType === 'direct') {
        const chan = this.getDirectChannel(targetId);
        const res = await chan.sendReadReceiptResponse(ids);
        return res?.isOk ?? false;
      } else {
        const chan = this.getGroupChannel(targetId);
        const res = await chan.sendReadReceiptResponse(ids);
        return res?.isOk ?? false;
      }
    } catch (e) {
      console.warn('[Nexconn SDK] Read receipt error:', e);
      return false;
    }
  }

  public async sendTyping(targetUserId: string): Promise<void> {
    if (!this.initialized || this.connectionState !== 'CONNECTED') return;
    try {
      const direct = this.getDirectChannel(targetUserId);
      await direct.sendTypingStatus('RC:TxtMsg');
    } catch (e) {
      // Non-critical
    }
  }

  public async disconnect(): Promise<void> {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.initialized && this.connectionState === 'CONNECTED') {
      try {
        await NCEngine.disconnect();
      } catch (e) {
        console.warn('[Nexconn SDK] Disconnect exception:', e);
      }
    }

    this.connectionState = 'DISCONNECTED';
    this.currentUserId = '';
    this.currentToken = '';
    this.updateState('DISCONNECTED', 'Session logged out from Nexconn');
  }

  public subscribeMessages(listener: MessageListener): () => void {
    this.messageListeners.add(listener);
    return () => this.messageListeners.delete(listener);
  }

  public subscribeReceipts(listener: ReceiptListener): () => void {
    this.receiptListeners.add(listener);
    return () => this.receiptListeners.delete(listener);
  }

  public subscribeStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.getStatusDetail());
    return () => this.statusListeners.delete(listener);
  }

  private notifyMessageListeners(payload: ChatMessagePayload) {
    this.messageListeners.forEach((fn) => fn(payload));
  }

  private notifyReceiptListeners(receipt: any) {
    this.receiptListeners.forEach((fn) => fn(receipt));
  }

  private trackProcessedMessageId(id: string) {
    this.processedMessageIds.add(id);
    this.processedMessageQueue.push(id);
    if (this.processedMessageQueue.length > 1000) {
      const old = this.processedMessageQueue.shift();
      if (old) this.processedMessageIds.delete(old);
    }
  }

  private updateState(state: NexconnConnectionState, text: string, code?: number | string) {
    this.connectionState = state;
    this.statusText = text;
    this.lastErrorCode = code;
    const detail = this.getStatusDetail();
    this.statusListeners.forEach((fn) => fn(detail));
  }

  public getStatusDetail(): NexconnStatusDetail {
    return {
      state: this.connectionState,
      statusText: this.statusText,
      userId: this.currentUserId,
      errorCode: this.lastErrorCode,
      isConfigured: this.isConfigured,
    };
  }

  public isConnected(): boolean {
    return this.connectionState === 'CONNECTED';
  }

  public isInitialized(): boolean {
    return this.initialized;
  }

  public getAppKey(): string {
    return this.appKey;
  }

  public getUserId(): string {
    return this.currentUserId;
  }
}

export const nexconnService = NexconnChatService.getInstance();
