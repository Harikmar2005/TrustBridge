import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, UserProfile, UserRole, LanguageCode } from '../types';
import { nexconnService, NexconnStatusDetail } from '../lib/nexconnClient';

interface AuthContextType {
  currentUser: User;
  userProfile: UserProfile | null;
  authToken: string | null;
  allUsers: User[];
  allProfiles: Record<string, UserProfile>;
  switchUser: (userId: string) => Promise<void>;
  switchRole: (role: UserRole) => Promise<void>;
  updateLanguage: (lang: LanguageCode) => Promise<void>;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  nexconnConnected: boolean;
  nexconnStatus: string;
  nexconnDetail: NexconnStatusDetail;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allProfiles, setAllProfiles] = useState<Record<string, UserProfile>>({});
  const [currentUser, setCurrentUser] = useState<User>({
    id: 'usr_buyer_1',
    email: 'ananya.buyer@trustbridge.io',
    name: 'Ananya Krishnan',
    role: 'buyer',
    preferredLanguage: 'ta',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    trustScore: 94,
    phone: '+91 98765 43210',
    createdAt: '2026-01-15T09:00:00Z',
  });

  const [authToken, setAuthToken] = useState<string | null>(() => localStorage.getItem('tb_auth_token'));
  const [nexconnConnected, setNexconnConnected] = useState(false);
  const [nexconnStatus, setNexconnStatus] = useState('Checking Nexconn configuration...');
  const [nexconnDetail, setNexconnDetail] = useState<NexconnStatusDetail>({
    state: 'INITIAL',
    statusText: 'Checking configuration...',
    isConfigured: false,
  });
  const [loading, setLoading] = useState(true);

  // Load users & initial session
  useEffect(() => {
    async function loadInitialData() {
      try {
        const usersRes = await fetch('/api/users');
        if (usersRes.ok) {
          const data = await usersRes.json();
          setAllUsers(data.users);
          setAllProfiles(data.profiles);
        }

        // Initialize session for current user
        const sessionRes = await fetch('/api/auth/switch-demo-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser.id }),
        });

        if (sessionRes.ok) {
          const sessionData = await sessionRes.json();
          setCurrentUser(sessionData.user);
          setAuthToken(sessionData.token);
          localStorage.setItem('tb_auth_token', sessionData.token);
        }
      } catch (err) {
        console.warn('Initial auth load error:', err);
      } finally {
        setLoading(false);
      }
    }
    loadInitialData();
  }, []);

  // Sync Nexconn connection when user changes
  useEffect(() => {
    let unsubscribeStatus: (() => void) | undefined;

    async function initNexconn() {
      // Subscribe to SDK status
      unsubscribeStatus = nexconnService.subscribeStatus((detail) => {
        setNexconnConnected(detail.state === 'CONNECTED');
        setNexconnStatus(detail.statusText);
        setNexconnDetail(detail);
      });

      try {
        // First check server Nexconn configuration
        const statusRes = await fetch('/api/nexconn/status');
        const configInfo = statusRes.ok ? await statusRes.json() : null;

        // Request official token from backend
        const tokenRes = await fetch('/api/nexconn/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser.id, name: currentUser.name }),
        });

        if (tokenRes.ok) {
          const creds = await tokenRes.json();
          const effectiveAppKey = creds.appKey || (import.meta.env.VITE_NEXCONN_APP_KEY as string);
          if (creds.token && effectiveAppKey) {
            await nexconnService.initialize(effectiveAppKey);
            await nexconnService.connect(currentUser.id, creds.token, effectiveAppKey);
          }
        } else {
          const errorData = await tokenRes.json().catch(() => ({}));
          // DO NOT fake a connection! Accurately report what is required.
          setNexconnConnected(false);
          if (errorData.requiresCredentials || !configInfo?.isConfigured) {
            setNexconnStatus('Nexconn Cloud Edge: Real credentials required (NEXCONN_APP_KEY)');
            setNexconnDetail({
              state: 'CREDENTIALS_REQUIRED',
              statusText: 'Set NEXCONN_APP_KEY & NEXCONN_APP_SECRET in .env to connect to live Nexconn Edge.',
              isConfigured: false,
            });
          } else {
            setNexconnStatus(`Nexconn SDK: ${errorData.message || 'Token request failed'}`);
          }
        }
      } catch (e: any) {
        setNexconnConnected(false);
        setNexconnStatus(`Nexconn unavailable: ${e.message}`);
      }
    }

    initNexconn();

    return () => {
      if (unsubscribeStatus) unsubscribeStatus();
      nexconnService.disconnect();
    };
  }, [currentUser.id]);

  const switchUser = useCallback(async (userId: string) => {
    try {
      const res = await fetch('/api/auth/switch-demo-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
        setAuthToken(data.token);
        localStorage.setItem('tb_auth_token', data.token);
      }
    } catch (err) {
      console.error('Failed to switch user:', err);
    }
  }, []);

  const switchRole = useCallback(
    async (role: UserRole) => {
      const user = allUsers.find((u) => u.role === role);
      if (user) {
        await switchUser(user.id);
      }
    },
    [allUsers, switchUser]
  );

  const login = async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass }),
      });

      const data = await res.json();
      if (res.ok) {
        setCurrentUser(data.user);
        setAuthToken(data.token);
        localStorage.setItem('tb_auth_token', data.token);
        return { success: true };
      } else {
        return { success: false, error: data.message || 'Login failed' };
      }
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  const logout = async () => {
    try {
      if (authToken) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
        });
      }
    } catch (e) {
      // Non-critical
    } finally {
      setAuthToken(null);
      localStorage.removeItem('tb_auth_token');
      await nexconnService.disconnect();
    }
  };

  const updateLanguage = async (lang: LanguageCode) => {
    setCurrentUser((prev) => ({
      ...prev,
      preferredLanguage: lang,
    }));
    setAllUsers((prev) =>
      prev.map((u) => (u.id === currentUser.id ? { ...u, preferredLanguage: lang } : u))
    );

    try {
      await fetch(`/api/users/${currentUser.id}/language`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ language: lang }),
      });
    } catch (e) {
      console.warn('Failed to persist language preference:', e);
    }
  };

  const currentProfile = allProfiles[currentUser.id] || null;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile: currentProfile,
        authToken,
        allUsers,
        allProfiles,
        switchUser,
        switchRole,
        updateLanguage,
        login,
        logout,
        nexconnConnected,
        nexconnStatus,
        nexconnDetail,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
