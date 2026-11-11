import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, UserProfile, UserRole, LanguageCode } from '../types';
import { nexconnService, NexconnStatusDetail } from '../lib/nexconnClient';
import { api, setAuthToken as saveStoredToken } from '../lib/api';

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

  const [authToken, setAuthTokenState] = useState<string | null>(() => localStorage.getItem('tb_auth_token'));
  const [nexconnConnected, setNexconnConnected] = useState(false);
  const [nexconnStatus, setNexconnStatus] = useState('Checking Nexconn configuration...');
  const [nexconnDetail, setNexconnDetail] = useState<NexconnStatusDetail>({
    state: 'INITIAL',
    statusText: 'Checking configuration...',
    isConfigured: false,
  });
  const [loading, setLoading] = useState(true);

  const updateAuthToken = (token: string | null) => {
    setAuthTokenState(token);
    saveStoredToken(token);
    if (token) {
      localStorage.setItem('tb_auth_token', token);
    } else {
      localStorage.removeItem('tb_auth_token');
    }
  };

  // Load users & initial session
  useEffect(() => {
    async function loadInitialData() {
      try {
        const usersData = await api.get('/api/users');
        if (usersData && usersData.users) {
          setAllUsers(usersData.users);
          setAllProfiles(usersData.profiles || {});
        }

        // Restore existing authenticated session if present in localStorage
        const savedToken = localStorage.getItem('tb_auth_token');
        let sessionRestored = false;

        if (savedToken) {
          try {
            const meData = await api.get('/api/auth/me', { token: savedToken });
            if (meData && meData.user) {
              setCurrentUser(meData.user);
              updateAuthToken(savedToken);
              sessionRestored = true;
            } else {
              updateAuthToken(null);
            }
          } catch {
            // Token expired or invalid
            updateAuthToken(null);
          }
        }

        // Fallback: Initialize default demo session if no valid session restored
        if (!sessionRestored) {
          try {
            const sessionData = await api.post('/api/auth/switch-demo-user', { userId: currentUser.id });
            if (sessionData && sessionData.user) {
              setCurrentUser(sessionData.user);
              updateAuthToken(sessionData.token);
            }
          } catch (e) {
            console.warn('[AuthContext] Demo user switch fallback warning:', e);
          }
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
      unsubscribeStatus = nexconnService.subscribeStatus((detail) => {
        setNexconnConnected(detail.state === 'CONNECTED');
        setNexconnStatus(detail.statusText);
        setNexconnDetail(detail);
      });

      try {
        // First check server Nexconn configuration
        const configInfo = await api.get('/api/v1/nexconn/status').catch(() => api.get('/api/nexconn/status')).catch(() => null);

        // Request official token from backend with active JWT session
        const activeToken = authToken || localStorage.getItem('tb_auth_token');
        if (!activeToken) {
          return;
        }

        let creds: any;
        try {
          creds = await api.post('/api/v1/nexconn/token', {
            userId: currentUser.id,
            name: currentUser.name,
          }, { token: activeToken });
        } catch {
          creds = await api.post('/api/nexconn/token', {
            userId: currentUser.id,
            name: currentUser.name,
          }, { token: activeToken }).catch(() => null);
        }

        if (creds && creds.success && creds.token) {
          const effectiveAppKey = creds.appKey || (import.meta.env.VITE_NEXCONN_APP_KEY as string);
          if (effectiveAppKey) {
            const initSuccess = nexconnService.ensureInitialized(effectiveAppKey);
            if (initSuccess) {
              await nexconnService.connect(currentUser.id, creds.token, effectiveAppKey);
            }
          }
        } else {
          setNexconnConnected(false);
          if (creds?.requiresCredentials || !configInfo?.isConfigured) {
            setNexconnStatus('Nexconn Cloud Edge: Real credentials required (NEXCONN_APP_KEY)');
            setNexconnDetail({
              state: 'CREDENTIALS_REQUIRED',
              statusText: 'Set VITE_NEXCONN_APP_KEY in frontend .env to connect to live Nexconn Edge.',
              isConfigured: false,
            });
          } else {
            setNexconnStatus(`Nexconn SDK: ${creds?.message || 'Token request rejected'}`);
            setNexconnDetail({
              state: 'ERROR',
              statusText: creds?.message || 'Token request rejected',
              isConfigured: Boolean(configInfo?.isConfigured),
            });
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
  }, [currentUser.id, authToken]);

  const switchUser = useCallback(async (userId: string) => {
    try {
      const data = await api.post('/api/auth/switch-demo-user', { userId });
      if (data && data.user) {
        setCurrentUser(data.user);
        updateAuthToken(data.token);
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
      const data = await api.post('/api/auth/login', { email, password: pass });
      if (data && data.user) {
        setCurrentUser(data.user);
        updateAuthToken(data.token);
        return { success: true };
      } else {
        return { success: false, error: data?.message || 'Login failed' };
      }
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  const logout = async () => {
    try {
      if (authToken) {
        await api.post('/api/auth/logout', {}, { token: authToken });
      }
    } catch (e) {
      // Non-critical
    } finally {
      updateAuthToken(null);
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
      await api.patch(`/api/users/${currentUser.id}/language`, { language: lang });
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
