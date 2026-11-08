import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Dispute, SupportTicket, FraudAlert, AuditLog, AdminMetrics, DisputeCategory } from '../types';
import { useAuth } from './AuthContext';

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
  const { currentUser, authToken } = useAuth();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [activeDisputeId, setActiveDisputeId] = useState<string>('dsp_901');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [fraudAlerts, setFraudAlerts] = useState<FraudAlert[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [adminMetrics, setAdminMetrics] = useState<AdminMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshAll = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const [disputesRes, ticketsRes, alertsRes, logsRes, metricsRes] = await Promise.all([
        fetch('/api/disputes', { headers }),
        fetch('/api/tickets', { headers }),
        fetch('/api/fraud-alerts', { headers }),
        fetch('/api/audit-logs', { headers }),
        fetch('/api/admin/metrics', { headers }),
      ]);

      if (disputesRes.ok) {
        const d: Dispute[] = await disputesRes.json();
        setDisputes(d);
        if (d.length > 0 && !d.find((item) => item.id === activeDisputeId)) {
          setActiveDisputeId(d[0].id);
        }
      }

      if (ticketsRes.ok) {
        setTickets(await ticketsRes.json());
      }

      if (alertsRes.ok) {
        setFraudAlerts(await alertsRes.json());
      }

      if (logsRes.ok) {
        setAuditLogs(await logsRes.json());
      }

      if (metricsRes.ok) {
        setAdminMetrics(await metricsRes.json());
      }
    } catch (e) {
      console.warn('Failed to refresh dispute and admin state:', e);
    } finally {
      setLoading(false);
    }
  }, [activeDisputeId, authToken]);

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
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch('/api/disputes/create', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...data,
          buyerId: currentUser.id,
          sellerId: 'usr_seller_1',
        }),
      });

      if (res.ok) {
        const result = await res.json();
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
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch(`/api/disputes/${disputeId}/resolve`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          outcome,
          note,
          agentId: currentUser.id,
        }),
      });

      if (res.ok) {
        await refreshAll();
        return true;
      }
    } catch (e) {
      console.error('Failed to resolve dispute:', e);
    }
    return false;
  };

  // Update fraud alert status
  const updateAlertStatus = async (alertId: string, status: 'REVIEWED' | 'DISMISSED' | 'ACTIONED') => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch(`/api/fraud-alerts/${alertId}/status`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setFraudAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, reviewStatus: status } : a)));
      }
    } catch (e) {
      console.error('Failed to update alert status:', e);
    }
  };

  // Reset Demo Scenario
  const resetDemoScenario = async () => {
    try {
      await fetch('/api/demo/reset', { method: 'POST' });
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
