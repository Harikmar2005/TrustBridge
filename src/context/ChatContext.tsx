import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Conversation, Message, LanguageCode } from '../types';
import { useAuth } from './AuthContext';
import { nexconnService } from '../lib/nexconnClient';

interface ChatContextType {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  activeConversationId: string;
  setActiveConversationId: (id: string) => void;
  messages: Message[];
  isSending: boolean;
  selectedLanguage: LanguageCode;
  setSelectedLanguage: (lang: LanguageCode) => void;
  displayMode: 'translated' | 'original' | 'both';
  setDisplayMode: (mode: 'translated' | 'original' | 'both') => void;
  sendMessage: (content: string, explicitLanguage?: LanguageCode) => Promise<Message | null>;
  reportFalsePositive: (messageId: string) => Promise<void>;
  refreshMessages: () => Promise<void>;
  unreadCounts: Record<string, number>;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  nexconnDeliveryNotice: string | null;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, authToken, nexconnConnected } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string>('conv_direct_1');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>(currentUser.preferredLanguage);
  const [displayMode, setDisplayMode] = useState<'translated' | 'original' | 'both'>('translated');
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [nexconnDeliveryNotice, setNexconnDeliveryNotice] = useState<string | null>(null);

  useEffect(() => {
    setSelectedLanguage(currentUser.preferredLanguage);
  }, [currentUser.preferredLanguage]);

  // Load conversations
  const loadConversations = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch(`/api/conversations?userId=${currentUser.id}`, { headers });
      if (res.ok) {
        const list: Conversation[] = await res.json();
        setConversations(list);
        if (list.length > 0 && !list.find((c) => c.id === activeConversationId)) {
          setActiveConversationId(list[0].id);
        }
      }
    } catch (e) {
      console.warn('Failed to load conversations:', e);
    }
  }, [currentUser.id, activeConversationId, authToken]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Load messages for active conversation
  const refreshMessages = useCallback(async () => {
    if (!activeConversationId) return;
    try {
      const headers: Record<string, string> = {};
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch(`/api/conversations/${activeConversationId}/messages`, { headers });
      if (res.ok) {
        const data: Message[] = await res.json();
        setMessages(data);

        // Acknowledge read receipts over Nexconn if connected
        if (nexconnConnected && data.length > 0) {
          const lastMsg = data[data.length - 1];
          const activeConv = conversations.find((c) => c.id === activeConversationId);
          if (activeConv && lastMsg.senderId !== currentUser.id) {
            const chanType = activeConv.type === 'dispute_room' ? 'group' : 'direct';
            const targetId = activeConv.type === 'dispute_room' ? activeConv.nexconnChannelId : lastMsg.senderId;
            nexconnService.sendReadReceipt(chanType, targetId, lastMsg.id);
          }
        }
      }
    } catch (e) {
      console.warn('Failed to load messages:', e);
    }
  }, [activeConversationId, authToken, nexconnConnected, conversations, currentUser.id]);

  useEffect(() => {
    refreshMessages();
  }, [refreshMessages]);

    // Listen to incoming messages over Nexconn SDK
  useEffect(() => {
    const unsubscribeMessages = nexconnService.subscribeMessages((payload) => {
      refreshMessages();
      loadConversations();
    });

    const unsubscribeReceipts = nexconnService.subscribeReceipts((receiptEvent: any) => {
      if (receiptEvent && receiptEvent.responses && Array.isArray(receiptEvent.responses)) {
        const readMsgIds = new Set<string>();
        for (const resp of receiptEvent.responses) {
          if (resp.messageId) {
            readMsgIds.add(resp.messageId);
            fetch(`/api/messages/${resp.messageId}/read`, { method: 'PATCH' }).catch(() => {});
          }
        }
        if (readMsgIds.size > 0) {
          setMessages((prev) =>
            prev.map((m) =>
              readMsgIds.has(m.id) || (m.nexconnMessageId && readMsgIds.has(m.nexconnMessageId))
                ? { ...m, deliveryStatus: 'READ' }
                : m
            )
          );
        }
      }
    });

    return () => {
      unsubscribeMessages();
      unsubscribeReceipts();
    };
  }, [refreshMessages, loadConversations]);

  // Send message
  const sendMessage = async (content: string, explicitLanguage?: LanguageCode): Promise<Message | null> => {
    if (!content.trim() || !activeConversationId) return null;
    setIsSending(true);
    setNexconnDeliveryNotice(null);

    try {
      const lang = explicitLanguage || currentUser.preferredLanguage;
      const activeConv = conversations.find((c) => c.id === activeConversationId);

      let deliveryStatus: 'PENDING_CLOUD' | 'DELIVERED_CLOUD' | 'DELIVERED_LOCAL' | 'FAILED' = 'DELIVERED_LOCAL';
      let nexconnMessageId: string | undefined;

      // Attempt Nexconn SDK dispatch if genuinely connected
      if (activeConv && nexconnConnected) {
        const isDisputeRoom = activeConv.type === 'dispute_room';
        const channelType = isDisputeRoom ? 'group' : 'direct';
        const targetId = isDisputeRoom
          ? activeConv.nexconnChannelId
          : activeConv.buyerId === currentUser.id
          ? activeConv.sellerId
          : activeConv.buyerId;

        // Ensure group membership for dispute room
        if (isDisputeRoom) {
          await nexconnService.createOrJoinGroup(
            activeConv.nexconnChannelId,
            activeConv.title,
            [activeConv.buyerId, activeConv.sellerId, 'usr_support_1']
          );
        }

        const ncResult = await nexconnService.sendTextMessage(channelType, targetId, content);
        if (ncResult.success && ncResult.messageId) {
          deliveryStatus = 'DELIVERED_CLOUD';
          nexconnMessageId = ncResult.messageId;
          setNexconnDeliveryNotice(`Delivered via Nexconn Edge (Msg ID: ${ncResult.messageId})`);
        } else {
          deliveryStatus = 'FAILED';
          setNexconnDeliveryNotice(`Nexconn delivery failed: ${ncResult.error || 'Connection unavailable'}`);
        }
      } else {
        deliveryStatus = 'DELIVERED_LOCAL';
        setNexconnDeliveryNotice('Dispatched and persisted locally in SQLite Escrow database');
      }

      // Transmit to TrustBridge backend for AI Scam Detection, Multilingual Translation, and DB Persistence
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          conversationId: activeConversationId,
          senderId: currentUser.id,
          content,
          language: lang,
          deliveryStatus,
          nexconnMessageId,
        }),
      });

      if (res.ok) {
        const newMsg: Message = await res.json();
        setMessages((prev) => (prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]));
        loadConversations();
        return newMsg;
      } else {
        const err = await res.json().catch(() => ({}));
        console.error('Backend message persistence error:', err);
      }
    } catch (e) {
      console.error('Failed to send message:', e);
    } finally {
      setIsSending(false);
    }
    return null;
  };

  const reportFalsePositive = async (messageId: string) => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch(`/api/messages/${messageId}/false-positive`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ userId: currentUser.id, userName: currentUser.name }),
      });
      if (res.ok) {
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, isFalsePositive: true, isFlagged: false } : m))
        );
      }
    } catch (e) {
      console.error('Failed to report false positive:', e);
    }
  };

  const activeConversation = conversations.find((c) => c.id === activeConversationId) || null;

  return (
    <ChatContext.Provider
      value={{
        conversations,
        activeConversation,
        activeConversationId,
        setActiveConversationId,
        messages,
        isSending,
        selectedLanguage,
        setSelectedLanguage,
        displayMode,
        setDisplayMode,
        sendMessage,
        reportFalsePositive,
        refreshMessages,
        unreadCounts,
        searchQuery,
        setSearchQuery,
        nexconnDeliveryNotice,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
