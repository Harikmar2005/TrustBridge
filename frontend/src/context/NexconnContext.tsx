import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import {
  nexconnService,
  NexconnStatusDetail,
  NexconnConnectionState,
} from '../lib/nexconnClient';
import { api } from '../lib/api';

export interface NexconnContextType {
  connected: boolean;
  connectionState: NexconnConnectionState;
  statusText: string;
  userId: string | null;
  detail: NexconnStatusDetail;
  isConfigured: boolean;
  connectAutomatically: () => Promise<void>;
  disconnect: () => Promise<void>;
  refreshConnection: () => Promise<void>;
  sendTextMessage: (
    channelType: 'direct' | 'group',
    targetId: string,
    text: string
  ) => Promise<{ success: boolean; messageId?: string; error?: string }>;
  sendReadReceipt: (
    channelType: 'direct' | 'group',
    targetId: string,
    messageIds: string | string[]
  ) => Promise<boolean>;
  createOrJoinGroup: (
    groupId: string,
    groupName: string,
    inviteeUserIds?: string[]
  ) => Promise<{ success: boolean; isNew?: boolean; error?: string }>;
}

const NexconnContext = createContext<NexconnContextType | undefined>(undefined);

export const NexconnProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, authToken } = useAuth();

  const [connected, setConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<NexconnConnectionState>('INITIAL');
  const [statusText, setStatusText] = useState('Initializing automated connection...');
  const [isConfigured, setIsConfigured] = useState(false);
  const [detail, setDetail] = useState<NexconnStatusDetail>({
    state: 'INITIAL',
    statusText: 'Initializing automated connection...',
    isConfigured: false,
  });

  const isConnectingRef = useRef(false);
  const connectedUserRef = useRef<string | null>(null);
  const tokenRefreshTimerRef = useRef<any>(null);

  // Subscribe to low-level SDK client status updates
  useEffect(() => {
    const unsubscribe = nexconnService.subscribeStatus((newDetail) => {
      setConnected(newDetail.state === 'CONNECTED');
      setConnectionState(newDetail.state);
      setStatusText(newDetail.statusText);
      setIsConfigured(newDetail.isConfigured);
      setDetail(newDetail);
      if (newDetail.state === 'CONNECTED') {
        connectedUserRef.current = newDetail.userId || currentUser?.id || null;
      } else if (newDetail.state === 'DISCONNECTED') {
        connectedUserRef.current = null;
      }
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser?.id]);

  /**
   * Automatically requests a token from TrustBridge backend and connects to Nexconn Cloud Edge
   */
  const connectAutomatically = useCallback(async (forceRefresh = false) => {
    if (!authToken || !currentUser?.id) {
      return;
    }

    // Prevent duplicate parallel connection attempts
    if (isConnectingRef.current) {
      return;
    }

    // If already connected for the current user and not forcing refresh, do nothing
    if (!forceRefresh && connectedUserRef.current === currentUser.id && nexconnService.isConnected()) {
      return;
    }

    isConnectingRef.current = true;
    if (tokenRefreshTimerRef.current) {
      clearTimeout(tokenRefreshTimerRef.current);
      tokenRefreshTimerRef.current = null;
    }

    try {
      // 1. Fetch live configuration status
      let configInfo: any = null;
      try {
        configInfo = await api.get('/api/v1/nexconn/status');
      } catch {
        try {
          configInfo = await api.get('/api/nexconn/status');
        } catch {
          configInfo = null;
        }
      }

      // 2. Request authentic Nexconn token from authenticated TrustBridge backend
      let tokenData: any = null;
      try {
        tokenData = await api.post('/api/v1/nexconn/token', {
          userId: currentUser.id,
          name: currentUser.name,
          forceRefresh,
        });
      } catch {
        try {
          tokenData = await api.post('/api/nexconn/token', {
            userId: currentUser.id,
            name: currentUser.name,
            forceRefresh,
          });
        } catch (err: any) {
          tokenData = null;
        }
      }

      if (tokenData && tokenData.token) {
        const effectiveAppKey =
          tokenData.appKey || (typeof import.meta !== 'undefined' ? (import.meta as any).env?.VITE_NEXCONN_APP_KEY : '');

        if (tokenData.token && effectiveAppKey) {
          // Initialize NCEngine once with verified key
          const initOk = nexconnService.ensureInitialized(effectiveAppKey);
          if (initOk) {
            const connResult = await nexconnService.connect(
              currentUser.id,
              tokenData.token,
              effectiveAppKey
            );

            if (connResult.success) {
              connectedUserRef.current = currentUser.id;

              // Schedule automatic token refresh prior to expiration (e.g. 5 min before 24h expires)
              const expiresInSec = tokenData.expiresIn || 86400;
              const refreshDelayMs = Math.max((expiresInSec - 300) * 1000, 60000);
              tokenRefreshTimerRef.current = setTimeout(() => {
                connectAutomatically(true);
              }, refreshDelayMs);
            }
          }
        }
      } else {
        // Truthful reporting: never fake a successful connection
        if (!configInfo?.isConfigured) {
          setConnected(false);
          setConnectionState('CREDENTIALS_REQUIRED');
          setStatusText('Nexconn Cloud Edge: NEXCONN_APP_KEY required in .env');
          setIsConfigured(false);
          setDetail({
            state: 'CREDENTIALS_REQUIRED',
            statusText: 'Set VITE_NEXCONN_APP_KEY in .env for live connection.',
            isConfigured: false,
          });
        } else {
          setConnected(false);
          setConnectionState('ERROR');
          setStatusText('Token request rejected');
          setDetail({
            state: 'ERROR',
            statusText: 'Token request rejected',
            isConfigured: Boolean(configInfo?.isConfigured),
          });
        }
      }
    } catch (err: any) {
      setConnected(false);
      setConnectionState('ERROR');
      setStatusText(`Connection error: ${err.message}`);
    } finally {
      isConnectingRef.current = false;
    }
  }, [authToken, currentUser?.id, currentUser?.name]);

  /**
   * Explicit disconnect (e.g. on logout)
   */
  const disconnect = useCallback(async () => {
    if (tokenRefreshTimerRef.current) {
      clearTimeout(tokenRefreshTimerRef.current);
      tokenRefreshTimerRef.current = null;
    }
    connectedUserRef.current = null;
    await nexconnService.disconnect();
    setConnected(false);
    setConnectionState('DISCONNECTED');
    setStatusText('Session logged out from Nexconn');
  }, []);

  /**
   * Force refresh connection
   */
  const refreshConnection = useCallback(async () => {
    await connectAutomatically(true);
  }, [connectAutomatically]);

  // Automatic connection trigger when user or session token changes
  useEffect(() => {
    if (authToken && currentUser?.id) {
      connectAutomatically();
    } else {
      disconnect();
    }

    return () => {
      if (tokenRefreshTimerRef.current) {
        clearTimeout(tokenRefreshTimerRef.current);
      }
    };
  }, [authToken, currentUser?.id, connectAutomatically, disconnect]);

  // Automatic reconnection when browser returns online after network loss
  useEffect(() => {
    const handleOnline = () => {
      if (authToken && currentUser?.id && !nexconnService.isConnected()) {
        connectAutomatically();
      }
    };

    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [authToken, currentUser?.id, connectAutomatically]);

  const sendTextMessage = useCallback(
    async (channelType: 'direct' | 'group', targetId: string, text: string) => {
      return nexconnService.sendTextMessage(channelType, targetId, text);
    },
    []
  );

  const sendReadReceipt = useCallback(
    async (channelType: 'direct' | 'group', targetId: string, messageIds: string | string[]) => {
      return nexconnService.sendReadReceipt(channelType, targetId, messageIds);
    },
    []
  );

  const createOrJoinGroup = useCallback(
    async (groupId: string, groupName: string, inviteeUserIds: string[] = []) => {
      return nexconnService.createOrJoinGroup(groupId, groupName, inviteeUserIds);
    },
    []
  );

  return (
    <NexconnContext.Provider
      value={{
        connected,
        connectionState,
        statusText,
        userId: currentUser?.id || null,
        detail,
        isConfigured,
        connectAutomatically: () => connectAutomatically(false),
        disconnect,
        refreshConnection,
        sendTextMessage,
        sendReadReceipt,
        createOrJoinGroup,
      }}
    >
      {children}
    </NexconnContext.Provider>
  );
};

export const useNexconn = (): NexconnContextType => {
  const context = useContext(NexconnContext);
  if (!context) {
    throw new Error('useNexconn must be used within a NexconnProvider');
  }
  return context;
};
