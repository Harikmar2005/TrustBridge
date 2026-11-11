import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Dispute, SupportTicket, FraudAlert, AuditLog, AdminMetrics, DisputeCategory } from '../types';
import { useAuth } from './AuthContext';
import { api } from '../lib/api';

interface DisputeContextType {
  disputes: Dispute[];
  activeDispute: Dispute | null;
  setActiveDisputeId: (id: string) => void;
  tickets: SupportTicket[];
  fraudAlerts: FraudAlert[];
  auditLogs: AuditLog[];
  adminMetrics: AdminMetrics | null;
  loading: boolean;
  createDispute: (data: {
    transactionId: string;
    conversationId: string;
    category: DisputeCategory;
    reason: string;
    evidenceFiles: Array<{ name: string; url: string; description: string }>;
  }) => Promise<{ dispute: Dispute; roomId: string } | null>;
  resolveDispute: (
    disputeId: string,
    outcome: 'FULL_REFUND' | 'PARTIAL_REFUND' | 'FUNDS_RELEASED' | 'DISMISSED',
    note: string
  ) => Promise<boolean>;
  updateAlertStatus: (alertId: string, status: 'REVIEWED' | 'DISMISSED' | 'ACTIONED') => Promise<void>;
  resetDemoScenario: () => Promise<void>;
  refreshAll: () => Promise<void>;
}

const DisputeContext = createContext<DisputeContextType | undefined>(undefined);

export const DisputeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [activeDisputeId, setActiveDisputeId] = useState<string>('dsp_901');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [fraudAlerts, setFraudAlerts] = useState<FraudAlert[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [adminMetrics, setAdminMetrics] = useState<AdminMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshAll = useCallback(async () => {
    try {
      const [disputesRes, ticketsRes, alertsRes, logsRes, metricsRes] = await Promise.allSettled([
        api.get<Dispute[]>('/api/disputes'),
        api.get<SupportTicket[]>('/api/tickets'),
        api.get<FraudAlert[]>('/api/fraud-alerts'),
        api.get<AuditLog[]>('/api/audit-logs'),
        api.get<AdminMetrics>('/api/admin/metrics'),
      ]);

      if (disputesRes.status === 'fulfilled' && Array.isArray(disputesRes.value)) {
        setDisputes(disputesRes.value);
        if (disputesRes.value.length > 0 && !disputesRes.value.find((item) => item.id === activeDisputeId)) {
          setActiveDisputeId(disputesRes.value[0].id);
        }
      }

      if (ticketsRes.status === 'fulfilled' && Array.isArray(ticketsRes.value)) {
        setTickets(ticketsRes.value);
      }

      if (alertsRes.status === 'fulfilled' && Array.isArray(alertsRes.value)) {
        setFraudAlerts(alertsRes.value);
      }

      if (logsRes.status === 'fulfilled' && Array.isArray(logsRes.value)) {
        setAuditLogs(logsRes.value);
      }

      if (metricsRes.status === 'fulfilled' && metricsRes.value) {
        setAdminMetrics(metricsRes.value);
      }
    } catch (e) {
      console.warn('Failed to refresh dispute and admin state:', e);
    } finally {
      setLoading(false);
    }
  }, [activeDisputeId]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Create dispute
  const createDispute = async (data: {
    transactionId: string;
    conversationId: string;
    category: DisputeCategory;
    reason: string;
    evidenceFiles: Array<{ name: string; url: string; description: string }>;
  }) => {
    try {
      const result = await api.post<{ dispute: Dispute; roomId: string }>('/api/disputes/create', {
        ...data,
        buyerId: currentUser.id,
        sellerId: 'usr_seller_1',
      });

      if (result) {
        await refreshAll();
        return result;
      }
    } catch (e) {
      console.error('Failed to create dispute:', e);
    }
    return null;
  };

  // Resolve dispute
  const resolveDispute = async (
    disputeId: string,
    outcome: 'FULL_REFUND' | 'PARTIAL_REFUND' | 'FUNDS_RELEASED' | 'DISMISSED',
    note: string
  ): Promise<boolean> => {
    try {
      await api.post(`/api/disputes/${disputeId}/resolve`, {
        outcome,
        note,
        agentId: currentUser.id,
      });
      await refreshAll();
      return true;
    } catch (e) {
      console.error('Failed to resolve dispute:', e);
    }
    return false;
  };

  // Update fraud alert status
  const updateAlertStatus = async (alertId: string, status: 'REVIEWED' | 'DISMISSED' | 'ACTIONED') => {
    try {
      await api.post(`/api/fraud-alerts/${alertId}/status`, { status });
      setFraudAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, reviewStatus: status } : a)));
    } catch (e) {
      console.error('Failed to update alert status:', e);
    }
  };

  // Reset Demo Scenario
  const resetDemoScenario = async () => {
    try {
      await api.post('/api/demo/reset');
      await refreshAll();
    } catch (e) {
      console.error('Failed to reset demo scenario:', e);
    }
  };

  const activeDispute = disputes.find((d) => d.id === activeDisputeId) || null;

  return (
    <DisputeContext.Provider
      value={{
        disputes,
        activeDispute,
        setActiveDisputeId,
        tickets,
        fraudAlerts,
        auditLogs,
        adminMetrics,
        loading,
        createDispute,
        resolveDispute,
        updateAlertStatus,
        resetDemoScenario,
        refreshAll,
      }}
    >
      {children}
    </DisputeContext.Provider>
  );
};

export const useDispute = () => {
  const context = useContext(DisputeContext);
  if (!context) {
    throw new Error('useDispute must be used within a DisputeProvider');
  }
  return context;
};
